/**
 * ZyncPDF Theme System
 * Provides dark/light mode switching with smooth transitions
 * Persists user preference in localStorage
 */

class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('zyncpdf-theme') || 'light';
        this.transitioning = false;
        this.init();
    }

    init() {
        // Apply saved theme on load
        this.applyTheme(this.theme);

        // Listen for system preference changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem('zyncpdf-theme')) {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    applyTheme(theme) {
        this.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('zyncpdf-theme', theme);
        this.updateMetaTags(theme);
    }

    updateMetaTags(theme) {
        // Update meta theme-color for mobile browsers
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.content = theme === 'dark' ? '#0a0a0f' : '#ffffff';
    }

    toggle() {
        const newTheme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        return newTheme;
    }

    getTheme() {
        return this.theme;
    }
}

// Global instance
window.themeManager = new ThemeManager();
