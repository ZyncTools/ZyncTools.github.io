/**
 * ZyncPDF - Tab Bar Component
 * Multi-document tab management with drag reorder, pinning, and overflow
 */

import { DocumentTab, PDFDocument } from '../types/index.js';
import { EventEmitter } from '../utils/event-emitter.js';

export class TabBar extends EventEmitter {
  private container: HTMLElement | null = null;
  private tabs: Map<string, DocumentTab> = new Map();
  private activeTabId: string | null = null;
  private scrollPosition = 0;
  private maxVisibleTabs = 0;

  mount(container: HTMLElement): void {
    this.container = container;
    container.className = 'app-tab-bar';
    container.setAttribute('role', 'tablist');
    container.setAttribute('aria-label', 'Document tabs');
    this.render();
    this.bindEvents();
  }

  private render(): void {
    if (!this.container) return;

    const tabsArray = Array.from(this.tabs.values());
    const visibleTabs = this.getVisibleTabs(tabsArray);
    
    this.container.innerHTML = `
      <div class="tab-bar-scroll" id="tab-scroll">
        <button class="tab-scroll-btn tab-scroll-left" id="tab-scroll-left" aria-label="Scroll tabs left" hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div class="tab-bar-container" id="tab-container" role="tablist">
          ${visibleTabs.map(tab => this.renderTab(tab)).join('')}
        </div>
        <button class="tab-scroll-btn tab-scroll-right" id="tab-scroll-right" aria-label="Scroll tabs right" hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
      <button class="tab-new-btn" id="tab-new" aria-label="New tab" title="New tab (⌘T)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
      <div class="tab-dropdown" id="tab-dropdown" hidden>
        <button class="tab-dropdown-btn" id="tab-dropdown-btn" aria-label="More tabs" aria-haspopup="true" aria-expanded="false">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
            <circle cx="5" cy="12" r="1"></circle>
          </svg>
        </button>
        <div class="tab-dropdown-menu" id="tab-dropdown-menu" role="menu"></div>
      </div>
    `;
  }

