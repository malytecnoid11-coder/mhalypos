/**
 * MHALY SHOP - AI NOTEBOOK SALES SCANNER (ស្កេនសៀវភៅកត់ត្រាការលក់)
 * Powered by Google Gemini Vision Multimodal AI
 * Reads handwritten Khmer notes, recognizes product names, matches with inventory,
 * parses USD ($) & KHR (៛) prices, and enables 1-click batch checkout or add-to-cart.
 */

const NotebookScanner = {
    modalId: 'notebook-scanner-modal',
    currentImageBase64: null,
    currentImageMime: 'image/jpeg',
    detectedItems: [],
    selectedSaleDate: '',
    cameraStream: null,
    isAnalyzing: false,

    init: function() {
        NotebookScanner.setupTriggers();
        NotebookScanner.setupPasteListener();
    },

    setupTriggers: function() {
        // POS Cart Header button
        const btnCartHeader = document.getElementById('btn-scan-notebook');
        if (btnCartHeader) {
            btnCartHeader.addEventListener('click', () => NotebookScanner.open());
        }

        // POS Top Action Bar button
        const btnPosTop = document.getElementById('btn-pos-notebook-scan');
        if (btnPosTop) {
            btnPosTop.addEventListener('click', () => NotebookScanner.open());
        }

        // Global Header button
        const btnHeader = document.getElementById('btn-header-notebook-scan');
        if (btnHeader) {
            btnHeader.addEventListener('click', () => NotebookScanner.open());
        }
    },

    setupPasteListener: function() {
        window.addEventListener('paste', (e) => {
            const modal = document.getElementById(NotebookScanner.modalId);
            if (!modal || !modal.classList.contains('show')) return;

            const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        NotebookScanner.handleFile(blob);
                        e.preventDefault();
                        break;
                    }
                }
            }
        });
    },

    open: function() {
        const modal = document.getElementById(NotebookScanner.modalId);
        if (!modal) return;

        // Reset state
        NotebookScanner.currentImageBase64 = null;
        NotebookScanner.detectedItems = [];
        NotebookScanner.selectedSaleDate = new Date().toISOString().slice(0, 10);
        NotebookScanner.isAnalyzing = false;

        // Show step 1 (upload/camera)
        NotebookScanner.showStep('capture');
        modal.classList.add('show');
    },

    close: function() {
        const modal = document.getElementById(NotebookScanner.modalId);
        if (modal) modal.classList.remove('show');
        NotebookScanner.stopLiveCamera();
    },

    showStep: function(stepName) {
        const stepCapture = document.getElementById('nb-step-capture');
        const stepAnalyzing = document.getElementById('nb-step-analyzing');
        const stepReview = document.getElementById('nb-step-review');

        if (stepCapture) stepCapture.style.display = (stepName === 'capture') ? 'block' : 'none';
        if (stepAnalyzing) stepAnalyzing.style.display = (stepName === 'analyzing') ? 'block' : 'none';
        if (stepReview) stepReview.style.display = (stepName === 'review') ? 'block' : 'none';
    },

    // -------------------------------------------------------------
    // IMAGE CAPTURE & COMPRESSION
    // -------------------------------------------------------------
    triggerCameraInput: function() {
        const input = document.getElementById('nb-camera-file-input');
        if (input) {
            input.value = '';
            input.click();
        }
    },

    triggerGalleryInput: function() {
        const input = document.getElementById('nb-gallery-file-input');
        if (input) {
            input.value = '';
            input.click();
        }
    },

    handleFileSelect: function(event) {
        const file = event.target.files?.[0];
        if (file) {
            NotebookScanner.handleFile(file);
        }
    },

    handleFile: function(file) {
        if (!file.type.startsWith('image/')) {
            if (window.App) App.showToast('សូមជ្រើសរើសឯកសារជារូបភាព (JPG, PNG, WebP)', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const rawDataUrl = e.target.result;
            // Compress and resize for optimal AI recognition
            NotebookScanner.compressImage(rawDataUrl, 1600, 0.85, (compressedBase64, mimeType) => {
                NotebookScanner.currentImageBase64 = compressedBase64;
                NotebookScanner.currentImageMime = mimeType;
                NotebookScanner.startAnalysis();
            });
        };
        reader.readAsDataURL(file);
    },

    compressImage: function(dataUrl, maxDimension, quality, callback) {
        const img = new Image();
        img.onload = function() {
            let width = img.width;
            let height = img.height;

            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const mime = 'image/jpeg';
            const compressed = canvas.toDataURL(mime, quality);
            const base64Clean = compressed.split(',')[1];
            callback(base64Clean, mime);
        };
        img.src = dataUrl;
    },

    // -------------------------------------------------------------
    // LIVE WEBCAM / MOBILE IN-APP STREAM
    // -------------------------------------------------------------
    startLiveCamera: function() {
        const container = document.getElementById('nb-live-camera-wrap');
        const video = document.getElementById('nb-live-video');
        const captureCard = document.getElementById('nb-dropzone-card');

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            NotebookScanner.triggerCameraInput();
            return;
        }

        const constraints = {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };

        navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
                NotebookScanner.cameraStream = stream;
                if (video) {
                    video.srcObject = stream;
                    video.play().catch(() => {});
                }
                if (container) container.style.display = 'block';
                if (captureCard) captureCard.style.display = 'none';
            })
            .catch(err => {
                console.warn('Live camera access failed, falling back to file camera:', err);
                NotebookScanner.triggerCameraInput();
            });
    },

    stopLiveCamera: function() {
        if (NotebookScanner.cameraStream) {
            NotebookScanner.cameraStream.getTracks().forEach(track => track.stop());
            NotebookScanner.cameraStream = null;
        }
        const container = document.getElementById('nb-live-camera-wrap');
        const captureCard = document.getElementById('nb-dropzone-card');
        if (container) container.style.display = 'none';
        if (captureCard) captureCard.style.display = 'block';
    },

    captureLiveFrame: function() {
        const video = document.getElementById('nb-live-video');
        if (!video || !video.videoWidth) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        NotebookScanner.stopLiveCamera();

        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        NotebookScanner.compressImage(dataUrl, 1600, 0.85, (compressedBase64, mimeType) => {
            NotebookScanner.currentImageBase64 = compressedBase64;
            NotebookScanner.currentImageMime = mimeType;
            NotebookScanner.startAnalysis();
        });
    },

    // -------------------------------------------------------------
    // AI VISION ANALYSIS (GEMINI API)
    // -------------------------------------------------------------
    getApiKey: function() {
        const settings = Storage.getSettings();
        return (settings.geminiApiKey || localStorage.getItem('mhaly_gemini_api_key') || '').trim();
    },

    saveApiKey: function(key) {
        const cleanKey = (key || '').trim();
        const settings = Storage.getSettings();
        settings.geminiApiKey = cleanKey;
        Storage.saveSettings(settings);
        localStorage.setItem('mhaly_gemini_api_key', cleanKey);
        return cleanKey;
    },

    startAnalysis: function() {
        const apiKey = NotebookScanner.getApiKey();
        if (!apiKey) {
            NotebookScanner.showApiKeyPrompt();
            return;
        }

        NotebookScanner.showStep('analyzing');
        NotebookScanner.updateLoadingText('AI កំពុងវិភាគរូបភាព និងអានអក្សរសរសេរដៃ...');

        const products = Storage.getProducts();
        const settings = Storage.getSettings();
        const exchangeRate = settings.exchangeRate || 4100;

        // Build compact catalog to help AI match product names and prices
        const compactCatalog = products.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            stockCount: p.hasImei ? (p.imeis || []).filter(i => i.status === 'in_stock').length : (p.stockCount || 0),
            category: p.category || '',
            hasImei: !!p.hasImei
        }));

        const promptText = `
You are an expert handwritten notebook sales reader for "Mhaly Shop" in Cambodia.
The image shows handwritten sales notes or records made during the day.
Language: Khmer, English, Numbers.

INSTRUCTIONS:
1. Examine the image carefully. Identify each sold product or service item recorded on the page.
2. For each item extract:
   - "raw_text": The exact handwritten text on that line (e.g., "LCD Y04 1 = 20$", "ខ្នង Reno2F x 2 = 40000៛", "កណ្តឹង Y25 1 2.5$").
   - "product_name": Clean descriptive product or service name.
   - "matched_id": If it matches an item in the provided Product Catalog below, output its exact "id". Otherwise null.
   - "quantity": Number of units sold (default 1 if not specified).
   - "price_usd": Unit price in USD.
     * If the written price is in USD ($), use that number.
     * If the written price is in Cambodian Riel (៛ / KHR / numbers >= 1000 like 20,000៛, 41,000៛, 5000៛), CONVERT to USD by dividing by the exchange rate (${exchangeRate}). Example: 20,500៛ / ${exchangeRate} = 5.00 USD.
     * If no price is written on the note but matched_id is found, use the catalog price.
   - "currency_original": "USD" or "KHR".
   - "original_price_text": The raw price text as written (e.g. "20$", "20,000៛", "2.5").
3. "detected_date": If a date is written on the notebook page (e.g. "24/10", "24-10-2026", "ថ្ងៃ២៤"), format as YYYY-MM-DD. Otherwise null.
4. "detected_total_usd": The grand total calculated from all items.

CURRENT EXCHANGE RATE: 1 USD = ${exchangeRate} KHR.

PRODUCT CATALOG:
${JSON.stringify(compactCatalog)}

OUTPUT FORMAT:
Respond with ONLY a valid, raw JSON object (no markdown, no backticks, no code fence, no introductory text):
{
  "detected_date": "YYYY-MM-DD or null",
  "detected_total_usd": 0.00,
  "items": [
    {
      "raw_text": "...",
      "product_name": "...",
      "matched_id": "...",
      "quantity": 1,
      "price_usd": 0.00,
      "currency_original": "USD or KHR",
      "original_price_text": "..."
    }
  ]
}
`.trim();

        // 1. Try server endpoint first (/api/analyze-notes) if available
        NotebookScanner.callApiEndpoint(apiKey, promptText, (err, result) => {
            if (err) {
                console.warn('[NotebookScanner] Server endpoint failed, attempting direct Gemini client call:', err);
                // 2. Direct browser call to Google Gemini API
                NotebookScanner.callGeminiDirect(apiKey, promptText, (directErr, directResult) => {
                    if (directErr) {
                        NotebookScanner.handleAnalysisError(directErr);
                    } else {
                        NotebookScanner.processAiResult(directResult);
                    }
                });
            } else {
                NotebookScanner.processAiResult(result);
            }
        });
    },

    callApiEndpoint: function(apiKey, promptText, callback) {
        fetch('/api/analyze-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey: apiKey,
                prompt: promptText,
                imageBase64: NotebookScanner.currentImageBase64,
                mimeType: NotebookScanner.currentImageMime
            })
        })
        .then(res => {
            if (!res.ok) throw new Error('Server returned HTTP ' + res.status);
            return res.json();
        })
        .then(data => {
            if (data.error) throw new Error(data.error);
            const resText = typeof data.result === 'string' ? data.result.trim() : '';
            if (!resText) {
                throw new Error('AI មិនបានឆ្លើយតបទិន្នន័យត្រលប់មកវិញទេ');
            }
            callback(null, resText);
        })
        .catch(err => callback(err));
    },

    extractGeminiText: function(data) {
        if (!data) return '';
        console.log('[NotebookScanner] Gemini API response:', data);

        if (data.error) {
            throw new Error(data.error.message || ('Gemini Error: ' + JSON.stringify(data.error)));
        }

        const candidate = data.candidates?.[0];
        if (!candidate) {
            if (data.promptFeedback?.blockReason) {
                throw new Error('Google Gemini បានទប់ស្កាត់រូបភាពនេះដោយសារ៖ ' + data.promptFeedback.blockReason);
            }
            return '';
        }

        if (candidate.finishReason === 'SAFETY') {
            throw new Error('Google Gemini បានទប់ស្កាត់រូបភាពដោយសារ Safety Filter (សូមពិនិត្យរូបភាពសៀវភៅ)');
        }

        // Direct candidate.text
        if (typeof candidate.text === 'string' && candidate.text.trim().length > 0) {
            return candidate.text.trim();
        }

        // Content parts
        const parts = candidate.content?.parts;
        if (Array.isArray(parts) && parts.length > 0) {
            const textParts = parts
                .map(p => (p && typeof p.text === 'string') ? p.text : '')
                .filter(t => t.trim().length > 0);

            if (textParts.length > 0) {
                const jsonPart = textParts.find(t => t.includes('{') && t.includes('}'));
                if (jsonPart) return jsonPart;
                return textParts.join('\n');
            }
        }

        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
            throw new Error(`AI បញ្ចប់ដោយស្ថានភាព៖ ${candidate.finishReason}`);
        }

        return '';
    },

    callGeminiDirect: function(apiKey, promptText, callback) {
        const settings = Storage.getSettings();
        const preferredModel = NotebookScanner.resolvedModel || settings.geminiModel || 'gemini-2.0-flash';

        // Candidates in order of speed and stability
        const candidateModels = [
            preferredModel,
            'gemini-2.0-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash-002',
            'gemini-1.5-flash-001',
            'gemini-2.5-flash',
            'gemini-1.5-pro'
        ];
        // Deduplicate
        const uniqueModels = Array.from(new Set(candidateModels));

        const tryModelAtIndex = (index) => {
            if (index >= uniqueModels.length) {
                // If all presets failed, query ListModels to find account's active model
                NotebookScanner.fetchAvailableModelAndRun(apiKey, promptText, callback);
                return;
            }

            const model = uniqueModels[index];
            NotebookScanner.updateLoadingText(`AI កំពុងវិភាគរូបភាព (ម៉ូឌែល: ${model})...`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            const payload = {
                contents: [
                    {
                        parts: [
                            { text: promptText },
                            {
                                inline_data: {
                                    mime_type: NotebookScanner.currentImageMime,
                                    data: NotebookScanner.currentImageBase64
                                }
                            }
                        ]
                    }
                ],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ],
                generationConfig: {
                    temperature: 0.15,
                    topP: 0.95
                }
            };

            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(j => {
                        const errMsg = j.error?.message || `HTTP ${res.status}`;
                        // If model not found (404), seamlessly try next model candidate
                        if (res.status === 404 || errMsg.includes('not found') || errMsg.includes('not supported')) {
                            console.warn(`[NotebookScanner] Model ${model} not available (${errMsg}), trying next candidate...`);
                            tryModelAtIndex(index + 1);
                        } else {
                            throw new Error(errMsg);
                        }
                    });
                }
                return res.json();
            })
            .then(data => {
                if (!data) return; // Handled by next retry in 404 branch
                const rawText = NotebookScanner.extractGeminiText(data);
                if (!rawText) throw new Error('AI មិនបានឆ្លើយតបទិន្នន័យត្រលប់មកវិញទេ');
                // Cache working model for future calls
                NotebookScanner.resolvedModel = model;
                callback(null, rawText);
            })
            .catch(err => {
                if (index < uniqueModels.length - 1) {
                    tryModelAtIndex(index + 1);
                } else {
                    callback(err);
                }
            });
        };

        tryModelAtIndex(0);
    },

    fetchAvailableModelAndRun: function(apiKey, promptText, callback) {
        NotebookScanner.updateLoadingText('កំពុងស្វែងរកបញ្ជី Model ដែល Key អាចប្រើប្រាស់បាន...');
        fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
            .then(res => res.json())
            .then(data => {
                const models = data.models || [];
                const supported = models.filter(m => (m.supportedGenerationMethods || []).includes('generateContent'));
                if (supported.length === 0) {
                    throw new Error('API Key នេះមិនទាន់មានសិទ្ធិប្រើប្រាស់ generateContent Model ណាមួយឡើយ');
                }
                // Pick best match: prefer flash, or first available
                const best = supported.find(m => m.name.includes('flash')) || supported[0];
                const cleanModelName = best.name.replace(/^models\//, '');

                NotebookScanner.updateLoadingText(`AI កំពុងវិភាគរូបភាព (ម៉ូឌែល: ${cleanModelName})...`);
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelName}:generateContent?key=${apiKey}`;
                const payload = {
                    contents: [
                        {
                            parts: [
                                { text: promptText },
                                {
                                    inline_data: {
                                        mime_type: NotebookScanner.currentImageMime,
                                        data: NotebookScanner.currentImageBase64
                                    }
                                }
                            ]
                        }
                    ],
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                    ],
                    generationConfig: { temperature: 0.15, topP: 0.95 }
                };

                return fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(r => r.json())
                .then(d => {
                    const rawText = NotebookScanner.extractGeminiText(d);
                    if (!rawText) throw new Error('AI មិនបានឆ្លើយតបទិន្នន័យត្រលប់មកវិញទេ');
                    NotebookScanner.resolvedModel = cleanModelName;
                    callback(null, rawText);
                });
            })
            .catch(err => callback(err));
    },

    fallbackExtractFromFreeText: function(text) {
        if (!text) return null;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
        const items = [];
        const settings = Storage.getSettings();
        const rate = settings.exchangeRate || 4100;

        for (const line of lines) {
            // Check if line looks like an item: has price (e.g. $10, 10$, 50000r, 50000៛)
            const priceMatch = line.match(/(\$?\s*([0-9]+(?:\.[0-9]+)?)\s*\$?)|(([0-9,]+)\s*(?:៛|r|riel|រៀល))/i);
            if (priceMatch) {
                let priceUsd = 0;
                let origCurr = 'USD';
                let origText = '';

                if (line.includes('៛') || /r|riel|រៀល/i.test(line)) {
                    const khrVal = parseFloat((priceMatch[4] || priceMatch[2] || '0').replace(/,/g, ''));
                    priceUsd = Math.round((khrVal / rate) * 100) / 100;
                    origCurr = 'KHR';
                    origText = (priceMatch[4] || priceMatch[2] || '0') + ' ៛';
                } else {
                    priceUsd = parseFloat(priceMatch[2] || priceMatch[1] || '0');
                    origCurr = 'USD';
                    origText = '$' + priceUsd;
                }

                const qtyMatch = line.match(/(?:x|\*|\bqty:?|\bចំនួន)\s*([0-9]+)/i);
                const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;

                let prodName = line
                    .replace(/[\$៛]/g, '')
                    .replace(/(?:x|\*|\bqty:?|\bចំនួន)\s*[0-9]+/gi, '')
                    .replace(/[0-9]+(?:\.[0-9]+)?/g, '')
                    .replace(/[-=:,]/g, ' ')
                    .trim();

                if (prodName.length > 0 && priceUsd > 0) {
                    items.push({
                        raw_text: line,
                        product_name: prodName,
                        quantity: qty,
                        price_usd: priceUsd,
                        currency_original: origCurr,
                        original_price_text: origText
                    });
                }
            }
        }

        return items.length > 0 ? { items: items } : null;
    },

    processAiResult: function(rawResponse) {
        let text = typeof rawResponse === 'string' ? rawResponse : JSON.stringify(rawResponse);

        // Clean any markdown code blocks (```json ... ```)
        text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

        // Extract JSON substring if wrapped in extra text
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            text = text.substring(firstBrace, lastBrace + 1);
        }

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            console.warn('Failed to parse AI JSON, attempting fallback line parsing:', e, text);
            parsed = NotebookScanner.fallbackExtractFromFreeText(text);
            if (!parsed || !parsed.items || parsed.items.length === 0) {
                NotebookScanner.handleAnalysisError(new Error('ទិន្នន័យ AI មិនត្រឹមត្រូវតាមទម្រង់ JSON: ' + e.message));
                return;
            }
        }

        const items = Array.isArray(parsed.items) ? parsed.items : [];
        const allProducts = Storage.getProducts();
        const settings = Storage.getSettings();
        const rate = settings.exchangeRate || 4100;

        // Process each item and enhance with local catalog matching
        NotebookScanner.detectedItems = items.map((item, idx) => {
            let matchedProduct = null;
            if (item.matched_id) {
                matchedProduct = allProducts.find(p => p.id === item.matched_id);
            }

            if (!matchedProduct && item.product_name) {
                matchedProduct = NotebookScanner.fuzzyFindProduct(item.product_name, allProducts);
            }

            const qty = Math.max(1, parseInt(item.quantity) || 1);
            let price = parseFloat(item.price_usd);
            if (isNaN(price) || price <= 0) {
                price = matchedProduct ? matchedProduct.price : 0;
            }

            return {
                id: 'item-' + Date.now() + '-' + idx,
                rawText: item.raw_text || '',
                productName: matchedProduct ? matchedProduct.name : (item.product_name || 'ទំនិញមិនស្គាល់'),
                productId: matchedProduct ? matchedProduct.id : '',
                hasImei: matchedProduct ? !!matchedProduct.hasImei : false,
                isMatched: !!matchedProduct,
                stockCount: matchedProduct ? (matchedProduct.hasImei ? (matchedProduct.imeis || []).filter(i => i.status === 'in_stock').length : (matchedProduct.stockCount || 0)) : 0,
                quantity: qty,
                price: price,
                cost: matchedProduct ? (matchedProduct.cost || 0) : 0,
                currencyOriginal: item.currency_original || 'USD',
                originalPriceText: item.original_price_text || ''
            };
        });

        // Date detection
        if (parsed.detected_date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.detected_date)) {
            NotebookScanner.selectedSaleDate = parsed.detected_date;
        }

        NotebookScanner.showStep('review');
        NotebookScanner.renderReviewScreen();
    },

    fuzzyFindProduct: function(nameStr, products) {
        if (!nameStr) return null;
        const norm = nameStr.toLowerCase().replace(/[\s\-_+()]/g, '');

        // 1. Exact normalized name match
        let found = products.find(p => p.name.toLowerCase().replace(/[\s\-_+()]/g, '') === norm);
        if (found) return found;

        // 2. Contains match
        found = products.find(p => {
            const pNorm = p.name.toLowerCase().replace(/[\s\-_+()]/g, '');
            return pNorm.includes(norm) || norm.includes(pNorm);
        });
        if (found) return found;

        // 3. Brand + Model match (e.g. "Reno2F", "iPhone 13", "Y04")
        found = products.find(p => {
            const words = nameStr.toLowerCase().split(/\s+/).filter(w => w.length > 2);
            return words.some(w => p.name.toLowerCase().includes(w));
        });
        return found || null;
    },

    handleAnalysisError: function(err) {
        NotebookScanner.showStep('capture');
        const msg = err.message || 'មិនអាចវិភាគរូបភាពបានទេ';
        if (msg.includes('API_KEY_INVALID') || msg.includes('403') || msg.includes('API key not valid')) {
            NotebookScanner.showApiKeyPrompt('API Key មិនត្រឹមត្រូវ ឬផុតកំណត់។ សូមពិនិត្យឡើងវិញ។');
        } else {
            if (window.App) {
                App.showToast('បរាជ័យក្នុងការស្កេន៖ ' + msg, 'error');
            } else {
                alert('បរាជ័យក្នុងការស្កេន៖ ' + msg);
            }
        }
    },

    updateLoadingText: function(text) {
        const el = document.getElementById('nb-loading-status-text');
        if (el) el.innerText = text;
    },

    // -------------------------------------------------------------
    // REVIEW & VERIFICATION SCREEN
    // -------------------------------------------------------------
    renderReviewScreen: function() {
        const container = document.getElementById('nb-review-items-list');
        const previewImg = document.getElementById('nb-review-photo-preview');
        const dateInput = document.getElementById('nb-sale-date-input');

        if (previewImg && NotebookScanner.currentImageBase64) {
            previewImg.src = `data:${NotebookScanner.currentImageMime};base64,${NotebookScanner.currentImageBase64}`;
        }

        if (dateInput) {
            dateInput.value = NotebookScanner.selectedSaleDate || new Date().toISOString().slice(0, 10);
            NotebookScanner.syncDateQuickButtons(dateInput.value);
        }

        if (!container) return;

        if (NotebookScanner.detectedItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 30px; color: var(--text-muted);">
                    <i class="fa-solid fa-file-circle-question" style="font-size: 38px; color: #f59e0b; margin-bottom: 10px; display: block;"></i>
                    <p>AI រកមិនឃើញមុខទំនិញ ឬតម្លៃច្បាស់លាស់ក្នុងរូបថតនេះទេ</p>
                    <button type="button" class="btn-secondary mt-2" onclick="NotebookScanner.addNewItemRow()">
                        <i class="fa-solid fa-plus"></i> បន្ថែមទំនិញដោយដៃ
                    </button>
                </div>
            `;
            NotebookScanner.updateTotalsUI();
            return;
        }

        const allProducts = Storage.getProducts();
        const settings = Storage.getSettings();
        const rate = settings.exchangeRate || 4100;

        container.innerHTML = NotebookScanner.detectedItems.map((item, idx) => {
            const lineTotalUsd = (item.price * item.quantity);
            const lineTotalKhr = Math.round(lineTotalUsd * rate);

            // Generate product options for dropdown
            const optionsHtml = allProducts.map(p => {
                const isSelected = (p.id === item.productId) ? 'selected' : '';
                const pStock = p.hasImei ? (p.imeis || []).filter(i => i.status === 'in_stock').length : (p.stockCount || 0);
                return `<option value="${p.id}" ${isSelected}>${p.name} ($${p.price.toFixed(2)} • ស្តុក: ${pStock})</option>`;
            }).join('');

            const isCustom = !item.productId;
            const currencyBadge = (item.currencyOriginal === 'KHR')
                ? `<span class="nb-curr-tag khr" title="ដើមជាលុយរៀល: ${item.originalPriceText || ''}">៛ KHR</span>`
                : `<span class="nb-curr-tag usd" title="ដើមជាលុយដុល្លារ: ${item.originalPriceText || ''}">$ USD</span>`;

            return `
                <div class="nb-item-row ${item.isMatched ? 'matched' : 'unmatched'}" id="nb-row-${item.id}">
                    <div class="nb-item-row-header">
                        <span class="nb-row-num">#${idx + 1}</span>
                        <div class="nb-row-raw-text" title="អត្ថបទដើមសរសេរដៃ">
                            <i class="fa-solid fa-pen-nib"></i> ${item.rawText || item.productName}
                        </div>
                        ${currencyBadge}
                        <button type="button" class="nb-btn-del-row" onclick="NotebookScanner.deleteItemRow('${item.id}')" title="លុបមុខនេះចេញ">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>

                    <div class="nb-item-row-body">
                        <!-- Product Selection Dropdown -->
                        <div class="nb-field-group prod-select-group">
                            <label><i class="fa-solid fa-box"></i> ផ្គូផ្គងជាមួយទំនិញក្នុងស្តុក</label>
                            <select class="nb-prod-select" onchange="NotebookScanner.handleProductSelectChange('${item.id}', this.value)">
                                <option value="" ${isCustom ? 'selected' : ''}>-- សេវាកម្ម / ទំនិញក្រៅស្តុក (Custom) --</option>
                                ${optionsHtml}
                            </select>
                            ${isCustom ? `
                                <input type="text" class="nb-custom-name-input" value="${item.productName}" 
                                    placeholder="ឈ្មោះទំនិញ / សេវាកម្ម..."
                                    onchange="NotebookScanner.handleCustomNameChange('${item.id}', this.value)">
                            ` : `
                                <div class="nb-stock-indicator ${item.stockCount <= 0 ? 'text-danger' : 'text-success'}">
                                    <i class="fa-solid fa-cubes-stacked"></i> ក្នុងស្តុក៖ ${item.stockCount} គ្រឿង
                                </div>
                            `}
                        </div>

                        <!-- Quantity and Price Inputs -->
                        <div class="nb-field-row-inputs">
                            <div class="nb-field-group qty-group">
                                <label>ចំនួន (Qty)</label>
                                <div class="nb-qty-stepper">
                                    <button type="button" onclick="NotebookScanner.updateItemQty('${item.id}', -1)">-</button>
                                    <input type="number" min="1" value="${item.quantity}" 
                                        onchange="NotebookScanner.handleItemQtyChange('${item.id}', this.value)">
                                    <button type="button" onclick="NotebookScanner.updateItemQty('${item.id}', 1)">+</button>
                                </div>
                            </div>

                            <div class="nb-field-group price-group">
                                <label>តម្លៃ ($ USD)</label>
                                <div class="input-prefix-wrap">
                                    <span class="prefix">$</span>
                                    <input type="number" step="any" min="0" value="${item.price.toFixed(2)}"
                                        oninput="NotebookScanner.handleItemPriceChange('${item.id}', this.value)">
                                </div>
                                <span class="nb-price-khr-hint" id="khr-hint-${item.id}">
                                    ≈ ${(item.price * rate).toLocaleString()} ៛
                                </span>
                            </div>

                            <div class="nb-field-group subtotal-group">
                                <label>សរុប (Total)</label>
                                <div class="nb-line-total-usd" id="line-usd-${item.id}">$${lineTotalUsd.toFixed(2)}</div>
                                <div class="nb-line-total-khr" id="line-khr-${item.id}">${lineTotalKhr.toLocaleString()} ៛</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        NotebookScanner.updateTotalsUI();
    },

    handleProductSelectChange: function(itemId, newProductId) {
        const item = NotebookScanner.detectedItems.find(i => i.id === itemId);
        if (!item) return;

        const allProducts = Storage.getProducts();
        if (newProductId) {
            const p = allProducts.find(prod => prod.id === newProductId);
            if (p) {
                item.productId = p.id;
                item.productName = p.name;
                item.price = p.price;
                item.cost = p.cost || 0;
                item.hasImei = !!p.hasImei;
                item.isMatched = true;
                item.stockCount = p.hasImei ? (p.imeis || []).filter(i => i.status === 'in_stock').length : (p.stockCount || 0);
            }
        } else {
            item.productId = '';
            item.hasImei = false;
            item.isMatched = false;
            item.stockCount = 0;
        }
        NotebookScanner.renderReviewScreen();
    },

    handleCustomNameChange: function(itemId, nameVal) {
        const item = NotebookScanner.detectedItems.find(i => i.id === itemId);
        if (item) item.productName = (nameVal || 'ទំនិញ').trim();
    },

    handleItemQtyChange: function(itemId, val) {
        const item = NotebookScanner.detectedItems.find(i => i.id === itemId);
        if (!item) return;
        const parsed = parseInt(val) || 1;
        item.quantity = Math.max(1, parsed);
        NotebookScanner.updateSingleRowTotals(item);
        NotebookScanner.updateTotalsUI();
    },

    updateItemQty: function(itemId, delta) {
        const item = NotebookScanner.detectedItems.find(i => i.id === itemId);
        if (!item) return;
        item.quantity = Math.max(1, item.quantity + delta);
        NotebookScanner.updateSingleRowTotals(item);
        NotebookScanner.updateTotalsUI();
        const input = document.querySelector(`#nb-row-${itemId} .qty-group input`);
        if (input) input.value = item.quantity;
    },

    handleItemPriceChange: function(itemId, val) {
        const item = NotebookScanner.detectedItems.find(i => i.id === itemId);
        if (!item) return;
        const parsed = parseFloat(val);
        if (!isNaN(parsed) && parsed >= 0) {
            item.price = parsed;
            NotebookScanner.updateSingleRowTotals(item);
            NotebookScanner.updateTotalsUI();
        }
    },

    updateSingleRowTotals: function(item) {
        const settings = Storage.getSettings();
        const rate = settings.exchangeRate || 4100;
        const lineTotal = item.price * item.quantity;
        const lineKhr = Math.round(lineTotal * rate);

        const elUsd = document.getElementById(`line-usd-${item.id}`);
        const elKhr = document.getElementById(`line-khr-${item.id}`);
        const elHint = document.getElementById(`khr-hint-${item.id}`);

        if (elUsd) elUsd.innerText = `$${lineTotal.toFixed(2)}`;
        if (elKhr) elKhr.innerText = `${lineKhr.toLocaleString()} ៛`;
        if (elHint) elHint.innerText = `≈ ${(item.price * rate).toLocaleString()} ៛`;
    },

    deleteItemRow: function(itemId) {
        NotebookScanner.detectedItems = NotebookScanner.detectedItems.filter(i => i.id !== itemId);
        NotebookScanner.renderReviewScreen();
    },

    addNewItemRow: function() {
        const allProducts = Storage.getProducts();
        const defaultProd = allProducts[0] || null;

        NotebookScanner.detectedItems.push({
            id: 'item-new-' + Date.now(),
            rawText: 'ទំនិញបន្ថែមដោយដៃ',
            productName: defaultProd ? defaultProd.name : 'ទំនិញថ្មី',
            productId: defaultProd ? defaultProd.id : '',
            hasImei: defaultProd ? !!defaultProd.hasImei : false,
            isMatched: !!defaultProd,
            stockCount: defaultProd ? (defaultProd.hasImei ? (defaultProd.imeis || []).filter(i => i.status === 'in_stock').length : (defaultProd.stockCount || 0)) : 0,
            quantity: 1,
            price: defaultProd ? defaultProd.price : 1,
            cost: defaultProd ? (defaultProd.cost || 0) : 0,
            currencyOriginal: 'USD',
            originalPriceText: ''
        });

        NotebookScanner.renderReviewScreen();
    },

    updateTotalsUI: function() {
        const settings = Storage.getSettings();
        const rate = settings.exchangeRate || 4100;

        let totalUsd = 0;
        let totalItemsCount = 0;

        NotebookScanner.detectedItems.forEach(item => {
            totalUsd += (item.price * item.quantity);
            totalItemsCount += item.quantity;
        });

        const totalKhr = Math.round(totalUsd * rate);

        const elCount = document.getElementById('nb-total-items-count');
        const elUsd = document.getElementById('nb-grand-total-usd');
        const elKhr = document.getElementById('nb-grand-total-khr');

        if (elCount) elCount.innerText = `${totalItemsCount} មុខ`;
        if (elUsd) elUsd.innerText = `$${totalUsd.toFixed(2)}`;
        if (elKhr) elKhr.innerText = `${totalKhr.toLocaleString()} ៛`;
    },

    setSaleDatePreset: function(preset) {
        const dateInput = document.getElementById('nb-sale-date-input');
        if (!dateInput) return;

        let dateStr = '';
        if (preset === 'today') {
            dateStr = new Date().toISOString().slice(0, 10);
        } else if (preset === 'yesterday') {
            const y = new Date();
            y.setDate(y.getDate() - 1);
            dateStr = y.toISOString().slice(0, 10);
        }

        dateInput.value = dateStr;
        NotebookScanner.selectedSaleDate = dateStr;
        NotebookScanner.syncDateQuickButtons(dateStr);
    },

    syncDateQuickButtons: function(dateVal) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const y = new Date();
        y.setDate(y.getDate() - 1);
        const yStr = y.toISOString().slice(0, 10);

        const btnToday = document.getElementById('btn-nb-date-today');
        const btnYesterday = document.getElementById('btn-nb-date-yesterday');

        if (btnToday) btnToday.classList.toggle('active', dateVal === todayStr);
        if (btnYesterday) btnYesterday.classList.toggle('active', dateVal === yStr);
    },

    // -------------------------------------------------------------
    // ACTION 1: ADD TO POS CART
    // -------------------------------------------------------------
    addItemsToPosCart: function() {
        if (NotebookScanner.detectedItems.length === 0) {
            if (window.App) App.showToast('មិនមានទំនិញសម្រាប់បញ្ចូលទេ!', 'error');
            return;
        }

        const allProducts = Storage.getProducts();

        let addedCount = 0;
        NotebookScanner.detectedItems.forEach(item => {
            const prod = allProducts.find(p => p.id === item.productId);

            if (prod && prod.hasImei) {
                // If phone with IMEI, take available IMEIs up to quantity
                const availableImeis = (prod.imeis || []).filter(i => {
                    const inStock = i.status === 'in_stock';
                    const inCart = POS.cart.some(c => c.hasImei && c.imei === i.imei);
                    return inStock && !inCart;
                });

                for (let q = 0; q < item.quantity; q++) {
                    const imeiObj = availableImeis[q] || null;
                    POS.cart.push({
                        cartId: 'c-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                        productId: prod.id,
                        name: prod.name,
                        price: item.price,
                        originalPrice: prod.price,
                        cost: imeiObj ? (imeiObj.cost || prod.cost) : prod.cost,
                        quantity: 1,
                        hasImei: true,
                        imei: imeiObj ? imeiObj.imei : 'N/A',
                        color: imeiObj ? imeiObj.color : 'ស្តង់ដារ',
                        storage: prod.storage || 'Standard',
                        condition: imeiObj ? imeiObj.condition : 'Used',
                        battery: imeiObj ? imeiObj.battery : null,
                        warrantyMonths: prod.warrantyMonths || 12
                    });
                    addedCount++;
                }
            } else if (prod && !prod.hasImei) {
                // Standard accessory / item in stock
                const existing = POS.cart.find(c => c.productId === prod.id && !c.hasImei);
                if (existing) {
                    existing.quantity += item.quantity;
                    existing.price = item.price; // honor verified price
                } else {
                    POS.cart.push({
                        cartId: 'c-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                        productId: prod.id,
                        name: prod.name,
                        price: item.price,
                        originalPrice: prod.price,
                        cost: prod.cost,
                        quantity: item.quantity,
                        hasImei: false,
                        storage: prod.storage,
                        warrantyMonths: prod.warrantyMonths || 0
                    });
                }
                addedCount += item.quantity;
            } else {
                // Custom Service or unmatched item
                POS.cart.push({
                    cartId: 'c-srv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                    productId: 'custom-' + Date.now(),
                    name: item.productName,
                    price: item.price,
                    originalPrice: item.price,
                    cost: 0,
                    quantity: item.quantity,
                    hasImei: false,
                    isService: true,
                    storage: 'សេវាកម្ម',
                    warrantyMonths: 0
                });
                addedCount += item.quantity;
            }
        });

        // Set POS Cart Date
        const posDateInput = document.getElementById('cart-sale-date');
        const scannerDate = document.getElementById('nb-sale-date-input')?.value;
        if (posDateInput && scannerDate) {
            posDateInput.value = scannerDate;
            posDateInput.dispatchEvent(new Event('change'));
        }

        POS.updateCartUI();
        NotebookScanner.close();

        if (window.App) {
            App.navigateToTab('pos-tab');
            App.playBeep();
            App.showToast(`បានបញ្ចូលទំនិញ ${addedCount} មុខ ពីសៀវភៅចូលក្នុងកន្ត្រក POS រួចរាល់!`, 'success');
        }
    },

    // -------------------------------------------------------------
    // ACTION 2: INSTANT BATCH CHECKOUT (1-CLICK DIRECT SALE)
    // -------------------------------------------------------------
    completeBatchSale: function() {
        if (NotebookScanner.detectedItems.length === 0) {
            if (window.App) App.showToast('មិនមានទំនិញសម្រាប់គិតលុយទេ!', 'error');
            return;
        }

        const settings = Storage.getSettings();
        const rate = settings.exchangeRate || 4100;

        let subtotal = 0;
        let totalCost = 0;
        let totalQty = 0;

        NotebookScanner.detectedItems.forEach(item => {
            subtotal += (item.price * item.quantity);
            totalCost += ((item.cost || 0) * item.quantity);
            totalQty += item.quantity;
        });

        const grandTotalUsd = subtotal;
        const grandTotalKhr = Math.round(grandTotalUsd * rate);

        const saleDateStr = document.getElementById('nb-sale-date-input')?.value || new Date().toISOString().slice(0, 10);
        const confirmMsg = `
ផ្ទៀងផ្ទាត់ការលក់ពីសៀវភៅ៖
• ចំនួនទំនិញ៖ ${totalQty} មុខ
• ទឹកប្រាក់សរុប៖ $${grandTotalUsd.toFixed(2)} (${grandTotalKhr.toLocaleString()} ៛)
• កាលបរិច្ឆេទលក់៖ ${saleDateStr}

តើអ្នកពិតជាចង់កត់ត្រាការលក់ និងកាត់ស្តុកឥឡូវនេះមែនទេ?
        `.trim();

        if (!confirm(confirmMsg)) return;

        // 1. Create Sale Record
        const invId = 'INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
        let finalSaleDate = new Date();
        const parts = saleDateStr.split('-').map(Number);
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            const now = new Date();
            finalSaleDate = new Date(parts[0], parts[1] - 1, parts[2], now.getHours(), now.getMinutes(), now.getSeconds());
        }

        const currentUser = Storage.getCurrentUser();
        const cashierName = currentUser ? currentUser.name : 'Mhaly (Admin)';

        // Map items for invoice
        const saleItems = NotebookScanner.detectedItems.map(item => ({
            productId: item.productId || ('custom-' + Date.now()),
            name: item.productName,
            price: item.price,
            cost: item.cost || 0,
            quantity: item.quantity,
            hasImei: item.hasImei,
            imei: item.hasImei ? 'IMEI-AUTO' : '',
            storage: 'Standard',
            warrantyMonths: 12
        }));

        const saleRecord = {
            id: invId,
            invoiceId: invId,
            date: finalSaleDate.toISOString(),
            dateFormatted: finalSaleDate.toLocaleDateString('km-KH'),
            customerName: 'អតិថិជនសៀវភៅលក់ (Notebook)',
            customerPhone: '012 xxx xxx',
            items: saleItems,
            subtotal: subtotal,
            discount: 0,
            total: grandTotalUsd,
            totalUsd: grandTotalUsd,
            totalKhr: grandTotalKhr,
            profit: Math.max(0, grandTotalUsd - totalCost),
            paymentMethod: 'cash',
            paidUsd: grandTotalUsd,
            changeUsd: 0,
            changeKhr: 0,
            cashier: cashierName,
            note: 'កត់ត្រាស្វ័យប្រវត្តិតាមរយៈ AI ស្កេនសៀវភៅលក់'
        };

        // 2. Safely deduct inventory stock (Anti-wipe protected)
        const allProducts = Storage.getProducts();
        NotebookScanner.detectedItems.forEach(item => {
            if (!item.productId) return;
            const p = allProducts.find(prod => prod.id === item.productId);
            if (p) {
                if (p.hasImei) {
                    const available = (p.imeis || []).filter(i => i.status === 'in_stock');
                    for (let q = 0; q < Math.min(item.quantity, available.length); q++) {
                        available[q].status = 'sold';
                        available[q].soldDate = finalSaleDate.toISOString();
                        available[q].soldPrice = item.price;
                        available[q].invoiceId = invId;
                    }
                } else if (p.category !== 'cat-services') {
                    p.stockCount = Math.max(0, (p.stockCount || 0) - item.quantity);
                }
            }
        });
        Storage.saveProducts(allProducts);

        // 3. Save Sale to history
        const sales = Storage.getSales();
        sales.push(saleRecord);
        sales.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        Storage.saveSales(sales);

        // 4. Update UI & trigger automated Telegram notifications if active
        if (window.TelegramReporter) {
            try { TelegramReporter.sendSaleAlert(saleRecord); } catch (_) {}
        }

        NotebookScanner.close();

        if (window.App) {
            App.playBeep();
            App.showToast(`បានកត់ត្រាការលក់ពីសៀវភៅដោយជោគជ័យ! (#${invId})`, 'success');
            App.updateDashboardKPIs();
        }

        if (window.POS) {
            POS.renderProducts();
            POS.generatePrintableReceipt(saleRecord);
            const receiptModal = document.getElementById('receipt-modal');
            if (receiptModal) receiptModal.classList.add('show');
        }
    },

    // -------------------------------------------------------------
    // API KEY SETUP PROMPT
    // -------------------------------------------------------------
    showApiKeyPrompt: function(customErrorMsg) {
        const promptWrap = document.getElementById('nb-apikey-prompt-wrap');
        const errEl = document.getElementById('nb-apikey-error-msg');
        if (promptWrap) {
            promptWrap.style.display = 'block';
            if (errEl) {
                errEl.innerText = customErrorMsg || '';
                errEl.style.display = customErrorMsg ? 'block' : 'none';
            }
        }
    },

    hideApiKeyPrompt: function() {
        const promptWrap = document.getElementById('nb-apikey-prompt-wrap');
        if (promptWrap) promptWrap.style.display = 'none';
    },

    saveKeyFromPrompt: function() {
        const input = document.getElementById('nb-prompt-apikey-input');
        const key = (input?.value || '').trim();
        if (!key) {
            alert('សូមបញ្ចូល Google Gemini API Key');
            return;
        }
        NotebookScanner.saveApiKey(key);
        NotebookScanner.hideApiKeyPrompt();
        if (window.App) App.showToast('បានរក្សាទុក Gemini API Key ដោយជោគជ័យ!', 'success');
        if (NotebookScanner.currentImageBase64) {
            NotebookScanner.startAnalysis();
        }
    },

    useDemoData: function() {
        // Quick demo test data for instant testing
        NotebookScanner.hideApiKeyPrompt();
        NotebookScanner.showStep('analyzing');
        NotebookScanner.updateLoadingText('កំពុងផ្ទុកទិន្នន័យតេស្តគំរូ...');

        setTimeout(() => {
            const allProducts = Storage.getProducts();
            const p1 = allProducts[0] || { name: 'LCD Y04', price: 20, id: 'p-1' };
            const p2 = allProducts[1] || { name: 'ខ្នង Reno2F', price: 5, id: 'p-2' };
            const p3 = allProducts[2] || { name: 'កណ្តឹង Y25', price: 2.5, id: 'p-3' };

            NotebookScanner.detectedItems = [
                {
                    id: 'item-demo-1',
                    rawText: `${p1.name} 1 = $${p1.price}`,
                    productName: p1.name,
                    productId: p1.id,
                    hasImei: !!p1.hasImei,
                    isMatched: true,
                    stockCount: p1.stockCount || 5,
                    quantity: 1,
                    price: p1.price,
                    cost: p1.cost || 0,
                    currencyOriginal: 'USD',
                    originalPriceText: `$${p1.price}`
                },
                {
                    id: 'item-demo-2',
                    rawText: `${p2.name} x 2 = 41,000៛`,
                    productName: p2.name,
                    productId: p2.id,
                    hasImei: !!p2.hasImei,
                    isMatched: true,
                    stockCount: p2.stockCount || 8,
                    quantity: 2,
                    price: 5.0,
                    cost: p2.cost || 0,
                    currencyOriginal: 'KHR',
                    originalPriceText: '41,000៛'
                },
                {
                    id: 'item-demo-3',
                    rawText: 'សេវាដូរអេក្រង់ & បិទស្រ្គីន = $10',
                    productName: 'សេវាដូរអេក្រង់ & បិទស្រ្គីន',
                    productId: '',
                    hasImei: false,
                    isMatched: false,
                    stockCount: 0,
                    quantity: 1,
                    price: 10.0,
                    cost: 0,
                    currencyOriginal: 'USD',
                    originalPriceText: '$10'
                }
            ];

            NotebookScanner.showStep('review');
            NotebookScanner.renderReviewScreen();
        }, 800);
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NotebookScanner.init());
} else {
    NotebookScanner.init();
}
window.NotebookScanner = NotebookScanner;
