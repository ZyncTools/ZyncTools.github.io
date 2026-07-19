/**
 * ZyncTools — Global Theme Manager
 * Syncs dark/light mode across all pages using localStorage and CSS custom properties.
 * Include this script in the <head> of every page to prevent flash of unstyled content.
 */
(function () {
    'use strict';

    const THEME_KEY = 'zync-theme';
    const DEFAULT_THEME = 'dark';

    function getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }

    function getStoredTheme() {
        try {
            const stored = localStorage.getItem(THEME_KEY);
            if (stored === 'dark' || stored === 'light') return stored;
        } catch (e) {
            // localStorage unavailable
        }
        return null;
    }

    function resolveTheme() {
        const stored = getStoredTheme();
        return stored || getSystemTheme();
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.classList.remove('theme-dark', 'theme-light');
        document.documentElement.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
    }

    function init() {
        const theme = resolveTheme();
        applyTheme(theme);

        // Listen for system theme changes when no explicit preference is set
        if (!getStoredTheme()) {
            window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
                applyTheme(e.matches ? 'light' : 'dark');
            });
        }
    }

    // Expose API for toggle buttons
    window.ZyncTheme = {
        getCurrent: function () {
            return getStoredTheme() || getSystemTheme();
        },
        toggle: function () {
            const current = this.getCurrent();
            const next = current === 'dark' ? 'light' : 'dark';
            try {
                localStorage.setItem(THEME_KEY, next);
            } catch (e) {
                // ignore
            }
            applyTheme(next);
            return next;
        },
        set: function (theme) {
            if (theme !== 'dark' && theme !== 'light') return;
            try {
                localStorage.setItem(THEME_KEY, theme);
            } catch (e) {
                // ignore
            }
            applyTheme(theme);
        }
    };

    // Apply immediately to prevent FOUC
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
