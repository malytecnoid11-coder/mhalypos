/**
 * MHALY SHOP - UI STYLE STUDIO
 * ជ្រើសរើសម៉ូដពណ៌ និង Skin កម្រិតកំពូលសម្រាប់ប្រព័ន្ធលក់ Mhaly Shop POS
 * ធានាសុវត្ថិភាពទិន្នន័យ ១០០% (ផ្លាស់ប្តូរតែ CSS Theme និងពណ៌ប៉ុណ្ណោះ)
 */

const UIStyle = {
    themes: [
        {
            id: 'khmer-yantra',
            nameKh: 'យ័ន្តខ្មែរមហាសិរីសួស្តី (Sacred Khmer Yantra)',
            tag: 'ម៉ូដពេញនិយមកំពូល (Sacred Yantra & Blessing ✨)',
            icon: 'fa-solid fa-dharmachakra',
            descKh: 'ផ្ទៃខាងក្រោយមហាយ័ន្តខ្មែររំលេចពន្លឺមាសឆ្អិនឆ្អៅ ព្រះពុទ្ធសមាធិ នាគរាជមាស និងផ្កាឈូកទិព្វ។ នាំមកនូវសិរីសួស្តី ជ័យមង្គល ហេងហេង និងលាភសំណាងហូរចូលហាងឥតដាច់!',
            palette: ['#070402', '#1a0f05', '#f59e0b', '#fbbf24', '#fef08a'],
            featured: true,
            isDefault: true
        },
        {
            id: 'classic-cyber',
            nameKh: 'Mhaly Classic Cyber',
            tag: 'ម៉ូដដើមបច្ចុប្បន្ន',
            icon: 'fa-solid fa-moon',
            descKh: 'ផ្ទៃពណ៌ខៀវចាស់ Obsidian Navy លាយជាមួយគែមពណ៌មាស និងពន្លឺ Cyber Glow។ ម៉ូដប្រចាំត្រកូលដែលសម្លាញ់ធ្លាប់ប្រើស្រាប់។',
            palette: ['#080c16', '#0d1527', '#4f46e5', '#f59e0b', '#06b6d4']
        },
        {
            id: 'angkor-heritage',
            nameKh: 'មហានគរអង្គរវត្ត (Angkor Wat)',
            tag: 'កេរដំណែលជាតិខ្មែរ (Khmer Heritage)',
            icon: 'fa-solid fa-monument',
            descKh: 'ផ្ទៃរូបប្រាសាទអង្គរវត្តដ៏ស្កឹមស្កៃ រំលេចដោយពណ៌មាសបុរាណ ក្បាច់ខ្មែរ និងពន្លឺគោមប្រាសាទអង្គរ។ លើកតម្កើងអត្តសញ្ញាណជាតិ និងសិរីសួស្តីដ៏ឧត្តុង្គឧត្តម។',
            palette: ['#0a0806', '#1c150e', '#d48817', '#f6c453', '#fef08a'],
            featured: true
        },
        {
            id: 'ocean-waves',
            nameKh: 'មហាសមុទ្ររលកខៀវ (Ocean Waves)',
            tag: 'រលកទឹក & ត្រជាក់ភ្នែក (Aqua Breeze)',
            icon: 'fa-solid fa-water',
            descKh: 'ផ្ទៃមហាសមុទ្រខៀវស្រងាត់ជាមួយរលកទឹកស្រាលៗ រំលេចពន្លឺពណ៌ខៀវខ្ចី Aqua & Cyan ជួយឱ្យភ្នែកត្រជាក់ ស្រួលលក់ពេញមួយថ្ងៃ។',
            palette: ['#031321', '#062640', '#0ea5e9', '#00f5ff', '#38bdf8']
        },
        {
            id: 'forest-nature',
            nameKh: 'ព្រៃភ្នំរុក្ខជាតិបៃតង (Mountain Forest)',
            tag: 'ធម្មជាតិបៃតង & ត្រជាក់ភ្នែក (Lush Nature)',
            icon: 'fa-solid fa-tree',
            descKh: 'ផ្ទៃខាងក្រោយជាជួរភ្នំ និងព្រៃឈើរុក្ខជាតិបៃតងស្រស់ ជាមួយផ្ទាំងកញ្ចក់ថ្លារំលេចអក្សរ និងតួលេខពណ៌បៃតងស្រទន់ ជួយឱ្យភ្នែកស្រស់ស្រាយ។',
            palette: ['#03140a', '#072413', '#10b981', '#34d399', '#6ee7b7']
        },
        {
            id: 'crystal-glass',
            nameKh: 'កញ្ចក់ថ្លាសុទ្ធ (Liquid Crystal Glass)',
            tag: 'ថ្លាដូចកញ្ចក់ ១០០% (Ultra Glassmorphism)',
            icon: 'fa-solid fa-gem',
            descKh: 'រចនាបថកញ្ចក់ថ្លាសុទ្ធ ១០០% គ្រប់ផ្នែកទាំង Sidebar, Menu, Cards, Modals និងតារាង ឆ្លុះឃើញផ្ទៃខាងក្រោយរលោងស្រស់ស្អាត ដូច Apple VisionOS។',
            palette: ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.08)', '#00f5ff', '#38bdf8', '#ffffff']
        },
        {
            id: 'lumina-glass',
            nameKh: 'Lumina Aurora Glass (កញ្ចក់ពន្លឺ Lumina)',
            tag: 'ម៉ូដកញ្ចក់ Lumina ទំនើបកម្រិតកំពូល (Hot ✨)',
            icon: 'fa-solid fa-wand-magic-sparkles',
            descKh: 'រចនាបថកញ្ចក់ Frosted Glassmorphism ទំនើបកម្រិតពិភពលោក (ដូចរូបគំរូ Lumina) ជាមួយផ្ទៃខាងក្រោយពន្លឺស្វាយ Aurora Violet លាយខៀវ Cyan & ផ្កាឈូក គែមមូលស្រទន់ និងផ្ទាំងកញ្ចក់អណ្តែតទឹក។',
            palette: ['#1e1145', '#7c3aed', '#06b6d4', '#f43f5e', '#ffffff'],
            featured: true
        },
        {
            id: 'dollar-wealth',
            nameKh: 'មហាសេដ្ឋីដុល្លារ $$$ (US Dollar Empire)',
            tag: 'លុយដុល្លារហោះ & ហេងហេង (Cash Flow)',
            icon: 'fa-solid fa-money-bill-1-wave',
            descKh: 'ផ្ទៃលុយដុល្លារសន្លឹក ១០០$ ដ៏ប្រណិត ជាមួយសន្លឹកលុយហោះហើរ និងពន្លឺបៃតងត្បូងមរកត លាយពណ៌មាស។ តំណាងឱ្យហាងលក់ដាច់ ហេងហេង និងលុយហូរចូលពេញៗដៃ!',
            palette: ['#041208', '#0b2413', '#10b981', '#f59e0b', '#34d399'],
            featured: true
        },
        {
            id: 'arctic-frost',
            nameKh: 'ភ្នំទឹកកក & ព្រិលត្រជាក់ (Arctic Glacier Frost)',
            tag: 'ដុំទឹកកក & ខ្យល់ព្រិល (Glacier & Snow)',
            icon: 'fa-solid fa-snowflake',
            descKh: 'ផ្ទៃខាងក្រោយជួរភ្នំទឹកកកដ៏ស្កឹមស្កៃ រំលេចដោយដុំទឹកកកគ្រីស្តាល់ហោះហើរ ព្រិលធ្លាក់ស្រទន់ និងខ្យល់ត្រជាក់បក់រសាត់ទៅមកយឺតៗ ត្រជាក់ចិត្តត្រជាក់ភ្នែក។',
            palette: ['#030b17', '#081a33', '#00f5ff', '#38bdf8', '#ffffff'],
            featured: true
        },
        {
            id: 'cyber-purple',
            nameKh: 'Cyber Purple Dream',
            tag: 'ម៉ូដពេញនិយម (ChatGPT Style)',
            icon: 'fa-solid fa-wand-magic-sparkles',
            descKh: 'ផ្ទៃស្វាយអវកាសជ្រៅ (Cosmic Violet Indigo) លាយជាមួយពន្លឺស្វាយ Glowing Magenta & Cyan។ ទំនើប និងទាក់ទាញភ្នែកបំផុត។',
            palette: ['#0a081a', '#161330', '#8b5cf6', '#ec4899', '#06b6d4']
        },
        {
            id: 'royal-gold',
            nameKh: 'Imperial Royal Gold',
            tag: 'ម៉ូដអភិជន មាសសុទ្ធ',
            icon: 'fa-solid fa-crown',
            descKh: 'ផ្ទៃខ្មៅរលោងដិត (Velvet Black) រំលេចដោយពណ៌មាសសុទ្ធ Champagne Gold និង Amber Glow។ មើលទៅបែបប្រណិត VIP Boutique។',
            palette: ['#070605', '#1a140d', '#f59e0b', '#d97706', '#fbbf24']
        },
        {
            id: 'rolex-emerald',
            nameKh: 'Rolex Emerald Wealth',
            tag: 'ម៉ូដត្បូងមរកត សិរីសួស្តី',
            icon: 'fa-solid fa-gem',
            descKh: 'ពណ៌បៃតងចាស់បែប Rolex លាយជាមួយពណ៌មាស និងពន្លឺ Mint Green។ តំណាងឱ្យសិរីសួស្តី ហេងហេង និងលុយហូរចូលហាង។',
            palette: ['#03120c', '#092418', '#10b981', '#fbbf24', '#34d399']
        },
        {
            id: 'ice-titanium',
            nameKh: 'Ice Titanium Cyber',
            tag: 'ម៉ូដទឹកកក ទីតានញ៉ូម',
            icon: 'fa-solid fa-snowflake',
            descKh: 'ផ្ទៃខ្មៅ Obsidian លាយជាមួយពន្លឺខៀវទឹកកកអគ្គិសនី (Electric Cyan) និងកញ្ចក់ថ្លា Frosted Glass។ ត្រជាក់ភ្នែក និងច្បាស់ស្រឡះ។',
            palette: ['#040914', '#0c1930', '#06b6d4', '#38bdf8', '#00f5ff']
        }
    ],

    init: function() {
        let savedTheme = localStorage.getItem('mhaly_ui_style');
        if (!savedTheme || savedTheme === 'classic-cyber') {
            savedTheme = 'khmer-yantra';
            localStorage.setItem('mhaly_ui_style', 'khmer-yantra');
        }
        UIStyle.applyTheme(savedTheme, false);
        UIStyle.render();
    },

    getCurrentTheme: function() {
        return localStorage.getItem('mhaly_ui_style') || 'khmer-yantra';
    },

    applyTheme: function(themeId, showToast = true) {
        const theme = UIStyle.themes.find(t => t.id === themeId) || UIStyle.themes[0];
        document.body.setAttribute('data-theme', theme.id);
        localStorage.setItem('mhaly_ui_style', theme.id);

        if (window.Storage && Storage.getSettings && Storage.saveSettings) {
            const settings = Storage.getSettings() || {};
            settings.uiStyle = theme.id;
            Storage.saveSettings(settings);
        }

        if (theme.id === 'dollar-wealth') {
            UIStyle.startDollarRain();
        } else {
            UIStyle.stopDollarRain();
        }

        if (theme.id === 'arctic-frost') {
            UIStyle.startArcticFrost();
        } else {
            UIStyle.stopArcticFrost();
        }

        if (theme.id === 'khmer-yantra') {
            UIStyle.startKhmerYantra();
        } else {
            UIStyle.stopKhmerYantra();
        }

        UIStyle.render();

        if (showToast && window.App && App.showToast) {
            App.showToast(`បានប្តូរទៅកាន់ម៉ូដ «${theme.nameKh}» រួចរាល់! ✨`, 'success');
        }
    },

    startDollarRain: function() {
        if (document.getElementById('dollar-floating-layer')) return;
        const layer = document.createElement('div');
        layer.id = 'dollar-floating-layer';
        layer.className = 'dollar-floating-container';
        layer.setAttribute('aria-hidden', 'true');

        const billCount = 14;
        let billsHtml = '';
        for (let i = 0; i < billCount; i++) {
            const left = Math.floor(Math.random() * 94) + 2;
            const delay = (Math.random() * 8).toFixed(1);
            const duration = (9 + Math.random() * 6).toFixed(1);
            const sizeScale = (0.75 + Math.random() * 0.45).toFixed(2);
            const rotSpeed = (5 + Math.random() * 6).toFixed(1);

            billsHtml += `
                <div class="floating-dollar-bill" style="left: ${left}%; animation-delay: ${delay}s; animation-duration: ${duration}s; transform: scale(${sizeScale});">
                    <div class="bill-body" style="animation-duration: ${rotSpeed}s;">
                        <span class="bill-currency">$</span>
                        <div class="bill-center">
                            <span class="bill-100">100</span>
                            <span class="bill-label">UNITED STATES</span>
                        </div>
                        <span class="bill-currency">$</span>
                    </div>
                </div>
            `;
        }
        layer.innerHTML = billsHtml;
        document.body.appendChild(layer);
    },

    stopDollarRain: function() {
        const layer = document.getElementById('dollar-floating-layer');
        if (layer) layer.remove();
    },

    startArcticFrost: function() {
        if (document.getElementById('arctic-frost-layer')) return;
        const layer = document.createElement('div');
        layer.id = 'arctic-frost-layer';
        layer.className = 'arctic-frost-container';
        layer.setAttribute('aria-hidden', 'true');

        // 1. Cold Breeze Ribbons (ខ្យល់ត្រជាក់បក់រសាត់)
        let html = `
            <div class="frost-cold-breeze breeze-1"></div>
            <div class="frost-cold-breeze breeze-2"></div>
            <div class="frost-cold-breeze breeze-3"></div>
        `;

        // 2. Floating 3D Ice Shards (ដុំទឹកកកគ្រីស្តាល់ហោះហើរ)
        const shardCount = 12;
        for (let i = 0; i < shardCount; i++) {
            const left = Math.floor(Math.random() * 94) + 2;
            const delay = (Math.random() * 8).toFixed(1);
            const duration = (10 + Math.random() * 8).toFixed(1);
            const sizeScale = (0.65 + Math.random() * 0.6).toFixed(2);
            const rotSpeed = (6 + Math.random() * 7).toFixed(1);

            html += `
                <div class="frost-ice-shard" style="left: ${left}%; animation-delay: ${delay}s; animation-duration: ${duration}s; transform: scale(${sizeScale});">
                    <div class="ice-crystal" style="animation-duration: ${rotSpeed}s;"></div>
                </div>
            `;
        }

        // 3. Falling Snowflakes (ព្រិលធ្លាក់ស្រទន់)
        const snowflakeSymbols = ['❄', '❅', '❆', '•'];
        const snowCount = 28;
        for (let j = 0; j < snowCount; j++) {
            const left = Math.floor(Math.random() * 96) + 2;
            const delay = (Math.random() * 10).toFixed(1);
            const duration = (7 + Math.random() * 8).toFixed(1);
            const swayDuration = (3 + Math.random() * 4).toFixed(1);
            const size = Math.floor(Math.random() * 14) + 10;
            const symbol = snowflakeSymbols[j % snowflakeSymbols.length];
            const opacity = (0.55 + Math.random() * 0.4).toFixed(2);

            html += `
                <div class="frost-snowflake" style="left: ${left}%; font-size: ${size}px; opacity: ${opacity}; animation: snowFall ${duration}s linear infinite, snowSway ${swayDuration}s ease-in-out infinite alternate; animation-delay: ${delay}s, ${delay}s;">
                    ${symbol}
                </div>
            `;
        }

        layer.innerHTML = html;
        document.body.appendChild(layer);
    },

    stopArcticFrost: function() {
        const layer = document.getElementById('arctic-frost-layer');
        if (layer) layer.remove();
    },

    startKhmerYantra: function() {
        if (document.getElementById('khmer-yantra-layer')) return;
        const layer = document.createElement('div');
        layer.id = 'khmer-yantra-layer';
        layer.className = 'khmer-yantra-container';
        layer.setAttribute('aria-hidden', 'true');

        // 1. Warm Golden Central Blessing Aura (ពន្លឺបារមីមាសទិព្វ)
        let html = `
            <div class="yantra-golden-aura aura-pulse-1"></div>
            <div class="yantra-golden-aura aura-pulse-2"></div>
        `;

        // 2. Rising Golden Sacred Sparks & Embers (កម្ទេចភ្លើងមាសសិរីសួស្តី)
        const sparkCount = 24;
        for (let i = 0; i < sparkCount; i++) {
            const left = Math.floor(Math.random() * 96) + 2;
            const delay = (Math.random() * 8).toFixed(1);
            const duration = (8 + Math.random() * 8).toFixed(1);
            const size = Math.floor(Math.random() * 6) + 3;
            const opacity = (0.45 + Math.random() * 0.5).toFixed(2);

            html += `
                <div class="yantra-sacred-spark" style="left: ${left}%; width: ${size}px; height: ${size}px; opacity: ${opacity}; animation: yantraSparkRise ${duration}s ease-in-out infinite; animation-delay: ${delay}s;"></div>
            `;
        }

        // 3. Floating Golden Star Glyphs (ពន្លឺផ្កាយមាស ✦)
        const glyphs = ['✦', '✧', '⋆', '✨'];
        const glyphCount = 14;
        for (let j = 0; j < glyphCount; j++) {
            const left = Math.floor(Math.random() * 94) + 3;
            const delay = (Math.random() * 9).toFixed(1);
            const duration = (10 + Math.random() * 8).toFixed(1);
            const glyph = glyphs[j % glyphs.length];
            const size = Math.floor(Math.random() * 8) + 10;
            const opacity = (0.4 + Math.random() * 0.5).toFixed(2);

            html += `
                <div class="yantra-sacred-glyph" style="left: ${left}%; font-size: ${size}px; opacity: ${opacity}; animation: yantraGlyphFloat ${duration}s ease-in-out infinite; animation-delay: ${delay}s;">
                    ${glyph}
                </div>
            `;
        }

        layer.innerHTML = html;
        document.body.appendChild(layer);
    },

    stopKhmerYantra: function() {
        const layer = document.getElementById('khmer-yantra-layer');
        if (layer) layer.remove();
    },

    render: function() {
        const container = document.getElementById('ui-styles-card-container');
        if (!container) return;

        const currentThemeId = UIStyle.getCurrentTheme();

        container.innerHTML = UIStyle.themes.map(theme => {
            const isActive = theme.id === currentThemeId;
            return `
                <div class="ui-theme-card ${isActive ? 'active-theme' : ''}" onclick="UIStyle.applyTheme('${theme.id}')">
                    ${isActive ? `
                        <div class="ui-theme-badge-active">
                            <i class="fa-solid fa-circle-check"></i> កំពុងប្រើប្រាស់
                        </div>
                    ` : ''}

                    <div>
                        <div class="ui-theme-title">
                            <i class="${theme.icon}" style="color: ${theme.palette[2]};"></i>
                            <span>${theme.nameKh}</span>
                        </div>
                        <span class="ai-badge-gold" style="font-size: 11px; margin-bottom: 8px; display: inline-block;">${theme.tag}</span>
                        <p class="ui-theme-desc">${theme.descKh}</p>
                    </div>

                    <div>
                        <div class="ui-theme-preview-palette">
                            ${theme.palette.map(c => `
                                <div class="ui-palette-dot" style="background: ${c};" title="${c}"></div>
                            `).join('')}
                        </div>

                        ${isActive ? `
                            <button type="button" class="btn-apply-theme btn-current">
                                <i class="fa-solid fa-check"></i> កំពុងប្រើប្រាស់ម៉ូដនេះ
                            </button>
                        ` : `
                            <button type="button" class="btn-apply-theme btn-select" onclick="event.stopPropagation(); UIStyle.applyTheme('${theme.id}')">
                                <i class="fa-solid fa-paintbrush"></i> ជ្រើសរើសប្រើប្រាស់
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }
};

window.UIStyle = UIStyle;

