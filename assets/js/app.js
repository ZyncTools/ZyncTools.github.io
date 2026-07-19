(function () {
    'use strict';

    /* ============================================
       ZyncTools — App Logic
       ============================================ */

    const state = {
        tools: [],
        categories: [],
        activeCategory: 'all',
        searchQuery: '',
        loadedScripts: new Set()
    };

    /* --- Utilities --- */
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function highlightText(text, query) {
        if (!query) return escapeHtml(text);
        const escaped = escapeHtml(text);
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return escaped.replace(regex, '<mark>$1</mark>');
    }

    /* --- Spotlight Effect --- */
    function initSpotlight() {
        document.addEventListener('mousemove', (e) => {
            const cards = document.querySelectorAll('.bento-card');
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            });
        });
    }

    /* --- Render Bento Grid --- */
    function renderBentoGrid() {
        const grid = $('#bento-grid');
        const noResults = $('#no-results');
        if (!grid) return;

        const filtered = state.tools.filter(tool => {
            const matchesCategory = state.activeCategory === 'all' || tool.category === state.activeCategory;
            const matchesSearch = !state.searchQuery ||
                tool.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                tool.description.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                tool.id.toLowerCase().includes(state.searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });

        if (filtered.length === 0) {
            grid.innerHTML = '';
            noResults?.classList.remove('hidden');
            return;
        }

        noResults?.classList.add('hidden');

        // Group by category
        const grouped = {};
        filtered.forEach(tool => {
            if (!grouped[tool.category]) grouped[tool.category] = [];
            grouped[tool.category].push(tool);
        });

        let html = '';
        let delay = 0;

        state.categories.forEach(category => {
            const tools = grouped[category.id];
            if (!tools || tools.length === 0) return;

            html += `
                <div class="category-section animate-fade-in-up" style="animation-delay: ${delay}ms">
                    <div class="category-header">
                        <div class="category-icon"><i class="fas ${category.icon}"></i></div>
                        <h2 class="category-title">${escapeHtml(category.name)}</h2>
                        <span class="category-count">${tools.length} tool${tools.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        ${tools.map((tool, i) => renderCard(tool, delay + (i + 1) * 30)).join('')}
                    </div>
                </div>
            `;
            delay += tools.length * 30 + 100;
        });

        grid.innerHTML = html;
        initSpotlight();
    }

    function renderCard(tool, delay) {
        const name = highlightText(tool.name, state.searchQuery);
        const desc = highlightText(tool.description, state.searchQuery);
        const isLarge = tool.popular ? 'bento-lg' : 'bento-md';

        return `
            <a href="/tool.html?id=${tool.id}" class="bento-card ${isLarge} animate-fade-in-up" style="animation-delay: ${delay}ms" data-tool-id="${tool.id}">
                <div class="bento-icon"><i class="fas ${tool.icon}"></i></div>
                <div>
                    <div class="bento-title">${name}</div>
                    <div class="bento-desc">${desc}</div>
                </div>
                ${tool.badge ? `<span class="bento-badge">${escapeHtml(tool.badge)}</span>` : ''}
            </a>
        `;
    }

    /* --- Data Loading --- */
    async function loadRegistry() {
        try {
            const res = await fetch('/registry.json', { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to load registry');
            const data = await res.json();
            state.tools = data.tools || [];
            state.categories = data.categories || [];
        } catch (err) {
            console.error('Failed to load registry:', err);
            // Fallback minimal data
            state.tools = [];
            state.categories = [];
        }
    }

    /* --- Search --- */
    function initSearch() {
        const input = $('#search-input');
        if (!input) return;

        let debounce;
        input.addEventListener('input', (e) => {
            clearTimeout(debounce);
            debounce = setTimeout(() => {
                state.searchQuery = e.target.value.trim();
                renderBentoGrid();
            }, 150);
        });
    }

    /* --- Category Filters --- */
    function initFilters() {
        const container = $('#category-filters');
        if (!container) return;

        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.cat-btn');
            if (!btn) return;

            $$('.cat-btn').forEach(b => {
                b.classList.remove('active', 'bg-accent/10', 'text-accent', 'border-accent/20');
                b.classList.add('bg-slate-900', 'text-gray-400', 'border-white/5');
            });

            btn.classList.remove('bg-slate-900', 'text-gray-400', 'border-white/5');
            btn.classList.add('active', 'bg-accent/10', 'text-accent', 'border-accent/20');

            state.activeCategory = btn.dataset.category || 'all';
            renderBentoGrid();
        });
    }

    /* --- Init --- */
    async function init() {
        await loadRegistry();
        initSearch();
        initFilters();
        renderBentoGrid();
        initThemeToggle();
    }

    function initThemeToggle() {
        const btn = $('#theme-toggle');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const next = window.ZyncTheme.toggle();
            updateThemeIcon(next);
        });
        updateThemeIcon(window.ZyncTheme.getCurrent());
    }

    function updateThemeIcon(theme) {
        const btn = $('#theme-toggle');
        if (!btn) return;
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun text-sm' : 'fas fa-moon text-sm';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.ZyncApp = { state, renderBentoGrid, loadRegistry };
})();
