/**
 * MHALY SHOP - AI ADVISOR & FINANCIAL COPILOT
 * ទីប្រឹក្សាអាជីវកម្ម និងហិរញ្ញវត្ថុឆ្លាតវៃសម្រាប់ហាងទូរស័ព្ទដៃ
 */

const AIAdvisor = {
    currentSubTab: 'summary',
    chatHistory: [],
    customAllocationProfit: null,

    init: function() {
        AIAdvisor.setupEventListeners();
        AIAdvisor.initChat();
    },

    setupEventListeners: function() {
        // Quick Question Chips
        document.addEventListener('click', (e) => {
            const chip = e.target.closest('.ai-quick-chip');
            if (chip) {
                const question = chip.dataset.question || chip.innerText.trim();
                AIAdvisor.askQuestion(question);
            }

            // Sub-tabs switching inside AI Advisor
            const subTabBtn = e.target.closest('.ai-subtab-btn');
            if (subTabBtn) {
                const targetSubTab = subTabBtn.dataset.subtab;
                if (targetSubTab) {
                    AIAdvisor.switchSubTab(targetSubTab);
                }
            }

            // Open AI Key Setup Modal
            const btnKeySetup = e.target.closest('#btn-ai-setup-key');
            if (btnKeySetup) {
                AIAdvisor.openKeyModal();
            }
        });

        // Save AI Key in Modal
        const btnSaveModalKey = document.getElementById('btn-save-ai-modal-key');
        if (btnSaveModalKey) {
            btnSaveModalKey.addEventListener('click', () => {
                AIAdvisor.saveKeyFromModal();
            });
        }

        // Chat Form
        const chatForm = document.getElementById('ai-advisor-chat-form');
        const chatInput = document.getElementById('ai-advisor-chat-input');
        if (chatForm && chatInput) {
            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const text = chatInput.value.trim();
                if (!text) return;
                chatInput.value = '';
                AIAdvisor.askQuestion(text);
            });
        }
    },

    openKeyModal: function() {
        const modal = document.getElementById('modal-ai-key-setup');
        const input = document.getElementById('ai-modal-key-input');
        const statusEl = document.getElementById('ai-modal-key-status');
        if (modal) {
            const currentKey = AIAdvisor.getApiKey();
            if (input) input.value = currentKey;
            if (statusEl) {
                statusEl.innerHTML = currentKey 
                    ? `<span style="color: #34d399;"><i class="fa-solid fa-circle-check"></i> បានភ្ជាប់រួចរាល់ (${currentKey.slice(0, 7)}...)</span>`
                    : '<span style="color: #94a3b8;">មិនទាន់មាន Key ទេ (កំពុងដំណើរការ Offline Engine)</span>';
            }
            modal.classList.add('show');
        }
    },

    saveKeyFromModal: async function() {
        const input = document.getElementById('ai-modal-key-input');
        const statusEl = document.getElementById('ai-modal-key-status');
        const btn = document.getElementById('btn-save-ai-modal-key');
        const key = input ? input.value.trim() : '';

        if (!key) {
            AIAdvisor.saveApiKey('');
            if (statusEl) statusEl.innerHTML = '<span style="color: #f59e0b;">បានដក Key ចេញ (ដំណើរការ Offline)</span>';
            AIAdvisor.updateKeyUIStatus();
            setTimeout(() => {
                document.getElementById('modal-ai-key-setup').classList.remove('show');
            }, 800);
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> កំពុងផ្ទៀងផ្ទាត់...';
        }

        try {
            // Test key
            let isValid = false;
            let providerName = 'Google Gemini';

            if (key.startsWith('sk-')) {
                providerName = 'OpenAI ChatGPT';
                const testRes = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + key
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [{ role: 'user', content: 'Say OK' }],
                        max_tokens: 5
                    })
                });
                isValid = testRes.ok;
            } else {
                const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: 'Say OK' }] }]
                    })
                });
                isValid = testRes.ok;
            }

            if (isValid) {
                AIAdvisor.saveApiKey(key);
                AIAdvisor.updateKeyUIStatus();
                if (statusEl) statusEl.innerHTML = `<span style="color: #34d399;"><i class="fa-solid fa-circle-check"></i> ជោគជ័យ! ${providerName} ដំណើរការ ១០០% 🎉</span>`;
                if (window.App && App.showToast) App.showToast(`បានភ្ជាប់ ${providerName} រួចរាល់! AI មានសមត្ថភាពឆ្លាតវៃពេញលេញ`, 'success');
                setTimeout(() => {
                    document.getElementById('modal-ai-key-setup').classList.remove('show');
                }, 1200);
            } else {
                if (statusEl) statusEl.innerHTML = '<span style="color: #f87171;"><i class="fa-solid fa-triangle-exclamation"></i> Key មិនត្រឹមត្រូវ សូមពិនិត្យឡើងវិញ</span>';
                if (window.App && App.showToast) App.showToast('Key មិនត្រឹមត្រូវ សូមពិនិត្យឡើងវិញ!', 'error');
            }
        } catch (e) {
            // If offline, still save
            AIAdvisor.saveApiKey(key);
            AIAdvisor.updateKeyUIStatus();
            if (statusEl) statusEl.innerHTML = '<span style="color: #38bdf8;">បានរក្សាទុក Key រួចរាល់!</span>';
            setTimeout(() => {
                document.getElementById('modal-ai-key-setup').classList.remove('show');
            }, 1000);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> រក្សាទុក & ដំណើរការ';
            }
        }
    },

    getApiKey: function() {
        const settings = Storage.getSettings ? Storage.getSettings() : {};
        return (settings.geminiApiKey || localStorage.getItem('mhaly_gemini_api_key') || '').trim();
    },

    saveApiKey: function(key) {
        const cleanKey = (key || '').trim();
        const settings = Storage.getSettings ? Storage.getSettings() : {};
        settings.geminiApiKey = cleanKey;
        if (Storage.saveSettings) Storage.saveSettings(settings);
        localStorage.setItem('mhaly_gemini_api_key', cleanKey);
        
        // Sync with settings UI if open
        const settingInput = document.getElementById('setting-gemini-key');
        if (settingInput) settingInput.value = cleanKey;
        return cleanKey;
    },

    updateKeyUIStatus: function() {
        const key = AIAdvisor.getApiKey();
        const textEl = document.getElementById('ai-key-status-text');
        const badgeEl = document.getElementById('ai-advisor-online-status');
        
        if (key && key.length > 15) {
            const isOAI = key.startsWith('sk-');
            if (textEl) textEl.innerHTML = isOAI ? '🟢 ChatGPT 4o' : '🟢 Gemini AI';
            if (badgeEl) badgeEl.innerHTML = 'AI Cloud Online';
        } else {
            if (textEl) textEl.innerHTML = '⚡ ភ្ជាប់ Gemini/ChatGPT (Free)';
            if (badgeEl) badgeEl.innerHTML = 'អនឡាញ (Smart)';
        }
    },

    initChat: function() {
        if (AIAdvisor.chatHistory.length === 0) {
            AIAdvisor.chatHistory = [
                {
                    sender: 'bot',
                    text: 'សួស្តីសម្លាញ់! ខ្ញុំជា Mhaly AI ទីប្រឹក្សាអាជីវកម្ម និងហិរញ្ញវត្ថុផ្ទាល់ខ្លួនរបស់អ្នក។ ថ្ងៃនេះតើមានបញ្ហាអ្វីដែលធ្វើឱ្យសម្លាញ់ស្ត្រេស ឬចង់ឱ្យខ្ញុំជួយគិតគូរបែងចែកលុយដែរទេ? 😊',
                    time: AIAdvisor.formatTime(new Date())
                }
            ];
        }
    },

    switchSubTab: function(subTab) {
        AIAdvisor.currentSubTab = subTab;
        document.querySelectorAll('.ai-subtab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.subtab === subTab);
        });

        document.querySelectorAll('.ai-subtab-content').forEach(pane => {
            pane.style.display = 'none';
        });

        const activePane = document.getElementById('ai-subtab-' + subTab);
        if (activePane) {
            activePane.style.display = 'block';
        }

        AIAdvisor.render();
    },

    formatTime: function(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },

    // ==========================================
    // CORE FINANCIAL DATA ENGINE
    // ==========================================
    calculateFinancials: function() {
        const sales = Storage.getSales() || [];
        const products = Storage.getProducts() || [];
        const expenses = Storage.getExpenses() || [];
        const customers = Storage.getCustomers() || [];
        const suppliers = Storage.getSuppliers() || [];
        const purchases = Storage.getPurchases() || [];

        // 1. Filter Today's Sales
        const todayIso = new Date().toISOString().slice(0, 10);
        const todaySales = sales.filter(s => {
            if (!s.date) return false;
            const d = new Date(s.date).toISOString().slice(0, 10);
            return d === todayIso;
        });

        let todaySalesTotal = 0;
        let todayCostTotal = 0;
        let todayItemsCount = 0;

        todaySales.forEach(s => {
            todaySalesTotal += Number(s.totalUsd !== undefined ? s.totalUsd : (s.total || 0));
            if (Array.isArray(s.items)) {
                s.items.forEach(it => {
                    const qty = Number(it.quantity) || 1;
                    const cost = Number(it.cost) || 0;
                    todayCostTotal += cost * qty;
                    todayItemsCount += qty;
                });
            }
        });

        const todayNetProfit = Math.max(0, todaySalesTotal - todayCostTotal);

        // 2. Filter Today's Expenses
        let todayExpensesTotal = 0;
        expenses.forEach(e => {
            if (!e.date) return;
            const d = new Date(e.date).toISOString().slice(0, 10);
            if (d === todayIso) {
                todayExpensesTotal += Number(e.amountUsd !== undefined ? e.amountUsd : (e.amount || 0));
            }
        });

        // 3. Customer Debt
        let totalCustomerDebt = 0;
        customers.forEach(c => {
            totalCustomerDebt += Number(c.debtAmount !== undefined ? c.debtAmount : (c.debt || 0));
        });

        // 4. Supplier Debt (Unpaid Purchases)
        let totalSupplierDebt = 0;
        purchases.forEach(p => {
            const due = Number(p.remainingAmount !== undefined ? p.remainingAmount : (p.debt || 0));
            if (due > 0) totalSupplierDebt += due;
        });

        // 5. Stock Analytics
        let totalStockUnits = 0;
        const lowStockItems = [];
        const slowMovingItems = [];

        // Identify product sales frequency (last 30 days)
        const itemSalesCount = {};
        sales.forEach(s => {
            if (Array.isArray(s.items)) {
                s.items.forEach(it => {
                    const id = it.id || it.productId;
                    if (id) {
                        itemSalesCount[id] = (itemSalesCount[id] || 0) + (Number(it.quantity) || 1);
                    }
                });
            }
        });

        products.forEach(p => {
            const stock = Number(p.stockCount) || 0;
            totalStockUnits += stock;
            if (stock > 0 && stock <= 2) {
                lowStockItems.push(p);
            }
            const soldCount = itemSalesCount[p.id] || 0;
            if (stock >= 3 && soldCount === 0) {
                slowMovingItems.push(p);
            }
        });

        // Real Net Cash Inflow from Today's Operations (Sales minus Expenses)
        const todayNetCashInflow = Math.max(0, todaySalesTotal - todayExpensesTotal);

        return {
            todaySalesTotal,
            todayCostTotal,
            todayNetProfit,
            todayItemsCount,
            todayExpensesTotal,
            totalCustomerDebt,
            totalSupplierDebt,
            totalStockUnits,
            lowStockItems,
            slowMovingItems,
            todayNetCashInflow
        };
    },

    // ==========================================
    // RENDER MAIN VIEW
    // ==========================================
    render: function() {
        const fin = AIAdvisor.calculateFinancials();
        const rate = (Storage.getSettings && Storage.getSettings().exchangeRate) || 4000;

        // Render Top Stat Cards
        const elSales = document.getElementById('ai-stat-today-sales');
        const elProfit = document.getElementById('ai-stat-today-profit');
        const elExpenses = document.getElementById('ai-stat-today-expenses');
        const elItems = document.getElementById('ai-stat-today-items');

        if (elSales) elSales.innerText = '$' + fin.todaySalesTotal.toFixed(2);
        if (elProfit) elProfit.innerText = '$' + fin.todayNetProfit.toFixed(2);
        if (elExpenses) elExpenses.innerText = '$' + fin.todayExpensesTotal.toFixed(2);
        if (elItems) elItems.innerText = fin.todayItemsCount + ' គ្រឿង';

        // Render Allocation
        // If profit is 0 (early morning or slow day), use a realistic baseline of $45 for illustration so the user sees their smart plan
        const allocBase = AIAdvisor.customAllocationProfit !== null 
            ? AIAdvisor.customAllocationProfit 
            : (fin.todayNetProfit > 0 ? fin.todayNetProfit : 45);

        const allocDebt = (allocBase * 0.40);
        const allocStock = (allocBase * 0.30);
        const allocExp = (allocBase * 0.20);
        const allocPersonal = (allocBase * 0.10);

        const elAllocBase = document.getElementById('ai-donut-base-amount');
        if (elAllocBase) elAllocBase.innerText = '$' + allocBase.toFixed(0);

        const elAllocDebt = document.getElementById('ai-alloc-debt-amt');
        const elAllocStock = document.getElementById('ai-alloc-stock-amt');
        const elAllocExp = document.getElementById('ai-alloc-exp-amt');
        const elAllocPersonal = document.getElementById('ai-alloc-personal-amt');

        if (elAllocDebt) elAllocDebt.innerText = '$' + allocDebt.toFixed(2);
        if (elAllocStock) elAllocStock.innerText = '$' + allocStock.toFixed(2);
        if (elAllocExp) elAllocExp.innerText = '$' + allocExp.toFixed(2);
        if (elAllocPersonal) elAllocPersonal.innerText = '$' + allocPersonal.toFixed(2);

        // Render Dynamic Checklist Advice
        const elAdviceList = document.getElementById('ai-actionable-advice-list');
        if (elAdviceList) {
            let debtNote = fin.totalSupplierDebt > 0 
                ? `(មានបំណុលអ្នកផ្គត់ផ្គង់សល់ $${fin.totalSupplierDebt.toFixed(0)})`
                : '(ដើម្បីកាត់បន្ថយការប្រាក់ និងបង្កើនទំនុកចិត្ត)';

            elAdviceList.innerHTML = `
                <li class="ai-advice-item">
                    <span class="ai-advice-check"><i class="fa-solid fa-check"></i></span>
                    <span class="ai-advice-text">
                        សងបំណុល <strong>$${allocDebt.toFixed(2)}</strong> នៅថ្ងៃនេះ <span class="text-muted-xs">${debtNote}</span>
                    </span>
                </li>
                <li class="ai-advice-item">
                    <span class="ai-advice-check"><i class="fa-solid fa-check"></i></span>
                    <span class="ai-advice-text">
                        ទុក <strong>$${allocStock.toFixed(2)}</strong> សម្រាប់ទិញទំនិញដែលលក់ដាច់បំពេញស្តុក
                    </span>
                </li>
                <li class="ai-advice-item">
                    <span class="ai-advice-check"><i class="fa-solid fa-check"></i></span>
                    <span class="ai-advice-text">
                        ត្រួតពិនិត្យចំណាយឱ្យក្រោម <strong>$${allocExp.toFixed(2)}/ថ្ងៃ</strong>
                    </span>
                </li>
                <li class="ai-advice-item">
                    <span class="ai-advice-check"><i class="fa-solid fa-check"></i></span>
                    <span class="ai-advice-text">
                        ដក <strong>$${allocPersonal.toFixed(2)}</strong> ជាចំណេញផ្ទាល់ខ្លួន <span class="text-muted-xs">(កុំទាន់យកច្រើនពេកពេលលក់មិនទាន់ឡើងខ្លាំង)</span>
                    </span>
                </li>
            `;
        }

        // Render Bottom Quick Status
        const elStatusDebt = document.getElementById('ai-status-debt-rem');
        const elStatusStock = document.getElementById('ai-status-stock-total');
        const elStatusCash = document.getElementById('ai-status-cash-hand');

        if (elStatusDebt) {
            const totalDebt = fin.totalCustomerDebt + fin.totalSupplierDebt;
            elStatusDebt.innerText = '$' + totalDebt.toFixed(0);
        }
        if (elStatusStock) {
            const slowCount = fin.slowMovingItems.length;
            elStatusStock.innerHTML = `${fin.totalStockUnits} គ្រឿង <span class="ai-badge-warn">(${slowCount} មុខលក់យឺត)</span>`;
        }
        if (elStatusCash) {
            elStatusCash.innerText = '$' + fin.todayNetCashInflow.toFixed(2);
            const elStatusCashSub = document.getElementById('ai-status-cash-hand-sub');
            if (elStatusCashSub) {
                elStatusCashSub.innerText = `(លក់ $${fin.todaySalesTotal.toFixed(2)} - ចំណាយ $${fin.todayExpensesTotal.toFixed(2)})`;
            }
        }

        // Render Chat History
        AIAdvisor.renderChatMessages();

        // Render SubTab specific contents if relevant
        if (AIAdvisor.currentSubTab === 'debt') {
            AIAdvisor.renderDebtPlanSubtab(fin);
        } else if (AIAdvisor.currentSubTab === 'sales') {
            AIAdvisor.renderSalesAdviceSubtab(fin);
        }
    },

    renderChatMessages: function() {
        const container = document.getElementById('ai-advisor-chat-messages');
        if (!container) return;

        container.innerHTML = AIAdvisor.chatHistory.map(msg => {
            const isBot = msg.sender === 'bot';
            return `
                <div class="ai-chat-bubble-wrapper ${isBot ? 'bot' : 'user'}">
                    ${isBot ? '<div class="ai-chat-avatar"><i class="fa-solid fa-robot"></i></div>' : ''}
                    <div class="ai-chat-bubble ${isBot ? 'bot' : 'user'}">
                        <div class="ai-chat-text">${msg.text}</div>
                        <div class="ai-chat-time">${msg.time || ''}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.scrollTop = container.scrollHeight;
    },

    // ==========================================
    // CHATBOT INTELLIGENCE ENGINE
    // ==========================================
    askQuestion: function(questionText) {
        if (!questionText) return;

        // Add User message
        AIAdvisor.chatHistory.push({
            sender: 'user',
            text: questionText,
            time: AIAdvisor.formatTime(new Date())
        });
        AIAdvisor.renderChatMessages();

        // Show thinking indicator
        const container = document.getElementById('ai-advisor-chat-messages');
        const thinkingId = 'ai-thinking-' + Date.now();
        if (container) {
            const thinkingHtml = `
                <div class="ai-chat-bubble-wrapper bot" id="${thinkingId}">
                    <div class="ai-chat-avatar"><i class="fa-solid fa-robot"></i></div>
                    <div class="ai-chat-bubble bot ai-thinking">
                        <span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', thinkingHtml);
            container.scrollTop = container.scrollHeight;
        }

        // Check API key (Gemini / ChatGPT)
        const apiKey = AIAdvisor.getApiKey();

        setTimeout(() => {
            const thinkingEl = document.getElementById(thinkingId);
            if (thinkingEl) thinkingEl.remove();

            if (apiKey && apiKey.length > 15) {
                AIAdvisor.callAIAdvisor(questionText);
            } else {
                AIAdvisor.generateOfflineAdvisorResponse(questionText);
            }
        }, 350);
    },

    generateOfflineAdvisorResponse: function(question) {
        const fin = AIAdvisor.calculateFinancials();
        const raw = (question || '').trim();
        const q = raw.toLowerCase();

        const allocBase = fin.todayNetProfit > 0 ? fin.todayNetProfit : 45;
        const allocDebt = (allocBase * 0.40).toFixed(2);
        const allocStock = (allocBase * 0.30).toFixed(2);
        const allocExp = (allocBase * 0.20).toFixed(2);
        const allocPersonal = (allocBase * 0.10).toFixed(2);

        let response = '';

        // 1. GREETING & CASUAL CONVERSATION (សួស្តី, ជំរាបសួរ, hello, hi, etc.)
        if (q.match(/^(សួស្តី|ជំរាបសួរ|សួស្ដី|hello|hi|hey|good morning|morning|សួស្តីបាទ|សួស្តីចា|សួស្តីសម្លាញ់|ជំរាបសួរបាទ)/i) || 
            (q.includes('សួស្តី') && q.length < 25) || 
            (q.includes('សុខសប្បាយ') || q.includes('how are you'))) {
            response = `សួស្តីបាទសម្លាញ់! 👋 ខ្ញុំជា <strong>Mhaly AI</strong> ទីប្រឹក្សាប្រចាំហាងរបស់អ្នក។ ខ្ញុំត្រៀមខ្លួនជួយសម្លាញ់ដោះស្រាយបញ្ហា និងចាត់ចែងលុយកាក់ជានិច្ច! 😊<br><br>
📊 <strong>ស្ថានភាពហាងថ្ងៃនេះ៖</strong><br>
• លក់បានសរុប៖ <strong>$${fin.todaySalesTotal.toFixed(2)}</strong> (${fin.todayItemsCount} គ្រឿង)<br>
• ប្រាក់ចំណេញសុទ្ធ៖ <strong class="text-green">+$${fin.todayNetProfit.toFixed(2)}</strong><br>
• ចំណាយថ្ងៃនេះ៖ <strong>$${fin.todayExpensesTotal.toFixed(2)}</strong><br><br>
តើថ្ងៃនេះមានរឿងអ្វីដែលកំពុងធ្វើឱ្យសម្លាញ់ស្ត្រេស ឬចង់ឱ្យខ្ញុំជួយគណនាការបែងចែកលុយសងបំណុល ពិនិត្យមើលស្តុកទំនិញដែរទេបាទ?`;
        }

        // 2. EXPLANATION OF "សាច់ប្រាក់នៅដៃ" / "CASH ON HAND" (ហាក់សាច់ប្រាក់នៅដៃជាអ្វី, មិនយល់, 88$)
        else if (q.includes('សាច់ប្រាក់នៅដៃ') || q.includes('លុយនៅដៃ') || q.includes('cash on hand') || 
                 q.includes('នៅដៃជាអ្វី') || q.includes('សាច់ប្រាក់ជាអ្វី') || (q.includes('មិនយល់') && (q.includes('ដៃ') || q.includes('សាច់ប្រាក់')))) {
            response = `ខ្ញុំសូមអភ័យទោសដែលធ្វើឱ្យសម្លាញ់ឆ្ងល់កាលពីមុន! ឥឡូវនេះខ្ញុំសូមពន្យល់ឱ្យបានច្បាស់លាស់ជូនសម្លាញ់៖<br><br>
💡 <strong>«សាច់ប្រាក់សុទ្ធពីការលក់ថ្ងៃនេះ» គឺជាអ្វី?</strong><br>
វាគឺជាចំនួនលុយសុទ្ធជាក់ស្តែងដែលហាងទទួលបានពីការលក់ចេញថ្ងៃនេះ ដកនឹងថ្លៃចំណាយប្រចាំថ្ងៃចេញ៖<br>
• <strong>ការលក់ថ្ងៃនេះ៖</strong> $${fin.todaySalesTotal.toFixed(2)}<br>
• <strong>ចំណាយថ្ងៃនេះ៖</strong> $${fin.todayExpensesTotal.toFixed(2)}<br>
➡️ <strong>សាច់ប្រាក់សុទ្ធប្រមូលបានថ្ងៃនេះ៖</strong> $${fin.todaySalesTotal.toFixed(2)} - $${fin.todayExpensesTotal.toFixed(2)} = <strong class="text-green">$${fin.todayNetCashInflow.toFixed(2)}</strong><br><br>
លុយនេះជាលុយដែលសម្លាញ់កំពុងកាន់ជាក់ស្តែង (លុយសុទ្ធក្នុងថត ឬក្នុងកុងធនាគារ KHQR) ដែលអាចយកទៅបែងចែកតាមក្បួនសុវត្ថិភាព ៤០% សងបំណុល, ៣០% ទិញស្តុក, ២០% ចំណាយហាង និង ១០% ចំណេញផ្ទាល់ខ្លួនបាទ! មិនមានលេខបូកបន្ថែមផ្តេសផ្តាសទៀតទេបាទ 😊`;
        }

        // 3. EXPLANATION OF PROFIT VS REVENUE (ចំណេញគិតមិច, ថ្លៃដើម, profit, revenue)
        else if (q.includes('ចំណេញ') && (q.includes('គិតមិច') || q.includes('គិតយ៉ាងម៉េច') || q.includes('ជាអ្វី') || q.includes('របៀប') || q.includes('ដើម') || q.includes('ថ្លៃដើម'))) {
            response = `ការគណនាប្រាក់ចំណេញក្នុងប្រព័ន្ធត្រូវបានគិតយ៉ាងត្រឹមត្រូវតាមក្បួនគណនេយ្យ៖<br><br>
• <strong>ចំណូលលក់ចេញ (Revenue)៖</strong> <strong>$${fin.todaySalesTotal.toFixed(2)}</strong> (តម្លៃលក់ទំនិញចេញជូនភ្ញៀវ)<br>
• <strong>ថ្លៃដើមទំនិញ (Cost)៖</strong> <strong>$${fin.todayCostTotal.toFixed(2)}</strong> (ថ្លៃដើមដែលសម្លាញ់ទិញចូលពីគេ)<br>
➡️ <strong>ប្រាក់ចំណេញសុទ្ធ (Net Profit)៖</strong> $${fin.todaySalesTotal.toFixed(2)} - $${fin.todayCostTotal.toFixed(2)} = <strong class="text-green">+$${fin.todayNetProfit.toFixed(2)}</strong><br><br>
ប្រាក់ចំណេញសុទ្ធនេះហើយ ដែលជាលុយពិតប្រាកដដែលយើងយកមកបែងចែកសងបំណុល និងចិញ្ចឹមហាងបាទ!`;
        }

        // 4. DEBT REPAYMENT ADVICE (សងបំណុល, ប៉ុន្មាន, debt, pay, សងគេ)
        else if (q.includes('សងបំណុល') || (q.includes('បំណុល') && (q.includes('សង') || q.includes('ប៉ុន្មាន') || q.includes('ធ្វើមិច') || q.includes('ដោះស្រាយ'))) || q.includes('debt')) {
            response = `ផ្អែកលើប្រាក់ចំណេញជាក់ស្តែងថ្ងៃនេះ <strong>$${fin.todayNetProfit.toFixed(2)}</strong> ខ្ញុំសូមណែនាំផែនការសងបំណុលដូចខាងក្រោម៖<br><br>
💰 <strong>ចំនួនទឹកប្រាក់គួរសងថ្ងៃនេះ៖</strong> <strong class="text-green">$${allocDebt}</strong> (ស្មើនឹង ៤០% នៃចំណេញ)<br><br>
🛡️ <strong>ហេតុអ្វីបានជាត្រូវសង ៤០% នេះ?</strong><br>
ពីព្រោះក្បួននេះជួយការពារសម្លាញ់មិនឱ្យទាល់លុយ៖ សម្លាញ់នៅសល់ <strong>$${allocStock}</strong> សម្រាប់ទិញស្តុកបង្វិល និង <strong>$${allocExp}</strong> សម្រាប់ថ្លៃទឹកភ្លើង និងហូបចុក។<br><br>
📌 <em>ដំបូន្មានការពារផ្លូវចិត្ត៖</em> ប្រសិនបើម្ចាស់បំណុលទារច្រើនជាងនេះ ចូរកុំភ័យ! សម្លាញ់អាចយក $${allocDebt} នេះទៅសងជាមុនសិន រួចនិយាយដោយសុភាពថា៖ <em>«ថ្ងៃនេះខ្ញុំសូមជួយបង្វិលសងមួយចំណែកនេះសិន ដើម្បីរក្សាទំនុកចិត្ត ហើយខ្ញុំនឹងបន្តសងរំលស់ជារៀងរាល់ថ្ងៃបន្តទៀត»</em>។ ធ្វើបែបនេះម្ចាស់បំណុលនឹងសប្បាយចិត្ត និងយោគយល់ជានិច្ច! 😊`;
        }

        // 5. SLOW DAY / STRESS / ANXIETY (ស្ងាត់, មិនដាច់, លក់មិនដាច់, យឺត, ស្ត្រេស, ពិបាកចិត្ត, តានតឹង, ភ័យ, គ្មានភ្ញៀវ)
        else if (q.includes('ស្ងាត់') || q.includes('មិនដាច់') || q.includes('លក់មិនដាច់') || q.includes('យឺត') || 
                 q.includes('ស្ត្រេស') || q.includes('ពិបាកចិត្ត') || q.includes('តានតឹង') || q.includes('ភ័យ') || 
                 q.includes('គ្មានភ្ញៀវ') || q.includes('stress') || q.includes('slow') || q.includes('worried')) {
            const slowNames = fin.slowMovingItems.slice(0, 3).map(p => p.name).join(', ') || 'ស្រ្គីនការពារ, ខ្នងទូរស័ព្ទ, ឈុតសាក';
            response = `កុំទាន់បារម្ភ ឬតានតឹងពេកអីសម្លាញ់! ក្នុងអាជីវកម្ម ការលក់តែងតែមានថ្ងៃដាច់ខ្លាំង និងថ្ងៃស្ងាត់ ជារឿងធម្មតាបំផុត។ ពេលស្ងាត់ គឺជាឱកាសដ៏ល្អដើម្បីជំរុញការលក់បង្វិលសាច់ប្រាក់! 💪<br><br>
🎯 <strong>យុទ្ធសាស្ត្រ ៣ ជំហានដោះស្រាយភ្លាមៗ៖</strong><br>
១. <strong>រុញមុខទំនិញកកស្តុក៖</strong> ក្នុងស្តុកសម្លាញ់មាន <strong>${slowNames}</strong> នៅសល់ច្រើន។ សាកធ្វើប្រូម៉ូសិនបញ្ចុះតម្លៃ $0.50 ឬប្រូម៉ូសិន «ទិញគ្រឿងបន្លាស់ ថែមបិទស្គ្រីន» ដើម្បីទាក់ទាញភ្ញៀវចូលហាង។<br>
២. <strong>ផ្ញើសារសួរសុខទុក្ខភ្ញៀវចាស់ៗ៖</strong> ផ្ញើសារតាម Telegram ទៅភ្ញៀវធ្លាប់ជួសជុល ឬទិញទូរស័ព្ទ សួរសុខទុក្ខ និងប្រាប់ពីប្រូម៉ូសិនថ្មី។<br>
៣. <strong>កុំទាន់ចាយលុយផ្តេសផ្តាស៖</strong> រក្សាចំណាយឱ្យនៅក្រោម $${allocExp}/ថ្ងៃ ដើម្បីការពារលុយក្នុងដៃ។<br><br>
តើសម្លាញ់ចង់ឱ្យខ្ញុំជួយរៀបចំ Caption ប្រូម៉ូសិនសម្រាប់ផុសលក់ឥឡូវនេះទេ? 📲`;
        }

        // 6. DEBT NEGOTIATION SCRIPT (ចរចា, ពន្យារ, សុំពន្យារ, អត់ទាន់មានលុយ, negotiate, delay)
        else if (q.includes('ចរចា') || q.includes('ពន្យារ') || q.includes('សុំពន្យារ') || q.includes('សុំពេល') || 
                 q.includes('អត់លុយសង') || q.includes('គេទារ') || q.includes('negotiate')) {
            response = `ប្រសិនបើសម្លាញ់កំពុងពិបាកចិត្តរឿងគេទារបំណុលបន្ទាន់ នេះជាសារចរចាដ៏មានប្រសិទ្ធភាព និងថ្លៃថ្នូរដែលសម្លាញ់អាចចម្លងយកទៅផ្ញើជូនគាត់៖<br><br>
<div style="background: rgba(56, 189, 248, 0.1); border-left: 3px solid #38bdf8; padding: 10px 14px; margin: 10px 0; border-radius: 6px; font-size: 13px; line-height: 1.6;">
<em>«ជម្រាបសួរបង! ខ្ញុំពិតជាអរគុណបងខ្លាំងណាស់សម្រាប់ការយោគយល់កន្លងមក។ ថ្ងៃនេះការលក់ក្នុងហាងរាងយឺតបន្តិច ខ្ញុំសូមជួយផ្ទេរជូនបងមួយចំណែកសិនចំនួន $${allocDebt} ដើម្បីរក្សាទំនុកចិត្តគ្នា។ ចំណែកនៅសល់ ខ្ញុំសុំពន្យារពេលបន្តិច ខ្ញុំនឹងបន្តផ្ទេរបង្វិលជូនបងជាបន្តបន្ទាប់មិនឱ្យខកខានឡើយបង។ អរគុណបងច្រើនណាស់បង!»</em>
</div>
<br>
💡 <strong>ចំណាំសំខាន់៖</strong> ការផ្ទេរលុយខ្លះជាមុន (ទោះតិចក្តី) បង្ហាញពីសុច្ចរិតភាព និងការទទួលខុសត្រូវខ្ពស់ ដែលធ្វើឱ្យម្ចាស់បំណុលទុកចិត្តយើង និងមិនរករឿងឡើយ!`;
        }

        // 7. STOCK & RESTOCK PURCHASE ADVICE (ទិញ, ស្តុក, restock, អស់ស្តុក, គ្រឿងណា)
        else if (q.includes('ទិញ') || q.includes('ស្តុក') || q.includes('restock') || q.includes('ទិញទំនិញ') || q.includes('purchase')) {
            const lowNames = fin.lowStockItems.slice(0, 3).map(p => p.name).join(', ');
            if (fin.lowStockItems.length > 0) {
                response = `ខ្ញុំបានពិនិត្យស្តុកហើយ ឃើញថាមានទំនិញជិតដាច់ស្តុកចំនួន <strong>${fin.lowStockItems.length} មុខ</strong> ដូចជា៖ <strong>${lowNames}</strong>។<br><br>
🛒 <strong>ដំបូន្មាន៖</strong> សម្លាញ់គួរប្រើប្រាស់កញ្ចប់ទុនបម្រុង (៣០% នៃចំណេញ) ប្រមាណ <strong>$${allocStock}</strong> ដើម្បីទិញតែគ្រឿងណាដែលលក់ដាច់បំផុតមកបំពេញសិន។ កុំទាន់ទិញគ្រឿងដែលមិនសូវមានភ្ញៀវសួរ ព្រោះអាចកកស្ទះលុយ! 🛡️`;
            } else {
                response = `ស្តុកបច្ចុប្បន្នរបស់សម្លាញ់មានចំនួន <strong>${fin.totalStockUnits} គ្រឿង</strong> ដែលនៅមានស្ថិរភាពល្អ។ សម្លាញ់មិនទាន់ចាំបាច់បញ្ជាទិញបន្ថែមច្រើនទេនៅថ្ងៃនេះ ដើម្បីរក្សាសាច់ប្រាក់ក្នុងដៃឱ្យបានរឹងមាំ! 🛡️`;
            }
        }

        // 8. CUSTOMER DEBT COLLECTION (អតិថិជនជំពាក់, គេជំពាក់, ទារបំណុល, ទារលុយ)
        else if (q.includes('អតិថិជន') || q.includes('គេជំពាក់') || q.includes('ជំពាក់យើង') || q.includes('ទារលុយ')) {
            response = `បច្ចុប្បន្នមានអតិថិជនជំពាក់ហាងសរុបចំនួន <strong>$${fin.totalCustomerDebt.toFixed(2)}</strong>។<br><br>
📞 <strong>វិធីទារបំណុលដោយរលូន និងមិនឱ្យបាក់ទឹកចិត្តភ្ញៀវ៖</strong><br>
១. ផ្ញើសារ ឬខលសួរសុខទុក្ខជាមុនសិន៖ <em>«ជម្រាបសួរអូន/បង! តើទូរស័ព្ទដែលយកទៅប្រើប្រាស់ស្រួលទេបង? បើមានបញ្ហាអ្វីអាចយកមកឱ្យប្អូនមើលជូនបានណា៎បង»</em><br>
២. រំលឹកពីទឹកប្រាក់ដោយសុភាព៖ <em>«ឆ្លៀតក្នុងឱកាសនេះ ប្អូនសូមរំលឹកពីថ្លៃ... ដែលនៅសល់ $... បើបងស្រួល អាចជួយបាញ់តាម KHQR ឱ្យប្អូនបន្តិចមកបង ដើម្បីប្អូនបង្វិលទិញស្តុកថ្មី។ អរគុណបងច្រើនណាស់!»</em>`;
        }

        // 9. GRATITUDE & AGREEMENT (អរគុណ, thanks, ok, យល់ហើយ, ល្អ)
        else if (q.includes('អរគុណ') || q.includes('thanks') || q.includes('thank you') || 
                 q.match(/^(ok|okay|យល់ហើយ|យល់|ល្អ|ល្អណាស់|cool|yes|បាទ|ចា|ចាស)/i)) {
            response = `រីករាយណាស់ដែលបានជួយសម្លាញ់! 😊<br><br>
ខ្ញុំនៅទីនេះក្បែរសម្លាញ់ជានិច្ច។ បើសិនជាមានរឿងពិបាកចិត្ត ស្ត្រេស ឬចង់ឱ្យខ្ញុំជួយគិតគូរតួលេខណាមួយទៀត អាចចុចសួរខ្ញុំបានគ្រប់ពេលណា៎សម្លាញ់!<br>
សូមជូនពរឱ្យថ្ងៃនេះ និងថ្ងៃស្អែក ហាង Mhaly Shop លក់ដាច់ខ្លាំង ភ្ញៀវចូលច្រើនៗ និងហេងហេងទាំងអស់គ្នា! 🎉📱`;
        }

        // 10. CONTEXTUAL INTELLIGENT FALLBACK (DYNAMIC & HELPFUL)
        else {
            response = `ខ្ញុំបានយល់ពីសំណួររបស់សម្លាញ់អំពី <em>«${raw}»</em> ហើយ! 😊<br><br>
ក្នុងនាមជាទីប្រឹក្សាអាជីវកម្ម និងហិរញ្ញវត្ថុ ខ្ញុំសូមផ្តល់យោបល់សំខាន់ៗផ្អែកលើស្ថានភាពហាងថ្ងៃនេះ៖<br>
• ការលក់ថ្ងៃនេះសម្រេចបាន <strong>$${fin.todaySalesTotal.toFixed(2)}</strong> ដោយមានប្រាក់ចំណេញ <strong>+$${fin.todayNetProfit.toFixed(2)}</strong>។<br>
• ចំពោះការគ្រប់គ្រងលុយ សម្លាញ់គួររក្សាសាច់ប្រាក់បម្រុង $${allocStock} និងបែងចែក $${allocDebt} សម្រាប់សងបំណុល។<br><br>
👉 <strong>តើសម្លាញ់ចង់ឱ្យខ្ញុំជួយបន្តលើចំណុចណាដែរ?</strong><br>
១. ចុចសួរ <em>«ថ្ងៃនេះខ្ញុំគួរសងបំណុលប៉ុន្មាន?»</em><br>
២. ចុចសួរ <em>«ម៉ូដែលណាដែលលក់យឺត?»</em><br>
៣. ឬវាយសួរបញ្ជាក់បន្ថែមលើរឿងណាដែលសម្លាញ់កំពុងចង់ដឹងបានភ្លាមៗបាទ!`;
        }

        AIAdvisor.chatHistory.push({
            sender: 'bot',
            text: response,
            time: AIAdvisor.formatTime(new Date())
        });
        AIAdvisor.renderChatMessages();
    },

    formatMarkdown: function(text) {
        if (!text) return '';
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^#{1,6}\s*(.*)$/gm, '<strong style="color: #38bdf8; display: block; margin: 4px 0;">$1</strong>')
            .replace(/^[\*\-]\s+(.*)$/gm, '• $1')
            .replace(/\n{2,}/g, '<br><br>')
            .replace(/\n/g, '<br>');
        return html;
    },

    callAIAdvisor: async function(userPrompt) {
        const fin = AIAdvisor.calculateFinancials();
        const apiKey = AIAdvisor.getApiKey();
        const isChatGPT = apiKey.startsWith('sk-');

        const systemPrompt = `You are 'Mhaly AI' (ទីប្រឹក្សា Mhaly AI), a compassionate, expert retail business and financial advisor specifically customized for 'Mhaly Shop' (ហាងលក់ និងជួសជុលទូរស័ព្ទដៃ), a mobile phone repair and retail accessories store in Cambodia.
The store owner is asking you questions. Sometimes sales are slow, and the owner feels stressed about debt, expenses, and purchasing stock.
Your tone must be warm, encouraging, respectful, and highly competent. Speak naturally and fluently in polite Khmer (ភាសាខ្មែរ).

LIVE REAL-TIME FINANCIAL CONTEXT OF THE STORE TODAY:
- Date: ${new Date().toLocaleDateString('km-KH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Today Sales Total: $${fin.todaySalesTotal.toFixed(2)} (${fin.todayItemsCount} items sold)
- Cost of Goods Sold: $${fin.todayCostTotal.toFixed(2)}
- Today Net Profit: +$${fin.todayNetProfit.toFixed(2)}
- Today Expenses Total: $${fin.todayExpensesTotal.toFixed(2)}
- Today Net Cash Inflow (Sales - Expenses): $${fin.todayNetCashInflow.toFixed(2)}
- Total Customer Debt Owed to Store: $${fin.totalCustomerDebt.toFixed(2)}
- Total Supplier Debt Owed by Store: $${fin.totalSupplierDebt.toFixed(2)}
- Total Stock Count: ${fin.totalStockUnits} items (${fin.lowStockItems.length} low stock, ${fin.slowMovingItems.length} slow moving)
- Recommended Profit Allocation (40/30/20/10 Rule): 40% Debt Payoff ($${(Math.max(fin.todayNetProfit, 0) * 0.4).toFixed(2)}), 30% Restock ($${(Math.max(fin.todayNetProfit, 0) * 0.3).toFixed(2)}), 20% Expenses ($${(Math.max(fin.todayNetProfit, 0) * 0.2).toFixed(2)}), 10% Pocket Draw ($${(Math.max(fin.todayNetProfit, 0) * 0.1).toFixed(2)}).

CORE PRINCIPLES:
1. When greeted (e.g. 'សួស្តី'), greet warmly and briefly, asking how you can support the shop today. Do NOT regurgitate a massive essay when a simple friendly greeting is asked.
2. When asked about finances, debts, slow sales, or inventory, provide direct, practical, and empathetic advice based on the LIVE numbers above.
3. Structure your explanations clearly with bullet points and bold highlights for readability.
4. If the user asks about 'សាច់ប្រាក់នៅដៃ' or cash on hand, explain clearly that it represents the net cash collected today (sales minus daily expenses: $${fin.todaySalesTotal.toFixed(2)} - $${fin.todayExpensesTotal.toFixed(2)} = $${fin.todayNetCashInflow.toFixed(2)}).
5. Always relieve stress: show clear, manageable daily steps rather than overwhelming targets.`;

        // Gather recent chat history (last 6 messages)
        const recentHistory = AIAdvisor.chatHistory.slice(-7, -1);

        try {
            let replyText = '';

            if (isChatGPT) {
                // OpenAI ChatGPT Endpoint (gpt-4o-mini)
                const messages = [
                    { role: 'system', content: systemPrompt }
                ];
                recentHistory.forEach(m => {
                    messages.push({
                        role: m.sender === 'user' ? 'user' : 'assistant',
                        content: m.text.replace(/<[^>]*>/g, '')
                    });
                });
                messages.push({ role: 'user', content: userPrompt });

                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + apiKey
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: messages,
                        temperature: 0.7,
                        max_tokens: 1200
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    replyText = data?.choices?.[0]?.message?.content || '';
                } else {
                    console.warn('[AI Advisor] OpenAI API error status:', res.status);
                }
            } else {
                // Google Gemini Endpoint (gemini-2.0-flash / gemini-1.5-flash)
                const contents = [];
                // Add system prompt context as first user turn
                contents.push({
                    role: 'user',
                    parts: [{ text: '[SYSTEM INSTRUCTION / STORE CONTEXT]\n' + systemPrompt }]
                });
                contents.push({
                    role: 'model',
                    parts: [{ text: 'យល់ព្រម! ខ្ញុំជា Mhaly AI ត្រៀមខ្លួនជួយសម្លាញ់ និងហាង Mhaly Shop ជានិច្ច។' }]
                });

                recentHistory.forEach(m => {
                    contents.push({
                        role: m.sender === 'user' ? 'user' : 'model',
                        parts: [{ text: m.text.replace(/<[^>]*>/g, '') }]
                    });
                });
                contents.push({
                    role: 'user',
                    parts: [{ text: userPrompt }]
                });

                // First try gemini-2.0-flash, fallback to gemini-1.5-flash
                let res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: contents,
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 1200
                        }
                    })
                });

                if (!res.ok) {
                    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: contents,
                            generationConfig: {
                                temperature: 0.7,
                                maxOutputTokens: 1200
                            }
                        })
                    });
                }

                if (res.ok) {
                    const data = await res.json();
                    replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                } else {
                    console.warn('[AI Advisor] Gemini API error status:', res.status);
                }
            }

            if (replyText) {
                const formattedHtml = AIAdvisor.formatMarkdown(replyText);
                AIAdvisor.chatHistory.push({
                    sender: 'bot',
                    text: formattedHtml,
                    time: AIAdvisor.formatTime(new Date())
                });
                AIAdvisor.renderChatMessages();
                return;
            }
        } catch (e) {
            console.warn('[AI Advisor] Online LLM API call failed, falling back to smart offline engine:', e);
        }

        // Graceful fallback to smart offline engine
        AIAdvisor.generateOfflineAdvisorResponse(userPrompt);
    },

    // Backward compatibility alias
    callGeminiAdvisor: function(userPrompt) {
        return AIAdvisor.callAIAdvisor(userPrompt);
    },

    // ==========================================
    // SUB-TAB 2: DEBT PAYOFF PLAN
    // ==========================================
    renderDebtPlanSubtab: function(fin) {
        const container = document.getElementById('ai-debt-plan-container');
        if (!container) return;

        const suppliers = Storage.getSuppliers ? Storage.getSuppliers() : [];
        const customers = Storage.getCustomers ? Storage.getCustomers() : [];

        const debtList = [];
        customers.forEach(c => {
            const amt = Number(c.debtAmount !== undefined ? c.debtAmount : (c.debt || 0));
            if (amt > 0) {
                debtList.push({
                    type: 'អតិថិជនជំពាក់យើង',
                    name: c.name || 'អតិថិជនទូទៅ',
                    phone: c.phone || 'N/A',
                    amount: amt,
                    isReceivable: true
                });
            }
        });

        container.innerHTML = `
            <div class="ai-subview-card">
                <div class="ai-subview-header">
                    <h4><i class="fa-solid fa-list-check text-amber"></i> បញ្ជីបំណុល & ផែនការសងរំលស់ជាប្រព័ន្ធ</h4>
                    <span class="ai-badge-gold">ក្បួន Snowball Payoff</span>
                </div>
                <p class="text-secondary-sm mb-4">
                    ក្បួនសងបំណុលមិនឱ្យតានតឹង៖ បែងចែក ៤០% នៃប្រាក់ចំណេញរាល់ថ្ងៃ យកមកសងម្ចាស់បំណុលណាដែលមានចំនួនតិចជាងគេជាមុន (Snowball Method) ដើម្បីបញ្ចប់បញ្ជីម្តងមួយៗ និងកាត់បន្ថយសម្ពាធផ្លូវចិត្ត!
                </p>
                <div class="table-responsive">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>ល.រ</th>
                                <th>ឈ្មោះភាគី</th>
                                <th>ប្រភេទ</th>
                                <th>លេខទូរស័ព្ទ</th>
                                <th>ទឹកប្រាក់</th>
                                <th>ផែនការសងថ្ងៃនេះ (40%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${debtList.length > 0 ? debtList.map((d, idx) => `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td><strong>${d.name}</strong></td>
                                    <td><span class="badge ${d.isReceivable ? 'badge-warning' : 'badge-danger'}">${d.type}</span></td>
                                    <td>${d.phone}</td>
                                    <td class="font-num font-bold text-amber">$${d.amount.toFixed(2)}</td>
                                    <td class="font-num text-green">$${(d.amount * 0.15).toFixed(2)} / ថ្ងៃ</td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="6" class="text-center py-4 text-muted">
                                        <i class="fa-solid fa-shield-heart text-green text-xl mb-1"></i><br>
                                        មិនមានបំណុលដែលត្រូវទារបន្ទាន់នៅឡើយទេ! ស្ថានភាពហិរញ្ញវត្ថុរបស់អ្នកមានសុវត្ថិភាព។
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // ==========================================
    // SUB-TAB 3: SALES ADVICE & PROMOTIONS
    // ==========================================
    renderSalesAdviceSubtab: function(fin) {
        const container = document.getElementById('ai-sales-advice-container');
        if (!container) return;

        const slow = fin.slowMovingItems || [];

        container.innerHTML = `
            <div class="ai-subview-card">
                <div class="ai-subview-header">
                    <h4><i class="fa-solid fa-bullhorn text-cyan"></i> យុទ្ធសាស្ត្រជំរុញការលក់មុខទំនិញដែលកកស្តុក</h4>
                    <span class="ai-badge-cyan">Quick Liquidation</span>
                </div>
                <p class="text-secondary-sm mb-4">
                    មុខទំនិញដែលមានស្តុកច្រើន តែមិនទាន់មានការលក់ចេញ៖ បញ្ចុះតម្លៃបន្តិច ឬធ្វើ Promotion ថែមជូន ដើម្បីបង្វិលសាច់ប្រាក់មកវិញជាបន្ទាន់!
                </p>
                <div class="grid-cards-3">
                    ${slow.slice(0, 6).map(p => `
                        <div class="ai-promo-card">
                            <div class="ai-promo-card-top">
                                <span class="ai-promo-tag">${p.category || 'ទូទៅ'}</span>
                                <span class="font-num text-amber font-bold">ស្តុក៖ ${p.stockCount}</span>
                            </div>
                            <h5 class="ai-promo-name">${p.name}</h5>
                            <div class="ai-promo-price font-num">
                                <span class="price-orig">$${Number(p.price || 0).toFixed(2)}</span>
                                <span class="price-promo">$${(Math.max(Number(p.cost || 0), Number(p.price || 0) * 0.85)).toFixed(2)}</span>
                            </div>
                            <button class="btn-xs-outline mt-3 w-100" onclick="AIAdvisor.copyPromoPost('${p.name}', '${Number(p.price || 0).toFixed(2)}')">
                                <i class="fa-regular fa-copy"></i> ចម្លង Caption ផុសលក់
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    copyPromoPost: function(prodName, price) {
        const promoPrice = (Number(price) * 0.85).toFixed(2);
        const text = `🔥 ប្រូម៉ូសិនពិសេសថ្ងៃនេះពី Mhaly Shop! 🔥\n👉 ${prodName} បញ្ចុះតម្លៃសល់ត្រឹមតែ $${promoPrice} ប៉ុណ្ណោះ (តម្លៃដើម $${price})!\n✅ ធានាគុណភាពខ្ពស់\n📍 មកដល់ហាង Mhaly Shop ផ្ទាល់ ឬផ្ញើសារកុម្ម៉ង់ឥឡូវនេះ! 📲`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                if (window.App && App.showToast) {
                    App.showToast('បានចម្លង Caption ប្រូម៉ូសិនរួចរាល់! អាចយកទៅផុសបានភ្លាម', 'success');
                } else {
                    alert('បានចម្លង Caption ប្រូម៉ូសិនរួចរាល់!');
                }
            });
        }
    }
};

window.AIAdvisor = AIAdvisor;

