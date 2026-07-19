/**
 * ZyncTools — Smart Search Engine
 * Fuzzy search using Fuse.js with tags, formats, and multi-key matching
 */

(function () {
    'use strict';

    let fuse = null;
    let allTools = [];
    let currentResults = null;
    let debounceTimer = null;

    /* ============================================
       INITIALIZATION
       ============================================ */

    async function init() {
        try {
            const res = await fetch('/tools-database.json', { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to load tools database');
            const data = await res.json();
            allTools = data.tools || [];
            
            // Initialize Fuse.js with multi-key fuzzy search
            fuse = new Fuse(allTools, {
                keys: [
                    { name: 'name', weight: 0.4 },
                    { name: 'tags', weight: 0.3 },
                    { name: 'category', weight: 0.2 },
                    { name: 'formats', weight: 0.15 },
                    { name: 'description', weight: 0.1 }
                ],
                threshold: 0.4,
                includeScore: true,
                includeMatches: true,
                minMatchCharLength: 2,
                ignoreLocation: true,
                findAllMatches: true
            });
            
            console.log(`[Search] Indexed ${allTools.length} tools`);
        } catch (err) {
            console.error('[Search] Failed to initialize:', err);
        }
    }

    /* ============================================
       SEARCH LOGIC
       ============================================ */

    function onSearch(query) {
        if (!fuse) {
            console.warn('[Search] Fuse not initialized');
            return;
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            performSearch(query);
        }, 150);
    }

    function performSearch(query) {
        const results = [];
        
        if (!query || query.trim().length === 0) {
        currentResults = null;
        if (window.ZyncApp && window.ZyncApp.renderDashboard) {
            window.ZyncApp.renderDashboard(allTools);
        }
        return;
        }

        const q = query.trim().toLowerCase();
        
        // Multi-key fuzzy search via Fuse.js
        const fuseResults = fuse.search(q, { limit: 100 });
        
        fuseResults.forEach(result => {
            const tool = result.item;
            const score = result.score || 1;
            
            // Collect matched fields for highlighting
            const matchedFields = [];
            result.matches?.forEach(match => {
                matchedFields.push({
                    field: match.key,
                    indices: match.indices
                });
            });
            
            results.push({
                ...tool,
                _score: score,
                _matchedFields: matchedFields
            });
        });

        // Sort by score (lower is better)
        results.sort((a, b) => a._score - b._score);
        
        currentResults = results;
        
        // Render results
        if (results.length === 0) {
            showNoResults();
        } else {
            if (window.ZyncApp && window.ZyncApp.renderDashboard) {
                window.ZyncApp.renderDashboard(results, query);
            }
        }
    }

    /* ============================================
       RENDERING
       ============================================ */

    function renderDashboard(tools, query = '') {
        const container = document.getElementById('category-sections');
        const noResults = document.getElementById('no-results');
        
        if (!container) return;

        // Group by category
        const grouped = {};
        tools.forEach(tool => {
            if (!grouped[tool.category]) grouped[tool.category] = [];
            grouped[tool.category].push(tool);
        });

        // Get category order from current page or default
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
        
        if (noResults) noResults.classList.add('hidden');
        
        // Initialize Lucide icons
        if (window.lucide) lucide.createIcons();
        
        // Initialize scroll animations
        if (window.ZyncApp?.initScrollAnimations) {
            window.ZyncApp.initScrollAnimations();
        }
    }

    function renderCard(tool, index, query = '') {
        const name = query ? highlightText(tool.name, query) : escapeHtml(tool.name);
        const desc = query ? highlightText(tool.description, query) : escapeHtml(tool.description || '');
        const sizeClass = getCardSizeClass(tool, index);
        const iconName = (window.ZyncToolIcons && window.ZyncToolIcons[tool.id]) || 
                        (window.ZyncToolIcons && window.ZyncToolIcons[tool.category]) || 
                        'tool';
        
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

    function showNoResults() {
        const container = document.getElementById('category-sections');
        const noResults = document.getElementById('no-results');
        
        if (container) container.innerHTML = '';
        if (noResults) noResults.classList.remove('hidden');
    }

    /* ============================================
       HELPERS
       ============================================ */

    function getCategoryOrder() {
        // Preserve the order from the database
        if (allTools.length > 0) {
            const seen = new Set();
            const order = [];
            allTools.forEach(t => {
                if (!seen.has(t.category)) {
                    seen.add(t.category);
                    order.push(t.category);
                }
            });
            return order;
        }
        return ['images', 'pdf', 'video', 'audio', 'text', 'code', 'math', 'dev', 'security', 'ai'];
    }

    function getCardSizeClass(tool, index) {
        if (tool.popular) return 'bento-wide';
        if ((index + 1) % 4 === 0) return 'bento-large';
        return 'bento-standard';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function highlightText(text, query) {
        if (!query || !text) return escapeHtml(text);
        
        const escaped = escapeHtml(text);
        const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Highlight multiple potential matches
        const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
        let result = escaped;
        
        terms.forEach(term => {
            const regex = new RegExp(`(${term})`, 'gi');
            result = result.replace(regex, '<mark>$1</mark>');
        });
        
        return result;
    }

    /* ============================================
       PUBLIC API
       ============================================ */

    window.ZyncSearch = {
        init,
        onSearch,
        performSearch,
        getResults: () => currentResults,
        getAllTools: () => allTools
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
