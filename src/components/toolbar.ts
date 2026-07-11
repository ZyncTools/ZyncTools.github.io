/**
 * ZyncPDF - Toolbar Component
 * Professional toolbar with tools, zoom, and document actions
 */

import { ToolMode, ToolOptions } from '../types/index.js';
import { EventEmitter } from '../utils/event-emitter.js';
import { ShortcutManager, KeyboardShortcut } from '../utils/shortcut-manager.js';

interface ToolbarButton {
  id: string;
  icon: string;
  label: string;
  shortcut?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  toggle?: boolean;
  pressed?: boolean;
  tooltip?: string;
  action?: () => void;
  children?: ToolbarButton[];
}

export class Toolbar extends EventEmitter {
  private container: HTMLElement | null = null;
  private buttons: Map<string, ToolbarButton> = new Map();
  private toolButtons: Map<ToolMode, HTMLButtonElement> = new Map();
  private currentTool: ToolMode = 'select';
  private shortcutManager: ShortcutManager;
  private zoom = 1;
  private pageNumber = 1;
  private totalPages = 1;

  constructor(shortcutManager: ShortcutManager) {
    super();
    this.shortcutManager = shortcutManager;
  }

  mount(container: HTMLElement): void {
    this.container = container;
    container.className = 'app-toolbar';
    this.render();
    this.bindEvents();
  }

  private render(): void {
    if (!this.container) return;

    const tools = this.getTools();
    const groups = this.groupTools(tools);

    this.container.innerHTML = `
      <div class="toolbar-left">
        ${groups.file.map(t => this.renderButton(t)).join('')}
        ${groups.file.length ? '<div class="toolbar-divider"></div>' : ''}
        ${groups.edit.map(t => this.renderButton(t)).join('')}
        ${groups.edit.length ? '<div class="toolbar-divider"></div>' : ''}
        ${groups.view.map(t => this.renderButton(t)).join('')}
      </div>
      <div class="toolbar-center">
        <div class="tool-group" role="group" aria-label="Tools">
          ${groups.tools.map(t => this.renderToolButton(t)).join('')}
        </div>
      </div>
      <div class="toolbar-right">
        ${groups.zoom.map(t => this.renderButton(t)).join('')}
        ${groups.zoom.length ? '<div class="toolbar-divider"></div>' : ''}
        ${groups.navigate.map(t => this.renderButton(t)).join('')}
        ${groups.navigate.length ? '<div class="toolbar-divider"></div>' : ''}
        ${groups.document.map(t => this.renderButton(t)).join('')}
      </div>
    `;

    // Cache tool buttons
    this.toolButtons.forEach((btn, tool) => {
      this.toolButtons.set(tool, this.container!.querySelector(`[data-tool="${tool}"]`) as HTMLButtonElement);
    });
  }

