/**
 * @file Theme Manager
 * Dark/light mode switching with system preference detection
 * @module utils/theme
 */

/**
 * Theme Manager Class
 */
export class ThemeManager {
  constructor() {
    this.theme = 'system';
    this.listeners = [];
    this.mediaQuery = null;
    this.init();
  }
  
  /**
   * Initialize theme manager
   */
  init() {
    // Load saved theme
    const saved = localStorage.getItem('zyncpdf-theme');
    if (saved) {
      this.theme = saved;
    }
    
    // Apply theme
    this.applyTheme(this.theme);
    
    // Listen for system preference changes
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', this.handleSystemChange.bind(this));
    
    // Listen for storage changes (other tabs)
    window.addEventListener('storage', (e) => {
      if (e.key === 'zyncpdf-theme') {
        this.theme = e.newValue || 'system';
        this.applyTheme(this.theme);
        this.notifyListeners();
      }
    });
  }
  
  /**
   * Handle system theme change
   * @param {MediaQueryListEvent} e - Media query event
   */
  handleSystemChange(e) {
    if (this.theme === 'system') {
      this.applyTheme('system');
      this.notifyListeners();
    }
  }
  
  /**
   * Apply theme to document
   * @param {'light'|'dark'|'system'} theme - Theme to apply
   */
  applyTheme(theme) {
    this.theme = theme;
    localStorage.setItem('zyncpdf-theme', theme);
    
    const isDark = theme === 'dark' || (theme === 'system' && this.mediaQuery?.matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    
    // Update meta theme-color
    this.updateMetaTag(isDark);
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }
  
  /**
   * Update meta theme-color tag
   * @param {boolean} isDark - Whether dark mode
   */
  updateMetaTag(isDark) {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = isDark ? '#0a0a0f' : '#ffffff';
  }
  
  /**
   * Toggle theme
   * @returns {'light'|'dark'|'system'} New theme
   */
  toggle() {
    const themes = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(this.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const newTheme = themes[nextIndex];
    this.applyTheme(newTheme);
    this.notifyListeners();
    return newTheme;
  }
  
  /**
   * Set specific theme
   * @param {'light'|'dark'|'system'} theme - Theme to set
   */
  setTheme(theme) {
    if (['light', 'dark', 'system'].includes(theme)) {
      this.applyTheme(theme);
      this.notifyListeners();
    }
  }
  
  /**
   * Get current theme
   * @returns {'light'|'dark'|'system'} Current theme
   */
  getTheme() {
    return this.theme;
  }
  
  /**
   * Check if dark mode is active
   * @returns {boolean} True if dark mode
   */
  isDark() {
    if (this.theme === 'system') {
      return this.mediaQuery?.matches ?? false;
    }
    return this.theme === 'dark';
  }
  
  /**
   * Subscribe to theme changes
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Notify all listeners
   */
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.theme, this.isDark()));
  }
  
  /**
   * Create theme toggle button
   * @param {Object} options - Button options
   * @returns {HTMLButtonElement} Toggle button
   */
  createToggleButton(options = {}) {
    const { ariaLabel = 'Toggle theme', showLabel = false } = options;
    
    const button = document.createElement('button');
    button.className = 'theme-toggle';
    button.setAttribute('aria-label', ariaLabel);
    button.setAttribute('type', 'button');
    
    button.innerHTML = `
      <svg class="theme-icon theme-icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
      <svg class="theme-icon theme-icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
      ${showLabel ? '<span class="theme-toggle-label"></span>' : ''}
    `;
    
    const updateLabel = () => {
      const label = button.querySelector('.theme-toggle-label');
      if (label) {
        label.textContent = this.isDark() ? 'Light' : 'Dark';
      }
    };
    
    button.addEventListener('click', () => {
      this.toggle();
      updateLabel();
    });
    
    // Initial label
    updateLabel();
    
    // Update on theme change
    const unsubscribe = this.subscribe(updateLabel);
    
    // Cleanup function
    button.destroy = () => {
      unsubscribe();
      button.removeEventListener('click', () => {});
    };
    
    return button;
  }
}

// Global instance
export const themeManager = new ThemeManager();

// Initialize on load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => themeManager.init());
  } else {
    themeManager.init();
  }
}

export default themeManager;