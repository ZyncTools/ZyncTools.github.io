/**
 * @file Command Palette Component
 * Global command palette with fuzzy search (Ctrl+K)
 * @module components/command-palette
 */

import { createModal, closeModal } from './modal.js';
import { debounce } from '../utils/ui.js';

/**
 * Command palette item
 * @typedef {Object} CommandItem
 * @property {string} id - Unique identifier
 * @property {string} title - Display title
 * @property {string} [description] - Description
 * @property {string} [icon] - Icon HTML
 * @property {string} [shortcut] - Keyboard shortcut display
 * @property {string} [section] - Section/group name
 * @property {Function} action - Action to execute
 * @property {string[]} [keywords] - Search keywords
 * @property {string[]} [aliases] - Alternative names
 */

/**
 * Command palette instance
 */
class CommandPalette {
  constructor() {
    this.items = [];
    this.filteredItems = [];
    this.selectedIndex = 0;
    this.isOpen = false;
    this.overlay = null;
    this.input = null;
    this.results = null;
    this.sections = null;
    this.debouncedFilter = debounce(this.filter.bind(this), 50);
    this.shortcutHandler = this.handleGlobalShortcut.bind(this);
  }
  
  /**
   * Register command items
   * @param {CommandItem[]} items - Items to register
   */
  register(items) {
    this.items.push(...items);
  }
  
  /**
   * Clear all items
   */
  clear() {
    this.items = [];
  }
  
