/**
 * MHALY SHOP - FINANCE & DIRECTORY MODULE
 * Dashboard overview, Income & Expenses, Customers CRM, Suppliers, and Invoices archive
 */

const Finance = {
    expenseFilterRange: 'all',
    expenseFilterType: 'all',
    customerSearchQuery: '',
    supplierSearchQuery: '',
    invoiceSearchQuery: '',
    invoiceFilterMethod: 'all',

    init: function() {
        Finance.setupEventListeners();
        Finance.renderDashboard();
        Finance.renderExpenses();
        Finance.renderCustomers();
        Finance.renderSuppliers();
        Finance.renderInvoices();
        Finance.populateExpenseCategories();
    },

    setupEventListeners: function() {
        // --- EXPENSES LISTENERS ---
        const btnAddExpense = document.getElementById('btn-add-expense');
        const modalExpense = document.getElementById('expense-modal');
        const btnCloseExpense = document.getElementById('btn-close-expense-modal');
        const formExpense = document.getElementById('form-add-expense');

        if (btnAddExpense) {
            btnAddExpense.addEventListener('click', () => {
                formExpense.reset();
                const expIdEl = document.getElementById('exp-id');
                if (expIdEl) expIdEl.value = '';
                const modalTitle = document.getElementById('expense-modal-title');
                if (modalTitle) modalTitle.innerText = 'កត់ត្រាចំណូល / ចំណាយ';
                document.getElementById('exp-date').value = new Date().toISOString().slice(0, 10);
                const customBox = document.getElementById('exp-custom-cat-box');
                if (customBox) customBox.style.display = 'none';
                const customInput = document.getElementById('exp-custom-category');
                if (customInput) customInput.value = '';
                Finance.populateExpenseCategories();
                modalExpense.classList.add('show');
            });
        }
        if (btnCloseExpense) {
            btnCloseExpense.addEventListener('click', () => modalExpense.classList.remove('show'));
        }
        if (formExpense) {
            formExpense.addEventListener('submit', (e) => {
                e.preventDefault();
                Finance.handleSaveExpense();
            });
        }

        // Custom Category Listeners
        const expCategorySelect = document.getElementById('exp-category');
        const customCatBox = document.getElementById('exp-custom-cat-box');
        const customCatInput = document.getElementById('exp-custom-category');
        const toggleCustomCatBtn = document.getElementById('btn-toggle-custom-exp-cat');
        const expTypeSelectModal = document.getElementById('exp-type');

        if (expCategorySelect) {
            expCategorySelect.addEventListener('change', (e) => {
                if (e.target.value === '__custom__') {
                    if (customCatBox) customCatBox.style.display = 'block';
                    if (customCatInput) customCatInput.focus();
                } else {
                    if (customCatBox) customCatBox.style.display = 'none';
                }
            });
        }

        if (toggleCustomCatBtn) {
            toggleCustomCatBtn.addEventListener('click', () => {
                if (customCatBox) {
                    const isHidden = customCatBox.style.display === 'none';
                    customCatBox.style.display = isHidden ? 'block' : 'none';
                    if (isHidden) {
                        if (expCategorySelect) expCategorySelect.value = '__custom__';
                        if (customCatInput) customCatInput.focus();
                    }
                }
            });
        }

        if (expTypeSelectModal) {
            expTypeSelectModal.addEventListener('change', () => {
                Finance.populateExpenseCategories();
            });
        }

        // Expense Filters
        document.querySelectorAll('.exp-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.exp-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                Finance.expenseFilterRange = btn.dataset.range;
                Finance.renderExpenses();
            });
        });

        const expTypeSelect = document.getElementById('filter-expense-type');
        if (expTypeSelect) {
            expTypeSelect.addEventListener('change', (e) => {
                Finance.expenseFilterType = e.target.value;
                Finance.renderExpenses();
            });
        }

        // --- CUSTOMERS LISTENERS ---
        const btnAddCustomer = document.getElementById('btn-add-customer');
        const modalCustomer = document.getElementById('customer-modal');
        const btnCloseCustomer = document.getElementById('btn-close-customer-modal');
        const formCustomer = document.getElementById('form-add-customer');
        const searchCustomer = document.getElementById('customer-search-input');

        if (btnAddCustomer) {
            btnAddCustomer.addEventListener('click', () => {
                formCustomer.reset();
                modalCustomer.classList.add('show');
            });
        }
        if (btnCloseCustomer) {
            btnCloseCustomer.addEventListener('click', () => modalCustomer.classList.remove('show'));
        }
        if (formCustomer) {
            formCustomer.addEventListener('submit', (e) => {
                e.preventDefault();
                Finance.handleSaveCustomer();
            });
        }
        if (searchCustomer) {
            searchCustomer.addEventListener('input', (e) => {
                Finance.customerSearchQuery = e.target.value.toLowerCase();
                Finance.renderCustomers();
            });
        }

        // Customer Debt Repayment Modal Listeners
        const modalPayCustomer = document.getElementById('pay-customer-debt-modal');
        const btnClosePayCust = document.getElementById('btn-close-pay-customer-modal');
        const btnCancelPayCust = document.getElementById('btn-cancel-pay-customer');
        const formPayCustomer = document.getElementById('form-pay-customer-debt');
        const inputPayCustAmount = document.getElementById('pay-cust-amount-input');
        const btnPayCustFull = document.getElementById('btn-pay-cust-full');
        const btnPayCustHalf = document.getElementById('btn-pay-cust-half');

        if (btnClosePayCust) {
            btnClosePayCust.addEventListener('click', () => {
                if (modalPayCustomer) modalPayCustomer.classList.remove('show');
            });
        }
        if (btnCancelPayCust) {
            btnCancelPayCust.addEventListener('click', () => {
                if (modalPayCustomer) modalPayCustomer.classList.remove('show');
            });
        }
        if (modalPayCustomer) {
            modalPayCustomer.addEventListener('click', (e) => {
                if (e.target === modalPayCustomer) modalPayCustomer.classList.remove('show');
            });
        }
        if (inputPayCustAmount) {
            inputPayCustAmount.addEventListener('input', () => {
                const custId = document.getElementById('pay-cust-id')?.value;
                const cust = (Storage.getCustomers() || []).find(c => c.id === custId);
                const currentDebt = cust ? Number(cust.debt !== undefined ? cust.debt : (cust.debtAmount || 0)) : 0;
                const payVal = parseFloat(inputPayCustAmount.value) || 0;
                Finance.updateCustomerDebtRemainingPreview(currentDebt, payVal);
            });
        }
        if (btnPayCustFull) {
            btnPayCustFull.addEventListener('click', () => {
                const custId = document.getElementById('pay-cust-id')?.value;
                const cust = (Storage.getCustomers() || []).find(c => c.id === custId);
                const currentDebt = cust ? Number(cust.debt !== undefined ? cust.debt : (cust.debtAmount || 0)) : 0;
                if (inputPayCustAmount) {
                    inputPayCustAmount.value = currentDebt.toFixed(2);
                    Finance.updateCustomerDebtRemainingPreview(currentDebt, currentDebt);
                }
            });
        }
        if (btnPayCustHalf) {
            btnPayCustHalf.addEventListener('click', () => {
                const custId = document.getElementById('pay-cust-id')?.value;
                const cust = (Storage.getCustomers() || []).find(c => c.id === custId);
                const currentDebt = cust ? Number(cust.debt !== undefined ? cust.debt : (cust.debtAmount || 0)) : 0;
                const half = Math.round((currentDebt / 2) * 100) / 100;
                if (inputPayCustAmount) {
                    inputPayCustAmount.value = half.toFixed(2);
                    Finance.updateCustomerDebtRemainingPreview(currentDebt, half);
                }
            });
        }
        if (formPayCustomer) {
            formPayCustomer.addEventListener('submit', (e) => {
                e.preventDefault();
                Finance.handleCustomerDebtPayment();
            });
        }

        // --- SUPPLIERS LISTENERS ---
        const btnAddSupplier = document.getElementById('btn-add-supplier');
        const modalSupplier = document.getElementById('supplier-modal');
        const btnCloseSupplier = document.getElementById('btn-close-supplier-modal');
        const formSupplier = document.getElementById('form-add-supplier');
        const searchSupplier = document.getElementById('supplier-search-input');

        if (btnAddSupplier) {
            btnAddSupplier.addEventListener('click', () => {
                formSupplier.reset();
                modalSupplier.classList.add('show');
            });
        }
        if (btnCloseSupplier) {
            btnCloseSupplier.addEventListener('click', () => modalSupplier.classList.remove('show'));
        }
        if (formSupplier) {
            formSupplier.addEventListener('submit', (e) => {
                e.preventDefault();
                Finance.handleSaveSupplier();
            });
        }
        if (searchSupplier) {
            searchSupplier.addEventListener('input', (e) => {
                Finance.supplierSearchQuery = e.target.value.toLowerCase();
                Finance.renderSuppliers();
            });
        }

        // --- INVOICES LISTENERS ---
        const searchInvoice = document.getElementById('invoice-search-input');
        const filterInvMethod = document.getElementById('filter-invoice-method');

        if (searchInvoice) {
            searchInvoice.addEventListener('input', (e) => {
                Finance.invoiceSearchQuery = e.target.value.toLowerCase();
                Finance.renderInvoices();
            });
        }
        if (filterInvMethod) {
            filterInvMethod.addEventListener('change', (e) => {
                Finance.invoiceFilterMethod = e.target.value;
                Finance.renderInvoices();
            });
        }
    },

    // =======================================================
    // 1. DASHBOARD
    // =======================================================
    updateDashboardKPIs: function() {
        Finance.renderDashboard();
    },

    renderDashboard: function() {
        const sales = Storage.getSales();
        const products = Storage.getProducts();
        const expenses = Storage.getExpenses();
        const customers = Storage.getCustomers();
        const settings = Storage.getSettings();
        const rate = settings.exchangeRate || 4100;
        const now = new Date();

        // 1. Today sales
        const todaySales = sales.filter(s => Storage.isDateToday(s.date));
        const todayTotalUsd = todaySales.reduce((sum, s) => sum + (Number(s.totalUsd !== undefined ? s.totalUsd : s.total) || 0), 0);

        // 2. Month sales
        const monthSales = sales.filter(s => {
            const d = new Date(s.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const monthTotalUsd = monthSales.reduce((sum, s) => sum + (Number(s.totalUsd !== undefined ? s.totalUsd : s.total) || 0), 0);

        // 3. Gross Profit
        let totalRev = 0;
        let totalCost = 0;
        sales.forEach(s => {
            totalRev += (Number(s.totalUsd !== undefined ? s.totalUsd : s.total) || 0);
            (s.items || []).forEach(i => totalCost += ((Number(i.cost) || 0) * (Number(i.quantity) || 1)));
        });
        const totalProfit = Math.max(0, totalRev - totalCost);

        // 4. Phones in stock
        let totalPhonesInStock = 0;
        products.forEach(p => {
            if (p.hasImei) {
                totalPhonesInStock += (p.imeis || []).filter(i => i.status === 'in_stock').length;
            } else {
                totalPhonesInStock += (p.stockCount || 0);
            }
        });

        // 5. Total Customer Debt
        const totalDebt = customers.reduce((sum, c) => sum + (c.debt || 0), 0);

        // 6. Today's Expenses
        const todayExpenses = expenses.filter(e => e.type === 'expense' && Storage.isDateToday(e.date))
                                      .reduce((sum, e) => sum + e.amount, 0);

        // Update Dashboard DOM
        const dTodayRev = document.getElementById('dash-today-rev');
        const dTodayKhr = document.getElementById('dash-today-khr');
        const dMonthRev = document.getElementById('dash-month-rev');
        const dProfit = document.getElementById('dash-profit');
        const dStockCount = document.getElementById('dash-stock-count');
        const dDebt = document.getElementById('dash-debt');
        const dTodayExp = document.getElementById('dash-today-exp');

        const isKhr = (window.App && App.getCurrency) ? (App.getCurrency() === 'KHR') : false;

        if (dTodayRev) {
            dTodayRev.innerText = isKhr ? `${Math.round(todayTotalUsd * rate).toLocaleString()} ៛` : `$${todayTotalUsd.toFixed(2)}`;
        }
        if (dTodayKhr) {
            dTodayKhr.innerText = isKhr ? `$${todayTotalUsd.toFixed(2)}` : `${Math.round(todayTotalUsd * rate).toLocaleString()} ៛`;
        }
        if (dMonthRev) {
            dMonthRev.innerText = isKhr ? `${Math.round(monthTotalUsd * rate).toLocaleString()} ៛` : `$${monthTotalUsd.toFixed(2)}`;
        }
        if (dProfit) {
            dProfit.innerText = isKhr ? `+${Math.round(totalProfit * rate).toLocaleString()} ៛` : `+$${totalProfit.toFixed(2)}`;
        }
        if (dStockCount) dStockCount.innerText = `${totalPhonesInStock} គ្រឿង`;
        if (dDebt) {
            dDebt.innerText = isKhr ? `${Math.round(totalDebt * rate).toLocaleString()} ៛` : `$${totalDebt.toFixed(2)}`;
        }
        if (dTodayExp) {
            dTodayExp.innerText = isKhr ? `${Math.round(todayExpenses * rate).toLocaleString()} ៛` : `$${todayExpenses.toFixed(2)}`;
        }

        // Dashboard Recent Sales Preview
        const dashSalesList = document.getElementById('dash-recent-sales');
        if (dashSalesList) {
            const recents = sales.slice(0, 5);
            if (recents.length === 0) {
                dashSalesList.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px;">មិនទាន់មានការលក់នៅឡើយទេ</p>`;
            } else {
                dashSalesList.innerHTML = recents.map(s => {
                    const itemInfo = Storage.formatSaleItemsSummary(s, 2);
                    const invId = s.invoiceId || s.id || 'INV';
                    const timeStr = s.date ? new Date(s.date).toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' }) : '';
                    const totalVal = Number(s.totalUsd !== undefined ? s.totalUsd : s.total) || 0;
                    const priceMain = isKhr ? `${Math.round(totalVal * rate).toLocaleString()} ៛` : `$${totalVal.toFixed(2)}`;
                    const priceSub = isKhr ? `$${totalVal.toFixed(2)}` : `${Math.round(totalVal * rate).toLocaleString()} ៛`;
                    return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-subtle); gap: 12px;">
                        <div style="min-width: 0; flex: 1;">
                            <div style="font-weight: 700; color: #f8fafc; font-size: 13.5px; line-height: 1.35; margin-bottom: 3px; word-break: break-word;" title="${itemInfo.fullText}">
                                <i class="fa-solid fa-box text-sky" style="font-size: 11.5px; margin-right: 5px; opacity: 0.85;"></i>${itemInfo.display}
                            </div>
                            <div style="font-size: 11.5px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <span style="color: #38bdf8; font-family: var(--font-nums); font-weight: 600;">#${invId}</span>
                                <span>&bull;</span>
                                <span>${s.customerName || 'អតិថិជនទូទៅ'}</span>
                                ${timeStr ? `<span>&bull;</span><span>${timeStr}</span>` : ''}
                            </div>
                        </div>
                        <div style="text-align: right; flex-shrink: 0;">
                            <strong style="color: #34d399; font-family: var(--font-nums); font-size: 14.5px;">${priceMain}</strong>
                            <div style="font-size: 10.5px; color: var(--text-muted); font-family: var(--font-nums);">${priceSub}</div>
                            <div style="font-size: 9.5px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">${(s.paymentMethod || 'CASH').toUpperCase()}</div>
                        </div>
                    </div>
                    `;
                }).join('');
            }
        }

        // Dashboard Low Stock Alerts
        const dashLowStock = document.getElementById('dash-low-stock-list');
        if (dashLowStock) {
            const lowItems = [];
            products.forEach(p => {
                const count = p.hasImei ? (p.imeis || []).filter(i => i.status === 'in_stock').length : (p.stockCount || 0);
                if (count <= 2) {
                    lowItems.push({ name: p.name, count: count, hasImei: p.hasImei });
                }
            });

            if (lowItems.length === 0) {
                dashLowStock.innerHTML = `<p style="color: #34d399; text-align: center; padding: 20px;"><i class="fa-solid fa-circle-check"></i> ស្តុកទំនិញទាំងអស់មានគ្រប់គ្រាន់</p>`;
            } else {
                dashLowStock.innerHTML = lowItems.slice(0, 5).map(item => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-subtle);">
                        <span style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${item.name}</span>
                        <span class="stock-tag ${item.count === 0 ? 'out-stock' : 'low-stock'}">
                            ${item.count === 0 ? 'អស់ស្តុក' : `នៅសល់ ${item.count}`}
                        </span>
                    </div>
                `).join('');
            }
        }
    },

    // =======================================================
    // 2. EXPENSES & INCOME
    // =======================================================
    renderExpenses: function() {
        const tbody = document.getElementById('expenses-table-body');
        const expTotalEl = document.getElementById('exp-summary-total');
        const incTotalEl = document.getElementById('inc-summary-total');
        const netTotalEl = document.getElementById('net-summary-total');
        if (!tbody) return;

        const expenses = Storage.getExpenses();
        const now = new Date();

        let filtered = expenses.filter(e => {
            const d = new Date(e.date);
            let matchesRange = true;

            if (Finance.expenseFilterRange === 'today') {
                matchesRange = d.toDateString() === now.toDateString();
            } else if (Finance.expenseFilterRange === 'this_week') {
                const diffTime = Math.abs(now - d);
                matchesRange = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) <= 7;
            } else if (Finance.expenseFilterRange === 'this_month') {
                matchesRange = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }

            let matchesType = true;
            if (Finance.expenseFilterType !== 'all') {
                matchesType = e.type === Finance.expenseFilterType;
            }

            return matchesRange && matchesType;
        });

        // Calculate Totals
        let totalExpense = 0;
        let totalIncome = 0;
        filtered.forEach(e => {
            if (e.type === 'expense') totalExpense += e.amount;
            else totalIncome += e.amount;
        });
        const netBalance = totalIncome - totalExpense;

        if (expTotalEl) expTotalEl.innerText = `$${totalExpense.toFixed(2)}`;
        if (incTotalEl) incTotalEl.innerText = `$${totalIncome.toFixed(2)}`;
        if (netTotalEl) {
            netTotalEl.innerText = `${netBalance >= 0 ? '+' : ''}$${netBalance.toFixed(2)}`;
            netTotalEl.style.color = netBalance >= 0 ? '#34d399' : '#f87171';
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">
                        មិនទាន់មានទិន្នន័យចំណូល/ចំណាយក្នុងចន្លោះពេលនេះទេ
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(e => `
            <tr>
                <td style="font-size: 12.5px; color: var(--text-secondary);">${new Date(e.date).toLocaleDateString('km-KH')}</td>
                <td><strong style="color: var(--text-primary);">${e.title}</strong></td>
                <td><span class="mini-badge badge-condition">${e.category || 'ទូទៅ'}</span></td>
                <td>
                    ${e.type === 'expense' ? `
                        <span style="color: #f87171; font-weight: 700; font-size: 11.5px; background: rgba(239, 68, 68, 0.15); padding: 2px 8px; border-radius: 4px;">
                            <i class="fa-solid fa-arrow-trend-down"></i> ចំណាយ
                        </span>
                    ` : `
                        <span style="color: #34d399; font-weight: 700; font-size: 11.5px; background: rgba(16, 185, 129, 0.15); padding: 2px 8px; border-radius: 4px;">
                            <i class="fa-solid fa-arrow-trend-up"></i> ចំណូល
                        </span>
                    `}
                </td>
                <td style="font-family: var(--font-nums); font-weight: 800; font-size: 14.5px; color: ${e.type === 'expense' ? '#f87171' : '#34d399'};">
                    ${e.type === 'expense' ? '-' : '+'}$${e.amount.toFixed(2)}
                </td>
                <td style="font-size: 12px; color: var(--text-muted);">${e.note || '-'}</td>
                <td class="text-right">
                    <button class="btn-secondary" style="padding: 4px 8px; font-size: 11px; margin-right: 4px; background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);" onclick="Finance.openEditExpense('${e.id}')" title="កែប្រែ">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn-remove-item" onclick="Finance.deleteExpense('${e.id}')" title="លុបចោល">
                        <i class="fa-solid fa-trash-can" style="color: #f87171;"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    openEditExpense: function(id) {
        const expenses = Storage.getExpenses();
        const exp = expenses.find(e => e.id === id);
        if (!exp) return;

        const expIdEl = document.getElementById('exp-id');
        if (expIdEl) expIdEl.value = exp.id;
        const modalTitle = document.getElementById('expense-modal-title');
        if (modalTitle) modalTitle.innerText = 'កែប្រែកំណត់ត្រាចំណូល / ចំណាយ';
        document.getElementById('exp-title').value = exp.title || '';
        document.getElementById('exp-type').value = exp.type || 'expense';
        Finance.populateExpenseCategories(exp.category);

        document.getElementById('exp-amount').value = exp.amount !== undefined ? exp.amount : 0;
        document.getElementById('exp-date').value = exp.date ? new Date(exp.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        document.getElementById('exp-note').value = exp.note || '';

        document.getElementById('expense-modal').classList.add('show');
    },

    populateExpenseCategories: function(selectedVal) {
        const catSelect = document.getElementById('exp-category');
        const customCatBox = document.getElementById('exp-custom-cat-box');
        const customCatInput = document.getElementById('exp-custom-category');
        const typeSelect = document.getElementById('exp-type');
        const type = typeSelect ? typeSelect.value : 'expense';
        if (!catSelect) return;

        const defaultExpenseCats = [
            'ថ្លៃជួលទីតាំង',
            'ទឹកភ្លើង & Wi-Fi',
            'សេវាកម្មជួសជុល',
            'ប្រាក់ខែ/អាហារបុគ្គលិក',
            'ថ្លៃដឹកជញ្ជូន',
            'ទិញសម្ភារៈ/របស់របរ',
            'ចំណាយទូទៅ'
        ];

        const defaultIncomeCats = [
            'សេវាកម្មជួសជុល/ដូរគ្រឿង',
            'លក់គ្រឿងបន្លាស់ចាស់',
            'កំរៃជើងសារ/Commission',
            'សងបំណុល/ជំពាក់',
            'ចំណូលទូទៅ'
        ];

        const baseList = type === 'income' ? defaultIncomeCats : defaultExpenseCats;

        // Collect past custom categories from storage
        const expenses = Storage.getExpenses();
        const pastCats = new Set();
        expenses.forEach(e => {
            if (e.type === type && e.category && !baseList.includes(e.category)) {
                pastCats.add(e.category);
            }
        });

        let html = '';
        baseList.forEach(c => {
            html += `<option value="${c}">${c}</option>`;
        });
        if (pastCats.size > 0) {
            html += `<optgroup label="ជំពូកដែលធ្លាប់បង្កើតកន្លងមក">`;
            pastCats.forEach(c => {
                html += `<option value="${c}">${c}</option>`;
            });
            html += `</optgroup>`;
        }
        html += `<option value="__custom__">+ វាយបញ្ចូលជំពូកថ្មីដោយផ្ទាល់ (Custom)...</option>`;

        catSelect.innerHTML = html;

        if (selectedVal) {
            if (baseList.includes(selectedVal) || pastCats.has(selectedVal)) {
                catSelect.value = selectedVal;
                if (customCatBox) customCatBox.style.display = 'none';
            } else {
                catSelect.value = '__custom__';
                if (customCatBox) customCatBox.style.display = 'block';
                if (customCatInput) customCatInput.value = selectedVal;
            }
        } else {
            catSelect.selectedIndex = 0;
            if (customCatBox) customCatBox.style.display = 'none';
            if (customCatInput) customCatInput.value = '';
        }
    },

    handleSaveExpense: function() {
        const idInput = document.getElementById('exp-id');
        const editId = idInput ? idInput.value : '';
        const title = document.getElementById('exp-title').value.trim();
        const type = document.getElementById('exp-type').value;
        const categorySelect = document.getElementById('exp-category').value;
        const customCatBox = document.getElementById('exp-custom-cat-box');
        const customCategory = document.getElementById('exp-custom-category').value.trim();
        const amount = parseFloat(document.getElementById('exp-amount').value) || 0;
        const date = document.getElementById('exp-date').value || new Date().toISOString();
        const note = document.getElementById('exp-note').value.trim();

        if (!title || amount <= 0) {
            App.showToast('សូមបញ្ចូលបរិយាយ និងចំនួនទឹកប្រាក់ឱ្យបានត្រឹមត្រូវ!', 'error');
            return;
        }

        // Determine final category (If __custom__ or custom box visible and filled)
        let finalCategory = categorySelect;
        if (categorySelect === '__custom__' || (customCatBox && customCatBox.style.display !== 'none' && customCategory)) {
            finalCategory = customCategory || (type === 'income' ? 'ចំណូលទូទៅ' : 'ចំណាយទូទៅ');
        }

        let expenses = Storage.getExpenses();

        if (editId) {
            const target = expenses.find(e => e.id === editId);
            if (target) {
                target.title = title;
                target.type = type;
                target.category = finalCategory;
                target.amount = amount;
                target.date = new Date(date).toISOString();
                target.note = note;
                App.showToast(`បានកែប្រែកំណត់ត្រា "${title}" ជោគជ័យ!`, 'success');
            }
        } else {
            const newExp = {
                id: 'exp-' + Date.now(),
                date: new Date(date).toISOString(),
                title: title,
                type: type,
                category: finalCategory,
                amount: amount,
                note: note
            };
            expenses.unshift(newExp);
            App.showToast(`បានកត់ត្រា "${title}" $${amount} (${finalCategory}) ជោគជ័យ!`, 'success');
        }

        Storage.saveExpenses(expenses);

        document.getElementById('expense-modal').classList.remove('show');
        Finance.renderExpenses();
        Finance.renderDashboard();
    },

    deleteExpense: async function(id) {
        if (!id) return;
        if (confirm('តើអ្នកពិតជាចង់លុបកំណត់ត្រានេះមែនទេ?')) {
            if (window.Storage && Storage.deleteExpense) {
                await Storage.deleteExpense(id);
            } else {
                if (window.Storage && Storage.markDeletedId) {
                    Storage.markDeletedId(id);
                }
                let expenses = Storage.getExpenses();
                expenses = expenses.filter(e => e.id !== id);
                Storage.saveExpenses(expenses);
            }
            Finance.renderExpenses();
            Finance.renderDashboard();
            if (typeof App !== 'undefined' && App.showToast) {
                App.showToast('បានលុបកំណត់ត្រាជោគជ័យ!', 'success');
            }
        }
    },

    // =======================================================
    // 3. CUSTOMERS
    // =======================================================
    renderCustomers: function() {
        const tbody = document.getElementById('customers-table-body');
        const custCountEl = document.getElementById('cust-summary-count');
        const custDebtEl = document.getElementById('cust-summary-debt');
        if (!tbody) return;

        const customers = Storage.getCustomers();

        let filtered = customers.filter(c => {
            if (!Finance.customerSearchQuery) return true;
            return c.name.toLowerCase().includes(Finance.customerSearchQuery) ||
                   c.phone.includes(Finance.customerSearchQuery) ||
                   (c.address && c.address.toLowerCase().includes(Finance.customerSearchQuery));
        });

        const totalDebt = customers.reduce((sum, c) => sum + (c.debt !== undefined ? c.debt : (c.debtAmount || 0)), 0);
        if (custCountEl) custCountEl.innerText = `${customers.length} នាក់`;
        if (custDebtEl) custDebtEl.innerText = `$${totalDebt.toFixed(2)}`;

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">
                        មិនមានទិន្នន័យអតិថិជនត្រូវនឹងការស្វែងរកទេ
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(c => {
            const customerDebt = c.debt !== undefined ? c.debt : (c.debtAmount || 0);
            const customerSpent = (c.totalSpent !== undefined ? c.totalSpent : (c.totalPurchased || 0));
            const customerOrders = (c.totalOrders !== undefined ? c.totalOrders : (c.ordersCount || 0));
            const hasDebt = customerDebt > 0.009;
            const rowClass = 'customer-row ' + (hasDebt ? 'customer-row-debt' : 'customer-row-paid');
            return `
            <tr class="${rowClass}">
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="purchase-beacon-dot ${hasDebt ? 'beacon-red' : 'beacon-green'}"></span>
                        <strong style="color: var(--text-primary); font-size: 14px;">${c.name}</strong>
                    </div>
                </td>
                <td><span style="font-family: var(--font-nums); color: #38bdf8; font-weight: 600;">${c.phone}</span></td>
                <td style="font-size: 12.5px; color: var(--text-secondary);">${c.address || 'រាជធានីភ្នំពេញ'}</td>
                <td style="font-family: var(--font-nums); font-weight: 700; color: #34d399;">$${customerSpent.toFixed(2)}</td>
                <td>
                    ${hasDebt ? `
                        <strong style="color: #f87171; font-family: var(--font-nums); font-size: 14px; display: inline-flex; align-items: center; gap: 4px;">
                            <span class="debt-pulse-dot"></span> $${customerDebt.toFixed(2)}
                        </strong>
                    ` : `
                        <span style="color: #34d399; font-size: 11.5px;"><i class="fa-solid fa-check"></i> គ្មានបំណុល</span>
                    `}
                </td>
                <td><span class="mini-badge badge-color">${customerOrders} លើក</span></td>
                <td class="text-right">
                    <div style="display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end;">
                        ${hasDebt ? `
                            <button class="btn-quick-pay-debt" onclick="Finance.settleCustomerDebt('${c.id}')" title="កត់ត្រាសងបំណុល">
                                <i class="fa-solid fa-hand-holding-dollar"></i> សងប្រាក់
                            </button>
                        ` : ''}
                        <button class="btn-remove-item" onclick="Finance.deleteCustomer('${c.id}')" title="លុបអតិថិជន">
                            <i class="fa-solid fa-trash-can" style="color: #f87171;"></i>
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    },

    handleSaveCustomer: function() {
        const name = document.getElementById('cust-name').value.trim();
        const phone = document.getElementById('cust-phone').value.trim();
        const address = document.getElementById('cust-address').value.trim();
        const initialDebt = parseFloat(document.getElementById('cust-initial-debt').value) || 0;

        if (!name || !phone) {
            App.showToast('សូមបញ្ចូលឈ្មោះ និងលេខទូរស័ព្ទអតិថិជន!', 'error');
            return;
        }

        const newCust = {
            id: 'cust-' + Date.now(),
            name: name,
            phone: phone,
            address: address,
            debt: initialDebt,
            totalSpent: 0,
            totalOrders: 0,
            createdDate: new Date().toISOString()
        };

        const customers = Storage.getCustomers();
        customers.unshift(newCust);
        Storage.saveCustomers(customers);

        document.getElementById('customer-modal').classList.remove('show');
        Finance.renderCustomers();
        Finance.renderDashboard();
        App.showToast(`បានបញ្ចូលអតិថិជន "${name}" ជោគជ័យ!`, 'success');
    },

    openPayCustomerDebtModal: function(customerId) {
        const customers = Storage.getCustomers() || [];
        const cust = customers.find(c => c.id === customerId);
        if (!cust) return;

        const currentDebt = Number(cust.debt !== undefined ? cust.debt : (cust.debtAmount || 0));
        if (currentDebt <= 0.001) {
            App.showToast('អតិថិជន "' + cust.name + '" មិនមានបំណុលជំពាក់ទេ!', 'info');
            return;
        }

        const modal = document.getElementById('pay-customer-debt-modal');
        const idInput = document.getElementById('pay-cust-id');
        const nameEl = document.getElementById('pay-cust-name-display');
        const phoneEl = document.getElementById('pay-cust-phone-display');
        const debtEl = document.getElementById('pay-cust-current-debt-display');
        const amountInput = document.getElementById('pay-cust-amount-input');
        const dateInput = document.getElementById('pay-cust-date');
        const noteInput = document.getElementById('pay-cust-note');

        if (idInput) idInput.value = cust.id;
        if (nameEl) nameEl.innerText = cust.name || 'អតិថិជនទូទៅ';
        if (phoneEl) phoneEl.innerText = cust.phone || 'គ្មានលេខទូរស័ព្ទ';
        if (debtEl) debtEl.innerText = `$${currentDebt.toFixed(2)}`;
        if (amountInput) amountInput.value = currentDebt.toFixed(2);
        if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
        if (noteInput) noteInput.value = '';

        Finance.updateCustomerDebtRemainingPreview(currentDebt, currentDebt);

        if (modal) modal.classList.add('show');
        if (amountInput) {
            setTimeout(() => {
                amountInput.focus();
                amountInput.select();
            }, 100);
        }
    },

    updateCustomerDebtRemainingPreview: function(currentDebt, payAmount) {
        const remainingEl = document.getElementById('pay-cust-remaining-display');
        if (!remainingEl) return;
        const remaining = Math.max(0, currentDebt - (payAmount || 0));
        if (remaining <= 0.001) {
            remainingEl.innerHTML = '<span style="color: #34d399;"><i class="fa-solid fa-circle-check"></i> $0.00 (សងអស់ / គ្មានបំណុល)</span>';
        } else {
            remainingEl.innerHTML = `<span style="color: #f87171;">$${remaining.toFixed(2)}</span>`;
        }
    },

    handleCustomerDebtPayment: function() {
        const custId = document.getElementById('pay-cust-id')?.value;
        const amountInput = document.getElementById('pay-cust-amount-input');
        const methodSelect = document.getElementById('pay-cust-method');
        const dateInput = document.getElementById('pay-cust-date');
        const noteInput = document.getElementById('pay-cust-note');

        const customers = Storage.getCustomers() || [];
        const cust = customers.find(c => c.id === custId);
        if (!cust) {
            App.showToast('រកមិនឃើញទិន្នន័យអតិថិជនទេ!', 'error');
            return;
        }

        const currentDebt = Number(cust.debt !== undefined ? cust.debt : (cust.debtAmount || 0));
        const payAmount = parseFloat(amountInput?.value);

        if (isNaN(payAmount) || payAmount <= 0) {
            App.showToast('សូមបញ្ចូលចំនួនទឹកប្រាក់សងឱ្យបានត្រឹមត្រូវ!', 'error');
            if (amountInput) amountInput.focus();
            return;
        }

        if (payAmount > (currentDebt + 0.01)) {
            App.showToast(`ចំនួនទឹកប្រាក់សង ($${payAmount.toFixed(2)}) លើសពីបំណុលជាក់ស្តែង ($${currentDebt.toFixed(2)})!`, 'warning');
            return;
        }

        const payMethod = methodSelect?.value || 'cash';
        const dateStr = dateInput?.value || new Date().toISOString().slice(0, 10);
        const note = noteInput?.value.trim() || '';

        // 1. Update Customer Record
        const newDebt = Math.max(0, currentDebt - payAmount);
        cust.debt = newDebt;
        cust.debtAmount = newDebt;
        cust.repayments = cust.repayments || [];
        cust.repayments.unshift({
            id: 'rep-' + Date.now(),
            date: dateStr,
            amount: payAmount,
            method: payMethod,
            note: note,
            previousDebt: currentDebt,
            remainingDebt: newDebt
        });
        Storage.saveCustomers(customers);

        // 2. Synchronize Matching Unpaid Debt Invoices in Sales History (FIFO allocation)
        const sales = Storage.getSales() || [];
        const custPhone = cust.phone ? cust.phone.trim() : '';
        const custName = cust.name ? cust.name.trim() : '';

        const debtSales = sales.filter(s => {
            if (!s) return false;
            const method = String(s.paymentMethod || '').toLowerCase();
            if (!method.includes('debt')) return false;
            if (s.debtSettled === true) return false;
            const sPhone = String(s.customerPhone || '').trim();
            const sName = String(s.customerName || '').trim();
            const phoneMatch = custPhone && sPhone && custPhone !== '012 xxx xxx' && sPhone === custPhone;
            const nameMatch = custName && sName && custName !== 'អតិថិជនទូទៅ' && sName === custName;
            return phoneMatch || nameMatch;
        });

        // Sort oldest first so past debt invoices are paid off first
        debtSales.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

        let unallocatedRepay = payAmount;
        debtSales.forEach(s => {
            if (unallocatedRepay <= 0.001) return;
            const saleTotal = Number(s.totalUsd !== undefined ? s.totalUsd : s.total) || 0;
            const currentRemaining = s.debtRemaining !== undefined ? Number(s.debtRemaining) : saleTotal;

            if (currentRemaining <= 0.001) {
                s.debtSettled = true;
                s.debtRemaining = 0;
                return;
            }

            s.repayments = s.repayments || [];
            if (unallocatedRepay >= currentRemaining - 0.001) {
                // Fully cleared this invoice
                s.debtRemaining = 0;
                s.paidUsd = saleTotal;
                s.debtSettled = true;
                s.repayments.push({
                    date: dateStr,
                    amount: currentRemaining,
                    method: payMethod,
                    note: note
                });
                unallocatedRepay -= currentRemaining;
            } else {
                // Partial payment
                s.debtRemaining = Math.max(0, currentRemaining - unallocatedRepay);
                s.paidUsd = (s.paidUsd || 0) + unallocatedRepay;
                s.debtSettled = false;
                s.repayments.push({
                    date: dateStr,
                    amount: unallocatedRepay,
                    method: payMethod,
                    note: note
                });
                unallocatedRepay = 0;
            }
        });
        Storage.saveSales(sales);

        // 3. Record Income in Expenses/Cashflow
        const expenses = Storage.getExpenses() || [];
        expenses.unshift({
            id: 'inc-' + Date.now(),
            date: new Date(dateStr).toISOString(),
            title: `អតិថិជន ${cust.name} សងបំណុល ($${payAmount.toFixed(2)})`,
            type: 'income',
            category: 'សងបំណុល/ជំពាក់',
            amount: payAmount,
            paymentMethod: payMethod,
            note: `ទូទាត់បំណុលអតិថិជន ${cust.name} (${cust.phone || ''}) ${note ? '- ' + note : ''}`
        });
        Storage.saveExpenses(expenses);

        // 4. Close Modal, Beep & Toast
        const modal = document.getElementById('pay-customer-debt-modal');
        if (modal) modal.classList.remove('show');
        App.playBeep();
        const remainingMsg = newDebt > 0.001 ? ` (នៅសល់ជំពាក់ $${newDebt.toFixed(2)})` : ' (សងដាច់អស់គ្មានបំណុល)';
        App.showToast(`បានកត់ត្រាការសងប្រាក់ $${payAmount.toFixed(2)} ជោគជ័យ!${remainingMsg}`, 'success');

        // 5. Instantly Refresh All Tabs & Live Sync
        Finance.renderCustomers();
        Finance.renderExpenses();
        Finance.updateDashboardKPIs();
        if (window.Reports && Reports.renderTransactionHistory) Reports.renderTransactionHistory();
        if (window.Reports && Reports.updateKPIs) Reports.updateKPIs();
        if (window.SalesLedger && SalesLedger.render) SalesLedger.render();
        Storage.pushToServer();
    },

    settleCustomerDebt: function(customerId) {
        Finance.openPayCustomerDebtModal(customerId);
    },

    deleteCustomer: function(id) {
        if (confirm('តើអ្នកពិតជាចង់លុបអតិថិជននេះមែនទេ?')) {
            if (window.Storage && Storage.markDeletedId) {
                Storage.markDeletedId(id);
            }
            let customers = Storage.getCustomers();
            customers = customers.filter(c => c.id !== id);
            Storage.saveCustomers(customers);
            Finance.renderCustomers();
            Finance.renderDashboard();
            App.showToast('បានលុបអតិថិជនជោគជ័យ!', 'success');
        }
    },

    // =======================================================
    // 4. SUPPLIERS
    // =======================================================
    renderSuppliers: function() {
        const tbody = document.getElementById('suppliers-table-body');
        const countEl = document.getElementById('supplier-summary-count');
        if (!tbody) return;

        const suppliers = Storage.getSuppliers();
        if (countEl) countEl.innerText = `${suppliers.length} ក្រុមហ៊ុន`;

        let filtered = suppliers.filter(s => {
            if (!Finance.supplierSearchQuery) return true;
            return s.name.toLowerCase().includes(Finance.supplierSearchQuery) ||
                   s.phone.includes(Finance.supplierSearchQuery) ||
                   (s.contactPerson && s.contactPerson.toLowerCase().includes(Finance.supplierSearchQuery)) ||
                   (s.suppliedItems && s.suppliedItems.toLowerCase().includes(Finance.supplierSearchQuery));
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">
                        មិនមានទិន្នន័យអ្នកផ្គត់ផ្គង់ត្រូវនឹងការស្វែងរកទេ
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(s => `
            <tr>
                <td><strong style="color: var(--text-primary); font-size: 14px;">${s.name}</strong></td>
                <td><span style="font-weight: 600; color: #a5b4fc;">${s.contactPerson || '-'}</span></td>
                <td><span style="font-family: var(--font-nums); color: #38bdf8; font-weight: 700;">${s.phone}</span></td>
                <td style="font-size: 12.5px; color: var(--text-secondary);">${s.address || 'ភ្នំពេញ'}</td>
                <td><span class="mini-badge badge-condition">${s.suppliedItems || 'ទំនិញទូទៅ'}</span></td>
                <td class="text-right">
                    <a href="tel:${s.phone}" class="btn-secondary" style="padding: 4px 8px; font-size: 11.5px; text-decoration: none;" title="ហៅទូរស័ព្ទ">
                        <i class="fa-solid fa-phone"></i>
                    </a>
                    <button class="btn-remove-item" onclick="Finance.deleteSupplier('${s.id}')" title="លុបចេញ">
                        <i class="fa-solid fa-trash-can" style="color: #f87171;"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    handleSaveSupplier: function() {
        const name = document.getElementById('sup-name').value.trim();
        const contact = document.getElementById('sup-contact').value.trim();
        const phone = document.getElementById('sup-phone').value.trim();
        const address = document.getElementById('sup-address').value.trim();
        const items = document.getElementById('sup-items').value.trim();
        const notes = document.getElementById('sup-notes').value.trim();

        if (!name || !phone) {
            App.showToast('សូមបញ្ចូលឈ្មោះក្រុមហ៊ុន និងលេខទូរស័ព្ទអ្នកផ្គត់ផ្គង់!', 'error');
            return;
        }

        const newSup = {
            id: 'sup-' + Date.now(),
            name: name,
            contactPerson: contact,
            phone: phone,
            address: address,
            suppliedItems: items,
            notes: notes
        };

        const suppliers = Storage.getSuppliers();
        suppliers.unshift(newSup);
        Storage.saveSuppliers(suppliers);

        document.getElementById('supplier-modal').classList.remove('show');
        Finance.renderSuppliers();
        App.showToast(`បានបញ្ចូលអ្នកផ្គត់ផ្គង់ "${name}" ជោគជ័យ!`, 'success');
    },

    deleteSupplier: function(id) {
        if (confirm('តើអ្នកពិតជាចង់លុបអ្នកផ្គត់ផ្គង់នេះមែនទេ?')) {
            if (window.Storage && Storage.markDeletedId) {
                Storage.markDeletedId(id);
            }
            let suppliers = Storage.getSuppliers();
            suppliers = suppliers.filter(s => s.id !== id);
            Storage.saveSuppliers(suppliers);
            Finance.renderSuppliers();
            App.showToast('បានលុបអ្នកផ្គត់ផ្គង់ជោគជ័យ!', 'success');
        }
    },

    // =======================================================
    // 5. INVOICES
    // =======================================================
    renderInvoices: function() {
        const tbody = document.getElementById('invoices-table-body');
        const countEl = document.getElementById('inv-summary-count');
        const totalAmountEl = document.getElementById('inv-summary-amount');
        if (!tbody) return;

        const sales = Storage.getSales();

        let filtered = sales.filter(s => {
            const query = (Finance.invoiceSearchQuery || '').toLowerCase();
            const matchesQuery = !query ||
                (s.id && s.id.toLowerCase().includes(query)) ||
                (s.invoiceId && s.invoiceId.toLowerCase().includes(query)) ||
                (s.customerName && s.customerName.toLowerCase().includes(query)) ||
                (s.customerPhone && s.customerPhone.includes(query)) ||
                (s.items && s.items.some(it => it && it.name && it.name.toLowerCase().includes(query)));
            
            const matchesMethod = (Finance.invoiceFilterMethod === 'all') || (s.paymentMethod === Finance.invoiceFilterMethod);

            return matchesQuery && matchesMethod;
        });

        const totalUsd = filtered.reduce((sum, s) => sum + (Number(s.totalUsd !== undefined ? s.totalUsd : s.total) || 0), 0);
        if (countEl) countEl.innerText = `${filtered.length} សន្លឹក`;
        if (totalAmountEl) totalAmountEl.innerText = `$${totalUsd.toFixed(2)}`;

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">
                        មិនមានវិក្កយបត្រត្រូវនឹងការស្វែងរកទេ
                    </td>
                </tr>
            `;
            return;
        }

        // Sort descending by date
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Group by day for summary stats
        const dateGroups = {};
        filtered.forEach(s => {
            const d = s.date ? new Date(s.date) : new Date();
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!dateGroups[key]) {
                dateGroups[key] = { count: 0, total: 0, dateObj: d };
            }
            dateGroups[key].count += 1;
            dateGroups[key].total += Number(s.totalUsd !== undefined ? s.totalUsd : s.total) || 0;
        });

        let lastDateKey = null;
        const rowsHtml = [];

        filtered.forEach(s => {
            const d = s.date ? new Date(s.date) : new Date();
            const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            // Add separator when date changes (or for first group)
            if (dateKey !== lastDateKey) {
                lastDateKey = dateKey;
                const groupInfo = dateGroups[dateKey];
                const dateLabel = Storage.getDateBadgeLabel(groupInfo.dateObj);
                rowsHtml.push(`
                    <tr class="date-group-divider-row">
                        <td colspan="7">
                            <div class="date-group-bar">
                                <span class="date-group-badge">
                                    <i class="fa-solid fa-calendar-day"></i> ${dateLabel}
                                </span>
                                <span class="date-group-count">(${groupInfo.count} វិក្កយបត្រ)</span>
                                <div class="date-group-line"></div>
                                <span class="date-group-total">សរុបថ្ងៃនេះ: $${groupInfo.total.toFixed(2)}</span>
                            </div>
                        </td>
                    </tr>
                `);
            }

            const itemInfo = Storage.formatSaleItemsSummary(s, 2);
            const invId = s.invoiceId || s.id || 'INV';
            const totalVal = Number(s.totalUsd !== undefined ? s.totalUsd : s.total) || 0;
            rowsHtml.push(`
            <tr>
                <td style="max-width: 240px;">
                    <div style="font-weight: 700; color: #f8fafc; font-size: 13.5px; line-height: 1.35; margin-bottom: 2px;" title="${itemInfo.fullText}">
                        <i class="fa-solid fa-box text-sky" style="font-size: 11.5px; margin-right: 4px; opacity: 0.85;"></i>${itemInfo.display}
                    </div>
                    <span style="color: #38bdf8; font-family: var(--font-nums); font-size: 11.5px; font-weight: 600;">#${invId}</span>
                </td>
                <td style="font-size: 12.5px; color: var(--text-secondary);">${new Date(s.date).toLocaleDateString('km-KH')} ${new Date(s.date).toLocaleTimeString('km-KH', {hour: '2-digit', minute:'2-digit'})}</td>
                <td>
                    <strong style="color: var(--text-primary);">${s.customerName || 'អតិថិជនទូទៅ'}</strong>
                    <div style="font-size: 11px; color: var(--text-muted);">${s.customerPhone || 'N/A'}</div>
                </td>
                <td>
                    <span style="font-weight: 600;">${(s.items || []).length} មុខ</span>
                    <div style="font-size: 11px; color: #94a3b8;" title="${itemInfo.fullText}">
                        ${itemInfo.display}
                    </div>
                </td>
                <td style="font-family: var(--font-nums); font-weight: 800; font-size: 15px; color: #34d399;">
                    $${totalVal.toFixed(2)}
                </td>
                <td>
                    <span class="mini-badge ${s.paymentMethod === 'khqr' ? 'badge-condition' : (s.paymentMethod === 'debt' ? 'badge-battery' : 'badge-color')}">
                        ${s.paymentMethod === 'debt' ? 'ជំពាក់ (Credit)' : (s.paymentMethod || 'CASH').toUpperCase()}
                    </span>
                </td>
                <td class="text-right">
                    <button class="btn-primary" style="padding: 5px 12px; font-size: 12px;" onclick="Finance.reprintInvoice('${invId}')">
                        <i class="fa-solid fa-print"></i> ព្រីនវិក្កយបត្រ
                    </button>
                </td>
            </tr>
            `);
        });

        tbody.innerHTML = rowsHtml.join('');
    },

    reprintInvoice: function(id) {
        const sales = Storage.getSales();
        const sale = sales.find(s => s.id === id || s.invoiceId === id);
        if (sale && window.POS) {
            POS.showReceipt(sale);
        } else {
            App.showToast('រកមិនឃើញវិក្កយបត្រ #' + id + ' ទេ', 'error');
        }
    }
};

window.Finance = Finance;
