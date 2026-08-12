/**
 * ZyncTools — Theme switcher
 *
 * Three themes cycle in order: dark, light, midnight. The choice is stored
 * locally; with no stored choice the OS preference decides.
 *
 * A blocking inline snippet in each page applies the theme before first
 * paint — this file only handles switching after load.
 */
(function () {
    'use strict';

    var ZT = window.ZT;
    var KEY = 'zynctools-theme';

    var THEMES = [
        { id: 'dark', name: 'Dark', icon: 'moon' },
        { id: 'light', name: 'Light', icon: 'sun' },
        { id: 'midnight', name: 'Midnight', icon: 'monitor' }
    ];

    function stored() {
        try {
            var value = localStorage.getItem(KEY);
            return THEMES.some(function (t) { return t.id === value; }) ? value : null;
        } catch (e) { return null; }
    }

    function preferred() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }

    function current() { return stored() || preferred(); }

    function apply(id) {
        var theme = THEMES.filter(function (t) { return t.id === id; })[0] || THEMES[0];
        document.documentElement.setAttribute('data-theme', theme.id);
        try { localStorage.setItem(KEY, theme.id); } catch (e) { /* private mode */ }
        updateButton(theme);
    }

    function cycle() {
        var index = THEMES.findIndex(function (t) { return t.id === current(); });
        apply(THEMES[(index + 1) % THEMES.length].id);
    }

    function updateButton(theme) {
        var button = ZT.$('#zt-theme-toggle');
        if (!button) return;
        button.innerHTML = ZT.icons.svg(theme.icon);
        button.setAttribute('title', theme.name + ' theme — click to switch');
        button.setAttribute('aria-label', 'Theme: ' + theme.name + '. Click to switch.');
    }

    function init() {
        updateButton(THEMES.filter(function (t) { return t.id === current(); })[0] || THEMES[0]);

        var button = ZT.$('#zt-theme-toggle');
        if (button) button.addEventListener('click', cycle);

        // Follow the OS only while the user has not made an explicit choice.
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function () {
                if (!stored()) {
                    document.documentElement.setAttribute('data-theme', preferred());
                }
            });
        }
    }

    ZT.theme = { apply: apply, cycle: cycle, current: current };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
