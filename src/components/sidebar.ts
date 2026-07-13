/**
 * ZyncPDF - Sidebar Component
 * Left sidebar with thumbnails, bookmarks, annotations, search, layers
 */

import { PDFDocument, PDFPage, SidebarTab, Annotation, TextItem } from '../types/index.js';
import { EventEmitter } from '../utils/event-emitter.js';

interface SidebarState {
  activeTab: SidebarTab;
  isOpen: boolean;
  width: number;
}

export class Sidebar extends EventEmitter {
  private container: HTMLElement | null = null;
  private tabsContainer: HTMLElement | null = null;
  private contentContainer: HTMLElement | null = null;
  private resizer: HTMLElement | null = null;
  
  private document: PDFDocument | null = null;
  private state: SidebarState = {
    activeTab: 'thumbnails',
    isOpen: true,
    width: 280,
  };

  private thumbnails: Map<number, HTMLCanvasElement> = new Map();
  private searchResults: TextItem[] = [];
  private searchIndex = 0;

  mount(container: HTMLElement): void {
    this.container = container;
    container.className = 'app-sidebar';
    container.style.width = `${this.state.width}px`;
    
    this.render();
    this.bindEvents();
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="sidebar-tabs" role="tablist" aria-label="Sidebar panels">
        <button 
          role="tab" 
          aria-selected="${this.state.activeTab === 'thumbnails'}" 
          aria-controls="panel-thumbnails"
          id="tab-thumbnails"
          data-tab="thumbnails"
          class="sidebar-tab ${this.state.activeTab === 'thumbnails' ? 'active' : ''}"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
            <line x1="15" y1="3" x2="15" y2="21"></line>
          </svg>
          <span>Thumbnails</span>
          <kbd class="tab-shortcut">Alt+1</kbd>
        </button>
        <button 
          role="tab" 
          aria-selected="${this.state.activeTab === 'bookmarks'}" 
          aria-controls="panel-bookmarks"
          id="tab-bookmarks"
          data-tab="bookmarks"
          class="sidebar-tab ${this.state.activeTab === 'bookmarks' ? 'active' : ''}"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Bookmarks</span>
          <kbd class="tab-shortcut">Alt+2</kbd>
        </button>
        <button 
          role="tab" 
          aria-selected="${this.state.activeTab === 'annotations'}" 
          aria-controls="panel-annotations"
          id="tab-annotations"
          data-tab="annotations"
          class="sidebar-tab ${this.state.activeTab === 'annotations' ? 'active' : ''}"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M11 4a2 2 0 1 1 4 0v1.12a8 8 0 0 1 0 13.76"></path>
          </svg>
          <span>Annotations</span>
          <kbd class="tab-shortcut">Alt+3</kbd>
        </button>
        <button 
          role="tab" 
          aria-selected="${this.state.activeTab === 'search'}" 
          aria-controls="panel-search"
          id="tab-search"
          data-tab="search"
          class="sidebar-tab ${this.state.activeTab === 'search' ? 'active' : ''}"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>Search</span>
          <kbd class="tab-shortcut">Alt+4</kbd>
        </button>
        <button 
          role="tab" 
          aria-selected="${this.state.activeTab === 'layers'}" 
          aria-controls="panel-layers"
          id="tab-layers"
          data-tab="layers"
          class="sidebar-tab ${this.state.activeTab === 'layers' ? 'active' : ''}"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          <span>Layers</span>
          <kbd class="tab-shortcut">Alt+5</kbd>
        </button>
      </div>
      
      <div class="sidebar-content" id="sidebar-content">
        ${this.renderPanel(this.state.activeTab)}
      </div>
    `;

    this.tabsContainer = this.container!.querySelector('.sidebar-tabs')!;
    this.contentContainer = this.container!.querySelector('#sidebar-content')!;
  }

  private renderPanel(tab: SidebarTab): string {
    switch (tab) {
      case 'thumbnails':
        return this.renderThumbnailsPanel();
      case 'bookmarks':
        return this.renderBookmarksPanel();
      case 'annotations':
        return this.renderAnnotationsPanel();
      case 'search':
        return this.renderSearchPanel();
      case 'layers':
        return this.renderLayersPanel();
      default:
        return '<div class="panel-empty">Select a panel</div>';
    }
  }

  private renderThumbnailsPanel(): string {
    if (!this.document || this.document.pages.length === 0) {
      return `
        <div class="panel thumbnails-panel" id="panel-thumbnails" role="tabpanel" aria-labelledby="tab-thumbnails">
          <div class="panel-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <line x1="15" y1="3" x2="15" y2="21"></line>
            </svg>
            <p>No document open</p>
            <small>Open a PDF to see page thumbnails</small>
          </div>
        </div>
      `;
    }

    const thumbnails = this.document.pages.map((page, i) => `
      <button 
        class="thumbnail ${i === this.getCurrentPageIndex() ? 'active' : ''}"
        data-page="${i + 1}"
        aria-label="Page ${i + 1}"
        ${this.thumbnails.has(i) ? '' : 'data-loading="true"'}
        style="--thumb-width: ${120}px; --thumb-height: ${120 * (page.height / page.width)}px;"
      >
        <div class="thumbnail-image">
          ${this.thumbnails.has(i) 
            ? `<canvas class="thumbnail-canvas" data-page="${i + 1}"></canvas>`
            : '<div class="thumbnail-placeholder"></div>'
          }
        </div>
        <div class="thumbnail-label">
          <span class="page-number">${i + 1}</span>
          <span class="page-dimensions">${Math.round(page.width)}×${Math.round(page.height)}</span>
        </div>
        <div class="thumbnail-actions">
          <button class="thumbnail-action" data-action="rotate-left" aria-label="Rotate left" title="Rotate left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
          </button>
          <button class="thumbnail-action" data-action="rotate-right" aria-label="Rotate right" title="Rotate right">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.49 9a9 9 0 1 1-2.12 9.36L23 14"></path></svg>
          </button>
          <button class="thumbnail-action" data-action="delete" aria-label="Delete page" title="Delete page">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
          <button class="thumbnail-action" data-action="extract" aria-label="Extract page" title="Extract page">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          </button>
        </div>
      </button>
    `).join('');

    return `
      <div class="panel thumbnails-panel" id="panel-thumbnails" role="tabpanel" aria-labelledby="tab-thumbnails">
        <div class="panel-header">
          <h3>Pages (${this.document?.pages.length || 0})</h3>
          <div class="panel-actions">
            <button class="panel-action" data-action="insert-page" aria-label="Insert blank page" title="Insert blank page">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></path><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            <span>Insert</span>
            <kbd>Ctrl+Shift+N</kbd>
          </button>
          <button class="panel-action" data-action="select-all" aria-label="Select all pages">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
          </button>
          <button class="panel-action" data-action="deselect-all" aria-label="Deselect all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      <div class="thumbnails-grid" id="thumbnails-grid" role="list" aria-label="Page thumbnails">
        ${thumbnails}
      </div>
    </div>
  `;
  }

  private renderBookmarksPanel(): string {
    return `
      <div class="panel bookmarks-panel" id="panel-bookmarks" role="tabpanel" aria-labelledby="tab-bookmarks">
        <div class="panel-header">
          <h3>Bookmarks</h3>
          <button class="panel-action" data-action="add-bookmark" aria-label="Add bookmark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          </button>
        </div>
        <div class="bookmarks-tree" id="bookmarks-tree" role="tree" aria-label="Document bookmarks">
          <div class="panel-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
            <p>No bookmarks</p>
            <small>Bookmarks will appear here if the PDF contains them</small>
          </div>
        </div>
      </div>
    </div>
  `;
  }

  private renderAnnotationsPanel(): string {
    return `
      <div class="panel annotations-panel" id="panel-annotations" role="tabpanel" aria-labelledby="tab-annotations">
        <div class="panel-header">
          <h3>Annotations</h3>
          <div class="panel-filters">
            <select id="annotation-filter" aria-label="Filter annotations">
              <option value="all">All</option>
              <option value="highlight">Highlights</option>
              <option value="note">Notes</option>
              <option value="shape">Shapes</option>
              <option value="text">Text</option>
            </select>
          </div>
        </div>
        <div class="annotations-list" id="annotations-list" role="list" aria-label="Document annotations">
          <div class="panel-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M11 4a2 2 0 1 1 4 0v1.12a8 8 0 0 1 0 13.76"></path>
            </svg>
            <p>No annotations</p>
            <small>Add highlights, notes, or shapes to see them here</small>
          </div>
        </div>
      </div>
    </div>
  `;
  }

  private renderSearchPanel(): string {
    return `
      <div class="panel search-panel" id="panel-search" role="tabpanel" aria-labelledby="tab-search">
        <div class="panel-header">
          <h3>Search</h3>
        </div>
        <div class="search-input-wrapper">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            id="search-input" 
            class="search-input" 
            placeholder="Search in document..."
            aria-label="Search text in document"
            autocomplete="off"
            spellcheck="false"
          >
          <button class="search-clear" aria-label="Clear search" hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="search-options">
          <label class="search-option"><input type="checkbox" id="search-case-sensitive"> Match case</label>
          <label class="search-option"><input type="checkbox" id="search-whole-word"> Whole word</label>
        </div>
        <div class="search-results" id="search-results" role="list" aria-label="Search results">
          <div class="search-stats" id="search-stats" hidden>
            <span id="search-count">0</span> results
            <div class="search-nav">
              <button class="search-nav-btn" data-action="prev" aria-label="Previous result"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
              <span class="search-current">0</span> / <span class="search-total">0</span>
              <button class="search-nav-btn" data-action="next" aria-label="Next result"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
            </div>
          </div>
          <div class="results-list" id="results-list"></div>
        </div>
      </div>
    </div>
  `;
  }

  private renderLayersPanel(): string {
    return `
      <div class="panel layers-panel" id="panel-layers" role="tabpanel" aria-labelledby="tab-layers">
        <div class="panel-header">
          <h3>Layers</h3>
          <button class="panel-action" data-action="add-layer" aria-label="Add layer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
        <div class="layers-tree" id="layers-tree" role="tree" aria-label="Document layers">
          <div class="layer-group" data-group="page-content">
            <div class="layer-group-header" aria-expanded="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 9 12 15 12 15 6"></polyline></svg>
              <span>Page Content</span>
              <div class="layer-group-actions">
                <button class="layer-action" data-action="toggle-visibility" aria-label="Toggle visibility"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
                <button class="layer-action" data-action="lock" aria-label="Lock"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></button>
              </div>
            </div>
            <div class="layer-items">
              <div class="layer-item" data-layer="pdf-content">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                <span>PDF Content</span>
                <div class="layer-actions">
                  <button class="layer-action" data-action="lock" aria-label="Lock"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></button>
                </div>
              </div>
            </div>
          </div>
          <div class="layer-group" data-group="annotations">
            <div class="layer-group-header" aria-expanded="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 9 12 15 12 15 6"></polyline></svg>
              <span>Annotations</span>
              <div class="layer-group-actions">
                <button class="layer-action" data-action="toggle-visibility" aria-label="Toggle visibility"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
                <button class="layer-action" data-action="add-annotation-layer" aria-label="Add annotation layer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
              </div>
            </div>
            <div class="layer-items" id="annotation-layers"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  }

