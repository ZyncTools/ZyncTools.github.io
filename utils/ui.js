/**
 * @file UI Utilities
 * Reusable UI components, state management, and interaction helpers
 * @module utils/ui
 */

import { formatFileSize, getFileIcon, getFileInfo } from './file.js';

/**
 * @typedef {Object} ToastOptions
 * @property {string} message - Toast message
 * @property {string} [type='info'] - Toast type: 'success', 'error', 'warning', 'info'
 * @property {string} [title] - Optional title
 * @property {number} [duration=5000] - Auto-dismiss duration in ms (0 = no auto-dismiss)
 * @property {boolean} [dismissible=true] - Allow manual dismiss
 * @property {Function} [onDismiss] - Callback when dismissed
 */

/**
 * @typedef {Object} ModalOptions
 * @property {string} title - Modal title
 * @property {HTMLElement|string} content - Modal content
 * @property {string} [size='md'] - Modal size: 'sm', 'md', 'lg', 'xl', 'full'
 * @property {boolean} [closeOnOverlayClick=true] - Close on backdrop click
 * @property {boolean} [closeOnEscape=true] - Close on Escape key
 * @property {Function} [onClose] - Callback when closed
 * @property {HTMLElement[]} [actions] - Action buttons
 */

/**
 * @typedef {Object} CommandPaletteItem
 * @property {string} id - Unique identifier
 * @property {string} title - Display title
 * @property {string} [description] - Optional description
 * @property {string} [icon] - Icon HTML or class
 * @property {string} [shortcut] - Keyboard shortcut display
 * @property {string} [section] - Section name for grouping
 * @property {Function} action - Action callback
 * @property {string[]} [keywords] - Search keywords
 */

/**
 * Toast container instance
 */
let toastContainer = null;

/**
 * Initialize toast container
 * @returns {HTMLElement} Toast container element
 */
function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    toastContainer.setAttribute('role', 'region');
    toastContainer.setAttribute('aria-label', 'Notifications');
    toastContainer.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Show toast notification
 * @param {ToastOptions} options - Toast options
 * @returns {Function} Dismiss function
 */
