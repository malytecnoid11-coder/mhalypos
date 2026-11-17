/**
 * MHALY SHOP - PURCHASES & SUPPLIER DEBT MANAGEMENT MODULE (ការទិញចូល & បំណុលអ្នកផ្គត់ផ្គង់)
 * Handles stock-in purchases from suppliers, multi-item line builder,
 * auto-inventory stock updates, accounts payable debt tracking, and debt repayment.
 */

window.Purchases = {
    searchQuery: '',
    filterStatus: 'all', // 'all', 'unpaid', 'paid', 'partial'
    activePurchaseForPay: null,

    init: function() {
        Purchases.setupEventListeners();
        Purchases.render();
    },

    setupEventListeners: function() {
        // Search bar
        const searchInput = document.getElementById('purchases-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                Purchases.searchQuery = (e.target.value || '').toLowerCase().trim();
                Purchases.render();
            });
        }

        // Status Filter Buttons
        document.querySelectorAll('.purchase-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.purchase-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                Purchases.filterStatus = btn.dataset.status || 'all';
                Purchases.render();
            });
        });

        // Trigger Add Modal
        const btnAdd = document.getElementById('btn-add-purchase');
        if (btnAdd) {
            btnAdd.addEventListener('click', Purchases.openAddModal);
        }

        // Close Add Modal
        const btnCloseAdd = document.getElementById('btn-close-purchase-modal');
        const btnCancelAdd = document.getElementById('btn-cancel-purchase');
        if (btnCloseAdd) btnCloseAdd.addEventListener('click', Purchases.closeAddModal);
        if (btnCancelAdd) btnCancelAdd.addEventListener('click', Purchases.closeAddModal);

        // Add Item Row Button inside modal
        const btnAddItemRow = document.getElementById('btn-purchase-add-row');
        if (btnAddItemRow) {
            btnAddItemRow.addEventListener('click', () => Purchases.addItemRow());
        }

        // Form Submit
        const formAdd = document.getElementById('form-add-purchase');
        if (formAdd) {
            formAdd.addEventListener('submit', Purchases.handleSavePurchase);
        }

        // Payment status change (Unpaid / Fully Paid / Partial)
        const payStatusSelect = document.getElementById('purchase-pay-status');
        if (payStatusSelect) {
            payStatusSelect.addEventListener('change', Purchases.onPaymentStatusChange);
        }

        // Paid amount input change
        const paidInput = document.getElementById('purchase-paid-amount');
        if (paidInput) {
            paidInput.addEventListener('input', Purchases.recalculateModalTotals);
        }

        // Close Details Modal
        const btnCloseDetail = document.getElementById('btn-close-purchase-detail-modal');
        if (btnCloseDetail) btnCloseDetail.addEventListener('click', Purchases.closeDetailModal);

        // Close Pay Modal
        const btnClosePay = document.getElementById('btn-close-pay-supplier-modal');
        const btnCancelPay = document.getElementById('btn-cancel-pay-supplier');
        if (btnClosePay) btnClosePay.addEventListener('click', Purchases.closePayModal);
        if (btnCancelPay) btnCancelPay.addEventListener('click', Purchases.closePayModal);

        // Pay Debt Form Submit
        const formPay = document.getElementById('form-pay-supplier-debt');
        if (formPay) {
            formPay.addEventListener('submit', Purchases.handlePayDebt);
        }
    },

    // =======================================================
    // RENDERING & KPI CALCULATIONS
    // =======================================================
    render: function() {
        const purchases = Storage.getPurchases() || [];
        Purchases.renderKPIs(purchases);
        Purchases.renderTable(purchases);
    },

    renderKPIs: function(purchases) {
        let totalAmount = 0;
        let totalDebt = 0;
        let totalPaid = 0;
        let totalItemsCount = 0;
        let unpaidCount = 0;

        purchases.forEach(p => {
            const tot = Number(p.totalAmount) || 0;
            const paid = Number(p.paidAmount) || 0;
            const due = Number(p.balanceDue !== undefined ? p.balanceDue : (tot - paid)) || 0;

            totalAmount += tot;
            totalPaid += paid;
            if (due > 0.009) {
                totalDebt += due;
                unpaidCount++;
            }

            if (Array.isArray(p.items)) {
                p.items.forEach(it => {
                    totalItemsCount += Number(it.quantity) || 1;
                });
            }
        });

        // Update KPI card elements
        const totalAmountEl = document.getElementById('purchases-kpi-total-amount');
        const totalCountEl = document.getElementById('purchases-kpi-total-count');
        const totalDebtEl = document.getElementById('purchases-kpi-total-debt');
        const debtCountEl = document.getElementById('purchases-kpi-debt-count');
        const totalPaidEl = document.getElementById('purchases-kpi-total-paid');
        const itemsCountEl = document.getElementById('purchases-kpi-items-count');

        if (totalAmountEl) totalAmountEl.innerText = `$${totalAmount.toFixed(2)}`;
        if (totalCountEl) totalCountEl.innerText = `${purchases.length} វិក្កយបត្រ`;
        if (totalDebtEl) totalDebtEl.innerText = `$${totalDebt.toFixed(2)}`;
        if (debtCountEl) debtCountEl.innerText = `${unpaidCount} វិក្កយបត្រជំពាក់`;
        if (totalPaidEl) totalPaidEl.innerText = `$${totalPaid.toFixed(2)}`;
        if (itemsCountEl) itemsCountEl.innerText = `${totalItemsCount.toLocaleString()} គ្រឿង/មុខ`;

        // Update badge on sidebar navigation
        const badgeEl = document.getElementById('purchases-debt-badge');
        if (badgeEl) {
            if (unpaidCount > 0) {
                badgeEl.innerText = unpaidCount;
                badgeEl.style.display = 'inline-flex';
            } else {
                badgeEl.style.display = 'none';
            }
        }
    },

    renderTable: function(purchases) {
        const tbody = document.getElementById('purchases-table-body');
        if (!tbody) return;

        // Filter purchases
        let filtered = purchases.filter(p => {
            // Status filter
            const due = Number(p.balanceDue !== undefined ? p.balanceDue : (p.totalAmount - (p.paidAmount || 0))) || 0;
            const status = p.paymentStatus || (due <= 0.009 ? 'paid' : (p.paidAmount > 0 ? 'partial' : 'unpaid'));

            if (Purchases.filterStatus === 'unpaid' && due <= 0.009) return false;
            if (Purchases.filterStatus === 'paid' && due > 0.009) return false;
            if (Purchases.filterStatus === 'partial' && (status !== 'partial' || due <= 0.009)) return false;

            // Search filter
            if (Purchases.searchQuery) {
                const q = Purchases.searchQuery;
                const matchSup = (p.supplierName || '').toLowerCase().includes(q);
                const matchPhone = (p.supplierPhone || '').includes(q);
                const matchInv = (p.invoiceNo || '').toLowerCase().includes(q) || (p.id || '').toLowerCase().includes(q);
                const matchItems = Array.isArray(p.items) && p.items.some(it => (it.name || '').toLowerCase().includes(q));
                if (!matchSup && !matchPhone && !matchInv && !matchItems) return false;
            }

            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 42px 16px; color: var(--text-muted);">
                        <div style="font-size: 38px; margin-bottom: 10px; opacity: 0.6;">📦</div>
                        <h4 style="margin: 0 0 6px 0; color: var(--text-primary); font-size: 15px;">មិនមានទិន្នន័យទិញចូលត្រូវនឹងការស្វែងរកទេ</h4>
                        <p style="margin: 0; font-size: 13px;">ចុចប៊ូតុង <strong>«+ កត់ត្រាទិញចូលថ្មី»</strong> ដើម្បីចាប់ផ្តើមកត់ត្រាទំនិញដែលបានទិញពីអ្នកផ្គត់ផ្គង់</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(p => {
            const tot = Number(p.totalAmount) || 0;
            const paid = Number(p.paidAmount) || 0;
            const due = Math.max(0, Number(p.balanceDue !== undefined ? p.balanceDue : (tot - paid)) || 0);

            const isPaid = due <= 0.009;
            const rowClass = isPaid 
                ? 'purchase-row purchase-row-paid' 
                : ('purchase-row purchase-row-unpaid' + (paid > 0 ? ' purchase-row-partial' : ''));

            // Determine status badge
            let statusBadge = '';
            if (isPaid) {
                statusBadge = `<span class="purchase-status-badge badge-paid"><i class="fa-solid fa-circle-check"></i> បានបង់ដាច់</span>`;
            } else if (paid > 0) {
                statusBadge = `<span class="purchase-status-badge badge-partial"><i class="fa-solid fa-clock-rotate-left"></i> បង់មួយផ្នែក</span>`;
            } else {
                statusBadge = `<span class="purchase-status-badge badge-unpaid"><i class="fa-solid fa-triangle-exclamation"></i> ជំពាក់ទាំងស្រុង</span>`;
            }

            // Items summary preview
            let itemsPreview = '-';
            if (Array.isArray(p.items) && p.items.length > 0) {
                const names = p.items.map(it => `${it.name} (x${it.quantity})`).slice(0, 2).join(', ');
                const extra = p.items.length > 2 ? ` <span class="badge-extra-items">+${p.items.length - 2} ទៀត</span>` : '';
                itemsPreview = `<span style="font-weight: 500; color: #f1f5f9;">${names}</span>${extra}`;
            }

            const dateStr = p.dateFormatted || (p.date ? new Date(p.date).toLocaleDateString('km-KH') : '-');

            return `
                <tr class="${rowClass}">
                    <td>
                        <div class="purchase-inv-cell">
                            <span class="purchase-beacon-dot ${isPaid ? 'beacon-green' : 'beacon-red'}"></span>
                            <div>
                                <strong style="color: var(--text-primary); font-family: var(--font-nums); font-size: 13.5px;">${p.invoiceNo || p.id}</strong>
                                <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                                    <i class="fa-regular fa-calendar"></i> ${dateStr}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <strong style="color: #38bdf8; font-size: 13.5px;">${p.supplierName || 'អ្នកផ្គត់ផ្គង់ទូទៅ'}</strong>
                        ${p.supplierPhone ? `<div style="font-size: 11.5px; color: var(--text-secondary); font-family: var(--font-nums);"><i class="fa-solid fa-phone" style="font-size: 10px;"></i> ${p.supplierPhone}</div>` : ''}
                    </td>
                    <td style="max-width: 240px; font-size: 12.5px;">
                        ${itemsPreview}
                    </td>
                    <td>
                        <span style="font-family: var(--font-nums); font-weight: 700; color: #f8fafc; font-size: 14px;">$${tot.toFixed(2)}</span>
                    </td>
                    <td>
                        <span style="font-family: var(--font-nums); font-weight: 600; color: #10b981; font-size: 13.5px;">$${paid.toFixed(2)}</span>
                    </td>
                    <td>
                        ${due > 0.009 ? `
                            <span style="font-family: var(--font-nums); font-weight: 700; color: #ef4444; font-size: 14px; display: inline-flex; align-items: center; gap: 4px;">
                                <span class="debt-pulse-dot"></span> $${due.toFixed(2)}
                            </span>
                            ${p.dueDate ? `<div style="font-size: 11px; color: #fca5a5; margin-top: 1px;"><i class="fa-regular fa-clock"></i> សងត្រឹម: ${p.dueDate}</div>` : ''}
                        ` : `
                            <span style="color: var(--text-muted); font-size: 12px; font-family: var(--font-nums);">$0.00</span>
                        `}
                    </td>
                    <td>
                        ${statusBadge}
                    </td>
                    <td class="text-right">
                        <div style="display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end;">
                            ${due > 0.009 ? `
                                <button type="button" class="btn-quick-pay-debt" onclick="Purchases.openPayModal('${p.id}')" title="កត់ត្រាសងបំណុល">
                                    <i class="fa-solid fa-hand-holding-dollar"></i> សងបំណុល
                                </button>
                            ` : ''}
                            <button type="button" class="btn-action-view" onclick="Purchases.openDetailModal('${p.id}')" title="មើលលម្អិត">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button type="button" class="btn-remove-item" onclick="Purchases.deletePurchase('${p.id}')" title="លុបចេញ">
                                <i class="fa-solid fa-trash-can" style="color: #f87171;"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // =======================================================
    // ADD PURCHASE MODAL & DYNAMIC ITEM ROW BUILDER
    // =======================================================
    openAddModal: function() {
        const modal = document.getElementById('add-purchase-modal');
        if (!modal) return;

        // Reset form
        const form = document.getElementById('form-add-purchase');
        if (form) form.reset();

        // Populate Supplier dropdown
        Purchases.populateSupplierDropdown();

        // Generate PO ID / default invoice no
        const todayStr = new Date().toISOString().slice(0, 10);
        const dateInput = document.getElementById('purchase-date');
        if (dateInput) dateInput.value = todayStr;

        const invInput = document.getElementById('purchase-invoice-no');
        const autoNo = 'PO-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
        if (invInput) invInput.value = autoNo;

        // Reset Item rows list with 1 clean row
        const container = document.getElementById('purchase-items-builder-body');
        if (container) container.innerHTML = '';
        Purchases.addItemRow();

        // Reset status to unpaid by default
        const statusSelect = document.getElementById('purchase-pay-status');
        if (statusSelect) statusSelect.value = 'unpaid';
        Purchases.onPaymentStatusChange();

        modal.classList.add('show');
    },

    closeAddModal: function() {
        const modal = document.getElementById('add-purchase-modal');
        if (modal) modal.classList.remove('show');
    },

    populateSupplierDropdown: function() {
        const select = document.getElementById('purchase-supplier-select');
        if (!select) return;

        const suppliers = Storage.getSuppliers() || [];
        let html = `<option value="">-- ជ្រើសរើសអ្នកផ្គត់ផ្គង់ (Supplier) --</option>`;
        suppliers.forEach(s => {
            html += `<option value="${s.id}" data-name="${s.name}" data-phone="${s.phone || ''}">${s.name} ${s.phone ? `(${s.phone})` : ''}</option>`;
        });
        html += `<option value="__custom__">+ វាយឈ្មោះអ្នកផ្គត់ផ្គង់ថ្មីដោយដៃ...</option>`;
        select.innerHTML = html;

        // Toggle custom supplier input box
        select.onchange = function() {
            const customBox = document.getElementById('purchase-custom-supplier-box');
            if (customBox) {
                customBox.style.display = select.value === '__custom__' ? 'block' : 'none';
            }
        };
    },

    addItemRow: function(prodId = '', name = '', qty = 1, cost = '') {
        const container = document.getElementById('purchase-items-builder-body');
        if (!container) return;

        const products = Storage.getProducts() || [];
        const rowIndex = container.children.length;

        const row = document.createElement('tr');
        row.className = 'purchase-builder-row';
        row.dataset.index = rowIndex;

        let prodOptions = `<option value="">-- រើសទំនិញក្នុងស្តុក ឬវាយឈ្មោះខាងក្រោម --</option>`;
        products.forEach(p => {
            const isSel = p.id === prodId ? 'selected' : '';
            prodOptions += `<option value="${p.id}" data-name="${p.name}" data-cost="${p.cost || 0}" ${isSel}>${p.name} (ស្តុកសល់: ${p.stockCount || 0}, ថ្លៃដើម: $${p.cost || 0})</option>`;
        });
        prodOptions += `<option value="__custom__" ${prodId === '__custom__' ? 'selected' : ''}>+ បញ្ចូលទំនិញថ្មី (Custom Item)...</option>`;

        row.innerHTML = `
            <td>
                <select class="builder-prod-select" onchange="Purchases.onRowProductSelect(this)">
                    ${prodOptions}
                </select>
                <input type="text" class="builder-custom-name" placeholder="វាយឈ្មោះទំនិញ..." value="${name}" style="margin-top: 5px; display: ${prodId === '__custom__' || (!prodId && name) ? 'block' : 'none'};">
            </td>
            <td style="width: 100px;">
                <input type="number" class="builder-qty" min="1" step="1" value="${qty || 1}" oninput="Purchases.recalculateModalTotals()" required>
            </td>
            <td style="width: 130px;">
                <div class="input-with-symbol">
                    <span class="symbol">$</span>
                    <input type="number" class="builder-cost" min="0" step="0.01" placeholder="0.00" value="${cost !== '' ? cost : ''}" oninput="Purchases.recalculateModalTotals()" required>
                </div>
            </td>
            <td style="width: 120px; text-align: right;">
                <strong class="builder-subtotal" style="font-family: var(--font-nums); color: #38bdf8;">$0.00</strong>
            </td>
            <td style="width: 40px; text-align: center;">
                <button type="button" class="btn-remove-row" onclick="Purchases.removeItemRow(this)" title="លុបជួរដេកនេះ">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </td>
        `;

        container.appendChild(row);
        Purchases.recalculateModalTotals();
    },

    removeItemRow: function(btn) {
        const row = btn.closest('tr');
        const container = document.getElementById('purchase-items-builder-body');
        if (container && container.children.length > 1) {
            row.remove();
            Purchases.recalculateModalTotals();
        } else {
            App.showToast('ត្រូវមានមុខទំនិញយ៉ាងហោចណាស់ ១ មុខ!', 'warning');
        }
    },

    onRowProductSelect: function(selectEl) {
        const row = selectEl.closest('tr');
        const customNameInput = row.querySelector('.builder-custom-name');
        const costInput = row.querySelector('.builder-cost');

        const selectedOpt = selectEl.options[selectEl.selectedIndex];
        if (selectEl.value === '__custom__') {
            if (customNameInput) {
                customNameInput.style.display = 'block';
                customNameInput.focus();
            }
        } else if (selectEl.value) {
            if (customNameInput) {
                customNameInput.style.display = 'none';
                customNameInput.value = selectedOpt.dataset.name || '';
            }
            if (costInput && (!costInput.value || parseFloat(costInput.value) === 0)) {
                costInput.value = selectedOpt.dataset.cost || '';
            }
        } else {
            if (customNameInput) customNameInput.style.display = 'none';
        }

        Purchases.recalculateModalTotals();
    },

    onPaymentStatusChange: function() {
        const status = document.getElementById('purchase-pay-status')?.value || 'unpaid';
        const paidBox = document.getElementById('purchase-paid-amount-box');
        const paidInput = document.getElementById('purchase-paid-amount');
        const grandTotalVal = parseFloat(document.getElementById('purchase-grand-total')?.dataset.val) || 0;

        if (status === 'unpaid') {
            if (paidBox) paidBox.style.display = 'none';
            if (paidInput) paidInput.value = '0.00';
        } else if (status === 'paid') {
            if (paidBox) paidBox.style.display = 'none';
            if (paidInput) paidInput.value = grandTotalVal.toFixed(2);
        } else if (status === 'partial') {
            if (paidBox) paidBox.style.display = 'block';
            if (paidInput && (!paidInput.value || parseFloat(paidInput.value) === 0)) {
                paidInput.value = (grandTotalVal / 2).toFixed(2);
            }
        }

        Purchases.recalculateModalTotals();
    },

    recalculateModalTotals: function() {
        const rows = document.querySelectorAll('.purchase-builder-row');
        let grandTotal = 0;

        rows.forEach(r => {
            const qty = parseFloat(r.querySelector('.builder-qty')?.value) || 0;
            const cost = parseFloat(r.querySelector('.builder-cost')?.value) || 0;
            const subtotal = Math.max(0, qty * cost);
            grandTotal += subtotal;

            const subEl = r.querySelector('.builder-subtotal');
            if (subEl) subEl.innerText = `$${subtotal.toFixed(2)}`;
        });

        const totalEl = document.getElementById('purchase-grand-total');
        if (totalEl) {
            totalEl.innerText = `$${grandTotal.toFixed(2)}`;
            totalEl.dataset.val = grandTotal;
        }

        // Calculate Paid & Due based on status
        const status = document.getElementById('purchase-pay-status')?.value || 'unpaid';
        const paidInput = document.getElementById('purchase-paid-amount');
        let paidVal = 0;

        if (status === 'unpaid') {
            paidVal = 0;
        } else if (status === 'paid') {
            paidVal = grandTotal;
            if (paidInput) paidInput.value = grandTotal.toFixed(2);
        } else if (status === 'partial') {
            paidVal = Math.min(grandTotal, parseFloat(paidInput?.value) || 0);
        }

        const dueVal = Math.max(0, grandTotal - paidVal);

        const summaryPaidEl = document.getElementById('purchase-summary-paid');
        const summaryDueEl = document.getElementById('purchase-summary-due');
        if (summaryPaidEl) summaryPaidEl.innerText = `$${paidVal.toFixed(2)}`;
        if (summaryDueEl) summaryDueEl.innerText = `$${dueVal.toFixed(2)}`;
    },

    // =======================================================
    // SAVE PURCHASE & STOCK / EXPENSE SYNC
    // =======================================================
    handleSavePurchase: function(e) {
        e.preventDefault();

        // 1. Supplier info
        const supSelect = document.getElementById('purchase-supplier-select');
        const customSupName = document.getElementById('purchase-custom-supplier-name')?.value.trim();
        const customSupPhone = document.getElementById('purchase-custom-supplier-phone')?.value.trim();

        let supplierId = '';
        let supplierName = '';
        let supplierPhone = '';

        if (supSelect.value === '__custom__') {
            if (!customSupName) {
                App.showToast('សូមបញ្ចូលឈ្មោះអ្នកផ្គត់ផ្គង់!', 'error');
                return;
            }
            supplierId = 'sup-custom-' + Date.now();
            supplierName = customSupName;
            supplierPhone = customSupPhone;

            // Also auto-save to Suppliers directory
            const suppliers = Storage.getSuppliers();
            suppliers.unshift({
                id: supplierId,
                name: supplierName,
                phone: supplierPhone || '012 xxx xxx',
                contactPerson: '',
                address: 'ភ្នំពេញ',
                suppliedItems: 'ទំនិញទូទៅ',
                notes: 'បានបន្ថែមពេលទិញចូល'
            });
            Storage.saveSuppliers(suppliers);
            if (window.Finance && Finance.renderSuppliers) Finance.renderSuppliers();
        } else if (supSelect.value) {
            const opt = supSelect.options[supSelect.selectedIndex];
            supplierId = supSelect.value;
            supplierName = opt.dataset.name || opt.text;
            supplierPhone = opt.dataset.phone || '';
        } else {
            App.showToast('សូមជ្រើសរើស ឬបញ្ចូលឈ្មោះអ្នកផ្គត់ផ្គង់!', 'error');
            return;
        }

        // 2. Invoice details
        const invoiceNo = document.getElementById('purchase-invoice-no')?.value.trim() || ('PO-' + Date.now());
        const purchaseDateStr = document.getElementById('purchase-date')?.value || new Date().toISOString().slice(0, 10);
        const purchaseDate = new Date(purchaseDateStr + 'T12:00:00');
        const dueDate = document.getElementById('purchase-due-date')?.value || '';
        const notes = document.getElementById('purchase-notes')?.value.trim() || '';

        // 3. Extract items
        const rowElements = document.querySelectorAll('.purchase-builder-row');
        const items = [];
        let grandTotal = 0;

        for (let r of rowElements) {
            const prodSelect = r.querySelector('.builder-prod-select');
            const customInput = r.querySelector('.builder-custom-name');
            const qty = parseInt(r.querySelector('.builder-qty')?.value) || 0;
            const cost = parseFloat(r.querySelector('.builder-cost')?.value) || 0;

            if (qty <= 0) continue;

            let prodId = prodSelect.value;
            let itemName = '';

            if (prodId === '__custom__') {
                itemName = customInput?.value.trim() || 'ទំនិញថ្មី';
                prodId = '';
            } else if (prodId) {
                const opt = prodSelect.options[prodSelect.selectedIndex];
                itemName = opt.dataset.name || opt.text.split('(')[0].trim();
            } else if (customInput && customInput.value.trim()) {
                itemName = customInput.value.trim();
            }

            if (!itemName) continue;

            const subtotal = qty * cost;
            grandTotal += subtotal;

            items.push({
                productId: prodId,
                name: itemName,
                quantity: qty,
                unitCost: cost,
                totalCost: subtotal
            });
        }

        if (items.length === 0) {
            App.showToast('សូមបញ្ចូលយ៉ាងហោចណាស់មុខទំនិញ ១ ដែលមានចំនួនត្រឹមត្រូវ!', 'error');
            return;
        }

        // 4. Payment status & amounts
        const statusSelect = document.getElementById('purchase-pay-status')?.value || 'unpaid';
        const paidInput = document.getElementById('purchase-paid-amount');
        let paidAmount = 0;

        if (statusSelect === 'paid') {
            paidAmount = grandTotal;
        } else if (statusSelect === 'partial') {
            paidAmount = Math.min(grandTotal, parseFloat(paidInput?.value) || 0);
        } else {
            paidAmount = 0;
        }

        const balanceDue = Math.max(0, grandTotal - paidAmount);
        const finalStatus = balanceDue <= 0.009 ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid');

        // Checkbox options
        const autoUpdateStock = document.getElementById('purchase-auto-stock')?.checked !== false;
        const autoRecordExpense = document.getElementById('purchase-auto-expense')?.checked !== false;

        // 5. Create Purchase Record
        const purchaseRecord = {
            id: 'PUR-' + Date.now(),
            invoiceNo: invoiceNo,
            date: purchaseDate.toISOString(),
            dateFormatted: purchaseDate.toLocaleDateString('km-KH'),
            supplierId: supplierId,
            supplierName: supplierName,
            supplierPhone: supplierPhone,
            items: items,
            totalAmount: grandTotal,
            paidAmount: paidAmount,
            balanceDue: balanceDue,
            paymentStatus: finalStatus,
            dueDate: dueDate,
            notes: notes,
            payments: paidAmount > 0 ? [{
                id: 'pay-initial-' + Date.now(),
                date: purchaseDate.toISOString(),
                amount: paidAmount,
                method: 'cash',
                note: 'ទូទាត់ពេលទិញចូលដំបូង'
            }] : [],
            autoStockUpdated: autoUpdateStock
        };

        // 6. AUTO-UPDATE INVENTORY STOCK
        if (autoUpdateStock) {
            const allProducts = Storage.getProducts() || [];
            items.forEach(it => {
                let targetProd = null;
                if (it.productId) {
                    targetProd = allProducts.find(p => p.id === it.productId);
                } else {
                    targetProd = allProducts.find(p => p.name.trim().toLowerCase() === it.name.trim().toLowerCase());
                }

                if (targetProd) {
                    // Existing accessory or product
                    if (!targetProd.hasImei) {
                        targetProd.stockCount = (targetProd.stockCount || 0) + it.quantity;
                        if (it.unitCost > 0) targetProd.cost = it.unitCost;
                    }
                } else {
                    // Auto-create new accessory item
                    const newProd = {
                        id: 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
                        name: it.name,
                        category: 'Accessories',
                        price: Math.round((it.unitCost * 1.3) * 100) / 100 || it.unitCost,
                        cost: it.unitCost,
                        stockCount: it.quantity,
                        hasImei: false,
                        imeis: [],
                        warrantyMonths: 1,
                        notes: `ទិញចូលពី ${supplierName}`
                    };
                    allProducts.push(newProd);
                }
            });
            Storage.saveProducts(allProducts);

            if (window.Inventory && Inventory.renderTable) {
                Inventory.renderTable();
            }
            if (window.POS && POS.renderProducts) {
                POS.renderProducts();
            }
        }

        // 7. AUTO-RECORD EXPENSE IF MONEY WAS ACTUALLY PAID
        if (autoRecordExpense && paidAmount > 0) {
            const expenses = Storage.getExpenses() || [];
            expenses.unshift({
                id: 'exp-' + Date.now(),
                date: purchaseDate.toISOString(),
                title: `ទិញទំនិញចូលពី៖ ${supplierName}`,
                type: 'expense',
                category: 'ទិញទំនិញចូល/ស្តុក',
                amount: paidAmount,
                note: `វិក្កយបត្រ #${invoiceNo} (សរុប $${grandTotal.toFixed(2)}, នៅជំពាក់ $${balanceDue.toFixed(2)})`
            });
            Storage.saveExpenses(expenses);

            if (window.Finance && Finance.renderExpenses) {
                Finance.renderExpenses();
                Finance.renderDashboard();
            }
        }

        // 8. Save Purchase Record to Storage
        const purchases = Storage.getPurchases() || [];
        purchases.unshift(purchaseRecord);
        Storage.savePurchases(purchases);

        Purchases.closeAddModal();
        Purchases.render();

        App.showToast(`បានកត់ត្រាទិញចូល #${invoiceNo} ($${grandTotal.toFixed(2)}) ជោគជ័យ!`, 'success');
    },

    // =======================================================
    // VIEW DETAILS MODAL
    // =======================================================
    openDetailModal: function(id) {
        const purchases = Storage.getPurchases() || [];
        const p = purchases.find(item => item.id === id);
        if (!p) return;

        const modal = document.getElementById('purchase-detail-modal');
        if (!modal) return;

        const titleEl = document.getElementById('detail-purchase-invoice-no');
        const metaEl = document.getElementById('detail-purchase-meta');
        const supNameEl = document.getElementById('detail-purchase-sup-name');
        const supPhoneEl = document.getElementById('detail-purchase-sup-phone');
        const itemsBodyEl = document.getElementById('detail-purchase-items-body');
        const totalEl = document.getElementById('detail-purchase-total');
        const paidEl = document.getElementById('detail-purchase-paid');
        const dueEl = document.getElementById('detail-purchase-due');
        const paymentsListEl = document.getElementById('detail-purchase-payments-history');
        const notesEl = document.getElementById('detail-purchase-notes');

        if (titleEl) titleEl.innerText = '#' + (p.invoiceNo || p.id);
        if (metaEl) metaEl.innerText = `កាលបរិច្ឆេទ៖ ${p.dateFormatted || new Date(p.date).toLocaleDateString('km-KH')}`;
        if (supNameEl) supNameEl.innerText = p.supplierName || 'អ្នកផ្គត់ផ្គង់ទូទៅ';
        if (supPhoneEl) supPhoneEl.innerText = p.supplierPhone ? `លេខទូរស័ព្ទ៖ ${p.supplierPhone}` : '';

        // Items list
        if (itemsBodyEl) {
            itemsBodyEl.innerHTML = (p.items || []).map((it, idx) => `
                <tr>
                    <td>${idx + 1}</td>
                    <td><strong>${it.name}</strong></td>
                    <td style="text-align: center; font-family: var(--font-nums);">${it.quantity}</td>
                    <td style="text-align: right; font-family: var(--font-nums);">$${(it.unitCost || 0).toFixed(2)}</td>
                    <td style="text-align: right; font-family: var(--font-nums); font-weight: 700; color: #38bdf8;">$${(it.totalCost || 0).toFixed(2)}</td>
                </tr>
            `).join('');
        }

        const tot = Number(p.totalAmount) || 0;
        const paid = Number(p.paidAmount) || 0;
        const due = Math.max(0, Number(p.balanceDue !== undefined ? p.balanceDue : (tot - paid)) || 0);

        if (totalEl) totalEl.innerText = `$${tot.toFixed(2)}`;
        if (paidEl) paidEl.innerText = `$${paid.toFixed(2)}`;
        if (dueEl) {
            dueEl.innerText = `$${due.toFixed(2)}`;
            dueEl.style.color = due > 0.009 ? '#ef4444' : '#10b981';
        }

        // Payments History
        if (paymentsListEl) {
            if (Array.isArray(p.payments) && p.payments.length > 0) {
                paymentsListEl.innerHTML = p.payments.map(pay => `
                    <div class="payment-history-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 6px; font-size: 12.5px;">
                        <div>
                            <span style="font-weight: 600; color: #f8fafc;"><i class="fa-solid fa-receipt text-green"></i> បានសង $${Number(pay.amount).toFixed(2)}</span>
                            <div style="font-size: 11px; color: var(--text-muted);"><i class="fa-regular fa-calendar"></i> ${new Date(pay.date).toLocaleDateString('km-KH')} • ${pay.note || pay.method || 'សាច់ប្រាក់'}</div>
                        </div>
                        <span class="mini-badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-weight: 700;">ជោគជ័យ</span>
                    </div>
                `).join('');
            } else {
                paymentsListEl.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">មិនទាន់មានប្រវត្តិនៃការសងប្រាក់នៅឡើយទេ</span>`;
            }
        }

        if (notesEl) {
            notesEl.innerText = p.notes ? `កំណត់ចំណាំ៖ ${p.notes}` : '';
            notesEl.style.display = p.notes ? 'block' : 'none';
        }

        modal.classList.add('show');
    },

    closeDetailModal: function() {
        const modal = document.getElementById('purchase-detail-modal');
        if (modal) modal.classList.remove('show');
    },

    // =======================================================
    // PAY SUPPLIER DEBT MODAL (សងបំណុលអ្នកផ្គត់ផ្គង់)
    // =======================================================
    openPayModal: function(id) {
        const purchases = Storage.getPurchases() || [];
        const p = purchases.find(item => item.id === id);
        if (!p) return;

        Purchases.activePurchaseForPay = p;

        const modal = document.getElementById('pay-supplier-debt-modal');
        if (!modal) return;

        const form = document.getElementById('form-pay-supplier-debt');
        if (form) form.reset();

        const supEl = document.getElementById('pay-debt-supplier-name');
        const invEl = document.getElementById('pay-debt-invoice-no');
        const currentDebtEl = document.getElementById('pay-debt-current-amount');
        const amountInput = document.getElementById('pay-debt-amount-input');
        const dateInput = document.getElementById('pay-debt-date');

        const due = Math.max(0, Number(p.balanceDue !== undefined ? p.balanceDue : (p.totalAmount - (p.paidAmount || 0))) || 0);

        if (supEl) supEl.innerText = p.supplierName || 'អ្នកផ្គត់ផ្គង់';
        if (invEl) invEl.innerText = '#' + (p.invoiceNo || p.id);
        if (currentDebtEl) currentDebtEl.innerText = `$${due.toFixed(2)}`;
        if (amountInput) {
            amountInput.value = due.toFixed(2);
            amountInput.max = due.toFixed(2);
        }
        if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

        modal.classList.add('show');
    },

    closePayModal: function() {
        const modal = document.getElementById('pay-supplier-debt-modal');
        if (modal) modal.classList.remove('show');
        Purchases.activePurchaseForPay = null;
    },

    handlePayDebt: function(e) {
        e.preventDefault();
        const p = Purchases.activePurchaseForPay;
        if (!p) return;

        const amountInput = document.getElementById('pay-debt-amount-input');
        const payAmount = parseFloat(amountInput?.value) || 0;
        const method = document.getElementById('pay-debt-method')?.value || 'cash';
        const dateStr = document.getElementById('pay-debt-date')?.value || new Date().toISOString().slice(0, 10);
        const note = document.getElementById('pay-debt-note')?.value.trim() || '';

        const currentDue = Math.max(0, Number(p.balanceDue !== undefined ? p.balanceDue : (p.totalAmount - (p.paidAmount || 0))) || 0);

        if (payAmount <= 0) {
            App.showToast('សូមបញ្ចូលចំនួនទឹកប្រាក់សងឱ្យបានត្រឹមត្រូវ!', 'error');
            return;
        }

        if (payAmount > currentDue + 0.01) {
            App.showToast(`ចំនួនទឹកប្រាក់សងលើសពីបំណុលជំពាក់ ($${currentDue.toFixed(2)})!`, 'error');
            return;
        }

        // 1. Update purchase record
        p.paidAmount = (p.paidAmount || 0) + payAmount;
        p.balanceDue = Math.max(0, currentDue - payAmount);
        p.paymentStatus = p.balanceDue <= 0.009 ? 'paid' : 'partial';

        if (!Array.isArray(p.payments)) p.payments = [];
        p.payments.push({
            id: 'pay-' + Date.now(),
            date: new Date(dateStr + 'T12:00:00').toISOString(),
            amount: payAmount,
            method: method,
            note: note || 'សងបំណុលអ្នកផ្គត់ផ្គង់'
        });

        // 2. Save purchases
        const purchases = Storage.getPurchases();
        const targetIdx = purchases.findIndex(item => item.id === p.id);
        if (targetIdx !== -1) {
            purchases[targetIdx] = p;
            Storage.savePurchases(purchases);
        }

        // 3. Automatically record as an expense in Finance!
        const expenses = Storage.getExpenses() || [];
        expenses.unshift({
            id: 'exp-' + Date.now(),
            date: new Date(dateStr + 'T12:00:00').toISOString(),
            title: `សងបំណុលអ្នកផ្គត់ផ្គង់៖ ${p.supplierName}`,
            type: 'expense',
            category: 'សងបំណុលអ្នកផ្គត់ផ្គង់',
            amount: payAmount,
            note: `សងលើវិក្កយបត្រ #${p.invoiceNo} (នៅសល់បំណុល $${p.balanceDue.toFixed(2)}) - ${method}`
        });
        Storage.saveExpenses(expenses);

        if (window.Finance && Finance.renderExpenses) {
            Finance.renderExpenses();
            Finance.renderDashboard();
        }

        Purchases.closePayModal();
        Purchases.render();

        App.showToast(`បានកត់ត្រាសងប្រាក់ $${payAmount.toFixed(2)} ទៅកាន់ "${p.supplierName}" ជោគជ័យ!`, 'success');
    },

    // =======================================================
    // DELETE PURCHASE
    // =======================================================
    deletePurchase: function(id) {
        if (!confirm('តើអ្នកពិតជាចង់លុបកំណត់ត្រាទិញចូលនេះមែនទេ? (ចំណាំ៖ ចំនួនស្តុកដែលបានបង្កើនរួច នឹងមិនត្រូវបានដកថយវិញទេ)')) {
            return;
        }

        let purchases = Storage.getPurchases() || [];
        const target = purchases.find(p => p.id === id);
        if (target && window.Storage && Storage.markDeletedId) {
            Storage.markDeletedId(target.id);
            if (target.invoiceNo) Storage.markDeletedId(target.invoiceNo);
        }

        purchases = purchases.filter(p => p.id !== id);
        Storage.savePurchases(purchases);

        Purchases.render();
        App.showToast('បានលុបកំណត់ត្រាទិញចូលរួចរាល់!', 'info');
    }
};