  /**
   * Open command palette
   */
  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.selectedIndex = 0;
    this.render();
    this.bindEvents();
    
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this.shortcutHandler);
    
    // Focus input
    setTimeout(() => this.input?.focus(), 50);
  }
  
  /**
   * Close command palette
   */
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    
    if (this.overlay) {
      this.overlay.classList.remove('open');
      this.overlay.addEventListener('transitionend', () => {
        this.overlay?.remove();
        this.overlay = null;
      }, { once: true });
      
      // Fallback
      setTimeout(() => {
        if (this.overlay) {
          this.overlay.remove();
          this.overlay = null;
        }
      }, 300);
    }
    
    document.body.style.overflow = '';
    document.removeEventListener('keydown', this.shortcutHandler);
    this.unbindEvents();
  }
  
  /**
   * Toggle command palette
   */
  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }
  
  /**
   * Render command palette
   */
  render() {
    this.filteredItems = [...this.items];
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'command-palette-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.setAttribute('aria-label', 'Command Palette');
    
    this.overlay.innerHTML = `
      <div class="command-palette" role="search">
        <div class="command-palette-header">
          <svg class="command-palette-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            class="command-palette-input" 
            placeholder="Type a command or search..." 
            autocomplete="off" 
            spellcheck="false"
            aria-label="Search commands"
            aria-autocomplete="list"
            aria-controls="command-palette-results"
          >
          <kbd class="command-palette-shortcut">⌘K</kbd>
        </div>
        <div class="command-palette-results" id="command-palette-results" role="listbox"></div>
      </div>
    `;
    
    document.body.appendChild(this.overlay);
    
    this.input = this.overlay.querySelector('.command-palette-input');
    this.results = this.overlay.querySelector('.command-palette-results');
    
    this.renderResults();
    
    // Animate in
    requestAnimationFrame(() => {
      this.overlay.classList.add('open');
    });
  }
  
  /**
   * Filter items based on input
   */
  filter() {
    const query = this.input.value.toLowerCase().trim();
    
    if (!query) {
      this.filteredItems = [...this.items];
    } else {
      this.filteredItems = this.items
        .map(item => {
          const searchText = [
            item.title,
            item.description || '',
            item.keywords?.join(' ') || '',
            item.aliases?.join(' ') || '',
            item.section || ''
          ].join(' ').toLowerCase();
          
          // Calculate match score
          let score = 0;
          if (item.title.toLowerCase().startsWith(query)) score += 100;
          if (item.title.toLowerCase().includes(query)) score += 50;
          if (item.description?.toLowerCase().includes(query)) score += 20;
          if (item.keywords?.some(k => k.toLowerCase().includes(query))) score += 30;
          if (item.aliases?.some(a => a.toLowerCase().includes(query))) score += 40;
          
          return { item, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item);
    }
    
    this.selectedIndex = 0;
    this.renderResults();
  }
  
  /**
   * Render filtered results
   */
  renderResults() {
    if (!this.results) return;
    
    if (this.filteredItems.length === 0) {
      this.results.innerHTML = `
        <div class="command-palette-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p>No commands found</p>
          <small>Try a different search term</small>
        </div>
      `;
      return;
    }
    
    // Group by section
    const sections = {};
    this.filteredItems.forEach(item => {
      const section = item.section || 'Commands';
      if (!sections[section]) sections[section] = [];
      sections[section].push(item);
    });
    
    this.results.innerHTML = Object.entries(sections).map(([sectionName, items]) => `
      <div class="command-palette-section">
        <div class="command-palette-section-title">${sectionName}</div>
        ${items.map((item, index) => `
          <div 
            class="command-palette-item ${index === this.selectedIndex ? 'selected' : ''}" 
            role="option" 
            aria-selected="${index === this.selectedIndex}"
            data-index="${this.filteredItems.indexOf(item)}"
            data-id="${item.id}"
          >
            ${item.icon ? `<span class="command-palette-item-icon">${item.icon}</span>` : ''}
            <div class="command-palette-item-content">
              <div class="command-palette-item-title">${this.escapeHtml(item.title)}</div>
              ${item.description ? `<div class="command-palette-item-description">${this.escapeHtml(item.description)}</div>` : ''}
            </div>
            ${item.shortcut ? `<span class="command-palette-item-shortcut">${this.escapeHtml(item.shortcut)}</span>` : ''}
          </div>
        `).join('')}
      </div>
    `).join('');
  }
  
  /**
   * Handle global shortcut
   * @param {KeyboardEvent} e - Key event
   */
  handleGlobalShortcut(e) {
    // Close on Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }
    
    // Ignore if typing in input (handled by input event)
    if (e.target === this.input) return;
  }
  
  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} e - Key event
   */
  handleKeyDown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectNext();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectPrevious();
        break;
      case 'Enter':
        e.preventDefault();
        this.executeSelected();
        break;
      case 'Tab':
        e.preventDefault();
        this.selectNext();
        break;
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
    }
  }
  
  /**
   * Select next item
   */
  selectNext() {
    if (this.filteredItems.length === 0) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.filteredItems.length;
    this.updateSelection();
  }
  
  /**
   * Select previous item
   */
  selectPrevious() {
    if (this.filteredItems.length === 0) return;
    this.selectedIndex = (this.selectedIndex - 1 + this.filteredItems.length) % this.filteredItems.length;
    this.updateSelection();
  }
  
  /**
   * Update visual selection
   */
  updateSelection() {
    const items = this.results?.querySelectorAll('.command-palette-item');
    items?.forEach((item, index) => {
      const isSelected = index === this.selectedIndex;
      item.classList.toggle('selected', isSelected);
      item.setAttribute('aria-selected', isSelected);
    });
    
    // Scroll into view
    const selected = items?.[this.selectedIndex];
    selected?.scrollIntoView({ block: 'nearest' });
  }
  
  /**
   * Execute selected item action
   */
  executeSelected() {
    const item = this.filteredItems[this.selectedIndex];
    if (item?.action) {
      item.action();
      this.close();
    }
  }
  
  /**
   * Bind events
   */
  bindEvents() {
    this.input?.addEventListener('input', this.debouncedFilter);
    this.input?.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.results?.addEventListener('click', this.handleClick.bind(this));
    this.results?.addEventListener('mouseover', this.handleMouseOver.bind(this));
  }
  
  /**
   * Unbind events
   */
  unbindEvents() {
    this.input?.removeEventListener('input', this.debouncedFilter);
    this.input?.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.results?.removeEventListener('click', this.handleClick.bind(this));
    this.results?.removeEventListener('mouseover', this.handleMouseOver.bind(this));
  }
  
  /**
   * Handle click on result
   * @param {MouseEvent} e - Click event
   */
  handleClick(e) {
    const item = e.target.closest('.command-palette-item');
    if (item) {
      const index = parseInt(item.dataset.index, 10);
      this.selectedIndex = index;
      this.executeSelected();
    }
  }
  
  /**
   * Handle mouse over result
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseOver(e) {
    const item = e.target.closest('.command-palette-item');
    if (item) {
      const index = parseInt(item.dataset.index, 10);
      this.selectedIndex = index;
      this.updateSelection();
    }
  }
  
  /**
   * Escape HTML
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Singleton instance
let commandPaletteInstance = null;

/**
 * Get command palette instance
 * @returns {CommandPalette} Command palette instance
 */
export function getCommandPalette() {
  if (!commandPaletteInstance) {
    commandPaletteInstance = new CommandPalette();
  }
  return commandPaletteInstance;
}

/**
 * Initialize command palette with default commands
 * @param {CommandItem[]} customCommands - Additional commands
 */