  private getTools(): ToolbarButton[] {
    return [
      // File group
      { id: 'new', icon: 'file-plus', label: 'New', shortcut: '⌘N', variant: 'ghost', action: () => this.emit('file:new') },
      { id: 'open', icon: 'folder-open', label: 'Open', shortcut: '⌘O', variant: 'ghost', action: () => this.emit('file:open') },
      { id: 'save', icon: 'save', label: 'Save', shortcut: '⌘S', variant: 'ghost', action: () => this.emit('file:save'), disabled: true },
      { id: 'save-as', icon: 'save-as', label: 'Save As', shortcut: '⌘⇧S', variant: 'ghost', action: () => this.emit('file:save-as'), disabled: true },

      // Edit group
      { id: 'undo', icon: 'undo', label: 'Undo', shortcut: '⌘Z', variant: 'ghost', action: () => this.emit('edit:undo'), disabled: true },
      { id: 'redo', icon: 'redo', label: 'Redo', shortcut: '⌘⇧Z', variant: 'ghost', action: () => this.emit('edit:redo'), disabled: true },

      // View group
      { id: 'toggle-sidebar', icon: 'sidebar', label: 'Toggle Sidebar', shortcut: '⌘B', variant: 'ghost', toggle: true, action: () => this.emit('view:toggle-sidebar') },
      { id: 'toggle-panel', icon: 'panel-right', label: 'Toggle Panel', shortcut: '⌘⇧P', variant: 'ghost', toggle: true, action: () => this.emit('view:toggle-panel') },

      // Tools group
      { id: 'select', icon: 'mouse-pointer', label: 'Select (V)', tool: 'select', shortcut: 'V', toggle: true, pressed: true, action: () => this.setTool('select') },
      { id: 'pan', icon: 'hand', label: 'Pan (H)', tool: 'pan', shortcut: 'H', toggle: true, action: () => this.setTool('pan') },
      { id: 'text', icon: 'type', label: 'Text (T)', tool: 'text', shortcut: 'T', toggle: true, action: () => this.setTool('text') },
      { id: 'highlight', icon: 'highlighter', label: 'Highlight (⇧H)', tool: 'highlight', shortcut: '⇧H', toggle: true, action: () => this.setTool('highlight') },
      { id: 'underline', icon: 'underline', label: 'Underline (U)', tool: 'underline', shortcut: 'U', toggle: true, action: () => this.setTool('underline') },
      { id: 'strikethrough', icon: 'strikethrough', label: 'Strikethrough (⇧S)', tool: 'strikethrough', shortcut: '⇧S', toggle: true, action: () => this.setTool('strikethrough') },
      { id: 'sticky-note', icon: 'sticky-note', label: 'Sticky Note (N)', tool: 'sticky-note', shortcut: 'N', toggle: true, action: () => this.setTool('sticky-note') },
      { id: 'text-box', icon: 'text-box', label: 'Text Box (X)', tool: 'text-box', shortcut: 'X', toggle: true, action: () => this.setTool('text-box') },
      { id: 'freehand', icon: 'pen-tool', label: 'Freehand (P)', tool: 'freehand', shortcut: 'P', toggle: true, action: () => this.setTool('freehand') },
      { id: 'rectangle', icon: 'square', label: 'Rectangle (R)', tool: 'rectangle', shortcut: 'R', toggle: true, action: () => this.setTool('rectangle') },
      { id: 'ellipse', icon: 'circle', label: 'Ellipse (E)', tool: 'ellipse', shortcut: 'E', toggle: true, action: () => this.setTool('ellipse') },
      { id: 'line', icon: 'minus', label: 'Line (L)', tool: 'line', shortcut: 'L', toggle: true, action: () => this.setTool('line') },
      { id: 'arrow', icon: 'arrow-right', label: 'Arrow (A)', tool: 'arrow', shortcut: 'A', toggle: true, action: () => this.setTool('arrow') },
      { id: 'signature', icon: 'signature', label: 'Signature (G)', tool: 'signature', shortcut: 'G', toggle: true, action: () => this.setTool('signature') },
      { id: 'image', icon: 'image', label: 'Insert Image (I)', tool: 'image', shortcut: 'I', toggle: true, action: () => this.setTool('image') },
      { id: 'eraser', icon: 'eraser', label: 'Eraser', tool: 'eraser', toggle: true, action: () => this.setTool('eraser') },

      // Zoom group
      { id: 'zoom-out', icon: 'zoom-out', label: 'Zoom Out', shortcut: '⌘-', variant: 'ghost', action: () => this.emit('zoom:out') },
      { id: 'zoom-level', label: '100%', isZoomDisplay: true },
      { id: 'zoom-in', icon: 'zoom-in', label: 'Zoom In', shortcut: '⌘=', variant: 'ghost', action: () => this.emit('zoom:in') },
      { id: 'zoom-reset', icon: 'zoom-reset', label: 'Reset Zoom', shortcut: '⌘0', variant: 'ghost', action: () => this.emit('zoom:reset') },
      { id: 'zoom-width', icon: 'maximize', label: 'Fit Width', shortcut: '⌘1', variant: 'ghost', action: () => this.emit('zoom:width') },
      { id: 'zoom-page', icon: 'fit', label: 'Fit Page', shortcut: '⌘2', variant: 'ghost', action: () => this.emit('zoom:page') },

      // Navigate group
      { id: 'first-page', icon: 'skip-back', label: 'First Page', shortcut: '⌘Home', variant: 'ghost', action: () => this.emit('nav:first-page') },
      { id: 'prev-page', icon: 'chevron-left', label: 'Previous', shortcut: '⌘←', variant: 'ghost', action: () => this.emit('nav:prev-page') },
      { id: 'page-indicator', label: '1 / 1', isPageIndicator: true },
      { id: 'next-page', icon: 'chevron-right', label: 'Next', shortcut: '⌘→', variant: 'ghost', action: () => this.emit('nav:next-page') },
      { id: 'last-page', icon: 'skip-forward', label: 'Last Page', shortcut: '⌘End', variant: 'ghost', action: () => this.emit('nav:last-page') },

      // Document group
      { id: 'insert-page', icon: 'plus-page', label: 'Insert Page', variant: 'ghost', action: () => this.emit('page:insert') },
      { id: 'delete-page', icon: 'trash-page', label: 'Delete Page', variant: 'ghost', action: () => this.emit('page:delete') },
      { id: 'rotate-left', icon: 'rotate-ccw', label: 'Rotate Left', variant: 'ghost', action: () => this.emit('page:rotate-left') },
      { id: 'rotate-right', icon: 'rotate-cw', label: 'Rotate Right', variant: 'ghost', action: () => this.emit('page:rotate-right') },
      { id: 'export', icon: 'download', label: 'Export', shortcut: '⌘E', variant: 'primary', action: () => this.emit('file:export') },
    ];
  }