export function showToast(options = {}) {
  const {
    message,
    type = 'info',
    title,
    duration = 5000,
    dismissible = true,
    onDismiss
  } = options;
  
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  
  const icons = {
    success: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    error: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    warning: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    info: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
  };
  
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">
      ${title ? `<div class="toast-title">${escapeHtml(title)}</div>` : ''}
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    ${dismissible ? '<button class="toast-close" aria-label="Dismiss"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>' : ''}
  `;
  
  const dismiss = () => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => {
      toast.remove();
      onDismiss?.();
    }, { once: true });
  };
  
  if (dismissible) {
    toast.querySelector('.toast-close').addEventListener('click', dismiss);
  }
  
  if (duration > 0) {
    setTimeout(dismiss, duration);
  }
  
  container.appendChild(toast);
  
  // Trigger reflow for animation
  requestAnimationFrame(() => {
    toast.style.animationPlayState = 'running';
  });
  
  return dismiss;
}

/**
 * Show success toast
 * @param {string} message - Message
 * @param {Object} options - Additional options
 */
export function showSuccess(message, options = {}) {
  return showToast({ ...options, message, type: 'success' });
}

/**
 * Show error toast
 * @param {string} message - Message
 * @param {Object} options - Additional options
 */
export function showError(message, options = {}) {
  return showToast({ ...options, message, type: 'error', duration: 8000 });
}

/**
 * Show warning toast
 * @param {string} message - Message
 * @param {Object} options - Additional options
 */
export function showWarning(message, options = {}) {
  return showToast({ ...options, message, type: 'warning', duration: 7000 });
}

/**
 * Show info toast
 * @param {string} message - Message
 * @param {Object} options - Additional options
 */
export function showInfo(message, options = {}) {
  return showToast({ ...options, message, type: 'info' });
}

/**
 * Modal management
 */
const modalStack = [];

/**
 * Show modal dialog
 * @param {ModalOptions} options - Modal options
 * @returns {Function} Close function
 */
export function showModal(options = {}) {
  const {
    title,
    content,
    size = 'md',
    closeOnOverlayClick = true,
    closeOnEscape = true,
    onClose,
    actions = []
  } = options;
  
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'modal-title');
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4 my-4'
  };
  
  const modal = document.createElement('div');
  modal.className = `modal ${sizeClasses[size] || sizeClasses.md}`;
  
  const actionButtons = actions.map((action, i) => {
    const btn = document.createElement('button');
    btn.className = `btn ${action.primary ? 'btn-primary' : 'btn-secondary'}`;
    btn.textContent = action.label;
    btn.addEventListener('click', () => {
      action.onClick?.(close);
      if (!action.preventClose) close();
    });
    return btn;
  });
  
  modal.innerHTML = `
    <div class="modal-header">
      <h2 id="modal-title" class="modal-title">${escapeHtml(title)}</h2>
      <button class="modal-close" aria-label="Close modal">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    <div class="modal-body"></div>
    ${actions.length > 0 ? '<div class="modal-footer"></div>' : ''}
  `;
  
  const body = modal.querySelector('.modal-body');
  if (typeof content === 'string') {
    body.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  }
  
  if (actions.length > 0) {
    const footer = modal.querySelector('.modal-footer');
    actionButtons.forEach(btn => footer.appendChild(btn));
  }
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  
  const close = () => {
    overlay.classList.remove('open');
    overlay.addEventListener('transitionend', () => {
      overlay.remove();
      document.body.style.overflow = '';
      onClose?.();
    }, { once: true });
    
    const index = modalStack.indexOf(close);
    if (index !== -1) modalStack.splice(index, 1);
  };
  
  modalStack.push(close);
  
  // Focus management
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && closeOnEscape) {
      close();
    } else if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  };
  
  overlay.addEventListener('keydown', handleKeyDown);
  modal.querySelector('.modal-close').addEventListener('click', close);
  
  if (closeOnOverlayClick) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }
  
  // Trigger animation
  requestAnimationFrame(() => overlay.classList.add('open'));
  
  firstFocusable?.focus();
  
  return close;
}

/**
 * Close all modals
 */
export function closeAllModals() {
  [...modalStack].forEach(close => close());
}

/**
 * Confirmation dialog
 * @param {Object} options - Confirmation options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Dialog message
 * @property {string} [options.confirmLabel='Confirm'] - Confirm button label
 * @property {string} [options.cancelLabel='Cancel'] - Cancel button label
 * @property {string} [options.type='warning'] - Type: 'warning', 'danger', 'info'
 * @returns {Promise<boolean>} True if confirmed
 */
export function confirm(options = {}) {
  const { title = 'Confirm', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', type = 'warning' } = options;
  
  return new Promise((resolve) => {
    showModal({
      title,
      content: `<p class="text-secondary">${escapeHtml(message)}</p>`,
      size: 'sm',
      actions: [
        { label: cancelLabel, onClick: () => resolve(false) },
        { label: confirmLabel, primary: type === 'danger' ? false : true, onClick: () => resolve(true) }
      ]
    });
  });
}

/**
 * Command Palette
 */
let commandPaletteInstance = null;

/**
 * Command Palette class
 */
export class CommandPalette {
  constructor() {
    this.items = [];
    this.filteredItems = [];
    this.selectedIndex = 0;
    this.isOpen = false;
    this.onClose = null;
    this.searchQuery = '';
  }
  
  /**
   * Register command items
   * @param {CommandPaletteItem[]} items - Items to register
   */
  register(items) {
    this.items = [...this.items, ...items];
  }
  
  /**
   * Clear all items
   */
  clear() {
    this.items = [];
  }
  
  /**
   * Open the command palette
   * @param {Function} onClose - Callback when closed
   */
  open(onClose) {
    if (this.isOpen) return;
    this.onClose = onClose;
    this.isOpen = true;
    this.searchQuery = '';
    this.selectedIndex = 0;
    this.render();
    this.bindEvents();
    document.body.style.overflow = 'hidden';
  }
  
  /**
   * Close the command palette
   */
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay?.remove();
    this.overlay = null;
    document.body.style.overflow = '';
    this.onClose?.();
    this.onClose = null;
  }
  
  /**
   * Filter items based on search query
   */
  filter() {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredItems = this.items;
    } else {
      this.filteredItems = this.items.filter(item => {
        const searchText = `${item.title} ${item.description || ''} ${item.keywords?.join(' ') || ''}`.toLowerCase();
        return searchText.includes(query);
      });
    }
    this.selectedIndex = 0;
    this.renderResults();
  }
  
  /**
   * Render the palette
   */
  render() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'command-palette-overlay';
    this.overlay.innerHTML = `
      <div class="command-palette" role="dialog" aria-modal="true" aria-label="Command Palette">
        <div class="command-palette-header">
          <svg class="command-palette-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" class="command-palette-input" placeholder="Type a command or search..." autocomplete="off" spellcheck="false" aria-label="Search commands">
          <kbd class="command-palette-shortcut">⌘K</kbd>
        </div>
        <div class="command-palette-results" role="listbox"></div>
      </div>
    `;
    
    document.body.appendChild(this.overlay);
    this.input = this.overlay.querySelector('.command-palette-input');
    this.results = this.overlay.querySelector('.command-palette-results');
    
    this.filter();
    this.input.focus();
    
    requestAnimationFrame(() => this.overlay.classList.add('open'));
  }
  
  /**
   * Render filtered results
   */
  renderResults() {
    if (!this.results) return;
    
    if (this.filteredItems.length === 0) {
      this.results.innerHTML = '<div class="command-palette-empty">No commands found</div>';
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
        <div class="command-palette-section-title">${escapeHtml(sectionName)}</div>
        ${items.map((item, idx) => `
          <div class="command-palette-item" role="option" data-index="${this.items.indexOf(item)}" data-id="${item.id}">
            ${item.icon ? `<span class="command-palette-item-icon">${item.icon}</span>` : ''}
            <div class="command-palette-item-content">
              <div class="command-palette-item-title">${escapeHtml(item.title)}</div>
              ${item.description ? `<div class="command-palette-item-description">${escapeHtml(item.description)}</div>` : ''}
            </div>
            ${item.shortcut ? `<span class="command-palette-item-shortcut">${escapeHtml(item.shortcut)}</span>` : ''}
          </div>
        `).join('')}
      </div>
    `).join('');
  }
  
  /**
   * Bind keyboard events
   */
  bindEvents() {
    this.handleKeyDown = (e) => this.onKeyDown(e);
    this.handleInput = () => this.onInput();
    this.handleClick = (e) => this.onClick(e);
    
    document.addEventListener('keydown', this.handleKeyDown);
    this.input.addEventListener('input', this.handleInput);
    this.results.addEventListener('click', this.handleClick);
  }
  
  /**
   * Handle keyboard input
   */
  onKeyDown(e) {
    if (!this.isOpen) return;
    
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
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
    }
  }
  
  /**
   * Handle search input
   */
  onInput() {
    this.searchQuery = this.input.value;
    this.filter();
  }
  
  /**
   * Handle click on result
   */
  onClick(e) {
    const item = e.target.closest('.command-palette-item');
    if (item) {
      const index = parseInt(item.dataset.index, 10);
      this.selectedIndex = index;
      this.executeSelected();
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
    items?.forEach((item, idx) => {
      item.classList.toggle('selected', idx === this.selectedIndex);
      item.setAttribute('aria-selected', idx === this.selectedIndex);
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
    if (item) {
      item.action();
      this.close();
    }
  }
}

/**
 * Get or create command palette instance
 * @returns {CommandPalette} Command palette instance
 */
export function getCommandPalette() {
  if (!commandPaletteInstance) {
    commandPaletteInstance = new CommandPalette();
  }
  return commandPaletteInstance;
}

/**
 * Register global keyboard shortcuts
 * @param {Object<string, Function>} shortcuts - Map of shortcut to handler
 */
export function registerShortcuts(shortcuts) {
  document.addEventListener('keydown', (e) => {
    // Ignore if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      return;
    }
    
    const key = [
      e.metaKey || e.ctrlKey ? 'Mod' : null,
      e.shiftKey ? 'Shift' : null,
      e.altKey ? 'Alt' : null,
      e.key.length === 1 ? e.key.toUpperCase() : e.key
    ].filter(Boolean).join('+');
    
    if (shortcuts[key]) {
      e.preventDefault();
      shortcuts[key](e);
    }
  });
}

/**
 * Create file drop zone
 * @param {Object} options - Drop zone options
 * @param {HTMLElement} options.element - Drop zone element
 * @param {Function} options.onFiles - Callback with files array
 * @param {string[]} options.accept - Accepted MIME types
 * @param {boolean} options.multiple - Allow multiple files
 */
export function createDropZone(options = {}) {
  const { element, onFiles, accept = [], multiple = true } = options;
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.add('drag-over');
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only remove if actually leaving the element
    if (!element.contains(e.relatedTarget)) {
      element.classList.remove('drag-over');
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = accept.length > 0 
      ? files.filter(f => accept.some(a => f.type.match(a.replace('*', '.*'))))
      : files;
    
    if (validFiles.length > 0) {
      onFiles(multiple ? validFiles : [validFiles[0]]);
    }
  };
  
  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = multiple;
    input.accept = accept.join(',');
    input.onchange = () => {
      const files = Array.from(input.files);
      if (files.length > 0) onFiles(files);
    };
    input.click();
  };
  
  element.addEventListener('dragover', handleDragOver);
  element.addEventListener('dragleave', handleDragLeave);
  element.addEventListener('drop', handleDrop);
  element.addEventListener('click', handleClick);
  element.style.cursor = 'pointer';
  
  return {
    destroy: () => {
      element.removeEventListener('dragover', handleDragOver);
      element.removeEventListener('dragleave', handleDragLeave);
      element.removeEventListener('drop', handleDrop);
      element.removeEventListener('click', handleClick);
    }
  };
}

