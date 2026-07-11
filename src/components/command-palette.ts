/**
 * ZyncPDF - Command Palette
 * Global command palette with fuzzy search (Ctrl+K)
 */

import { Command, KeyboardShortcut } from '../types/index.js';
import { EventEmitter } from './event-emitter.js';

export class CommandPalette extends EventEmitter {
  private commands: Map<string, Command> = new Map();
  private categories: Map<string, Set<string>> = new Map();
  private isOpen = false;
  private selectedIndex = 0;
  private filteredCommands: Command[] = [];
  private searchQuery = '';
  private container: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private results: HTMLElement | null = null;
  private shortcuts: Map<string, KeyboardShortcut> = new Map();

  constructor(private shortcutManager: any) {
    super();
    this.init();
  }

  private init(): void {
    // Listen for global shortcut to open palette
    this.shortcutManager.on('shortcut:triggered', ({ shortcut }) => {
      if (shortcut.action === 'command-palette' || shortcut.id === 'command-palette') {
        this.toggle();
      }
    });
  }

  /**
   * Register commands
   */
  register(commands: Command[]): void {
    commands.forEach(cmd => {
      this.commands.set(cmd.id, cmd);
      
      // Track categories
      if (!this.categories.has(cmd.category)) {
        this.categories.set(cmd.category, new Set());
      }
      this.categories.get(cmd.category)!.add(cmd.id);
    });
  }

  /**
   * Register a single command
   */
  registerCommand(command: Command): void {
    this.register([command]);
  }

  /**
   * Unregister a command
   */
  unregister(commandId: string): void {
    const cmd = this.commands.get(commandId);
    if (cmd) {
      this.categories.get(cmd.category)?.delete(commandId);
      this.commands.delete(commandId);
    }
  }

  /**
   * Get command by ID
   */
  getCommand(id: string): Command | undefined {
    return this.commands.get(id);
  }

