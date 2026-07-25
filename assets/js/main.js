/**
 * ZyncTools — Main Application (Final Production Build)
 *
 * Responsibilities:
 *  - Render tool grid with robust CSS Grid alignment
 *  - Lucide icon fallback + createIcons() after every render
 *  - 3-state theme cycler (dark → grass → light) with localStorage
 *  - Fuse.js smart search
 *  - Chatbot initialization
 *  - Optional history/favorites toggle (IndexedDB, OFF by default)
 *
 * Namespace: window.ZyncApp
 */
(function () {
    'use strict';

    /* =========================================
       CONFIGURATION
       ========================================= */
    var CONFIG = {
        dbUrl: '/tools-database.json',
        storageKey: 'zync-tools-db',
        themeKey: 'zync-theme-v2',
        historyKey: 'zync-history-enabled',
        fuseThreshold: 0.35,
        fuseLimit: 8
    };

    /* =========================================
       STATE
       ========================================= */
    var state = {
        tools: [],
        categories: [],
        activeCategory: 'all',
        searchQuery: '',
        fuse: null,
        historyEnabled: false,
        db: null
    };

    /* =========================================
       ICON RESOLUTION — Lucide names + fa- fallback map
       ========================================= */
    var CATEGORY_ICON_MAP = {
        'images': 'image',
        'pdf': 'file-text',
        'video': 'video',
        'audio': 'music',
        'text': 'type',
        'code': 'code',
        'math': 'calculator',
        'security': 'shield-check',
        'ai': 'sparkles',
        'media': 'film',
        'seo': 'search',
        'dev-utils': 'terminal'
    };

    var FA_TO_LUCIDE = {
        "address-card": "id-card",
        "adjust": "contrast",
        "align-left": "align-left",
        "arrow-down-a-z": "arrow-down-a-z",
        "arrow-left-right": "arrow-left-right",
        "arrows-alt-h": "move-horizontal",
        "arrows-left-right": "arrows-left-right",
        "asterisk": "asterisk",
        "barcode": "barcode",
        "bezier-curve": "bezier-curve",
        "birthday-cake": "cake",
        "bolt": "zap",
        "book": "book-open",
        "border-all": "border-all",
        "border-none": "border-none",
        "brackets-curly": "braces",
        "brain": "brain",
        "broom": "broom",
        "bullseye": "target",
        "cake": "cake",
        "calculator": "calculator",
        "calendar": "calendar",
        "calendar-alt": "calendar",
        "camera": "camera",
        "camera-retro": "camera",
        "chart-bar": "bar-chart-3",
        "chart-column": "bar-chart-3",
        "chart-line": "line-chart",
        "check-circle": "check-circle-2",
        "circle": "circle",
        "circle-dot": "circle-dot",
        "circle-half-stroke": "half",
        "circle-info": "info",
        "circle-question": "help-circle",
        "clock": "clock",
        "clone": "copy",
        "cloud": "cloud",
        "cloud-rain": "cloud-rain",
        "code": "code",
        "cog": "settings",
        "columns": "columns",
        "compress": "compress",
        "compress-alt": "compress",
        "compress-arrows-alt": "compress",
        "copy": "copy",
        "crop": "crop",
        "crop-alt": "crop",
        "css3-alt": "file-code-2",
        "cube": "box",
        "cut": "scissors",
        "database": "database",
        "desktop": "monitor",
        "diamond": "gem",
        "droplet": "droplets",
        "edit": "pencil",
        "eraser": "eraser",
        "exchange-alt": "arrow-left-right",
        "expand": "maximize",
        "expand-arrows-alt": "maximize",
        "eye": "eye",
        "eye-dropper": "pipette",
        "eye-slash": "eye-off",
        "face-laugh-squint": "smile",
        "face-smile": "smile",
        "file-code": "file-code",
        "file-csv": "file-spreadsheet",
        "file-export": "download",
        "file-image": "image",
        "file-lines": "file-text",
        "file-pdf": "file-text",
        "file-video": "video",
        "file-word": "file-type-2",
        "fill-drip": "paintbrush",
        "film": "film",
        "fingerprint": "fingerprint",
        "flask": "flask-conical",
        "font": "type",
        "gauge": "gauge",
        "gauge-high": "gauge",
        "gear": "settings",
        "glass-water": "glass-water",
        "globe": "globe",
        "hashtag": "hash",
        "heading": "heading",
        "highlighter": "highlighter",
        "history": "history",
        "hourglass-half": "hourglass",
        "html5": "file-code-2",
        "i-cursor": "mouse-pointer-click",
        "image": "image",
        "images": "images",
        "info-circle": "info",
        "js": "file-code-2",
        "js-square": "file-code-2",
        "key": "key",
        "keyboard": "keyboard",
        "language": "languages",
        "layer-group": "layers",
        "link": "link",
        "list-ol": "list-ordered",
        "lock": "lock",
        "lock-open": "lock-open",
        "magic": "wand-2",
        "magnifying-glass-chart": "search",
        "map": "map",
        "map-marker-alt": "map-pin",
        "markdown": "file-type-2",
        "masks-theater": "drama",
        "microchip": "cpu",
        "microphone": "mic",
        "mobile": "smartphone",
        "mobile-screen": "smartphone",
        "monitor": "monitor",
        "mountain": "mountain",
        "music": "music",
        "network-wired": "network",
        "not-equal": "not-equal",
        "note-sticky": "sticky-note",
        "object-group": "layers",
        "paintbrush": "paintbrush",
        "palette": "palette",
        "paragraph": "paragraph",
        "pencil": "pencil",
        "percent": "percent",
        "post": "send",
        "qrcode": "qr-code",
        "robot": "bot",
        "rotate": "rotate-cw",
        "ruler": "ruler",
        "scissors": "scissors",
        "search": "search",
        "share-alt": "share",
        "share-nodes": "share-2",
        "shield": "shield",
        "shield-halved": "shield-half",
        "shuffle": "shuffle",
        "signature": "pen-tool",
        "sitemap": "sitemap",
        "smog": "cloud-fog",
        "snowflake": "snowflake",
        "sort": "arrow-up-down",
        "sort-numeric-down": "arrow-up-narrow-wide",
        "sparkles": "sparkles",
        "square": "square",
        "stamp": "stamp",
        "star": "star",
        "sticky-note": "sticky-note",
        "stopwatch": "timer",
        "sun": "sun",
        "swatchbook": "swatch-book",
        "sync-alt": "refresh-cw",
        "table": "table",
        "table-cells": "table-2",
        "tachometer-alt": "gauge",
        "tag": "tag",
        "tags": "tags",
        "telegraph": "send",
        "temperature-high": "thermometer",
        "terminal": "terminal",
        "text-width": "type",
        "th": "layout-grid",
        "th-large": "layout-grid",
        "tool": "tool",
        "trash-alt": "trash-2",
        "twitter": "twitter",
        "unlock": "unlock",
        "unlock-alt": "unlock",
        "up-right-and-down-left-from-center": "maximize-2",
        "user-xmark": "user-x",
        "vector-square": "vector-square",
        "video": "video",
        "volume-down": "volume-1",
        "volume-high": "volume-2",
        "volume-mute": "volume-x",
        "volume-up": "volume-2",
        "volume-xmark": "volume-x",
        "wand-magic-sparkles": "wand-2",
        "water": "droplets",
        "wave-square": "wave-square",
        "wifi": "wifi",
        "wind": "wind",
        "x-ray": "scan"
    };

    function normalizeFaIcon(raw) {
        if (!raw) return null;
        if (/^fa-/.test(raw)) {
            var key = raw.slice(3);
            return FA_TO_LUCIDE[key] || null;
        }
        return raw;
    }

    function resolveIcon(tool) {
        // 1. Per-tool override from ZyncToolIcons global
        if (window.ZyncToolIcons && window.ZyncToolIcons[tool.id]) {
            return window.ZyncToolIcons[tool.id];
        }
        // 2. Per-category override
        if (window.ZyncToolIcons && window.ZyncToolIcons[tool.category]) {
            return window.ZyncToolIcons[tool.category];
        }
        // 3. Tool's own icon field — convert fa- names to Lucide
        if (tool.icon) {
            var normalized = normalizeFaIcon(tool.icon);
            if (normalized) return normalized;
            return tool.icon;
        }
        // 4. Category fallback
        if (CATEGORY_ICON_MAP[tool.category]) {
            return CATEGORY_ICON_MAP[tool.category];
        }
        // 5. Ultimate fallback
        return 'tool';
    }

    /* =========================================
       HELPERS
       ========================================= */
    function $(sel) { return document.querySelector(sel); }
    function $$(sel) { return Array.from(document.querySelectorAll(sel)); }

    function esc(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function catName(id) {
        var c = state.categories.find(function (x) { return x.id === id; });
        return c ? c.name : id.charAt(0).toUpperCase() + id.slice(1);
    }

    function catIcon(id) {
        var c = state.categories.find(function (x) { return x.id === id; });
        if (c && c.icon) {
            var normalized = normalizeFaIcon(c.icon);
            if (normalized) return normalized;
            return c.icon;
        }
        return CATEGORY_ICON_MAP[id] || 'tool';
    }

    function hl(text, query) {
        if (!query || !text) return esc(text);
        var s = esc(text);
        var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
        terms.forEach(function (t) {
            var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            s = s.replace(re, '<mark>$1</mark>');
        });
        return s;
    }

    /* =========================================
       LUCIDE ICON REFRESH — waits for CDN if needed
       ========================================= */
    var lucideReady = false;
    var lucideQueue = [];

    function refreshLucide() {
        if (lucideReady) {
            try { window.lucide.createIcons(); } catch (e) { /* ignore */ }
            return;
        }
        // Queue one call to run when lucide loads
        if (lucideQueue.length === 0) {
            lucideQueue.push(true);
            pollLucide();
        }
    }

    function pollLucide() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            lucideReady = true;
            window.lucide.createIcons();
            lucideQueue = [];
            return;
        }
        setTimeout(pollLucide, 80);
    }

    // Also listen for lucide load event
    if (typeof window !== 'undefined') {
        window.addEventListener('load', function () {
            lucideReady = true;
            try { window.lucide.createIcons(); } catch (e) { /* ignore */ }
        });
    }

    /* =========================================
       SEARCH (Fuse.js + fallback)
       ========================================= */
    function initSearch() {
        var input = $('#global-search');
        if (!input) return;

        var debounce;
        input.addEventListener('input', function () {
            clearTimeout(debounce);
            var val = input.value;
            debounce = setTimeout(function () {
                state.searchQuery = val;
                state.activeCategory = 'all';
                updateSidebarActive();
                renderAll();
            }, 180);
        });
    }

    function searchTools(query) {
        if (!query) return state.tools;
        var terms = query.toLowerCase().split(/\s+/).filter(Boolean);

        // Fuse.js path
        if (state.fuse) {
            try {
                var results = state.fuse.search(query, { limit: CONFIG.fuseLimit });
                return results.map(function (r) { return r.item; });
            } catch (e) {
                console.warn('[ZyncApp] Fuse search error, falling back:', e);
            }
        }

        // Fallback: simple AND filter
        return state.tools.filter(function (t) {
            var hay = [t.name, t.description, (t.tags || []).join(' ')].join(' ').toLowerCase();
            return terms.every(function (term) { return hay.indexOf(term) !== -1; });
        });
    }

    function initFuse() {
        if (typeof Fuse === 'undefined') {
            console.warn('[ZyncApp] Fuse.js not loaded; using fallback search.');
            return;
        }
        state.fuse = new Fuse(state.tools, {
            keys: [
                { name: 'name', weight: 0.4 },
                { name: 'description', weight: 0.35 },
                { name: 'tags', weight: 0.15 },
                { name: 'category', weight: 0.1 }
            ],
            threshold: CONFIG.fuseThreshold,
            includeScore: true,
            minMatchCharLength: 2,
            ignoreLocation: true
        });
    }

    /* =========================================
       RENDER — Tool Card
       ========================================= */
    function renderCard(tool, query) {
        var iconName = resolveIcon(tool);
        var statusClass = (tool.status === 'coming') ? 'coming' : 'active';
        var statusLabel = (tool.status === 'coming') ? 'Soon' : 'Active';
        var popularAttr = tool.popular ? ' data-popular="true"' : '';
        var favsEnabled = (typeof window.ZyncPrivacy !== 'undefined' && typeof window.ZyncPrivacy.isFavoritesEnabled === 'function') ? window.ZyncPrivacy.isFavoritesEnabled() : false;

        var favBtn = '';
        if (favsEnabled) {
            favBtn = '<button class="tool-card-fav" data-fav-id="' + esc(tool.id) + '" aria-label="Toggle favorite" title="Add to favorites">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
            '</button>';
        } else {
            favBtn = '<button class="tool-card-fav tool-card-fav-disabled" disabled aria-label="Favorites disabled" title="Enable Favorites in Settings to save tools">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
            '</button>';
        }

        return '<a href="/' + (tool.category === 'images' ? 'image-tool' : 'tool') + '.html?id=' + esc(tool.id) + '" class="tool-card" data-tool-id="' + esc(tool.id) + '"' + popularAttr + '>' +
            '<div class="tool-card-top">' +
                '<div class="tool-card-icon"><i data-lucide="' + esc(iconName) + '"></i></div>' +
                '<span class="tool-card-status ' + statusClass + '">' + statusLabel + '</span>' +
                favBtn +
            '</div>' +
            '<div class="tool-card-title">' + hl(tool.name, query) + '</div>' +
            '<div class="tool-card-desc">' + hl(tool.description || '', query) + '</div>' +
            '<div class="tool-card-tags">' +
                (tool.tags || []).slice(0, 4).map(function (tag) {
                    return '<span class="tool-card-tag">#' + esc(tag) + '</span>';
                }).join('') +
            '</div>' +
            (tool.popular ? '<div class="tool-card-popular-badge"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Popular</div>' : '') +
        '</a>';
    }

    /* =========================================
       RENDER — Category Panels
       ========================================= */
    function renderPanels(tools, query) {
        var container = $('#dashboard');
        var noResults = $('#no-results');
        if (!container) return;

        if (!tools || tools.length === 0) {
            container.innerHTML = '';
            if (noResults) noResults.classList.add('visible');
            return;
        }
        if (noResults) noResults.classList.remove('visible');

        var grouped = {};
        var order = [];
        tools.forEach(function (t) {
            if (!grouped[t.category]) { grouped[t.category] = []; order.push(t.category); }
            grouped[t.category].push(t);
        });

        var html = '';
        order.forEach(function (catId) {
            var catTools = grouped[catId] || [];
            var cName = catName(catId);
            var cIcon = catIcon(catId);

            html += '<div class="panel" data-category="' + esc(catId) + '">' +
                '<div class="panel-header">' +
                    '<div class="panel-icon"><i data-lucide="' + esc(cIcon) + '"></i></div>' +
                    '<div class="panel-title-group">' +
                        '<h2 class="panel-title">' + esc(cName) + '</h2>' +
                        '<p class="panel-subtitle">' + catTools.length + ' tool' + (catTools.length !== 1 ? 's' : '') + '</p>' +
                    '</div>' +
                    '<span class="panel-badge">' + catTools.length + '</span>' +
                '</div>' +
                '<div class="panel-body">' +
                    '<div class="tools-grid">' +
                        catTools.map(function (t) { return renderCard(t, query); }).join('') +
                    '</div>' +
                '</div>' +
            '</div>';
        });

        container.innerHTML = html;
        refreshLucide();
    }

    function renderAll() {
        var tools = state.tools;
        if (state.searchQuery) {
            tools = searchTools(state.searchQuery);
        } else if (state.activeCategory !== 'all') {
            tools = tools.filter(function (t) { return t.category === state.activeCategory; });
        }
        renderPanels(tools, state.searchQuery);
    }

    /* =========================================
       SIDEBAR
       ========================================= */
    function renderSidebar() {
        var nav = $('#sidebar-nav');
        var catNav = $('#sidebar-categories');
        var mobileBar = $('#mobile-cat-bar');
        if (!nav && !catNav) return;

        var totalTools = state.tools.length;

        if (nav) {
            nav.innerHTML =
                '<button class="sidebar-link active" data-sidebar-cat="all">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' +
                    'All Tools' +
                    '<span class="sidebar-link-count">' + totalTools + '</span>' +
                '</button>';
        }

        if (catNav) {
            catNav.innerHTML = state.categories.map(function (c) {
                var count = state.tools.filter(function (t) { return t.category === c.id; }).length;
                return '<button class="sidebar-link" data-sidebar-cat="' + esc(c.id) + '">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>' +
                    esc(c.name) +
                    '<span class="sidebar-link-count">' + count + '</span>' +
                '</button>';
            }).join('');
        }

        if (mobileBar) {
            mobileBar.innerHTML =
                '<button class="mobile-cat-btn active" data-mobile-cat="all">All</button>' +
                state.categories.map(function (c) {
                    return '<button class="mobile-cat-btn" data-mobile-cat="' + esc(c.id) + '">' + esc(c.name) + '</button>';
                }).join('');
        }

        // Bind click handlers
        bindNavClicks('#sidebar-nav');
        bindNavClicks('#sidebar-categories');

        if (mobileBar) {
            mobileBar.addEventListener('click', function (e) {
                var btn = e.target.closest('[data-mobile-cat]');
                if (!btn) return;
                $$('#mobile-cat-bar .mobile-cat-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                setCategory(btn.getAttribute('data-mobile-cat'));
            });
        }
    }

    function bindNavClicks(selector) {
        var container = $(selector);
        if (!container) return;
        container.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-sidebar-cat]');
            if (!btn) return;
            setCategory(btn.getAttribute('data-sidebar-cat'));
        });
    }

    function setCategory(catId) {
        state.activeCategory = catId;
        state.searchQuery = '';
        var searchInput = $('#global-search');
        if (searchInput) searchInput.value = '';
        updateSidebarActive();
        renderAll();
        var dash = $('#dashboard');
        if (dash) dash.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function updateSidebarActive() {
        $$('[data-sidebar-cat]').forEach(function (el) {
            el.classList.toggle('active', el.getAttribute('data-sidebar-cat') === state.activeCategory);
        });
        $$('#mobile-cat-bar .mobile-cat-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-mobile-cat') === state.activeCategory);
        });
    }

    /* =========================================
       STATS
       ========================================= */
    function renderStats() {
        var total = state.tools.length;
        var active = state.tools.filter(function (t) { return t.status === 'active'; }).length;
        var popular = state.tools.filter(function (t) { return t.popular; });
        var popularName = popular.length > 0 ? popular[0].name : '—';

        $('#stat-total').textContent = total.toLocaleString();
        $('#stat-categories').textContent = state.categories.length;
        $('#stat-popular').textContent = popularName;
        $('#stat-active').textContent = active.toLocaleString();
    }

    /* =========================================
       THEME CYCLER (dark → grass → light)
       ========================================= */
    var CYCLE = ['dark', 'grass', 'light'];
    var THEME_META = {
        dark:  { name: 'Dark',  icon: 'moon',        hint: 'Neon-green on charcoal' },
        grass: { name: 'Grass', icon: 'sun-medium',  hint: 'Light, grass-green cards' },
        light: { name: 'Light', icon: 'sun',         hint: 'Pure white + blue accent' }
    };

    function getStoredTheme() {
        try {
            var v = localStorage.getItem(CONFIG.themeKey);
            if (CYCLE.indexOf(v) !== -1) return v;
        } catch (e) { /* ignore */ }
        return null;
    }

    function resolveTheme() {
        return getStoredTheme() || 'dark';
    }

    function applyTheme(theme) {
        if (CYCLE.indexOf(theme) === -1) theme = 'dark';
        var root = document.documentElement;
        root.setAttribute('data-theme', theme);
        root.classList.remove('theme-dark', 'theme-grass', 'theme-light');
        root.classList.add('theme-' + theme);
        root.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
        updateThemeButton(theme);
    }

    function cycleTheme() {
        var current = resolveTheme();
        var idx = CYCLE.indexOf(current);
        var next = CYCLE[(idx + 1) % CYCLE.length];
        try { localStorage.setItem(CONFIG.themeKey, next); } catch (e) { /* ignore */ }
        applyTheme(next);
        return next;
    }

    function updateThemeButton(theme) {
        var meta = THEME_META[theme] || THEME_META.dark;
        var btn = $('[data-theme-cycle-btn]');
        if (!btn) return;

        var label = btn.querySelector('[data-theme-cycle-label]');
        var swatch = btn.querySelector('[data-theme-cycle-swatch]');
        var iconEl = btn.querySelector('[data-theme-cycle-icon]');

        if (label) label.textContent = meta.name;
        if (iconEl) {
            iconEl.setAttribute('data-lucide', meta.icon);
            refreshLucide();
        }
        btn.setAttribute('aria-label', 'Theme: ' + meta.name + '. Click to switch.');
        btn.setAttribute('title', meta.hint);
    }

    function initThemeCycler() {
        applyTheme(resolveTheme());

        // Delegate click on any theme cycle button
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-theme-cycle-btn]');
            if (!btn) return;
            e.preventDefault();
            cycleTheme();
        });
    }

    /* =========================================
       HISTORY / FAVORITES (OFF by default)
       ========================================= */
    var historyDb = null;

    function openHistoryDB() {
        return new Promise(function (resolve, reject) {
            if (historyDb) return resolve(historyDb);
            try {
                var request = indexedDB.open('zync-tools-history', 1);
                request.onupgradeneeded = function (e) {
                    var db = e.target.result;
                    if (!db.objectStoreNames.contains('favorites')) {
                        db.createObjectStore('favorites', { keyPath: 'id' });
                    }
                };
                request.onsuccess = function (e) {
                    historyDb = e.target.result;
                    resolve(historyDb);
                };
                request.onerror = function () { reject(new Error('IndexedDB unavailable')); };
            } catch (err) {
                reject(err);
            }
        });
    }

    async function toggleHistory(enabled) {
        state.historyEnabled = enabled;
        try {
            localStorage.setItem(CONFIG.historyKey, enabled ? '1' : '0');
            if (enabled) {
                await openHistoryDB();
                console.log('[ZyncApp] History enabled — using IndexedDB');
            }
        } catch (e) {
            console.warn('[ZyncApp] History toggle failed:', e);
        }
    }

    function initHistoryToggle() {
        var toggle = $('#history-toggle');
        if (!toggle) return;

        function updateUI(settings) {
            if (settings.historyEnabled) toggle.classList.add('on');
            else toggle.classList.remove('on');
            toggle.setAttribute('aria-checked', settings.historyEnabled ? 'true' : 'false');

            // Show/hide personal sidebar section
            var personalSection = document.getElementById('sidebar-personal');
            var navHistory = document.getElementById('nav-history');
            var navFavorites = document.getElementById('nav-favorites');
            if (personalSection) {
                personalSection.style.display = (settings.historyEnabled || settings.favoritesEnabled) ? 'block' : 'none';
            }
            if (navHistory) {
                navHistory.style.display = settings.historyEnabled ? 'flex' : 'none';
            }
            if (navFavorites) {
                navFavorites.style.display = settings.favoritesEnabled ? 'flex' : 'none';
            }

            // Refresh sidebar UI
            if (window.ZyncSidebarUI && typeof window.ZyncSidebarUI.refresh === 'function') {
                window.ZyncSidebarUI.refresh();
            }
        }

        // Listen for privacy changes
        if (typeof window.ZyncPrivacy !== 'undefined' && typeof window.ZyncPrivacy.onChange === 'function') {
            window.ZyncPrivacy.onChange(updateUI);
        }

        // Initial state
        if (typeof window.ZyncPrivacy !== 'undefined' && typeof window.ZyncPrivacy.getSettings === 'function') {
            updateUI(window.ZyncPrivacy.getSettings());
        }

        // Toggle with confirmation
        toggle.addEventListener('click', function () {
            if (typeof window.ZyncPrivacy === 'undefined') return;

            var current = window.ZyncPrivacy.getSettings();
            if (current.historyEnabled) {
                // Disable — no confirmation needed, just disable
                window.ZyncPrivacy.disableHistory();
            } else {
                // Enable — show confirmation modal
                window.ZyncPrivacy.enableHistory(true).then(function (enabled) {
                    if (enabled) {
                        updateUI(window.ZyncPrivacy.getSettings());
                    }
                });
            }
        });
    }

    /* =========================================
       SETTINGS PANEL
       ========================================= */
    function initSettingsPanel() {
        var settingsPanel = $('#settings-panel');
        var settingsNavBtn = $('#nav-settings');
        var settingsCloseBtn = $('#settings-close-btn');
        if (!settingsPanel || !settingsNavBtn) return;

        function showSettings() {
            settingsPanel.style.display = 'block';
            settingsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            updateSettingsUI();
        }

        function hideSettings() {
            settingsPanel.style.display = 'none';
        }

        settingsNavBtn.addEventListener('click', function (e) {
            e.preventDefault();
            showSettings();
        });

        if (settingsCloseBtn) {
            settingsCloseBtn.addEventListener('click', hideSettings);
        }

        // Settings toggle
        var settingsToggle = $('#settings-history-toggle');
        var settingsOptions = $('#settings-history-options');
        var autoExpireSelect = $('#settings-auto-expire');
        var pauseBtn = $('#settings-pause-btn');
        var clearBtn = $('#settings-clear-btn');
        var statusEl = $('#settings-status');

        function updateSettingsUI() {
            if (!window.ZyncPrivacy) return;
            var s = window.ZyncPrivacy.getSettings();
            if (settingsToggle) {
                settingsToggle.classList.toggle('on', s.historyEnabled);
                settingsToggle.setAttribute('aria-checked', s.historyEnabled ? 'true' : 'false');
            }
            if (settingsOptions) {
                settingsOptions.style.display = s.historyEnabled ? 'flex' : 'none';
            }
            if (autoExpireSelect) {
                autoExpireSelect.value = s.autoExpireDays || '';
            }
            if (pauseBtn) {
                pauseBtn.textContent = s.trackingPaused ? 'Resume Tracking' : 'Pause Tracking';
            }
            if (statusEl) {
                if (s.historyEnabled) {
                    statusEl.textContent = 'History is enabled. ' + (s.trackingPaused ? 'Tracking is paused.' : 'Tracking is active.');
                } else {
                    statusEl.textContent = 'History is disabled. No data is being stored.';
                }
            }
        }

        if (settingsToggle) {
            settingsToggle.addEventListener('click', function () {
                if (!window.ZyncPrivacy) return;
                var current = window.ZyncPrivacy.getSettings();
                if (current.historyEnabled) {
                    window.ZyncPrivacy.disableHistory();
                } else {
                    window.ZyncPrivacy.enableHistory(true).then(function () {
                        updateSettingsUI();
                        if (window.ZyncSidebarUI) window.ZyncSidebarUI.refresh();
                    });
                }
                updateSettingsUI();
            });
        }

        if (autoExpireSelect) {
            autoExpireSelect.addEventListener('change', function () {
                if (!window.ZyncPrivacy) return;
                var days = autoExpireSelect.value ? parseInt(autoExpireSelect.value, 10) : null;
                window.ZyncPrivacy.setAutoExpire(days);
                updateSettingsUI();
            });
        }

        if (pauseBtn) {
            pauseBtn.addEventListener('click', function () {
                if (!window.ZyncPrivacy) return;
                var current = window.ZyncPrivacy.getSettings();
                window.ZyncPrivacy.togglePause(!current.trackingPaused);
                updateSettingsUI();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                if (!window.ZyncPrivacy) return;
                if (confirm('Clear all history and favorites? This cannot be undone.')) {
                    window.ZyncPrivacy.clearAllHistory().then(function () {
                        updateSettingsUI();
                        if (window.ZyncSidebarUI) window.ZyncSidebarUI.refresh();
                    });
                }
            });
        }

        // Listen for privacy changes
        if (typeof window.ZyncPrivacy !== 'undefined' && typeof window.ZyncPrivacy.onChange === 'function') {
            window.ZyncPrivacy.onChange(updateSettingsUI);
        }
    }

    /* =========================================
       FAVORITE BUTTON HANDLER
       ========================================= */
    function initFavoriteButtons() {
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('.tool-card-fav');
            if (!btn || btn.classList.contains('tool-card-fav-disabled')) return;

            var toolId = btn.getAttribute('data-fav-id');
            if (!toolId) return;

            var tool = state.tools.find(function (t) { return t.id === toolId; });
            if (!tool) return;

            if (btn.classList.contains('is-fav')) {
                if (window.ZyncDBManager && typeof window.ZyncDBManager.removeFavorite === 'function') {
                    window.ZyncDBManager.removeFavorite(toolId).then(function () {
                        btn.classList.remove('is-fav');
                        btn.setAttribute('title', 'Add to favorites');
                        btn.setAttribute('aria-label', 'Add to favorites');
                    });
                }
            } else {
                if (window.ZyncDBManager && typeof window.ZyncDBManager.addFavorite === 'function') {
                    window.ZyncDBManager.addFavorite(tool).then(function () {
                        btn.classList.add('is-fav');
                        btn.setAttribute('title', 'Remove from favorites');
                        btn.setAttribute('aria-label', 'Remove from favorites');
                    });
                }
            }
        });
    }
    function initChatbot() {
        if (window.ZyncGlobalChat && typeof window.ZyncGlobalChat.init === 'function') {
            window.ZyncGlobalChat.init();
        }
    }

    /* =========================================
       MOBILE SIDEBAR TOGGLE
       ========================================= */
    function initMobileSidebar() {
        var toggle = $('#sidebar-toggle');
        var sidebar = $('#app-sidebar');
        if (!toggle || !sidebar) return;

        toggle.addEventListener('click', function () {
            sidebar.classList.toggle('mobile-open');
        });

        // Close sidebar when clicking main content on mobile
        var main = $('#app-main');
        if (main) {
            main.addEventListener('click', function () {
                if (sidebar.classList.contains('mobile-open')) {
                    sidebar.classList.remove('mobile-open');
                }
            });
        }
    }

    /* =========================================
       DATA LOADING
       ========================================= */
    async function loadData() {
        try {
            var res = await fetch(CONFIG.dbUrl, { cache: 'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            state.db = await res.json();
            state.tools = (state.db.tools || []).filter(function (t) {
                return t.status === 'active' || t.status === 'coming' || !t.status;
            });
            state.categories = state.db.categories || [];
        } catch (err) {
            console.error('[ZyncApp] Failed to load tools database:', err);
            state.tools = [];
            state.categories = [];
        }
    }

    /* =========================================
       BOOT
       ========================================= */
    async function boot() {
        await loadData();

        if (state.tools.length === 0) {
            var container = $('#dashboard');
            if (container) container.innerHTML = '<div class="no-results visible"><div class="no-results-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="no-results-title">Failed to load tools</div><div class="no-results-sub">Check that tools-database.json is present.</div></div>';
            return;
        }

        initFuse();
        renderStats();
        renderSidebar();
        renderPanels(state.tools, '');
        initSearch();
        initThemeCycler();
        initHistoryToggle();
        initSettingsPanel();
        initFavoriteButtons();
        initChatbot();
        initMobileSidebar();

        // Final icon refresh after all renders
        refreshLucide();
    }

    /* =========================================
       PUBLIC API
       ========================================= */
    window.ZyncApp = {
        state: state,
        tools: state.tools,
        categories: state.categories,
        searchTools: searchTools,
        renderAll: renderAll,
        renderPanels: renderPanels,
        renderCard: renderCard,
        resolveIcon: resolveIcon,
        cycleTheme: cycleTheme,
        applyTheme: applyTheme,
        toggleHistory: toggleHistory,
        init: boot
    };

    /* =========================================
       START
       ========================================= */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();