/**
 * Create file list UI
 * @param {Object} options - File list options
 * @param {HTMLElement} options.container - Container element
 * @param {File[]} options.files - Files to display
 * @param {Function} options.onRemove - Remove callback
 * @param {Function} options.onReorder - Reorder callback
 * @param {Function} options.onPreview - Preview callback
 * @returns {Object} File list controller
 */
export function createFileList(options = {}) {
  const { container, files = [], onRemove, onReorder, onPreview } = options;
  let currentFiles = [...files];
  
  const render = () => {
    container.innerHTML = currentFiles.map((file, index) => {
      const info = getFileInfo(file);
      return `
        <div class="file-item" data-index="${index}" draggable="${currentFiles.length > 1}">
          <div class="file-icon-wrapper">
            <i class="${getFileIcon(info)}"></i>
          </div>
          <div class="file-info">
            <div class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
            <div class="file-size">${formatFileSize(file.size)}</div>
          </div>
          <div class="file-actions">
            ${onPreview ? `<button class="file-action-btn" data-action="preview" aria-label="Preview"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>` : ''}
            ${onReorder && currentFiles.length > 1 ? `
              <button class="file-action-btn" data-action="move-up" ${index === 0 ? 'disabled' : ''} aria-label="Move up"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
              <button class="file-action-btn" data-action="move-down" ${index === currentFiles.length - 1 ? 'disabled' : ''} aria-label="Move down"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
              <span class="drag-handle" aria-label="Drag to reorder"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="8" y2="18"></line><line x1="12" y1="6" x2="12" y2="18"></line><line x1="16" y1="6" x2="16" y2="18"></line></svg></span>
            ` : ''}
            ${onRemove ? `<button class="file-action-btn file-action-danger" data-action="remove" aria-label="Remove"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>` : ''}
          </div>
        </div>
      `;
    }).join('');
    
    bindEvents();
  };
  
  const bindEvents = () => {
    // Remove buttons
    container.querySelectorAll('[data-action="remove"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.currentTarget.closest('.file-item');
        const index = parseInt(item.dataset.index, 10);
        onRemove?.(currentFiles[index], index);
      });
    });
    
    // Preview buttons
    container.querySelectorAll('[data-action="preview"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.currentTarget.closest('.file-item');
        const index = parseInt(item.dataset.index, 10);
        onPreview?.(currentFiles[index], index);
      });
    });
    
    // Move buttons
    container.querySelectorAll('[data-action="move-up"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.currentTarget.closest('.file-item');
        const index = parseInt(item.dataset.index, 10);
        if (index > 0) onReorder?.(index, index - 1);
      });
    });
    
    container.querySelectorAll('[data-action="move-down"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.currentTarget.closest('.file-item');
        const index = parseInt(item.dataset.index, 10);
        if (index < currentFiles.length - 1) onReorder?.(index, index + 1);
      });
    });
    
    // Drag and drop reordering
    let draggedIndex = -1;
    
    container.querySelectorAll('.file-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        draggedIndex = parseInt(item.dataset.index, 10);
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        draggedIndex = -1;
      });
      
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetIndex = parseInt(item.dataset.index, 10);
        if (draggedIndex !== -1 && draggedIndex !== targetIndex) {
          onReorder?.(draggedIndex, targetIndex);
        }
      });
    });
  };
  
  const setFiles = (newFiles) => {
    currentFiles = [...newFiles];
    render();
  };
  
  const addFiles = (newFiles) => {
    currentFiles = [...currentFiles, ...newFiles];
    render();
  };
  
  const removeFile = (index) => {
    currentFiles.splice(index, 1);
    render();
  };
  
  const moveFile = (fromIndex, toIndex) => {
    const [file] = currentFiles.splice(fromIndex, 1);
    currentFiles.splice(toIndex, 0, file);
    render();
  };
  
  render();
  
  return { setFiles, addFiles, removeFile, moveFile, getFiles: () => currentFiles };
}