export function initCommandPalette(customCommands = []) {
  const palette = getCommandPalette();
  
  // Default commands
  const defaultCommands = [
    {
      id: 'toggle-theme',
      title: 'Toggle Theme',
      description: 'Switch between light and dark mode',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
      shortcut: '⌘⇧T',
      section: 'Appearance',
      keywords: ['dark', 'light', 'mode', 'theme'],
      action: () => {
        import('../utils/theme.js').then(m => m.themeManager.toggle());
      }
    },
    {
      id: 'toggle-animations',
      title: 'Toggle Animations',
      description: 'Enable or disable animations',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
      shortcut: '⌘⇧A',
      section: 'Appearance',
      keywords: ['animation', 'motion', 'reduce'],
      action: () => {
        const current = document.body.style.getPropertyValue('--transition-duration');
        document.body.style.setProperty('--transition-duration', current === '0s' ? '' : '0s');
        showToast({ message: `Animations ${current === '0s' ? 'enabled' : 'disabled'}`, type: 'info' });
      }
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      description: 'Show all available keyboard shortcuts',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01"></path></svg>',
      shortcut: '⌘/',
      section: 'Help',
      keywords: ['shortcuts', 'keys', 'hotkeys', 'help'],
      action: () => showKeyboardShortcuts()
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Open settings panel',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 1 4.6 9a1.65 1.65 0 0 1 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 1-.33 1.82V9a1.65 1.65 0 0 1 1.51-1H9a1.65 1.65 0 0 1 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 1 1 1.51 1.65 1.65 0 0 1 1.82.33l.06.06a2 2 0 0 0 2.83 0 2 2 0 0 0 0-2.83l.06-.06a1.65 1.65 0 0 1-.33-1.82 1.65 1.65 0 0 1 1.51-1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 1-1.51 1z"></path></svg>',
      shortcut: '⌘,',
      section: 'General',
      keywords: ['preferences', 'options', 'config'],
      action: () => window.location.href = 'settings.html'
    },
    {
      id: 'clear-history',
      title: 'Clear History',
      description: 'Clear all conversion history',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
      section: 'Data',
      keywords: ['clear', 'delete', 'history', 'remove'],
      action: () => {
        if (confirm('Clear all conversion history?')) {
          localStorage.removeItem('zyncpdf_history');
          showToast({ message: 'History cleared', type: 'success' });
        }
      }
    },
    {
      id: 'export-data',
      title: 'Export Data',
      description: 'Export all data as JSON',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>',
      section: 'Data',
      keywords: ['export', 'backup', 'download', 'json'],
      action: () => {
        import('../utils/history.js').then(m => {
          const data = m.exportData();
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `zyncpdf-backup-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
          showToast({ message: 'Data exported', type: 'success' });
        });
      }
    }
  ];
  
  palette.register(defaultCommands);
  palette.register(customCommands);
  
  // Register global shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      palette.toggle();
    }
  });
  
  return palette;
}

/**
 * Show keyboard shortcuts modal
 */
function showKeyboardShortcuts() {
  const shortcuts = [
    { keys: '⌘K', action: 'Open Command Palette' },
    { keys: '⌘/', action: 'Show Keyboard Shortcuts' },
    { keys: '⌘⇧T', action: 'Toggle Theme' },
    { keys: '⌘⇧A', action: 'Toggle Animations' },
    { keys: '⌘,', action: 'Open Settings' },
    { keys: 'Escape', action: 'Close Modal / Cancel' },
    { keys: 'Enter', action: 'Confirm / Execute' },
    { keys: 'Tab / ↑↓', action: 'Navigate Options' },
    { keys: 'Ctrl/Cmd + Click', action: 'Open in New Tab' },
    { keys: 'Drag & Drop', action: 'Upload Files' }
  ];
  
  const content = document.createElement('div');
  content.className = 'shortcuts-modal';
  content.innerHTML = `
    <div class="shortcuts-list">
      ${shortcuts.map(s => `
        <div class="shortcut-item">
          <kbd class="shortcut-keys">${s.keys.split(' + ').map(k => `<span>${k}</span>`).join('')}</kbd>
          <span class="shortcut-action">${s.action}</span>
        </div>
      `).join('')}
    </div>
  `;
  
  import('./modal.js').then(m => m.showModal({
    title: 'Keyboard Shortcuts',
    content,
    size: 'md',
    actions: [{ label: 'Close', variant: 'primary', onClick: () => {} }]
  }));
}

// Import showToast for use in actions
import { showToast } from '../utils/ui.js';

export default CommandPalette;