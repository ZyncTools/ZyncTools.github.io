/**
 * ZyncTools — Global Theme Manager
 * Syncs dark/light/grass mode across all pages using localStorage and CSS custom properties.
 * Include this script in the <head> of every page to prevent flash of unstyled content.
 */
(function () {
    'use strict';

    const THEME_KEY = 'zync-theme-v2';
    const THEMES = ['dark', 'grass', 'light'];
    const DEFAULT_THEME = 'dark';

    function getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }

    function getStoredTheme() {
        try {
            const stored = localStorage.getItem(THEME_KEY);
            if (THEMES.includes(stored)) return stored;
        } catch (e) {
            // localStorage unavailable
        }
        return null;
    }

    function resolveTheme() {
        const stored = getStoredTheme();
        return stored || DEFAULT_THEME;
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.classList.remove('theme-dark', 'theme-light', 'theme-grass');
        document.documentElement.classList.add('theme-' + theme);
        document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
    }

    function init() {
        const theme = resolveTheme();
        applyTheme(theme);

        if (!getStoredTheme()) {
            window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
                applyTheme(e.matches ? 'light' : 'dark');
            });
        }
    }

    window.ZyncTheme = {
        getCurrent: function () {
            return getStoredTheme() || DEFAULT_THEME;
        },
        toggle: function () {
            const current = this.getCurrent();
            const idx = THEMES.indexOf(current);
            const next = THEMES[(idx + 1) % THEMES.length];
            try {
                localStorage.setItem(THEME_KEY, next);
            } catch (e) { /* ignore */ }
            applyTheme(next);
            return next;
        },
        set: function (theme) {
            if (!THEMES.includes(theme)) return;
            try {
                localStorage.setItem(THEME_KEY, theme);
            } catch (e) { /* ignore */ }
            applyTheme(theme);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
