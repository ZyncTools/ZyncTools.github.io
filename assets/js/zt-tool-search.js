/**
 * ZyncTools — Header search for tool pages
 *
 * The homepage filters its grid as you type; a tool page has no grid,
 * so here the search is purely a jump-to-tool dropdown.
 */
(function () {
    'use strict';

    var ZT = window.ZT;
    var $ = ZT.$, $$ = ZT.$$, el = ZT.el;

    function init() {
        var input = $('#zt-search');
        var suggest = $('#zt-suggest');
        if (!input || !suggest) return;

        var highlighted = -1;

        function close() {
            suggest.classList.remove('is-open');
            highlighted = -1;
        }

        function render(query) {
            if (!query || query.length < 2) { close(); return; }

            var results = ZT.registry.search(query, 8);
            suggest.innerHTML = '';

            if (!results.length) {
                suggest.appendChild(el('div', { class: 'zt-suggest__empty', text: 'No tools match "' + query + '"' }));
            } else {
                results.forEach(function (tool) {
                    var category = ZT.registry.category(tool.category);
                    suggest.appendChild(el('a', {
                        class: 'zt-suggest__item',
                        href: ZT.url('tool.html') + '?id=' + tool.id
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

        input.addEventListener('input', function () { render(input.value.trim()); });
        input.addEventListener('focus', function () { render(input.value.trim()); });

        input.addEventListener('keydown', function (e) {
            var items = $$('.zt-suggest__item', suggest);

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                if (!items.length) return;
                e.preventDefault();
                highlighted += (e.key === 'ArrowDown' ? 1 : -1);
                if (highlighted < 0) highlighted = items.length - 1;
                if (highlighted >= items.length) highlighted = 0;
                items.forEach(function (item, i) { item.classList.toggle('is-highlighted', i === highlighted); });
                items[highlighted].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter' && highlighted >= 0 && items[highlighted]) {
                e.preventDefault();
                items[highlighted].click();
            } else if (e.key === 'Escape') {
                close();
                input.blur();
            }
        });

        document.addEventListener('click', function (e) {
            if (!suggest.contains(e.target) && e.target !== input) close();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
                e.preventDefault();
                input.focus();
                input.select();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
