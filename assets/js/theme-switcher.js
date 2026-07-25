/**
 * ZyncPDF Theme System
 * Provides theme switching with smooth transitions
 * Persists user preference in localStorage using the unified zync-theme-v2 key
 */

class ThemeManager {
    constructor() {
        this.themeKey = 'zync-theme-v2';
        this.theme = localStorage.getItem(this.themeKey) || 'dark';
        this.themes = ['dark', 'grass', 'light'];
        this.transitioning = false;
        this.init();
    }

    init() {
        this.applyTheme(this.theme);

        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem(this.themeKey)) {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    applyTheme(theme) {
        this.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.classList.add('theme-' + theme);
        localStorage.setItem(this.themeKey, theme);
        this.updateMetaTags(theme);
    }

    updateMetaTags(theme) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        const colors = { dark: '#0a0a0f', grass: '#F4F6F8', light: '#FFFFFF' };
        metaThemeColor.content = colors[theme] || '#0a0a0f';
    }

    toggle() {
        const idx = this.themes.indexOf(this.theme);
        const next = this.themes[(idx + 1) % this.themes.length];
        this.applyTheme(next);
        return next;
    }

    getTheme() {
        return this.theme;
    }
}

window.themeManager = new ThemeManager();
