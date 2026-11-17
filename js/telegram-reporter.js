/**
 * MHALY SHOP - TELEGRAM AUTOMATED REPORTING ENGINE
 * ------------------------------------------------
 * Automatically sends:
 * 1. Daily Sales Summary every night at 8:30 PM (20:30)
 * 2. Monthly Sales Summary on the last day of each month at 8:30 PM (with daily sequence breakdown)
 * 3. Annual Sales Summary on December 31st at 8:30 PM
 * Also provides manual trigger for ANY selected date, month, or year.
 */

var TelegramReporter = window.TelegramReporter = {
    OFFICIAL_BOT_TOKEN: '8804957362:AAHn05zmESvxluRBjEEeucYzduBYbYHfua0',
    OFFICIAL_CHAT_ID: '-1004303225816',
    timerId: null,
    isSending: false,
    khmerMonths: ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'],

    init: function() {
        console.log('[TelegramReporter] Manual reporting engine ready. Automated timer disabled.');
    },

    startScheduler: function() {
        // Automated timer permanently disabled per store owner preference.
        // Closing is done manually via manual buttons or when closing shop.
        if (TelegramReporter.timerId) {
            clearInterval(TelegramReporter.timerId);
            TelegramReporter.timerId = null;
        }
    },

    checkSchedule: async function() {
        // Automated timer permanently disabled.
    },

    // -------------------------------------------------------------
    // DATA COMPUTATIONS
    // -------------------------------------------------------------
    getDailySummaryData: function(targetDateInput = new Date()) {
        const sales = (window.Storage && Storage.getSales) ? Storage.getSales() : [];
        const expenses = (window.Storage && Storage.getExpenses) ? Storage.getExpenses() : [];
        const settings = (window.Storage && Storage.getSettings) ? Storage.getSettings() : {};
        const rate = settings.exchangeRate || 4100;

        let targetDate = targetDateInput;
        if (!targetDate) {
            targetDate = new Date();
        } else if (typeof targetDate === 'string') {
            if (targetDate.includes('-')) {
                const parts = targetDate.split('T')[0].split('-').map(Number);
                targetDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
            } else {
                targetDate = new Date(targetDate);
            }
        }

        const targetY = targetDate.getFullYear();
        const targetM = targetDate.getMonth();
        const targetD = targetDate.getDate();

        // Filter sales by the exact entered calendar date of the sale
        const filteredSales = sales.filter(s => {
            if (!s.date) return false;
            const d = new Date(s.date);
            return d.getFullYear() === targetY && d.getMonth() === targetM && d.getDate() === targetD;
        });

        let totalRevenue = 0;
        let totalCost = 0;
        let totalProfit = 0;
        let itemsCount = 0;
        const itemMap = {};
        const payByMethod = { cash: 0, khqr: 0, bank: 0, debt: 0 };

        filteredSales.forEach(s => {
            const rev = Number(s.totalUsd !== undefined ? s.totalUsd : s.total) || 0;
            totalRevenue += rev;

            let saleCost = 0;
            (s.items || []).forEach(it => {
                const qty = Number(it.quantity) || 1;
                const cost = Number(it.cost) || 0;
                saleCost += cost * qty;
                itemsCount += qty;

                const name = (it.name || 'ទំនិញ').trim();
                itemMap[name] = (itemMap[name] || 0) + qty;
            });
            totalCost += saleCost;

            if (s.profit !== undefined && s.profit !== null) {
                totalProfit += Number(s.profit);
            } else {
                totalProfit += (rev - saleCost);
            }

            const method = String(s.paymentMethod || 'cash').toLowerCase();
            if (method.includes('khqr') || method.includes('bakong')) {
                payByMethod.khqr += rev;
            } else if (method.includes('bank') || method.includes('transfer')) {
                payByMethod.bank += rev;
            } else if (method.includes('debt')) {
                payByMethod.debt += rev;
            } else {
                payByMethod.cash += rev;
            }
        });

        // Filter daily expenses
        let totalExpenses = 0;
        expenses.filter(e => {
            if (!e.date || e.type !== 'expense') return false;
            const d = new Date(e.date);
            return d.getFullYear() === targetY && d.getMonth() === targetM && d.getDate() === targetD;
        }).forEach(e => {
            totalExpenses += Number(e.amountUsd || e.amount || 0);
        });

        const netProfit = totalProfit - totalExpenses;
        const margin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

        // Top 3 items
        const topItems = Object.entries(itemMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, qty]) => `  • ${name}: <b>${qty}</b>`);

        return {
            targetDate,
            invoiceCount: filteredSales.length,
            itemsCount,
            totalRevenue,
            totalRevenueKhr: Math.round(totalRevenue * rate),
            totalCost,
            totalProfit,
            margin,
            totalExpenses,
            netProfit,
            payByMethod,
            topItems
        };
    },

    getMonthlySummaryData: function(year, month) {
        const sales = (window.Storage && Storage.getSales) ? Storage.getSales() : [];
        const expenses = (window.Storage && Storage.getExpenses) ? Storage.getExpenses() : [];
        const settings = (window.Storage && Storage.getSettings) ? Storage.getSettings() : {};
        const rate = settings.exchangeRate || 4100;

        const filteredSales = sales.filter(s => {
            if (!s.date) return false;
            const d = new Date(s.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });

        let totalRevenue = 0;
        let totalCost = 0;
        let totalProfit = 0;
        let itemsCount = 0;

        // Group by day for chronological sequence
        const dayMap = {};

        filteredSales.forEach(s => {
            const rev = Number(s.totalUsd !== undefined ? s.totalUsd : s.total) || 0;
            totalRevenue += rev;

            let saleCost = 0;
            (s.items || []).forEach(it => {
                const qty = Number(it.quantity) || 1;
                const cost = Number(it.cost) || 0;
                saleCost += cost * qty;
                itemsCount += qty;
            });
            totalCost += saleCost;

            let p = 0;
            if (s.profit !== undefined && s.profit !== null) {
                p = Number(s.profit);
            } else {
                p = (rev - saleCost);
            }
            totalProfit += p;

            // Track day breakdown
            const d = new Date(s.date);
            const dayNum = d.getDate();
            const dayKey = `${String(dayNum).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!dayMap[dayNum]) {
                dayMap[dayNum] = { dayNum, dayKey, revenue: 0, profit: 0, count: 0 };
            }
            dayMap[dayNum].revenue += rev;
            dayMap[dayNum].profit += p;
            dayMap[dayNum].count += 1;
        });

        let totalExpenses = 0;
        expenses.filter(e => {
            if (!e.date || e.type !== 'expense') return false;
            const d = new Date(e.date);
            return d.getFullYear() === year && d.getMonth() === month;
        }).forEach(e => {
            totalExpenses += Number(e.amountUsd || e.amount || 0);
        });

        const netProfit = totalProfit - totalExpenses;
        const margin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

        // Days in month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const avgPerDay = totalRevenue / Math.max(1, daysInMonth);

        // Daily breakdown sorted chronologically ascending (1, 2, 3 ... 31)
        const dailyBreakdown = Object.values(dayMap)
            .sort((a, b) => a.dayNum - b.dayNum)
            .map(item => `  • <b>${item.dayKey}:</b> $${item.revenue.toFixed(2)} (${item.count} វិក្កយបត្រ | +$${item.profit.toFixed(2)})`);

        return {
            year,
            month,
            invoiceCount: filteredSales.length,
            itemsCount,
            totalRevenue,
            totalRevenueKhr: Math.round(totalRevenue * rate),
            totalCost,
            totalProfit,
            margin,
            totalExpenses,
            netProfit,
            avgPerDay,
            dailyBreakdown
        };
    },

    getYearlySummaryData: function(year) {
        const sales = (window.Storage && Storage.getSales) ? Storage.getSales() : [];
        const expenses = (window.Storage && Storage.getExpenses) ? Storage.getExpenses() : [];
        const settings = (window.Storage && Storage.getSettings) ? Storage.getSettings() : {};
        const rate = settings.exchangeRate || 4100;

        const filteredSales = sales.filter(s => {
            if (!s.date) return false;
            const d = new Date(s.date);
            return d.getFullYear() === year;
        });

        let totalRevenue = 0;
        let totalCost = 0;
        let totalProfit = 0;
        let itemsCount = 0;

        filteredSales.forEach(s => {
            const rev = Number(s.totalUsd !== undefined ? s.totalUsd : s.total) || 0;
            totalRevenue += rev;

            let saleCost = 0;
            (s.items || []).forEach(it => {
                const qty = Number(it.quantity) || 1;
                const cost = Number(it.cost) || 0;
                saleCost += cost * qty;
                itemsCount += qty;
            });
            totalCost += saleCost;

            if (s.profit !== undefined && s.profit !== null) {
                totalProfit += Number(s.profit);
            } else {
                totalProfit += (rev - saleCost);
            }
        });

        let totalExpenses = 0;
        expenses.filter(e => {
            if (!e.date || e.type !== 'expense') return false;
            const d = new Date(e.date);
            return d.getFullYear() === year;
        }).forEach(e => {
            totalExpenses += Number(e.amountUsd || e.amount || 0);
        });

        const netProfit = totalProfit - totalExpenses;
        const margin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

        return {
            year,
            invoiceCount: filteredSales.length,
            itemsCount,
            totalRevenue,
            totalRevenueKhr: Math.round(totalRevenue * rate),
            totalCost,
            totalProfit,
            margin,
            totalExpenses,
            netProfit
        };
    },

    // -------------------------------------------------------------
    // TELEGRAM SEND METHODS
    // -------------------------------------------------------------
    sendTelegramMessage: async function(messageHtml) {
        const settings = (window.Storage && Storage.getSettings) ? Storage.getSettings() : {};
        let token = (settings.telegramBotToken || '').trim();
        if (!token || token.length < 25) {
            const tokenInput = (typeof document !== 'undefined') ? document.getElementById('setting-telegram-token') : null;
            token = (tokenInput && tokenInput.value && tokenInput.value.trim().length >= 25) ? tokenInput.value.trim() : TelegramReporter.OFFICIAL_BOT_TOKEN;
        }

        let chatId = settings.telegramChatId ? String(settings.telegramChatId).trim() : '';
        // AUTO-HEALING: If user entered t.me/... link, bot username, or left empty, auto-correct to real Group ID!
        if (!chatId || chatId.includes('t.me') || chatId.includes('@') || !chatId.startsWith('-100')) {
            chatId = TelegramReporter.OFFICIAL_CHAT_ID;
            if (typeof document !== 'undefined') {
                const chatInput = document.getElementById('setting-telegram-chatid');
                if (chatInput) chatInput.value = TelegramReporter.OFFICIAL_CHAT_ID;
            }
        }

        if (!token || !chatId) {
            console.warn('[TelegramReporter] Missing token or chatId');
            return false;
        }

        // Concurrency lock to prevent duplicate sending
        if (TelegramReporter.isSending) {
            console.warn('[TelegramReporter] Another report is already sending. Waiting...');
            let waitTries = 0;
            while (TelegramReporter.isSending && waitTries < 10) {
                await new Promise(r => setTimeout(r, 400));
                waitTries++;
            }
        }
        TelegramReporter.isSending = true;

        try {
            // Guard message length limit of Telegram (4096 chars)
            const sendChunks = [];
            if (messageHtml.length > 3900) {
                const lines = messageHtml.split('\n');
                let cur = '';
                for (const line of lines) {
                    if ((cur + '\n' + line).length > 3800) {
                        sendChunks.push(cur);
                        cur = line;
                    } else {
                        cur = cur ? cur + '\n' + line : line;
                    }
                }
                if (cur) sendChunks.push(cur);
            } else {
                sendChunks.push(messageHtml);
            }

            let allOk = true;
            for (const chunk of sendChunks) {
                let success = false;
                let attempt = 0;
                const maxAttempts = 3;

                while (!success && attempt < maxAttempts) {
                    attempt++;
                    try {
                        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: chatId,
                                text: chunk,
                                parse_mode: 'HTML'
                            })
                        });
                        const data = await res.json();
                        if (data && data.ok) {
                            success = true;
                        } else if (data && data.error_code === 429) {
                            const retryAfter = (data.parameters && data.parameters.retry_after) ? data.parameters.retry_after * 1000 : 3000;
                            console.warn(`[TelegramReporter] Rate limited. Waiting ${retryAfter}ms before retry...`);
                            await new Promise(r => setTimeout(r, retryAfter));
                        } else {
                            console.warn(`[TelegramReporter] Telegram API error (attempt ${attempt}):`, data);
                            if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1200 * attempt));
                        }
                    } catch (err) {
                        console.warn(`[TelegramReporter] Network error (attempt ${attempt}):`, err);
                        if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1500 * attempt));
                    }
                }
                if (!success) allOk = false;
            }
            return allOk;
        } finally {
            TelegramReporter.isSending = false;
        }
    },

    // 1. Send Daily Report (Supports today or any past date)
    sendDailyReport: async function(targetDateInput = new Date(), isManual = false) {
        const d = TelegramReporter.getDailySummaryData(targetDateInput);
        const settings = (window.Storage && Storage.getSettings) ? Storage.getSettings() : {};
        const shopName = settings.shopName || 'Mhaly Shop';

        const day = d.targetDate.getDate();
        const monthKh = TelegramReporter.khmerMonths[d.targetDate.getMonth()];
        const year = d.targetDate.getFullYear();
        const pad = n => String(n).padStart(2, '0');
        const dateTag = `${pad(day)}/${pad(d.targetDate.getMonth() + 1)}/${year}`;
        const timeNow = new Date().toLocaleTimeString('km-KH');

        let topItemsSection = '';
        if (d.topItems && d.topItems.length > 0) {
            topItemsSection = `📦 <b>ទំនិញលក់ដាច់ប្រចាំថ្ងៃ:</b>\n${d.topItems.join('\n')}\n━━━━━━━━━━━━━━━━━━\n`;
        }

        const isToday = Storage.isDateToday(d.targetDate);
        const subLabel = isManual
            ? (isToday ? '(ចុចផ្ញើដោយដៃ)' : `(របាយការណ៍សរុបថ្ងៃទី ${dateTag})`)
            : '(ស្វ័យប្រវត្ត 8:30 យប់)';

        const msg = 
`📊 <b>របាយការណ៍សរុបប្រចាំថ្ងៃ (${shopName})</b>
━━━━━━━━━━━━━━━━━━
📅 <b>កាលបរិច្ឆេទ:</b> ថ្ងៃទី ${day} ខែ ${monthKh} ឆ្នាំ ${year} <b>(${dateTag})</b>
⏰ <b>ម៉ោងសរុប:</b> ${timeNow} ${subLabel}
━━━━━━━━━━━━━━━━━━
🧾 <b>វិក្កយបត្រសរុប:</b> <b>${d.invoiceCount}</b> វិក្កយបត្រ
📦 <b>ទំនិញលក់បាន:</b> <b>${d.itemsCount}</b> មុខ
━━━━━━━━━━━━━━━━━━
💰 <b>ប្រាក់លក់សរុប (Revenue):</b> <b>$${d.totalRevenue.toFixed(2)}</b> (${d.totalRevenueKhr.toLocaleString()} ៛)
💵 <b>ថ្លៃដើមទំនិញ (Cost):</b> <b>$${d.totalCost.toFixed(2)}</b>
📈 <b>ប្រាក់ចំណេញដុល (Profit):</b> <b>+$${d.totalProfit.toFixed(2)}</b> (${d.margin}%)
${d.totalExpenses > 0 ? `💸 <b>ចំណាយប្រតិបត្តិការ:</b> -$${d.totalExpenses.toFixed(2)}\n` : ''}💎 <b>ចំណេញសុទ្ធចុងក្រោយ (Net):</b> <b>${d.netProfit >= 0 ? '+' : ''}$${d.netProfit.toFixed(2)}</b>
━━━━━━━━━━━━━━━━━━
💳 <b>ចំណូលតាមវិធីទូទាត់:</b>
  • 📱 ស្កេន KHQR: $${d.payByMethod.khqr.toFixed(2)}
  • 💵 សាច់ប្រាក់ (Cash): $${d.payByMethod.cash.toFixed(2)}
  • 🏦 ធនាគារ (Bank): $${d.payByMethod.bank.toFixed(2)}
  ${d.payByMethod.debt > 0 ? `• 📝 ជំពាក់ (Debt): $${d.payByMethod.debt.toFixed(2)}\n` : ''}━━━━━━━━━━━━━━━━━━
${topItemsSection}✨ <i>Mhaly Shop Automated Reporting Bot</i>`;

        const success = await TelegramReporter.sendTelegramMessage(msg);
        if (isManual && window.App && App.showToast) {
            if (success) App.showToast(`បានផ្ញើរបាយការណ៍សរុបថ្ងៃទី ${dateTag} ទៅ Telegram ជោគជ័យ! 🎉`, 'success');
            else App.showToast('មិនអាចផ្ញើរបាយការណ៍បានទេ សូមពិនិត្យការតភ្ជាប់!', 'error');
        }
        return success;
    },

    // 2. Send Monthly Report (Includes daily sequence breakdown)
    sendMonthlyReport: async function(year, month, isManual = false) {
        if (year === undefined || month === undefined) {
            const now = new Date();
            year = now.getFullYear();
            month = now.getMonth();
        }

        const d = TelegramReporter.getMonthlySummaryData(year, month);
        const settings = (window.Storage && Storage.getSettings) ? Storage.getSettings() : {};
        const shopName = settings.shopName || 'Mhaly Shop';
        const monthKh = TelegramReporter.khmerMonths[month];

        let dailyBreakdownSection = '';
        if (d.dailyBreakdown && d.dailyBreakdown.length > 0) {
            dailyBreakdownSection = `📅 <b>តារាងលក់តាមលំដាប់ថ្ងៃ (Daily Sequence):</b>\n${d.dailyBreakdown.join('\n')}\n━━━━━━━━━━━━━━━━━━\n`;
        }

        const msg = 
`🏆 <b>របាយការណ៍សរុបប្រចាំខែ (${shopName})</b>
━━━━━━━━━━━━━━━━━━
📅 <b>ប្រចាំខែ:</b> ខែ ${monthKh} ឆ្នាំ ${year}
⏰ <b>ពេលវេលា:</b> ${new Date().toLocaleDateString('km-KH')} ${isManual ? '(ចុចផ្ញើដោយដៃ)' : '(ស្វ័យប្រវត្តចុងខែ)'}
━━━━━━━━━━━━━━━━━━
🧾 <b>វិក្កយបត្រសរុប:</b> <b>${d.invoiceCount}</b> វិក្កយបត្រ
📦 <b>ទំនិញលក់បានសរុប:</b> <b>${d.itemsCount}</b> មុខ
━━━━━━━━━━━━━━━━━━
💰 <b>ចំណូលលក់សរុប:</b> <b>$${d.totalRevenue.toFixed(2)}</b> (${d.totalRevenueKhr.toLocaleString()} ៛)
💵 <b>ថ្លៃដើមទំនិញសរុប:</b> <b>$${d.totalCost.toFixed(2)}</b>
📈 <b>ប្រាក់ចំណេញដុលសរុប:</b> <b>+$${d.totalProfit.toFixed(2)}</b> (${d.margin}%)
${d.totalExpenses > 0 ? `💸 <b>ចំណាយសរុបប្រចាំខែ:</b> -$${d.totalExpenses.toFixed(2)}\n` : ''}💎 <b>ចំណេញសុទ្ធប្រចាំខែ:</b> <b>${d.netProfit >= 0 ? '+' : ''}$${d.netProfit.toFixed(2)}</b>
━━━━━━━━━━━━━━━━━━
📊 <b>មធ្យមភាគលក់:</b> ~$${d.avgPerDay.toFixed(2)} / ថ្ងៃ
━━━━━━━━━━━━━━━━━━
${dailyBreakdownSection}✨ <i>Mhaly Shop Automated Reporting Bot</i>`;

        const success = await TelegramReporter.sendTelegramMessage(msg);
        if (isManual && window.App && App.showToast) {
            if (success) App.showToast(`បានផ្ញើរបាយការណ៍ប្រចាំខែ ${monthKh} ទៅ Telegram ជោគជ័យ! 🎉`, 'success');
            else App.showToast('មិនអាចផ្ញើរបាយការណ៍បានទេ សូមពិនិត្យការតភ្ជាប់!', 'error');
        }
        return success;
    },

    // 3. Send Yearly Report
    sendYearlyReport: async function(year, isManual = false) {
        if (!year) year = new Date().getFullYear();

        const d = TelegramReporter.getYearlySummaryData(year);
        const settings = (window.Storage && Storage.getSettings) ? Storage.getSettings() : {};
        const shopName = settings.shopName || 'Mhaly Shop';

        const msg = 
`🎆 <b>របាយការណ៍សរុបប្រចាំឆ្នាំ (${shopName})</b>
━━━━━━━━━━━━━━━━━━
📅 <b>ប្រចាំឆ្នាំ:</b> <b>${year}</b>
⏰ <b>ពេលវេលា:</b> ${new Date().toLocaleDateString('km-KH')} ${isManual ? '(ចុចផ្ញើដោយដៃ)' : '(ស្វ័យប្រវត្តដាច់ឆ្នាំ)'}
━━━━━━━━━━━━━━━━━━
🧾 <b>វិក្កយបត្រសរុបពេញមួយឆ្នាំ:</b> <b>${d.invoiceCount}</b> វិក្កយបត្រ
📦 <b>ទំនិញលក់បានសរុប:</b> <b>${d.itemsCount}</b> មុខ
━━━━━━━━━━━━━━━━━━
💰 <b>ចំណូលលក់សរុប:</b> <b>$${d.totalRevenue.toFixed(2)}</b> (${d.totalRevenueKhr.toLocaleString()} ៛)
💵 <b>ថ្លៃដើមទំនិញសរុប:</b> <b>$${d.totalCost.toFixed(2)}</b>
📈 <b>ប្រាក់ចំណេញដុលសរុប:</b> <b>+$${d.totalProfit.toFixed(2)}</b> (${d.margin}%)
${d.totalExpenses > 0 ? `💸 <b>ចំណាយប្រតិបត្តិការសរុប:</b> -$${d.totalExpenses.toFixed(2)}\n` : ''}💎 <b>ប្រាក់ចំណេញសុទ្ធពេញមួយឆ្នាំ:</b> <b>${d.netProfit >= 0 ? '+' : ''}$${d.netProfit.toFixed(2)}</b>
━━━━━━━━━━━━━━━━━━
🎉 <i>សូមអបអរសាទរជោគជ័យពេញមួយឆ្នាំ និងរីករាយឆ្នាំថ្មី! 🚀</i>
✨ <i>Mhaly Shop Automated Reporting Bot</i>`;

        const success = await TelegramReporter.sendTelegramMessage(msg);
        if (isManual && window.App && App.showToast) {
            if (success) App.showToast(`បានផ្ញើរបាយការណ៍ប្រចាំឆ្នាំ ${year} ទៅ Telegram ជោគជ័យ! 🎉`, 'success');
            else App.showToast('មិនអាចផ្ញើរបាយការណ៍បានទេ សូមពិនិត្យការតភ្ជាប់!', 'error');
        }
        return success;
    }
};

// Auto start when DOM is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        TelegramReporter.init();
    });
}
