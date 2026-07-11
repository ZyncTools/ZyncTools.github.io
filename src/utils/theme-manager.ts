/**
 * ZyncPDF - Theme Manager
 * Handles dark/light/system theme with persistence
 */

import { Theme, DEFAULT_SETTINGS } from '../types/index.js';
import { StorageManager } from '../storage/storage-manager.js';
import { EventEmitter } from '../utils/event-emitter.js';

const THEME_KEY = 'zyncpdf-theme';
const THEME_ATTR = 'data-theme';

export class ThemeManager extends EventEmitter {
  private theme: Theme = 'system';
  private storage: StorageManager;
  private mediaQuery: MediaQueryList | null = null;
  private resolvedTheme: 'light' | 'dark' = 'light';

  constructor(storage: StorageManager) {
    super();
    this.storage = storage;
    this.init();
  }

  private async init(): Promise<void> {
    // Load saved theme
    const saved = await this.getSavedTheme();
    if (saved) {
      this.theme = saved;
    }

    // Set up system preference listener
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', this.handleSystemChange.bind(this));

    // Apply initial theme
    this.apply(this.theme);

    // Listen for storage changes (sync across tabs)
    window.addEventListener('storage', (e) => {
      if (e.key === THEME_KEY && e.newValue) {
        this.setTheme(e.newValue as Theme, false);
      }
    });
  }

  private async getSavedTheme(): Promise<Theme | null> {
    try {
      // Try IndexedDB first
      const settings = await this.storage.getSettings();
      if (settings.theme) {
        return settings.theme;
      }
    } catch (e) {
      // Fallback to localStorage
      const stored = localStorage.getItem(THEME_KEY);
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored as Theme;
      }
    }
    return null;
  }

  private handleSystemChange(e: MediaQueryListEvent): void {
    if (this.theme === 'system') {
      this.apply('system');
    }
  }

  /**
   * Apply theme to document
   */
  apply(theme: Theme): void {
    this.theme = theme;
    this.resolvedTheme = this.resolveTheme(theme);
    
    document.documentElement.setAttribute(THEME_ATTR, this.resolvedTheme);
    document.documentElement.style.colorScheme = this.resolvedTheme;

    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor();

    // Dispatch change event
    this.emit('change', this.resolvedTheme);
    this.emit('theme:change', { theme: this.theme, resolved: this.resolvedTheme });
  }

  private resolveTheme(theme: Theme): 'light' | 'dark' {
    if (theme === 'system') {
      return this.mediaQuery?.matches ? 'dark' : 'light';
    }
    return theme;
  }

  private updateMetaThemeColor(): void {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = this.resolvedTheme === 'dark' ? '#0f172a' : '#ffffff';
  }

  /**
   * Set theme and persist
   */
  async setTheme(theme: Theme, persist = true): Promise<void> {
    if (!['light', 'dark', 'system'].includes(theme)) return;

    this.theme = theme;
    
    if (persist) {
      try {
        await this.storage.saveSettings({ theme });
      } catch (e) {
        // Fallback to localStorage
        localStorage.setItem(THEME_KEY, theme);
      }
    }

    this.apply(theme);
  }

  /**
   * Toggle between light/dark
   */
  async toggle(): Promise<Theme> {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(this.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    
    await this.setTheme(nextTheme);
    return nextTheme;
  }

  /**
   * Get current theme setting
   */
  getTheme(): Theme {
    return this.theme;
  }

  /**
   * Get resolved theme (light/dark)
   */
  getResolvedTheme(): 'light' | 'dark' {
    return this.resolvedTheme;
  }

  /**
   * Check if dark mode is active
   */
  isDark(): boolean {
    return this.resolvedTheme === 'dark';
  }

  /**
   * Check if using system theme
   */
  isSystem(): boolean {
    return this.theme === 'system';
  }

  /**
   * Get theme display name
   */
  getThemeLabel(): string {
    const labels: Record<Theme, string> = {
      light: 'Light',
      dark: 'Dark',
      system: 'System',
    };
    return labels[this.theme] || this.theme;
  }

  /**
   * Get theme icon
   */
  getThemeIcon(): string {
    if (this.theme === 'system') {
      return this.resolvedTheme === 'dark' ? 'moon' : 'sun';
    }
    return this.resolvedTheme === 'dark' ? 'moon' : 'sun';
  }

  /**
   * Create theme toggle button
   */
  createToggleButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'theme-toggle';
    button.setAttribute('aria-label', 'Toggle theme');
    button.setAttribute('type', 'button');
    
    button.innerHTML = `
      <svg class="theme-icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
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
      <svg class="theme-icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    `;

    const updateIcon = () => {
      const isDark = this.isDark();
      button.querySelector('.theme-icon-sun')!.setAttribute('style', `display: ${isDark ? 'none' : 'block'}`);
      button.querySelector('.theme-icon-moon')!.setAttribute('style', `display: ${isDark ? 'block' : 'none'}`);
    };

    button.addEventListener('click', () => this.toggle());
    
    // Initial icon state
    updateIcon();
    
    // Update on theme change
    this.on('change', updateIcon);

    return button;
  }

  /**
   * Create theme selector dropdown
   */
  createThemeSelector(): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = 'theme-selector';
    select.setAttribute('aria-label', 'Select theme');
    
    const options: { value: Theme; label: string }[] = [
      { value: 'light', label: '☀️ Light' },
      { value: 'dark', label: '🌙 Dark' },
      { value: 'system', label: '💻 System' },
    ];

    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      option.selected = opt.value === this.theme;
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      this.setTheme(e.target.value as Theme);
    });

    this.on('change', () => {
      select.value = this.theme;
    });

    return select;
  }

  /**
   * Get all theme options for UI
   */
  getThemeOptions(): { value: Theme; label: string; icon: string; description: string }[] {
    return [
      {
        value: 'light',
        label: 'Light',
        icon: '☀️',
        description: 'Always use light mode',
      },
      {
        value: 'dark',
        label: 'Dark',
        icon: '🌙',
        description: 'Always use dark mode',
      },
      {
        value: 'system',
        label: 'System',
        icon: '💻',
        description: 'Match system preference',
      },
    ];
  }
}