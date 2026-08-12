/**
 * ZyncTools — Homepage
 * Renders the catalogue from the registry, with search and category filters.
 */
(function () {
    'use strict';

    var ZT = window.ZT;
    var $ = ZT.$, $$ = ZT.$$, el = ZT.el;

    var state = {
        category: 'all',
        query: ''
    };

    function boot() {
        renderSidebar();
        renderStats();
        render();
        bindSearch();
        bindHash();
        bindSidebarToggle();
    }

    /* ============================================================
       SIDEBAR
       ============================================================ */
    function renderSidebar() {
        var host = $('#zt-sidebar-nav');
        if (!host) return;

        var all = ZT.registry.all();
        var counts = ZT.registry.countByCategory();

        host.appendChild(navButton('all', 'layout-grid', 'All tools', all.length));

        var label = el('div', { class: 'zt-sidebar__label', text: 'Categories' });
        host.appendChild(label);

        ZT.registry.categories().forEach(function (category) {
            if (!counts[category.id]) return;
            host.appendChild(navButton(category.id, category.icon, category.name, counts[category.id]));
        });
    }

    function navButton(id, iconName, text, count) {
        var button = el('button', {
            class: 'zt-navlink' + (id === state.category ? ' is-active' : ''),
            type: 'button',
            'data-category': id,
            onclick: function () { setCategory(id); }
        }, [
            nodeFromHtml(ZT.icons.svg(iconName)),
            el('span', { class: 'zt-navlink__text', text: text }),
            el('span', { class: 'zt-navlink__count', text: String(count) })
        ]);
        return button;
    }

    function setCategory(id) {
        state.category = id;
        state.query = '';

        var search = $('#zt-search');
        if (search) search.value = '';

        $$('[data-category]').forEach(function (button) {
            button.classList.toggle('is-active', button.getAttribute('data-category') === id);
        });

        closeSidebar();
        render();

        if (id !== 'all') {
            history.replaceState(null, '', '#' + id);
        } else {
            history.replaceState(null, '', location.pathname);
        }

        var main = $('#zt-catalog');
        if (main) main.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* ============================================================
       STATS
       ============================================================ */
    function renderStats() {
        var all = ZT.registry.all();
        setText('#zt-stat-tools', ZT.formatNumber(all.length));
        setText('#zt-stat-categories', String(ZT.registry.categories().filter(function (c) {
            return ZT.registry.inCategory(c.id).length;
        }).length));
        setText('#zt-stat-uploads', '0');
    }

    function setText(selector, value) {
        var node = $(selector);
        if (node) node.textContent = value;
    }

    /* ============================================================
       CATALOGUE
       ============================================================ */
    function render() {
        var host = $('#zt-catalog');
        var empty = $('#zt-empty');
        if (!host) return;

        var tools;
        if (state.query) {
            tools = ZT.registry.search(state.query, 60);
        } else if (state.category === 'all') {
            tools = ZT.registry.all();
        } else {
            tools = ZT.registry.inCategory(state.category);
        }

        host.innerHTML = '';

        if (!tools.length) {
            if (empty) empty.classList.add('is-visible');
            return;
        }
        if (empty) empty.classList.remove('is-visible');

        if (state.query) {
            host.appendChild(section({
                name: tools.length + ' result' + (tools.length === 1 ? '' : 's') + ' for "' + state.query + '"',
                icon: 'search',
                blurb: 'Ranked by how closely each tool matches.'
            }, tools));
            return;
        }

        // Grouped by category so the page reads as a directory, not a dump.
        var categories = state.category === 'all'
            ? ZT.registry.categories()
            : ZT.registry.categories().filter(function (c) { return c.id === state.category; });

        categories.forEach(function (category) {
            var inCategory = tools.filter(function (t) { return t.category === category.id; });
            if (!inCategory.length) return;
            host.appendChild(section(category, inCategory));
        });
    }

    function section(category, tools) {
        var head = el('div', { class: 'zt-section__head' }, [
            el('div', { class: 'zt-section__icon', html: ZT.icons.svg(category.icon || 'wrench') }),
            el('div', { style: { minWidth: '0' } }, [
                el('h2', { class: 'zt-section__title', text: category.name }),
                category.blurb ? el('p', { class: 'zt-section__sub', text: category.blurb }) : null
            ].filter(Boolean)),
            el('span', { class: 'zt-section__count', text: tools.length + ' tools' })
        ]);

        var grid = el('div', { class: 'zt-grid' });
        tools.forEach(function (tool) { grid.appendChild(toolCard(tool)); });

        return el('section', { class: 'zt-section', id: category.id }, [head, grid]);
    }

    function toolCard(tool) {
        var badges = [];
        if (tool.popular) badges.push(el('span', { class: 'zt-badge zt-badge--popular', text: 'Popular' }));

        return el('a', {
            class: 'zt-tool-card',
            href: ZT.toolUrl(tool.id)
        }, [
            el('div', { class: 'zt-tool-card__top' }, [
                el('div', { class: 'zt-tool-card__icon', html: ZT.icons.svg(tool.icon) }),
                badges.length ? el('div', { class: 'zt-tool-card__badges' }, badges) : null
            ].filter(Boolean)),
            el('h3', { class: 'zt-tool-card__title', html: highlight(tool.name) }),
            el('p', { class: 'zt-tool-card__desc', html: highlight(tool.description) })
        ]);
    }

    /** Wrap query matches in <mark>, escaping everything else. */
    function highlight(text) {
        var safe = ZT.esc(text);
        if (!state.query) return safe;

        var terms = state.query.trim().split(/\s+/).filter(function (t) { return t.length > 1; });
        terms.forEach(function (term) {
            var pattern = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            safe = safe.replace(pattern, '<mark>$1</mark>');
        });
        return safe;
    }

    /* ============================================================
       SEARCH
       ============================================================ */
    function bindSearch() {
        var input = $('#zt-search');
        var suggest = $('#zt-suggest');
        if (!input) return;

        var highlighted = -1;

        var runSearch = ZT.debounce(function () {
            state.query = input.value.trim();
            if (state.query) state.category = 'all';
            $$('[data-category]').forEach(function (b) {
                b.classList.toggle('is-active', state.query ? false : b.getAttribute('data-category') === state.category);
            });
            render();
        }, 180);

        input.addEventListener('input', function () {
            runSearch();
            renderSuggestions(input.value.trim());
            highlighted = -1;
        });

        input.addEventListener('focus', function () {
            if (input.value.trim()) renderSuggestions(input.value.trim());
        });

        input.addEventListener('keydown', function (e) {
            var items = suggest ? $$('.zt-suggest__item', suggest) : [];

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                if (!items.length) return;
                e.preventDefault();
                highlighted += (e.key === 'ArrowDown' ? 1 : -1);
                if (highlighted < 0) highlighted = items.length - 1;
                if (highlighted >= items.length) highlighted = 0;
                items.forEach(function (item, i) {
                    item.classList.toggle('is-highlighted', i === highlighted);
                });
                items[highlighted].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                if (highlighted >= 0 && items[highlighted]) {
                    e.preventDefault();
                    items[highlighted].click();
                }
            } else if (e.key === 'Escape') {
                closeSuggestions();
                input.blur();
            }
        });

        document.addEventListener('click', function (e) {
            if (suggest && !suggest.contains(e.target) && e.target !== input) closeSuggestions();
        });

        // "/" focuses search from anywhere, the way developer tools do.
        document.addEventListener('keydown', function (e) {
            if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
                e.preventDefault();
                input.focus();
                input.select();
            }
        });
    }

    function renderSuggestions(query) {
        var suggest = $('#zt-suggest');
        if (!suggest) return;

        if (!query || query.length < 2) {
            closeSuggestions();
            return;
        }

        var results = ZT.registry.search(query, 7);
        suggest.innerHTML = '';

        if (!results.length) {
            suggest.appendChild(el('div', { class: 'zt-suggest__empty', text: 'No tools match "' + query + '"' }));
        } else {
            results.forEach(function (tool) {
                var category = ZT.registry.category(tool.category);
                suggest.appendChild(el('a', {
                    class: 'zt-suggest__item',
                    href: ZT.toolUrl(tool.id)
                }, [
                    el('span', { class: 'zt-suggest__icon', html: ZT.icons.svg(tool.icon) }),
                    el('span', { class: 'zt-suggest__body' }, [
                        el('span', { class: 'zt-suggest__title', text: tool.name }),
                        el('span', { class: 'zt-suggest__desc', text: tool.description })
                    ]),
                    el('span', { class: 'zt-suggest__cat', text: category ? category.name : '' })
                ]));
            });
        }

        suggest.classList.add('is-open');
    }

    function closeSuggestions() {
        var suggest = $('#zt-suggest');
        if (suggest) suggest.classList.remove('is-open');
    }

    /* ============================================================
       HASH ROUTING
       ============================================================ */
    function bindHash() {
        function applyHash() {
            var hash = location.hash.replace('#', '');
            if (hash && ZT.registry.category(hash)) {
                state.category = hash;
                $$('[data-category]').forEach(function (b) {
                    b.classList.toggle('is-active', b.getAttribute('data-category') === hash);
                });
                render();
            }
        }
        applyHash();
        window.addEventListener('hashchange', applyHash);
    }

    /* ============================================================
       MOBILE SIDEBAR
       ============================================================ */
    function bindSidebarToggle() {
        var toggle = $('#zt-sidebar-toggle');
        var sidebar = $('#zt-sidebar');
        var backdrop = $('#zt-sidebar-backdrop');
        if (!toggle || !sidebar) return;

        toggle.addEventListener('click', function () {
            var open = sidebar.classList.toggle('is-open');
            if (backdrop) backdrop.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        if (backdrop) backdrop.addEventListener('click', closeSidebar);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeSidebar();
        });
    }

    function closeSidebar() {
        var sidebar = $('#zt-sidebar');
        var backdrop = $('#zt-sidebar-backdrop');
        var toggle = $('#zt-sidebar-toggle');
        if (sidebar) sidebar.classList.remove('is-open');
        if (backdrop) backdrop.classList.remove('is-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }

    function nodeFromHtml(html) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        return wrapper.firstElementChild;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();