  private bindEvents(): void {
    if (!this.container) return;

    // Tab clicks
    this.container.addEventListener('click', (e) => {
      const tab = (e.target as HTMLElement).closest('[data-tab-id]');
      if (tab && !tab.querySelector('.tab-close')) {
        this.activateTab(tab.getAttribute('data-tab-id')!);
      }
    });

    // Close buttons
    this.container.addEventListener('click', (e) => {
      const closeBtn = (e.target as HTMLElement).closest('.tab-close');
      if (closeBtn) {
        e.stopPropagation();
        const tabId = closeBtn.getAttribute('data-tab-id');
        this.closeTab(closeBtn.getAttribute('data-tab-id')!);
      }
    });

    // Middle click to close
    this.container.addEventListener('auxclick', (e) => {
      if (e.button === 1) {
        const tab = (e.target as HTMLElement).closest('[data-tab-id]');
        if (tab) {
          e.preventDefault();
          this.closeTab(tab.getAttribute('data-tab-id')!);
        }
      }
    });

    // Double click to rename
    this.container.addEventListener('dblclick', (e) => {
      const label = (e.target as HTMLElement).closest('.tab-label');
      if (label) {
        const tab = label.closest('[data-tab-id]');
        if (tab) this.renameTab(tab.getAttribute('data-tab-id')!);
      }
    });

    // Scroll buttons
    const scrollLeft = this.container.querySelector('#tab-scroll-left') as HTMLButtonElement;
    const scrollRight = this.container.querySelector('#tab-scroll-right') as HTMLButtonElement;
    const container = this.container.querySelector('#tab-container') as HTMLElement;

    scrollLeft?.addEventListener('click', () => this.scrollLeft());
    scrollRight?.addEventListener('click', () => this.scrollRight());

    // Scroll with wheel
    container?.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        this.container!.querySelector('#tab-container')!.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    // Drag and drop reordering
    this.setupDragDrop();

    // New tab button
    this.container.querySelector('#tab-new')?.addEventListener('click', () => {
      this.emit('tab:new');
    });

    // Dropdown
    this.setupDropdown();

    // Keyboard navigation
    this.container.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });

    // Window resize
    window.addEventListener('resize', () => this.updateScrollButtons());
  }

  private setupDragDrop(): void {
    if (!this.container) return;

    const container = this.container.querySelector('#tab-container')!;
    let draggedTab: HTMLElement | null = null;

    container.addEventListener('dragstart', (e) => {
      const tab = (e.target as HTMLElement).closest('[data-tab-id]');
      if (tab) {
        draggedTab = tab;
        tab.classList.add('dragging');
        (e as DragEvent).dataTransfer!.effectAllowed = 'move';
        (e as DragEvent).dataTransfer!.setData('text/plain', tab.getAttribute('data-tab-id')!);
      }
    });

    container.addEventListener('dragend', () => {
      if (draggedTab) {
        draggedTab.classList.remove('dragging');
        draggedTab = null;
      }
    });

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      const tab = (e.target as HTMLElement).closest('[data-tab-id]');
      if (tab && tab !== draggedTab) {
        const rect = tab.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        tab.style.borderLeft = (e.clientX < rect.left + rect.width / 2) ? '2px solid var(--accent-primary)' : '';
        tab.style.borderRight = (e.clientX >= rect.left + rect.width / 2) ? '2px solid var(--accent-primary)' : '';
      }
    });

    container.addEventListener('dragleave', (e) => {
      const tab = (e.target as HTMLElement).closest('[data-tab-id]');
      if (tab && !tab.contains((e as DragEvent).relatedTarget as Node)) {
        tab.style.borderLeft = '';
        tab.style.borderRight = '';
      }
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetTab = (e.target as HTMLElement).closest('[data-tab-id]');
      if (targetTab && draggedTab && targetTab !== draggedTab) {
        const fromId = draggedTab.getAttribute('data-tab-id')!;
        const toId = targetTab.getAttribute('data-tab-id')!;
        const rect = targetTab.getBoundingClientRect();
        const insertBefore = e.clientX < rect.left + rect.width / 2;
        
        this.emit('tabs:reorder', { fromId, toId, insertBefore });
      }
      
      // Clean up
      container.querySelectorAll('[data-tab-id]').forEach(tab => {
        tab.style.borderLeft = '';
        tab.style.borderRight = '';
      });
      draggedTab = null;
    });
  }

  private setupDropdown(): void {
    const dropdown = this.container?.querySelector('#tab-dropdown') as HTMLElement;
    const btn = this.container?.querySelector('#tab-dropdown-btn') as HTMLButtonElement;
    const menu = this.container?.querySelector('#tab-dropdown-menu') as HTMLElement;

    if (!dropdown || !btn || !menu) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen.toString());
      if (isOpen) this.renderDropdownMenu();
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target as Node)) {
        dropdown.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  private renderDropdownMenu(): void {
    const menu = this.container?.querySelector('#tab-dropdown-menu');
    if (!menu) return;

    const hiddenTabs = Array.from(this.tabs.values())
      .filter(t => !this.isTabVisible(t.id))
      .slice(0, 20);

    menu.innerHTML = hiddenTabs.map(tab => `
      <div class="dropdown-item" role="menuitem" data-tab-id="${tab.id}" tabindex="-1">
        ${tab.icon ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${this.getIcon(tab.icon || 'file')}</svg>` : ''}
        <span class="dropdown-label">${this.escapeHtml(tab.title)}</span>
        ${tab.isModified ? '<span class="dropdown-modified">●</span>' : ''}
        ${tab.isPinned ? '<span class="dropdown-pinned">📌</span>' : ''}
      </div>
    `).join('');

    menu.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        this.activateTab(item.getAttribute('data-tab-id')!);
        this.container?.querySelector('#tab-dropdown')?.classList.remove('open');
      });
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const tabs = Array.from(this.tabs.values());
    const activeIndex = tabs.findIndex(t => t.id === this.activeTabId);
    
    switch (e.key) {
      case 'ArrowRight':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.activateTab(tabs[(activeIndex + 1) % tabs.length]?.id);
        }
        break;
      case 'ArrowLeft':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.activateTab(tabs[(activeIndex - 1 + tabs.length) % tabs.length]?.id);
        }
        break;
      case 'w':
        if (e.ctrlKey || e.metaKey) {
          if (e.shiftKey) {
            e.preventDefault();
            this.closeAllTabs();
          } else {
            e.preventDefault();
            this.closeActiveTab();
          }
        }
        break;
      case 't':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.emit('tab:new');
        }
        break;
    }
  }

  // Public API
  addTab(tab: DocumentTab): void {
    this.tabs.set(tab.id, tab);
    this.updateMaxVisible();
    this.render();
    this.updateScrollButtons();
    
    if (this.tabs.size === 1) {
      this.activateTab(tab.id);
    }
  }

  removeTab(id: string): void {
    const wasActive = this.activeTabId === id;
    this.tabs.delete(id);
    this.render();
    
    if (wasActive) {
      const nextTab = this.tabs.values().next().value;
      if (nextTab) this.activateTab(nextTab.id);
      else this.activeTabId = null;
    }
  }

  activateTab(id: string): void {
    if (!this.tabs.has(id)) return;
    
    this.activeTabId = id;
    this.tabs.forEach(tab => {
      tab.isActive = tab.id === id;
    });
    this.render();
    this.ensureTabVisible(id);
    this.emit('tab:activate', id);
  }

  closeTab(id: string): void {
    const tab = this.tabs.get(id);
    if (tab?.isPinned) return; // Don't close pinned tabs via middle click
    
    this.removeTab(id);
    this.emit('tab:close', id);
  }

  closeActiveTab(): void {
    if (this.activeTabId) this.closeTab(this.activeTabId);
  }

  closeAllTabs(): void {
    const ids = Array.from(this.tabs.keys());
    ids.forEach(id => this.closeTab(id));
  }

  closeOtherTabs(id: string): void {
    const ids = Array.from(this.tabs.keys()).filter(t => t !== id);
    ids.forEach(tid => this.closeTab(tid));
  }

  closeTabsToRight(id: string): void {
    const tabsArray = Array.from(this.tabs.values());
    const index = tabsArray.findIndex(t => t.id === id);
    if (index >= 0) {
      tabsArray.slice(index + 1).forEach(t => this.closeTab(t.id));
    }
  }

  setTabModified(id: string, modified: boolean): void {
    const tab = this.tabs.get(id);
    if (tab) {
      tab.isModified = modified;
      this.renderTab(id);
    }
  }

  setTabPinned(id: string, pinned: boolean): void {
    const tab = this.tabs.get(id);
    if (tab) {
      tab.isPinned = pinned;
      this.render();
    }
  }

  setTabIcon(id: string, icon: string): void {
    const tab = this.tabs.get(id);
    if (tab) {
      tab.icon = icon;
      this.renderTab(id);
    }
  }

  setTabTitle(id: string, title: string): void {
    const tab = this.tabs.get(id);
    if (tab) {
      tab.title = title;
      this.renderTab(id);
    }
  }

  getActiveTab(): DocumentTab | null {
    return this.activeTabId ? this.tabs.get(this.activeTabId) || null : null;
  }

  getTabs(): DocumentTab[] {
    return Array.from(this.tabs.values());
  }

  // Private methods
  private renderTab(id: string): void {
    const tab = this.tabs.get(id);
    if (!tab) return;

    const existing = this.container?.querySelector(`[data-tab-id="${id}"]`);
    if (existing) {
      existing.replaceWith(this.createTabElement(tab));
    }
  }

  private getVisibleTabs(tabs: DocumentTab[]): DocumentTab[] {
    // Show pinned tabs first, then recent
    const pinned = tabs.filter(t => t.isPinned);
    const unpinned = tabs.filter(t => !t.isPinned);
    
    const maxVisible = this.maxVisibleTabs || 8;
    const visiblePinned = pinned.slice(0, Math.min(pinned.length, maxVisible));
    const remaining = maxVisible - visiblePinned.length;
    const visibleUnpinned = unpinned.slice(-remaining);
    
    return [...visiblePinned, ...visibleUnpinned];
  }

  private isTabVisible(id: string): boolean {
    const visible = this.getVisibleTabs(Array.from(this.tabs.values()));
    return visible.some(t => t.id === id);
  }

  private ensureTabVisible(id: string): void {
    const tabEl = this.container?.querySelector(`[data-tab-id="${id}"]`);
    const container = this.container?.querySelector('#tab-container');
    
    if (tabEl && container) {
      const tabRect = tabEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      if (tabRect.left < containerRect.left) {
        container.scrollLeft += tabRect.left - containerRect.left - 8;
      } else if (tabRect.right > containerRect.right) {
        container.scrollLeft += tabRect.right - containerRect.right + 8;
      }
    }
  }

  private updateMaxVisible(): void {
    if (!this.container) return;
    
    const scrollContainer = this.container.querySelector('.tab-bar-scroll');
    const newTabBtn = this.container?.querySelector('.tab-new-btn');
    const dropdown = this.container?.querySelector('.tab-dropdown');
    
    if (!scrollContainer || !newTabBtn || !dropdown) return;

    const availableWidth = scrollContainer.clientWidth - newTabBtn.offsetWidth - dropdown.offsetWidth - 32;
    const avgTabWidth = 160; // Average tab width
    this.maxVisibleTabs = Math.max(1, Math.floor(availableWidth / avgTabWidth));
  }

  private updateScrollButtons(): void {
    const scrollLeft = this.container?.querySelector('#tab-scroll-left') as HTMLButtonElement;
    const scrollRight = this.container?.querySelector('#tab-scroll-right') as HTMLButtonElement;
    const container = this.container?.querySelector('#tab-container') as HTMLElement;

    if (!scrollLeft || !scrollRight || !container) return;

    scrollLeft.hidden = container.scrollLeft <= 0;
    scrollRight.hidden = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1;
  }

  private scrollLeft(): void {
    const container = this.container?.querySelector('#tab-container') as HTMLElement;
    if (container) {
      container.scrollBy({ left: -200, behavior: 'smooth' });
    }
  }

  private scrollRight(): void {
    const container = this.container?.querySelector('#tab-container') as HTMLElement;
    if (container) {
      container.scrollBy({ left: 200, behavior: 'smooth' });
    }
  }

  private getIcon(name: string): string {
    const icons: Record<string, string> = {
      file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline>',
      pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline>',
    };
    return icons['file'] || '';
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  initialize(): Promise<void> {
    this.updateMaxVisible();
    return Promise.resolve();
  }
}