  private groupTools(tools: ToolbarButton[]): Record<string, ToolbarButton[]> {
    const groups: Record<string, ToolbarButton[]> = {
      file: [],
      edit: [],
      view: [],
      tools: [],
      zoom: [],
      navigate: [],
      document: [],
    };

    tools.forEach(tool => {
      if (tool.isZoomDisplay || tool.isPageIndicator) return;
      
      if (['new', 'open', 'save', 'save-as'].includes(tool.id)) groups.file.push(tool);
      else if (['undo', 'redo'].includes(tool.id)) groups.edit.push(tool);
      else if (['toggle-sidebar', 'toggle-panel'].includes(tool.id)) groups.view.push(tool);
      else if (tool.tool) groups.tools.push(tool);
      else if (['zoom-out', 'zoom-level', 'zoom-in', 'zoom-reset', 'zoom-width', 'zoom-page'].includes(tool.id)) groups.zoom.push(tool);
      else if (['first-page', 'prev-page', 'page-indicator', 'next-page', 'last-page'].includes(tool.id)) groups.navigate.push(tool);
      else groups.document.push(tool);
    });

    return groups;
  }

  private renderButton(tool: ToolbarButton): string {
    if (tool.isZoomDisplay) {
      return `<span class="toolbar-zoom-display" id="zoom-level-display">100%</span>`;
    }
    if (tool.isPageIndicator) {
      return `<span class="toolbar-page-indicator" id="page-indicator-display">1 / 1</span>`;
    }

    const pressed = tool.pressed ? 'pressed' : '';
    const disabled = tool.disabled ? 'disabled' : '';
    const variant = tool.variant || 'ghost';
    const toggle = tool.toggle ? 'toolbar-toggle' : '';
    const shortcut = tool.shortcut ? `<kbd class="toolbar-shortcut">${tool.shortcut}</kbd>` : '';

    return `
      <button 
        type="button" 
        class="toolbar-btn toolbar-btn-${variant} ${pressed} ${disabled} ${toggle}"
        data-tool-id="${tool.id}"
        ${tool.tool ? `data-tool="${tool.tool}"` : ''}
        ${tool.disabled ? 'disabled' : ''}
        ${tool.pressed ? 'aria-pressed="true"' : ''}
        ${tool.tooltip ? `title="${tool.tooltip}"` : ''}
        aria-label="${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}"
      >
        <svg class="toolbar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          ${this.getIcon(tool.icon)}
        </svg>
        ${tool.label ? `<span class="toolbar-label">${tool.label}</span>` : ''}
        ${shortcut}
      </button>
    `;
  }

