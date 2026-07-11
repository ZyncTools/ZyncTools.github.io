/**
 * ZyncPDF - Core Application
 * Main entry point and application controller
 */

import { AppSettings, Theme, PDFDocument, ToolMode, EventType, AppEvent, KeyboardShortcut } from '../types/index.js';
import { EventEmitter } from '../utils/event-emitter.js';
import { StorageManager } from '../storage/storage-manager.js';
import { ThemeManager } from '../utils/theme-manager.js';
import { ShortcutManager } from '../utils/shortcut-manager.js';
import { CommandPalette } from '../components/command-palette.js';
import { ToastManager } from '../components/toast-manager.js';
import { ModalManager } from '../components/modal-manager.js';
import { Toolbar } from '../components/toolbar.js';
import { Sidebar } from '../components/sidebar.js';
import { Panel } from '../components/panel.js';
import { TabBar } from '../components/tab-bar.js';
import { StatusBar } from '../components/status-bar.js';
import { DocumentManager } from '../core/document-manager.js';
import { AnnotationManager } from '../core/annotation-manager.js';
import { HistoryManager } from '../core/history-manager.js';
import { WorkspaceManager } from '../core/workspace-manager.js';
import { PDFWorker } from '../workers/pdf-worker.js';

export class ZyncPDFApp extends EventEmitter {
  private static instance: ZyncPDFApp | null = null;
  
  // Core managers
  public readonly storage: StorageManager;
  public readonly theme: ThemeManager;
  public readonly shortcuts: ShortcutManager;
  public readonly commands: CommandPalette;
  public readonly toasts: ToastManager;
  public readonly modals: ModalManager;
  public readonly documents: DocumentManager;
  public readonly annotations: AnnotationManager;
  public readonly history: HistoryManager;
  public readonly workspace: WorkspaceManager;
  public readonly pdfWorker: PDFWorker;

  // UI Components
  public readonly toolbar: Toolbar;
  public readonly sidebar: Sidebar;
  public readonly panel: Panel;
  public readonly tabBar: TabBar;
  public readonly statusBar: StatusBar;

  // State
  private settings: AppSettings;
  private isInitialized = false;
  private mountPoint: HTMLElement | null = null;

  private constructor() {
    super();
    
    // Initialize core managers
    this.storage = new StorageManager();
    this.theme = new ThemeManager(this.storage);
    this.shortcuts = new ShortcutManager();
    this.commands = new CommandPalette(this.shortcuts);
    this.toasts = new ToastManager();
    this.modals = new ModalManager();
    this.documents = new DocumentManager(this);
    this.annotations = new AnnotationManager(this);
    this.history = new HistoryManager(this);
    this.workspace = new WorkspaceManager(this);
    this.pdfWorker = new PDFWorker();

    // Initialize UI components
    this.toolbar = new Toolbar(this);
    this.sidebar = new Sidebar(this);
    this.panel = new Panel(this);
    this.tabBar = new TabBar(this);
    this.statusBar = new StatusBar(this);

    // Load settings
    this.settings = this.loadSettings();
  }

  public static getInstance(): ZyncPDFApp {
    if (!ZyncPDFApp.instance) {
      ZyncPDFApp.instance = new ZyncPDFApp();
    }
    return ZyncPDFApp.instance;
  }

  /**
   * Initialize the application
   */
  public async initialize(mountPoint: HTMLElement): Promise<void> {
    if (this.isInitialized) return;
    this.mountPoint = mountPoint;

    try {
      // Apply theme
      this.theme.apply(this.settings.theme);

      // Load workspace
      await this.workspace.load();

      // Register global shortcuts
      this.registerGlobalShortcuts();

      // Register core commands
      this.registerCoreCommands();

      // Render UI
      this.render();

      // Initialize components
      await this.initializeComponents();

      // Set up event listeners
      this.setupEventListeners();

      // Handle file drops
      this.setupFileDrop();

      // Check for files in URL hash
      this.handleDeepLink();

      this.isInitialized = true;
      this.emit('app:ready');

      console.log('[ZyncPDF] Application initialized');
    } catch (error) {
      console.error('[ZyncPDF] Initialization failed:', error);
      this.toasts.error('Failed to initialize application');
      throw error;
    }
  }