/**
 * Create progress indicator
 * @param {Object} options - Progress options
 * @param {HTMLElement} options.container - Container element
 * @param {number} options.total - Total steps
 * @param {string} [options.label] - Progress label
 * @returns {Object} Progress controller
 */
export function createProgress(options = {}) {
  const { container, total = 100, label } = options;
  
  container.innerHTML = `
    ${label ? `<div class="progress-label">${escapeHtml(label)}</div>` : ''}
    <div class="progress" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="${total}">
      <div class="progress-fill" style="width: 0%"></div>
    </div>
    <div class="progress-text">0%</div>
  `;
  
  const fill = container.querySelector('.progress-fill');
  const text = container.querySelector('.progress-text');
  const bar = container.querySelector('.progress');
  
  let current = 0;
  
  const setProgress = (value, max = total) => {
    current = Math.max(0, Math.min(value, max));
    const percent = Math.round((current / max) * 100);
    fill.style.width = `${percent}%`;
    text.textContent = `${percent}%`;
    bar.setAttribute('aria-valuenow', current);
  };
  
  const increment = (step = 1) => setProgress(current + step);
  
  const complete = () => setProgress(total);
  
  const reset = () => setProgress(0);
  
  return { setProgress, increment, complete, reset, getProgress: () => current };
}

