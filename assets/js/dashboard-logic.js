(function () {
    'use strict';

    const state = {
        tools: [],
        categories: [],
        activeCategory: 'all',
        searchQuery: ''
    };

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getToolIcon(tool) {
        if (window.ZyncToolIcons && window.ZyncToolIcons[tool.id]) {
            return window.ZyncToolIcons[tool.id];
        }
        if (window.ZyncToolIcons && window.ZyncToolIcons[tool.category]) {
            return window.ZyncToolIcons[tool.category];
        }
        return 'tool';
    }

    function getCategoryName(categoryId) {
        const cat = state.categories.find(c => c.id === categoryId);
        if (cat) return cat.name;
        return categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
    }

    function getCategoryIcon(categoryId) {
        const cat = state.categories.find(c => c.id === categoryId);
        if (cat) return cat.icon;
        if (window.ZyncToolIcons && window.ZyncToolIcons[categoryId]) {
            return window.ZyncToolIcons[categoryId];
        }
        return 'tool';
    }

    function renderCard(tool, query = '') {
        const name = query ? highlightText(tool.name, query) : escapeHtml(tool.name);
        const desc = query ? highlightText(tool.description, query) : escapeHtml(tool.description || '');
        const iconName = getToolIcon(tool);

        return `
            <a href="/tool.html?id=${tool.id}"
               class="tool-card"
               data-tool-id="${tool.id}"
               data-tool-type="${tool.type || 'file'}">
                <div class="tool-card-icon"><i data-lucide="${iconName}"></i></div>
                <div class="tool-card-title">${name}</div>
                <div class="tool-card-desc">${desc}</div>
            </a>
        `;
    }

    function highlightText(text, query) {
        if (!query || !text) return escapeHtml(text);
        const escaped = escapeHtml(text);
        const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
        let result = escaped;
        terms.forEach(term => {
            const regex = new RegExp(`(${term})`, 'gi');
            result = result.replace(regex, '<mark>$1</mark>');
        });
        return result;
    }

    function renderDashboard(tools, query = '') {
        const container = $('#category-sections');
        const noResults = $('#no-results');
        if (!container) return;

        if (!tools || tools.length === 0) {
            container.innerHTML = '';
            if (noResults) noResults.classList.remove('hidden');
            return;
        }

        if (noResults) noResults.classList.add('hidden');

        const grouped = {};
        tools.forEach(tool => {
            if (!grouped[tool.category]) grouped[tool.category] = [];
            grouped[tool.category].push(tool);
        });

        const categoryOrder = getCategoryOrder();
        let html = '';

        categoryOrder.forEach(categoryId => {
            const categoryTools = grouped[categoryId];
            if (!categoryTools || categoryTools.length === 0) return;

            const categoryName = getCategoryName(categoryId);
            const categoryIcon = getCategoryIcon(categoryId);

            html += `
                <div class="category-section" data-category="${categoryId}">
                    <div class="category-header">
                        <div class="category-icon"><i data-lucide="${categoryIcon}"></i></div>
                        <h2 class="category-title">${escapeHtml(categoryName)}</h2>
                        <span class="category-count">${categoryTools.length} tool${categoryTools.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="tools-grid">
                        ${categoryTools.map((tool, i) => renderCard(tool, query)).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        if (window.lucide) lucide.createIcons();
    }

    function getCategoryOrder() {
        if (state.tools.length > 0) {
            const seen = new Set();
            const order = [];
            state.tools.forEach(t => {
                if (!seen.has(t.category)) {
                    seen.add(t.category);
                    order.push(t.category);
                }
            });
            return order;
        }
        return ['images', 'pdf', 'video', 'audio', 'text', 'code', 'math', 'dev', 'security', 'ai', 'media', 'seo', 'dev-utils'];
    }

    async function loadRegistry() {
        try {
            const res = await fetch('/tools-database.json', { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to load tools database');
            const data = await res.json();
            state.tools = data.tools || [];
            state.categories = data.categories || [];
        } catch (err) {
            console.error('Failed to load registry:', err);
            state.tools = [];
            state.categories = [];
        }
    }

    function initFilters() {
        const container = $('#category-filters');
        if (!container) return;

        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.cat-btn');
            if (!btn) return;

            $$('.cat-btn').forEach(b => {
                b.classList.remove('active');
            });

            btn.classList.add('active');

            state.activeCategory = btn.dataset.category || 'all';

            if (state.searchQuery && window.ZyncSearch) {
                window.ZyncSearch.performSearch(state.searchQuery);
            } else {
                filterByCategory();
            }
        });
    }

    function filterByCategory() {
        if (state.activeCategory === 'all') {
            renderDashboard(state.tools);
        } else {
            const filtered = state.tools.filter(t => t.category === state.activeCategory);
            renderDashboard(filtered);
        }
    }

    function populateCategoryFilters() {
        const container = $('#category-filters');
        if (!container) return;

        state.categories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'cat-btn px-4 py-2 rounded-xl text-sm font-medium';
            btn.dataset.category = category.id;
            btn.textContent = category.name;
            container.appendChild(btn);
        });
    }

    async function init() {
        await loadRegistry();
        populateCategoryFilters();
        initFilters();

        renderDashboard(state.tools);

        initThemeToggle();
    }

    function initThemeToggle() {
        const btn = $('#theme-toggle');
        if (!btn) return;
        btn.addEventListener('click', () => {
            if (window.ZyncTheme) {
                const next = window.ZyncTheme.toggle();
                updateThemeIcon(next);
            }
        });
        updateThemeIcon(window.ZyncTheme ? window.ZyncTheme.getCurrent() : 'dark');
    }

    function updateThemeIcon(theme) {
        const btn = $('#theme-toggle');
        if (!btn) return;
        const icon = btn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
            if (window.lucide) lucide.createIcons();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.ZyncApp = {
        state,
        renderDashboard,
        loadRegistry,
        filterByCategory
    };
})();