  /**
   * Render the main application UI
   */
  private render(): void {
    if (!this.mountPoint) return;

    this.mountPoint.innerHTML = `
      <div class="zyncpdf-app" data-theme="${this.settings.theme}">
        <!-- Header/Toolbar -->
        <header class="app-toolbar" id="app-toolbar"></header>

        <!-- Main Content Area -->
        <div class="app-main">
          <!-- Sidebar -->
          <aside class="app-sidebar" id="app-sidebar" role="complementary" aria-label="Sidebar">
            <div class="sidebar-tabs" role="tablist"></div>
            <div class="sidebar-content" role="tabpanel"></div>
          </aside>

          <!-- Sidebar Resizer -->
          <div class="sidebar-resizer" id="sidebar-resizer" aria-label="Resize sidebar"></div>

          <!-- Document Area -->
          <main class="app-document-area" id="app-document-area" role="main">
            <!-- Tab Bar -->
            <div class="app-tab-bar" id="app-tab-bar" role="tablist"></div>

            <!-- Document Viewport -->
            <div class="document-viewport" id="document-viewport">
              <div class="document-canvas-container" id="document-canvas-container"></div>
            </div>

            <!-- Floating Tools -->
            <div class="floating-tools" id="floating-tools"></div>
          </main>

          <!-- Panel Resizer -->
          <div class="panel-resizer" id="panel-resizer" aria-label="Resize panel"></div>

          <!-- Right Panel -->
          <aside class="app-panel" id="app-panel" role="complementary" aria-label="Properties panel">
            <div class="panel-tabs" role="tablist"></div>
            <div class="panel-content" role="tabpanel"></div>
          </aside>
        </div>

        <!-- Status Bar -->
        <footer class="app-status-bar" id="app-status-bar"></footer>

        <!-- Command Palette -->
        <div class="command-palette-overlay" id="command-palette" role="dialog" aria-modal="true" aria-label="Command Palette"></div>

        <!-- Toasts -->
        <div class="toast-container" id="toast-container" role="region" aria-label="Notifications" aria-live="polite"></div>

        <!-- Modals -->
        <div class="modal-overlay-container" id="modal-container"></div>
      </div>
    `;

    // Mount components
    this.toolbar.mount(this.mountPoint.querySelector('#app-toolbar')!);
    this.sidebar.mount(this.mountPoint.querySelector('#app-sidebar')!);
    this.panel.mount(this.mountPoint.querySelector('#app-panel')!);
    this.tabBar.mount(this.mountPoint.querySelector('#app-tab-bar')!);
    this.statusBar.mount(this.mountPoint.querySelector('#app-status-bar')!);
    this.commands.mount(this.mountPoint.querySelector('#command-palette')!);
    this.toasts.mount(this.mountPoint.querySelector('#toast-container')!);
    this.modals.mount(this.mountPoint.querySelector('#modal-container')!);

    // Setup resizers
    this.setupResizers();
  }

  /**
   * Initialize all components
   */
  private async initializeComponents(): Promise<void> {
    await Promise.all([
      this.toolbar.initialize(),
      this.sidebar.initialize(),
      this.panel.initialize(),
      this.tabBar.initialize(),
      this.statusBar.initialize(),
      this.commands.initialize(),
      this.toasts.initialize(),
      this.modals.initialize(),
      this.documents.initialize(),
      this.annotations.initialize(),
      this.history.initialize(),
      this.workspace.initialize(),
      this.pdfWorker.initialize(),
    ]);

    // Restore session
    await this.workspace.restoreSession();
  }

  /**
   * Setup resizers for sidebar and panel
   */
  private setupResizers(): void {
    const sidebarResizer = this.mountPoint?.querySelector('#sidebar-resizer') as HTMLElement;
    const panelResizer = this.mountPoint?.querySelector('#panel-resizer') as HTMLElement;
    const sidebar = this.mountPoint?.querySelector('.app-sidebar') as HTMLElement;
    const panel = this.mountPoint?.querySelector('.app-panel') as HTMLElement;

    this.setupResizer(sidebarResizer, sidebar, 'width', 'sidebarWidth', 200, 500);
    this.setupResizer(panelResizer, panel, 'width', 'panelWidth', 200, 500, true);
  }

