/**
 * MHALY SHOP - WARRANTY MANAGEMENT MODULE
 * IMEI lookup, remaining days calculation, warranty certificate display
 */

const Warranty = {
    init: function() {
        Warranty.setupEventListeners();
        Warranty.renderQuickChips();
    },

    setupEventListeners: function() {
        const checkBtn = document.getElementById('btn-check-warranty');
        const imeiInput = document.getElementById('warranty-imei-input');

        if (checkBtn) {
            checkBtn.addEventListener('click', () => {
                Warranty.checkImei(imeiInput.value.trim());
            });
        }

        if (imeiInput) {
            imeiInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    Warranty.checkImei(imeiInput.value.trim());
                }
            });
        }
    },

    // Render clickable sample IMEI chips
    renderQuickChips: function() {
        const chipsContainer = document.getElementById('quick-imei-chips');
        if (!chipsContainer) return;

        const sales = Storage.getSales();
        let sampleImeis = [];

        sales.forEach(s => {
            s.items.forEach(item => {
                if (item.hasImei && item.imei) {
                    sampleImeis.push({ imei: item.imei, name: item.name });
                }
            });
        });

        // Add demo fallback if no sales with IMEI
        if (sampleImeis.length === 0) {
            sampleImeis = [
                { imei: '359482104928100', name: 'iPhone 16 Pro Max' },
                { imei: '357192837461900', name: 'iPhone 13 Pro' }
            ];
        }

        chipsContainer.innerHTML = `
            <span>សាកល្បងចុចលើ IMEI គំរូ៖</span>
            ${sampleImeis.slice(0, 4).map(s => `
                <button type="button" class="sample-imei-chip" onclick="Warranty.checkImei('${s.imei}')">
                    <i class="fa-solid fa-mobile-screen"></i> ${s.imei}
                </button>
            `).join('')}
        `;
    },

    // Check IMEI validity and warranty duration
    checkImei: function(imeiStr) {
        if (!imeiStr) {
            App.showToast('សូមបញ្ចូលលេខ IMEI ដើម្បីឆែកការធានា!', 'error');
            return;
        }

        const resultCard = document.getElementById('warranty-result-card');
        const sales = Storage.getSales();
        const products = Storage.getProducts();

        let foundSale = null;
        let foundItem = null;

        // 1. Search in Sales history
        for (const sale of sales) {
            for (const item of sale.items) {
                if (item.hasImei && item.imei === imeiStr) {
                    foundSale = sale;
                    foundItem = item;
                    break;
                }
            }
            if (foundSale) break;
        }

        // 2. If not found in sales, check if it's currently in stock
        let inStockProduct = null;
        let inStockImei = null;
        if (!foundSale) {
            for (const p of products) {
                if (p.hasImei && p.imeis) {
                    const match = p.imeis.find(i => i.imei === imeiStr);
                    if (match) {
                        inStockProduct = p;
                        inStockImei = match;
                        break;
                    }
                }
            }
        }

        resultCard.style.display = 'block';

        if (foundSale && foundItem) {
            const saleDate = new Date(foundSale.date);
            const warrantyMonths = foundItem.warrantyMonths || 12;
            const expireDate = new Date(saleDate);
            expireDate.setMonth(expireDate.getMonth() + warrantyMonths);

            const now = new Date();
            const diffTime = expireDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const isWarrantyValid = diffDays > 0;

            resultCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 16px; margin-bottom: 20px;">
                    <div>
                        <span style="font-size: 12px; color: var(--text-muted);">លទ្ធផលពិនិត្យការធានា</span>
                        <h3 style="font-size: 22px; color: #ffffff; font-weight: 800; margin-top: 2px;">${foundItem.name}</h3>
                        <span style="font-family: var(--font-nums); color: #38bdf8; font-size: 14px; font-weight: 700;">
                            <i class="fa-solid fa-barcode"></i> IMEI: ${imeiStr}
                        </span>
                    </div>
                    <div>
                        ${isWarrantyValid ? `
                            <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; padding: 8px 18px; border-radius: 30px; font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                                <i class="fa-solid fa-shield-check"></i> នៅមានការធានា (${diffDays} ថ្ងៃទៀត)
                            </div>
                        ` : `
                            <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; padding: 8px 18px; border-radius: 30px; font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                                <i class="fa-solid fa-shield-xmark"></i> ផុតកំណត់ការធានា
                            </div>
                        `}
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    <div class="kpi-card" style="padding: 14px;">
                        <div>
                            <span style="font-size: 11.5px; color: var(--text-muted);">កាលបរិច្ឆេទលក់ចេញ</span>
                            <div style="font-weight: 700; font-size: 14.5px; color: var(--text-primary); margin-top: 4px;">
                                ${saleDate.toLocaleDateString('km-KH')}
                            </div>
                            <span style="font-size: 11px; color: #94a3b8;">វិក្កយបត្រ #${foundSale.id}</span>
                        </div>
                    </div>

                    <div class="kpi-card" style="padding: 14px;">
                        <div>
                            <span style="font-size: 11.5px; color: var(--text-muted);">រយៈពេលធានាផ្លូវការ</span>
                            <div style="font-weight: 700; font-size: 14.5px; color: #38bdf8; margin-top: 4px;">
                                ${warrantyMonths} ខែ
                            </div>
                            <span style="font-size: 11px; color: #94a3b8;">ផុតកំណត់៖ ${expireDate.toLocaleDateString('km-KH')}</span>
                        </div>
                    </div>

                    <div class="kpi-card" style="padding: 14px;">
                        <div>
                            <span style="font-size: 11.5px; color: var(--text-muted);">ព័ត៌មានអតិថិជន</span>
                            <div style="font-weight: 700; font-size: 14.5px; color: var(--text-primary); margin-top: 4px;">
                                ${foundSale.customerName}
                            </div>
                            <span style="font-size: 11px; color: #94a3b8;">ទូរស័ព្ទ៖ ${foundSale.customerPhone}</span>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 20px; text-align: right;">
                    <button class="btn-secondary" onclick="POS.showReceipt(Storage.getSales().find(s=>s.id==='${foundSale.id}'))">
                        <i class="fa-solid fa-receipt"></i> មើលវិក្កយបត្រលក់ដើម
                    </button>
                </div>
            `;
            App.playBeep();
        } else if (inStockProduct && inStockImei) {
            resultCard.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <i class="fa-solid fa-box-check" style="font-size: 40px; color: #38bdf8; margin-bottom: 12px;"></i>
                    <h3 style="color: #ffffff;">ទូរស័ព្ទនេះស្ថិតក្នុងស្តុកហាង (មិនទាន់លក់ចេញ)</h3>
                    <p style="color: var(--text-secondary); margin-top: 6px;">
                        ម៉ូឌែល៖ <strong>${inStockProduct.name}</strong> | IMEI: <strong>${imeiStr}</strong><br>
                        ស្ថានភាព៖ ${inStockImei.condition || 'New'} &bull; ពណ៌៖ ${inStockImei.color} &bull; ធានា ${inStockProduct.warrantyMonths} ខែ
                    </p>
                    <button class="btn-primary" style="margin-top: 14px;" onclick="App.navigateToTab('pos-tab')">
                        <i class="fa-solid fa-cash-register"></i> ទៅកាន់ផ្ទាំងលក់ដើម្បីលក់ទូរស័ព្ទនេះ
                    </button>
                </div>
            `;
        } else {
            resultCard.innerHTML = `
                <div style="text-align: center; padding: 24px; color: var(--text-muted);">
                    <i class="fa-solid fa-circle-question" style="font-size: 40px; color: #64748b; margin-bottom: 12px;"></i>
                    <h3 style="color: #ffffff;">រកមិនឃើញព័ត៌មានលេខ IMEI នេះទេ</h3>
                    <p style="margin-top: 4px;">សូមពិនិត្យមើលលេខ IMEI ឡើងវិញ ឬទូរស័ព្ទនេះមិនមែនជាទំនិញដែលបានទិញពីហាង ${Storage.getSettings().shopName} ឡើយ។</p>
                </div>
            `;
        }
    }
};

window.Warranty = Warranty;
