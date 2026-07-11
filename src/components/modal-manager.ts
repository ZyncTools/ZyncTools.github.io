/**
 * ZyncPDF - Modal Manager
 * Accessible modal dialogs with focus trapping
 */

import { ModalOptions, ModalAction } from '../types/index.js';
import { EventEmitter } from '../utils/event-emitter.js';

interface ModalInstance {
  id: string;
  element: HTMLElement;
  options: ModalOptions;
  previousFocus: HTMLElement | null;
  focusableElements: HTMLElement[];
  closeHandlers: Array<() => void>;
}

export class ModalManager extends EventEmitter {
  private container: HTMLElement | null = null;
  private modals: Map<string, ModalInstance> = new Map();
  private overlay: HTMLElement | null = null;

  mount(container: HTMLElement): void {
    this.container = container;
    container.className = 'modal-overlay-container';
    
    // Create shared overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.setAttribute('aria-hidden', 'true');
    container.appendChild(this.overlay);

    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.closeTopModal();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modals.size > 0) {
        this.closeTopModal();
      }
    });
  }

  async show(options: ModalOptions): Promise<any> {
    return new Promise((resolve) => {
      const id = this.generateId();
      const modal = this.createModal(id, options, resolve);
      this.modals.set(id, modal);
      
      this.container!.appendChild(modal.element);
      
      // Trigger entrance animation
      requestAnimationFrame(() => {
        modal.element.classList.add('modal-enter');
        this.overlay!.classList.add('modal-overlay-visible');
      });

      // Focus management
      this.trapFocus(modal);
      this.restoreFocusOnClose(modal);
    });
  }

  private createModal(id: string, options: ModalOptions, resolve: (value: any) => void): ModalInstance {
    const sizeClass = options.size ? `modal-${options.size}` : 'modal-md';
    
    const element = document.createElement('div');
    element.className = `modal ${sizeClass}`;
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-modal', 'true');
    element.setAttribute('aria-labelledby', `${id}-title`);
    
    if (options.closable !== false) {
      element.setAttribute('aria-describedby', `${id}-description`);
    }

    const actionsHtml = options.actions?.length ? `
      <div class="modal-footer">
        ${options.actions.map((action, i) => `
          <button 
            type="button" 
            class="modal-action modal-action-${action.variant || 'secondary'}"
            data-action-index="${i}"
            ${action.disabled ? 'disabled' : ''}
          >
            ${action.label}
          </button>
        `).join('')}
      </div>
    ` : '';

    element.innerHTML = `
      <div class="modal-header">
        <h2 id="${id}-title" class="modal-title">${options.title}</h2>
        ${options.closable !== false ? `
          <button type="button" class="modal-close" aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        ` : ''}
      </div>
      <div id="${id}-description" class="modal-body">${options.content}</div>
      ${actionsHtml}
    `;

    const modalInstance: ModalInstance = {
      id,
      element,
      options,
      previousFocus: document.activeElement as HTMLElement,
      focusableElements: [],
      closeHandlers: [],
    };

    // Bind actions
    const actionButtons = element.querySelectorAll('.modal-action');
    actionButtons.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const action = options.actions![index];
        if (action.onClick) {
          const result = action.onClick();
          if (result instanceof Promise) {
            result.then(r => {
              if (action.closeOnClick !== false) this.close(id, r);
            });
          } else {
            if (action.closeOnClick !== false) this.close(id, result);
          }
        }
      });
    });

    // Close button
    const closeBtn = element.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close(id));
    }

    // Close on overlay click
    if (options.closable !== false) {
      element.addEventListener('click', (e) => {
        if (e.target === element) this.close(id);
      });
    }

    // Store resolve function
    modalInstance.closeHandlers.push(() => resolve(undefined));

    return modalInstance;
  }

  private trapFocus(modal: ModalInstance): void {
    // Find all focusable elements
    const focusable = modal.element.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    modal.focusableElements = Array.from(focusable);

    if (modal.focusableElements.length > 0) {
      modal.focusableElements[0].focus();
    }

    // Trap focus
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = modal.focusableElements;
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    modal.element.addEventListener('keydown', handleTab);
    modal.closeHandlers.push(() => modal.element.removeEventListener('keydown', handleTab));
  }

  private restoreFocusOnClose(modal: ModalInstance): void {
    modal.closeHandlers.push(() => {
      if (modal.previousFocus && document.body.contains(modal.previousFocus)) {
        modal.previousFocus.focus();
      }
    });
  }

  close(id: string, result?: any): void {
    const modal = this.modals.get(id);
    if (!modal) return;

    // Run close handlers
    modal.closeHandlers.forEach(h => h());

    // Animation
    modal.element.classList.add('modal-exit');
    this.overlay!.classList.remove('modal-overlay-visible');

    modal.element.addEventListener('animationend', () => {
      modal.element.remove();
      this.modals.delete(id);
      
      // Update overlay visibility
      if (this.modals.size === 0) {
        this.overlay!.classList.remove('modal-overlay-visible');
      }
    }, { once: true });

    // Resolve promise
    const handler = modal.closeHandlers.find(h => h.name === 'resolve');
    if (handler) handler(result);
  }

  closeTopModal(): void {
    const modals = Array.from(this.modals.values());
    if (modals.length > 0) {
      this.close(modals[modals.length - 1].id);
    }
  }

  closeAll(): void {
    Array.from(this.modals.keys()).forEach(id => this.close(id));
  }

  getOpenModals(): ModalInstance[] {
    return Array.from(this.modals.values());
  }

  isOpen(id: string): boolean {
    return this.modals.has(id);
  }

  getTopModal(): ModalInstance | null {
    const modals = Array.from(this.modals.values());
    return modals[modals.length - 1] || null;
  }

  private generateId(): string {
    return `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  mount(container: HTMLElement): void {
    this.container = container;
    container.className = 'modal-container';
  }
}