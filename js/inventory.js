/**
 * MHALY SHOP - INVENTORY & IMEI MANAGEMENT MODULE
 * Product CRUD, IMEI stock tracking, Trade-in handler, CSV export
 */

const Inventory = {
    searchQuery: '',
    filterCategory: 'all',
    filterStatus: 'all',

    init: function () {
        Inventory.renderCategoryDropdowns();
        Inventory.renderTable();
        Inventory.setupEventListeners();
        Inventory.setupEditModalListeners();
        Inventory.renderRecentTradeIns();
    },

    renderInventoryTable: function () {
        Inventory.renderTable();
    },

    renderCategoryDropdowns: function () {
        const categories = Storage.getCategories();
        const prodCatSelect = document.getElementById('new-prod-cat');
        const filterCatSelect = document.getElementById('filter-category-select');

        if (prodCatSelect) {
            const currentVal = prodCatSelect.value;
            let options = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
            options += `<option value="__new__">+ បង្កើតប្រភេទថ្មី (Add New)...</option>`;
            prodCatSelect.innerHTML = options;
            if (currentVal && categories.some(c => c.name === currentVal)) {
                prodCatSelect.value = currentVal;
            }
        }

        if (filterCatSelect) {
            let filterOptions = `<option value="all">គ្រប់ប្រភេទ (All Categories)</option>`;
            filterOptions += categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
            filterCatSelect.innerHTML = filterOptions;
            filterCatSelect.value = Inventory.filterCategory;
        }
    },

    setupEventListeners: function () {
        // Search Input
        const searchInput = document.getElementById('inventory-search-input');
        if (searchInput) {
            let invSearchDebounce = null;
            searchInput.addEventListener('input', (e) => {
                Inventory.searchQuery = e.target.value.toLowerCase();
                clearTimeout(invSearchDebounce);
                invSearchDebounce = setTimeout(() => {
                    Inventory.renderTable();
                }, 100);
            });
        }

        // Category Filter
        const catFilter = document.getElementById('filter-category-select');
        if (catFilter) {
            catFilter.addEventListener('change', (e) => {
                Inventory.filterCategory = e.target.value;
                Inventory.renderTable();
            });
        }

        // Status Filter
        const statusFilter = document.getElementById('filter-stock-status');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                Inventory.filterStatus = e.target.value;
                Inventory.renderTable();
            });
        }

        // Add Product Modal triggers
        const addBtn = document.getElementById('btn-add-product');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                document.getElementById('form-add-product').reset();
                Inventory.resetImageUploader('new');
                Inventory.renderCategoryDropdowns();
                const imeiSection = document.getElementById('new-imei-section');
                const stockSection = document.getElementById('new-stock-qty-section');
                const hasImei = document.getElementById('new-prod-has-imei').checked;
                if (imeiSection) imeiSection.style.display = hasImei ? 'block' : 'none';
                if (stockSection) stockSection.style.display = hasImei ? 'none' : 'block';
                document.getElementById('inline-new-cat-box').style.display = 'none';
                document.getElementById('add-product-modal').classList.add('show');
            });
        }

        const closeProductModalBtn = document.getElementById('btn-close-product-modal');
        const cancelAddBtn = document.getElementById('btn-cancel-add-product');
        if (closeProductModalBtn) {
            closeProductModalBtn.addEventListener('click', () => {
                document.getElementById('add-product-modal').classList.remove('show');
            });
        }
        if (cancelAddBtn) {
            cancelAddBtn.addEventListener('click', () => {
                document.getElementById('add-product-modal').classList.remove('show');
            });
        }

        // Category Select Change & Add Custom Category
        const prodCatSelect = document.getElementById('new-prod-cat');
        const inlineCatBox = document.getElementById('inline-new-cat-box');
        const customCatInput = document.getElementById('custom-cat-input');

        if (prodCatSelect) {
            prodCatSelect.addEventListener('change', (e) => {
                if (e.target.value === '__new__') {
                    if (inlineCatBox) inlineCatBox.style.display = 'block';
                    if (customCatInput) customCatInput.focus();
                } else {
                    if (inlineCatBox) inlineCatBox.style.display = 'none';
                }
            });
        }

        // Toggle buttons for custom category box
        const toggleCatBtn = document.getElementById('btn-toggle-add-cat');
        const quickAddCatBtn = document.getElementById('btn-quick-add-cat');
        const cancelCustomCatBtn = document.getElementById('btn-cancel-custom-cat');
        const saveCustomCatBtn = document.getElementById('btn-save-custom-cat');

        if (toggleCatBtn) {
            toggleCatBtn.addEventListener('click', () => {
                inlineCatBox.style.display = inlineCatBox.style.display === 'none' ? 'block' : 'none';
                if (inlineCatBox.style.display === 'block') customCatInput.focus();
            });
        }
        if (quickAddCatBtn) {
            quickAddCatBtn.addEventListener('click', () => {
                inlineCatBox.style.display = inlineCatBox.style.display === 'none' ? 'block' : 'none';
                if (inlineCatBox.style.display === 'block') customCatInput.focus();
            });
        }
        if (cancelCustomCatBtn) {
            cancelCustomCatBtn.addEventListener('click', () => {
                inlineCatBox.style.display = 'none';
                if (prodCatSelect.value === '__new__') prodCatSelect.selectedIndex = 0;
            });
        }
        if (saveCustomCatBtn) {
            saveCustomCatBtn.addEventListener('click', () => {
                const val = customCatInput.value.trim();
                if (!val) {
                    App.showToast('សូមបញ្ចូលឈ្មោះប្រភេទ!', 'error');
                    return;
                }
                const newCat = Storage.addCategory(val);
                Inventory.renderCategoryDropdowns();
                if (prodCatSelect) prodCatSelect.value = newCat.name;
                if (window.POS) POS.renderCategories();
                inlineCatBox.style.display = 'none';
                customCatInput.value = '';
                App.showToast(`បានបង្កើតប្រភេទ "${newCat.name}" ជោគជ័យ!`, 'success');
            });
        }

        // Toggle IMEI section & Stock Qty in Add Product modal
        const hasImeiCheckbox = document.getElementById('new-prod-has-imei');
        if (hasImeiCheckbox) {
            hasImeiCheckbox.addEventListener('change', (e) => {
                const imeiSection = document.getElementById('new-imei-section');
                const stockSection = document.getElementById('new-stock-qty-section');
                if (imeiSection) imeiSection.style.display = e.target.checked ? 'block' : 'none';
                if (stockSection) stockSection.style.display = e.target.checked ? 'none' : 'block';
            });
        }

        // Submit Add Product Form
        const addProductForm = document.getElementById('form-add-product');
        if (addProductForm) {
            addProductForm.addEventListener('submit', (e) => {
                e.preventDefault();
                Inventory.handleSaveNewProduct();
            });
        }

        // Export Inventory CSV
        const exportBtn = document.getElementById('btn-export-inventory');
        if (exportBtn) {
            exportBtn.addEventListener('click', Inventory.exportToCSV);
        }

        // Clear / Reset All Stock button
        const clearAllBtn = document.getElementById('btn-clear-demo-products');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', Inventory.clearAllProducts);
        }

        // Camera Scanner Triggers in Add / Edit Product Modal
        const scanNameBtn = document.getElementById('btn-scan-product-name');
        if (scanNameBtn) {
            scanNameBtn.addEventListener('click', () => {
                if (window.App) App.openCameraScanner('stock-name');
            });
        }

        const scanProductBarcodeBtn = document.getElementById('btn-scan-product-barcode');
        if (scanProductBarcodeBtn) {
            scanProductBarcodeBtn.addEventListener('click', () => {
                if (window.App) App.openCameraScanner('stock-barcode');
            });
        }

        const scanEditBarcodeBtn = document.getElementById('btn-scan-edit-barcode');
        if (scanEditBarcodeBtn) {
            scanEditBarcodeBtn.addEventListener('click', () => {
                if (window.App) App.openCameraScanner('edit-barcode');
            });
        }

        const scanImeiBtn = document.getElementById('btn-scan-imei-camera');
        if (scanImeiBtn) {
            scanImeiBtn.addEventListener('click', () => {
                if (window.App) App.openCameraScanner('stock-imei');
            });
        }

        // Save Trade-in Button
        const saveTradeInBtn = document.getElementById('btn-save-tradein');
        if (saveTradeInBtn) {
            saveTradeInBtn.addEventListener('click', Inventory.handleSaveTradeIn);
        }

        // Setup Drag & Drop for Image Dropzones
        ['new', 'edit'].forEach(type => {
            const dropzone = document.getElementById(`${type}-prod-dropzone`);
            if (dropzone) {
                dropzone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    dropzone.classList.add('drag-over');
                });
                dropzone.addEventListener('dragleave', () => {
                    dropzone.classList.remove('drag-over');
                });
                dropzone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    dropzone.classList.remove('drag-over');
                    const files = e.dataTransfer && e.dataTransfer.files;
                    if (files && files.length > 0) {
                        const fakeEvent = { target: { files: files, value: '' } };
                        Inventory.handleFileInputChange(fakeEvent, type);
                    }
                });
            }
        });
    },

    // Render Inventory Table
    renderTable: function () {
        const tbody = document.getElementById('inventory-table-body');
        const stockBadge = document.getElementById('stock-badge');
        if (!tbody) return;

        const products = Storage.getProducts();

        // Calculate total in-stock phones & items
        let totalItemsInStock = 0;
        products.forEach(p => {
            if (p.hasImei) {
                totalItemsInStock += (p.imeis || []).filter(i => i.status === 'in_stock').length;
            } else {
                totalItemsInStock += (p.stockCount || 0);
            }
        });
        if (stockBadge) stockBadge.innerText = totalItemsInStock;

        // Filtering
        let filtered = products.filter(p => {
            const matchesCat = (Inventory.filterCategory === 'all') || (p.category === Inventory.filterCategory);
            const matchesSearch = !Inventory.searchQuery ||
                p.name.toLowerCase().includes(Inventory.searchQuery) ||
                (p.barcode && p.barcode.toLowerCase().includes(Inventory.searchQuery)) ||
                (p.brand && p.brand.toLowerCase().includes(Inventory.searchQuery)) ||
                (p.hasImei && p.imeis && p.imeis.some(i => i.imei.includes(Inventory.searchQuery)));

            let matchesStatus = true;
            if (Inventory.filterStatus !== 'all') {
                if (p.hasImei) {
                    const available = (p.imeis || []).filter(i => i.status === 'in_stock').length;
                    if (Inventory.filterStatus === 'in_stock') matchesStatus = available > 0;
                    else if (Inventory.filterStatus === 'low') matchesStatus = available > 0 && available <= 2;
                    else if (Inventory.filterStatus === 'sold') matchesStatus = available === 0;
                } else {
                    if (Inventory.filterStatus === 'in_stock') matchesStatus = (p.stockCount || 0) > 0;
                    else if (Inventory.filterStatus === 'low') matchesStatus = (p.stockCount || 0) <= 5;
                    else if (Inventory.filterStatus === 'sold') matchesStatus = (p.stockCount || 0) === 0;
                }
            }

            return matchesCat && matchesSearch && matchesStatus;
        });

        if (filtered.length === 0) {
            if (products.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
                            <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(56, 189, 248, 0.1); color: #38bdf8; display: inline-flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 14px;">
                                <i class="fa-solid fa-box-open"></i>
                            </div>
                            <h4 style="font-size: 16px; color: var(--text-primary); margin-bottom: 6px;">មិនទាន់មានទំនិញក្នុងស្តុកទេ</h4>
                            <p style="font-size: 13px; color: var(--text-muted); max-width: 420px; margin: 0 auto 16px;">
                                ទំនិញគំរូចាស់ត្រូវបានសម្អាតរួចរាល់។ អ្នកអាចចាប់ផ្តើមបន្ថែមទំនិញពិតប្រាកដក្នុងហាងរបស់អ្នកបានឥឡូវនេះ។
                            </p>
                            <button class="btn-primary" onclick="document.getElementById('btn-add-product').click()">
                                <i class="fa-solid fa-plus"></i> បន្ថែមទំនិញថ្មីចូលស្តុក
                            </button>
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
                            <i class="fa-solid fa-magnifying-glass" style="font-size: 26px; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
                            <div style="font-size: 14px; color: var(--text-secondary);">មិនមានទិន្នន័យទំនិញដែលត្រូវនឹងការស្វែងរក ឬ Filter នេះទេ</div>
                        </td>
                    </tr>
                `;
            }
            return;
        }

        tbody.innerHTML = filtered.map(p => {
            let stockDisplay = '';
            let statusBadge = '';

            if (p.hasImei) {
                const totalImeis = (p.imeis || []).length;
                const inStockImeis = (p.imeis || []).filter(i => i.status === 'in_stock').length;
                const soldImeis = totalImeis - inStockImeis;

                stockDisplay = `
                    <div>
                        <strong style="color: #38bdf8;">${inStockImeis} គ្រឿង</strong> 
                        <span style="font-size: 11px; color: var(--text-muted);">(លក់ហើយ ${soldImeis})</span>
                        <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                            ${(p.imeis || []).filter(i => i.status === 'in_stock').slice(0, 2).map(i => `<span style="background: rgba(255,255,255,0.06); padding: 1px 4px; border-radius: 3px; font-family: var(--font-nums);">${i.imei}</span>`).join(' ')}
                            ${inStockImeis > 2 ? `...` : ''}
                        </div>
                    </div>
                `;

                if (inStockImeis === 0) {
                    statusBadge = `<span class="stock-tag out-stock">អស់ពីស្តុក</span>`;
                } else if (inStockImeis <= 2) {
                    statusBadge = `<span class="stock-tag low-stock">ជិតអស់</span>`;
                } else {
                    statusBadge = `<span class="stock-tag in-stock">មានក្នុងស្តុក</span>`;
                }
            } else {
                stockDisplay = `<strong>${p.stockCount || 0} គ្រឿង</strong>`;
                if ((p.stockCount || 0) === 0) {
                    statusBadge = `<span class="stock-tag out-stock">អស់ពីស្តុក</span>`;
                } else if ((p.stockCount || 0) <= 5) {
                    statusBadge = `<span class="stock-tag low-stock">ជិតអស់</span>`;
                } else {
                    statusBadge = `<span class="stock-tag in-stock">មានក្នុងស្តុក</span>`;
                }
            }

            return `
                <tr>
                    <td style="width: 50px;">
                        <div style="width: 44px; height: 44px; border-radius: 8px; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                            ${p.image ? `<img src="${p.image}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.parentElement.innerHTML='<i class=\\'fa-solid fa-mobile-screen\\'></i>'"/>` : `<i class="fa-solid fa-mobile-screen" style="color: #64748b;"></i>`}
                        </div>
                    </td>
                    <td>
                        <strong style="color: var(--text-primary); font-size: 14px;">${p.name}</strong>
                        <div style="font-size: 11.5px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 3px;">
                            ${p.barcode ? `<span style="display: inline-flex; align-items: center; gap: 3px; background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.25); padding: 1px 6px; border-radius: 4px; font-size: 11px; font-family: var(--font-nums);"><i class="fa-solid fa-barcode"></i> ${p.barcode}</span>` : ''}
                            <span>${p.storage || ''} ${p.warrantyMonths ? `&bull; ធានា ${p.warrantyMonths} ខែ` : ''}</span>
                        </div>
                    </td>
                    <td><span class="mini-badge badge-condition">${p.category}</span></td>
                    <td style="font-family: var(--font-nums); font-weight: 600; color: #94a3b8;">$${p.cost ? p.cost.toFixed(2) : '0.00'}</td>
                    <td style="font-family: var(--font-nums); font-weight: 700; color: #38bdf8;">$${p.price.toFixed(2)}</td>
                    <td>${stockDisplay}</td>
                    <td>${statusBadge}</td>
                    <td class="text-right">
                        <button class="btn-secondary" style="padding: 4px 10px; font-size: 11.5px; margin-right: 4px; background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);" onclick="Inventory.openEditModal('${p.id}')" title="កែប្រែទិន្នន័យទំនិញ/ស្តុក">
                            <i class="fa-solid fa-pen-to-square"></i> កែ
                        </button>
                        ${p.hasImei ? `
                            <button class="btn-secondary" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;" onclick="Inventory.promptAddImei('${p.id}')" title="បន្ថែមលេខ IMEI">
                                <i class="fa-solid fa-plus"></i> IMEI
                            </button>
                        ` : ''}
                        <button class="btn-remove-item" onclick="Inventory.deleteProduct('${p.id}')" title="លុបទំនិញ">
                            <i class="fa-solid fa-trash-can" style="color: #f87171; padding: 4px;"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // Save New Product from Modal
    handleSaveNewProduct: function () {
        const name = document.getElementById('new-prod-name').value.trim();
        const category = document.getElementById('new-prod-cat').value;
        const cost = parseFloat(document.getElementById('new-prod-cost').value) || 0;
        const price = parseFloat(document.getElementById('new-prod-price').value) || 0;
        const warranty = parseInt(document.getElementById('new-prod-warranty').value) || 0;
        const image = document.getElementById('new-prod-img').value.trim();
        const hasImei = document.getElementById('new-prod-has-imei').checked;

        if (!name || price <= 0) {
            App.showToast('សូមបញ្ចូលឈ្មោះ និងតម្លៃលក់ឱ្យបានត្រឹមត្រូវ!', 'error');
            return;
        }

        const newId = 'p-' + Date.now();
        const products = Storage.getProducts();

        let imeisList = [];
        if (hasImei) {
            const rawImeis = document.getElementById('new-prod-imeis').value;
            const color = document.getElementById('new-imei-color').value.trim() || 'Standard';
            const condition = document.getElementById('new-imei-condition').value;
            const battery = parseInt(document.getElementById('new-imei-battery').value) || 100;

            const splitImeis = rawImeis.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
            if (splitImeis.length === 0) {
                // Generate a sample IMEI if empty
                splitImeis.push('35' + Math.floor(1000000000000 + Math.random() * 9000000000000));
            }

            imeisList = splitImeis.map(code => ({
                imei: code,
                color: color,
                storage: '256GB',
                condition: condition,
                battery: battery,
                cost: cost,
                status: 'in_stock'
            }));
        }

        const stockQty = parseInt(document.getElementById('new-prod-stock-qty').value) || 10;
        const barcode = document.getElementById('new-prod-barcode') ? document.getElementById('new-prod-barcode').value.trim() : '';

        const newProduct = {
            id: newId,
            name: name,
            barcode: barcode,
            category: category,
            brand: category === 'iPhone' || category === 'iPad' ? 'Apple' : (category === 'Samsung' ? 'Samsung' : category),
            storage: 'Standard',
            price: price,
            cost: cost,
            warrantyMonths: warranty,
            hasImei: hasImei,
            image: image || '',
            imeis: imeisList,
            stockCount: hasImei ? imeisList.length : stockQty
        };

        products.unshift(newProduct);
        Storage.saveProducts(products);

        document.getElementById('add-product-modal').classList.remove('show');
        Inventory.renderCategoryDropdowns();
        Inventory.renderTable();
        if (window.POS) {
            POS.renderCategories();
            POS.renderProducts();
        }
        Reports.updateKPIs();
        App.showToast(`បានបញ្ចូល ${name} ជោគជ័យ!`, 'success');
    },

    // Prompt to quickly add IMEI to existing product
    promptAddImei: function (productId) {
        const products = Storage.getProducts();
        const prod = products.find(p => p.id === productId);
        if (!prod) return;

        const newImei = prompt(`បញ្ចូលលេខ IMEI ថ្មីសម្រាប់ ${prod.name}៖`);
        if (newImei && newImei.trim()) {
            const trimmed = newImei.trim();
            if (!prod.imeis) prod.imeis = [];

            // Check duplicate
            if (prod.imeis.some(i => i.imei === trimmed)) {
                App.showToast('លេខ IMEI នេះមានក្នុងប្រព័ន្ធរួចហើយ!', 'error');
                return;
            }

            prod.imeis.push({
                imei: trimmed,
                color: 'Black/Default',
                condition: 'New',
                battery: 100,
                cost: prod.cost,
                status: 'in_stock'
            });

            Storage.saveProducts(products);
            Inventory.renderTable();
            POS.renderProducts();
            App.showToast(`បានបន្ថែម IMEI ${trimmed} ជោគជ័យ!`, 'success');
        }
    },

    deleteProduct: function (productId) {
        const products = Storage.getProducts();
        const target = products.find(p => p.id === productId);
        const name = target ? target.name : 'ទំនិញនេះ';

        if (confirm(`តើអ្នកពិតជាចង់លុបទំនិញ "${name}" ចេញពីស្តុកជារៀងរហូតមែនទេ?`)) {
            if (window.Storage && Storage.markDeletedId) {
                Storage.markDeletedId(productId);
            }
            const updated = products.filter(p => p.id !== productId);
            Storage.saveProducts(updated);
            Inventory.renderTable();
            if (window.POS) POS.renderProducts();
            if (window.Reports) Reports.updateKPIs();
            if (window.Finance) Finance.updateDashboardKPIs();
            App.showToast(`បានលុប "${name}" ចេញពីស្តុកជោគជ័យ!`, 'success');
        }
    },

    clearAllProducts: function () {
        App.showToast('មុខងារនេះត្រូវបានចាក់សោសុវត្ថិភាព ដើម្បីការពារស្តុកទំនិញរបស់ហាង!', 'warning');
    },

    // Export Inventory to CSV
    exportToCSV: function () {
        const products = Storage.getProducts();
        let csvContent = 'data:text/csv;charset=utf-8,ID,Name,Category,Cost Price,Sell Price,Warranty Months,Has IMEI,In Stock Count\n';

        products.forEach(p => {
            const inStock = p.hasImei ? (p.imeis || []).filter(i => i.status === 'in_stock').length : (p.stockCount || 0);
            csvContent += `"${p.id}","${p.name}","${p.category}","${p.cost}","${p.price}","${p.warrantyMonths}","${p.hasImei}","${inStock}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `mhaly_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        App.showToast('បានទាញយកទិន្នន័យស្តុកជាឯកសារ CSV/Excel រួចរាល់!', 'success');
    },

    // =======================================================
    // TRADE-IN / BUY-IN SECONDHAND
    // =======================================================
    handleSaveTradeIn: function () {
        const custName = document.getElementById('ti-customer-name').value.trim();
        const custPhone = document.getElementById('ti-customer-phone').value.trim();
        const custId = document.getElementById('ti-customer-id').value.trim();
        const custAddress = document.getElementById('ti-customer-address').value.trim();

        const model = document.getElementById('ti-model').value.trim();
        const imei = document.getElementById('ti-imei').value.trim();
        const storage = document.getElementById('ti-storage').value;
        const color = document.getElementById('ti-color').value.trim() || 'Standard';
        const battery = parseInt(document.getElementById('ti-battery').value) || 85;
        const condition = document.getElementById('ti-condition').value;
        const buyPrice = parseFloat(document.getElementById('ti-buy-price').value) || 0;
        const notes = document.getElementById('ti-notes').value.trim();

        if (!custName || !custPhone || !model || !imei || buyPrice <= 0) {
            App.showToast('សូមបំពេញព័ត៌មានផ្កាយ (*) ទាំងអស់ឱ្យបានត្រឹមត្រូវ!', 'error');
            return;
        }

        const tradeInRecord = {
            id: 'TI-' + Date.now(),
            date: new Date().toISOString(),
            customerName: custName,
            customerPhone: custPhone,
            customerIdCard: custId,
            customerAddress: custAddress,
            model: model,
            imei: imei,
            storage: storage,
            color: color,
            battery: battery,
            condition: condition,
            buyPrice: buyPrice,
            notes: notes
        };

        // 1. Save to trade-in history
        const tradeins = Storage.getTradeIns();
        tradeins.unshift(tradeInRecord);
        Storage.saveTradeIns(tradeins);

        // 2. Automatically Add into Used Products in Inventory!
        const products = Storage.getProducts();
        const fullName = `${model} ${storage} (${condition})`;

        // Find if model group already exists or create new
        let existingUsedProd = products.find(p => p.category === 'Used' && p.name.includes(model));
        if (existingUsedProd) {
            if (!existingUsedProd.imeis) existingUsedProd.imeis = [];
            existingUsedProd.imeis.push({
                imei: imei,
                color: color,
                storage: storage,
                condition: condition,
                battery: battery,
                cost: buyPrice,
                status: 'in_stock'
            });
        } else {
            products.unshift({
                id: 'p-used-' + Date.now(),
                name: fullName,
                category: 'Used',
                brand: 'Apple',
                storage: storage,
                price: Math.round(buyPrice * 1.18), // Estimated selling price (+18% markup)
                cost: buyPrice,
                warrantyMonths: 1, // 1 month warranty for secondhand
                hasImei: true,
                image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-pro-max-silver-select?wid=470&hei=556&fmt=png-alpha',
                imeis: [{
                    imei: imei,
                    color: color,
                    storage: storage,
                    condition: condition,
                    battery: battery,
                    cost: buyPrice,
                    status: 'in_stock'
                }]
            });
        }

        Storage.saveProducts(products);

        // Reset form
        document.getElementById('ti-customer-name').value = '';
        document.getElementById('ti-customer-phone').value = '';
        document.getElementById('ti-customer-id').value = '';
        document.getElementById('ti-model').value = '';
        document.getElementById('ti-imei').value = '';
        document.getElementById('ti-buy-price').value = '';
        document.getElementById('ti-notes').value = '';

        Inventory.renderTable();
        Inventory.renderRecentTradeIns();
        POS.renderProducts();
        Reports.updateKPIs();
        App.showToast(`បានកត់ត្រាទិញចូល ${model} (IMEI: ${imei}) និងបញ្ចូលទៅក្នុងស្តុកជោគជ័យ!`, 'success');
    },

    renderRecentTradeIns: function () {
        const container = document.getElementById('recent-tradein-list');
        if (!container) return;

        const tradeins = Storage.getTradeIns().slice(0, 4);
        if (tradeins.length === 0) {
            container.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">មិនទាន់មានការទិញចូលទេ</span>`;
            return;
        }

        container.innerHTML = tradeins.map(t => `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 10px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 700;">
                    <span>${t.model}</span>
                    <span style="color: #38bdf8;">$${t.buyPrice}</span>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">
                    IMEI: <span style="font-family: var(--font-nums); color: #94a3b8;">${t.imei}</span> &bull; ថ្ម: ${t.battery}%
                </div>
                <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">
                    ពីអតិថិជន៖ ${t.customerName} (${t.customerPhone})
                </div>
            </div>
        `).join('');
    },

    // =======================================================
    // EDIT PRODUCT & STOCK MANAGEMENT
    // =======================================================
    setupEditModalListeners: function () {
        const closeEditBtn = document.getElementById('btn-close-edit-product-modal');
        const cancelEditBtn = document.getElementById('btn-cancel-edit-product');
        const editForm = document.getElementById('form-edit-product');
        const addImeiBtn = document.getElementById('btn-edit-add-imei');
        const imeiInput = document.getElementById('edit-new-imei-input');

        if (closeEditBtn) {
            closeEditBtn.addEventListener('click', () => {
                document.getElementById('edit-product-modal').classList.remove('show');
            });
        }
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                document.getElementById('edit-product-modal').classList.remove('show');
            });
        }
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                Inventory.handleSaveEditProduct();
            });
        }
        if (addImeiBtn) {
            addImeiBtn.addEventListener('click', () => {
                Inventory.handleAddImeiInEdit();
            });
        }
        if (imeiInput) {
            imeiInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    Inventory.handleAddImeiInEdit();
                }
            });
        }

        // Trade-In History Modal Listeners
        const tradeInHistBtn = document.getElementById('btn-view-tradein-history');
        const closeTradeInModalBtn = document.getElementById('btn-close-tradein-modal');
        if (tradeInHistBtn) {
            tradeInHistBtn.addEventListener('click', () => {
                Inventory.renderTradeInHistory();
                document.getElementById('tradein-history-modal').classList.add('show');
            });
        }
        if (closeTradeInModalBtn) {
            closeTradeInModalBtn.addEventListener('click', () => {
                document.getElementById('tradein-history-modal').classList.remove('show');
            });
        }
    },

    openEditModal: function (productId) {
        const products = Storage.getProducts();
        const prod = products.find(p => p.id === productId);
        if (!prod) {
            App.showToast('រកមិនឃើញទំនិញនេះទេ!', 'error');
            return;
        }

        document.getElementById('edit-prod-id').value = prod.id;
        document.getElementById('edit-prod-name').value = prod.name || '';
        if (document.getElementById('edit-prod-barcode')) {
            document.getElementById('edit-prod-barcode').value = prod.barcode || '';
        }
        document.getElementById('edit-prod-cost').value = prod.cost !== undefined ? prod.cost : 0;
        document.getElementById('edit-prod-price').value = prod.price !== undefined ? prod.price : 0;
        document.getElementById('edit-prod-warranty').value = prod.warrantyMonths !== undefined ? prod.warrantyMonths : 12;
        document.getElementById('edit-prod-img').value = prod.image || '';

        // Initialize Image Preview in Edit Modal
        if (prod.image) {
            const approxKb = prod.image.startsWith('data:')
                ? Math.round((prod.image.length * 0.75) / 1024) + ' KB'
                : 'Link URL';
            Inventory.setImagePreview('edit', prod.image, approxKb);
        } else {
            Inventory.resetImageUploader('edit');
        }

        // Populate Category dropdown
        const categories = Storage.getCategories();
        const catSelect = document.getElementById('edit-prod-cat');
        if (catSelect) {
            catSelect.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
            if (categories.some(c => c.name === prod.category)) {
                catSelect.value = prod.category;
            }
        }

        const qtySection = document.getElementById('edit-stock-qty-section');
        const imeiSection = document.getElementById('edit-imei-section');

        if (prod.hasImei) {
            if (qtySection) qtySection.style.display = 'none';
            if (imeiSection) {
                imeiSection.style.display = 'block';
                Inventory.renderEditImeis(prod);
            }
        } else {
            if (imeiSection) imeiSection.style.display = 'none';
            if (qtySection) {
                qtySection.style.display = 'block';
                document.getElementById('edit-prod-stock-qty').value = prod.stockCount !== undefined ? prod.stockCount : 0;
            }
        }

        const newImeiInput = document.getElementById('edit-new-imei-input');
        if (newImeiInput) newImeiInput.value = '';

        document.getElementById('edit-product-modal').classList.add('show');
    },

    renderEditImeis: function (prod) {
        const listContainer = document.getElementById('edit-imeis-list');
        const summaryEl = document.getElementById('edit-imei-summary');
        if (!listContainer) return;

        const imeis = prod.imeis || [];
        const inStockCount = imeis.filter(i => i.status === 'in_stock').length;
        const soldCount = imeis.length - inStockCount;

        if (summaryEl) {
            summaryEl.innerHTML = `<span style="color: #38bdf8; font-weight: 700;">${inStockCount} ក្នុងស្តុក</span> &bull; <span style="color: var(--text-muted);">${soldCount} បានលក់</span> (សរុប ${imeis.length})`;
        }

        if (imeis.length === 0) {
            listContainer.innerHTML = `<div style="text-align: center; padding: 12px; color: var(--text-muted); font-size: 12px;">មិនទាន់មានលេខ IMEI នៅឡើយទេ</div>`;
            return;
        }

        listContainer.innerHTML = imeis.map(i => {
            const isSold = i.status !== 'in_stock';
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: rgba(255,255,255,0.04); border-radius: 6px; border: 1px solid var(--border-subtle);">
                    <div>
                        <span style="font-family: var(--font-nums); font-weight: 700; color: #38bdf8; font-size: 13px;">${i.imei}</span>
                        <span style="font-size: 11px; color: var(--text-muted); margin-left: 8px;">${i.color || ''} &bull; ${i.condition || ''} &bull; ថ្ម ${i.battery || 100}%</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="stock-tag ${isSold ? 'out-stock' : 'in-stock'}" style="font-size: 10px; padding: 2px 6px;">
                            ${isSold ? 'លក់ហើយ' : 'ក្នុងស្តុក'}
                        </span>
                        <button type="button" class="btn-remove-item" onclick="Inventory.deleteImeiFromProduct('${prod.id}', '${i.imei}')" title="លុប IMEI នេះ" style="background: none; border: none; cursor: pointer;">
                            <i class="fa-solid fa-trash-can" style="color: #f87171; font-size: 12px;"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    handleAddImeiInEdit: function () {
        const prodId = document.getElementById('edit-prod-id').value;
        const imeiInput = document.getElementById('edit-new-imei-input');
        if (!prodId || !imeiInput) return;

        const val = imeiInput.value.trim();
        if (!val) {
            App.showToast('សូមវាយលេខ IMEI ជាមុនសិន!', 'error');
            return;
        }

        const products = Storage.getProducts();
        const prod = products.find(p => p.id === prodId);
        if (!prod) return;

        if (!prod.imeis) prod.imeis = [];

        // Check duplicate in this product
        if (prod.imeis.some(i => i.imei === val)) {
            App.showToast('លេខ IMEI នេះមានក្នុងបញ្ជីរួចហើយ!', 'error');
            return;
        }

        prod.imeis.push({
            imei: val,
            color: 'Standard',
            condition: 'New',
            battery: 100,
            cost: prod.cost || 0,
            status: 'in_stock'
        });

        Storage.saveProducts(products);
        Inventory.renderEditImeis(prod);
        Inventory.renderTable();
        if (window.POS) POS.renderProducts();

        imeiInput.value = '';
        App.showToast(`បានបន្ថែម IMEI ${val} ជោគជ័យ!`, 'success');
    },

    deleteImeiFromProduct: function (productId, imeiStr) {
        if (!confirm(`តើអ្នកពិតជាចង់លុបលេខ IMEI "${imeiStr}" នេះចេញមែនទេ?`)) return;

        const products = Storage.getProducts();
        const prod = products.find(p => p.id === productId);
        if (!prod || !prod.imeis) return;

        prod.imeis = prod.imeis.filter(i => i.imei !== imeiStr);
        Storage.saveProducts(products);

        Inventory.renderEditImeis(prod);
        Inventory.renderTable();
        if (window.POS) POS.renderProducts();
        App.showToast(`បានលុប IMEI ${imeiStr} រួចរាល់!`, 'success');
    },

    handleSaveEditProduct: function () {
        const prodId = document.getElementById('edit-prod-id').value;
        const name = document.getElementById('edit-prod-name').value.trim();
        const barcode = document.getElementById('edit-prod-barcode') ? document.getElementById('edit-prod-barcode').value.trim() : '';
        const category = document.getElementById('edit-prod-cat').value;
        const cost = parseFloat(document.getElementById('edit-prod-cost').value) || 0;
        const price = parseFloat(document.getElementById('edit-prod-price').value) || 0;
        const warranty = parseInt(document.getElementById('edit-prod-warranty').value) || 0;
        const image = document.getElementById('edit-prod-img').value.trim();

        if (!name || price <= 0) {
            App.showToast('សូមបញ្ចូលឈ្មោះ និងតម្លៃលក់ឱ្យបានត្រឹមត្រូវ!', 'error');
            return;
        }

        const products = Storage.getProducts();
        const prod = products.find(p => p.id === prodId);
        if (!prod) {
            App.showToast('រកមិនឃើញទំនិញ!', 'error');
            return;
        }

        prod.name = name;
        prod.barcode = barcode;
        prod.category = category;
        prod.cost = cost;
        prod.price = price;
        prod.warrantyMonths = warranty;
        prod.image = image;

        if (!prod.hasImei) {
            const stockQty = parseInt(document.getElementById('edit-prod-stock-qty').value);
            prod.stockCount = isNaN(stockQty) ? 0 : Math.max(0, stockQty);
        }

        Storage.saveProducts(products);

        document.getElementById('edit-product-modal').classList.remove('show');
        Inventory.renderTable();
        if (window.POS) {
            POS.renderCategories();
            POS.renderProducts();
        }
        if (window.Reports) Reports.updateKPIs();
        if (window.Finance) Finance.renderDashboard();

        App.showToast(`បានកែប្រែទិន្នន័យ "${name}" ជោគជ័យ!`, 'success');
    },

    renderTradeInHistory: function () {
        const tbody = document.getElementById('tradein-history-table-body');
        if (!tbody) return;

        const tradeins = Storage.getTradeIns();
        if (tradeins.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">
                        មិនទាន់មានប្រវត្តិកត់ត្រាទិញចូលនៅឡើយទេ
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = tradeins.map(t => `
            <tr>
                <td style="font-size: 12px; color: var(--text-muted); font-family: var(--font-nums);">
                    ${t.date ? new Date(t.date).toLocaleDateString('km-KH') : '-'}
                </td>
                <td>
                    <strong style="color: var(--text-primary); font-size: 13px;">${t.customerName}</strong>
                    <div style="font-size: 11px; color: var(--text-muted);">${t.customerPhone} ${t.customerIdCard ? `&bull; ID: ${t.customerIdCard}` : ''}</div>
                </td>
                <td>
                    <strong style="color: #38bdf8;">${t.model}</strong>
                    <div style="font-size: 11px; color: var(--text-secondary);">${t.storage || ''} &bull; ${t.color || ''}</div>
                </td>
                <td><span style="font-family: var(--font-nums); font-size: 12px; color: #94a3b8;">${t.imei}</span></td>
                <td>
                    <span class="mini-badge badge-condition">${t.condition || '99%'}</span>
                    <span style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">ថ្ម ${t.battery || 85}%</span>
                </td>
                <td style="font-family: var(--font-nums); font-weight: 700; color: #34d399;">$${(t.buyPrice || 0).toFixed(2)}</td>
                <td class="text-right">
                    <button class="btn-remove-item" onclick="Inventory.deleteTradeInRecord('${t.id}')" title="លុបកំណត់ត្រានេះ">
                        <i class="fa-solid fa-trash-can" style="color: #f87171;"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    deleteTradeInRecord: function (id) {
        if (!confirm('តើអ្នកពិតជាចង់លុបប្រវត្តិកត់ត្រាទិញចូលនេះមែនទេ?')) return;

        let tradeins = Storage.getTradeIns();
        tradeins = tradeins.filter(t => t.id !== id);
        Storage.saveTradeIns(tradeins);

        Inventory.renderTradeInHistory();
        Inventory.renderRecentTradeIns();
        App.showToast('បានលុបប្រវត្តិកត់ត្រាទិញចូលរួចរាល់!', 'success');
    },

    // =======================================================
    // PRODUCT IMAGE UPLOAD & OPTIMIZATION (COMPRESSION)
    // =======================================================
    compressImage: function (file, maxWidth = 320, maxHeight = 320, quality = 0.8) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                return reject(new Error('ឯកសារដែលបានរើសមិនមែនជារូបភាពទេ'));
            }
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.onload = function () {
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);

                    let dataUrl = '';
                    try {
                        dataUrl = canvas.toDataURL('image/webp', quality);
                        if (!dataUrl.startsWith('data:image/webp')) {
                            dataUrl = canvas.toDataURL('image/jpeg', quality);
                        }
                    } catch (err) {
                        dataUrl = canvas.toDataURL('image/jpeg', quality);
                    }

                    const sizeKb = Math.round((dataUrl.length * 0.75) / 1024);
                    resolve({ dataUrl, sizeKb, width, height });
                };
                img.onerror = () => reject(new Error('មិនអាចអានរូបភាពនេះបានទេ'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('បរាជ័យក្នុងការបើកឯកសាររូបភាព'));
            reader.readAsDataURL(file);
        });
    },

    handleFileInputChange: function (event, type) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        if (window.App && App.showToast) {
            App.showToast('កំពុងបង្ហាប់រូបភាពកុំឱ្យស៊ីទំហំ...', 'info');
        }

        Inventory.compressImage(file)
            .then(res => {
                Inventory.setImagePreview(type, res.dataUrl, res.sizeKb + ' KB');
                if (window.App && App.showToast) {
                    App.showToast(`រូបភាពត្រូវបានបង្ហាប់សល់ត្រឹម ~${res.sizeKb} KB រួចរាល់!`, 'success');
                }
            })
            .catch(err => {
                console.error('Image compression error:', err);
                if (window.App && App.showToast) {
                    App.showToast(err.message || 'មានបញ្ហាក្នុងការផ្ទុករូបភាព', 'error');
                }
            })
            .finally(() => {
                event.target.value = '';
            });
    },

    setImagePreview: function (type, dataUrl, sizeLabel) {
        const hiddenInput = document.getElementById(`${type}-prod-img`);
        const previewBox = document.getElementById(`${type}-prod-preview-box`);
        const previewImg = document.getElementById(`${type}-prod-preview-img`);
        const dropzone = document.getElementById(`${type}-prod-dropzone`);
        const sizeTag = document.getElementById(`${type}-prod-size-tag`);
        const urlWrap = document.getElementById(`${type}-prod-url-wrap`);

        if (hiddenInput) hiddenInput.value = dataUrl;
        if (previewImg) previewImg.src = dataUrl;
        if (sizeTag) sizeTag.textContent = `ទំហំ: ~${sizeLabel || 'រួចរាល់'} (បង្ហាប់រួច)`;
        if (dropzone) dropzone.style.display = 'none';
        if (previewBox) previewBox.style.display = 'flex';
        if (urlWrap) urlWrap.style.display = 'none';
    },

    removeImage: function (type) {
        const hiddenInput = document.getElementById(`${type}-prod-img`);
        const previewBox = document.getElementById(`${type}-prod-preview-box`);
        const previewImg = document.getElementById(`${type}-prod-preview-img`);
        const dropzone = document.getElementById(`${type}-prod-dropzone`);
        const urlWrap = document.getElementById(`${type}-prod-url-wrap`);
        const urlInput = document.getElementById(`${type}-prod-url-input`);

        if (hiddenInput) hiddenInput.value = '';
        if (previewImg) previewImg.src = '';
        if (previewBox) previewBox.style.display = 'none';
        if (dropzone) dropzone.style.display = 'flex';
        if (urlWrap) urlWrap.style.display = 'none';
        if (urlInput) urlInput.value = '';
    },

    resetImageUploader: function (type) {
        Inventory.removeImage(type);
    },

    toggleUrlInput: function (type) {
        const urlWrap = document.getElementById(`${type}-prod-url-wrap`);
        const urlInput = document.getElementById(`${type}-prod-url-input`);
        if (!urlWrap) return;

        if (urlWrap.style.display === 'none' || !urlWrap.style.display) {
            urlWrap.style.display = 'flex';
            if (urlInput) urlInput.focus();
        } else {
            urlWrap.style.display = 'none';
        }
    },

    applyUrlImage: function (type) {
        const urlInput = document.getElementById(`${type}-prod-url-input`);
        if (!urlInput) return;
        const val = urlInput.value.trim();
        if (!val) {
            if (window.App && App.showToast) App.showToast('សូមបញ្ចូល Link URL របស់រូបភាព!', 'error');
            return;
        }
        if (!val.startsWith('http://') && !val.startsWith('https://') && !val.startsWith('data:')) {
            if (window.App && App.showToast) App.showToast('Link URL ត្រូវចាប់ផ្តើមដោយ https:// ឬ http://', 'error');
            return;
        }

        const testImg = new Image();
        testImg.onload = function () {
            Inventory.setImagePreview(type, val, 'Link URL');
            if (window.App && App.showToast) App.showToast('បានដាក់រូបភាពពី Link URL ជោគជ័យ!', 'success');
        };
        testImg.onerror = function () {
            if (window.App && App.showToast) App.showToast('មិនអាចទាញយករូបភាពពី Link នេះបានទេ សូមពិនិត្យ Link ឡើងវិញ', 'error');
        };
        testImg.src = val;
    }
};

window.Inventory = Inventory;