  /**
   * Generic resizer setup
   */
  private setupResizer(
    resizer: HTMLElement, 
    target: HTMLElement, 
    dimension: 'width' | 'height', 
    settingKey: string,
    min: number, 
    max: number,
    fromRight = false
  ): void {
    let startValue = 0;
    let startPos = 0;

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      startValue = target.getBoundingClientRect()[dimension];
      startPos = fromRight ? e.clientX : e.clientX;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const onMouseMove = (e: MouseEvent) => {
      const delta = fromRight ? startPos - e.clientX : e.clientX - startPos;
      let newValue = startValue + delta;
      newValue = Math.max(min, Math.min(max, newValue));
      target.style[dimension] = `${newValue}px`;
      this.settings[settingKey as keyof AppSettings] = newValue;
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      this.saveSettings();
    };

    resizer.addEventListener('mousedown', onMouseDown);

    // Double-click to collapse/expand
    resizer.addEventListener('dblclick', () => {
      const current = target.getBoundingClientRect()[dimension];
      const isCollapsed = current <= min + 10;
      target.style[dimension] = isCollapsed ? `${this.settings[settingKey as keyof AppSettings] || 300}px` : `${min}px`;
      this.settings[settingKey as keyof AppSettings] = isCollapsed ? this.settings[settingKey as keyof AppSettings] || 300 : min;
      this.saveSettings();
    });
  }

