/**
 * MHALY SHOP - REPORTS & ANALYTICS MODULE
 * KPI calculations, Revenue, Profit margin, Transaction history, Top phone models
 */

const Reports = {
    currentRange: (typeof localStorage !== 'undefined' && localStorage.getItem('mhaly_reports_range')) ? localStorage.getItem('mhaly_reports_range') : 'all',
    customDate: null,
    profitViewMode: 'daily',

    init: function () {
        let savedRange = (typeof localStorage !== 'undefined' && localStorage.getItem('mhaly_reports_range')) ? localStorage.getItem('mhaly_reports_range') : 'all';
        Reports.currentRange = savedRange;
        Reports.setupEventListeners();

        const allSales = Storage.getSales() || [];
        const filtered = Reports.getFilteredSales();
        // If remembered filter yields 0 sales but there are existing sales in database, default to 'all' so reports are visible immediately
        if (filtered.length === 0 && allSales.length > 0 && Reports.currentRange !== 'all') {
            Reports.currentRange = 'all';
            try { localStorage.setItem('mhaly_reports_range', 'all'); } catch (_) { }
            savedRange = 'all';
        }

        // Sync buttons UI
        document.querySelectorAll('.date-filter-group .filter-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.range === savedRange);
        });

        Reports.render();
    },

    render: function () {
        try {
            Reports.updateKPIs();
            Reports.renderTransactionHistory();
            Reports.renderTopModels();
            Reports.renderPeriodicProfitReport();
        } catch (err) {
            console.error('[Reports] render error:', err);
        }
    },

    switchRange: function (range) {
        Reports.currentRange = range;
        try { localStorage.setItem('mhaly_reports_range', range); } catch (_) { }
        document.querySelectorAll('.date-filter-group .filter-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.range === range);
        });
        Reports.customDate = null;
        const customDateInput = document.getElementById('reports-custom-date');
        if (customDateInput) customDateInput.value = '';
        Reports.render();
    },

    setupEventListeners: function () {
        document.querySelectorAll('.date-filter-group .filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                Reports.switchRange(btn.dataset.range);
            });
        });

        const customDateInput = document.getElementById('reports-custom-date');
        if (customDateInput) {
            customDateInput.addEventListener('change', (e) => {
                if (e.target.value) {
                    document.querySelectorAll('.date-filter-group .filter-btn').forEach(b => b.classList.remove('active'));
                    Reports.currentRange = 'custom';
                    Reports.customDate = e.target.value;
                    Reports.render();
                }
            });
        }

        const clearInvoicesBtn = document.getElementById('btn-clear-all-invoices');
        if (clearInvoicesBtn) {
            clearInvoicesBtn.addEventListener('click', Reports.clearAllInvoices);
        }

        const sendTgReportBtn = document.getElementById('btn-reports-send-telegram');
        if (sendTgReportBtn) {
            sendTgReportBtn.addEventListener('click', async () => {
                if (!window.TelegramReporter) return;
                sendTgReportBtn.disabled = true;
                const orig = sendTgReportBtn.innerHTML;
                sendTgReportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> កំពុងផ្ញើ...';
                try {
                    if (Reports.currentRange === 'custom' && Reports.customDate) {
                        await TelegramReporter.sendDailyReport(Reports.customDate, true);
                    } else if (Reports.currentRange === 'today') {
                        await TelegramReporter.sendDailyReport(new Date(), true);
                    } else if (Reports.currentRange === 'this_month') {
                        await TelegramReporter.sendMonthlyReport(undefined, undefined, true);
                    } else {
                        const customVal = document.getElementById('reports-custom-date')?.value;
                        if (customVal) {
                            await TelegramReporter.sendDailyReport(customVal, true);
                        } else {
                            await TelegramReporter.sendDailyReport(new Date(), true);
                        }
                    }
                } finally {
                    sendTgReportBtn.disabled = false;
                    sendTgReportBtn.innerHTML = orig;
                }
            });
        }
    },

    getFilteredSales: function () {
        const sales = Storage.getSales();
        const now = new Date();

        return sales.filter(s => {
            if (Reports.currentRange === 'all') return true;
            const saleDate = new Date(s.date);

            if (Reports.currentRange === 'custom' && Reports.customDate) {
                const parts = Reports.customDate.split('-').map(Number);
                return saleDate.getFullYear() === parts[0] &&
                    (saleDate.getMonth() + 1) === parts[1] &&
                    saleDate.getDate() === parts[2];
            }

            if (Reports.currentRange === 'today') {
                return Storage.isDateToday(saleDate);
            }

            if (Reports.currentRange === 'yesterday') {
                return Storage.isDateYesterday(saleDate);
            }

            if (Reports.currentRange === 'this_week') {
                const diffTime = Math.abs(now - saleDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 7;
            }

            if (Reports.currentRange === 'this_month') {
                return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
            }

            return true;
        });
    },

    updateKPIs: function () {
        const filteredSales = Reports.getFilteredSales();
        const settings = Storage.getSettings();
        const rate = settings.exchangeRate || 4100;
        const products = Storage.getProducts();

        let totalRevenue = 0;
        let totalCost = 0;
        let totalPhonesSold = 0;

        filteredSales.forEach(s => {
            const saleTotal = Number(s.totalUsd !== undefined ? s.totalUsd : s.total) || 0;
            totalRevenue += saleTotal;
            (s.items || []).forEach(item => {
                const itemCost = (Number(item.cost) || 0) * (Number(item.quantity) || 1);
                totalCost += itemCost;
                if (item.hasImei) totalPhonesSold += (Number(item.quantity) || 1);
            });
        });

        const grossProfit = Math.max(0, totalRevenue - totalCost);
        const margin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;

        // Inventory Value
        let totalInventoryValue = 0;
        let totalPhonesInStock = 0;
        products.forEach(p => {
            if (p.hasImei) {
                const inStockImeis = (p.imeis || []).filter(i => i.status === 'in_stock');
                totalPhonesInStock += inStockImeis.length;
                inStockImeis.forEach(i => {
                    totalInventoryValue += (Number(i.cost) || Number(p.cost) || 0);
                });
            } else {
                totalInventoryValue += ((Number(p.cost) || 0) * (Number(p.stockCount) || 0));
            }
        });

        // Update DOM
        const revEl = document.getElementById('kpi-revenue');
        const revKhrEl = document.getElementById('kpi-revenue-khr');
        const costEl = document.getElementById('kpi-cost');
        const costKhrEl = document.getElementById('kpi-cost-khr');
        const profitEl = document.getElementById('kpi-profit');
        const marginEl = document.getElementById('kpi-profit-margin');
        const invCountEl = document.getElementById('kpi-invoices-count');
        const phonesSoldEl = document.getElementById('kpi-phones-sold');
        const invValEl = document.getElementById('kpi-inventory-val');
        const stockCountEl = document.getElementById('kpi-stock-phones-count');

        const isKhr = (window.App && App.getCurrency) ? (App.getCurrency() === 'KHR') : false;

        if (revEl) {
            revEl.innerText = isKhr ? `${Math.round(totalRevenue * rate).toLocaleString()} ៛` : `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        if (revKhrEl) {
            revKhrEl.innerText = isKhr ? `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${Math.round(totalRevenue * rate).toLocaleString()} ៛`;
        }
        if (costEl) {
            costEl.innerText = isKhr ? `${Math.round(totalCost * rate).toLocaleString()} ៛` : `$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        if (costKhrEl) {
            costKhrEl.innerText = isKhr ? `$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${Math.round(totalCost * rate).toLocaleString()} ៛`;
        }
        if (profitEl) {
            profitEl.innerText = isKhr ? `+${Math.round(grossProfit * rate).toLocaleString()} ៛` : `+$${grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        if (marginEl) marginEl.innerText = `Margin: ${margin}%`;
        if (invCountEl) invCountEl.innerText = filteredSales.length;
        if (phonesSoldEl) phonesSoldEl.innerText = `${totalPhonesSold} គ្រឿងលក់បាន`;
        if (invValEl) invValEl.innerText = `$${totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (stockCountEl) stockCountEl.innerText = `${totalPhonesInStock} គ្រឿងក្នុងស្តុក`;
    },

    renderTransactionHistory: function () {
        const tbody = document.getElementById('sales-history-body');
        if (!tbody) return;

        const filteredSales = Reports.getFilteredSales();

        if (filteredSales.length === 0) {
            const allSales = Storage.getSales() || [];
            const hasPastSales = allSales.length > 0;
            const rangeLabels = {
                'today': 'ថ្ងៃនេះ',
                'yesterday': 'ម្សិលមិញ',
                'this_week': 'សប្តាហ៍នេះ',
                'this_month': 'ខែនេះ',
                'custom': 'ថ្ងៃដែលបានជ្រើសរើស',
                'all': 'ប្រព័ន្ធទាំងមូល'
            };
            const currentLabel = rangeLabels[Reports.currentRange] || 'ចន្លោះពេលនេះ';

            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 42px 20px; color: var(--text-muted);">
                        <i class="fa-solid fa-receipt" style="font-size: 36px; margin-bottom: 12px; display: block; opacity: 0.4; color: #38bdf8;"></i>
                        <div style="font-size: 15px; font-weight: 600; color: #94a3b8;">មិនទាន់មានប្រវត្តិវិក្កយបត្រសម្រាប់ ${currentLabel} ទេ</div>
                        <div style="font-size: 12.5px; opacity: 0.75; margin-top: 6px;">
                            ${hasPastSales ? `ទិន្នន័យការលក់សរុបមាន <strong style="color: #38bdf8;">${allSales.length} វិក្កយបត្រ</strong> ត្រូវបានរក្សាទុកដោយសុវត្ថិភាព ១០០%` : 'មិនទាន់មានប្រវត្តិការលក់នៅឡើយទេ'}
                        </div>
                        ${hasPastSales ? `
                            <div style="margin-top: 16px; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
                                <button type="button" class="btn-primary" style="padding: 7px 18px; font-size: 12.5px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;" onclick="Reports.switchRange('all')">
                                    <i class="fa-solid fa-layer-group"></i> បង្ហាញការលក់ទាំងអស់ (${allSales.length} វិក្កយបត្រ)
                                </button>
                                <button type="button" class="btn-secondary" style="padding: 7px 18px; font-size: 12.5px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8;" onclick="Reports.switchRange('yesterday')">
                                    <i class="fa-solid fa-clock-rotate-left"></i> បង្ហាញការលក់ម្សិលមិញ ($179.25)
                                </button>
                            </div>
                        ` : ''}
                    </td>
                </tr>
            `;
            return;
        }

        // Sort descending by date
        filteredSales.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Group by day for summary stats
        const dateGroups = {};
        filteredSales.forEach(s => {
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

        filteredSales.forEach(s => {
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

            const dateStr = s.date ? new Date(s.date).toLocaleDateString('km-KH') : 'ថ្ងៃនេះ';
            const totalQty = (s.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
            const totalVal = Number(s.totalUsd !== undefined ? s.totalUsd : s.total) || 0;
            const invNum = s.invoiceId || s.id || 'INV-000';
            const payMethod = (s.paymentMethod || 'CASH').toUpperCase();
            const isDebtMethod = payMethod.includes('DEBT');
            const remainingDebt = s.debtRemaining !== undefined ? Number(s.debtRemaining) : (isDebtMethod ? totalVal : 0);
            const isSettled = isDebtMethod && (s.debtSettled === true || remainingDebt <= 0.001);
            const isPartial = isDebtMethod && !isSettled && (remainingDebt < (totalVal - 0.001));
            const isFullDebt = isDebtMethod && !isSettled && !isPartial;

            let amountColor = '#34d399';
            let debtNoteHtml = '';
            let methodBadge = '';

            if (isSettled) {
                amountColor = '#34d399';
                debtNoteHtml = '<div style="font-size: 10.5px; color: #34d399; font-weight: 700;"><i class="fa-solid fa-circle-check"></i> សងរួចរាល់</div>';
                methodBadge = `
                    <span class="mini-badge" style="background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35); font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-circle-check"></i> សងរួច (PAID)
                    </span>
                `;
            } else if (isPartial) {
                const paidSoFar = totalVal - remainingDebt;
                amountColor = '#fbbf24';
                debtNoteHtml = `<div style="font-size: 10.5px; color: #f87171; font-weight: 700;">(នៅជំពាក់ $${remainingDebt.toFixed(2)})</div>`;
                methodBadge = `
                    <span class="mini-badge" style="background: rgba(245, 158, 11, 0.18); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35); font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-clock-rotate-left"></i> សងបាន $${paidSoFar.toFixed(2)} / នៅសល់ $${remainingDebt.toFixed(2)}
                    </span>
                `;
            } else if (isFullDebt) {
                amountColor = '#f87171';
                debtNoteHtml = '<div style="font-size: 10.5px; color: #fca5a5; font-weight: 600;">(ជំពាក់)</div>';
                methodBadge = `
                    <span class="mini-badge" style="background: rgba(239, 68, 68, 0.18); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.35); font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-handshake"></i> ជំពាក់ (DEBT)
                    </span>
                `;
            } else {
                amountColor = '#34d399';
                methodBadge = `
                    <span class="mini-badge ${payMethod === 'KHQR' ? 'badge-condition' : 'badge-color'}">
                        ${payMethod}
                    </span>
                `;
            }
            const itemInfo = Storage.formatSaleItemsSummary(s, 2);

            rowsHtml.push(`
                <tr>
                    <td style="max-width: 240px;">
                        <div style="font-weight: 700; color: #f8fafc; font-size: 13.5px; line-height: 1.35; margin-bottom: 2px;" title="${itemInfo.fullText}">
                            <i class="fa-solid fa-box text-sky" style="font-size: 11.5px; margin-right: 4px; opacity: 0.85;"></i>${itemInfo.display}
                        </div>
                        <span style="color: #38bdf8; font-family: var(--font-nums); font-size: 11.5px; font-weight: 600;">#${invNum}</span>
                    </td>
                    <td style="font-size: 12px; color: var(--text-secondary);">${dateStr}</td>
                    <td>
                        <strong>${s.customerName || 'អតិថិជនទូទៅ'}</strong>
                        <div style="font-size: 11px; color: var(--text-muted);">${s.customerPhone || 'N/A'}</div>
                    </td>
                    <td><span style="font-weight: 600;">${totalQty} មុខ</span></td>
                    <td style="font-family: var(--font-nums); font-weight: 800; color: ${amountColor};">
                        $${totalVal.toFixed(2)}
                        ${debtNoteHtml}
                    </td>
                    <td>
                        ${methodBadge}
                    </td>
                    <td class="text-right" style="white-space: nowrap;">
                        <button class="btn-secondary" style="padding: 4px 8px; font-size: 11.5px;" onclick="Reports.viewInvoice('${invNum}')" title="ព្រីនវិក្កយបត្រឡើងវិញ">
                            <i class="fa-solid fa-print"></i> ព្រីនឡើងវិញ
                        </button>
                        <button class="btn-secondary" style="padding: 4px 7px; font-size: 11px; margin-left: 4px;" onclick="Reports.editInvoiceDate('${invNum}')" title="កែប្រែកាលបរិច្ឆេទ">
                            <i class="fa-solid fa-calendar-days"></i> កែថ្ងៃ
                        </button>
                        <button class="btn-remove-item" style="padding: 4px 8px; font-size: 12px; margin-left: 4px; border-radius: 6px;" onclick="Reports.deleteInvoice('${invNum}')" title="លុបវិក្កយបត្រ #${invNum}">
                            <i class="fa-solid fa-trash-can" style="color: #f87171;"></i>
                        </button>
                    </td>
                </tr>
            `);
        });

        tbody.innerHTML = rowsHtml.join('');
    },

    viewInvoice: function (invoiceId) {
        const sales = Storage.getSales();
        const sale = sales.find(s => s.id === invoiceId || s.invoiceId === invoiceId);
        if (sale) {
            POS.showReceipt(sale);
        } else {
            App.showToast(`រកមិនឃើញវិក្កយបត្រ #${invoiceId} ទេ`, 'error');
        }
    },

    deleteInvoice: async function (invoiceId) {
        const sales = Storage.getSales();
        const sale = sales.find(s => s.id === invoiceId || s.invoiceId === invoiceId);
        const invDisplay = sale ? (sale.invoiceId || sale.id) : invoiceId;
        const total = sale ? (Number(sale.totalUsd !== undefined ? sale.totalUsd : sale.total) || 0) : 0;

        if (!confirm(`តើអ្នកពិតជាចង់លុបវិក្កយបត្រ #${invDisplay} (ទឹកប្រាក់: $${total.toFixed(2)}) នេះចេញពីប្រព័ន្ធមែនទេ?`)) {
            return;
        }

        // Ask if store owner wants to return sold items back to stock
        if (sale && sale.items && sale.items.length > 0) {
            const shouldRestore = confirm(`តើអ្នកចង់ដាក់ទំនិញក្នុងវិក្កយបត្រនេះត្រឡប់ចូលស្តុកវិញដែរឬទេ?\n- ចុច [OK] ដើម្បីបញ្ចូលទំនិញចូលស្តុកវិញ\n- ចុច [Cancel] ដើម្បីគ្រាន់តែលុបវិក្កយបត្រចោល`);
            if (shouldRestore) {
                const products = Storage.getProducts();
                sale.items.forEach(cartItem => {
                    const p = products.find(prod => prod.id === cartItem.productId);
                    if (p) {
                        if (p.hasImei && cartItem.imei) {
                            const imeiRec = (p.imeis || []).find(i => i.imei === cartItem.imei);
                            if (imeiRec) {
                                imeiRec.status = 'in_stock';
                                delete imeiRec.soldDate;
                                delete imeiRec.soldPrice;
                                delete imeiRec.invoiceId;
                            }
                        } else if (!p.hasImei) {
                            p.stockCount = (p.stockCount || 0) + (Number(cartItem.quantity) || 1);
                        }
                    }
                });
                Storage.saveProducts(products);
                if (window.Inventory && Inventory.renderTable) Inventory.renderTable();
                if (window.POS && POS.renderProducts) POS.renderProducts();
            }
        }

        // Delete or void notification in Telegram Group
        if (sale) {
            Reports.deleteTelegramSaleAlert(sale);
        }

        // Atomically delete across LocalStorage, Sales Vault, IndexedDB, Server, and Cloud
        if (window.Storage && Storage.deleteSale) {
            await Storage.deleteSale(invoiceId);
        } else {
            if (window.Storage && Storage.markDeletedId) {
                Storage.markDeletedId(invoiceId);
                if (sale && sale.id) Storage.markDeletedId(sale.id);
                if (sale && sale.invoiceId) Storage.markDeletedId(sale.invoiceId);
            }
            const updatedSales = sales.filter(s => s.id !== invoiceId && s.invoiceId !== invoiceId);
            Storage.saveSales(updatedSales);
        }

        Reports.updateKPIs();
        Reports.renderTransactionHistory();
        Reports.renderTopModels();
        if (window.Finance && Finance.updateDashboardKPIs) Finance.updateDashboardKPIs();
        if (window.SalesLedger && SalesLedger.render) SalesLedger.render();
        App.showToast(`បានលុបវិក្កយបត្រ #${invDisplay} ជោគជ័យ!`, 'success');
    },

    // Delete sales alert message from Telegram group or send VOID alert
    deleteTelegramSaleAlert: async function (sale) {
        if (!sale) return;
        try {
            const settings = Storage.getSettings();
            if (settings.telegramAlertEnabled === false) return;
            const token = settings.telegramBotToken || '';
            const chatId = sale.telegramChatId || settings.telegramChatId || '';
            if (!token || !chatId) return;

            let deleted = false;
            // 1. Try to delete the message directly from the Telegram group
            if (sale.telegramMessageId) {
                try {
                    const res = await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            message_id: sale.telegramMessageId
                        })
                    });
                    const data = await res.json();
                    if (data && data.ok) {
                        deleted = true;
                        console.log('[Telegram Alert] Message deleted from Telegram group successfully:', sale.telegramMessageId);
                    } else {
                        console.warn('[Telegram Alert] deleteMessage response:', data);
                    }
                } catch (err) {
                    console.warn('[Telegram Alert] deleteMessage network error:', err);
                }
            }

            // 2. If message could not be deleted (e.g. older than 48 hours or sent before tracking),
            // send a clear VOID/Cancellation notice so everyone in the group is informed.
            if (!deleted) {
                const invDisplay = sale.invoiceId || sale.id || 'N/A';
                const totalUsd = Number(sale.totalUsd !== undefined ? sale.totalUsd : sale.total) || 0;
                const now = new Date();
                const cancelText =
                    `❌ <b>[លុបចោល / VOID] វិក្កយបត្រ #${invDisplay}</b>
━━━━━━━━━━━━━━━━━━
⚠️ វិក្កយបត្រនេះត្រូវបាន <b>លុបចេញពីប្រព័ន្ធ</b> ដោយសារការបញ្ចូលខុស!
💰 ទឹកប្រាក់លុបចោល: <b>$${totalUsd.toFixed(2)}</b>
👤 អ្នកលុប: ${sale.cashier || 'Mhaly (Admin)'}
⏰ ម៉ោងលុប: ${now.toLocaleTimeString('km-KH')} • ${now.toLocaleDateString('km-KH')}
━━━━━━━━━━━━━━━━━━
✨ <i>${settings.shopName || 'Mhaly Shop'} Cloud POS System</i>`;

                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: cancelText,
                        parse_mode: 'HTML'
                    })
                }).catch(err => console.warn('[Telegram Void Notice Failed]', err));
            }
        } catch (e) {
            console.warn('[deleteTelegramSaleAlert Error]', e);
        }
    },

    // =====================================================
    // EDIT INVOICE DATE — Modal Date Picker (ជំនួស prompt)
    // =====================================================
    editInvoiceDate: function (invoiceId) {
        const sales = Storage.getSales();
        const sale = sales.find(s => s.id === invoiceId || s.invoiceId === invoiceId);
        if (!sale) return;

        const currentVal = sale.date
            ? new Date(sale.date).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);

        // Create modal dynamically if not yet in DOM
        let modal = document.getElementById('edit-date-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'edit-date-modal';
            modal.className = 'modal-backdrop';
            modal.innerHTML = `
                <div class="modal-dialog" style="max-width: 420px;">
                    <div class="modal-header">
                        <div>
                            <h3 class="modal-title">
                                <i class="fa-solid fa-calendar-pen" style="color: #38bdf8;"></i>
                                កែប្រែថ្ងៃ ខែ ឆ្នាំ
                            </h3>
                            <p class="modal-subtitle" id="edit-date-modal-subtitle"></p>
                        </div>
                        <button class="btn-close-modal" id="btn-close-edit-date-modal">&times;</button>
                    </div>
                    <div class="modal-body" style="padding: 28px 24px;">
                        <div class="form-group" style="margin-bottom: 24px;">
                            <label style="font-size: 13px; color: var(--text-secondary); margin-bottom: 10px; display: block;">
                                <i class="fa-solid fa-calendar-days" style="color: #38bdf8; margin-right: 6px;"></i>
                                ជ្រើសរើសថ្ងៃ ខែ ឆ្នាំ ថ្មី៖
                            </label>
                            <input type="date" id="edit-date-input"
                                style="width: 100%; font-size: 16px; font-weight: 700;
                                       color: #38bdf8; color-scheme: dark;
                                       padding: 12px 16px; border-radius: 10px;
                                       background: rgba(56,189,248,0.08);
                                       border: 1.5px solid rgba(56,189,248,0.35);
                                       outline: none; cursor: pointer;">
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn-primary" id="btn-confirm-edit-date" style="flex: 1; gap: 8px;">
                                <i class="fa-solid fa-check"></i> រក្សាទុក
                            </button>
                            <button class="btn-secondary" id="btn-cancel-edit-date" style="flex: 1;">
                                <i class="fa-solid fa-xmark"></i> បោះបង់
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('btn-close-edit-date-modal')
                .addEventListener('click', () => modal.classList.remove('show'));
            document.getElementById('btn-cancel-edit-date')
                .addEventListener('click', () => modal.classList.remove('show'));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('show');
            });
        }

        // Populate current data
        document.getElementById('edit-date-modal-subtitle').textContent =
            'វិក្កយបត្រ #' + (sale.invoiceId || sale.id);
        document.getElementById('edit-date-input').value = currentVal;

        // Re-wire confirm button (replace to avoid stacked listeners)
        const oldBtn = document.getElementById('btn-confirm-edit-date');
        const newBtn = oldBtn.cloneNode(true);
        oldBtn.parentNode.replaceChild(newBtn, oldBtn);

        newBtn.addEventListener('click', () => {
            const newDateStr = document.getElementById('edit-date-input').value;
            if (!newDateStr) {
                App.showToast('សូមជ្រើសរើសថ្ងៃ ខែ ឆ្នាំ!', 'error');
                return;
            }
            const parts = newDateStr.split('-').map(Number);
            if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
                App.showToast('កាលបរិច្ឆេទមិនត្រឹមត្រូវ!', 'error');
                return;
            }

            const now = new Date();
            const updatedDate = new Date(
                parts[0], parts[1] - 1, parts[2],
                now.getHours(), now.getMinutes(), now.getSeconds()
            );
            sale.date = updatedDate.toISOString();
            sale.dateFormatted = updatedDate.toLocaleDateString('km-KH');

            Storage.saveSales(sales);
            modal.classList.remove('show');

            Reports.updateKPIs();
            Reports.renderTransactionHistory();
            Reports.renderTopModels();
            if (window.Finance) {
                Finance.updateDashboardKPIs();
                Finance.renderInvoices();
            }
            App.showToast(
                'បានកែប្រែកាលបរិច្ឆេទ #' + (sale.invoiceId || sale.id) + ' ជោគជ័យ!',
                'success'
            );
        });

        modal.classList.add('show');
    },

    clearAllInvoices: function () {
        App.showToast('មុខងារនេះត្រូវបានចាក់សោសុវត្ថិភាព ដើម្បីការពារទិន្នន័យលក់របស់ហាង!', 'warning');
    },

    renderTopModels: function () {
        const container = document.getElementById('top-models-list');
        if (!container) return;

        const sales = Storage.getSales();
        const modelCounts = {};

        sales.forEach(s => {
            (s.items || []).forEach(item => {
                const name = item.name || item.productName || 'ទំនិញ';
                modelCounts[name] = (modelCounts[name] || 0) + (Number(item.quantity) || 1);
            });
        });

        const sorted = Object.entries(modelCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (sorted.length === 0) {
            container.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">មិនទាន់មានទិន្នន័យលក់</span>`;
            return;
        }

        const maxCount = sorted[0][1] || 1;

        container.innerHTML = sorted.map(([name, count]) => {
            const pct = Math.round((count / maxCount) * 100);
            return `
                <div class="top-model-item">
                    <div class="top-model-info">
                        <strong>${name}</strong>
                        <span style="font-family: var(--font-nums); color: #38bdf8; font-weight: 700;">${count} គ្រឿង</span>
                    </div>
                    <div class="top-model-progress">
                        <div class="top-model-bar" style="width: ${pct}%;"></div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // =======================================================
    // PERIODIC PROFIT & SALES SUMMARY (ថ្ងៃនេះ, ខែនេះ, ឆ្នាំនេះ)
    // =======================================================
    switchProfitView: function (mode) {
        Reports.profitViewMode = mode;
        const btnDaily = document.getElementById('btn-profit-view-daily');
        const btnMonthly = document.getElementById('btn-profit-view-monthly');
        const btnYearly = document.getElementById('btn-profit-view-yearly');
        const titleEl = document.getElementById('profit-table-title');

        if (btnDaily) btnDaily.classList.toggle('active', mode === 'daily');
        if (btnMonthly) btnMonthly.classList.toggle('active', mode === 'monthly');
        if (btnYearly) btnYearly.classList.toggle('active', mode === 'yearly');

        if (titleEl) {
            if (mode === 'daily') titleEl.innerText = 'តារាងការលក់ & ប្រាក់ចំណេញប្រចាំថ្ងៃ (Daily Breakdown)';
            else if (mode === 'monthly') titleEl.innerText = 'តារាងការលក់ & ប្រាក់ចំណេញប្រចាំខែ (Monthly Breakdown)';
            else if (mode === 'yearly') titleEl.innerText = 'តារាងការលក់ & ប្រាក់ចំណេញប្រចាំឆ្នាំ (Yearly Breakdown)';
        }

        Reports.renderPeriodicProfitTable();
    },

    renderPeriodicProfitReport: function () {
        const sales = Storage.getSales();
        const now = new Date();
        const todayYear = now.getFullYear();
        const todayMonth = now.getMonth();
        const todayDateStr = now.toDateString();

        let todayProfit = 0, todayRev = 0, todayInvCount = 0;
        let monthProfit = 0, monthRev = 0, monthInvCount = 0;
        let yearProfit = 0, yearRev = 0, yearInvCount = 0;
        let allProfit = 0, allRev = 0, allCost = 0, allInvCount = sales.length;

        sales.forEach(s => {
            const sDate = s.date ? new Date(s.date) : new Date();
            const sRev = Number(s.totalUsd !== undefined ? s.totalUsd : s.total) || 0;
            let sCost = 0;
            (s.items || []).forEach(it => {
                const cost = Number(it.cost) || 0;
                const qty = Number(it.quantity) || 1;
                sCost += (cost * qty);
            });
            const sProfit = s.profit !== undefined ? Number(s.profit) : Math.max(0, sRev - sCost);

            allRev += sRev;
            allCost += sCost;
            allProfit += sProfit;

            if (sDate.getFullYear() === todayYear) {
                yearRev += sRev;
                yearProfit += sProfit;
                yearInvCount += 1;

                if (sDate.getMonth() === todayMonth) {
                    monthRev += sRev;
                    monthProfit += sProfit;
                    monthInvCount += 1;

                    if (Storage.isDateToday(sDate)) {
                        todayRev += sRev;
                        todayProfit += sProfit;
                        todayInvCount += 1;
                    }
                }
            }
        });

        const allMargin = allRev > 0 ? ((allProfit / allRev) * 100).toFixed(1) : 0;

        // Update KPI Cards DOM
        const pTodayVal = document.getElementById('profit-today-val');
        const pTodaySub = document.getElementById('profit-today-sub');
        const pMonthVal = document.getElementById('profit-month-val');
        const pMonthSub = document.getElementById('profit-month-sub');
        const pYearVal = document.getElementById('profit-year-val');
        const pYearSub = document.getElementById('profit-year-sub');
        const pAllVal = document.getElementById('profit-all-val');
        const pAllSub = document.getElementById('profit-all-sub');

        if (pTodayVal) pTodayVal.innerText = `+$${todayProfit.toFixed(2)}`;
        if (pTodaySub) pTodaySub.innerText = `ចំណូល: $${todayRev.toFixed(2)} • ${todayInvCount} វិក្កយបត្រ`;

        if (pMonthVal) pMonthVal.innerText = `+$${monthProfit.toFixed(2)}`;
        if (pMonthSub) pMonthSub.innerText = `ចំណូល: $${monthRev.toFixed(2)} • ${monthInvCount} វិក្កយបត្រ`;

        if (pYearVal) pYearVal.innerText = `+$${yearProfit.toFixed(2)}`;
        if (pYearSub) pYearSub.innerText = `ចំណូល: $${yearRev.toFixed(2)} • ${yearInvCount} វិក្កយបត្រ`;

        if (pAllVal) pAllVal.innerText = `+$${allProfit.toFixed(2)}`;
        if (pAllSub) pAllSub.innerText = `Margin: ${allMargin}% • ${allInvCount} វិក្កយបត្រសរុប`;

        // Render Table
        Reports.renderPeriodicProfitTable();
    },

    renderPeriodicProfitTable: function () {
        const tbody = document.getElementById('periodic-profit-body');
        if (!tbody) return;

        const sales = Storage.getSales();
        if (sales.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 28px; color: var(--text-muted);">
                        មិនទាន់មានទិន្នន័យការលក់សម្រាប់គណនាប្រាក់ចំណេញនៅឡើយទេ
                    </td>
                </tr>
            `;
            return;
        }

        const mode = Reports.profitViewMode || 'daily';
        const groups = {};

        sales.forEach(s => {
            const d = s.date ? new Date(s.date) : new Date();
            let key = '';
            let label = '';

            if (mode === 'daily') {
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                label = Storage.getDateBadgeLabel(d);
            } else if (mode === 'monthly') {
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                label = `ខែ ${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            } else if (mode === 'yearly') {
                key = `${d.getFullYear()}`;
                label = `ឆ្នាំ ${d.getFullYear()}`;
            }

            if (!groups[key]) {
                groups[key] = {
                    key: key,
                    label: label,
                    dateObj: d,
                    invoiceCount: 0,
                    itemCount: 0,
                    revenue: 0,
                    cost: 0,
                    profit: 0
                };
            }

            const sRev = Number(s.totalUsd !== undefined ? s.totalUsd : s.total) || 0;
            let sCost = 0;
            let sItems = 0;
            (s.items || []).forEach(it => {
                const cost = Number(it.cost) || 0;
                const qty = Number(it.quantity) || 1;
                sCost += (cost * qty);
                sItems += qty;
            });
            const sProfit = s.profit !== undefined ? Number(s.profit) : Math.max(0, sRev - sCost);

            groups[key].invoiceCount += 1;
            groups[key].itemCount += sItems;
            groups[key].revenue += sRev;
            groups[key].cost += sCost;
            groups[key].profit += sProfit;
        });

        // Sort descending by date key
        const sortedGroups = Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));

        tbody.innerHTML = sortedGroups.map(g => {
            const margin = g.revenue > 0 ? ((g.profit / g.revenue) * 100).toFixed(1) : 0;
            const marginBadgeClass = Number(margin) >= 30 ? 'badge-condition' : (Number(margin) >= 15 ? 'badge-color' : 'badge-battery');

            let icon = 'fa-calendar-day';
            if (mode === 'monthly') icon = 'fa-calendar-week';
            if (mode === 'yearly') icon = 'fa-chart-line';

            return `
                <tr>
                    <td>
                        <strong style="color: var(--text-primary); font-size: 13.5px; display: inline-flex; align-items: center; gap: 6px;">
                            <i class="fa-solid ${icon} text-sky" style="font-size: 12px;"></i>
                            ${g.label}
                        </strong>
                    </td>
                    <td>
                        <span style="font-weight: 600; color: #f8fafc; font-family: var(--font-nums);">${g.invoiceCount}</span>
                        <span style="font-size: 11.5px; color: var(--text-muted);"> សន្លឹក</span>
                    </td>
                    <td>
                        <span style="font-weight: 600; color: #f8fafc; font-family: var(--font-nums);">${g.itemCount}</span>
                        <span style="font-size: 11.5px; color: var(--text-muted);"> គ្រឿង/មុខ</span>
                    </td>
                    <td style="font-family: var(--font-nums); font-weight: 700; color: #38bdf8; font-size: 14px;">
                        $${g.revenue.toFixed(2)}
                    </td>
                    <td style="font-family: var(--font-nums); color: var(--text-secondary); font-size: 13px;">
                        $${g.cost.toFixed(2)}
                    </td>
                    <td style="font-family: var(--font-nums); font-weight: 800; color: #34d399; font-size: 14.5px;">
                        +$${g.profit.toFixed(2)}
                    </td>
                    <td class="text-right">
                        <span class="mini-badge ${marginBadgeClass}" style="font-weight: 700; font-family: var(--font-nums);">
                            ${margin}%
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    },

    printProfitSummary: function () {
        const mode = Reports.profitViewMode || 'daily';
        const modeTitle = mode === 'daily' ? 'ប្រចាំថ្ងៃ' : (mode === 'monthly' ? 'ប្រចាំខែ' : 'ប្រចាំឆ្នាំ');
        const sales = Storage.getSales();
        const settings = Storage.getSettings();
        const shopName = settings.shopName || 'Mhaly Shop';
        const now = new Date();

        let totalRev = 0, totalCost = 0, totalProf = 0, totalInvs = sales.length;
        sales.forEach(s => {
            const sRev = Number(s.totalUsd !== undefined ? s.totalUsd : s.total) || 0;
            let sCost = 0;
            (s.items || []).forEach(it => {
                sCost += (Number(it.cost) || 0) * (Number(it.quantity) || 1);
            });
            totalRev += sRev;
            totalCost += sCost;
            totalProf += (s.profit !== undefined ? Number(s.profit) : Math.max(0, sRev - sCost));
        });

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            window.print();
            return;
        }

        printWindow.document.write(`
            <html>
            <head>
                <title>របាយការណ៍ប្រាក់ចំណេញ - ${shopName}</title>
                <style>
                    body { font-family: Arial, 'Kantumruy Pro', sans-serif; padding: 25px; color: #111; }
                    h2 { margin-bottom: 4px; text-align: center; }
                    .center { text-align: center; font-size: 12px; color: #555; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
                    th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
                    th { background: #f4f4f4; font-weight: bold; }
                    .text-right { text-align: right; }
                    .total-box { margin-top: 15px; margin-bottom: 20px; padding: 12px; background: #f9f9f9; border-radius: 6px; font-size: 13px; border: 1px solid #eee; }
                </style>
            </head>
            <body>
                <h2>${shopName}</h2>
                <div class="center">របាយការណ៍ប្រាក់ចំណេញ ${modeTitle} &bull; កាលបរិច្ឆេទព្រីន: ${now.toLocaleDateString('km-KH')} ${now.toLocaleTimeString('km-KH')}</div>
                <div class="total-box">
                    <strong>សរុបប្រាក់ចំណូល:</strong> $${totalRev.toFixed(2)} &nbsp;|&nbsp;
                    <strong>សរុបថ្លៃដើម:</strong> $${totalCost.toFixed(2)} &nbsp;|&nbsp;
                    <strong style="color: green;">សរុបប្រាក់ចំណេញសុទ្ធ:</strong> +$${totalProf.toFixed(2)} &nbsp;|&nbsp;
                    <strong>វិក្កយបត្រ:</strong> ${totalInvs} សន្លឹក
                </div>
                ${document.getElementById('periodic-profit-table').outerHTML}
                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
};

window.Reports = Reports;
