/**
 * ZyncPDF - Toast Manager (Fixed)
 * Non-intrusive notification system
 */

import { EventEmitter } from '../utils/event-emitter.js';

type ToastType = 'info' | 'success' | 'warning' | 'error' | 'loading';

interface ToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
  dismissible?: boolean;
  icon?: string;
}

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration: number;
  action?: { label: string; onClick: () => void };
  dismissible: boolean;
  createdAt: number;
  element?: HTMLElement;
  timer?: ReturnType<typeof setTimeout>;
}

const TOAST_ICONS: Record<ToastType, string> = {
  info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
  success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
  warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
  loading: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" class="spin"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>`,
};

export class ToastManager extends EventEmitter {
  private container: HTMLElement | null = null;
  private toasts: Map<string, Toast> = new Map();
  private maxToasts = 5;
  private defaultDuration = 5000;

  mount(container: HTMLElement): void {
    this.container = container;
    container.className = 'toast-container';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Notifications');
    container.setAttribute('aria-live', 'polite');
  }

  show(options: ToastOptions): string {
    if (!this.container) {
      console.warn('[ToastManager] Container not mounted');
      return '';
    }

    const id = this.generateId();
    const duration = options.duration ?? (options.type === 'loading' ? 0 : this.defaultDuration);

    const toast: Toast = {
      id,
      type: options.type ?? 'info',
      title: options.title,
      message: options.message,
      duration,
      action: options.action,
      dismissible: options.dismissible ?? true,
      createdAt: Date.now(),
    };

    this.toasts.set(id, toast);
    this.renderToast(toast);
    this.enforceMaxToasts();

    return id;
  }

  info(message: string, title?: string, duration?: number): string {
    return this.show({ type: 'info', message, title, duration });
  }

  success(message: string, title?: string, duration?: number): string {
    return this.show({ type: 'success', message, title, duration });
  }

  warning(message: string, title?: string, duration?: number): string {
    return this.show({ type: 'warning', message, title, duration });
  }

  error(message: string, title?: string, duration?: number): string {
    return this.show({ type: 'error', message, title, duration });
  }

  loading(message: string, title?: string): string {
    return this.show({ type: 'loading', message, title, duration: 0 });
  }

  update(id: string, options: Partial<ToastOptions>): void {
    const toast = this.toasts.get(id);
    if (!toast || !toast.element) return;

    if (options.message !== undefined) toast.message = options.message;
    if (options.title !== undefined) toast.title = options.title;
    if (options.type !== undefined) toast.type = options.type;

    this.renderToast(toast);
  }

  dismiss(id: string): void {
    const toast = this.toasts.get(id);
    if (!toast) return;

    this.removeToast(toast);
  }

  dismissAll(): void {
    this.toasts.forEach(toast => this.removeToast(toast));
  }

  private renderToast(toast: Toast): void {
    if (!this.container) return;

    let element = toast.element;
    const isNew = !element;

    if (isNew) {
      element = document.createElement('div');
      element.className = 'toast';
      element.setAttribute('role', 'alert');
      element.setAttribute('aria-live', 'assertive');
      toast.element = element;
    }

    element.className = `toast toast-${toast.type}`;
    element.dataset.toastId = toast.id;

    const progressWidth = toast.duration > 0 
      ? Math.max(0, ((toast.duration - (Date.now() - toast.createdAt)) / toast.duration) * 100)
      : 100;

    element.innerHTML = `
      <div class="toast-icon" aria-hidden="true">${TOAST_ICONS[toast.type]}</div>
      <div class="toast-content">
        ${toast.title ? `<div class="toast-title">${this.escapeHtml(toast.title)}</div>` : ''}
        <div class="toast-message">${this.escapeHtml(toast.message)}</div>
        ${toast.action ? `
          <button class="toast-action" type="button">${this.escapeHtml(toast.action.label)}</button>
        ` : ''}
      </div>
      ${toast.dismissible ? `
        <button class="toast-close" type="button" aria-label="Dismiss">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      ` : ''}
      ${toast.duration > 0 ? `
        <div class="toast-progress" role="progressbar" aria-valuenow="${progressWidth}" aria-valuemin="0" aria-valuemax="100" style="width: ${progressWidth}%"></div>
      ` : ''}
    `;

    if (isNew) {
      this.container!.appendChild(element);
      // Trigger entrance animation
      requestAnimationFrame(() => {
        element.classList.add('toast-enter');
      });
    }

    // Bind events
    const closeBtn = element.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.dismiss(toast.id));
    }

    const actionBtn = element.querySelector('.toast-action');
    if (actionBtn && toast.action) {
      actionBtn.addEventListener('click', () => {
        toast.action!.onClick();
        if (toast.action?.label) this.dismiss(toast.id);
      });
    }

    // Auto-dismiss timer
    if (toast.duration > 0) {
      if (toast.timer) clearTimeout(toast.timer);
      toast.timer = setTimeout(() => this.dismiss(toast.id), toast.duration);
    }
  }

  private removeToast(toast: Toast): void {
    if (toast.timer) clearTimeout(toast.timer);

    if (toast.element) {
      toast.element.classList.add('toast-exit');
      toast.element.addEventListener('animationend', () => {
        toast.element?.remove();
        this.toasts.delete(toast.id);
      }, { once: true });
    } else {
      this.toasts.delete(toast.id);
    }
  }

  private enforceMaxToasts(): void {
    if (this.toasts.size > this.maxToasts) {
      const oldest = Array.from(this.toasts.entries())
        .sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
      if (oldest) this.dismiss(oldest[0]);
    }
  }

  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}