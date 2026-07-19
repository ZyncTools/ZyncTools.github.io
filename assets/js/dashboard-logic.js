(function () {
    'use strict';

    /* ============================================
       ZyncTools — Dashboard Logic
       ============================================ */

    const state = {
        tools: [],
        categories: [],
        activeCategory: 'all',
        searchQuery: '',
        loadedScripts: new Set()
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

    function getCardSizeClass(tool, index) {
        if (tool.popular) return 'bento-wide';
        if ((index + 1) % 4 === 0) return 'bento-large';
        return 'bento-standard';
    }

    /* --- Spotlight Effect --- */
    function initSpotlight() {
        const cards = $$('.bento-card');
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
                card.classList.add('spotlight-active');
            });

            card.addEventListener('mouseleave', () => {
                card.classList.remove('spotlight-active');
            });
        });
    }

    /* --- Magnetic Hover Effect --- */
    function initMagneticHover() {
        const cards = $$('.bento-card');
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const deltaX = (x - centerX) / centerX;
                const deltaY = (y - centerY) / centerY;
                const moveX = deltaX * 3;
                const moveY = deltaY * 3;
                card.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) scale(1.01)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    /* --- Intersection Observer for Scroll Animations --- */
    function initScrollAnimations() {
        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -10% 0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    
                    const cards = entry.target.querySelectorAll('.bento-animate');
                    cards.forEach((card, index) => {
                        card.style.animationDelay = `${index * 50}ms`;
                        card.classList.add('bento-animate');
                    });
                    
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        const sections = $$('.category-section');
        sections.forEach(section => {
            observer.observe(section);
        });

        const headers = $$('.category-header');
        const headerObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('category-header-animate');
                    headerObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        headers.forEach(header => {
            headerObserver.observe(header);
        });
    }

    /* --- Render Dashboard (used by search-engine.js) --- */
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

        // Group by category
        const grouped = {};
        tools.forEach(tool => {
            if (!grouped[tool.category]) grouped[tool.category] = [];
            grouped[tool.category].push(tool);
        });

        // Get category order
        const categoryOrder = getCategoryOrder();
        
        let html = '';
        
        categoryOrder.forEach(categoryId => {
            const categoryTools = grouped[categoryId];
            if (!categoryTools || categoryTools.length === 0) return;
            
            const category = window.ZyncRegistry?.getCategory?.(categoryId) || {
                id: categoryId,
                name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
                icon: 'tool'
            };
            
            html += `
                <div class="category-section" data-category="${categoryId}">
                    <div class="category-header">
                        <div class="category-icon"><i data-lucide="${category.icon}"></i></div>
                        <h2 class="category-title">${escapeHtml(category.name)}</h2>
                        <span class="category-count">${categoryTools.length} tool${categoryTools.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="bento-grid">
                        ${categoryTools.map((tool, i) => renderCard(tool, i, query)).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        
        if (window.lucide) lucide.createIcons();
        
        initScrollAnimations();
        initSpotlight();
        initMagneticHover();
    }

    function renderCard(tool, index, query = '') {
        const name = query ? highlightText(tool.name, query) : escapeHtml(tool.name);
        const desc = query ? highlightText(tool.description, query) : escapeHtml(tool.description || '');
        const sizeClass = getCardSizeClass(tool, index);
        const iconName = getToolIcon(tool);
        
        let badgeClass = 'bento-badge';
        if (tool.badge === 'AI') badgeClass += ' ai';
        if (tool.badge === 'Beta') badgeClass += ' beta';

        return `
            <a href="/tool.html?id=${tool.id}" 
               class="bento-card ${sizeClass} bento-animate" 
               data-tool-id="${tool.id}"
               data-tool-type="${tool.type || 'file'}">
                <div class="bento-icon"><i data-lucide="${iconName}"></i></div>
                <div>
                    <div class="bento-title">${name}</div>
                    <div class="bento-desc">${desc}</div>
                </div>
                ${tool.badge ? `<span class="${badgeClass}">${escapeHtml(tool.badge)}</span>` : ''}
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
        return ['images', 'pdf', 'video', 'audio', 'text', 'code', 'math', 'dev', 'security', 'ai'];
    }

    /* --- Data Loading --- */
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
            
            // If search is active, re-filter
            if (state.searchQuery && window.ZyncSearch) {
                window.ZyncSearch.performSearch(state.searchQuery);
            } else {
                renderDashboard(state.tools);
            }
        });
    }

    /* --- Populate Category Filters --- */
    function populateCategoryFilters() {
        const container = $('#category-filters');
        if (!container) return;

        const allBtn = container.querySelector('[data-category="all"]');
        
        state.categories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'cat-btn px-4 py-2 rounded-xl text-sm font-medium bg-slate-900 text-gray-400 border border-white/5 hover:border-white/10 hover:text-white transition-all';
            btn.dataset.category = category.id;
            btn.textContent = category.name;
            container.appendChild(btn);
        });
    }

    /* --- Init --- */
    async function init() {
        await loadRegistry();
        populateCategoryFilters();
        initFilters();
        
        // Initial render
        renderDashboard(state.tools);
        
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
        initScrollAnimations,
        initSpotlight,
        initMagneticHover
    };
})();