  /**
   * Setup global event listeners
   */
  private setupEventListeners(): void {
    // Theme changes
    this.theme.on('change', (theme: Theme) => {
      this.settings.theme = theme;
      this.saveSettings();
      this.mountPoint?.querySelector('.zyncpdf-app')?.setAttribute('data-theme', theme);
    });

    // Document changes
    this.documents.on('document:open', (doc: PDFDocument) => {
      this.tabBar.addTab(doc);
      this.history.clear();
    });

    this.documents.on('document:close', (id: string) => {
      this.tabBar.removeTab(id);
    });

    this.documents.on('document:modified', (doc: PDFDocument) => {
      this.tabBar.updateTab(doc.id, { isModified: true });
      this.statusBar.setModified(true);
    });

    this.documents.on('document:saved', (doc: PDFDocument) => {
      this.tabBar.updateTab(doc.id, { isModified: false });
      this.statusBar.setModified(false);
    });

    // Active document changes
    this.workspace.on('activeDocument:change', (doc: PDFDocument | null) => {
      if (doc) {
        this.tabBar.activateTab(doc.id);
        this.sidebar.setDocument(doc);
        this.panel.setDocument(doc);
        this.statusBar.setDocument(doc);
      }
    });

    // Tool changes
    this.toolbar.on('tool:change', (tool: ToolMode) => {
      this.annotations.setTool(tool);
      this.statusBar.setTool(tool);
    });

    // Zoom changes
    this.documents.on('viewport:change', (viewport: any) => {
      this.statusBar.setZoom(viewport.scale);
      this.toolbar.updateZoom(viewport.scale);
    });

    // Page changes
    this.documents.on('page:change', (pageNumber: number) => {
      this.statusBar.setPage(pageNumber);
      this.toolbar.updatePage(pageNumber);
    });

    // Selection changes
    this.annotations.on('selection:change', (selection: any) => {
      this.panel.setSelection(selection);
      this.toolbar.updateSelection(selection);
    });

    // History changes
    this.history.on('change', (state: any) => {
      this.toolbar.updateHistory(state.canUndo, state.canRedo);
    });

    // Window events
    window.addEventListener('beforeunload', () => this.handleBeforeUnload());
    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('hashchange', () => this.handleDeepLink());

    // Visibility change for auto-save
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.handleVisibilityChange();
      }
    });
  }

  /**
   * Setup file drop handling
   */
  private setupFileDrop(): void {
    const viewport = this.mountPoint?.querySelector('#document-viewport') as HTMLElement;
    if (!viewport) return;

    viewport.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      viewport.classList.add('drag-over');
    });

    viewport.addEventListener('dragleave', (e) => {
      if (!viewport.contains(e.relatedTarget as Node)) {
        viewport.classList.remove('drag-over');
      }
    });

    viewport.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      viewport.classList.remove('drag-over');

      const files = Array.from(e.dataTransfer?.files || []).filter(
        f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );

      for (const file of files) {
        await this.documents.open(file);
      }
    });
  }

  /**
   * Handle deep linking (file in URL hash)
   */
  private handleDeepLink(): void {
    const hash = window.location.hash.slice(1);
    if (hash && hash.startsWith('file:')) {
      // Handle file:// protocol or base64 encoded file
      // This would be used for opening files from other apps
    }
  }

  /**
   * Register global keyboard shortcuts
   */
  private registerGlobalShortcuts(): void {
    const shortcuts: KeyboardShortcut[] = [
      // Global
      { key: 'k', meta: true, action: 'command-palette', description: 'Open Command Palette', category: 'Global' },
      { key: '/', meta: true, action: 'command-palette', description: 'Open Command Palette', category: 'Global' },
      { key: ',', meta: true, action: 'settings', description: 'Open Settings', category: 'Global' },
      { key: 'n', meta: true, action: 'new-document', description: 'New Document', category: 'File' },
      { key: 'o', meta: true, action: 'open-document', description: 'Open Document', category: 'File' },
      { key: 's', meta: true, action: 'save', description: 'Save Document', category: 'File' },
      { key: 's', meta: true, shift: true, action: 'save-as', description: 'Save As', category: 'File' },
      { key: 'w', meta: true, action: 'close-tab', description: 'Close Tab', category: 'File' },
      { key: 'w', meta: true, shift: true, action: 'close-all-tabs', description: 'Close All Tabs', category: 'File' },

      // Edit
      { key: 'z', meta: true, action: 'undo', description: 'Undo', category: 'Edit' },
      { key: 'z', meta: true, shift: true, action: 'redo', description: 'Redo', category: 'Edit' },
      { key: 'y', meta: true, action: 'redo', description: 'Redo', category: 'Edit' },
      { key: 'c', meta: true, action: 'copy', description: 'Copy', category: 'Edit' },
      { key: 'v', meta: true, action: 'paste', description: 'Paste', category: 'Edit' },
      { key: 'x', meta: true, action: 'cut', description: 'Cut', category: 'Edit' },
      { key: 'd', meta: true, action: 'duplicate', description: 'Duplicate', category: 'Edit' },
      { key: 'a', meta: true, action: 'select-all', description: 'Select All', category: 'Edit' },
      { key: 'Delete', action: 'delete', description: 'Delete Selection', category: 'Edit' },
      { key: 'f', meta: true, action: 'find', description: 'Find', category: 'Edit' },
      { key: 'g', meta: true, action: 'find-next', description: 'Find Next', category: 'Edit' },
      { key: 'g', meta: true, shift: true, action: 'find-previous', description: 'Find Previous', category: 'Edit' },

      // View
      { key: '=', meta: true, action: 'zoom-in', description: 'Zoom In', category: 'View' },
      { key: '-', meta: true, action: 'zoom-out', description: 'Zoom Out', category: 'View' },
      { key: '0', meta: true, action: 'zoom-reset', description: 'Reset Zoom', category: 'View' },
      { key: '1', meta: true, action: 'zoom-page-width', description: 'Fit Page Width', category: 'View' },
      { key: '2', meta: true, action: 'zoom-page', description: 'Fit Page', category: 'View' },
      { key: 'b', meta: true, action: 'toggle-sidebar', description: 'Toggle Sidebar', category: 'View' },
      { key: 'p', meta: true, shift: true, action: 'toggle-panel', description: 'Toggle Panel', category: 'View' },
      { key: '`', meta: true, action: 'toggle-theme', description: 'Toggle Theme', category: 'View' },

      // Navigation
      { key: 'ArrowLeft', meta: true, action: 'prev-page', description: 'Previous Page', category: 'Navigation' },
      { key: 'ArrowRight', meta: true, action: 'next-page', description: 'Next Page', category: 'Navigation' },
      { key: 'Home', meta: true, action: 'first-page', description: 'First Page', category: 'Navigation' },
      { key: 'End', meta: true, action: 'last-page', description: 'Last Page', category: 'Navigation' },
      { key: 'ArrowUp', meta: true, action: 'scroll-up', description: 'Scroll Up', category: 'Navigation' },
      { key: 'ArrowDown', meta: true, action: 'scroll-down', description: 'Scroll Down', category: 'Navigation' },

      // Tools
      { key: 'v', action: 'tool-select', description: 'Select Tool', category: 'Tools' },
      { key: 'h', action: 'tool-pan', description: 'Pan Tool', category: 'Tools' },
      { key: 't', action: 'tool-text', description: 'Text Tool', category: 'Tools' },
      { key: 'h', shift: true, action: 'tool-highlight', description: 'Highlight Tool', category: 'Tools' },
      { key: 'u', action: 'tool-underline', description: 'Underline Tool', category: 'Tools' },
      { key: 's', shift: true, action: 'tool-strikethrough', description: 'Strikethrough Tool', category: 'Tools' },
      { key: 'n', action: 'tool-sticky-note', description: 'Sticky Note', category: 'Tools' },
      { key: 'x', action: 'tool-text-box', description: 'Text Box', category: 'Tools' },
      { key: 'p', action: 'tool-freehand', description: 'Freehand', category: 'Tools' },
      { key: 'r', action: 'tool-rectangle', description: 'Rectangle', category: 'Tools' },
      { key: 'e', action: 'tool-ellipse', description: 'Ellipse', category: 'Tools' },
      { key: 'l', action: 'tool-line', description: 'Line', category: 'Tools' },
      { key: 'a', action: 'tool-arrow', description: 'Arrow', category: 'Tools' },
      { key: 'i', action: 'tool-image', description: 'Insert Image', category: 'Tools' },
      { key: 'g', action: 'tool-signature', description: 'Signature', category: 'Tools' },

      // Annotation shortcuts
      { key: 'Backspace', action: 'delete-annotation', description: 'Delete Annotation', category: 'Annotations' },
      { key: 'Enter', action: 'edit-annotation', description: 'Edit Annotation', category: 'Annotations' },
      { key: 'Escape', action: 'clear-selection', description: 'Clear Selection', category: 'Annotations' },
    ];

    this.shortcuts.registerMultiple(shortcuts);
  }

  /**
   * Register core commands for command palette
   */
  private registerCoreCommands(): void {
    const commands = [
      // File commands
      { id: 'file.new', title: 'New Document', icon: 'file-plus', shortcut: '⌘N', category: 'File', action: () => this.documents.createNew() },
      { id: 'file.open', title: 'Open Document', icon: 'folder-open', shortcut: '⌘O', category: 'File', action: () => this.documents.openFile() },
      { id: 'file.save', title: 'Save Document', icon: 'save', shortcut: '⌘S', category: 'File', action: () => this.documents.save() },
      { id: 'file.save-as', title: 'Save As...', icon: 'save-as', shortcut: '⌘⇧S', category: 'File', action: () => this.documents.saveAs() },
      { id: 'file.export', title: 'Export...', icon: 'download', shortcut: '⌘E', category: 'File', action: () => this.documents.export() },
      { id: 'file.close-tab', title: 'Close Tab', icon: 'x', shortcut: '⌘W', category: 'File', action: () => this.workspace.closeActiveTab() },
      { id: 'file.close-all', title: 'Close All Tabs', icon: 'x-circle', shortcut: '⌘⇧W', category: 'File', action: () => this.workspace.closeAllTabs() },

      // Edit commands
      { id: 'edit.undo', title: 'Undo', icon: 'undo', shortcut: '⌘Z', category: 'Edit', action: () => this.history.undo() },
      { id: 'edit.redo', title: 'Redo', icon: 'redo', shortcut: '⌘⇧Z', category: 'Edit', action: () => this.history.redo() },
      { id: 'edit.copy', title: 'Copy', icon: 'copy', shortcut: '⌘C', category: 'Edit', action: () => this.annotations.copy() },
      { id: 'edit.paste', title: 'Paste', icon: 'clipboard', shortcut: '⌘V', category: 'Edit', action: () => this.annotations.paste() },
      { id: 'edit.duplicate', title: 'Duplicate', icon: 'copy-plus', shortcut: '⌘D', category: 'Edit', action: () => this.annotations.duplicate() },
      { id: 'edit.delete', title: 'Delete', icon: 'trash', shortcut: 'Delete', category: 'Edit', action: () => this.annotations.deleteSelected() },
      { id: 'edit.select-all', title: 'Select All', icon: 'select-all', shortcut: '⌘A', category: 'Edit', action: () => this.annotations.selectAll() },
      { id: 'edit.find', title: 'Find', icon: 'search', shortcut: '⌘F', category: 'Edit', action: () => this.sidebar.showSearch() },
      { id: 'edit.find-next', title: 'Find Next', icon: 'chevron-down', shortcut: '⌘G', category: 'Edit', action: () => this.sidebar.findNext() },
      { id: 'edit.find-prev', title: 'Find Previous', icon: 'chevron-up', shortcut: '⌘⇧G', category: 'Edit', action: () => this.sidebar.findPrevious() },

      // View commands
      { id: 'view.zoom-in', title: 'Zoom In', icon: 'zoom-in', shortcut: '⌘=', category: 'View', action: () => this.documents.zoomIn() },
      { id: 'view.zoom-out', title: 'Zoom Out', icon: 'zoom-out', shortcut: '⌘-', category: 'View', action: () => this.documents.zoomOut() },
      { id: 'view.zoom-reset', title: 'Reset Zoom', icon: 'zoom-reset', shortcut: '⌘0', category: 'View', action: () => this.documents.resetZoom() },
      { id: 'view.zoom-width', title: 'Fit Width', icon: 'maximize', shortcut: '⌘1', category: 'View', action: () => this.documents.fitWidth() },
      { id: 'view.zoom-page', title: 'Fit Page', icon: 'fit', shortcut: '⌘2', category: 'View', action: () => this.documents.fitPage() },
      { id: 'view.toggle-sidebar', title: 'Toggle Sidebar', icon: 'sidebar', shortcut: '⌘B', category: 'View', action: () => this.sidebar.toggle() },
      { id: 'view.toggle-panel', title: 'Toggle Panel', icon: 'panel-right', shortcut: '⌘⇧P', category: 'View', action: () => this.panel.toggle() },
      { id: 'view.toggle-theme', title: 'Toggle Theme', icon: 'sun-moon', shortcut: '⌘`', category: 'View', action: () => this.theme.toggle() },
      { id: 'view.toggle-rulers', title: 'Toggle Rulers', icon: 'ruler', category: 'View', action: () => this.toggleSetting('showRulers') },
      { id: 'view.toggle-grid', title: 'Toggle Grid', icon: 'grid', category: 'View', action: () => this.toggleSetting('showGrid') },

      // Navigation commands
      { id: 'nav.prev-page', title: 'Previous Page', icon: 'chevron-left', shortcut: '⌘←', category: 'Navigation', action: () => this.documents.prevPage() },
      { id: 'nav.next-page', title: 'Next Page', icon: 'chevron-right', shortcut: '⌘→', category: 'Navigation', action: () => this.documents.nextPage() },
      { id: 'nav.first-page', title: 'First Page', icon: 'skip-back', shortcut: '⌘Home', category: 'Navigation', action: () => this.documents.firstPage() },
      { id: 'nav.last-page', title: 'Last Page', icon: 'skip-forward', shortcut: '⌘End', category: 'Navigation', action: () => this.documents.lastPage() },

      // Tool commands
      { id: 'tool.select', title: 'Select Tool', icon: 'mouse-pointer', shortcut: 'V', category: 'Tools', action: () => this.toolbar.setTool('select') },
      { id: 'tool.pan', title: 'Pan Tool', icon: 'hand', shortcut: 'H', category: 'Tools', action: () => this.toolbar.setTool('pan') },
      { id: 'tool.text', title: 'Text Tool', icon: 'type', shortcut: 'T', category: 'Tools', action: () => this.toolbar.setTool('text') },
      { id: 'tool.highlight', title: 'Highlight', icon: 'highlighter', shortcut: '⇧H', category: 'Tools', action: () => this.toolbar.setTool('highlight') },
      { id: 'tool.underline', title: 'Underline', icon: 'underline', shortcut: 'U', category: 'Tools', action: () => this.toolbar.setTool('underline') },
      { id: 'tool.strikethrough', title: 'Strikethrough', icon: 'strikethrough', shortcut: '⇧S', category: 'Tools', action: () => this.toolbar.setTool('strikethrough') },
      { id: 'tool.sticky-note', title: 'Sticky Note', icon: 'sticky-note', shortcut: 'N', category: 'Tools', action: () => this.toolbar.setTool('sticky-note') },
      { id: 'tool.text-box', title: 'Text Box', icon: 'text-box', shortcut: 'X', category: 'Tools', action: () => this.toolbar.setTool('text-box') },
      { id: 'tool.freehand', title: 'Freehand', icon: 'pen-tool', shortcut: 'P', category: 'Tools', action: () => this.toolbar.setTool('freehand') },
      { id: 'tool.rectangle', title: 'Rectangle', icon: 'square', shortcut: 'R', category: 'Tools', action: () => this.toolbar.setTool('rectangle') },
      { id: 'tool.ellipse', title: 'Ellipse', icon: 'circle', shortcut: 'E', category: 'Tools', action: () => this.toolbar.setTool('ellipse') },
      { id: 'tool.line', title: 'Line', icon: 'minus', shortcut: 'L', category: 'Tools', action: () => this.toolbar.setTool('line') },
      { id: 'tool.arrow', title: 'Arrow', icon: 'arrow-right', shortcut: 'A', category: 'Tools', action: () => this.toolbar.setTool('arrow') },
      { id: 'tool.image', title: 'Insert Image', icon: 'image', shortcut: 'I', category: 'Tools', action: () => this.toolbar.setTool('image') },
      { id: 'tool.signature', title: 'Signature', icon: 'signature', shortcut: 'G', category: 'Tools', action: () => this.toolbar.setTool('signature') },

      // Page commands
      { id: 'page.insert', title: 'Insert Blank Page', icon: 'plus-page', category: 'Page', action: () => this.documents.insertPage() },
      { id: 'page.delete', title: 'Delete Page', icon: 'trash-page', category: 'Page', action: () => this.documents.deletePage() },
      { id: 'page.duplicate', title: 'Duplicate Page', icon: 'copy-page', category: 'Page', action: () => this.documents.duplicatePage() },
      { id: 'page.rotate-left', title: 'Rotate Left', icon: 'rotate-ccw', category: 'Page', action: () => this.documents.rotatePage(-90) },
      { id: 'page.rotate-right', title: 'Rotate Right', icon: 'rotate-cw', category: 'Page', action: () => this.documents.rotatePage(90) },
      { id: 'page.extract', title: 'Extract Page', icon: 'download-page', category: 'Page', action: () => this.documents.extractPage() },

      // Settings
      { id: 'settings.open', title: 'Open Settings', icon: 'settings', shortcut: '⌘,', category: 'Settings', action: () => this.openSettings() },
      { id: 'settings.reset', title: 'Reset Settings', icon: 'reset', category: 'Settings', action: () => this.resetSettings() },

      // Help
      { id: 'help.shortcuts', title: 'Keyboard Shortcuts', icon: 'keyboard', shortcut: '⌘/', category: 'Help', action: () => this.showShortcuts() },
      { id: 'help.about', title: 'About ZyncPDF', icon: 'info', category: 'Help', action: () => this.showAbout() },
      { id: 'help.docs', title: 'Documentation', icon: 'book-open', category: 'Help', action: () => window.open('https://github.com/alanjollyc/ZyncPDF', '_blank') },
      { id: 'help.report-issue', title: 'Report Issue', icon: 'bug', category: 'Help', action: () => window.open('https://github.com/alanjollyc/ZyncPDF/issues', '_blank') },
    ];

    this.commands.register(commands);
  }

  /**
   * Toggle a boolean setting
   */
  private toggleSetting(key: keyof AppSettings): void {
    (this.settings[key] as boolean) = !(this.settings[key] as boolean);
    this.saveSettings();
    this.emit('settings:change', { [key]: this.settings[key] });
  }

  /**
   * Load settings from storage
   */
  private loadSettings(): AppSettings {
    const defaults: AppSettings = {
      theme: 'system',
      language: 'en',
      autoSave: true,
      autoSaveInterval: 30000,
      showRulers: false,
      showGrid: false,
      gridSize: 20,
      snapToGrid: true,
      defaultZoom: 1.0,
      zoomStep: 0.1,
      minZoom: 0.1,
      maxZoom: 8.0,
      smoothScrolling: true,
      hardwareAcceleration: true,
      renderQuality: 'high',
      textSelectionColor: 'rgba(99, 102, 241, 0.3)',
      annotationColors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'],
      recentFilesLimit: 20,
      keyboardShortcuts: {},
      toolbarPosition: 'top',
      sidebarPosition: 'left',
      panelPosition: 'right',
      autoHideSidebar: false,
      autoHidePanel: false,
      showPageBorders: true,
      showPageShadows: true,
      pageGap: 20,
      backgroundColor: '#525659',
      backgroundPattern: 'dots',
    };

    try {
      const stored = this.storage.get('app:settings');
      if (stored) {
        return { ...defaults, ...stored };
      }
    } catch (e) {
      console.warn('[ZyncPDF] Failed to load settings:', e);
    }

    return defaults;
  }

  /**
   * Save settings to storage
   */
  public saveSettings(): void {
    try {
      this.storage.set('app:settings', this.settings);
    } catch (e) {
      console.warn('[ZyncPDF] Failed to save settings:', e);
    }
  }

  /**
   * Reset settings to defaults
   */
  private resetSettings(): void {
    if (confirm('Reset all settings to defaults?')) {
      this.storage.delete('app:settings');
      this.settings = this.loadSettings();
      this.theme.apply(this.settings.theme);
      this.emit('settings:reset');
      this.toasts.success('Settings reset to defaults');
    }
  }

  /**
   * Open settings modal
   */
  private async openSettings(): Promise<void> {
    await this.modals.show({
      title: 'Settings',
      size: 'lg',
      content: await this.renderSettingsModal(),
    });
  }

  /**
   * Render settings modal content
   */
  private async renderSettingsModal(): Promise<string> {
    // This would render a full settings UI
    return '<div class="settings-modal">Settings UI would go here</div>';
  }

  /**
   * Show keyboard shortcuts modal
   */
  private async showShortcuts(): Promise<void> {
    await this.modals.show({
      title: 'Keyboard Shortcuts',
      size: 'lg',
      content: this.renderShortcutsModal(),
    });
  }

  /**
   * Render shortcuts modal content
   */
  private renderShortcutsModal(): string {
    const categories = ['Global', 'File', 'Edit', 'View', 'Navigation', 'Tools', 'Annotations', 'Page', 'Settings', 'Help'];
    
    return `
      <div class="shortcuts-modal">
        ${categories.map(cat => `
          <div class="shortcuts-category">
            <h3>${cat}</h3>
            <div class="shortcuts-list">
              ${this.commands.getByCategory(cat).map(cmd => `
                <div class="shortcut-item">
                  <span class="shortcut-title">${cmd.title}</span>
                  ${cmd.shortcut ? `<kbd class="shortcut-keys">${cmd.shortcut}</kbd>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Show about modal
   */
  private async showAbout(): Promise<void> {
    await this.modals.show({
      title: 'About ZyncPDF',
      size: 'md',
      content: `
        <div class="about-modal" style="text-align: center; padding: 2rem;">
          <img src="/logo.png" alt="ZyncPDF" style="width: 80px; height: 80px; border-radius: 16px; margin-bottom: 1rem;">
          <h2>ZyncPDF</h2>
          <p class="version">Version 2.0.0</p>
          <p style="color: var(--text-secondary); margin: 1rem 0;">
            Professional PDF Workspace for the Web
          </p>
          <p style="font-size: 0.875rem; color: var(--text-tertiary);">
            Built with ❤️ for privacy-first PDF editing
          </p>
          <div style="display: flex; gap: 0.5rem; justify-content: center; margin-top: 1.5rem;">
            <a href="https://github.com/alanjollyc/ZyncPDF" target="_blank" class="btn btn-ghost">GitHub</a>
            <a href="https://github.com/alanjollyc/ZyncPDF/issues" target="_blank" class="btn btn-ghost">Report Issue</a>
          </div>
        </div>
      `,
    });
  }

  /**
   * Handle before unload
   */
  private handleBeforeUnload(): void {
    if (this.documents.hasUnsavedChanges()) {
      // Save workspace state
      this.workspace.saveSession();
      // Auto-save documents if enabled
      if (this.settings.autoSave) {
        this.documents.autoSaveAll();
      }
    }
  }

  /**
   * Handle visibility change
   */
  private handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden' && this.settings.autoSave) {
      this.documents.autoSaveAll();
      this.workspace.saveSession();
    }
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    this.emit('window:resize');
    this.documents.resize();
  }

  /**
   * Get current settings
   */
  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  /**
   * Update a setting
   */
  public updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.settings[key] = value;
    this.saveSettings();
    this.emit('settings:change', { [key]: value });
  }

  /**
   * Get the active document
   */
  public getActiveDocument(): PDFDocument | null {
    return this.workspace.getActiveDocument();
  }

  /**
   * Cleanup on destroy
   */
  public destroy(): void {
    this.workspace.saveSession();
    this.history.destroy();
    this.pdfWorker.destroy();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const app = ZyncPDFApp.getInstance();