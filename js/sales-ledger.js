/**
 * MHALY SHOP - SALES LEDGER & PROFIT SPREADSHEET MODULE
 * Displays comprehensive itemized sales, costs, profits and margins in an Excel-like interface.
 */

window.SalesLedger = {
    currentRange: (typeof localStorage !== 'undefined' && localStorage.getItem('mhaly_ledger_range')) ? localStorage.getItem('mhaly_ledger_range') : 'all',
    customDateFrom: null,
    customDateTo: null,
    searchQuery: '',

    init: function () {
        // Restore remembered filter range or default to 'all'
        let savedRange = (typeof localStorage !== 'undefined' && localStorage.getItem('mhaly_ledger_range')) ? localStorage.getItem('mhaly_ledger_range') : 'all';
        SalesLedger.currentRange = savedRange;

        const allSales = Storage.getSales() || [];
        const filtered = SalesLedger.getFilteredSales();
        // If remembered filter yields 0 sales but there are existing sales in database, default to 'all' so ledger is visible immediately
        if (filtered.length === 0 && allSales.length > 0 && SalesLedger.currentRange !== 'all') {
            SalesLedger.currentRange = 'all';
            try { localStorage.setItem('mhaly_ledger_range', 'all'); } catch (_) { }
            savedRange = 'all';
        }

        // Set today's date on custom date inputs if present
        const todayIso = new Date().toISOString().slice(0, 10);
        const fromInput = document.getElementById('ledger-custom-date-from');
        const toInput = document.getElementById('ledger-custom-date-to');
        if (fromInput && !fromInput.value) fromInput.value = todayIso;
        if (toInput && !toInput.value) toInput.value = todayIso;

        // Sync buttons UI
        document.querySelectorAll('.ledger-date-buttons .filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.range === savedRange);
        });
    },

    switchRange: function (range) {
        SalesLedger.currentRange = range;
        try { localStorage.setItem('mhaly_ledger_range', range); } catch (_) { }

        // Update active class on filter buttons
        document.querySelectorAll('.ledger-date-buttons .filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.range === range);
        });

        // Clear custom dates if user selects a preset
        if (range !== 'custom') {
            const fromInput = document.getElementById('ledger-custom-date-from');
            const toInput = document.getElementById('ledger-custom-date-to');
            SalesLedger.customDateFrom = null;
            SalesLedger.customDateTo = null;
            if (fromInput) fromInput.value = '';
            if (toInput) toInput.value = '';
        }

        SalesLedger.render();
    },

    handleCustomDate: function () {
        const fromInput = document.getElementById('ledger-custom-date-from');
        const toInput = document.getElementById('ledger-custom-date-to');
        if (fromInput && toInput && fromInput.value) {
            SalesLedger.currentRange = 'custom';
            SalesLedger.customDateFrom = fromInput.value;
            SalesLedger.customDateTo = toInput.value || fromInput.value;
            try { localStorage.setItem('mhaly_ledger_range', 'custom'); } catch (_) { }

            // Remove active state from preset buttons
            document.querySelectorAll('.ledger-date-buttons .filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            SalesLedger.render();
        }
    },

    _searchDebounce: null,
    handleSearch: function (query) {
        SalesLedger.searchQuery = (query || '').trim().toLowerCase();
        clearTimeout(SalesLedger._searchDebounce);
        SalesLedger._searchDebounce = setTimeout(() => {
            SalesLedger.render();
        }, 120);
    },

    getFilteredSales: function () {
        const sales = Storage.getSales() || [];
        const now = new Date();

        return sales.filter(s => {
            if (SalesLedger.currentRange === 'all') return true;
            if (!s.date) return false;
            const saleDate = new Date(s.date);
            if (isNaN(saleDate.getTime())) return false;

            if (SalesLedger.currentRange === 'today') {
                return Storage.isDateToday(saleDate);
            } else if (SalesLedger.currentRange === 'yesterday') {
                return Storage.isDateYesterday(saleDate);
            } else if (SalesLedger.currentRange === 'this_week') {
                const dayOfWeek = (now.getDay() + 6) % 7; // Monday as 0
                const monday = new Date(now);
                monday.setDate(now.getDate() - dayOfWeek);
                monday.setHours(0, 0, 0, 0);

                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                sunday.setHours(23, 59, 59, 999);

                return saleDate >= monday && saleDate <= sunday;
            } else if (SalesLedger.currentRange === 'this_month') {
                return saleDate.getFullYear() === now.getFullYear() && saleDate.getMonth() === now.getMonth();
            } else if (SalesLedger.currentRange === 'custom') {
                if (!SalesLedger.customDateFrom) return true;
                const from = new Date(SalesLedger.customDateFrom + 'T00:00:00');
                const to = new Date((SalesLedger.customDateTo || SalesLedger.customDateFrom) + 'T23:59:59.999');
                return saleDate >= from && saleDate <= to;
            }
            return true;
        });
    },

    // Flatten sales into itemized rows for the spreadsheet
    getLineItems: function () {
        const sales = SalesLedger.getFilteredSales();
        const products = Storage.getProducts() || [];
        const productMap = {};
        products.forEach(p => {
            if (p && p.id) productMap[p.id] = p;
        });

        const rows = [];

        sales.forEach(s => {
            const saleDate = s.date ? new Date(s.date) : new Date();
            const invNumber = s.invoiceNumber || s.id || ('#INV-' + (s.invoiceId || 'N/A'));
            const customerName = s.customerName || 'អតិថិជនទូទៅ';
            const customerPhone = s.customerPhone || '';
            const items = Array.isArray(s.items) && s.items.length > 0 ? s.items : null;

            if (items) {
                items.forEach((it, idx) => {
                    const itemName = (it.name || it.productName || it.title || 'ទំនិញ').trim();
                    const qty = Number(it.quantity) || 1;

                    // Determine unit cost
                    let unitCost = 0;
                    if (it.cost !== undefined && it.cost !== null && !isNaN(Number(it.cost))) {
                        unitCost = Number(it.cost);
                    } else if (it.id && productMap[it.id] && productMap[it.id].cost !== undefined) {
                        unitCost = Number(productMap[it.id].cost) || 0;
                    }

                    // If it is a quick service, cost is always $0
                    if (it.isService) {
                        unitCost = 0;
                    }

                    // Determine unit price
                    let unitPrice = Number(it.price !== undefined ? it.price : it.priceUsd) || 0;
                    if (unitPrice === 0 && Number(s.totalUsd || s.total) > 0 && items.length === 1) {
                        unitPrice = Number(s.totalUsd || s.total);
                    }

                    const totalCost = unitCost * qty;
                    const totalPrice = unitPrice * qty;
                    const grossProfit = totalPrice - totalCost;
                    const margin = totalPrice > 0 ? ((grossProfit / totalPrice) * 100).toFixed(1) : 0;

                    rows.push({
                        saleId: s.id,
                        saleDate: saleDate,
                        invoiceNumber: invNumber,
                        customerName: customerName,
                        customerPhone: customerPhone,
                        paymentMethod: s.paymentMethod || 'CASH',
                        debtSettled: s.debtSettled === true,
                        debtRemaining: s.debtRemaining,
                        totalSaleUsd: Number(s.totalUsd !== undefined ? s.totalUsd : s.total) || 0,
                        itemName: itemName,
                        itemIndex: idx + 1,
                        itemCount: items.length,
                        quantity: qty,
                        unitCost: unitCost,
                        totalCost: totalCost,
                        unitPrice: unitPrice,
                        totalPrice: totalPrice,
                        grossProfit: grossProfit,
                        margin: margin,
                        hasImei: !!it.hasImei,
                        imei: it.imei || '',
                        color: it.color || '',
                        isService: !!it.isService
                    });
                });
            } else {
                // Single sale record fallback
                const fallbackName = s.itemNames || s.notes || 'ការលក់ទូទៅ';
                const totalPrice = Number(s.totalUsd !== undefined ? s.totalUsd : s.total) || 0;
                const totalCost = Number(s.cost) || 0;
                const grossProfit = Math.max(0, totalPrice - totalCost);
                const margin = totalPrice > 0 ? ((grossProfit / totalPrice) * 100).toFixed(1) : 0;

                rows.push({
                    saleId: s.id,
                    saleDate: saleDate,
                    invoiceNumber: invNumber,
                    customerName: customerName,
                    customerPhone: customerPhone,
                    paymentMethod: s.paymentMethod || 'CASH',
                    debtSettled: s.debtSettled === true,
                    debtRemaining: s.debtRemaining,
                    totalSaleUsd: totalPrice,
                    itemName: fallbackName,
                    itemIndex: 1,
                    itemCount: 1,
                    quantity: 1,
                    unitCost: totalCost,
                    totalCost: totalCost,
                    unitPrice: totalPrice,
                    totalPrice: totalPrice,
                    grossProfit: grossProfit,
                    margin: margin,
                    hasImei: false,
                    imei: '',
                    color: '',
                    isService: false
                });
            }
        });

        // Filter by search query if any
        if (SalesLedger.searchQuery) {
            const q = SalesLedger.searchQuery;
            return rows.filter(r => {
                return (
                    r.itemName.toLowerCase().includes(q) ||
                    r.invoiceNumber.toLowerCase().includes(q) ||
                    r.customerName.toLowerCase().includes(q) ||
                    (r.imei && r.imei.toLowerCase().includes(q))
                );
            });
        }

        // Sort descending by date
        rows.sort((a, b) => b.saleDate - a.saleDate);
        return rows;
    },

    render: function () {
        try {
            const rows = SalesLedger.getLineItems();
            SalesLedger.updateKPIs(rows);
            SalesLedger.renderTable(rows);
        } catch (err) {
            console.error('[SalesLedger] render error:', err);
        }
    },

    updateKPIs: function (rows) {
        const settings = Storage.getSettings() || {};
        const rate = Number(settings.exchangeRate) || 4100;

        let totalRevenue = 0;
        let totalCost = 0;
        let totalQty = 0;
        const invoiceSet = new Set();

        rows.forEach(r => {
            totalRevenue += r.totalPrice;
            totalCost += r.totalCost;
            totalQty += r.quantity;
            if (r.invoiceNumber) invoiceSet.add(r.invoiceNumber);
        });

        const grossProfit = totalRevenue - totalCost;
        const margin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;

        const isKhr = (window.App && App.getCurrency) ? (App.getCurrency() === 'KHR') : false;

        // Revenue
        const revEl = document.getElementById('ledger-kpi-revenue');
        const revKhrEl = document.getElementById('ledger-kpi-revenue-khr');
        if (revEl) {
            revEl.innerText = isKhr ? `${Math.round(totalRevenue * rate).toLocaleString()} ៛` : `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        if (revKhrEl) {
            revKhrEl.innerText = isKhr ? `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${Math.round(totalRevenue * rate).toLocaleString()} ៛`;
        }

        // Cost
        const costEl = document.getElementById('ledger-kpi-cost');
        const costKhrEl = document.getElementById('ledger-kpi-cost-khr');
        if (costEl) {
            costEl.innerText = isKhr ? `${Math.round(totalCost * rate).toLocaleString()} ៛` : `$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        if (costKhrEl) {
            costKhrEl.innerText = isKhr ? `$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${Math.round(totalCost * rate).toLocaleString()} ៛`;
        }

        // Profit
        const profitEl = document.getElementById('ledger-kpi-profit');
        const profitMarginEl = document.getElementById('ledger-kpi-profit-margin');
        if (profitEl) {
            if (isKhr) {
                profitEl.innerText = `${grossProfit >= 0 ? '+' : ''}${Math.round(grossProfit * rate).toLocaleString()} ៛`;
            } else {
                profitEl.innerText = `${grossProfit >= 0 ? '+' : ''}$${grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
            profitEl.style.color = grossProfit >= 0 ? '#34d399' : '#f87171';
        }
        if (profitMarginEl) profitMarginEl.innerText = `Margin: ${margin}%`;

        // Items and Invoices count
        const itemsEl = document.getElementById('ledger-kpi-items-count');
        const invoicesEl = document.getElementById('ledger-kpi-invoices-count');
        if (itemsEl) itemsEl.innerText = `${totalQty} មុខ/គ្រឿង`;
        if (invoicesEl) invoicesEl.innerText = `${invoiceSet.size} វិក្កយបត្រ`;

        // Row count badge
        const badgeEl = document.getElementById('ledger-row-count-badge');
        if (badgeEl) badgeEl.innerText = `${rows.length} ជួរទំនិញ`;
    },

    renderTable: function (rows) {
        const tbody = document.getElementById('sales-ledger-tbody');
        const tfoot = document.getElementById('sales-ledger-tfoot');
        if (!tbody) return;

        const settings = Storage.getSettings() || {};
        const rate = Number(settings.exchangeRate) || 4100;

        if (!rows || rows.length === 0) {
            const allSales = Storage.getSales() || [];
            const hasPastSales = allSales.length > 0;
            const rangeLabels = {
                'today': 'ថ្ងៃនេះ',
                'yesterday': 'ម្សិលមិញ',
                'this_week': 'សប្តាហ៍នេះ',
                'this_month': 'ខែនេះ',
                'custom': 'ចន្លោះថ្ងៃដែលបានកំណត់',
                'all': 'ប្រព័ន្ធទាំងមូល'
            };
            const currentLabel = rangeLabels[SalesLedger.currentRange] || 'ចន្លោះពេលនេះ';

            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 42px 20px; color: var(--text-muted);">
                        <i class="fa-solid fa-file-excel" style="font-size: 38px; margin-bottom: 12px; display: block; opacity: 0.35; color: #38bdf8;"></i>
                        <div style="font-size: 15px; font-weight: 600; color: #94a3b8;">មិនទាន់មានទិន្នន័យការលក់សម្រាប់ ${currentLabel} ទេ</div>
                        <div style="font-size: 12.5px; opacity: 0.75; margin-top: 6px;">
                            ${hasPastSales ? `ទិន្នន័យការលក់សរុបមាន <strong style="color: #38bdf8;">${allSales.length} វិក្កយបត្រ</strong> ត្រូវបានរក្សាទុកដោយសុវត្ថិភាព ១០០%` : 'មិនទាន់មានទិន្នន័យការលក់នៅឡើយទេ'}
                        </div>
                        ${hasPastSales ? `
                            <div style="margin-top: 16px; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
                                <button type="button" class="btn-primary" style="padding: 7px 18px; font-size: 12.5px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;" onclick="SalesLedger.switchRange('all')">
                                    <i class="fa-solid fa-layer-group"></i> បង្ហាញការលក់ទាំងអស់ (${allSales.length} វិក្កយបត្រ)
                                </button>
                                <button type="button" class="btn-secondary" style="padding: 7px 18px; font-size: 12.5px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8;" onclick="SalesLedger.switchRange('yesterday')">
                                    <i class="fa-solid fa-clock-rotate-left"></i> បង្ហាញការលក់ម្សិលមិញ ($179.25)
                                </button>
                            </div>
                        ` : ''}
                    </td>
                </tr>
            `;
            if (tfoot) tfoot.innerHTML = '';
            return;
        }

        let totalQty = 0;
        let grandCost = 0;
        let grandRevenue = 0;
        let grandProfit = 0;

        let html = '';
        rows.forEach((r, idx) => {
            totalQty += r.quantity;
            grandCost += r.totalCost;
            grandRevenue += r.totalPrice;
            grandProfit += r.grossProfit;

            const dateStr = r.saleDate.toLocaleDateString('en-GB'); // DD/MM/YYYY
            const timeStr = r.saleDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            // Badge type
            let badgeTypeHtml = '';
            if (r.isService) {
                badgeTypeHtml = `<span class="badge-item-service"><i class="fa-solid fa-wand-magic-sparkles"></i> សេវា</span>`;
            } else if (r.hasImei) {
                badgeTypeHtml = `<span class="badge-item-phone"><i class="fa-solid fa-mobile-screen"></i> ${r.imei ? r.imei.slice(-6) : 'IMEI'}</span>`;
            }

            const isDebtMethod = String(r.paymentMethod || '').toLowerCase().includes('debt');
            const totalSale = r.totalSaleUsd || r.totalPrice;
            const remainingDebt = r.debtRemaining !== undefined ? Number(r.debtRemaining) : (isDebtMethod ? totalSale : 0);
            const isSettled = isDebtMethod && (r.debtSettled === true || remainingDebt <= 0.001);
            const isPartial = isDebtMethod && !isSettled && (remainingDebt < (totalSale - 0.001));
            const isFullDebt = isDebtMethod && !isSettled && !isPartial;

            let debtBadgeHtml = '';
            let priceColor = '#38bdf8';
            let priceSubHtml = Math.round(r.totalPrice * rate).toLocaleString() + ' ៛';
            let profitColor = r.grossProfit > 0 ? '#34d399' : (r.grossProfit === 0 ? '#94a3b8' : '#f87171');
            let profitPrefix = r.grossProfit > 0 ? '+' : '';
            let profitSubHtml = profitPrefix + Math.round(r.grossProfit * rate).toLocaleString() + ' ៛';
            let marginBg = r.margin > 30 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.07)';
            let marginColor = r.margin > 30 ? '#34d399' : '#cbd5e1';
            let marginBorder = 'none';
            let marginText = `${r.margin}%`;

            if (isSettled) {
                debtBadgeHtml = `<span style="display: inline-block; padding: 2px 6px; border-radius: 4px; background: rgba(16, 185, 129, 0.18); color: #34d399; font-size: 10px; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.35); margin-left: 3px;">សងរួច</span>`;
                priceSubHtml = 'សងរួចរាល់ (' + Math.round(r.totalPrice * rate).toLocaleString() + ' ៛)';
                profitColor = '#34d399';
                marginBg = 'rgba(52, 211, 153, 0.15)';
                marginColor = '#34d399';
            } else if (isPartial) {
                debtBadgeHtml = `<span style="display: inline-block; padding: 2px 6px; border-radius: 4px; background: rgba(245, 158, 11, 0.18); color: #fbbf24; font-size: 10px; font-weight: 700; border: 1px solid rgba(245, 158, 11, 0.35); margin-left: 3px;">នៅជំពាក់ $${remainingDebt.toFixed(2)}</span>`;
                priceColor = '#fbbf24';
                priceSubHtml = `សងខ្លះ (នៅសល់ $${remainingDebt.toFixed(2)})`;
                profitColor = '#fbbf24';
                profitSubHtml = `(ចំណេញនៅសល់ជំពាក់)`;
                marginBg = 'rgba(245, 158, 11, 0.15)';
                marginColor = '#fbbf24';
                marginBorder = '1px solid rgba(245, 158, 11, 0.3)';
                marginText = `${r.margin}% សងខ្លះ`;
            } else if (isFullDebt) {
                debtBadgeHtml = `<span style="display: inline-block; padding: 2px 6px; border-radius: 4px; background: rgba(239, 68, 68, 0.18); color: #f87171; font-size: 10px; font-weight: 700; border: 1px solid rgba(239, 68, 68, 0.35); margin-left: 3px;">ជំពាក់</span>`;
                priceColor = '#f87171';
                priceSubHtml = 'ជំពាក់ (' + Math.round(r.totalPrice * rate).toLocaleString() + ' ៛)';
                profitColor = '#f87171';
                profitSubHtml = '(ចំណេញជំពាក់)';
                marginBg = 'rgba(239, 68, 68, 0.15)';
                marginColor = '#f87171';
                marginBorder = '1px solid rgba(239, 68, 68, 0.3)';
                marginText = `${r.margin}% ជំពាក់`;
            }

            html += `
                <tr class="ledger-row" style="transition: background 0.15s ease;">
                    <td style="text-align: center; color: var(--text-muted); font-family: var(--font-nums); font-weight: 600;">${idx + 1}</td>
                    <td>
                        <div style="font-family: var(--font-nums); font-weight: 700; color: #e2e8f0; font-size: 13px;">${dateStr}</div>
                        <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-nums);">${timeStr}</div>
                    </td>
                    <td>
                        <span class="ledger-inv-badge" style="display: inline-block; padding: 3px 8px; border-radius: 6px; background: rgba(56, 189, 248, 0.12); color: #38bdf8; font-family: var(--font-nums); font-weight: 700; font-size: 12px; border: 1px solid rgba(56, 189, 248, 0.25);">
                            ${r.invoiceNumber}
                        </span>
                        ${debtBadgeHtml}
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${r.customerName}</div>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-primary); font-size: 13.5px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span>${r.itemName}</span>
                            ${badgeTypeHtml}
                        </div>
                        ${r.imei ? `<div style="font-size: 11px; color: #38bdf8; font-family: var(--font-nums);">IMEI: ${r.imei} ${r.color ? '(' + r.color + ')' : ''}</div>` : ''}
                    </td>
                    <td style="text-align: center;">
                        <span style="display: inline-block; padding: 2px 10px; border-radius: 12px; background: rgba(255,255,255,0.06); font-family: var(--font-nums); font-weight: 700; color: #fff; font-size: 13px;">
                            ${r.quantity}
                        </span>
                    </td>
                    <td style="text-align: right;">
                        <div style="font-family: var(--font-nums); font-weight: 700; color: #fb7185; font-size: 13.5px;">
                            $${r.totalCost.toFixed(2)}
                        </div>
                        <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-nums);">
                            ${Math.round(r.totalCost * rate).toLocaleString()} ៛
                        </div>
                    </td>
                    <td style="text-align: right;">
                        <div style="font-family: var(--font-nums); font-weight: 700; color: ${priceColor}; font-size: 13.5px;">
                            $${r.totalPrice.toFixed(2)}
                        </div>
                        <div style="font-size: 11px; color: ${isFullDebt || isPartial ? '#fca5a5' : 'var(--text-muted)'}; font-family: var(--font-nums);">
                            ${priceSubHtml}
                        </div>
                    </td>
                    <td style="text-align: right;">
                        <div style="font-family: var(--font-nums); font-weight: 800; color: ${profitColor}; font-size: 14px;">
                            ${profitPrefix}$${r.grossProfit.toFixed(2)}
                        </div>
                        <div style="font-size: 11px; color: ${isFullDebt || isPartial ? '#fca5a5' : 'var(--text-muted)'}; font-family: var(--font-nums);">
                            ${profitSubHtml}
                        </div>
                    </td>
                    <td style="text-align: center;">
                        <span style="display: inline-block; padding: 3px 8px; border-radius: 8px; background: ${marginBg}; color: ${marginColor}; font-family: var(--font-nums); font-weight: 700; font-size: 12px; border: ${marginBorder};">
                            ${marginText}
                        </span>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

        // Grand Totals in Footer
        if (tfoot) {
            const overallMargin = grandRevenue > 0 ? ((grandProfit / grandRevenue) * 100).toFixed(1) : 0;
            const profitColor = grandProfit >= 0 ? '#34d399' : '#f87171';
            const profitPrefix = grandProfit > 0 ? '+' : '';

            tfoot.innerHTML = `
                <tr style="border-top: 2px solid #38bdf8; font-weight: 800; background: rgba(15, 23, 42, 0.95);">
                    <td colspan="4" style="padding: 14px 16px; font-size: 14px; color: #38bdf8;">
                        <i class="fa-solid fa-sigma"></i> <strong>សរុបទាំងអស់ (Grand Total) - ${rows.length} មុខ</strong>
                    </td>
                    <td style="text-align: center; padding: 14px 10px;">
                        <span style="font-family: var(--font-nums); font-size: 15px; color: #fff; font-weight: 800;">
                            ${totalQty}
                        </span>
                    </td>
                    <td style="text-align: right; padding: 14px 14px;">
                        <div style="font-family: var(--font-nums); font-size: 15px; color: #fb7185; font-weight: 800;">
                            $${grandCost.toFixed(2)}
                        </div>
                        <div style="font-size: 11.5px; color: var(--text-muted); font-family: var(--font-nums);">
                            ${Math.round(grandCost * rate).toLocaleString()} ៛
                        </div>
                    </td>
                    <td style="text-align: right; padding: 14px 14px;">
                        <div style="font-family: var(--font-nums); font-size: 15px; color: #38bdf8; font-weight: 800;">
                            $${grandRevenue.toFixed(2)}
                        </div>
                        <div style="font-size: 11.5px; color: var(--text-muted); font-family: var(--font-nums);">
                            ${Math.round(grandRevenue * rate).toLocaleString()} ៛
                        </div>
                    </td>
                    <td style="text-align: right; padding: 14px 14px;">
                        <div style="font-family: var(--font-nums); font-size: 16px; color: ${profitColor}; font-weight: 900;">
                            ${profitPrefix}$${grandProfit.toFixed(2)}
                        </div>
                        <div style="font-size: 11.5px; color: var(--text-muted); font-family: var(--font-nums);">
                            ${profitPrefix}${Math.round(grandProfit * rate).toLocaleString()} ៛
                        </div>
                    </td>
                    <td style="text-align: center; padding: 14px 10px;">
                        <span style="padding: 4px 10px; border-radius: 12px; background: rgba(52, 211, 153, 0.2); color: #34d399; font-family: var(--font-nums); font-weight: 800; font-size: 13px;">
                            ${overallMargin}%
                        </span>
                    </td>
                </tr>
            `;
        }
    },

    // Export to Excel / CSV with UTF-8 BOM so Excel displays Khmer properly
    exportToExcel: function () {
        const rows = SalesLedger.getLineItems();
        if (!rows || rows.length === 0) {
            if (window.App && App.showToast) App.showToast('មិនមានទិន្នន័យដើម្បីនាំចេញជា Excel ទេ!', 'error');
            return;
        }

        const settings = Storage.getSettings() || {};
        const rate = Number(settings.exchangeRate) || 4100;

        // CSV Header
        const headers = [
            'ល.រ',
            'កាលបរិច្ឆេទ',
            'ម៉ោង',
            'លេខវិក្កយបត្រ',
            'អតិថិជន',
            'មុខទំនិញ_សេវាកម្ម',
            'IMEI',
            'ចំនួន',
            'តម្លៃដើមឯកតា($)',
            'ថ្លៃដើមសរុប($)',
            'ថ្លៃដើមសរុប(៛)',
            'តម្លៃលក់ឯកតា($)',
            'តម្លៃលក់សរុប($)',
            'តម្លៃលក់សរុប(៛)',
            'ប្រាក់ចំណេញ($)',
            'ប្រាក់ចំណេញ(៛)',
            'ភាគរយចំណេញ(%)'
        ];

        let csv = headers.join(',') + '\r\n';

        rows.forEach((r, idx) => {
            const dateStr = r.saleDate.toLocaleDateString('en-GB');
            const timeStr = r.saleDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const costKhr = Math.round(r.totalCost * rate);
            const priceKhr = Math.round(r.totalPrice * rate);
            const profitKhr = Math.round(r.grossProfit * rate);

            const line = [
                idx + 1,
                `"${dateStr}"`,
                `"${timeStr}"`,
                `"${r.invoiceNumber}"`,
                `"${(r.customerName || '').replace(/"/g, '""')}"`,
                `"${(r.itemName || '').replace(/"/g, '""')}"`,
                `"${r.imei || ''}"`,
                r.quantity,
                r.unitCost.toFixed(2),
                r.totalCost.toFixed(2),
                costKhr,
                r.unitPrice.toFixed(2),
                r.totalPrice.toFixed(2),
                priceKhr,
                r.grossProfit.toFixed(2),
                profitKhr,
                `${r.margin}%`
            ];
            csv += line.join(',') + '\r\n';
        });

        // Add summary row at bottom
        let sumQty = 0, sumCost = 0, sumRev = 0, sumProf = 0;
        rows.forEach(r => {
            sumQty += r.quantity;
            sumCost += r.totalCost;
            sumRev += r.totalPrice;
            sumProf += r.grossProfit;
        });
        const marginOverall = sumRev > 0 ? ((sumProf / sumRev) * 100).toFixed(1) : 0;
        csv += `\r\n"សរុប","","","","","",${sumQty},"",${sumCost.toFixed(2)},${Math.round(sumCost * rate)},"",${sumRev.toFixed(2)},${Math.round(sumRev * rate)},${sumProf.toFixed(2)},${Math.round(sumProf * rate)},"${marginOverall}%"\r\n`;

        // UTF-8 BOM (\uFEFF) ensures Excel reads Khmer Unicode
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateTag = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `mhaly_sales_ledger_${dateTag}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (window.App && App.showToast) {
            App.showToast('បានទាញយកតារាង Excel រួចរាល់ដោយជោគជ័យ!', 'success');
        }
    },

    // Print Sales Ledger Table
    printLedger: function () {
        const rows = SalesLedger.getLineItems();
        if (!rows || rows.length === 0) {
            if (window.App && App.showToast) App.showToast('មិនមានទិន្នន័យដើម្បីបោះពុម្ពទេ!', 'error');
            return;
        }

        const settings = Storage.getSettings() || {};
        const shopName = settings.shopName || 'MHALY SHOP';
        const phone = settings.phone1 || '012 888 999';
        const rate = Number(settings.exchangeRate) || 4100;

        let totalQty = 0, grandCost = 0, grandRevenue = 0, grandProfit = 0;
        rows.forEach(r => {
            totalQty += r.quantity;
            grandCost += r.totalCost;
            grandRevenue += r.totalPrice;
            grandProfit += r.grossProfit;
        });
        const overallMargin = grandRevenue > 0 ? ((grandProfit / grandRevenue) * 100).toFixed(1) : 0;

        let rowsHtml = '';
        rows.forEach((r, idx) => {
            const dateStr = r.saleDate.toLocaleDateString('en-GB');
            const timeStr = r.saleDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            rowsHtml += `
                <tr>
                    <td style="text-align: center; border: 1px solid #ccc; padding: 6px;">${idx + 1}</td>
                    <td style="border: 1px solid #ccc; padding: 6px;">${dateStr} ${timeStr}</td>
                    <td style="border: 1px solid #ccc; padding: 6px; font-weight: bold;">${r.invoiceNumber}</td>
                    <td style="border: 1px solid #ccc; padding: 6px;">
                        ${r.itemName} ${r.imei ? '<br><small>IMEI: ' + r.imei + '</small>' : ''}
                    </td>
                    <td style="text-align: center; border: 1px solid #ccc; padding: 6px;">${r.quantity}</td>
                    <td style="text-align: right; border: 1px solid #ccc; padding: 6px;">$${r.totalCost.toFixed(2)}</td>
                    <td style="text-align: right; border: 1px solid #ccc; padding: 6px;">$${r.totalPrice.toFixed(2)}</td>
                    <td style="text-align: right; border: 1px solid #ccc; padding: 6px; font-weight: bold; color: #047857;">+$${r.grossProfit.toFixed(2)}</td>
                    <td style="text-align: center; border: 1px solid #ccc; padding: 6px;">${r.margin}%</td>
                </tr>
            `;
        });

        const printWin = window.open('', '_blank', 'width=1000,height=800');
        if (!printWin) {
            alert('សូមបើកការអនុញ្ញាត Pop-up លើ Browser ដើម្បីបោះពុម្ព!');
            return;
        }

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>តារាងរបាយការណ៍លក់ - ${shopName}</title>
                <style>
                    body { font-family: 'Kantumruy Pro', 'Segoe UI', Tahoma, sans-serif; padding: 20px; color: #111; font-size: 12px; }
                    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #222; padding-bottom: 12px; }
                    .shop-name { font-size: 22px; font-weight: 800; margin: 0; }
                    .report-title { font-size: 16px; margin: 6px 0 0 0; color: #2563eb; font-weight: bold; }
                    .summary-box { display: flex; justify-content: space-between; margin-bottom: 15px; padding: 10px; background: #f1f5f9; border-radius: 6px; font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11.5px; }
                    th { background: #e2e8f0; border: 1px solid #94a3b8; padding: 8px 6px; font-weight: bold; }
                    tfoot tr td { background: #f8fafc; font-weight: bold; border: 1px solid #94a3b8; padding: 8px 6px; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 class="shop-name">${shopName}</h1>
                    <div style="font-size: 12px;">ទូរស័ព្ទ៖ ${phone} &bull; កាលបរិច្ឆេទព្រីន៖ ${new Date().toLocaleString()}</div>
                    <div class="report-title">តារាងរបាយការណ៍លក់ & គណនាប្រាក់ចំណេញ (Sales & Profit Ledger)</div>
                </div>

                <div class="summary-box">
                    <div>សរុបមុខទំនិញ៖ ${totalQty}</div>
                    <div>សរុបថ្លៃដើម៖ $${grandCost.toFixed(2)}</div>
                    <div>សរុបការលក់៖ $${grandRevenue.toFixed(2)}</div>
                    <div style="color: #047857;">សរុបចំណេញ៖ +$${grandProfit.toFixed(2)} (${overallMargin}%)</div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 35px;">ល.រ</th>
                            <th>កាលបរិច្ឆេទ</th>
                            <th>វិក្កយបត្រ</th>
                            <th>មុខទំនិញ / សេវាកម្ម</th>
                            <th style="width: 45px;">ចំនួន</th>
                            <th>ថ្លៃដើមសរុប</th>
                            <th>តម្លៃលក់សរុប</th>
                            <th>ប្រាក់ចំណេញ</th>
                            <th style="width: 60px;">% ចំណេញ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4" style="text-align: right;">សរុបទាំងអស់ (Grand Total):</td>
                            <td style="text-align: center;">${totalQty}</td>
                            <td style="text-align: right;">$${grandCost.toFixed(2)}</td>
                            <td style="text-align: right;">$${grandRevenue.toFixed(2)}</td>
                            <td style="text-align: right; color: #047857;">+$${grandProfit.toFixed(2)}</td>
                            <td style="text-align: center;">${overallMargin}%</td>
                        </tr>
                    </tfoot>
                </table>

                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `;

        printWin.document.open();
        printWin.document.write(printContent);
        printWin.document.close();
    }
};
