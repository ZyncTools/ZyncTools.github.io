/**
 * ZyncPDF - Status Bar Component
 * Bottom status bar with page info, zoom, tool info, and quick actions
 */

import { ToolMode } from '../types/index.js';
import { EventEmitter } from '../utils/event-emitter.js';

export class StatusBar extends EventEmitter {
  private container: HTMLElement | null = null;
  private currentPage = 1;
  private totalPages = 1;
  private zoom = 1;
  private currentTool: ToolMode = 'select';
  private documentTitle = 'No document';
  private isModified = false;

  mount(container: HTMLElement): void {
    this.container = container;
    container.className = 'app-status-bar';
    this.render();
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="status-left">
        <span class="status-item status-document" id="status-document" title="${this.escapeHtml(this.documentTitle)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <span id="status-doc-title">${this.escapeHtml(this.documentTitle)}</span>
          ${this.isModified ? '<span class="status-modified" aria-label="Unsaved changes">●</span>' : ''}
        </span>
      </div>

      <div class="status-center">
        <div class="status-group status-page">
          <span class="status-label">Page</span>
          <span class="status-value" id="status-page">${this.currentPage}</span>
          <span class="status-separator">/</span>
          <span class="status-value" id="status-total-pages">${this.totalPages}</span>
        </div>
        <div class="status-divider"></div>
        <div class="status-group status-zoom">
          <span class="status-label">Zoom</span>
          <span class="status-value" id="status-zoom">${Math.round(this.zoom * 100)}%</span>
          <button class="status-zoom-btn" id="zoom-out" aria-label="Zoom out" title="Zoom out (⌘-)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          <button class="status-zoom-btn" id="zoom-in" aria-label="Zoom in" title="Zoom in (⌘=)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="status-right">
        <div class="status-group status-tool">
          <span class="status-label">Tool</span>
          <span class="status-value status-tool-name" id="status-tool">${this.getToolLabel(this.currentTool)}</span>
        </div>
        <div class="status-divider"></div>
        <div class="status-group status-coords" id="status-coords" hidden>
          <span class="status-label">X, Y</span>
          <span class="status-value" id="status-x">0</span>
          <span class="status-separator">,</span>
          <span class="status-value" id="status-y">0</span>
        </div>
        <div class="status-divider"></div>
        <div class="status-group status-encoding">
          <span class="status-value" id="status-encoding">UTF-8</span>
        </div>
        <div class="status-divider"></div>
        <div class="status-group status-line-ending">
          <span class="status-value" id="status-line-ending">LF</span>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.container) return;

    // Zoom buttons
    this.container.querySelector('#zoom-out')?.addEventListener('click', () => {
      this.emit('zoom:out');
    });

    this.container.querySelector('#zoom-in')?.addEventListener('click', () => {
      this.emit('zoom:in');
    });

    // Click on zoom to reset
    this.container.querySelector('.status-zoom')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.emit('zoom:reset');
      }
    });

    // Click on page to navigate
    this.container.querySelector('.status-page')?.addEventListener('click', () => {
      this.emit('page:goto');
    });
  }

  // Public API
  setPage(page: number, total?: number): void {
    this.currentPage = page;
    if (total !== undefined) this.totalPages = total;
    this.updatePageDisplay();
  }

  setTotalPages(total: number): void {
    this.totalPages = total;
    this.updatePageDisplay();
  }

  private updatePageDisplay(): void {
    const pageEl = this.container?.querySelector('#status-page');
    const totalEl = this.container?.querySelector('#status-total-pages');
    if (pageEl) pageEl.textContent = this.currentPage.toString();
    if (totalEl) totalEl.textContent = this.totalPages.toString();
  }

  setZoom(zoom: number): void {
    this.zoom = zoom;
    const zoomEl = this.container?.querySelector('#status-zoom');
    if (zoomEl) {
      zoomEl.textContent = `${Math.round(zoom * 100)}%`;
    }
  }

  setTool(tool: ToolMode): void {
    this.currentTool = tool;
    const toolEl = this.container?.querySelector('#status-tool');
    if (toolEl) {
      toolEl.textContent = this.getToolLabel(tool);
    }
  }

  setDocumentTitle(title: string): void {
    this.documentTitle = title;
    const titleEl = this.container?.querySelector('#status-doc-title');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  setModified(modified: boolean): void {
    this.isModified = modified;
    const modifiedEl = this.container?.querySelector('.status-modified');
    const docEl = this.container?.querySelector('#status-document');
    
    if (modified && !modifiedEl && docEl) {
      const modifiedSpan = document.createElement('span');
      modifiedSpan.className = 'status-modified';
      modifiedSpan.setAttribute('aria-label', 'Unsaved changes');
      modifiedSpan.textContent = '●';
      docEl.appendChild(modifiedSpan);
    } else if (!modified && modifiedEl) {
      modifiedEl.remove();
    }
  }

  setCoordinates(x: number, y: number): void {
    const coordsEl = this.container?.querySelector('#status-coords');
    const xEl = this.container?.querySelector('#status-x');
    const yEl = this.container?.querySelector('#status-y');
    
    if (coordsEl && xEl && yEl) {
      coordsEl.hidden = false;
      xEl.textContent = Math.round(x).toString();
      yEl.textContent = Math.round(y).toString();
    }
  }

  hideCoordinates(): void {
    const coordsEl = this.container?.querySelector('#status-coords');
    if (coordsEl) coordsEl.hidden = true;
  }

  setEncoding(encoding: string): void {
    const encodingEl = this.container?.querySelector('#status-encoding');
    if (encodingEl) encodingEl.textContent = encoding;
  }

  setLineEnding(ending: 'LF' | 'CRLF' | 'CR'): void {
    const endingEl = this.container?.querySelector('#status-line-ending');
    if (endingEl) endingEl.textContent = ending;
  }

  private getToolLabel(tool: ToolMode): string {
    const labels: Record<ToolMode, string> = {
      select: 'Select',
      pan: 'Pan',
      text: 'Text',
      highlight: 'Highlight',
      underline: 'Underline',
      strikethrough: 'Strikethrough',
      'sticky-note': 'Sticky Note',
      'text-box': 'Text Box',
      freehand: 'Freehand',
      rectangle: 'Rectangle',
      ellipse: 'Ellipse',
      line: 'Line',
      arrow: 'Arrow',
      signature: 'Signature',
      image: 'Image',
      eraser: 'Eraser',
    };
    return labels[tool] || tool;
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }
}