  private renderToolButton(tool: ToolbarButton): string {
    if (!tool.tool) return this.renderButton(tool);

    const pressed = tool.pressed ? 'pressed' : '';
    const disabled = tool.disabled ? 'disabled' : '';
    const shortcut = tool.shortcut ? `<kbd class="toolbar-shortcut">${tool.shortcut}</kbd>` : '';

    return `
      <button 
        type="button" 
        class="toolbar-tool-btn ${pressed} ${disabled}"
        data-tool="${tool.tool}"
        ${tool.disabled ? 'disabled' : ''}
        ${tool.pressed ? 'aria-pressed="true"' : ''}
        title="${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}"
        aria-label="${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}"
      >
        <svg class="toolbar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          ${this.getIcon(tool.icon)}
        </svg>
        ${shortcut}
      </button>
    `;
  }

  private groupTools(tools: ToolbarButton[]): Record<string, ToolbarButton[]> {
    const groups: Record<string, ToolbarButton[]> = {
      file: [],
      edit: [],
      view: [],
      tools: [],
      zoom: [],
      navigate: [],
      document: [],
    };

    tools.forEach(tool => {
      if (tool.isZoomDisplay || tool.isPageIndicator) return;
      
      if (['new', 'open', 'save', 'save-as'].includes(tool.id)) groups.file.push(tool);
      else if (['undo', 'redo'].includes(tool.id)) groups.edit.push(tool);
      else if (['toggle-sidebar', 'toggle-panel'].includes(tool.id)) groups.view.push(tool);
      else if (tool.tool) groups.tools.push(tool);
      else if (['zoom-out', 'zoom-level', 'zoom-in', 'zoom-reset', 'zoom-width', 'zoom-page'].includes(tool.id)) groups.zoom.push(tool);
      else if (['first-page', 'prev-page', 'page-indicator', 'next-page', 'last-page'].includes(tool.id)) groups.navigate.push(tool);
      else groups.document.push(tool);
    });

    return groups;
  }

  private bindEvents(): void {
    if (!this.container) return;

    this.container.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-tool-id]');
      if (btn) {
        const id = btn.getAttribute('data-tool-id')!;
        const tool = Array.from(this.getTools()).find(t => t.id === id);
        if (tool?.action) tool.action();
        return;
      }

