/**
 * MHALY SHOP - POINT OF SALE (POS) MODULE
 * Modern mobile-friendly POS Terminal, Cart management, IMEI Selection,
 * Multi-Currency Checkout (USD / KHR), Quick Cash, KHQR Bakong, Thermal Receipt Generator
 */

const POS = {
    cart: [],
    currentCategory: 'all',
    searchQuery: '',
    selectedProductForImei: null,
    currentPaymentMethod: 'cash',
    activeInvoiceId: '',

    init: function () {
        POS.renderCategories();
        POS.renderProducts();
        POS.setupEventListeners();
        POS.updateCartUI();
        POS.initSaleDate();
    },

    initSaleDate: function () {
        const dateInput = document.getElementById('cart-sale-date');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().slice(0, 10);
        }
    },

    setupEventListeners: function () {
        // POS Search Input
        const searchInput = document.getElementById('pos-product-search-input');
        const clearSearchBtn = document.getElementById('btn-pos-clear-search');
        if (searchInput) {
            let posSearchDebounce = null;
            searchInput.addEventListener('input', (e) => {
                POS.searchQuery = e.target.value.toLowerCase().trim();
                if (clearSearchBtn) {
                    clearSearchBtn.style.display = POS.searchQuery ? 'block' : 'none';
                }
                clearTimeout(posSearchDebounce);
                posSearchDebounce = setTimeout(() => {
                    POS.renderProducts();
                }, 100);
            });
        }
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                }
                POS.searchQuery = '';
                clearSearchBtn.style.display = 'none';
                POS.renderProducts();
            });
        }

        // Camera Scan Button in POS
        const posCameraBtn = document.getElementById('btn-pos-camera-scan');
        if (posCameraBtn) {
            posCameraBtn.addEventListener('click', () => {
                if (window.App) App.openCameraScanner('pos');
            });
        }

        // Clear Cart
        const clearBtn = document.getElementById('btn-clear-cart');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (POS.cart.length === 0) return;
                if (confirm('តើអ្នកពិតជាចង់សម្អាតទំនិញទាំងអស់ចេញពីកន្ត្រកមែនទេ?')) {
                    POS.cart = [];
                    POS.updateCartUI();
                    App.showToast('បានសម្អាតកន្ត្រកទំនិញ', 'info');
                }
            });
        }

        // Cart Discount Input
        const discountInput = document.getElementById('cart-discount-input');
        if (discountInput) {
            discountInput.addEventListener('input', () => {
                POS.updateCartUI();
            });
        }

        // Sale Date Controls (Today, Yesterday, Custom Calendar)
        const dateInput = document.getElementById('cart-sale-date');
        const btnToday = document.getElementById('btn-cart-date-today');
        const btnYesterday = document.getElementById('btn-cart-date-yesterday');
        const checkoutDateInput = document.getElementById('checkout-sale-date');

        if (btnToday && dateInput) {
            btnToday.addEventListener('click', () => {
                const todayStr = new Date().toISOString().slice(0, 10);
                dateInput.value = todayStr;
                btnToday.classList.add('active');
                if (btnYesterday) btnYesterday.classList.remove('active');
                if (checkoutDateInput) checkoutDateInput.value = todayStr;
                App.showToast('បានកំណត់កាលបរិច្ឆេទលក់៖ ថ្ងៃនេះ', 'info');
            });
        }

        if (btnYesterday && dateInput) {
            btnYesterday.addEventListener('click', () => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                const yStr = y.toISOString().slice(0, 10);
                dateInput.value = yStr;
                btnYesterday.classList.add('active');
                if (btnToday) btnToday.classList.remove('active');
                if (checkoutDateInput) checkoutDateInput.value = yStr;
                App.showToast(`បានកំណត់កាលបរិច្ឆេទលក់៖ ម្សិលមិញ (${yStr})`, 'info');
            });
        }

        if (dateInput) {
            dateInput.addEventListener('change', (e) => {
                const val = e.target.value;
                const todayStr = new Date().toISOString().slice(0, 10);
                const y = new Date();
                y.setDate(y.getDate() - 1);
                const yStr = y.toISOString().slice(0, 10);

                if (btnToday) btnToday.classList.toggle('active', val === todayStr);
                if (btnYesterday) btnYesterday.classList.toggle('active', val === yStr);
                if (checkoutDateInput) checkoutDateInput.value = val;
            });
        }

        if (checkoutDateInput) {
            checkoutDateInput.addEventListener('change', (e) => {
                const val = e.target.value;
                if (dateInput) {
                    dateInput.value = val;
                    dateInput.dispatchEvent(new Event('change'));
                }
            });
        }

        // Checkout Button
        const checkoutBtn = document.getElementById('btn-checkout');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', POS.openCheckoutModal);
        }

        // Close IMEI Modal
        const closeImeiBtn = document.getElementById('btn-close-imei-modal');
        const imeiModal = document.getElementById('imei-modal');
        if (closeImeiBtn) {
            closeImeiBtn.addEventListener('click', () => {
                if (imeiModal) imeiModal.classList.remove('show');
            });
        }
        if (imeiModal) {
            imeiModal.addEventListener('click', (e) => {
                if (e.target === imeiModal) imeiModal.classList.remove('show');
            });
        }

        // IMEI Filter in Modal
        const imeiFilterInput = document.getElementById('imei-modal-filter');
        if (imeiFilterInput) {
            imeiFilterInput.addEventListener('input', (e) => {
                POS.renderImeiOptions(e.target.value);
            });
        }

        // Close Checkout Modal
        const closeCheckoutBtn = document.getElementById('btn-close-checkout-modal');
        const checkoutModal = document.getElementById('checkout-modal');
        if (closeCheckoutBtn) {
            closeCheckoutBtn.addEventListener('click', () => {
                if (checkoutModal) checkoutModal.classList.remove('show');
            });
        }
        if (checkoutModal) {
            checkoutModal.addEventListener('click', (e) => {
                if (e.target === checkoutModal) checkoutModal.classList.remove('show');
            });
        }

        // Payment Method Buttons
        document.querySelectorAll('.pay-method-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.pay-method-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                POS.setPaymentMethod(btn.dataset.method);
            });
        });

        // Two-way sync between Cart and Checkout Modal customer fields
        const debtNameInput = document.getElementById('debt-customer-name');
        const debtPhoneInput = document.getElementById('debt-customer-phone');
        const cartNameInput = document.getElementById('cart-customer-name');
        const cartPhoneInput = document.getElementById('cart-customer-phone');
        if (debtNameInput && cartNameInput) {
            debtNameInput.addEventListener('input', () => { cartNameInput.value = debtNameInput.value; });
            cartNameInput.addEventListener('input', () => { debtNameInput.value = cartNameInput.value; });
        }
        if (debtPhoneInput && cartPhoneInput) {
            debtPhoneInput.addEventListener('input', () => { cartPhoneInput.value = debtPhoneInput.value; });
            cartPhoneInput.addEventListener('input', () => { debtPhoneInput.value = cartPhoneInput.value; });
        }

        // Cash Calculation Listeners
        const cashUsd = document.getElementById('pay-cash-usd');
        const cashKhr = document.getElementById('pay-cash-khr');
        if (cashUsd) cashUsd.addEventListener('input', POS.calculateChange);
        if (cashKhr) cashKhr.addEventListener('input', POS.calculateChange);

        // Debt Partial Payment Listeners
        const debtPaidUsd = document.getElementById('debt-paid-usd');
        const debtPaidKhr = document.getElementById('debt-paid-khr');
        if (debtPaidUsd) debtPaidUsd.addEventListener('input', POS.calculateDebtRemaining);
        if (debtPaidKhr) debtPaidKhr.addEventListener('input', POS.calculateDebtRemaining);

        // Complete Sale
        const completeBtn = document.getElementById('btn-complete-sale');
        if (completeBtn) {
            completeBtn.addEventListener('click', POS.completeSale);
        }

        // Close Receipt Modal
        const closeReceiptBtn = document.getElementById('btn-close-receipt-modal');
        const receiptModal = document.getElementById('receipt-modal');
        if (closeReceiptBtn) {
            closeReceiptBtn.addEventListener('click', () => {
                if (receiptModal) receiptModal.classList.remove('show');
            });
        }
        if (receiptModal) {
            receiptModal.addEventListener('click', (e) => {
                if (e.target === receiptModal) receiptModal.classList.remove('show');
            });
        }

        // Print Receipt Button
        const printBtn = document.getElementById('btn-trigger-print');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }
    },

    // =======================================================
    // CATEGORIES & PRODUCT RENDERING
    // =======================================================
    renderCategories: function () {
        const bar = document.getElementById('pos-category-bar');
        if (!bar) return;

        const categories = Storage.getCategories();
        let html = `
            <button class="cat-pill ${POS.currentCategory === 'all' ? 'active' : ''}" onclick="POS.selectCategory('all')">
                <i class="fa-solid fa-layer-group"></i> ទាំងអស់ (All)
            </button>
        `;

        categories.forEach(cat => {
            const isActive = POS.currentCategory === cat.name ? 'active' : '';
            html += `
                <button class="cat-pill ${isActive}" onclick="POS.selectCategory('${cat.name}')">
                    <i class="${cat.icon || 'fa-solid fa-tag'}"></i> ${cat.name}
                </button>
            `;
        });

        bar.innerHTML = html;
    },

    selectCategory: function (catName) {
        POS.currentCategory = catName;
        POS.renderCategories();
        POS.renderProducts();
    },

    renderProducts: function () {
        const grid = document.getElementById('pos-products-grid');
        if (!grid) return;

        try {
            let products = Storage.getProducts() || [];
            if ((!products || products.length === 0) && typeof window !== 'undefined' && window.MHALY_EMBEDDED_DATABASE && Array.isArray(window.MHALY_EMBEDDED_DATABASE.products) && window.MHALY_EMBEDDED_DATABASE.products.length > 0) {
                products = window.MHALY_EMBEDDED_DATABASE.products;
            }
            if ((!products || products.length === 0) && typeof DEFAULT_PRODUCTS !== 'undefined' && Array.isArray(DEFAULT_PRODUCTS)) {
                products = DEFAULT_PRODUCTS;
            }

            const settings = (typeof Storage !== 'undefined' && Storage.getSettings) ? (Storage.getSettings() || {}) : {};
            const rate = Number(settings.exchangeRate) || 4100;

            let filtered = Array.isArray(products) ? products : [];
            if (POS.currentCategory && POS.currentCategory !== 'all') {
                filtered = filtered.filter(p => p && p.category === POS.currentCategory);
            }

            if (POS.searchQuery) {
                const q = POS.searchQuery.toLowerCase().trim();
                filtered = filtered.filter(p => {
                    if (!p) return false;
                    return (p.name && p.name.toLowerCase().includes(q)) ||
                        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
                        (p.brand && p.brand.toLowerCase().includes(q)) ||
                        (p.category && p.category.toLowerCase().includes(q)) ||
                        (p.storage && p.storage.toLowerCase().includes(q)) ||
                        (p.hasImei && Array.isArray(p.imeis) && p.imeis.some(i => (i.imei || '').toLowerCase().includes(q)));
                });
            }

            if (filtered.length === 0) {
                if (!products || products.length === 0) {
                    grid.innerHTML = `
                        <div class="empty-products-state" style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: var(--text-muted);">
                            <i class="fa-solid fa-boxes-stacked" style="font-size: 42px; margin-bottom: 12px; display: block; opacity: 0.5; color: #818cf8;"></i>
                            <h4 style="color: var(--text-primary); font-size: 16px; margin-bottom: 6px;">មិនទាន់មានទំនិញក្នុងស្តុកនៅឡើយទេ</h4>
                            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">សូមចូលទៅកាន់ផ្ទាំង "ស្តុក" ដើម្បីបន្ថែមទំនិញផ្ទាល់ខ្លួនរបស់អ្នក</p>
                            <button class="btn-primary" onclick="App.navigateToTab('inventory-tab'); document.getElementById('btn-add-product').click();">
                                <i class="fa-solid fa-plus"></i> បន្ថែមទំនិញចូលស្តុក
                            </button>
                        </div>
                    `;
                } else {
                    grid.innerHTML = `
                        <div class="empty-products-state" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-muted);">
                            <i class="fa-solid fa-magnifying-glass" style="font-size: 36px; margin-bottom: 10px; display: block; opacity: 0.5; color: #94a3b8;"></i>
                            <h4 style="color: var(--text-primary); font-size: 15px; margin-bottom: 6px;">រកមិនឃើញទំនិញត្រូវនឹង "${POS.searchQuery || POS.currentCategory}" ទេ</h4>
                            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">សូមសាកល្បងស្វែងរកឈ្មោះផ្សេង ឬស្កេន IMEI ឡើងវិញ</p>
                            <button class="btn-secondary" style="padding: 8px 18px; border-radius: 8px; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;" onclick="POS.currentCategory='all'; POS.searchQuery=''; const si = document.getElementById('pos-search-input'); if(si) si.value=''; POS.renderCategories(); POS.renderProducts();">
                                <i class="fa-solid fa-rotate-left"></i> បង្ហាញទំនិញទាំងអស់ (${products.length} មុខ)
                            </button>
                        </div>
                    `;
                }
                return;
            }

            grid.innerHTML = filtered.map(p => {
                if (!p) return '';
                let stockCount = 0;
                let stockClass = 'in-stock';
                let stockText = 'មានក្នុងស្តុក';

                if (p.hasImei) {
                    const inStockImeis = (p.imeis || []).filter(i => i.status === 'in_stock');
                    stockCount = inStockImeis.length;
                } else {
                    stockCount = Number(p.stockCount) || 0;
                }

                if (stockCount === 0) {
                    stockClass = 'out-stock';
                    stockText = 'អស់ស្តុក (Out)';
                } else if (stockCount <= 2) {
                    stockClass = 'low-stock';
                    stockText = `នៅសល់ ${stockCount}`;
                } else {
                    stockText = `ក្នុងស្តុក: ${stockCount}`;
                }

                const numPrice = Number(p.price) || 0;
                const priceUsdStr = numPrice.toFixed(2);
                const priceKhrStr = Math.round(numPrice * rate).toLocaleString();
                const pId = p.id || '';
                const pName = p.name || 'ទំនិញគ្មានឈ្មោះ';

                return `
                    <div class="product-card" onclick="POS.handleProductClick('${pId}')">
                        <div class="product-badge-top">
                            <span class="stock-tag ${stockClass}">${stockText}</span>
                            ${p.hasImei ? `<span class="condition-pill"><i class="fa-solid fa-barcode"></i> IMEI</span>` : ''}
                        </div>

                        <div class="product-thumb-wrap">
                            ${p.image ? `<img src="${p.image}" alt="${pName}" onerror="this.src=''; this.parentElement.innerHTML='<i class=\\'fa-solid fa-mobile-screen product-icon-fallback\\'></i>'"/>` : `<i class="fa-solid fa-mobile-screen product-icon-fallback"></i>`}
                        </div>

                        <div class="product-details">
                            <h4 class="product-title">${pName}</h4>
                            <div class="product-storage-tag">
                                <i class="fa-solid fa-hard-drive"></i> ${p.storage || 'Standard'}
                                ${p.warrantyMonths ? ` &bull; ធានា ${p.warrantyMonths} ខែ` : ''}
                            </div>
                        </div>

                        <div class="product-price-row">
                            <span class="price-usd">$${priceUsdStr}</span>
                            <span class="price-khr">${priceKhrStr} ៛</span>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (renderErr) {
            console.error('[POS] renderProducts caught error:', renderErr);
        }
    },

    // =======================================================
    // PRODUCT SELECTION & IMEI MODAL
    // =======================================================
    handleProductClick: function (productId) {
        const products = Storage.getProducts();
        const product = products.find(p => p.id === productId);
        if (!product) return;

        if (product.hasImei) {
            POS.selectedProductForImei = product;
            const imeiModal = document.getElementById('imei-modal');
            const titleEl = document.getElementById('imei-modal-product-name');
            const metaEl = document.getElementById('imei-modal-product-meta');
            const filterInput = document.getElementById('imei-modal-filter');

            if (titleEl) titleEl.innerText = product.name;
            if (metaEl) metaEl.innerText = `${product.storage || ''} • តម្លៃ: $${product.price.toFixed(2)}`;
            if (filterInput) filterInput.value = '';

            POS.renderImeiOptions('');
            if (imeiModal) imeiModal.classList.add('show');
        } else {
            // Accessory or item without specific IMEI
            if ((product.stockCount || 0) <= 0) {
                App.showToast('ទំនិញនេះអស់ពីស្តុកហើយ!', 'error');
                return;
            }
            POS.addToCart(product, null);
        }
    },

    renderImeiOptions: function (filterText) {
        const container = document.getElementById('imei-options-list');
        if (!container || !POS.selectedProductForImei) return;

        const product = POS.selectedProductForImei;
        const available = (product.imeis || []).filter(i => {
            const isInStock = i.status === 'in_stock';
            // Also check if already in cart
            const inCart = POS.cart.some(c => c.hasImei && c.imei === i.imei);
            return isInStock && !inCart;
        });

        const filterLower = (filterText || '').toLowerCase().trim();
        const filtered = available.filter(i => {
            if (!filterLower) return true;
            return (i.imei || '').toLowerCase().includes(filterLower) ||
                (i.color || '').toLowerCase().includes(filterLower) ||
                (i.condition || '').toLowerCase().includes(filterLower);
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-imei-state" style="text-align: center; padding: 24px; color: var(--text-muted);">
                    <i class="fa-solid fa-triangle-exclamation text-amber" style="font-size: 32px; margin-bottom: 8px; display: block;"></i>
                    <p>មិនមានលេខ IMEI ក្នុងស្តុក ឬត្រូវនឹងការស្វែងរកទេ</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(i => `
            <div class="imei-choice-item" onclick="POS.selectImeiAndAddToCart('${i.imei}')">
                <div class="imei-choice-left">
                    <span class="imei-number-tag"><i class="fa-solid fa-barcode"></i> ${i.imei}</span>
                    <div class="imei-meta-row">
                        <span class="imei-color-dot"></span>
                        <span>${i.color || 'ស្តង់ដារ'}</span>
                        <span class="imei-badge-cond">${i.condition || 'New'}</span>
                        ${i.battery ? `<span class="imei-badge-battery"><i class="fa-solid fa-battery-full text-green"></i> ${i.battery}%</span>` : ''}
                    </div>
                </div>
                <button class="btn-choose-imei">
                    <span>ជ្រើសរើស</span> <i class="fa-solid fa-plus"></i>
                </button>
            </div>
        `).join('');
    },

    selectImeiAndAddToCart: function (imeiStr) {
        if (!POS.selectedProductForImei) return;
        const imeiObj = (POS.selectedProductForImei.imeis || []).find(i => i.imei === imeiStr);
        if (!imeiObj) return;

        POS.addToCart(POS.selectedProductForImei, imeiObj);
        const imeiModal = document.getElementById('imei-modal');
        if (imeiModal) imeiModal.classList.remove('show');
    },

    // =======================================================
    // CART OPERATIONS
    // =======================================================
    addToCart: function (product, imeiObj) {
        if (imeiObj) {
            // Phone item with IMEI
            POS.cart.push({
                cartId: 'c-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                productId: product.id,
                name: product.name,
                price: product.price,
                originalPrice: product.price,
                cost: imeiObj.cost || product.cost,
                quantity: 1,
                hasImei: true,
                imei: imeiObj.imei,
                color: imeiObj.color,
                storage: imeiObj.storage || product.storage,
                condition: imeiObj.condition,
                battery: imeiObj.battery,
                warrantyMonths: product.warrantyMonths || 12
            });
            App.playBeep();
            App.showToast(`បានបញ្ចូល ${product.name} (IMEI: ${imeiObj.imei})`, 'success');
        } else {
            // Accessory / item without IMEI
            const existing = POS.cart.find(c => c.productId === product.id && !c.hasImei);
            if (existing) {
                if (existing.quantity >= (product.stockCount || 999)) {
                    App.showToast('មិនអាចបន្ថែមលើសចំនួនក្នុងស្តុកបានទេ!', 'error');
                    return;
                }
                existing.quantity += 1;
            } else {
                POS.cart.push({
                    cartId: 'c-' + Date.now(),
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    originalPrice: product.price,
                    cost: product.cost,
                    quantity: 1,
                    hasImei: false,
                    storage: product.storage,
                    warrantyMonths: product.warrantyMonths || 0
                });
            }
            App.playBeep();
            App.showToast(`បានបញ្ចូល ${product.name}`, 'success');
        }

        POS.updateCartUI();
    },

    removeFromCart: function (cartId) {
        POS.cart = POS.cart.filter(item => item.cartId !== cartId);
        POS.updateCartUI();
    },

    updateCartQuantity: function (cartId, delta) {
        const item = POS.cart.find(c => c.cartId === cartId);
        if (!item || item.hasImei) return;

        const products = Storage.getProducts();
        const prod = products.find(p => p.id === item.productId);

        const newQty = item.quantity + delta;
        if (newQty <= 0) {
            POS.removeFromCart(cartId);
        } else {
            if (prod && !prod.hasImei && newQty > (prod.stockCount || 999)) {
                App.showToast('ចំនួនលើសពីស្តុកដែលមាន!', 'error');
                return;
            }
            item.quantity = newQty;
            POS.updateCartUI();
        }
    },

    handleCartPriceInput: function (cartId, val) {
        const item = POS.cart.find(c => c.cartId === cartId);
        if (!item) return;

        const parsed = parseFloat(val);
        if (!isNaN(parsed) && parsed >= 0) {
            item.price = parsed;
            POS.updateCartTotalsOnly();
            const lineTotalEl = document.getElementById('line-total-' + cartId);
            if (lineTotalEl) {
                lineTotalEl.innerText = `សរុប: $${(item.price * item.quantity).toFixed(2)}`;
            }
        }
    },

    finalizeCartPrice: function (cartId, val) {
        const item = POS.cart.find(c => c.cartId === cartId);
        if (!item) return;

        const parsed = parseFloat(val);
        if (isNaN(parsed) || parsed < 0) {
            item.price = (item.originalPrice !== undefined ? item.originalPrice : 0);
        } else {
            item.price = parsed;
        }
        POS.updateCartUI();
    },

    resetCartItemPrice: function (cartId) {
        const item = POS.cart.find(c => c.cartId === cartId);
        if (!item || item.originalPrice === undefined) return;
        item.price = item.originalPrice;
        POS.updateCartUI();
        if (typeof App !== 'undefined' && App.showToast) {
            App.showToast(`បានកំណត់តម្លៃដើម $${Number(item.originalPrice).toFixed(2)} ឡើងវិញ`, 'info');
        }
    },

    scrollToCart: function () {
        const cartCard = document.querySelector('.pos-cart-area');
        if (cartCard) {
            cartCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        const mFloatingBar = document.getElementById('mobile-cart-floating-bar');
        if (mFloatingBar) {
            mFloatingBar.style.display = 'none';
        }
    },

    updateCartTotalsOnly: function () {
        const countBadge = document.getElementById('cart-item-count');
        const subtotalEl = document.getElementById('cart-subtotal');
        const discountEl = document.getElementById('cart-discount-val');
        const totalUsdEl = document.getElementById('cart-total-usd');
        const totalKhrEl = document.getElementById('cart-total-khr');
        const checkoutBtn = document.getElementById('btn-checkout');

        const settings = Storage.getSettings();
        const rate = settings.exchangeRate || 4100;

        let totalItems = 0;
        let subtotal = 0;

        POS.cart.forEach(item => {
            totalItems += item.quantity;
            subtotal += (item.price * item.quantity);
        });

        if (countBadge) countBadge.innerText = totalItems;

        const discountInput = document.getElementById('cart-discount-input');
        const discountVal = discountInput ? (parseFloat(discountInput.value) || 0) : 0;
        const grandTotalUsd = Math.max(0, subtotal - discountVal);
        const grandTotalKhr = Math.round(grandTotalUsd * rate);

        if (subtotalEl) subtotalEl.innerText = `$${subtotal.toFixed(2)}`;
        if (discountEl) discountEl.innerText = `-$${discountVal.toFixed(2)}`;
        if (totalUsdEl) totalUsdEl.innerText = `$${grandTotalUsd.toFixed(2)}`;
        if (totalKhrEl) totalKhrEl.innerText = `${grandTotalKhr.toLocaleString()} ៛`;

        if (checkoutBtn) {
            checkoutBtn.disabled = POS.cart.length === 0;
        }

        // Mobile Floating Cart Bar (Only on small mobile phone screens <= 768px, never on PC/Desktop)
        const mFloatingBar = document.getElementById('mobile-cart-floating-bar');
        const mCountEl = document.getElementById('m-floating-cart-count');
        const mTotalEl = document.getElementById('m-floating-cart-total');
        if (mFloatingBar) {
            const isMobile = window.innerWidth <= 768;
            if (isMobile && POS.cart.length > 0) {
                mFloatingBar.style.display = 'flex';
                if (mCountEl) mCountEl.innerText = `${totalItems} មុខ`;
                if (mTotalEl) mTotalEl.innerText = `$${grandTotalUsd.toFixed(2)}`;
            } else {
                mFloatingBar.style.display = 'none';
            }
        }
    },

    updateCartUI: function () {
        POS.updateCartTotalsOnly();

        const list = document.getElementById('cart-items-list');
        if (!list) return;

        if (POS.cart.length === 0) {
            list.innerHTML = `
                <div class="empty-cart-state">
                    <div class="empty-cart-icon"><i class="fa-solid fa-bag-shopping"></i></div>
                    <p class="empty-cart-text">មិនទាន់មានទំនិញក្នុងកន្ត្រកទេ</p>
                    <span class="empty-cart-sub">សូមជ្រើសរើសទូរស័ព្ទ ឬស្កេន IMEI ដើម្បីលក់</span>
                </div>
            `;
            return;
        }

        list.innerHTML = POS.cart.map(item => `
            <div class="cart-item-card">
                <div class="cart-item-top">
                    <div>
                        <h5 class="cart-item-title">${item.name}</h5>
                        ${item.hasImei ? `<span class="cart-imei-badge"><i class="fa-solid fa-barcode"></i> ${item.imei} (${item.color || ''})</span>` : (item.isService ? `<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 2px 7px; border-radius: 4px; font-weight: 600; margin-top: 2px;"><i class="fa-solid fa-wand-magic-sparkles" style="font-size: 10px;"></i> សេវាកម្ម</span>` : '')}
                    </div>
                    <button class="btn-remove-item" onclick="POS.removeFromCart('${item.cartId}')" title="លុបចេញ">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div class="cart-item-bottom">
                    ${item.hasImei ? `
                        <span style="font-size: 11.5px; color: var(--text-muted);">ចំនួន៖ 1 គ្រឿង</span>
                    ` : `
                        <div class="cart-qty-stepper">
                            <button class="btn-step" onclick="POS.updateCartQuantity('${item.cartId}', -1)">-</button>
                            <span class="step-num">${item.quantity}</span>
                            <button class="btn-step" onclick="POS.updateCartQuantity('${item.cartId}', 1)">+</button>
                        </div>
                    `}
                    <div class="cart-item-price-block">
                        <div class="cart-price-edit-box" 
                             onclick="const inp=this.querySelector('.cart-price-input'); if(inp){inp.focus(); inp.select();}" 
                             title="ចុចលើប្រអប់នេះដើម្បីកែប្រែតម្លៃលក់">
                            <span class="cart-price-currency">$</span>
                            <input type="number" 
                                   class="cart-price-input" 
                                   value="${Number(item.price).toFixed(2).replace(/\.00$/, '')}" 
                                   step="any" 
                                   min="0"
                                   data-cart-id="${item.cartId}"
                                   onclick="event.stopPropagation(); this.select();"
                                   onfocus="this.select()"
                                   oninput="POS.handleCartPriceInput('${item.cartId}', this.value)"
                                   onchange="POS.finalizeCartPrice('${item.cartId}', this.value)"
                                   onkeydown="if(event.key==='Enter') this.blur();"
                            >
                            <i class="fa-solid fa-pen-to-square price-edit-pen" title="កែប្រែតម្លៃ"></i>
                        </div>
                        ${item.originalPrice !== undefined && Number(item.price) !== Number(item.originalPrice) ? `
                            <span class="cart-orig-price-badge" onclick="POS.resetCartItemPrice('${item.cartId}')" title="ចុចដើម្បីកំណត់តម្លៃដើមវិញ ($${Number(item.originalPrice).toFixed(2)})">
                                ដើម $${Number(item.originalPrice).toFixed(2).replace(/\.00$/, '')} <i class="fa-solid fa-rotate-left"></i>
                            </span>
                        ` : ''}
                        ${item.quantity > 1 ? `
                            <span class="cart-item-line-total" id="line-total-${item.cartId}">សរុប: $${(item.price * item.quantity).toFixed(2)}</span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    },

    // =======================================================
    // CHECKOUT & PAYMENT MODAL
    // =======================================================
    openCheckoutModal: function () {
        if (POS.cart.length === 0) return;

        const modal = document.getElementById('checkout-modal');
        const invoiceId = 'INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
        POS.activeInvoiceId = invoiceId;
        const invoiceTag = document.getElementById('checkout-invoice-id');
        if (invoiceTag) invoiceTag.innerText = '#' + invoiceId;

        const settings = Storage.getSettings();
        const rate = settings.exchangeRate || 4100;

        let subtotal = 0;
        POS.cart.forEach(item => {
            subtotal += (item.price * item.quantity);
        });

        const discountInput = document.getElementById('cart-discount-input');
        const discountVal = discountInput ? (parseFloat(discountInput.value) || 0) : 0;
        const grandTotalUsd = Math.max(0, subtotal - discountVal);
        const grandTotalKhr = Math.round(grandTotalUsd * rate);

        const finalUsdEl = document.getElementById('checkout-final-usd');
        const finalKhrEl = document.getElementById('checkout-final-khr');
        if (finalUsdEl) finalUsdEl.innerText = `$${grandTotalUsd.toFixed(2)}`;
        if (finalKhrEl) finalKhrEl.innerText = `${grandTotalKhr.toLocaleString()} ៛`;

        // Render mini items preview
        const previewList = document.getElementById('checkout-items-preview');
        if (previewList) {
            previewList.innerHTML = POS.cart.map(item => `
                <div class="preview-item-row" style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                    <div>
                        <span>${item.name}</span>
                        ${item.hasImei ? `<br><small style="color: var(--text-muted); font-family: var(--font-nums);">IMEI: ${item.imei}</small>` : ` &times; ${item.quantity}`}
                    </div>
                    <strong>$${(item.price * item.quantity).toFixed(2)}</strong>
                </div>
            `).join('');
        }

        // KHQR preview
        const khqrAmountEl = document.getElementById('khqr-display-amount');
        if (khqrAmountEl) khqrAmountEl.innerText = `$${grandTotalUsd.toFixed(2)} (${grandTotalKhr.toLocaleString()} ៛)`;

        // Reset payment inputs
        const cashUsd = document.getElementById('pay-cash-usd');
        const cashKhr = document.getElementById('pay-cash-khr');
        if (cashUsd) cashUsd.value = grandTotalUsd.toFixed(2);
        if (cashKhr) cashKhr.value = '';

        // Render quick cash chips
        POS.renderQuickCashChips(grandTotalUsd);
        POS.calculateChange();

        // Sync Customer Data & Sale Date to Checkout Modal
        const cartDateInput = document.getElementById('cart-sale-date');
        const checkoutDateInput = document.getElementById('checkout-sale-date');
        if (checkoutDateInput && cartDateInput) {
            checkoutDateInput.value = cartDateInput.value || new Date().toISOString().slice(0, 10);
        }

        const cartCustName = document.getElementById('cart-customer-name')?.value || '';
        const cartCustPhone = document.getElementById('cart-customer-phone')?.value || '';
        const debtCustName = document.getElementById('debt-customer-name');
        const debtCustPhone = document.getElementById('debt-customer-phone');
        if (debtCustName) debtCustName.value = cartCustName;
        if (debtCustPhone) debtCustPhone.value = cartCustPhone;

        // Reset debt inputs & render quick debt chips
        const debtPaidUsd = document.getElementById('debt-paid-usd');
        const debtPaidKhr = document.getElementById('debt-paid-khr');
        if (debtPaidUsd) debtPaidUsd.value = '';
        if (debtPaidKhr) debtPaidKhr.value = '';
        POS.renderDebtQuickChips(grandTotalUsd);
        POS.calculateDebtRemaining();

        // Default to cash
        POS.setPaymentMethod('cash');

        if (modal) modal.classList.add('show');
    },

    setPaymentMethod: function (method) {
        POS.currentPaymentMethod = method;
        const cashSec = document.getElementById('payment-cash-section');
        const khqrSec = document.getElementById('payment-khqr-section');
        const debtSec = document.getElementById('payment-debt-section');

        if (cashSec) cashSec.style.display = method === 'cash' ? 'block' : 'none';
        if (khqrSec) khqrSec.style.display = method === 'khqr' ? 'block' : 'none';
        if (debtSec) debtSec.style.display = method === 'debt' ? 'block' : 'none';

        if (method === 'debt') {
            const debtName = document.getElementById('debt-customer-name');
            if (debtName) {
                const cName = document.getElementById('cart-customer-name')?.value || '';
                if (cName && !debtName.value) debtName.value = cName;
                setTimeout(() => debtName.focus(), 120);
            }
            POS.calculateDebtRemaining();
        }

        POS.calculateChange();
    },

    calculateDebtRemaining: function () {
        const settings = Storage.getSettings();
        const rate = settings.exchangeRate || 4100;

        let subtotal = 0;
        POS.cart.forEach(item => {
            subtotal += (item.price * item.quantity);
        });

        const discountInput = document.getElementById('cart-discount-input');
        const discountVal = discountInput ? (parseFloat(discountInput.value) || 0) : 0;
        const grandTotalUsd = Math.max(0, subtotal - discountVal);

        const paidUsd = parseFloat(document.getElementById('debt-paid-usd')?.value) || 0;
        const paidKhr = parseFloat(document.getElementById('debt-paid-khr')?.value) || 0;

        const totalPaidUsd = Math.min(grandTotalUsd, paidUsd + (paidKhr / rate));
        const remainingDebtUsd = Math.max(0, grandTotalUsd - totalPaidUsd);
        const remainingDebtKhr = Math.round(remainingDebtUsd * rate);

        const remUsdEl = document.getElementById('debt-remaining-usd');
        const remKhrEl = document.getElementById('debt-remaining-khr');

        if (remUsdEl) remUsdEl.innerText = `$${remainingDebtUsd.toFixed(2)}`;
        if (remKhrEl) remKhrEl.innerText = `(${remainingDebtKhr.toLocaleString()} ៛)`;
    },

    renderDebtQuickChips: function (totalUsd) {
        const container = document.getElementById('debt-quick-chips');
        if (!container) return;

        const half = Math.round((totalUsd / 2) * 100) / 100;
        const presets = [
            { label: 'ជំពាក់ទាំងស្រុង ($0)', val: 0 },
            { label: `បង់ 50% ($${half.toFixed(2)})`, val: half }
        ];

        if (totalUsd > 30) presets.push({ label: 'បង់ $20', val: 20 });
        if (totalUsd > 50) presets.push({ label: 'បង់ $30', val: 30 });
        if (totalUsd > 70) presets.push({ label: 'បង់ $50', val: 50 });

        container.innerHTML = presets.map(p => `
            <button type="button" class="cash-chip" onclick="POS.setDebtQuickPaid(${p.val})">
                ${p.label}
            </button>
        `).join('');
    },

    setDebtQuickPaid: function (val) {
        const paidUsd = document.getElementById('debt-paid-usd');
        const paidKhr = document.getElementById('debt-paid-khr');
        if (paidUsd) paidUsd.value = val > 0 ? val.toFixed(2) : '0';
        if (paidKhr) paidKhr.value = '';
        POS.calculateDebtRemaining();
    },

    renderQuickCashChips: function (totalUsd) {
        const container = document.getElementById('quick-cash-chips');
        if (!container) return;

        const presets = [
            { label: 'គត់ ($' + totalUsd.toFixed(2) + ')', val: totalUsd },
            { label: '$50', val: 50 },
            { label: '$100', val: 100 },
            { label: '$500', val: 500 },
            { label: '$1,000', val: 1000 }
        ];

        container.innerHTML = presets.map(p => `
            <button type="button" class="cash-chip" onclick="POS.setQuickCash(${p.val})">
                ${p.label}
            </button>
        `).join('');
    },

    setQuickCash: function (val) {
        const cashUsd = document.getElementById('pay-cash-usd');
        if (cashUsd) {
            cashUsd.value = val;
            POS.calculateChange();
        }
    },

    calculateChange: function () {
        const settings = Storage.getSettings();
        const rate = settings.exchangeRate || 4100;

        let subtotal = 0;
        POS.cart.forEach(item => {
            subtotal += (item.price * item.quantity);
        });

        const discountInput = document.getElementById('cart-discount-input');
        const discountVal = discountInput ? (parseFloat(discountInput.value) || 0) : 0;
        const grandTotalUsd = Math.max(0, subtotal - discountVal);

        const cashUsd = parseFloat(document.getElementById('pay-cash-usd')?.value) || 0;
        const cashKhr = parseFloat(document.getElementById('pay-cash-khr')?.value) || 0;

        const totalReceivedUsd = cashUsd + (cashKhr / rate);
        const changeUsd = Math.max(0, totalReceivedUsd - grandTotalUsd);
        const changeKhr = Math.round(changeUsd * rate);

        const dispUsd = document.getElementById('display-change-usd');
        const dispKhr = document.getElementById('display-change-khr');

        if (dispUsd) dispUsd.innerText = `$${changeUsd.toFixed(2)}`;
        if (dispKhr) dispKhr.innerText = `(${changeKhr.toLocaleString()} ៛)`;
    },

    // =======================================================
    // COMPLETE SALE & RECEIPT
    // =======================================================
    isCompletingSale: false,

    completeSale: async function () {
        if (POS.isCompletingSale) {
            console.warn('[POS Shield] completeSale already in progress, ignoring duplicate call');
            return;
        }
        POS.isCompletingSale = true;

        try {
            if (POS.cart.length === 0) {
                App.showToast('មិនមានទំនិញក្នុងកន្ត្រកទេ!', 'error');
                return;
            }

            const settings = Storage.getSettings();
            const rate = settings.exchangeRate || 4100;

            let subtotal = 0;
            let totalCost = 0;
            POS.cart.forEach(item => {
                subtotal += (item.price * item.quantity);
                totalCost += ((item.cost || 0) * item.quantity);
            });

            const discountInput = document.getElementById('cart-discount-input');
            const discountVal = discountInput ? (parseFloat(discountInput.value) || 0) : 0;
            const grandTotalUsd = Math.max(0, subtotal - discountVal);
            const grandTotalKhr = Math.round(grandTotalUsd * rate);

            const custNameInput = document.getElementById('cart-customer-name');
            const custPhoneInput = document.getElementById('cart-customer-phone');
            const debtCustNameInput = document.getElementById('debt-customer-name');
            const debtCustPhoneInput = document.getElementById('debt-customer-phone');

            // Prefer debt modal input if filled, otherwise cart inputs
            const customerName = (debtCustNameInput?.value.trim()) || (custNameInput?.value.trim()) || 'អតិថិជនទូទៅ';
            const customerPhone = (debtCustPhoneInput?.value.trim()) || (custPhoneInput?.value.trim()) || '012 xxx xxx';

            const cashUsd = parseFloat(document.getElementById('pay-cash-usd')?.value) || 0;
            const cashKhr = parseFloat(document.getElementById('pay-cash-khr')?.value) || 0;
            const totalReceivedUsd = cashUsd + (cashKhr / rate);

            if (POS.currentPaymentMethod === 'cash' && totalReceivedUsd < (grandTotalUsd - 0.01)) {
                App.showToast('ប្រាក់ទទួលមិនទាន់គ្រប់ចំនួនទូទាត់ទេ!', 'error');
                return;
            }

            // Validate debt customer info to prevent untracked / anonymous debts
            if (POS.currentPaymentMethod === 'debt') {
                const hasRealName = customerName && customerName !== 'អតិថិជនទូទៅ';
                const hasRealPhone = customerPhone && customerPhone !== '012 xxx xxx';
                if (!hasRealName && !hasRealPhone) {
                    App.showToast('សូមបញ្ចូលឈ្មោះ ឬលេខទូរស័ព្ទអតិថិជន ដើម្បីកត់ត្រាការជំពាក់!', 'warning');
                    if (debtCustNameInput) debtCustNameInput.focus();
                    else if (custNameInput) custNameInput.focus();
                    return;
                }
            }

            // Debt Partial Calculation
            const isDebt = POS.currentPaymentMethod === 'debt';
            let totalDebtPaidUsd = 0;
            let remainingDebtUsd = 0;

            if (isDebt) {
                const debtPaidUsd = parseFloat(document.getElementById('debt-paid-usd')?.value) || 0;
                const debtPaidKhr = parseFloat(document.getElementById('debt-paid-khr')?.value) || 0;
                totalDebtPaidUsd = Math.min(grandTotalUsd, debtPaidUsd + (debtPaidKhr / rate));
                remainingDebtUsd = Math.max(0, grandTotalUsd - totalDebtPaidUsd);
            }

            const changeUsd = isDebt ? 0 : Math.max(0, totalReceivedUsd - grandTotalUsd);
            const changeKhr = isDebt ? 0 : Math.round(changeUsd * rate);

            const debtDueDate = document.getElementById('debt-due-date')?.value || '';
            const debtNote = document.getElementById('debt-note')?.value || '';

            const currentUser = Storage.getCurrentUser();
            const cashierName = currentUser ? currentUser.name : 'Mhaly (Admin)';

            // 1. Create Sale Record with Selected Date & Protected Collision-free ID
            let invId = POS.activeInvoiceId;
            if (!invId) {
                const yr = new Date().getFullYear();
                const blockedIds = new Set(['INV-2026-5285', 'INV-2026-2932', 'INV-2026-6622', 'INV-2026-1015', 'INV-2026-4730', 'INV-2026-3632', 'INV-2026-6220']);
                do {
                    invId = 'INV-' + yr + '-' + Date.now().toString().slice(-4) + Math.floor(10 + Math.random() * 90);
                } while (blockedIds.has(invId));
            }

            const saleDateInput = document.getElementById('checkout-sale-date')?.value || document.getElementById('cart-sale-date')?.value;
            let finalSaleDate = new Date();
            if (saleDateInput) {
                const parts = saleDateInput.split('-').map(Number);
                if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
                    const now = new Date();
                    finalSaleDate = new Date(parts[0], parts[1] - 1, parts[2], now.getHours(), now.getMinutes(), now.getSeconds());
                }
            }

            const idempotencyKey = 'IDEMP-' + invId + '-' + Date.now();

            const saleRecord = {
                id: invId,
                invoiceId: invId,
                idempotencyKey: idempotencyKey,
                date: finalSaleDate.toISOString(),
                dateFormatted: finalSaleDate.toLocaleDateString('km-KH'),
                customerName: customerName,
                customerPhone: customerPhone,
                items: JSON.parse(JSON.stringify(POS.cart)),
                subtotal: subtotal,
                discount: discountVal,
                total: grandTotalUsd,
                totalUsd: grandTotalUsd,
                totalKhr: grandTotalKhr,
                profit: Math.max(0, grandTotalUsd - totalCost),
                paymentMethod: POS.currentPaymentMethod,
                paidUsd: isDebt ? totalDebtPaidUsd : (POS.currentPaymentMethod === 'cash' ? totalReceivedUsd : grandTotalUsd),
                paidAmount: isDebt ? totalDebtPaidUsd : grandTotalUsd,
                changeUsd: changeUsd,
                changeKhr: changeKhr,
                debt: isDebt ? remainingDebtUsd : 0,
                debtAmount: isDebt ? remainingDebtUsd : 0,
                debtRemaining: isDebt ? remainingDebtUsd : 0,
                debtSettled: isDebt ? (remainingDebtUsd <= 0.001) : false,
                debtDueDate: debtDueDate,
                debtNote: debtNote,
                cashier: cashierName,
                telegramAlertSent: false
            };

            // 2. Snapshot original inventory before deducting to prevent duplicate stock deduction on retry
            const originalProducts = JSON.parse(JSON.stringify(Storage.getProducts() || []));
            const allProducts = Storage.getProducts() || [];
            POS.cart.forEach(cartItem => {
                if (cartItem.isService) return;
                const p = allProducts.find(prod => prod.id === cartItem.productId);
                if (p) {
                    if (p.hasImei && cartItem.imei) {
                        const imeiRecord = (p.imeis || []).find(i => i.imei === cartItem.imei);
                        if (imeiRecord) {
                            imeiRecord.status = 'sold';
                            imeiRecord.soldDate = finalSaleDate.toISOString();
                            imeiRecord.soldPrice = cartItem.price;
                            imeiRecord.invoiceId = saleRecord.invoiceId;
                        }
                    } else if (!p.hasImei && p.category !== 'cat-services') {
                        p.stockCount = Math.max(0, (p.stockCount || 0) - cartItem.quantity);
                    }
                }
            });
            Storage.saveProducts(allProducts);

            // 3. Save Sale to History & Permanent Vault & IndexedDB
            const sales = Storage.getSales();
            sales.push(saleRecord);
            sales.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
            Storage.saveSales(sales);
            if (Storage.appendSaleToVault) Storage.appendSaleToVault(saleRecord);

            // Await IndexedDB transaction write
            try {
                if (Storage.saveSaleToIndexedDB) {
                    await Storage.saveSaleToIndexedDB(saleRecord);
                }
            } catch (idbErr) {
                console.warn('[POS] IndexedDB save warning:', idbErr);
            }

            // Verification handshake: Confirm persistent storage write success before clearing cart or declaring success!
            const isSaved = Storage.verifySalePersisted ? (await Storage.verifySalePersisted(saleRecord.id)) : true;
            if (!isSaved) {
                // Roll back inventory deduction so retrying does not deduct stock twice
                Storage.saveProducts(originalProducts);
                POS.renderProducts();
                console.error('[POS] Database persistence verification failed for sale #' + saleRecord.id);
                App.showToast('បរាជ័យក្នុងការកត់ត្រាការលក់! សូមព្យាយាមរក្សាទុកម្តងទៀត', 'error');
                return;
            }

            // 3.b Server Persistence Handshake
            let serverConfirmed = false;
            try {
                if (Storage.pushSaleToServer) {
                    const serverResult = await Storage.pushSaleToServer(saleRecord);
                    if (serverResult && serverResult.success) {
                        serverConfirmed = true;
                        saleRecord.serverSynced = true;
                    }
                }
            } catch (_) { }

            // If server push failed or offline, durably queue full sale payload
            if (!serverConfirmed && Storage.addToRetryQueue) {
                Storage.addToRetryQueue(saleRecord);
            }

            // 4. Update Customer CRM & Debt
            const hasRealPhone = customerPhone && customerPhone !== '012 xxx xxx';
            const hasRealName = customerName && customerName !== 'អតិថិជនទូទៅ';
            if (hasRealPhone || hasRealName) {
                const customers = Storage.getCustomers();
                let cust = customers.find(c =>
                    (hasRealPhone && c.phone && c.phone.trim() === customerPhone.trim()) ||
                    (hasRealName && c.name && c.name.trim() === customerName.trim())
                );
                const isDebt = POS.currentPaymentMethod === 'debt';
                const actualDebtToAdd = isDebt ? remainingDebtUsd : 0;
                if (!cust) {
                    cust = {
                        id: 'cust-' + Date.now(),
                        name: customerName,
                        phone: hasRealPhone ? customerPhone : '',
                        address: '',
                        debt: actualDebtToAdd,
                        debtAmount: actualDebtToAdd,
                        totalSpent: grandTotalUsd,
                        totalPurchased: grandTotalUsd,
                        totalOrders: 1,
                        ordersCount: 1,
                        lastPurchaseDate: finalSaleDate.toISOString()
                    };
                    customers.unshift(cust);
                } else {
                    cust.totalSpent = (cust.totalSpent || cust.totalPurchased || 0) + grandTotalUsd;
                    cust.totalPurchased = cust.totalSpent;
                    cust.totalOrders = (cust.totalOrders || cust.ordersCount || 0) + 1;
                    cust.ordersCount = cust.totalOrders;
                    cust.lastPurchaseDate = finalSaleDate.toISOString();
                    if (isDebt) {
                        cust.debt = (cust.debt || cust.debtAmount || 0) + actualDebtToAdd;
                        cust.debtAmount = cust.debt;
                    }
                    if (!cust.phone && hasRealPhone) cust.phone = customerPhone;
                    if (!cust.name && hasRealName) cust.name = customerName;
                }
                Storage.saveCustomers(customers);
            }

            // 5. Generate Thermal Receipt
            POS.lastSale = saleRecord;
            POS.lastSaleId = saleRecord.id;
            POS.renderReceipt(saleRecord);

            // 6. Close Checkout Modal & Open Receipt Modal
            const checkoutModal = document.getElementById('checkout-modal');
            if (checkoutModal) checkoutModal.classList.remove('show');

            const receiptModal = document.getElementById('receipt-modal');
            if (receiptModal) receiptModal.classList.add('show');

            // 7. Clear Cart & Form ONLY AFTER PERSISTENCE HANDSHAKE
            POS.cart = [];
            if (custNameInput) custNameInput.value = '';
            if (custPhoneInput) custPhoneInput.value = '';
            if (debtCustNameInput) debtCustNameInput.value = '';
            if (debtCustPhoneInput) debtCustPhoneInput.value = '';
            const debtPaidUsdInput = document.getElementById('debt-paid-usd');
            if (debtPaidUsdInput) debtPaidUsdInput.value = '';
            const debtPaidKhrInput = document.getElementById('debt-paid-khr');
            if (debtPaidKhrInput) debtPaidKhrInput.value = '';
            const debtDueDateInput = document.getElementById('debt-due-date');
            if (debtDueDateInput) debtDueDateInput.value = '';
            const debtNoteInput = document.getElementById('debt-note');
            if (debtNoteInput) debtNoteInput.value = '';
            if (discountInput) discountInput.value = '0';
            const saleDateInputReset = document.getElementById('cart-sale-date');
            if (saleDateInputReset) {
                saleDateInputReset.value = new Date().toISOString().slice(0, 10);
                const btnT = document.getElementById('btn-cart-date-today');
                const btnY = document.getElementById('btn-cart-date-yesterday');
                if (btnT) btnT.classList.add('active');
                if (btnY) btnY.classList.remove('active');
            }
            POS.updateCartUI();
            POS.renderProducts();

            // 8. Sound & Toast
            App.playBeep();
            if (serverConfirmed) {
                App.showToast(`ការលក់បានជោគជ័យ និងរក្សាទុកជាអចិន្ត្រៃយ៍! (#${saleRecord.invoiceId})`, 'success');
            } else {
                App.showToast(`បានកត់ត្រាក្នុងម៉ាស៊ីន (Offline) - រង់ចាំភ្ជាប់ Server (#${saleRecord.invoiceId})`, 'warning');
            }

            // 9. Send Telegram Bot Notification via secure Server API (prevent duplicate alerts on retry)
            if (serverConfirmed && !saleRecord.telegramAlertSent) {
                POS.sendTelegramSaleNotification(saleRecord);
                saleRecord.telegramAlertSent = true;
            }

            // 10. Refresh other tabs
            if (window.Finance) {
                Finance.updateDashboardKPIs();
                if (Finance.renderCustomers) Finance.renderCustomers();
            }
            if (window.Reports) {
                Reports.updateKPIs();
                Reports.renderTransactionHistory();
                Reports.renderTopModels();
            }
            if (window.SalesLedger && SalesLedger.render) {
                SalesLedger.render();
            }
        } finally {
            POS.isCompletingSale = false;
        }
    },

    sendTelegramSaleNotification: async function (saleRecord) {
        if (!saleRecord) return;
        try {
            const settings = Storage.getSettings();
            if (settings.telegramAlertEnabled === false) return;

            // Route via secure Server API endpoint to keep token completely off frontend JS
            const notifyUrl = Storage.getApiUrl ? Storage.getApiUrl('/api/telegram-notify') : '/api/telegram-notify';
            const res = await fetch(notifyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Mhaly-Client': 'POS'
                },
                body: JSON.stringify({ saleRecord })
            }).catch(() => null);

            if (res && res.ok) {
                saleRecord.telegramAlertSent = true;
            } else if (settings.telegramBotToken && settings.telegramChatId) {
                // Direct fallback for Netlify / Static hosting without Node server
                try {
                    const invoiceNo = saleRecord.invoiceId || saleRecord.id;
                    const itemsStr = (saleRecord.items || []).map(i => `• ${i.name} (${i.qty} x $${Number(i.price || 0).toFixed(2)})`).join('\n');
                    const text = `🔔 <b>ការលក់ថ្មី (MHALY SHOP POS)</b>\n━━━━━━━━━━━━━━━━━━━━\n🧾 វិក្កយបត្រ: <b>${invoiceNo}</b>\n👤 អតិថិជន: ${saleRecord.customerName || 'ទូទៅ'}\n📦 ទំនិញ:\n${itemsStr}\n💵 សរុប: <b>$${Number(saleRecord.totalUsd || saleRecord.total || 0).toFixed(2)}</b>\n💳 បង់ជា: ${saleRecord.paymentMethod || 'CASH'}\n📅 កាលបរិច្ឆេទ: ${saleRecord.date || new Date().toLocaleString()}`;
                    await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: settings.telegramChatId,
                            text: text,
                            parse_mode: 'HTML'
                        })
                    }).catch(() => null);
                    saleRecord.telegramAlertSent = true;
                } catch (_) {}
            }
        } catch (e) {
            console.warn('[Telegram Notification Error]', e.message);
        }
    },

    // Show an existing sale's receipt in the receipt modal (used by Reports, Finance, Warranty)
    showReceipt: function (sale) {
        if (!sale) return;
        POS.renderReceipt(sale);
        const receiptModal = document.getElementById('receipt-modal');
        if (receiptModal) receiptModal.classList.add('show');
    },

    renderReceipt: function (sale) {
        const container = document.getElementById('printable-receipt');
        if (!container) return;

        const settings = Storage.getSettings();
        const rate = settings.exchangeRate || 4100;

        container.innerHTML = `
            <div class="receipt-header">
                <div class="receipt-logo-emblem">💵 MHALY SHOP 📱</div>
                <h3 class="receipt-shop-name">${settings.shopName || 'MHALY SHOP'}</h3>
                <p class="receipt-shop-sub">${settings.shopSlogan || 'ប្រព័ន្ធគ្រប់គ្រងការលក់ទូរស័ព្ទដៃ'}</p>
                <div class="receipt-contact">
                    <span><i class="fa-solid fa-phone"></i> ${settings.phone1 || '012 888 999'} / ${settings.phone2 || ''}</span><br>
                    <span><i class="fa-solid fa-location-dot"></i> ${settings.address || 'រាជធានីភ្នំពេញ'}</span>
                </div>
            </div>

            <div class="receipt-divider"></div>

            <div class="receipt-meta">
                <div class="meta-row">
                    <span>វិក្កយបត្រ (Invoice):</span>
                    <strong>#${sale.invoiceId}</strong>
                </div>
                <div class="meta-row">
                    <span>កាលបរិច្ឆេទ (Date):</span>
                    <span>${new Date(sale.date).toLocaleString('km-KH')}</span>
                </div>
                <div class="meta-row">
                    <span>អ្នកលក់ (Cashier):</span>
                    <span>${sale.cashier || 'Admin'}</span>
                </div>
                <div class="meta-row">
                    <span>អតិថិជន (Customer):</span>
                    <span>${sale.customerName} (${sale.customerPhone})</span>
                </div>
                <div class="meta-row">
                    <span>ការទូទាត់ (Method):</span>
                    <span>${sale.paymentMethod === 'cash' ? 'សាច់ប្រាក់ (Cash)' : sale.paymentMethod === 'khqr' ? 'ស្កេន KHQR' : 'ជំពាក់ (Credit)'}</span>
                </div>
            </div>

            <div class="receipt-divider"></div>

            <table class="receipt-table">
                <thead>
                    <tr>
                        <th style="text-align: left;">ទំនិញ / ម៉ូឌែល</th>
                        <th style="text-align: center;">ចំនួន</th>
                        <th style="text-align: right;">តម្លៃ ($)</th>
                    </tr>
                </thead>
                <tbody>
                    ${sale.items.map(it => `
                        <tr>
                            <td style="text-align: left;">
                                <div class="item-name">${it.name}</div>
                                ${it.hasImei ? `<div class="item-sub-imei">IMEI: ${it.imei}</div>` : ''}
                            </td>
                            <td style="text-align: center;">${it.quantity}</td>
                            <td style="text-align: right;">$${(it.price * it.quantity).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="receipt-divider"></div>

            <div class="receipt-totals">
                <div class="total-line">
                    <span>តម្លៃដើមសរុប (Subtotal):</span>
                    <span>$${sale.subtotal.toFixed(2)}</span>
                </div>
                ${sale.discount > 0 ? `
                <div class="total-line text-discount">
                    <span>បញ្ចុះតម្លៃ (Discount):</span>
                    <span>-$${sale.discount.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="total-line grand">
                    <span>ទឹកប្រាក់សរុប (Grand Total USD):</span>
                    <span>$${sale.total.toFixed(2)}</span>
                </div>
                <div class="total-line grand-khr">
                    <span>សរុបជាប្រាក់រៀល (Total KHR):</span>
                    <span>${(sale.totalKhr || Math.round(sale.total * rate)).toLocaleString()} ៛</span>
                </div>
                ${sale.paymentMethod === 'cash' ? `
                <div class="total-line">
                    <span>ប្រាក់ទទួល (Cash Paid):</span>
                    <span>$${(sale.paidUsd || sale.total).toFixed(2)}</span>
                </div>
                <div class="total-line">
                    <span>ប្រាក់អាប់ (Change):</span>
                    <span>$${(sale.changeUsd || 0).toFixed(2)} (${(sale.changeKhr || 0).toLocaleString()} ៛)</span>
                </div>
                ` : ''}
                ${(sale.paymentMethod === 'debt' || String(sale.paymentMethod).includes('debt')) ? `
                <div class="total-line" style="color: #38bdf8;">
                    <span>ប្រាក់បានបង់មុន (Paid Upfront):</span>
                    <span>$${(Number(sale.paidUsd) || 0).toFixed(2)}</span>
                </div>
                <div class="total-line" style="color: #f87171; font-weight: 700;">
                    <span>ប្រាក់នៅជំពាក់ (Remaining Debt):</span>
                    <span>$${(Number(sale.debtRemaining !== undefined ? sale.debtRemaining : (sale.debt || 0))).toFixed(2)}</span>
                </div>
                ${sale.debtDueDate ? `
                <div class="total-line" style="font-size: 11.5px; color: var(--text-muted);">
                    <span>ថ្ងៃសន្យាសង (Due Date):</span>
                    <span>${sale.debtDueDate}</span>
                </div>
                ` : ''}
                ` : ''}
            </div>

            <div class="receipt-divider"></div>

            <div class="receipt-footer">
                <p>🙏 សូមអរគុណដែលបានគាំទ្រ <b>${settings.shopName || 'MHALY SHOP'}</b>!</p>
                <p>ទំនិញមានការធានាត្រឹមត្រូវ សូមរក្សាទុកវិក្កយបត្រនេះ</p>
                <div class="receipt-barcode-visual">
                    *${sale.invoiceId}*
                </div>
            </div>
        `;
    },

    // =======================================================
    // QUICK CUSTOM SERVICE MODAL HANDLERS (សេវាកម្មរហ័ស)
    // =======================================================
    openQuickServiceModal: function () {
        const modal = document.getElementById('quick-service-modal');
        const nameInput = document.getElementById('quick-service-name');
        const priceInput = document.getElementById('quick-service-price');
        if (nameInput) nameInput.value = '';
        if (priceInput) priceInput.value = '';
        if (modal) {
            modal.classList.add('show');
            setTimeout(() => { if (nameInput) nameInput.focus(); }, 100);
        }
    },

    closeQuickServiceModal: function () {
        const modal = document.getElementById('quick-service-modal');
        if (modal) modal.classList.remove('show');
    },

    selectServicePreset: function (name, price) {
        const nameInput = document.getElementById('quick-service-name');
        const priceInput = document.getElementById('quick-service-price');
        if (nameInput) nameInput.value = name;
        if (priceInput) priceInput.value = Number(price).toFixed(2);
        if (priceInput) priceInput.focus();
    },

    submitQuickService: function () {
        const nameInput = document.getElementById('quick-service-name');
        const priceInput = document.getElementById('quick-service-price');
        const name = nameInput ? nameInput.value.trim() : '';
        const price = priceInput ? parseFloat(priceInput.value) : 0;

        if (!name) {
            App.showToast('សូមបញ្ចូលឈ្មោះសេវាកម្ម!', 'error');
            return;
        }
        if (isNaN(price) || price <= 0) {
            App.showToast('សូមបញ្ចូលតម្លៃសេវាឱ្យបានត្រឹមត្រូវ ($)!', 'error');
            return;
        }

        POS.addCustomServiceToCart(name, price);
    },

    addCustomServiceToCart: function (name, price) {
        POS.cart.push({
            cartId: 'srv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
            productId: 'custom-service-' + Date.now(),
            name: name,
            price: price,
            originalPrice: price,
            cost: 0, // $0 cost -> 100% net profit!
            quantity: 1,
            hasImei: false,
            isService: true
        });

        POS.updateCartUI();
        App.playBeep();
        App.showToast(`បានបញ្ចូលសេវាកម្ម "${name}" ($${price.toFixed(2)}) ទៅក្នុងកន្ត្រក!`, 'success');
        POS.closeQuickServiceModal();
    }
};

window.POS = POS;