  private bindEvents(): void {
    if (!this.container) return;

    // Tab switching
    this.container.addEventListener('click', (e) => {
      const tab = (e.target as HTMLElement).closest('[data-tab]');
      if (tab) {
        this.setActiveTab(tab.getAttribute('data-tab') as SidebarTab);
      }
    });

    // Keyboard navigation for tabs
    this.container.addEventListener('keydown', (e) => {
      if (e.altKey && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const tabs: SidebarTab[] = ['thumbnails', 'bookmarks', 'annotations', 'search', 'layers'];
        this.setActiveTab(tabs[parseInt(e.key) - 1]);
      }
    });

    // Thumbnail clicks
    this.container?.addEventListener('click', (e) => {
      const thumb = (e.target as HTMLElement).closest('.thumbnail[data-page]');
      if (thumb && !thumb.querySelector('.thumbnail-action')) {
        const page = parseInt(thumb.getAttribute('data-page')!);
        this.emit('page:select', page);
      }
    });

    // Thumbnail actions
    this.container?.addEventListener('click', (e) => {
      const actionBtn = (e.target as HTMLElement).closest('.thumbnail-action[data-action]');
      if (actionBtn) {
        e.stopPropagation();
        const thumb = actionBtn.closest('.thumbnail');
        const page = parseInt(thumb?.getAttribute('data-page')!);
        const action = actionBtn.getAttribute('data-action');
        this.emit(`thumbnail:${action}`, { page, action });
      }
    });

    // Search input
    const searchInput = this.container?.querySelector('#search-input');
    if (searchInput) {
      (searchInput as HTMLInputElement).addEventListener('input', this.debounce(() => {
        this.performSearch();
      }, 300));

      (searchInput as HTMLInputElement).addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) this.findPrevious();
          else this.findNext();
        } else if (e.key === 'Escape') {
          this.clearSearch();
        }
      });
    }

    // Search clear
    const clearBtn = this.container?.querySelector('.search-clear');
    clearBtn?.addEventListener('click', () => this.clearSearch());

    // Search navigation
    this.container?.addEventListener('click', (e) => {
      const navBtn = (e.target as HTMLElement).closest('.search-nav-btn[data-action]');
      if (navBtn) {
        const action = navBtn.getAttribute('data-action');
        if (action === 'prev') this.findPrevious();
        else if (action === 'next') this.findNext();
      }
    });

    // Panel actions
    this.container?.addEventListener('click', (e) => {
      const actionBtn = (e.target as HTMLElement).closest('.panel-action[data-action]');
      if (actionBtn) {
        const action = actionBtn.getAttribute('data-action');
        this.emit(`panel:${action}`);
      }
    });

    // Drag and drop for thumbnails
    this.setupDragDrop();
  }

  private debounce(fn: Function, delay: number): Function {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  private setupDragDrop(): void {
    const grid = this.container?.querySelector('#thumbnails-grid');
    if (!grid) return;

    let draggedItem: HTMLElement | null = null;

    grid.addEventListener('dragstart', (e) => {
      const target = (e.target as HTMLElement).closest('.thumbnail');
      if (target) {
        draggedItem = target;
        target.classList.add('dragging');
        (e as DragEvent).dataTransfer!.effectAllowed = 'move';
      }
    });

    grid.addEventListener('dragend', (e) => {
      if (draggedItem) {
        draggedItem.classList.remove('dragging');
        draggedItem = null;
      }
    });

    grid.addEventListener('dragover', (e) => {
      e.preventDefault();
      const target = (e.target as HTMLElement).closest('.thumbnail');
      if (target && target !== draggedItem) {
        const rect = target.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if ((e as DragEvent).clientY < midY) {
          target.style.borderTop = '2px solid var(--accent-primary)';
          target.style.borderBottom = '';
        } else {
          target.style.borderBottom = '2px solid var(--accent-primary)';
          target.style.borderTop = '';
        }
      }
    });

    grid.addEventListener('dragleave', (e) => {
      const target = (e.target as HTMLElement).closest('.thumbnail');
      if (target && !target.contains((e as DragEvent).relatedTarget as Node)) {
        target.style.borderTop = '';
        target.style.borderBottom = '';
      }
    });

    grid.addEventListener('drop', (e) => {
      e.preventDefault();
      const target = (e.target as HTMLElement).closest('.thumbnail');
      if (target && draggedItem) {
        const fromPage = parseInt(draggedItem.getAttribute('data-page')!);
        const toPage = parseInt(target.getAttribute('data-page')!);
        const rect = target.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertBefore = (e as DragEvent).clientY < midY;
        
        this.emit('pages:reorder', { fromPage, toPage, insertBefore });
      }
      
      // Clean up
      if (draggedItem) {
        draggedItem.classList.remove('dragging');
        draggedItem = null;
      }
      
      grid.querySelectorAll('.thumbnail').forEach(t => {
        t.style.borderTop = '';
        t.style.borderBottom = '';
      });
    });
  }

  setDocument(doc: PDFDocument | null): void {
    this.document = doc;
    this.thumbnails.clear();
    
    if (doc) {
      this.renderThumbnails();
    } else {
      this.render();
    }
  }

  private renderThumbnails(): void {
    if (!this.document) return;
    this.render();
  }

  setActiveTab(tab: SidebarTab): void {
    if (this.state.activeTab === tab) return;
    
    this.state.activeTab = tab;
    
    // Update tab buttons
    this.container?.querySelectorAll('.sidebar-tab').forEach(btn => {
      const isActive = btn.getAttribute('data-tab') === tab;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive.toString());
    });

    // Update panels
    this.container?.querySelectorAll('[role="tabpanel"]').forEach(panel => {
      const isActive = panel.id === `panel-${tab}`;
      panel.hidden = !isActive;
      if (isActive) panel.removeAttribute('hidden');
    });

    this.state.activeTab = tab;
    this.emit('tab:change', tab);
  }

  getActiveTab(): SidebarTab {
    return this.state.activeTab;
  }

  getCurrentPageIndex(): number {
    // This would come from the document manager
    return 0;
  }

  getCurrentPage(): number {
    return this.getCurrentPageIndex() + 1;
  }

  setActivePage(page: number): void {
    const thumbnails = this.container?.querySelectorAll('.thumbnail');
    thumbnails?.forEach((thumb, i) => {
      thumb.classList.toggle('active', i + 1 === page);
    });
  }

  private performSearch(): void {
    const input = this.container?.querySelector('#search-input') as HTMLInputElement;
    const query = input?.value.trim().toLowerCase();
    
    const clearBtn = this.container?.querySelector('.search-clear');
    if (clearBtn) (clearBtn as HTMLElement).hidden = !query;

    if (!query || !this.document) {
      this.clearSearchResults();
      return;
    }

    this.searchResults = [];
    this.searchIndex = 0;

    this.document.pages.forEach((page, i) => {
      page.textItems.forEach(item => {
        if (item.str.toLowerCase().includes(query)) {
          this.searchResults.push({
            ...item,
            pageNumber: i + 1,
            context: this.getContext(page, item.str),
          });
        }
      });
    });

    this.renderSearchResults();
  }

  private getContext(page: PDFPage, searchText: string): string {
    const fullText = page.textItems.map(t => t.str).join(' ');
    const index = fullText.toLowerCase().indexOf(searchText.toLowerCase());
    if (index === -1) return '';
    const start = Math.max(0, index - 50);
    const end = Math.min(fullText.length, index + searchText.length + 50);
    return '...' + fullText.slice(start, end) + '...';
  }

  private renderSearchResults(): void {
    const resultsList = this.container?.querySelector('#results-list');
    const stats = this.container?.querySelector('#search-stats');
    const count = this.container?.querySelector('#search-count');
    const current = this.container?.querySelector('.search-current');
    const total = this.container?.querySelector('.search-total');

    if (!resultsList) return;

    if (this.searchResults.length === 0) {
      resultsList.innerHTML = '<div class="search-no-results">No matches found</div>';
      if (stats) stats.hidden = true;
      return;
    }

    if (stats) stats.hidden = false;
    if (count) count.textContent = this.searchResults.length.toString();
    if (total) total.textContent = this.searchResults.length.toString();
    if (current) current.textContent = (this.searchIndex + 1).toString();

    resultsList.innerHTML = this.searchResults.map((result, i) => `
      <div class="search-result ${i === this.searchIndex ? 'current' : ''}" data-index="${i}" data-page="${result.pageNumber}">
        <div class="search-result-page">Page ${result.pageNumber}</div>
        <div class="search-result-context">${this.escapeHtml(result.context)}</div>
      </div>
    `).join('');

    // Bind click events
    resultsList.querySelectorAll('.search-result').forEach(el => {
      el.addEventListener('click', () => {
        const index = parseInt(el.getAttribute('data-index')!);
        const page = parseInt(el.getAttribute('data-page')!);
        this.searchIndex = index;
        this.renderSearchResults();
        this.emit('search:select', { page, result: this.searchResults[index] });
      });
    });
  }

  private findNext(): void {
    if (this.searchResults.length === 0) return;
    this.searchIndex = (this.searchIndex + 1) % this.searchResults.length;
    this.renderSearchResults();
    this.emit('search:navigate', this.searchResults[this.searchIndex]);
  }

  private findPrevious(): void {
    if (this.searchResults.length === 0) return;
    this.searchIndex = (this.searchIndex - 1 + this.searchResults.length) % this.searchResults.length;
    this.renderSearchResults();
    this.emit('search:navigate', this.searchResults[this.searchIndex]);
  }

  private clearSearch(): void {
    const input = this.container?.querySelector('#search-input') as HTMLInputElement;
    if (input) input.value = '';
    
    const clearBtn = this.container?.querySelector('.search-clear');
    if (clearBtn) (clearBtn as HTMLElement).hidden = true;

    this.clearSearchResults();
  }

  private clearSearchResults(): void {
    this.searchResults = [];
    this.searchIndex = 0;
    const resultsList = this.container?.querySelector('#results-list');
    const stats = this.container?.querySelector('#search-stats');
    if (resultsList) resultsList.innerHTML = '';
    if (stats) (stats as HTMLElement).hidden = true;
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  showSearch(): void {
    this.state.activeTab = 'search';
    this.render();
  }

  toggle(): void {
    if (this.container) {
      this.container.hidden = !this.container.hidden;
    }
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }
}