/**
 * Create skeleton loader
 * @param {Object} options - Skeleton options
 * @param {string} options.type - Type: 'text', 'card', 'table', 'list'
 * @param {number} [options.count=3] - Number of items
 * @returns {HTMLElement} Skeleton element
 */
export function createSkeleton(options = {}) {
  const { type = 'card', count = 3 } = options;
  const div = document.createElement('div');
  div.className = 'skeleton-container';
  
  const templates = {
    text: () => '<div class="skeleton skeleton-text" style="width: 60%"></div>',
    title: () => '<div class="skeleton skeleton-title"></div>',
    card: () => `
      <div class="skeleton skeleton-card" style="height: 200px"></div>
    `,
    list: () => `
      <div class="skeleton skeleton-text" style="width: 100%; height: 60px"></div>
    `,
    table: () => `
      <div class="skeleton skeleton-text" style="width: 100%"></div>
      <div class="skeleton skeleton-text" style="width: 100%"></div>
    `
  };
  
  const template = templates[type] || templates.card;
  div.innerHTML = Array.from({ length: count }, () => template()).join('');
  
  return div;
}

/**
 * Debounce function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in ms
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Limit in ms
 * @returns {Function} Throttled function
 */
export function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Escape HTML to prevent XSS
 * @param {string} html - HTML string
 * @returns {string} Escaped string
 */
export function escapeHtml(html) {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Safe set innerHTML with DOMPurify-like sanitization
 * @param {HTMLElement} element - Target element
 * @param {string} html - HTML string
 */
export function safeInnerHTML(element, html) {
  // Basic sanitization - remove scripts and event handlers
  const sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
  element.innerHTML = sanitized;
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      textarea.remove();
    }
  }
}

/**
 * Format date for display
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Format options
 * @returns {string} Formatted date
 */
export function formatDate(date, options = {}) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';
  
  const { relative = false, format = 'short' } = options;
  
  if (relative) {
    const now = new Date();
    const diff = now - d;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  }
  
  const opts = format === 'short' 
    ? { month: 'short', day: 'numeric', year: 'numeric' }
    : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  
  return d.toLocaleDateString(undefined, opts);
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

/**
 * Class name utility
 * @param {...(string|Object|Array)} args - Class names
 * @returns {string} Combined class names
 */
export function cn(...args) {
  return args.flatMap(arg => {
    if (typeof arg === 'string') return arg;
    if (Array.isArray(arg)) return cn(...arg);
    if (typeof arg === 'object') {
      return Object.entries(arg)
        .filter(([, v]) => v)
        .map(([k]) => k);
    }
    return '';
  }).join(' ');
}