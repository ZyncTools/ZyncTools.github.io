/**
 * ZyncTools — Theme Cycler (3-State)
 * Cycles: dark -> grass -> light -> dark
 * Persists via localStorage; prevents FOUC with inline boot script in HTML.
 *
 * Public API: window.ZyncTheme = {
 *   current, cycle(), set(theme), getThemes(), onThemeChange(cb)
 * }
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'zync-theme-v2';
    const VALID_THEMES = ['dark', 'grass', 'light'];
    const DEFAULT_THEME = 'dark';

    const CYCLE_ORDER = ['dark', 'grass', 'light'];

    const META = {
        dark: { name: 'Dark', lucideIcon: 'moon', hint: 'Neon-green on charcoal' },
        grass: { name: 'Grass', lucideIcon: 'sun-medium', hint: 'Light, grass-green cards' },
        light: { name: 'Light', lucideIcon: 'sun', hint: 'Pure white + blue accent' }
    };

    let listeners = [];

    function resolveSystemTheme() {
        try {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                return 'light';
            }
        } catch (e) { /* ignore */ }
        return 'dark';
    }

    function isValid(theme) {
        return VALID_THEMES.indexOf(theme) !== -1;
    }

    function getStored() {
        try {
            const v = localStorage.getItem(STORAGE_KEY);
            return isValid(v) ? v : null;
        } catch (e) { return null; }
    }

    function getCurrent() {
        return getStored() || resolveSystemTheme();
    }

    function applyTheme(theme) {
        if (!isValid(theme)) theme = DEFAULT_THEME;
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);
        root.classList.remove('theme-dark', 'theme-grass', 'theme-light');
        root.classList.add('theme-' + theme);
        root.style.colorScheme = (theme === 'dark') ? 'dark' : 'light';
        notify(theme);
    }

    function setTheme(theme, persist) {
        if (!isValid(theme)) return false;
        applyTheme(theme);
        if (persist !== false) {
            try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* ignore */ }
        }
        return true;
    }

    function cycle() {
        const current = getCurrent();
        const idx = CYCLE_ORDER.indexOf(current);
        const next = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
        setTheme(next);
        return next;
    }

    function onThemeChange(cb) {
        if (typeof cb === 'function') listeners.push(cb);
    }

    function notify(theme) {
        listeners.forEach(function (cb) {
            try { cb(theme, META[theme] || null); } catch (e) { /* ignore */ }
        });
        updateUI(theme);
    }

    function updateUI(theme) {
        const meta = META[theme] || META.dark;
        document.querySelectorAll('[data-theme-cycle-btn]').forEach(function (btn) {
            const label = btn.querySelector('[data-theme-cycle-label]');
            const swatch = btn.querySelector('[data-theme-cycle-swatch]');
            const icon = btn.querySelector('[data-theme-cycle-icon]');
            if (label) label.textContent = meta.name;
            if (swatch) {
                const colors = { dark: '#00FF00', grass: '#00CC00', light: '#2563EB' };
                swatch.style.background =
                    'linear-gradient(135deg, ' + colors[theme] + ' 50%, var(--bg-base, #0B0C10) 50%)';
            }
            if (icon) {
                icon.setAttribute('data-lucide', meta.lucideIcon);
                if (window.lucide && typeof window.lucide.createIcons === 'function') {
                    window.lucide.createIcons();
                }
            }
            btn.setAttribute('aria-label', 'Theme: ' + meta.name + '. Click to switch.');
            btn.setAttribute('title', meta.hint);
        });
    }

    function bootClickHandlers() {
        document.querySelectorAll('[data-theme-cycle-btn]').forEach(function (btn) {
            if (btn.__zyncThemeBound) return;
            btn.__zyncThemeBound = true;
            btn.addEventListener('click', function () {
                cycle();
            });
        });
    }

    function init() {
        const theme = getStored() || resolveSystemTheme();
        applyTheme(theme);
        bootClickHandlers();
        if (document.readyState === 'loading' || !document.querySelectorAll) {
            document.addEventListener('DOMContentLoaded', bootClickHandlers);
        }

        try {
            if (window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function (e) {
                    if (!getStored()) {
                        applyTheme(e.matches ? 'light' : 'dark');
                    }
                });
            }
        } catch (e) { /* ignore */ }
    }

    window.ZyncTheme = {
        getCurrent: getCurrent,
        getThemes: function () { return VALID_THEMES.slice(); },
        getMeta: function (t) { return META[t] || null; },
        set: function (theme) { return setTheme(theme); },
        cycle: cycle,
        onThemeChange: onThemeChange
    };

    init();
})();