      const toolBtn = (e.target as HTMLElement).closest('[data-tool]');
      if (toolBtn) {
        const tool = toolBtn.getAttribute('data-tool') as ToolMode;
        this.setTool(tool);
      }
    });
  }

  private getIcon(name: string): string {
    const icons: Record<string, string> = {
      'file-plus': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></path><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line>',
      'folder-open': '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>',
      'save': '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></path><polyline points="7 3 7 8 15 8"></polyline>',
      'save-as': '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></path><polyline points="7 3 7 8 15 8"></polyline>',
      'undo': '<path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>',
      'redo': '<path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path>',
      'sidebar': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>',
      'panel-right': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="15" y1="3" x2="15" y2="21"></line>',
      'mouse-pointer': '<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="M13 13l6 6"></path>',
      'hand': '<path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"></path><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"></path><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"></path>',
      'type': '<polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></polyline><line x1="12" y1="4" x2="12" y2="20"></polyline>',
      'highlighter': '<path d="M12 3v18"></path><path d="M16 3v18"></path><path d="M8 3v18"></path>',
      'underline': '<line x1="6" y1="4" x2="18" y2="4"></line><line x1="6" y1="20" x2="18" y2="20"></line><path d="M8 12h8"></path>',
      'strikethrough': '<line x1="4" y1="12" x2="20" y2="12"></line><path d="M8 4v16"></path><path d="M16 4v16"></path>',
      'sticky-note': '<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"></path><polyline points="15 3 15 9 21 9"></polyline>',
      'text-box': '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path><path d="M4 10h16"></path><path d="M4 14h10"></path>',
      'pen-tool': '<path d="M12 19l7-7 3 3-7 7-3 3z"></path><path d="M18 13l-1.5-7.5L2 2l-3 5 7 5 1.5"></path>',
      'square': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>',
      'circle': '<circle cx="12" cy="12" r="10"></circle>',
      'minus': '<line x1="5" y1="12" x2="19" y2="12"></line>',
      'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>',
      'signature': '<path d="M17 21l-5-5-3-3-4 4-4-4-3 3-2 2"></path>',
      'image': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>',
      'eraser': '<path d="M20 20H7L2 15"></path><path d="M15 2v-1a3 3 0 0 0-3-3H4"></path><path d="M9 5h.01"></path><path d="M12 5h.01"></path><path d="M15 5h.01"></path>',
      'zoom-out': '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line>',
      'zoom-in': '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line>',
      'zoom-reset': '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="1" x2="11" y2="23"></line>',
      'maximize': '<path d="M8 3H5a2 2 0 0 0-2 2v3"></path><path d="M21 8V5a2 2 0 0 0-2-2h-3"></path><path d="M3 16v3a2 2 0 0 0 2 2h3"></path><path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>',
      'fit': '<path d="M3 8V5a2 2 0 0 1 2-2h3"></path><path d="M21 16v3a2 2 0 0 1-2 2h-3"></path><path d="M3 16v3a2 2 0 0 0 2 2h3"></path><path d="M16 3h3a2 2 0 0 1 2 2v3"></path>',
      'skip-back': '<polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line>',
      'chevron-left': '<polyline points="15 18 9 12 15 6"></polyline>',
      'chevron-right': '<polyline points="9 18 15 12 9 6"></polyline>',
      'skip-forward': '<polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line>',
      'plus-page': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></path><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line>',
      'trash-page': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></path><polyline points="20 6 20 6 14 12 14 12"></polyline>',
      'rotate-ccw': '<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>',
      'rotate-cw': '<path d="M20.49 9a9 9 0 1 1-2.12 9.36L23 14"></path>',
      'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>',
    };

    return icons[name] || '';
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  setTool(tool: ToolMode): void {
    if (this.currentTool === tool) return;
    
    // Update button states
    this.toolButtons.forEach((btn, t) => {
      btn.classList.toggle('pressed', t === tool);
      btn.setAttribute('aria-pressed', (t === tool).toString());
    });

    this.currentTool = tool;
    this.emit('tool:change', tool);
  }

  getCurrentTool(): ToolMode {
    return this.currentTool;
  }

  updateZoom(zoom: number): void {
    this.zoom = zoom;
    const display = this.container?.querySelector('#zoom-level-display');
    if (display) {
      display.textContent = `${Math.round(zoom * 100)}%`;
    }
  }

  updatePage(pageNumber: number, totalPages: number): void {
    this.pageNumber = pageNumber;
    this.totalPages = totalPages;
    const display = this.container?.querySelector('#page-indicator-display');
    if (display) {
      display.textContent = `${pageNumber} / ${totalPages}`;
    }
  }

  updateHistory(canUndo: boolean, canRedo: boolean): void {
    const undoBtn = this.container?.querySelector('[data-tool-id="undo"]');
    const redoBtn = this.container?.querySelector('[data-tool-id="redo"]');
    if (undoBtn) undoBtn.toggleAttribute('disabled', !canUndo);
    if (redoBtn) redoBtn.toggleAttribute('disabled', !canRedo);
  }

  updateSelection(selection: any): void {
    // Update delete/copy buttons based on selection
  }

  setSaveEnabled(enabled: boolean): void {
    const saveBtn = this.container?.querySelector('[data-tool-id="save"]');
    const saveAsBtn = this.container?.querySelector('[data-tool-id="save-as"]');
    if (saveBtn) saveBtn.toggleAttribute('disabled', !enabled);
    if (saveAsBtn) saveAsBtn.toggleAttribute('disabled', !enabled);
  }
}