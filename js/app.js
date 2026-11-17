/**
 * MHALY SHOP - MAIN APP CONTROLLER
 * Routing, Navigation, Live Clock, Theme Switcher, Camera Scanner, Sound Synthesizer, Settings
 */

const App = {
    currentTab: 'dashboard-tab',
    cameraStream: null,
    audioCtx: null,

    init: function() {
        if (window.MhalyLicense && !window.MhalyLicense.isActivated()) {
            console.warn('[Mhaly Gatekeeper] POS blocked until license activated.');
            return;
        }
        App.initTabs();
        App.initLiveClock();
        App.initTheme();
        App.initPreferences();
        App.initAuth();
        App.initShortcutsAndSearch();
        App.initCameraScanner();
        App.initSettings();
        App.initMobileGuide();
        App.initServiceWorker();
        App.initPWABanner();
        
        // Initialize Submodules
        if (window.POS) POS.init();
        if (window.Inventory) Inventory.init();
        if (window.Warranty) Warranty.init();
        if (window.Reports) Reports.init();
        if (window.Finance) Finance.init();
        if (window.Purchases) Purchases.init();
        if (window.SalesLedger) SalesLedger.init();
        if (window.AIAdvisor) AIAdvisor.init();
        if (window.UIStyle) UIStyle.init();

        App.loadSettingsToUI();
        console.log('Mhaly Sales Manager Initialized Successfully.');
    },

    // Tab Navigation
    initTabs: function() {
        // Desktop Sidebar
        document.querySelectorAll('.sidebar-nav .nav-link').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                App.navigateToTab(tabId);
            });
        });

        // Mobile Bottom Navigation
        document.querySelectorAll('.mobile-bottom-nav .mobile-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                App.navigateToTab(tabId);
            });
        });

        // Mobile Sidebar & Overlay Controls
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const closeSidebarBtn = document.getElementById('btn-close-sidebar');

        const openSidebar = () => {
            if (sidebar) sidebar.classList.add('open');
            if (overlay) overlay.classList.add('show');
        };

        const closeSidebar = () => {
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('show');
        };

        if (mobileMenuToggle && sidebar) {
            mobileMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                if (sidebar.classList.contains('open')) {
                    closeSidebar();
                } else {
                    openSidebar();
                }
            });
        }

        if (overlay) {
            overlay.addEventListener('click', closeSidebar);
        }

        if (closeSidebarBtn) {
            closeSidebarBtn.addEventListener('click', closeSidebar);
        }

        // Restore active tab across page refresh / reload (default to dashboard-tab)
        const savedTab = (typeof localStorage !== 'undefined' && localStorage.getItem('mhaly_active_tab')) ? localStorage.getItem('mhaly_active_tab') : 'dashboard-tab';
        if (savedTab && document.getElementById(savedTab)) {
            App.navigateToTab(savedTab);
        }
    },

    navigateToTab: function(tabId) {
        if (!tabId) tabId = 'dashboard-tab';
        App.currentTab = tabId;
        try { localStorage.setItem('mhaly_active_tab', tabId); } catch (_) {}

        // Hide all tabs
        document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
        // Show target tab
        const target = document.getElementById(tabId);
        if (target) target.classList.add('active');

        // Update Desktop Sidebar Active State
        document.querySelectorAll('.sidebar-nav .nav-link').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tabId);
        });

        // Update Mobile Bottom Bar Active State
        document.querySelectorAll('.mobile-bottom-nav .mobile-nav-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tabId);
        });

        // Update Topbar Title
        const pageTitleEl = document.getElementById('page-title');
        const lang = App.getLanguage ? App.getLanguage() : 'km';
        const titlesKm = {
            'dashboard-tab': 'ផ្ទាំងគ្រប់គ្រងទូទៅ (Dashboard Overview)',
            'pos-tab': 'ផ្ទាំងគិតលុយ (POS System)',
            'inventory-tab': 'គ្រប់គ្រងទំនិញ & ស្តុក (Inventory)',
            'expenses-tab': 'គ្រប់គ្រងចំណូល / ចំណាយ (Income & Expense)',
            'customers-tab': 'គ្រប់គ្រងអតិថិជន (Customers & CRM)',
            'suppliers-tab': 'គ្រប់គ្រងអ្នកផ្គត់ផ្គង់ (Suppliers Directory)',
            'purchases-tab': 'គ្រប់គ្រងការទិញចូល & បំណុលអ្នកផ្គត់ផ្គង់ (Purchases)',
            'invoices-tab': 'គ្រប់គ្រងវិក្កយបត្រ (Invoices Archive)',
            'reports-tab': 'របាយការណ៍លក់ & ស្ថិតិប្រាក់ចំណេញ',
            'sales-ledger-tab': 'តារាងរបាយការណ៍លក់ & គណនាប្រាក់ចំណេញ',
            'ai-advisor-tab': 'Mhaly AI Advisor ✨ ទីប្រឹក្សាអាជីវកម្ម & ហិរញ្ញវត្ថុ',
            'ui-style-tab': 'ជ្រើសរើសម៉ូដទម្រង់ UI (UI Style Studio 🎨)',
            'settings-tab': 'ការកំណត់ហាង & ប្រព័ន្ធ Cloud',
            'warranty-tab': 'ត្រួតពិនិត្យការធានា (Warranty Checker)',
            'tradein-tab': 'ទិញចូល & វ៉ៃដូរទូរស័ព្ទមួយទឹក'
        };
        const titlesEn = {
            'dashboard-tab': 'Dashboard Overview',
            'pos-tab': 'POS Cashier System',
            'inventory-tab': 'Inventory & Stock Management',
            'expenses-tab': 'Income & Expense Management',
            'customers-tab': 'Customers & CRM',
            'suppliers-tab': 'Suppliers Directory',
            'purchases-tab': 'Purchases & Supplier Debt',
            'invoices-tab': 'Invoices Archive',
            'reports-tab': 'Sales Reports & Analytics',
            'sales-ledger-tab': 'Sales Ledger & Profit Spreadsheet',
            'ai-advisor-tab': 'Mhaly AI Advisor ✨ Smart Business Copilot',
            'ui-style-tab': 'UI Style Studio 🎨',
            'settings-tab': 'Store Settings & Cloud Sync',
            'warranty-tab': 'Warranty Checker',
            'tradein-tab': 'Trade-In / Buy-In Secondhand'
        };
        const titles = lang === 'en' ? titlesEn : titlesKm;
        if (pageTitleEl) pageTitleEl.innerText = titles[tabId] || 'Mhaly Shop';

        // Trigger dynamic view refresh if relevant
        if (window.Finance) {
            if (tabId === 'dashboard-tab') Finance.renderDashboard();
            else if (tabId === 'expenses-tab') Finance.renderExpenses();
            else if (tabId === 'customers-tab') Finance.renderCustomers();
            else if (tabId === 'suppliers-tab') Finance.renderSuppliers();
            else if (tabId === 'invoices-tab') Finance.renderInvoices();
        }
        if (window.Purchases && tabId === 'purchases-tab') {
            Purchases.render();
        }
        if (window.Inventory && tabId === 'inventory-tab') {
            Inventory.renderTable();
            Inventory.renderCategoryDropdowns();
        }
        if (window.POS && tabId === 'pos-tab') {
            POS.renderCategories();
            POS.renderProducts();
        }
        if (window.Reports && tabId === 'reports-tab') {
            Reports.render();
        }
        if (window.SalesLedger && tabId === 'sales-ledger-tab') {
            SalesLedger.render();
        }
        if (window.AIAdvisor && tabId === 'ai-advisor-tab') {
            AIAdvisor.render();
        }
        if (window.UIStyle && tabId === 'ui-style-tab') {
            UIStyle.render();
        }

        // Close sidebar if on mobile
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('show');
    },

    // =======================================================
    // CURRENCY & LANGUAGE PREFERENCES & I18N
    // =======================================================
    currency: 'USD',
    language: 'km',

    translations: {
        km: {
            dash_title: 'ផ្ទាំងគ្រប់គ្រងទូទៅ (Dashboard Overview)',
            dash_subtitle: 'ទិដ្ឋភាពទូទៅនៃអាជីវកម្ម ការលក់ ស្តុក ចំណូលចំណាយ និងបំណុលអតិថិជន',
            open_pos: 'បើកផ្ទាំងលក់ (POS)',
            today_sales: 'ការលក់ថ្ងៃនេះ (Today Sales)',
            gross_profit: 'ចំណេញដុលសរុប (Gross Profit)',
            stock_count: 'ទំនិញក្នុងស្តុក (Stock Count)',
            customer_debt: 'អតិថិជនជំពាក់ (Customer Debt)',
            quick_actions: 'ផ្លូវកាត់មុខងាររហ័ស (Quick Actions)',
            recent_sales: 'ការលក់ចុងក្រោយ (Recent Sales)',
            alerts: 'ស្តុកជិតអស់ / អស់ (Alerts)',
            sidebar_dashboard: 'Dashboard',
            sidebar_pos: 'ការលក់',
            sidebar_stock: 'ស្តុក',
            sidebar_expenses: 'ចំណូល / ចំណាយ',
            sidebar_customers: 'អតិថិជន',
            sidebar_suppliers: 'អ្នកផ្គត់ផ្គង់',
            sidebar_purchases: 'ការទិញចូល',
            sidebar_invoices: 'វិក្កយបត្រ',
            sidebar_reports: 'របាយការណ៍',
            sidebar_sales_ledger: 'តារាងរបាយការណ៍លក់',
            sidebar_settings: 'Settings'
        },
        en: {
            dash_title: 'Dashboard Overview',
            dash_subtitle: 'High-level business overview: sales, stock, expenses, and debts',
            open_pos: 'Open POS System',
            today_sales: "Today's Sales",
            gross_profit: 'Gross Profit',
            stock_count: 'Items in Stock',
            customer_debt: 'Customer Debt',
            quick_actions: 'Quick Actions',
            recent_sales: 'Recent Sales',
            alerts: 'Low Stock Alerts',
            sidebar_dashboard: 'Dashboard',
            sidebar_pos: 'POS Sales',
            sidebar_stock: 'Inventory',
            sidebar_expenses: 'Expenses',
            sidebar_customers: 'Customers',
            sidebar_suppliers: 'Suppliers',
            sidebar_purchases: 'Purchases',
            sidebar_invoices: 'Invoices',
            sidebar_reports: 'Reports',
            sidebar_sales_ledger: 'Sales Ledger',
            sidebar_settings: 'Settings'
        }
    },

    getCurrency: function() {
        return localStorage.getItem('mhaly_currency') || 'USD';
    },

    setCurrency: function(curr) {
        if (curr !== 'USD' && curr !== 'KHR') curr = 'USD';
        localStorage.setItem('mhaly_currency', curr);
        App.currency = curr;

        // Update active class on all currency buttons across UI
        document.querySelectorAll('.currency-toggle-pill .curr-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.curr === curr);
        });

        // Re-render views with new currency formatting
        if (window.Finance) Finance.renderDashboard();
        if (window.Reports) Reports.updateKPIs();
        if (window.SalesLedger) SalesLedger.render();

        const toastMsg = curr === 'KHR' ? 'បានប្តូររូបិយប័ណ្ណបង្ហាញជា៖ លុយរៀល (៛ KHR)' : 'បានប្តូររូបិយប័ណ្ណបង្ហាញជា៖ ដុល្លារ ($ USD)';
        App.showToast(toastMsg, 'success');
    },

    getLanguage: function() {
        return localStorage.getItem('mhaly_lang') || 'km';
    },

    setLanguage: function(lang) {
        if (lang !== 'km' && lang !== 'en') lang = 'km';
        localStorage.setItem('mhaly_lang', lang);
        App.language = lang;

        // Update active class on all language buttons across UI
        document.querySelectorAll('.lang-toggle-pill .lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

        // Apply translations
        App.applyTranslations();

        // Refresh views
        if (window.Finance) Finance.renderDashboard();

        const toastMsg = lang === 'km' ? 'បានប្តូរភាសាជា៖ ភាសាខ្មែរ 🇰🇭' : 'Language set to: English 🇬🇧';
        App.showToast(toastMsg, 'success');
    },

    applyTranslations: function() {
        const lang = App.getLanguage();
        const dict = App.translations[lang] || App.translations.km;

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (dict[key]) {
                el.innerText = dict[key];
            }
        });

        // Update Topbar Title for current active tab
        const pageTitleEl = document.getElementById('page-title');
        if (pageTitleEl && App.currentTab) {
            const titlesKm = {
                'dashboard-tab': 'ផ្ទាំងគ្រប់គ្រងទូទៅ (Dashboard Overview)',
                'pos-tab': 'ផ្ទាំងគិតលុយ (POS System)',
                'inventory-tab': 'គ្រប់គ្រងទំនិញ & ស្តុក (Inventory)',
                'expenses-tab': 'គ្រប់គ្រងចំណូល / ចំណាយ (Income & Expense)',
                'customers-tab': 'គ្រប់គ្រងអតិថិជន (Customers & CRM)',
                'suppliers-tab': 'គ្រប់គ្រងអ្នកផ្គត់ផ្គង់ (Suppliers Directory)',
                'purchases-tab': 'គ្រប់គ្រងការទិញចូល & បំណុលអ្នកផ្គត់ផ្គង់ (Purchases)',
                'invoices-tab': 'គ្រប់គ្រងវិក្កយបត្រ (Invoices Archive)',
                'reports-tab': 'របាយការណ៍លក់ & ស្ថិតិប្រាក់ចំណេញ',
                'sales-ledger-tab': 'តារាងរបាយការណ៍លក់ & គណនាប្រាក់ចំណេញ',
                'ai-advisor-tab': 'Mhaly AI Advisor ✨ ទីប្រឹក្សាអាជីវកម្ម & ហិរញ្ញវត្ថុ',
                'settings-tab': 'ការកំណត់ហាង & ប្រព័ន្ធ Cloud',
                'warranty-tab': 'ត្រួតពិនិត្យការធានា (Warranty Checker)',
                'tradein-tab': 'ទិញចូល & វ៉ៃដូរទូរស័ព្ទមួយទឹក'
            };
            const titlesEn = {
                'dashboard-tab': 'Dashboard Overview',
                'pos-tab': 'POS Cashier System',
                'inventory-tab': 'Inventory & Stock Management',
                'expenses-tab': 'Income & Expense Management',
                'customers-tab': 'Customers & CRM',
                'suppliers-tab': 'Suppliers Directory',
                'purchases-tab': 'Purchases & Supplier Debt',
                'invoices-tab': 'Invoices Archive',
                'reports-tab': 'Sales Reports & Analytics',
                'sales-ledger-tab': 'Sales Ledger & Profit Spreadsheet',
                'ai-advisor-tab': 'Mhaly AI Advisor ✨ Smart Business Copilot',
                'settings-tab': 'Store Settings & Cloud Sync',
                'warranty-tab': 'Warranty Checker',
                'tradein-tab': 'Trade-In / Buy-In Secondhand'
            };
            const titles = lang === 'en' ? titlesEn : titlesKm;
            pageTitleEl.innerText = titles[App.currentTab] || 'Mhaly Shop';
        }
    },

    initPreferences: function() {
        const savedCurr = App.getCurrency();
        const savedLang = App.getLanguage();

        App.currency = savedCurr;
        App.language = savedLang;

        document.querySelectorAll('.currency-toggle-pill .curr-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.curr === savedCurr);
        });
        document.querySelectorAll('.lang-toggle-pill .lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === savedLang);
        });

        App.applyTranslations();
    },

    // Live Clock & Date
    initLiveClock: function() {
        const timeEl = document.getElementById('live-datetime');
        const update = () => {
            const now = new Date();
            const dateStr = now.toLocaleDateString('km-KH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            if (timeEl) timeEl.innerText = `${dateStr} • ${timeStr}`;
        };
        update();
        setInterval(update, 1000);
    },

    // Theme Switcher (Obsidian Aurora vs Light Glass)
    initTheme: function() {
        const themeBtn = document.getElementById('btn-theme-toggle');
        const savedTheme = localStorage.getItem('mhaly_theme') || 'dark';

        if (savedTheme === 'light') {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            if (themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun" style="color: #f59e0b;"></i>';
        }

        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                if (document.body.classList.contains('light-theme')) {
                    document.body.classList.remove('light-theme');
                    document.body.classList.add('dark-theme');
                    themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
                    localStorage.setItem('mhaly_theme', 'dark');
                    App.showToast('បានប្តូរទៅ Dark Obsidian Theme', 'success');
                } else {
                    document.body.classList.remove('dark-theme');
                    document.body.classList.add('light-theme');
                    themeBtn.innerHTML = '<i class="fa-solid fa-sun" style="color: #f59e0b;"></i>';
                    localStorage.setItem('mhaly_theme', 'light');
                    App.showToast('បានប្តូរទៅ Light Theme', 'success');
                }
            });
        }
    },

    // Global Shortcuts & Search
    initShortcutsAndSearch: function() {
        const searchInput = document.getElementById('global-imei-search');

        // Global hotkey F2 to jump to search
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                if (searchInput) searchInput.focus();
            }
        });

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                // Filter POS products
                POS.searchQuery = val;
                POS.renderProducts();

                // If on another tab, switch to POS if typing
                if (val && App.currentTab !== 'pos-tab') {
                    App.navigateToTab('pos-tab');
                }
            });

            // Enter key on search: If exact IMEI matches, add directly!
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = searchInput.value.trim();
                    const products = Storage.getProducts();

                    for (const p of products) {
                        if (p.hasImei && p.imeis) {
                            const foundImei = p.imeis.find(i => i.imei === query && i.status === 'in_stock');
                            if (foundImei) {
                                POS.addToCart(p, foundImei);
                                searchInput.value = '';
                                POS.searchQuery = '';
                                POS.renderProducts();
                                return;
                            }
                        }
                    }
                }
            });
        }
    },

    // Camera Barcode/IMEI Scanner Engine
    scannerMode: 'pos', // 'pos' | 'stock-name' | 'stock-imei' | 'inventory-filter'
    cameraStream: null,
    scanInterval: null,
    lastScannedCode: '',
    lastScanTime: 0,

    initCameraScanner: function() {
        const scanBtn = document.getElementById('btn-quick-scan');
        const closeBtn = document.getElementById('btn-close-scanner-modal');
        const startCamBtn = document.getElementById('btn-start-camera');
        const snapBtn = document.getElementById('btn-snap-barcode');
        const snapBtnAlt = document.getElementById('btn-snap-barcode-alt');
        const fileInput = document.getElementById('scanner-file-input');
        const torchBtn = document.getElementById('btn-toggle-torch');
        const manualSubmit = document.getElementById('btn-manual-scan-submit');
        const manualInput = document.getElementById('manual-scan-val');

        if (scanBtn) {
            scanBtn.addEventListener('click', () => {
                App.openCameraScanner('pos');
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', App.closeCameraScanner);
        }

        if (startCamBtn) {
            startCamBtn.addEventListener('click', App.startCameraStream);
        }

        const triggerSnap = () => {
            if (fileInput) fileInput.click();
        };
        if (snapBtn) snapBtn.addEventListener('click', triggerSnap);
        if (snapBtnAlt) snapBtnAlt.addEventListener('click', triggerSnap);

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                    App.decodeBarcodeFromImageFile(file);
                    fileInput.value = '';
                }
            });
        }

        if (torchBtn) {
            torchBtn.addEventListener('click', App.toggleTorch);
        }

        if (manualSubmit && manualInput) {
            manualSubmit.addEventListener('click', () => {
                const code = manualInput.value.trim();
                if (code) {
                    App.handleScannedCode(code);
                    manualInput.value = '';
                }
            });
            manualInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    manualSubmit.click();
                }
            });
        }
    },

    cameraTorchActive: false,
    toggleTorch: async function() {
        if (!App.cameraStream) return;
        const track = App.cameraStream.getVideoTracks()[0];
        if (!track) return;
        try {
            App.cameraTorchActive = !App.cameraTorchActive;
            await track.applyConstraints({
                advanced: [{ torch: App.cameraTorchActive }]
            });
            const torchBtn = document.getElementById('btn-toggle-torch');
            if (torchBtn) {
                torchBtn.innerHTML = App.cameraTorchActive ? 
                    '<i class="fa-solid fa-bolt" style="color: #fbbf24;"></i> បិទពិល' : 
                    '<i class="fa-solid fa-bolt"></i> បើកពិល';
            }
        } catch (e) {
            console.warn('[Scanner] Torch not supported:', e);
        }
    },

    decodeBarcodeFromImageFile: function(file) {
        App.showToast('កំពុងវិភាគអានបាកូដ...', 'info');
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = async function() {
                let detectedText = null;

                // Priority 1: Native BarcodeDetector
                if ('BarcodeDetector' in window) {
                    try {
                        const formats = ['code_128', 'code_39', 'code_93', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'itf'];
                        const detector = new window.BarcodeDetector({ formats });
                        const barcodes = await detector.detect(img);
                        if (barcodes && barcodes.length > 0) {
                            detectedText = barcodes[0].rawValue ? barcodes[0].rawValue.trim() : '';
                        }
                    } catch (_) {}
                }

                // Priority 2: ZXing Universal Reader with 1D Hints
                if (!detectedText && window.ZXing && window.ZXing.BrowserMultiFormatReader) {
                    try {
                        const hints = new Map();
                        hints.set(window.ZXing.DecodeHintType.TRY_HARDER, true);
                        if (window.ZXing.BarcodeFormat) {
                            hints.set(window.ZXing.DecodeHintType.POSSIBLE_FORMATS, [
                                window.ZXing.BarcodeFormat.CODE_128,
                                window.ZXing.BarcodeFormat.EAN_13,
                                window.ZXing.BarcodeFormat.EAN_8,
                                window.ZXing.BarcodeFormat.CODE_39,
                                window.ZXing.BarcodeFormat.UPC_A,
                                window.ZXing.BarcodeFormat.UPC_E,
                                window.ZXing.BarcodeFormat.QR_CODE,
                                window.ZXing.BarcodeFormat.ITF,
                                window.ZXing.BarcodeFormat.CODE_93
                            ]);
                        }
                        const zReader = new window.ZXing.BrowserMultiFormatReader(hints);
                        const res = await zReader.decodeFromImageElement(img);
                        if (res) {
                            detectedText = typeof res.getText === 'function' ? res.getText().trim() : (res.text || '').trim();
                        }
                    } catch (_) {}
                }

                if (detectedText) {
                    App.handleScannedCode(detectedText);
                } else {
                    App.showToast('មិនអាចរកឃើញបាកូដទេ! សូមថតឱ្យចំ និងច្បាស់ល្អ ឬវាយដោយផ្ទាល់', 'warning');
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    openCameraScanner: function(mode = 'pos') {
        App.scannerMode = mode;
        const modal = document.getElementById('scanner-modal');
        const titleEl = document.getElementById('scanner-modal-title');
        const subtitleEl = document.getElementById('scanner-modal-subtitle');
        const manualLabel = document.getElementById('manual-scan-label');
        const manualInput = document.getElementById('manual-scan-val');

        if (mode === 'edit-barcode' || mode === 'stock-barcode') {
            if (titleEl) titleEl.innerText = 'ស្កេនកាមេរ៉ា បញ្ចូលបាកូដទំនិញ (Barcode)';
            if (subtitleEl) subtitleEl.innerText = 'ដាក់បាកូដនៅលើប្រអប់ទំនិញ ឬសម្ភារឱ្យចំប្រអប់កាមេរ៉ា';
            if (manualLabel) manualLabel.innerText = 'ឬវាយលេខបាកូដដោយផ្ទាល់៖';
            if (manualInput) manualInput.placeholder = 'បញ្ចូលលេខបាកូដ (ឧ. 8851234567890)...';
        } else if (mode === 'stock-name') {
            if (titleEl) titleEl.innerText = 'ស្កេនកាមេរ៉ា បញ្ចូលឈ្មោះទំនិញ / Barcode';
            if (subtitleEl) subtitleEl.innerText = 'ដាក់បាកូដនៅលើប្រអប់ទំនិញ ឬគ្រឿងបន្លាស់ដើម្បីស្រង់ឈ្មោះ';
            if (manualLabel) manualLabel.innerText = 'ឬវាយឈ្មោះទំនិញ / Barcode ដោយផ្ទាល់៖';
            if (manualInput) manualInput.placeholder = 'បញ្ចូល Barcode ឬឈ្មោះទំនិញ...';
        } else if (mode === 'stock-imei') {
            if (titleEl) titleEl.innerText = 'ស្កេនកាមេរ៉ា បញ្ចូលលេខ IMEI';
            if (subtitleEl) subtitleEl.innerText = 'ស្កេនបាកូដ IMEI លើប្រអប់ទូរស័ព្ទ (អាចស្កេនច្រើនជាប់គ្នា)';
            if (manualLabel) manualLabel.innerText = 'ឬវាយលេខ IMEI ដោយផ្ទាល់៖';
            if (manualInput) manualInput.placeholder = 'បញ្ចូលលេខ IMEI...';
        } else if (mode === 'inventory-filter') {
            if (titleEl) titleEl.innerText = 'ស្កេន IMEI ស្វែងរកក្នុងស្តុក';
            if (subtitleEl) subtitleEl.innerText = 'ស្កេនដើម្បីស្វែងរកទំនិញក្នុងស្តុក';
            if (manualLabel) manualLabel.innerText = 'ឬវាយ IMEI ដើម្បីស្វែងរក៖';
            if (manualInput) manualInput.placeholder = 'ស្វែងរក IMEI...';
        } else {
            // 'pos' mode
            if (titleEl) titleEl.innerText = 'ស្កេនទំនិញ ឬ IMEI ដើម្បីលក់ (POS Scan)';
            if (subtitleEl) subtitleEl.innerText = 'ដាក់ Barcode ឬ QR ឬ IMEI ឱ្យចំប្រអប់ដើម្បីបន្ថែមក្នុងកន្ត្រកភ្លាមៗ';
            if (manualLabel) manualLabel.innerText = 'ឬវាយលេខ IMEI / Barcode / ឈ្មោះទំនិញ៖';
            if (manualInput) manualInput.placeholder = 'បញ្ចូល Barcode ឬ IMEI ឬឈ្មោះទំនិញ...';
        }

        if (modal) modal.classList.add('show');
        App.startCameraStream();

        if (manualInput) {
            manualInput.value = '';
            setTimeout(() => manualInput.focus(), 300);
        }
    },

    closeCameraScanner: function() {
        const modal = document.getElementById('scanner-modal');
        if (modal) modal.classList.remove('show');
        App.stopCameraStream();
    },

    codeReader: null,

    startCameraStream: function() {
        const video = document.getElementById('scanner-video');
        const placeholder = document.getElementById('camera-placeholder');
        const laser = document.getElementById('scanner-laser');
        const torchBtn = document.getElementById('btn-toggle-torch');

        if (video) {
            video.setAttribute('playsinline', 'true');
            video.setAttribute('webkit-playsinline', 'true');
            video.muted = true;
            video.autoplay = true;
        }

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const startWithConstraints = (videoConstraints) => {
                return navigator.mediaDevices.getUserMedia({ video: videoConstraints })
                .then(stream => {
                    App.cameraStream = stream;
                    if (video) {
                        video.srcObject = stream;
                        video.style.display = 'block';
                        video.play().catch(() => {});
                    }
                    if (placeholder) placeholder.style.display = 'none';
                    if (laser) laser.style.display = 'block';

                    try {
                        const track = stream.getVideoTracks()[0];
                        if (track && track.getCapabilities) {
                            const capabilities = track.getCapabilities();
                            if (capabilities.torch && torchBtn) {
                                torchBtn.style.display = 'inline-flex';
                            }
                            const advanced = [];
                            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                                advanced.push({ focusMode: 'continuous' });
                            }
                            if (capabilities.exposureMode && capabilities.exposureMode.includes('continuous')) {
                                advanced.push({ exposureMode: 'continuous' });
                            }
                            if (advanced.length > 0) {
                                track.applyConstraints({ advanced }).catch(() => {});
                            }
                        }
                    } catch (e) {}

                    App.startBarcodeDetection(video);
                });
            };

            // 1. Try back-facing HD camera
            startWithConstraints({ facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } })
            .catch(() => {
                // 2. Try basic environment camera
                return startWithConstraints({ facingMode: 'environment' });
            })
            .catch(() => {
                // 3. Fallback to any default camera
                return startWithConstraints(true);
            })
            .catch(err => {
                console.warn('[Scanner] Live camera error:', err);
                if (placeholder) placeholder.style.display = 'block';
                if (video) video.style.display = 'none';
                if (laser) laser.style.display = 'none';
                App.showToast('មិនអាចបើកកាមេរ៉ាផ្ទាល់បានទេ! សូមចុច "ថតរូបបាកូដ" ឬវាយដោយផ្ទាល់', 'warning');
            });
        } else {
            console.warn('[Scanner] getUserMedia blocked on insecure HTTP or unsupported');
            App.showToast('Browser តម្រូវឱ្យប្រើ "ថតរូបបាកូដ" ដោយសារគ្មាន HTTPS', 'info');
            const fileInput = document.getElementById('scanner-file-input');
            if (fileInput) fileInput.click();
        }
    },

    stopCameraStream: function() {
        if (App.scanInterval) {
            clearInterval(App.scanInterval);
            App.scanInterval = null;
        }
        if (App.cameraStream) {
            App.cameraStream.getTracks().forEach(track => track.stop());
            App.cameraStream = null;
        }
        App.cameraTorchActive = false;
        const video = document.getElementById('scanner-video');
        const placeholder = document.getElementById('camera-placeholder');
        const laser = document.getElementById('scanner-laser');
        const torchBtn = document.getElementById('btn-toggle-torch');
        if (video) {
            video.srcObject = null;
            video.style.display = 'none';
        }
        if (laser) laser.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
        if (torchBtn) {
            torchBtn.style.display = 'none';
            torchBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> បើកពិល';
        }
    },

    startBarcodeDetection: function(video) {
        if (App.scanInterval) {
            clearInterval(App.scanInterval);
            App.scanInterval = null;
        }

        // Initialize Native BarcodeDetector if supported
        let nativeDetector = null;
        if ('BarcodeDetector' in window) {
            try {
                const formats = ['code_128', 'code_39', 'code_93', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'itf'];
                nativeDetector = new window.BarcodeDetector({ formats });
            } catch (e) {
                try {
                    nativeDetector = new window.BarcodeDetector();
                } catch (e2) {}
            }
        }

        // Initialize ZXing MultiFormat Reader with comprehensive 1D retail & IMEI formats
        let zxingReader = null;
        if (window.ZXing && window.ZXing.BrowserMultiFormatReader) {
            try {
                const hints = new Map();
                hints.set(window.ZXing.DecodeHintType.TRY_HARDER, true);
                if (window.ZXing.BarcodeFormat) {
                    hints.set(window.ZXing.DecodeHintType.POSSIBLE_FORMATS, [
                        window.ZXing.BarcodeFormat.CODE_128,
                        window.ZXing.BarcodeFormat.EAN_13,
                        window.ZXing.BarcodeFormat.EAN_8,
                        window.ZXing.BarcodeFormat.CODE_39,
                        window.ZXing.BarcodeFormat.UPC_A,
                        window.ZXing.BarcodeFormat.UPC_E,
                        window.ZXing.BarcodeFormat.QR_CODE,
                        window.ZXing.BarcodeFormat.ITF,
                        window.ZXing.BarcodeFormat.CODE_93
                    ]);
                }
                zxingReader = new window.ZXing.BrowserMultiFormatReader(hints);
            } catch (err) {
                console.warn('[Scanner] ZXing init warning:', err);
            }
        }

        // Reusable crop canvas for ultra-fast 1D center-area scanning
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });

        let isScanning = false;
        App.scanInterval = setInterval(async () => {
            if (isScanning || !App.cameraStream || !video || video.readyState < 2) return;
            if (video.videoWidth === 0 || video.videoHeight === 0) return;
            isScanning = true;

            try {
                let detectedText = null;

                // Priority 1: Native BarcodeDetector on full video
                if (nativeDetector) {
                    try {
                        const barcodes = await nativeDetector.detect(video);
                        if (barcodes && barcodes.length > 0) {
                            detectedText = barcodes[0].rawValue ? barcodes[0].rawValue.trim() : '';
                        }
                    } catch (e) {}
                }

                // Priority 2: ZXing on center 70% crop area (Instant 1D barcode & IMEI focus)
                if (!detectedText && zxingReader) {
                    try {
                        const vw = video.videoWidth;
                        const vh = video.videoHeight;
                        const cw = Math.min(vw, 640);
                        const ch = Math.min(vh, 480);
                        cropCanvas.width = cw;
                        cropCanvas.height = ch;
                        const sx = (vw - cw) / 2;
                        const sy = (vh - ch) / 2;
                        cropCtx.drawImage(video, sx, sy, cw, ch, 0, 0, cw, ch);

                        const res = zxingReader.decode(cropCanvas);
                        if (res) {
                            detectedText = typeof res.getText === 'function' ? res.getText().trim() : (res.text || '').trim();
                        }
                    } catch (e) {}
                }

                // Priority 3: Fallback ZXing on full video frame
                if (!detectedText && zxingReader) {
                    try {
                        const res = zxingReader.decode(video);
                        if (res) {
                            detectedText = typeof res.getText === 'function' ? res.getText().trim() : (res.text || '').trim();
                        }
                    } catch (e) {}
                }

                if (detectedText) {
                    const now = Date.now();
                    if (detectedText !== App.lastScannedCode || now - App.lastScanTime > 1800) {
                        App.lastScannedCode = detectedText;
                        App.lastScanTime = now;

                        const reticle = document.getElementById('scanner-reticle');
                        if (reticle) {
                            reticle.style.borderColor = '#10b981';
                            reticle.style.boxShadow = '0 0 20px #10b981';
                            setTimeout(() => {
                                reticle.style.borderColor = '';
                                reticle.style.boxShadow = '';
                            }, 400);
                        }

                        App.handleScannedCode(detectedText);
                    }
                }
            } catch (err) {
                console.warn('[Scanner] Frame decode error:', err);
            } finally {
                isScanning = false;
            }
        }, 150);
    },

    handleScannedCode: function(code) {
        if (!code) return;
        code = code.trim();
        App.playBeep();

        // 1. If scanning in Edit Stock -> Barcode
        if (App.scannerMode === 'edit-barcode') {
            const barcodeInput = document.getElementById('edit-prod-barcode');
            if (barcodeInput) {
                barcodeInput.value = code;
                barcodeInput.focus();
            }
            App.showToast(`បានបញ្ចូលបាកូដ៖ ${code}`, 'success');
            App.closeCameraScanner();
            return;
        }

        // 2. If scanning in Add Stock -> Barcode
        if (App.scannerMode === 'stock-barcode') {
            const barcodeInput = document.getElementById('new-prod-barcode');
            if (barcodeInput) {
                barcodeInput.value = code;
                barcodeInput.focus();
            }
            App.showToast(`បានបញ្ចូលបាកូដ៖ ${code}`, 'success');
            App.closeCameraScanner();
            return;
        }

        // 3. If scanning in Add Stock -> Product Name
        if (App.scannerMode === 'stock-name') {
            const nameInput = document.getElementById('new-prod-name');
            if (nameInput) {
                nameInput.value = code;
                nameInput.focus();
            }
            App.showToast(`បានស្កេនឈ្មោះទំនិញ៖ ${code}`, 'success');
            App.closeCameraScanner();
            return;
        }

        // 2. If scanning in Add Stock -> IMEI List
        if (App.scannerMode === 'stock-imei') {
            const imeiArea = document.getElementById('new-prod-imeis');
            if (imeiArea) {
                const cur = imeiArea.value.trim();
                const existing = cur ? cur.split(/[\n,]+/).map(s => s.trim()) : [];
                if (existing.includes(code)) {
                    App.showToast(`លេខ IMEI ${code} មានក្នុងប្រអប់រួចហើយ!`, 'warning');
                } else {
                    imeiArea.value = cur ? cur + ', ' + code : code;
                    App.showToast(`បានបន្ថែម IMEI: ${code} ចូលក្នុងបញ្ជី!`, 'success');
                }
            }
            // Keep scanner open for rapid multi-IMEI batch scanning!
            return;
        }

        // 3. If scanning in Inventory Search Filter
        if (App.scannerMode === 'inventory-filter') {
            const invSearch = document.getElementById('inventory-search-input');
            if (invSearch) {
                invSearch.value = code;
                if (window.Inventory) {
                    Inventory.searchQuery = code.toLowerCase();
                    Inventory.renderTable();
                }
            }
            App.navigateToTab('inventory-tab');
            App.showToast(`បានស្វែងរក៖ ${code}`, 'info');
            App.closeCameraScanner();
            return;
        }

        // 4. Default: POS Sale Mode (Search and Add to Cart)
        const products = Storage.getProducts();

        // A. First Check matching in-stock IMEI
        for (const p of products) {
            if (p.hasImei && p.imeis) {
                const foundImei = p.imeis.find(i => i.imei === code && i.status === 'in_stock');
                if (foundImei) {
                    POS.addToCart(p, foundImei);
                    App.navigateToTab('pos-tab');
                    App.showToast(`បានបញ្ចូល ${p.name} (IMEI: ${code}) ទៅក្នុងកន្ត្រក!`, 'success');
                    App.closeCameraScanner();
                    return;
                }
            }
        }

        // B. Check matching Product Barcode (Resilient & Exact match on Barcode)
        const lowerCode = code.trim().toLowerCase();
        const cleanCode = lowerCode.replace(/[^a-z0-9]/gi, '');
        const barcodeMatched = products.find(p => {
            if (!p.barcode) return false;
            const pb = String(p.barcode).trim().toLowerCase();
            return pb === lowerCode || pb.replace(/[^a-z0-9]/gi, '') === cleanCode;
        });
        if (barcodeMatched) {
            if (barcodeMatched.hasImei) {
                const availableImeis = (barcodeMatched.imeis || []).filter(i => 
                    i.status === 'in_stock' && !POS.cart.some(c => c.hasImei && c.imei === i.imei)
                );
                if (availableImeis.length === 1) {
                    POS.addToCart(barcodeMatched, availableImeis[0]);
                    App.navigateToTab('pos-tab');
                    App.showToast(`បានបញ្ចូល ${barcodeMatched.name} ទៅក្នុងកន្ត្រក!`, 'success');
                    App.closeCameraScanner();
                    return;
                } else if (availableImeis.length > 1) {
                    POS.selectedProductForImei = barcodeMatched;
                    POS.renderImeiOptions('');
                    const imeiModal = document.getElementById('imei-modal');
                    if (imeiModal) imeiModal.classList.add('show');
                    App.navigateToTab('pos-tab');
                    App.showToast(`សូមជ្រើសរើស IMEI សម្រាប់ ${barcodeMatched.name}`, 'info');
                    App.closeCameraScanner();
                    return;
                } else {
                    App.showToast(`${barcodeMatched.name} អស់ IMEI ក្នុងស្តុកហើយ!`, 'error');
                    App.closeCameraScanner();
                    return;
                }
            } else {
                if ((barcodeMatched.stockCount || 0) <= 0) {
                    App.showToast(`${barcodeMatched.name} អស់ពីស្តុកហើយ!`, 'error');
                    App.closeCameraScanner();
                    return;
                }
                POS.addToCart(barcodeMatched, null);
                App.navigateToTab('pos-tab');
                App.showToast(`បានបញ្ចូល ${barcodeMatched.name} ទៅក្នុងកន្ត្រក!`, 'success');
                App.closeCameraScanner();
                return;
            }
        }

        // C. Check matching Product ID, exact name, or partial name
        const matched = products.find(p => 
            p.id.toLowerCase() === lowerCode ||
            p.name.toLowerCase() === lowerCode ||
            p.name.toLowerCase().includes(lowerCode) ||
            (p.brand && p.brand.toLowerCase() === lowerCode)
        );

        if (matched) {
            if (matched.hasImei) {
                const availableImeis = (matched.imeis || []).filter(i => 
                    i.status === 'in_stock' && !POS.cart.some(c => c.hasImei && c.imei === i.imei)
                );
                if (availableImeis.length === 1) {
                    POS.addToCart(matched, availableImeis[0]);
                    App.navigateToTab('pos-tab');
                    App.showToast(`បានបញ្ចូល ${matched.name} ទៅក្នុងកន្ត្រក!`, 'success');
                    App.closeCameraScanner();
                    return;
                } else if (availableImeis.length > 1) {
                    POS.selectedProductForImei = matched;
                    POS.renderImeiOptions('');
                    const imeiModal = document.getElementById('imei-modal');
                    if (imeiModal) imeiModal.classList.add('show');
                    App.navigateToTab('pos-tab');
                    App.showToast(`សូមជ្រើសរើស IMEI សម្រាប់ ${matched.name}`, 'info');
                    App.closeCameraScanner();
                    return;
                } else {
                    App.showToast(`${matched.name} អស់ IMEI ក្នុងស្តុកហើយ!`, 'error');
                    App.closeCameraScanner();
                    return;
                }
            } else {
                if ((matched.stockCount || 0) <= 0) {
                    App.showToast(`${matched.name} អស់ពីស្តុកហើយ!`, 'error');
                    App.closeCameraScanner();
                    return;
                }
                POS.addToCart(matched, null);
                App.navigateToTab('pos-tab');
                App.showToast(`បានបញ្ចូល ${matched.name} ទៅក្នុងកន្ត្រក!`, 'success');
                App.closeCameraScanner();
                return;
            }
        }

        // C. If not found in stock:
        App.showToast(`មិនមានទំនិញ ឬ IMEI "${code}" ក្នុងស្តុកទេ!`, 'error');
        const posSearch = document.getElementById('pos-product-search-input');
        if (posSearch) {
            posSearch.value = code;
            POS.searchQuery = lowerCode;
            POS.renderProducts();
            const clearBtn = document.getElementById('btn-pos-clear-search');
            if (clearBtn) clearBtn.style.display = 'block';
        }
        App.navigateToTab('pos-tab');
        App.closeCameraScanner();
    },

    // Sound Synthesizer via Web Audio API (Crisp POS beep)
    playBeep: function() {
        try {
            if (!App.audioCtx) {
                App.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (App.audioCtx.state === 'suspended') {
                App.audioCtx.resume();
            }
            const osc = App.audioCtx.createOscillator();
            const gain = App.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, App.audioCtx.currentTime); // 1.2kHz beep
            gain.gain.setValueAtTime(0.15, App.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, App.audioCtx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(App.audioCtx.destination);
            osc.start();
            osc.stop(App.audioCtx.currentTime + 0.12);
        } catch (e) {
            // Ignore audio context block
        }
    },

    // Toast Notification System
    showToast: function(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    },

    // Settings & Cloud Module
    initSettings: function() {
        // Save Settings
        const saveBtn = document.getElementById('btn-save-settings');
        if (saveBtn) {
            saveBtn.addEventListener('click', App.handleSaveSettings);
        }

        // Manual Cloud Sync button
        const manualSyncBtn = document.getElementById('btn-manual-sync');
        if (manualSyncBtn) {
            manualSyncBtn.addEventListener('click', async () => {
                manualSyncBtn.disabled = true;
                manualSyncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> កំពុង Sync...';
                await Storage.pullFromServer(true);
                Storage.pushToServer();
                App.showToast('ធ្វើសមកាលកម្ម (Sync) ជាមួយ Cloud បានជោគជ័យ!', 'success');
                setTimeout(() => {
                    manualSyncBtn.disabled = false;
                    manualSyncBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Sync ឥឡូវនេះ';
                }, 1000);
            });
        }

        // Backup to JSON file
        const backupBtn = document.getElementById('btn-backup-data');
        if (backupBtn) {
            backupBtn.addEventListener('click', App.handleBackup);
        }

        // Server Snapshot button
        const serverSnapBtn = document.getElementById('btn-server-snapshot');
        if (serverSnapBtn) {
            serverSnapBtn.addEventListener('click', async () => {
                App.showToast('កំពុងបង្កើត Snapshot បម្រុងទុកលើ Server...', 'info');
                const res = await Storage.triggerServerSnapshot();
                if (res && res.success) {
                    App.showToast('បានបង្កើត Server Snapshot ជោគជ័យ! 📁', 'success');
                } else {
                    App.showToast('មិនអាចភ្ជាប់ Server បានទេ (សូមប្រាកដថាបានបើក Start Server)', 'warning');
                }
            });
        }

        // View Backups Modal
        const viewBackupsBtn = document.getElementById('btn-view-backups');
        const backupsModal = document.getElementById('backups-modal');
        const closeBackupsModalBtn = document.getElementById('close-backups-modal');
        if (viewBackupsBtn) {
            viewBackupsBtn.addEventListener('click', () => {
                App.openBackupsModal();
            });
        }
        if (closeBackupsModalBtn && backupsModal) {
            closeBackupsModalBtn.addEventListener('click', () => {
                backupsModal.classList.remove('show');
            });
        }

        const modalNewSnapBtn = document.getElementById('btn-modal-new-snapshot');
        if (modalNewSnapBtn) {
            modalNewSnapBtn.addEventListener('click', async () => {
                await Storage.triggerServerSnapshot();
                App.openBackupsModal();
                App.showToast('បានបង្កើត Snapshot ថ្មីជោគជ័យ!', 'success');
            });
        }

        // Emergency Undo Restore
        const emergencyUndoBtn = document.getElementById('btn-emergency-undo');
        if (emergencyUndoBtn) {
            emergencyUndoBtn.addEventListener('click', () => {
                if (confirm('តើអ្នកពិតជាចង់ស្តារទិន្នន័យត្រឡប់ទៅចំណុចសង្គ្រោះចុងក្រោយ (Emergency Undo Snapshot) មែនទេ?')) {
                    Storage.restoreEmergencyUndo((ok, snap) => {
                        if (ok) {
                            App.showToast('បានស្តារទិន្នន័យត្រឡប់ក្រោយដោយជោគជ័យ! កំពុងដំណើរការ...', 'success');
                            setTimeout(() => location.reload(), 900);
                        } else {
                            App.showToast('មិនមានចំណុចសង្គ្រោះបន្ទាន់ចាស់ទេ!', 'warning');
                        }
                    });
                }
            });
        }

        // Restore from JSON file
        const restoreBtn = document.getElementById('btn-restore-data');
        const fileInput = document.getElementById('file-restore-input');
        if (restoreBtn && fileInput) {
            restoreBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', App.handleRestoreFile);
        }

        // Reset Demo data permanently disabled for business security
        const resetBtn = document.getElementById('btn-reset-demo');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                App.showToast('មុខងារកំណត់ទិន្នន័យគំរូត្រូវបានចាក់សោសុវត្ថិភាព ដើម្បីការពារទិន្នន័យហាង!', 'warning');
            });
        }

        // Test Telegram Alert Button
        const testTelegramBtn = document.getElementById('btn-test-telegram');
        if (testTelegramBtn) {
            testTelegramBtn.addEventListener('click', async () => {
                const tokenInput = document.getElementById('setting-telegram-token');
                const chatInput = document.getElementById('setting-telegram-chatid');
                const token = tokenInput ? tokenInput.value.trim() : '';
                const chatId = chatInput ? chatInput.value.trim() : '';
                if (!token || !chatId) {
                    App.showToast('សូមបញ្ចូល Telegram Token និង Chat ID!', 'error');
                    return;
                }
                testTelegramBtn.disabled = true;
                testTelegramBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> កំពុងផ្ញើ...';

                try {
                    const text = 
`🔔 <b>សាកល្បងប្រព័ន្ធជូនដំណឹង Telegram (Mhaly Shop)</b>
━━━━━━━━━━━━━━━━━━
✅ <b>ស្ថានភាព:</b> ភ្ជាប់ជោគជ័យ 100%
⏰ <b>ពេលវេលា:</b> ${new Date().toLocaleTimeString('km-KH')} • ${new Date().toLocaleDateString('km-KH')}
🤖 <b>Bot Name:</b> @mhalyshop_alert_bot
━━━━━━━━━━━━━━━━━━
✨ រាល់ពេលលក់ដាច់វិក្កយបត្រថ្មី សារនឹងលោតចូលទីនេះភ្លាមៗ!`;

                    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
                    });
                    const data = await res.json();
                    if (data && data.ok) {
                        App.showToast('បានផ្ញើសារតេស្តទៅ Telegram Group ជោគជ័យ! 🎉', 'success');
                    } else {
                        App.showToast('បរាជ័យ: ' + (data.description || 'ពិនិត្យ Chat ID / Token'), 'error');
                    }
                } catch(e) {
                    App.showToast('មិនអាចផ្ញើបានទេ: ' + e.message, 'error');
                } finally {
                    testTelegramBtn.disabled = false;
                    testTelegramBtn.innerHTML = '<i class="fa-solid fa-paper-plane" style="color: #38bdf8;"></i> សាកល្បងផ្ញើសារតេស្ត (Test Telegram Alert)';
                }
            });
        }

        // Gemini API Key Visibility Toggle & Test
        const toggleGeminiEye = document.getElementById('btn-toggle-show-gemini-key');
        if (toggleGeminiEye) {
            toggleGeminiEye.addEventListener('click', () => {
                const keyInput = document.getElementById('setting-gemini-key');
                if (keyInput) {
                    const isPass = keyInput.type === 'password';
                    keyInput.type = isPass ? 'text' : 'password';
                    toggleGeminiEye.innerHTML = isPass ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
                }
            });
        }

        const testGeminiBtn = document.getElementById('btn-test-gemini-key');
        if (testGeminiBtn) {
            testGeminiBtn.addEventListener('click', async () => {
                const keyInput = document.getElementById('setting-gemini-key');
                const modelSelect = document.getElementById('setting-gemini-model');
                const statusEl = document.getElementById('gemini-key-status');
                const key = keyInput ? keyInput.value.trim() : '';
                const model = modelSelect ? modelSelect.value : 'gemini-1.5-flash';

                if (!key) {
                    App.showToast('សូមបញ្ចូល Google Gemini API Key ជាមុនសិន!', 'error');
                    return;
                }

                testGeminiBtn.disabled = true;
                testGeminiBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> កំពុងតេស្ត...';
                if (statusEl) statusEl.innerHTML = '<span style="color: #38bdf8;">កំពុងទាក់ទង Google Gemini AI...</span>';

                try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: 'Hello, respond with: OK' }] }]
                        })
                    });
                    const data = await res.json();
                    if (res.ok && data.candidates) {
                        App.showToast('តេស្តជោគជ័យ! Gemini API Key ត្រឹមត្រូវ 100% 🎉', 'success');
                        if (statusEl) statusEl.innerHTML = '<span style="color: #34d399;"><i class="fa-solid fa-circle-check"></i> Key ត្រឹមត្រូវ និងដំណើរការបានល្អ</span>';
                    } else {
                        const errMsg = data.error?.message || 'Key មិនត្រឹមត្រូវ';
                        App.showToast('បរាជ័យ៖ ' + errMsg, 'error');
                        if (statusEl) statusEl.innerHTML = `<span style="color: #f87171;"><i class="fa-solid fa-triangle-exclamation"></i> ${errMsg}</span>`;
                    }
                } catch (e) {
                    App.showToast('កំហុសតភ្ជាប់៖ ' + e.message, 'error');
                    if (statusEl) statusEl.innerHTML = `<span style="color: #f87171;">កំហុស៖ ${e.message}</span>`;
                } finally {
                    testGeminiBtn.disabled = false;
                    testGeminiBtn.innerHTML = '<i class="fa-solid fa-vial-circle-check" style="color: #34d399;"></i> សាកល្បងតេស្ត API Key';
                }
            });
        }

        // Test Scheduled Reports Buttons
        const testDailyBtn = document.getElementById('btn-test-daily-report');
        if (testDailyBtn) {
            testDailyBtn.addEventListener('click', async () => {
                testDailyBtn.disabled = true;
                const orig = testDailyBtn.innerHTML;
                testDailyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> កំពុងផ្ញើ...';
                try {
                    const chatEl = document.getElementById('setting-telegram-chatid');
                    if (chatEl && (chatEl.value.includes('t.me') || chatEl.value.includes('@') || !chatEl.value.startsWith('-100'))) {
                        chatEl.value = '-1004303225816';
                    }
                    if (window.TelegramReporter) {
                        const ok = await TelegramReporter.sendDailyReport(new Date(), true);
                        if (!ok && window.App && App.showToast) {
                            App.showToast('មិនអាចផ្ញើរបាយការណ៍បានទេ សូមពិនិត្យការតភ្ជាប់!', 'error');
                        }
                    }
                } catch (err) {
                    console.error('[btn-test-daily-report] Error:', err);
                    if (window.App && App.showToast) App.showToast('បញ្ហាផ្ញើរបាយការណ៍: ' + err.message, 'error');
                } finally {
                    testDailyBtn.disabled = false;
                    testDailyBtn.innerHTML = orig;
                }
            });
        }

        const testMonthlyBtn = document.getElementById('btn-test-monthly-report');
        if (testMonthlyBtn) {
            testMonthlyBtn.addEventListener('click', async () => {
                testMonthlyBtn.disabled = true;
                const orig = testMonthlyBtn.innerHTML;
                testMonthlyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> កំពុងផ្ញើ...';
                if (window.TelegramReporter) {
                    await TelegramReporter.sendMonthlyReport(undefined, undefined, true);
                }
                testMonthlyBtn.disabled = false;
                testMonthlyBtn.innerHTML = orig;
            });
        }

        const testYearlyBtn = document.getElementById('btn-test-yearly-report');
        if (testYearlyBtn) {
            testYearlyBtn.addEventListener('click', async () => {
                testYearlyBtn.disabled = true;
                const orig = testYearlyBtn.innerHTML;
                testYearlyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> កំពុងផ្ញើ...';
                if (window.TelegramReporter) {
                    await TelegramReporter.sendYearlyReport(undefined, true);
                }
                testYearlyBtn.disabled = false;
                testYearlyBtn.innerHTML = orig;
            });
        }

        const sendCustomDateBtn = document.getElementById('btn-send-custom-date-report');
        const customDateInput = document.getElementById('setting-telegram-custom-date');
        if (customDateInput && !customDateInput.value) {
            const yest = new Date();
            yest.setDate(yest.getDate() - 1);
            customDateInput.value = yest.toISOString().slice(0, 10);
        }
        if (sendCustomDateBtn) {
            sendCustomDateBtn.addEventListener('click', async () => {
                const targetDate = customDateInput ? customDateInput.value : '';
                if (!targetDate) {
                    App.showToast('សូមជ្រើសរើសថ្ងៃដែលត្រូវផ្ញើរបាយការណ៍!', 'warning');
                    return;
                }
                sendCustomDateBtn.disabled = true;
                const orig = sendCustomDateBtn.innerHTML;
                sendCustomDateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> កំពុងផ្ញើ...';
                try {
                    if (window.TelegramReporter) {
                        await TelegramReporter.sendDailyReport(targetDate, true);
                    }
                } finally {
                    sendCustomDateBtn.disabled = false;
                    sendCustomDateBtn.innerHTML = orig;
                }
            });
        }
    },

    loadSettingsToUI: function() {
        const settings = Storage.getSettings();
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };
        setVal('setting-shop-name', settings.shopName || 'MHALY SHOP');
        setVal('setting-shop-slogan', settings.shopSlogan || '');
        setVal('setting-shop-phone1', settings.phone1 || '');
        setVal('setting-shop-phone2', settings.phone2 || '');
        setVal('setting-shop-address', settings.address || '');
        setVal('setting-exchange-rate', settings.exchangeRate || 4100);
        setVal('setting-bakong-name', settings.bakongName || '');
        setVal('setting-bakong-id', settings.bakongId || '');
        setVal('setting-cloud-provider', settings.cloudProvider || 'firebase');
        setVal('setting-cloud-url', settings.cloudUrl || '');
        setVal('setting-cloud-key', settings.cloudKey || '');

        // Telegram settings
        const teleEnabledEl = document.getElementById('setting-telegram-enabled');
        if (teleEnabledEl) teleEnabledEl.checked = settings.telegramAlertEnabled !== false;
        
        const officialBotToken = '8804957362:AAHn05zmESvxluRBjEEeucYzduBYbYHfua0';
        const officialChatId = '-1004303225816';
        let safeToken = (settings.telegramBotToken && settings.telegramBotToken.length >= 25) ? settings.telegramBotToken : officialBotToken;
        let safeChatId = settings.telegramChatId ? String(settings.telegramChatId).trim() : '';
        if (!safeChatId || safeChatId.includes('t.me') || safeChatId.includes('@') || !safeChatId.startsWith('-100')) {
            safeChatId = officialChatId;
        }
        setVal('setting-telegram-token', safeToken);
        setVal('setting-telegram-chatid', safeChatId);

        // AI Scanner settings
        setVal('setting-gemini-key', settings.geminiApiKey || '');
        setVal('setting-gemini-model', settings.geminiModel || 'gemini-1.5-flash');

        // Display rate in sidebar
        const dispRate = document.getElementById('display-rate');
        if (dispRate) dispRate.innerText = `${(settings.exchangeRate || 4100).toLocaleString()} ៛`;

        // Update Data Shield Counts
        const prods = Storage.getProducts() || [];
        const sales = Storage.getSales() || [];
        const prodCountEl = document.getElementById('shield-prod-count');
        const saleCountEl = document.getElementById('shield-sale-count');
        if (prodCountEl) prodCountEl.innerText = prods.length;
        if (saleCountEl) saleCountEl.innerText = sales.length;
    },

    handleSaveSettings: function() {
        const getVal = (id, def = '') => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : def;
        };

        const teleEnabledEl = document.getElementById('setting-telegram-enabled');
        const officialBotToken = '8804957362:AAHn05zmESvxluRBjEEeucYzduBYbYHfua0';
        const officialChatId = '-1004303225816';

        let savedChatId = getVal('setting-telegram-chatid', officialChatId);
        if (!savedChatId || savedChatId.includes('t.me') || savedChatId.includes('@') || !savedChatId.startsWith('-100')) {
            savedChatId = officialChatId;
            setVal('setting-telegram-chatid', savedChatId);
        }
        let savedToken = getVal('setting-telegram-token', '');
        if (!savedToken || savedToken.length < 25) {
            savedToken = officialBotToken;
            setVal('setting-telegram-token', savedToken);
        }

        const updated = {
            shopName: getVal('setting-shop-name', 'MHALY SHOP') || 'MHALY SHOP',
            shopSlogan: getVal('setting-shop-slogan'),
            phone1: getVal('setting-shop-phone1'),
            phone2: getVal('setting-shop-phone2'),
            address: getVal('setting-shop-address'),
            exchangeRate: parseFloat(getVal('setting-exchange-rate', '4100')) || 4100,
            bakongName: getVal('setting-bakong-name'),
            bakongId: getVal('setting-bakong-id'),
            cloudProvider: getVal('setting-cloud-provider', 'firebase'),
            cloudUrl: getVal('setting-cloud-url'),
            cloudKey: getVal('setting-cloud-key'),
            telegramAlertEnabled: teleEnabledEl ? teleEnabledEl.checked : true,
            telegramBotToken: savedToken,
            telegramChatId: savedChatId,
            telegramAutoScheduleEnabled: false,
            telegramScheduleTime: '',
            geminiApiKey: document.getElementById('setting-gemini-key') ? getVal('setting-gemini-key', '') : ((Storage.getSettings() || {}).geminiApiKey || ''),
            geminiModel: document.getElementById('setting-gemini-model') ? getVal('setting-gemini-model', 'gemini-2.0-flash') : ((Storage.getSettings() || {}).geminiModel || 'gemini-2.0-flash')
        };

        Storage.saveSettings(updated);
        Storage.pushToServer();

        // Update sidebar rate
        const dispRate = document.getElementById('display-rate');
        if (dispRate) dispRate.innerText = `${updated.exchangeRate.toLocaleString()} ៛`;

        // Refresh UI
        if (window.POS) {
            POS.renderProducts();
            POS.updateCartUI();
        }
        if (window.Reports && Reports.updateKPIs) {
            Reports.updateKPIs();
        }
        App.showToast('បានរក្សាទុកការកំណត់ហាង និងតភ្ជាប់ Cloud ជោគជ័យ!', 'success');
    },

    handleBackup: function() {
        const backupData = {
            version: '2.0.0',
            exportedAt: new Date().toISOString(),
            products: Storage.getProducts(),
            categories: Storage.getCategories(),
            sales: Storage.getSales(),
            tradeins: Storage.getTradeIns(),
            expenses: Storage.getExpenses(),
            customers: Storage.getCustomers(),
            suppliers: Storage.getSuppliers(),
            purchases: Storage.getPurchases(),
            settings: Storage.getSettings(),
            users: Storage.getUsers()
        };

        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `mhaly_backup_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        App.showToast('បានទាញយក Backup ទិន្នន័យគ្រប់មុខទាំងអស់ជោគជ័យ!', 'success');
    },

    handleRestoreFile: function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                // Pre-action safety snapshot before overwriting
                Storage.createPreActionSnapshot('pre_restore');

                if (Array.isArray(parsed.products)) Storage.safeSetItem('mhaly_products', parsed.products);
                if (Array.isArray(parsed.categories)) Storage.safeSetItem('mhaly_categories', parsed.categories);
                if (Array.isArray(parsed.sales)) Storage.safeSetItem('mhaly_sales', parsed.sales);
                if (Array.isArray(parsed.tradeins)) Storage.safeSetItem('mhaly_tradeins', parsed.tradeins);
                if (Array.isArray(parsed.expenses)) Storage.safeSetItem('mhaly_expenses', parsed.expenses);
                if (Array.isArray(parsed.customers)) Storage.safeSetItem('mhaly_customers', parsed.customers);
                if (Array.isArray(parsed.suppliers)) Storage.safeSetItem('mhaly_suppliers', parsed.suppliers);
                if (Array.isArray(parsed.purchases)) Storage.safeSetItem('mhaly_purchases', parsed.purchases);
                if (Array.isArray(parsed.users)) Storage.safeSetItem('mhaly_users', parsed.users);
                if (parsed.settings && typeof parsed.settings === 'object') Storage.safeSetItem('mhaly_settings', parsed.settings);

                Storage.saveToIndexedDB();

                if (window.Storage && Storage.pushToServer) {
                    Storage.pushToServer();
                }

                App.showToast('បាន Restore ទិន្នន័យជោគជ័យ! ប្រព័ន្ធបានបង្កើតចំណុចសង្គ្រោះ Undo ដោយស្វ័យប្រវត្តិ។', 'success');
                setTimeout(() => location.reload(), 900);
            } catch (err) {
                App.showToast('ឯកសារ Backup មិនត្រឹមត្រូវទេ!', 'error');
            }
        };
        reader.readAsText(file);
    },

    openBackupsModal: async function() {
        const modal = document.getElementById('backups-modal');
        const container = document.getElementById('backups-list-container');
        if (!modal || !container) return;

        modal.classList.add('show');
        container.innerHTML = '<div style="padding: 30px; text-align: center; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> កំពុងទាញយកបញ្ជី Backups ពី Server...</div>';

        const backups = await Storage.fetchServerBackups();
        if (!backups || backups.length === 0) {
            container.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #94a3b8;">
                    <i class="fa-solid fa-folder-open" style="font-size: 36px; margin-bottom: 10px; color: #64748b;"></i>
                    <p>មិនទាន់មានឯកសារ Backup លើ Server ក្នុង folder backups/ ឡើយ។</p>
                    <button class="btn-primary" onclick="Storage.triggerServerSnapshot().then(() => App.openBackupsModal())" style="margin-top: 10px;">
                        <i class="fa-solid fa-camera"></i> បង្កើត Backup ឥឡូវនេះ
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = backups.map(b => {
            const kb = (b.sizeBytes / 1024).toFixed(1);
            const dateStr = b.mtime ? new Date(b.mtime).toLocaleString('km-KH') : b.filename;
            const isDaily = b.filename.startsWith('daily_');
            const isPreSafety = b.filename.startsWith('pre_restore');
            const tag = isDaily ? '<span style="background: rgba(16,185,129,0.2); color:#34d399; font-size:11px; padding:2px 8px; border-radius:12px;">Daily</span>' :
                        isPreSafety ? '<span style="background: rgba(245,158,11,0.2); color:#fbbf24; font-size:11px; padding:2px 8px; border-radius:12px;">Safety Point</span>' :
                        '<span style="background: rgba(56,189,248,0.2); color:#38bdf8; font-size:11px; padding:2px 8px; border-radius:12px;">Auto</span>';

            return `
                <div class="backup-item-card">
                    <div>
                        <div class="backup-info-title">
                            <i class="fa-solid fa-file-shield" style="color: #38bdf8;"></i>
                            <span>${b.filename}</span>
                            ${tag}
                        </div>
                        <div class="backup-info-meta">
                            <span><i class="fa-regular fa-clock"></i> ${dateStr}</span>
                            <span><i class="fa-solid fa-box"></i> ${b.productCount || 0} មុខ</span>
                            <span><i class="fa-solid fa-file-invoice"></i> ${b.salesCount || 0} វិក្កយបត្រ</span>
                            <span><i class="fa-solid fa-hard-drive"></i> ${kb} KB</span>
                        </div>
                    </div>
                    <div class="backup-actions-btns">
                        <button class="btn-mini-restore" onclick="App.handleServerRestore('${b.filename}')">
                            <i class="fa-solid fa-rotate-left"></i> Restore យកកំណែនេះ
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    handleServerRestore: async function(filename) {
        if (!confirm(`តើអ្នកពិតជាចង់ Restore ទិន្នន័យពីឯកសារ "${filename}" មែនទេ?\n(ប្រព័ន្ធនឹងបង្កើត Safety Backup នៃទិន្នន័យបច្ចុប្បន្នជាមុនដោយស្វ័យប្រវត្តិ)`)) {
            return;
        }
        App.showToast('កំពុងដំណើរការ Restore ពី Server...', 'info');
        const res = await Storage.restoreServerBackup(filename);
        if (res && res.success) {
            App.showToast('បាន Restore ជោគជ័យ! កំពុង reload ទិន្នន័យថ្មី...', 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            App.showToast('Restore បរាជ័យ: ' + (res.error || 'Server error'), 'error');
        }
    },

    // Mobile Guide Modal Controls
    openMobileGuideModal: function() {
        const modal = document.getElementById('mobile-guide-modal');
        if (modal) modal.classList.add('show');
    },

    closeMobileGuideModal: function() {
        const modal = document.getElementById('mobile-guide-modal');
        if (modal) modal.classList.remove('show');
    },

    initMobileGuide: function() {
        const btn = document.getElementById('btn-open-mobile-guide');
        const closeBtn = document.getElementById('btn-close-mobile-guide-modal');
        const modal = document.getElementById('mobile-guide-modal');

        if (btn) btn.addEventListener('click', App.openMobileGuideModal);
        if (closeBtn) closeBtn.addEventListener('click', App.closeMobileGuideModal);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) App.closeMobileGuideModal();
            });
        }
    },

    // Progressive Web App (PWA) Service Worker Registration
    initServiceWorker: function() {
        if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').then((reg) => {
                    console.log('Mhaly Shop PWA ServiceWorker Active:', reg.scope);
                    try { reg.update(); } catch (e) {}
                }).catch((err) => {
                    console.log('ServiceWorker not registered:', err);
                });
            });
        }
    },

    deferredPrompt: null,

    // PWA Install Banner Handler
    initPWABanner: function() {
        const banner = document.getElementById('pwa-install-banner');
        const installBtn = document.getElementById('btn-pwa-install');
        const closeBtn = document.getElementById('btn-pwa-close');

        // Check if already in standalone full-screen app mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        if (isStandalone) {
            if (banner) banner.style.display = 'none';
            return;
        }

        // Android / Chrome beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            App.deferredPrompt = e;
            if (banner && sessionStorage.getItem('pwa_banner_closed') !== 'true') {
                banner.style.display = 'flex';
            }
        });

        // Mobile browsers (iOS Safari or Chrome)
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile && !isStandalone && sessionStorage.getItem('pwa_banner_closed') !== 'true') {
            setTimeout(() => {
                const currentStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
                if (banner && !currentStandalone) {
                    banner.style.display = 'flex';
                }
            }, 800);
        }

        if (installBtn) {
            installBtn.addEventListener('click', () => {
                if (App.deferredPrompt) {
                    App.deferredPrompt.prompt();
                    App.deferredPrompt.userChoice.then(() => {
                        App.deferredPrompt = null;
                        if (banner) banner.style.display = 'none';
                    });
                } else {
                    App.openMobileGuideModal();
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (banner) banner.style.display = 'none';
                sessionStorage.setItem('pwa_banner_closed', 'true');
            });
        }
    },

    authInitialized: false,

    // =======================================================
    // AUTHENTICATION & SECURITY SYSTEM
    // =======================================================
    initAuth: function() {
        const authModal = document.getElementById('auth-modal');
        const currentUser = Storage.getCurrentUser();

        // Update UI with Current User Info
        if (currentUser) {
            if (authModal) authModal.classList.remove('show');
            const nameEl = document.getElementById('header-user-name');
            const roleEl = document.getElementById('header-user-role');
            const avatarEl = document.getElementById('header-user-avatar');
            if (nameEl) nameEl.innerText = currentUser.name || 'Mhaly (Admin)';
            if (roleEl) roleEl.innerText = currentUser.roleTitle || (currentUser.role === 'admin' ? 'ម្ចាស់ហាង (Admin)' : 'បុគ្គលិក');
            if (avatarEl) {
                avatarEl.innerHTML = `<i class="${currentUser.avatar || 'fa-solid fa-crown'}"></i>`;
            }
        } else {
            // Lock screen behind auth modal
            if (authModal) authModal.classList.add('show');
        }

        if (App.authInitialized) return;
        App.authInitialized = true;

        // Switch to Login / Register Tabs
        const tabLoginBtn = document.getElementById('tab-btn-login');
        const tabRegBtn = document.getElementById('tab-btn-register');
        const loginPane = document.getElementById('auth-login-pane');
        const regPane = document.getElementById('auth-register-pane');
        const loginErr = document.getElementById('login-error-msg');
        const regErr = document.getElementById('reg-msg');

        if (tabLoginBtn && tabRegBtn) {
            tabLoginBtn.addEventListener('click', () => {
                tabLoginBtn.classList.add('active');
                tabRegBtn.classList.remove('active');
                if (loginPane) loginPane.classList.add('active');
                if (regPane) regPane.classList.remove('active');
                if (loginErr) loginErr.style.display = 'none';
            });

            tabRegBtn.addEventListener('click', () => {
                tabRegBtn.classList.add('active');
                tabLoginBtn.classList.remove('active');
                if (regPane) regPane.classList.add('active');
                if (loginPane) loginPane.classList.remove('active');
                if (regErr) regErr.style.display = 'none';
            });
        }

        // Quick Admin Fill Button
        const quickFillAdminBtn = document.getElementById('btn-quick-fill-admin');
        if (quickFillAdminBtn) {
            quickFillAdminBtn.addEventListener('click', () => {
                const idInput = document.getElementById('login-identity');
                const pwdInput = document.getElementById('login-password');
                if (idInput) idInput.value = 'mhaly4423$';
                if (pwdInput) pwdInput.value = 'mhaly4423@@';
                if (loginErr) loginErr.style.display = 'none';
                App.showToast('បានបំពេញគណនី Admin រួចរាល់! ចុច ចូលប្រើប្រាស់ ដើម្បីចូល', 'info');
            });
        }

        // Toggle Password Eye Buttons
        const toggleLoginPwd = document.getElementById('btn-toggle-login-pwd');
        if (toggleLoginPwd) {
            toggleLoginPwd.addEventListener('click', () => {
                const pwdInput = document.getElementById('login-password');
                if (pwdInput) {
                    const isPassword = pwdInput.type === 'password';
                    pwdInput.type = isPassword ? 'text' : 'password';
                    toggleLoginPwd.innerHTML = `<i class="fa-solid fa-${isPassword ? 'eye-slash' : 'eye'}"></i>`;
                }
            });
        }

        const toggleRegPwd = document.getElementById('btn-toggle-reg-pwd');
        if (toggleRegPwd) {
            toggleRegPwd.addEventListener('click', () => {
                const pwdInput = document.getElementById('reg-password');
                if (pwdInput) {
                    const isPassword = pwdInput.type === 'password';
                    pwdInput.type = isPassword ? 'text' : 'password';
                    toggleRegPwd.innerHTML = `<i class="fa-solid fa-${isPassword ? 'eye-slash' : 'eye'}"></i>`;
                }
            });
        }

        // Form Login Submit
        const formLogin = document.getElementById('form-login');
        if (formLogin) {
            formLogin.addEventListener('submit', (e) => {
                e.preventDefault();
                const identity = document.getElementById('login-identity')?.value.trim().toLowerCase() || '';
                const password = document.getElementById('login-password')?.value || '';

                if (!identity || !password) {
                    if (loginErr) {
                        loginErr.innerText = 'សូមបញ្ចូល Gmail/Username និងលេខសម្ងាត់!';
                        loginErr.style.display = 'block';
                    }
                    return;
                }

                const users = Storage.getUsers();
                const matchedUser = users.find(u => 
                    ((u.email && u.email.toLowerCase() === identity) || (u.username && u.username.toLowerCase() === identity)) && 
                    u.password === password
                );

                if (matchedUser) {
                    Storage.setCurrentUser(matchedUser);
                    App.initAuth();
                    App.playBeep();
                    App.showToast(`ស្វាគមន៍ការចូលប្រើប្រាស់, ${matchedUser.name}!`, 'success');
                    if (loginErr) loginErr.style.display = 'none';
                    Storage.pullFromServer(true);
                } else {
                    if (loginErr) {
                        loginErr.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ឈ្មោះគណនី/Gmail ឬលេខកូដមិនត្រឹមត្រូវទេ! សូមពិនិត្យម្តងទៀត។`;
                        loginErr.style.display = 'block';
                    }
                    App.playBeep();
                }
            });
        }

        // Form Register Submit
        const formReg = document.getElementById('form-register');
        if (formReg) {
            formReg.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('reg-name')?.value.trim() || '';
                const email = document.getElementById('reg-email')?.value.trim().toLowerCase() || '';
                const username = document.getElementById('reg-username')?.value.trim().toLowerCase() || '';
                const password = document.getElementById('reg-password')?.value || '';
                const confirmPassword = document.getElementById('reg-confirm-password')?.value || '';
                const role = document.getElementById('reg-role')?.value || 'cashier';

                if (password !== confirmPassword) {
                    if (regErr) {
                        regErr.className = 'auth-msg-box error';
                        regErr.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> លេខកូដសម្ងាត់ទាំងពីរមិនដូចគ្នាទេ!';
                        regErr.style.display = 'block';
                    }
                    return;
                }

                if (password.length < 4) {
                    if (regErr) {
                        regErr.className = 'auth-msg-box error';
                        regErr.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> លេខកូដសម្ងាត់ត្រូវមានយ៉ាងតិច ៤ ខ្ទង់!';
                        regErr.style.display = 'block';
                    }
                    return;
                }

                const users = Storage.getUsers();
                const exists = users.some(u => u.username.toLowerCase() === username || u.email.toLowerCase() === email);
                if (exists) {
                    if (regErr) {
                        regErr.className = 'auth-msg-box error';
                        regErr.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Gmail ឬ Username នេះត្រូវបានចុះឈ្មោះរួចហើយ!';
                        regErr.style.display = 'block';
                    }
                    return;
                }

                const newUser = {
                    id: 'user-' + Date.now(),
                    name: name,
                    email: email,
                    username: username,
                    password: password,
                    role: role,
                    roleTitle: role === 'admin' ? 'ម្ចាស់ហាង (Admin)' : role === 'technician' ? 'ជាងបច្ចេកទេស (Technician)' : 'បុគ្គលិកគិតលុយ (Cashier)',
                    avatar: role === 'admin' ? 'fa-solid fa-crown' : 'fa-solid fa-user',
                    createdAt: new Date().toISOString()
                };

                Storage.addUser(newUser);
                Storage.setCurrentUser(newUser);
                App.initAuth();
                App.playBeep();
                App.showToast(`បានបង្កើតគណនី និងចូលប្រើដោយជោគជ័យ!`, 'success');
                if (regErr) regErr.style.display = 'none';
            });
        }

        // Logout Handlers (Header and Sidebar)
        const logoutHeaderBtn = document.getElementById('btn-header-logout');
        const logoutSidebarBtn = document.getElementById('btn-sidebar-logout');

        const handleLogout = () => {
            if (confirm('តើអ្នកពិតជាចង់ចាកចេញពីប្រព័ន្ធ (Logout) មែនទេ?')) {
                Storage.logout();
                App.initAuth();
                App.showToast('បានចាកចេញពីប្រព័ន្ធដោយសុវត្ថិភាព', 'info');
            }
        };

        if (logoutHeaderBtn) logoutHeaderBtn.addEventListener('click', handleLogout);
        if (logoutSidebarBtn) logoutSidebarBtn.addEventListener('click', handleLogout);
    }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
window.App = App;