  /**
   * Get all commands
   */
  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands by category
   */
  getByCategory(category: string): Command[] {
    const ids = this.categories.get(category);
    if (!ids) return [];
    return Array.from(ids).map(id => this.commands.get(id)!).filter(Boolean);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categories.keys()).sort();
  }

  /**
   * Mount the command palette to the DOM
   */
  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
    this.bindEvents();
  }

  /**
   * Render the command palette HTML
   */
  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="command-palette-overlay" role="dialog" aria-modal="true" aria-label="Command Palette">
        <div class="command-palette">
          <div class="command-palette-header">
            <svg class="command-palette-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" class="command-palette-input" placeholder="Type a command or search..." autocomplete="off" spellcheck="false" aria-label="Search commands" aria-autocomplete="list" aria-controls="command-palette-results">
            <kbd class="command-palette-shortcut">⌘K</kbd>
          </div>
          <div class="command-palette-results" id="command-palette-results" role="listbox" aria-label="Commands"></div>
          <div class="command-palette-footer">
            <span class="command-palette-hint">↑↓ Navigate • Enter Execute • Esc Close</span>
          </div>
        </div>
      </div>
    `;

    this.input = this.container.querySelector('.command-palette-input') as HTMLInputElement;
    this.results = this.container.querySelector('#command-palette-results') as HTMLElement;
  }

  /**
   * Bind event listeners
   */
  private bindEvents(): void {
    if (!this.container) return;

    // Input events
    this.input?.addEventListener('input', this.handleInput.bind(this));
    this.input?.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.input?.addEventListener('focus', () => this.updateResults());

    // Click outside to close
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.close();
      }
    });

    // Result clicks
    this.results?.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('[data-command-id]');
      if (item) {
        const id = item.getAttribute('data-command-id');
        this.executeCommand(id!);
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', this.handleGlobalKeyDown.bind(this));
  }

  private handleInput(e: Event): void {
    this.searchQuery = (e.target as HTMLInputElement).value;
    this.selectedIndex = 0;
    this.updateResults();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCommands.length - 1);
        this.updateSelection();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.updateSelection();
        break;
      case 'Enter':
        e.preventDefault();
        if (this.filteredCommands[this.selectedIndex]) {
          this.executeCommand(this.filteredCommands[this.selectedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
      case 'Tab':
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
        this.updateSelection();
        break;
    }
  }

  private handleGlobalKeyDown(e: KeyboardEvent): void {
    if (!this.isOpen) return;
    
    // Let the input handle most keys
    if (e.target === this.input) return;
    
    // Close on Escape anywhere
    if (e.key === 'Escape') {
      this.close();
    }
  }

  /**
   * Update filtered results based on search query
   */
  private updateResults(): void {
    const query = this.searchQuery.toLowerCase().trim();
    
    if (!query) {
      // Show recent/frequent commands when empty
      this.filteredCommands = this.getRecentCommands();
    } else {
      this.filteredCommands = this.searchCommands(query);
    }

    this.renderResults();
  }

  /**
   * Search commands with fuzzy matching
   */
  private searchCommands(query: string): Command[] {
    const commands = this.getAll();
    const terms = query.split(/\s+/).filter(Boolean);
    
    return commands
      .map(cmd => {
        let score = 0;
        const searchText = `${cmd.title} ${cmd.description || ''} ${cmd.keywords?.join(' ') || ''} ${cmd.category}`.toLowerCase();
        
        for (const term of terms) {
          if (cmd.title.toLowerCase().startsWith(term)) score += 100;
          else if (cmd.title.toLowerCase().includes(term)) score += 50;
          else if (cmd.description?.toLowerCase().includes(term)) score += 20;
          else if (cmd.keywords?.some(k => k.toLowerCase().includes(term))) score += 30;
          else if (searchText.includes(term)) score += 10;
          else score -= 1000; // Penalize non-matches
        }
        
        return { cmd, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ cmd }) => cmd);
  }

  /**
   * Get recent/frequent commands
   */
  private getRecentCommands(): Command[] {
    // In a real app, this would come from storage
    const recentIds = ['file.open', 'file.save', 'edit.undo', 'view.toggle-sidebar', 'tool.select'];
    return recentIds.map(id => this.commands.get(id)).filter(Boolean) as Command[];
  }

  /**
   * Render filtered results
   */
  private renderResults(): void {
    if (!this.results) return;

    if (this.filteredCommands.length === 0) {
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

    // Group by category
    const byCategory = new Map<string, Command[]>();
    this.filteredCommands.forEach(cmd => {
      if (!byCategory.has(cmd.category)) {
        byCategory.set(cmd.category, []);
      }
      byCategory.get(cmd.category)!.push(cmd);
    });

    this.results.innerHTML = Array.from(byCategory.entries())
      .map(([category, commands]) => `
        <div class="command-palette-section">
          <div class="command-palette-section-title">${category}</div>
          ${commands.map((cmd, idx) => `
            <div class="command-palette-item ${idx === 0 && this.selectedIndex === 0 ? 'selected' : ''}" 
                 data-command-id="${cmd.id}" 
                 role="option" 
                 aria-selected="${idx === 0 && this.selectedIndex === 0}">
              <span class="command-palette-item-title">${this.escapeHtml(cmd.title)}</span>
              ${cmd.description ? `<span class="command-palette-item-description">${this.escapeHtml(cmd.description)}</span>` : ''}
              ${cmd.shortcut ? `<kbd class="command-palette-item-shortcut">${this.formatShortcut(cmd.shortcut)}</kbd>` : ''}
            </div>
          `).join('')}
        </div>
      `).join('');

    this.updateSelection();
  }

  private updateSelection(): void {
    const items = this.results?.querySelectorAll('.command-palette-item');
    items?.forEach((item, idx) => {
      const selected = idx === this.selectedIndex;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-selected', selected.toString());
      
      if (selected) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  /**
   * Execute a command by ID
   */
  private executeCommand(id: string): void {
    const cmd = this.commands.get(id);
    if (cmd) {
      try {
        cmd.action();
        this.close();
        this.emit('command:executed', { command: cmd });
      } catch (error) {
        console.error(`[CommandPalette] Error executing ${id}:`, error);
        this.emit('command:error', { command: cmd, error });
      }
    }
  }

  /**
   * Open the command palette
   */
  open(): void {
    if (this.isOpen) return;
    
    this.isOpen = true;
    this.searchQuery = '';
    this.selectedIndex = 0;
    
    this.container?.classList.add('open');
    this.input?.value = '';
    this.updateResults();
    
    // Focus input after animation
    requestAnimationFrame(() => {
      this.input?.focus();
    });

    this.emit('open');
  }

  /**
   * Close the command palette
   */
  close(): void {
    if (!this.isOpen) return;
    
    this.isOpen = false;
    this.container?.classList.remove('open');
    this.input?.blur();
    this.emit('close');
  }

  /**
   * Toggle the command palette
   */
  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  isOpened(): boolean {
    return this.isOpen;
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  private formatShortcut(shortcut: KeyboardShortcut): string {
    return ShortcutManager.format(shortcut);
  }

  /**
   * Get commands sorted by usage (placeholder)
   */
  private getRecentCommands(): Command[] {
    return this.getAll().slice(0, 8);
  }
}