/**
 * ZyncTools — Clean Search Engine
 * Fuse.js-powered tag-based search with instant filtering
 */

(function () {
    'use strict';

    let fuse = null;
    let allTools = [];
    let currentQuery = '';
    let debounceTimer = null;

    async function init() {
        try {
            const res = await fetch('/tools-database.json', { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to load tools database');
            const data = await res.json();
            allTools = data.tools || [];

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
                ignoreLocation: true,
                findAllMatches: true
            });
        } catch (err) {
            console.error('[Search] Failed to initialize:', err);
        }
    }

    function onSearch(query) {
        if (!fuse) return;

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            performSearch(query);
        }, 150);
    }

    function performSearch(query) {
        currentQuery = query;

        if (!query || query.trim().length === 0) {
            if (window.ZyncApp && window.ZyncApp.renderDashboard) {
                window.ZyncApp.renderDashboard(allTools);
            }
            return;
        }

        const q = query.trim().toLowerCase();
        const fuseResults = fuse.search(q, { limit: 100 });

        const results = fuseResults
            .sort((a, b) => (a.score || 1) - (b.score || 1))
            .map(r => r.item);

        if (results.length === 0) {
            showNoResults();
        } else {
            if (window.ZyncApp && window.ZyncApp.renderDashboard) {
                window.ZyncApp.renderDashboard(results, query);
            }
        }
    }

    function showNoResults() {
        const container = document.getElementById('category-sections');
        const noResults = document.getElementById('no-results');
        if (container) container.innerHTML = '';
        if (noResults) noResults.classList.remove('hidden');
    }

    window.ZyncSearch = {
        init,
        onSearch,
        performSearch,
        getResults: () => allTools.filter(t => currentQuery && fuse ? fuse.search(currentQuery).map(r => r.item).includes(t) : []),
        getAllTools: () => allTools
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
