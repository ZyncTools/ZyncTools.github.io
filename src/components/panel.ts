/**
 * ZyncPDF - Right Panel Component
 * Properties, styles, layers, comments panel
 */

import { PDFDocument, Annotation, PanelTab, ToolOptions } from '../types/index.js';
import { EventEmitter } from '../utils/event-emitter.js';

export class Panel extends EventEmitter {
  private container: HTMLElement | null = null;
  private tabsContainer: HTMLElement | null = null;
  private contentContainer: HTMLElement | null = null;
  private resizer: HTMLElement | null = null;

  private document: PDFDocument | null = null;
  private activeTab: PanelTab = 'properties';
  private selectedAnnotation: Annotation | null = null;
  private isOpen = true;

  mount(container: HTMLElement): void {
    this.container = container;
    container.className = 'app-panel';
    this.render();
    this.bindEvents();
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="panel-tabs" role="tablist" aria-label="Property panels">
        <button 
          role="tab" 
          aria-selected="${this.activeTab === 'properties'}" 
          aria-controls="panel-properties"
          id="tab-properties"
          data-tab="properties"
          class="panel-tab ${this.activeTab === 'properties' ? 'active' : ''}"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Properties</span>
        </button>
        <button 
          role="tab" 
          aria-selected="${this.activeTab === 'styles'}" 
          aria-controls="panel-styles"
          id="tab-styles"
          data-tab="styles"
          class="panel-tab ${this.activeTab === 'styles' ? 'active' : ''}"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
          <span>Styles</span>
        </button>
        <button 
          role="tab" 
          aria-selected="${this.activeTab === 'layers'}" 
          aria-controls="panel-layers"
          id="tab-layers"
          data-tab="layers"
          class="panel-tab ${this.activeTab === 'layers' ? 'active' : ''}"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          <span>Layers</span>
        </button>
        <button 
          role="tab" 
          aria-selected="${this.activeTab === 'comments'}" 
          aria-controls="panel-comments"
          id="tab-comments"
          data-tab="comments"
          class="panel-tab ${this.activeTab === 'comments' ? 'active' : ''}"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Comments</span>
        </button>
      </div>
      
      <div class="panel-content" id="panel-content">
        ${this.renderPanel(this.activeTab)}
      </div>
    `;

    this.tabsContainer = this.container!.querySelector('.panel-tabs')!;
    this.contentContainer = this.container!.querySelector('#panel-content')!;
  }

  private renderPanel(tab: PanelTab): string {
    switch (tab) {
      case 'properties':
        return this.renderPropertiesPanel();
      case 'styles':
        return this.renderStylesPanel();
      case 'layers':
        return this.renderLayersPanel();
      case 'comments':
        return this.renderCommentsPanel();
      default:
        return '<div class="panel-empty">Select a panel</div>';
    }
  }

  private renderPropertiesPanel(): string {
    if (!this.selectedAnnotation) {
      return this.renderDocumentProperties();
    }
    return this.renderAnnotationProperties();
  }

  private renderDocumentProperties(): string {
    const doc = this.document;
    if (!doc) {
      return `
        <div class="panel properties-panel" id="panel-properties" role="tabpanel" aria-labelledby="tab-properties">
          <div class="panel-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <p>No document selected</p>
            <small>Open a PDF to see its properties</small>
          </div>
        </div>
      `;
    }

    return `
      <div class="panel properties-panel" id="panel-properties" role="tabpanel" aria-labelledby="tab-properties">
        <div class="panel-section">
          <h4>Document Info</h4>
          <div class="property-grid">
            <div class="property-item">
              <label>Title</label>
              <input type="text" value="${this.escapeHtml(doc.metadata.title || '')}" data-property="title" placeholder="Enter title">
            </div>
            <div class="property-item">
              <label>Author</label>
              <input type="text" value="${this.escapeHtml(doc.metadata.author || '')}" data-property="author" placeholder="Enter author">
            </div>
            <div class="property-item">
              <label>Subject</label>
              <input type="text" value="${this.escapeHtml(doc.metadata.subject || '')}" data-property="subject" placeholder="Enter subject">
            </div>
            <div class="property-item">
              <label>Keywords</label>
              <input type="text" value="${this.escapeHtml(doc.metadata.keywords?.join(', ') || '')}" data-property="keywords" placeholder="Enter keywords (comma separated)">
            </div>
          </div>
        </div>

        <div class="panel-section">
          <h4>File Information</h4>
          <div class="property-grid">
            <div class="property-item readonly">
              <label>File Name</label>
              <span>${this.escapeHtml(doc.originalName)}</span>
            </div>
            <div class="property-item readonly">
              <label>File Size</label>
              <span>${this.formatFileSize(doc.metadata.fileSize)}</span>
            </div>
            <div class="property-item readonly">
              <label>Page Count</label>
              <span>${doc.pageCount}</span>
            </div>
            <div class="property-item readonly">
              <label>PDF Version</label>
              <span>${doc.metadata.pdfVersion || 'Unknown'}</span>
            </div>
            <div class="property-item readonly">
              <label>Encrypted</label>
              <span>${doc.metadata.isEncrypted ? 'Yes' : 'No'}</span>
            </div>
            <div class="property-item readonly">
              <label>Created</label>
              <span>${doc.metadata.creationDate ? new Date(doc.metadata.creationDate).toLocaleString() : 'Unknown'}</span>
            </div>
            <div class="property-item readonly">
              <label>Modified</label>
              <span>${doc.metadata.modificationDate ? new Date(doc.metadata.modificationDate).toLocaleString() : 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div class="panel-section">
          <h4>Actions</h4>
          <div class="property-actions">
            <button class="btn btn-secondary" data-action="remove-metadata">Remove Metadata</button>
            <button class="btn btn-secondary" data-action="flatten">Flatten Document</button>
            <button class="btn btn-secondary" data-action="optimize">Optimize</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderAnnotationProperties(): string {
    if (!this.selectedAnnotation) return '';

    const ann = this.selectedAnnotation;
    return `
      <div class="panel properties-panel" id="panel-properties" role="tabpanel" aria-labelledby="tab-properties">
        <div class="panel-header-row">
          <h4>${this.getAnnotationTypeLabel(ann.type)} Properties</h4>
          <button class="btn-icon" data-action="delete-annotation" aria-label="Delete annotation">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>

        <div class="panel-section">
          <h4>General</h4>
          <div class="property-grid">
            <div class="property-item">
              <label>Type</label>
              <span class="annotation-type-badge">${this.getAnnotationTypeLabel(ann.type)}</span>
            </div>
            <div class="property-item">
              <label>Page</label>
              <span>${ann.pageNumber}</span>
            </div>
            <div class="property-item">
              <label>Author</label>
              <input type="text" value="${this.escapeHtml(ann.author)}" data-property="author">
            </div>
            <div class="property-item">
              <label>Created</label>
              <span>${new Date(ann.createdAt).toLocaleString()}</span>
            </div>
            <div class="property-item">
              <label>Modified</label>
              <span>${new Date(ann.updatedAt).toLocaleString()}</span>
            </div>
            <div class="property-item">
              <label>Locked</label>
              <input type="checkbox" ${ann.locked ? 'checked' : ''} data-property="locked">
            </div>
          </div>
        </div>

        ${this.renderTypeSpecificProperties(ann)}
      </div>
    `;
  }

  private renderTypeSpecificProperties(ann: Annotation): string {
    const data = ann.data;
    const type = ann.type;

    switch (type) {
      case 'highlight':
      case 'underline':
      case 'strikethrough':
        return `
          <div class="panel-section">
            <h4>Appearance</h4>
            <div class="property-grid">
              <div class="property-item">
                <label>Color</label>
                <div class="color-picker-wrapper">
                  <input type="color" value="${data.color || '#ffff00'}" data-property="color">
                  <span class="color-swatch" style="background: ${data.color || '#ffff00'}"></span>
                </div>
              </div>
              <div class="property-item">
                <label>Opacity</label>
                <input type="range" min="0" max="1" step="0.01" value="${data.opacity ?? 0.5}" data-property="opacity" class="slider">
                <span class="slider-value">${Math.round((data.opacity ?? 0.5) * 100)}%</span>
              </div>
            </div>
          </div>
        `;

      case 'sticky-note':
        return `
          <div class="panel-section">
            <h4>Note Content</h4>
            <div class="property-grid">
              <div class="property-item full-width">
                <label>Note</label>
                <textarea data-property="note" rows="4">${this.escapeHtml(data.note || '')}</textarea>
              </div>
            </div>
          </div>
          <div class="panel-section">
            <h4>Appearance</h4>
            <div class="property-grid">
              <div class="property-item">
                <label>Icon</label>
                <select data-property="icon">
                  <option value="note" ${data.icon === 'note' ? 'selected' : ''}>Note</option>
                  <option value="comment" ${data.icon === 'comment' ? 'selected' : ''}>Comment</option>
                  <option value="help" ${data.icon === 'help' ? 'selected' : ''}>Help</option>
                  <option value="insert" ${data.icon === 'insert' ? 'selected' : ''}>Insert</option>
                  <option value="key" ${data.icon === 'key' ? 'selected' : ''}>Key</option>
                  <option value="newparagraph" ${data.icon === 'newparagraph' ? 'selected' : ''}>New Paragraph</option>
                  <option value="paragraph" ${data.icon === 'paragraph' ? 'selected' : ''}>Paragraph</option>
                </select>
              </div>
              <div class="property-item">
                <label>Open by Default</label>
                <input type="checkbox" ${data.open ? 'checked' : ''} data-property="open">
              </div>
              <div class="property-item">
                <label>Color</label>
                <div class="color-picker-wrapper">
                  <input type="color" value="${data.color || '#fff3bf'}" data-property="color">
                  <span class="color-swatch" style="background: ${data.color || '#fff3bf'}"></span>
                </div>
              </div>
            </div>
          </div>
        `;

      case 'text-box':
        return `
          <div class="panel-section">
            <h4>Text Content</h4>
            <div class="property-grid">
              <div class="property-item full-width">
                <label>Text</label>
                <textarea data-property="content" rows="4">${this.escapeHtml(data.content || '')}</textarea>
              </div>
            </div>
          </div>
          <div class="panel-section">
            <h4>Text Style</h4>
            <div class="property-grid">
              <div class="property-item">
                <label>Font Family</label>
                <select data-property="fontFamily">
                  <option value="Helvetica" ${data.fontFamily === 'Helvetica' ? 'selected' : ''}>Helvetica</option>
                  <option value="Times-Roman" ${data.fontFamily === 'Times-Roman' ? 'selected' : ''}>Times Roman</option>
                  <option value="Courier" ${data.fontFamily === 'Courier' ? 'selected' : ''}>Courier</option>
                  <option value="system-ui" ${data.fontFamily === 'system-ui' ? 'selected' : ''}>System UI</option>
                </select>
              </div>
              <div class="property-item">
                <label>Font Size</label>
                <input type="number" min="6" max="72" step="1" value="${data.fontSize || 12}" data-property="fontSize" class="width-small">
              </div>
              <div class="property-item">
                <label>Font Color</label>
                <div class="color-picker-wrapper">
                  <input type="color" value="${data.fontColor || '#000000'}" data-property="fontColor">
                  <span class="color-swatch" style="background: ${data.fontColor || '#000000'}"></span>
                </div>
              </div>
              <div class="property-item">
                <label>Alignment</label>
                <select data-property="alignment">
                  <option value="left" ${data.alignment === 'left' ? 'selected' : ''}>Left</option>
                  <option value="center" ${data.alignment === 'center' ? 'selected' : ''}>Center</option>
                  <option value="right" ${data.alignment === 'right' ? 'selected' : ''}>Right</option>
                </select>
              </div>
            </div>
          </div>
          <div class="panel-section">
            <h4>Box Style</h4>
            <div class="property-grid">
              <div class="property-item">
                <label>Background</label>
                <div class="color-picker-wrapper">
                  <input type="color" value="${data.backgroundColor || 'transparent'}" data-property="backgroundColor">
                  <span class="color-swatch" style="background: ${data.backgroundColor || 'transparent'}"></span>
                </div>
              </div>
              <div class="property-item">
                <label>Border</label>
                <div class="color-picker-wrapper">
                  <input type="color" value="${data.borderColor || 'transparent'}" data-property="borderColor">
                  <span class="color-swatch" style="background: ${data.borderColor || 'transparent'}"></span>
                </div>
              </div>
              <div class="property-item">
                <label>Border Width</label>
                <input type="number" min="0" max="10" step="0.5" value="${data.borderWidth || 0}" data-property="borderWidth" class="width-small">
              </div>
              <div class="property-item">
                <label>Border Style</label>
                <select data-property="borderStyle">
                  <option value="solid" ${data.borderStyle === 'solid' ? 'selected' : ''}>Solid</option>
                  <option value="dashed" ${data.borderStyle === 'dashed' ? 'selected' : ''}>Dashed</option>
                  <option value="dotted" ${data.borderStyle === 'dotted' ? 'selected' : ''}>Dotted</option>
                </select>
              </div>
              <div class="property-item">
                <label>Padding</label>
                <input type="number" min="0" max="50" step="1" value="${data.padding || 8}" data-property="padding" class="width-small">
              </div>
            </div>
          </div>
        `;

      case 'freehand':
      case 'rectangle':
      case 'ellipse':
      case 'line':
      case 'arrow':
        return `
          <div class="panel-section">
            <h4>Stroke Style</h4>
            <div class="property-grid">
              <div class="property-item">
                <label>Color</label>
                <div class="color-picker-wrapper">
                  <input type="color" value="${data.strokeColor || data.color || '#000000'}" data-property="strokeColor">
                  <span class="color-swatch" style="background: ${data.strokeColor || data.color || '#000000'}"></span>
                </div>
              </div>
              <div class="property-item">
                <label>Width</label>
                <input type="number" min="0.5" max="20" step="0.5" value="${data.strokeWidth || data.lineWidth || 2}" data-property="strokeWidth" class="width-small">
              </div>
              <div class="property-item">
                <label>Style</label>
                <select data-property="strokeStyle">
                  <option value="solid" ${data.strokeStyle === 'solid' ? 'selected' : ''}>Solid</option>
                  <option value="dashed" ${data.strokeStyle === 'dashed' ? 'selected' : ''}>Dashed</option>
                  <option value="dotted" ${data.strokeStyle === 'dotted' ? 'selected' : ''}>Dotted</option>
                </select>
              </div>
              <div class="property-item">
                <label>Opacity</label>
                <input type="range" min="0" max="1" step="0.01" value="${data.opacity ?? 1}" data-property="opacity" class="slider">
                <span class="slider-value">${Math.round((data.opacity ?? 1) * 100)}%</span>
              </div>
              ${type === 'line' || type === 'arrow' ? `
                <div class="property-item">
                  <label>Start Arrow</label>
                  <input type="checkbox" ${data.startArrow ? 'checked' : ''} data-property="startArrow">
                </div>
                <div class="property-item">
                  <label>End Arrow</label>
                  <input type="checkbox" ${data.endArrow ? 'checked' : ''} data-property="endArrow">
                </div>
              ` : ''}
            </div>
          </div>
          ${type === 'rectangle' || type === 'ellipse' ? `
            <div class="panel-section">
              <h4>Fill Style</h4>
              <div class="property-grid">
                <div class="property-item">
                  <label>Fill Color</label>
                  <div class="color-picker-wrapper">
                    <input type="color" value="${data.fillColor || 'transparent'}" data-property="fillColor">
                    <span class="color-swatch" style="background: ${data.fillColor || 'transparent'}"></span>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}
        `;

      case 'signature':
        return `
          <div class="panel-section">
            <h4>Signature</h4>
            <div class="property-grid">
              <div class="property-item full-width">
                <label>Type</label>
                <select data-property="signatureType">
                  <option value="drawn" ${data.signatureType === 'drawn' ? 'selected' : ''}>Drawn</option>
                  <option value="typed" ${data.signatureType === 'typed' ? 'selected' : ''}>Typed</option>
                  <option value="image" ${data.signatureType === 'image' ? 'selected' : ''}>Image</option>
                </select>
              </div>
              ${data.signatureType === 'drawn' ? `
                <div class="property-item">
                  <label>Stroke Color</label>
                  <div class="color-picker-wrapper">
                    <input type="color" value="${data.strokeColor || '#000000'}" data-property="strokeColor">
                    <span class="color-swatch" style="background: ${data.strokeColor || '#000000'}"></span>
                  </div>
                </div>
                <div class="property-item">
                  <label>Stroke Width</label>
                  <input type="number" min="1" max="10" step="0.5" value="${data.strokeWidth || 2}" data-property="strokeWidth" class="width-small">
                </div>
              ` : ''}
              ${data.signatureType === 'typed' ? `
                <div class="property-item full-width">
                  <label>Name</label>
                  <input type="text" value="${data.content || ''}" data-property="content" placeholder="Type your name">
                </div>
                <div class="property-item">
                  <label>Font</label>
                  <select data-property="fontFamily">
                    <option value="cursive">Cursive</option>
                    <option value="serif">Serif</option>
                    <option value="sans-serif">Sans Serif</option>
                  </select>
                </div>
              ` : ''}
              ${data.signatureType === 'image' ? `
                <div class="property-item full-width">
                  <label>Signature Image</label>
                  <input type="file" accept="image/*" data-property="imageData">
                </div>
              ` : ''}
            </div>
          </div>
        `;

      case 'image':
        return `
          <div class="panel-section">
            <h4>Image</h4>
            <div class="property-grid">
              <div class="property-item full-width">
                <label>Image</label>
                <input type="file" accept="image/*" data-property="imageData">
              </div>
              ${data.imageWidth ? `
                <div class="property-item">
                  <label>Width</label>
                  <input type="number" value="${data.imageWidth}" data-property="imageWidth" class="width-small">
                </div>
                <div class="property-item">
                  <label>Height</label>
                  <input type="number" value="${data.imageHeight}" data-property="imageHeight" class="width-small">
                </div>
                <div class="property-item">
                  <label>Maintain Aspect Ratio</label>
                  <input type="checkbox" ${data.maintainAspectRatio !== false ? 'checked' : ''} data-property="maintainAspectRatio">
                </div>
              ` : ''}
            </div>
          </div>
        `;

      default:
        return '';
    }
  }

  private renderStylesPanel(): string {
    if (!this.selectedAnnotation) {
      return `
        <div class="panel styles-panel" id="panel-styles" role="tabpanel" aria-labelledby="tab-styles">
          <div class="panel-empty">
            <p>Select an annotation to edit its style</p>
          </div>
        </div>
      `;
    }

    const ann = this.selectedAnnotation;
    const data = ann.data;

    return `
      <div class="panel styles-panel" id="panel-styles" role="tabpanel" aria-labelledby="tab-styles">
        <div class="panel-header-row">
          <h4>Style: ${this.getAnnotationTypeLabel(ann.type)}</h4>
          <button class="btn-icon" data-action="reset-style" aria-label="Reset to default">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
          </button>
        </div>

        <div class="style-section">
          <h4>Color Palette</h4>
          <div class="color-palette">
            ${['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#000000', '#ffffff'].map(color => `
              <button class="color-swatch ${(data.color || data.strokeColor || data.fillColor) === color ? 'selected' : ''}" 
                      style="background: ${color}" 
                      data-color="${color}"
                      aria-label="Color ${color}"
                      title="${color}"></button>
            `).join('')}
            <button class="color-swatch custom-color" data-action="custom-color" aria-label="Custom color">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
        </div>

        <div class="style-section">
          <h4>Opacity</h4>
          <div class="slider-group">
            <input type="range" min="0" max="1" step="0.01" value="${data.opacity ?? 1}" data-property="opacity" class="slider">
            <span class="slider-value">${Math.round((data.opacity ?? 1) * 100)}%</span>
          </div>
        </div>

        ${this.hasStroke(ann.type) ? `
          <div class="style-section">
            <h4>Stroke Width</h4>
            <div class="slider-group">
              <input type="range" min="0.5" max="20" step="0.5" value="${data.strokeWidth || data.lineWidth || 2}" data-property="strokeWidth" class="slider">
              <span class="slider-value">${data.strokeWidth || data.lineWidth || 2}px</span>
            </div>
          </div>
        ` : ''}

        ${this.hasStroke(ann.type) ? `
          <div class="style-section">
            <h4>Stroke Style</h4>
            <div class="stroke-style-buttons">
              <button class="stroke-style-btn ${(data.strokeStyle || data.strokeStyle) === 'solid' ? 'selected' : ''}" data-style="solid" title="Solid">
                <svg width="20" height="4" viewBox="0 0 20 4"><line x1="0" y1="2" x2="20" y2="2" stroke="currentColor" stroke-width="2"/></svg>
              </button>
              <button class="stroke-style-btn ${(data.strokeStyle || data.strokeStyle) === 'dashed' ? 'selected' : ''}" data-style="dashed" title="Dashed">
                <svg width="20" height="4" viewBox="0 0 20 4"><line x1="0" y1="2" x2="20" y2="2" stroke="currentColor" stroke-width="2" stroke-dasharray="6,4"/></svg>
              </button>
              <button class="stroke-style-btn ${(data.strokeStyle || data.strokeStyle) === 'dotted' ? 'selected' : ''}" data-style="dotted" title="Dotted">
                <svg width="20" height="4" viewBox="0 0 20 4"><line x1="0" y1="2" x2="20" y2="2" stroke="currentColor" stroke-width="2" stroke-dasharray="2,4"/></svg>
              </button>
            </div>
          </div>
        ` : ''}

        ${ann.type === 'line' || ann.type === 'arrow' ? `
          <div class="style-section">
            <h4>Arrow Heads</h4>
            <div class="arrow-options">
              <label class="arrow-option">
                <input type="checkbox" ${data.startArrow ? 'checked' : ''} data-property="startArrow">
                <span>Start Arrow</span>
              </label>
              <label class="arrow-option">
                <input type="checkbox" ${data.endArrow ? 'checked' : ''} data-property="endArrow">
                <span>End Arrow</span>
              </label>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderLayersPanel(): string {
    return `
      <div class="panel layers-panel" id="panel-layers" role="tabpanel" aria-labelledby="tab-layers">
        <div class="panel-header-row">
          <h4>Layers</h4>
          <button class="btn-icon" data-action="add-layer" aria-label="Add layer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
        <div class="layers-list" id="layers-list" role="list" aria-label="Document layers">
          <div class="layer-group" data-group="page-content">
            <div class="layer-group-header" aria-expanded="true">
              <span class="layer-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline></svg></span>
              <span>Page Content</span>
              <div class="layer-actions">
                <button class="layer-action" data-action="toggle-visibility" aria-label="Toggle visibility"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
                <button class="layer-action" data-action="lock" aria-label="Lock"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></button>
              </div>
            </div>
          </div>
          <div class="layer-group" data-group="annotations">
            <div class="layer-group-header" aria-expanded="true">
              <span>Annotations</span>
              <div class="layer-actions">
                <button class="layer-action" data-action="toggle-visibility" aria-label="Toggle visibility"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderCommentsPanel(): string {
    return `
      <div class="panel comments-panel" id="panel-comments" role="tabpanel" aria-labelledby="tab-comments">
        <div class="panel-header-row">
          <h4>Comments</h4>
          <button class="btn-icon" data-action="add-comment" aria-label="Add comment">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </button>
        </div>
        <div class="comments-list" id="comments-list" role="list" aria-label="Document comments">
          <div class="panel-empty">
            <p>No comments yet</p>
            <small>Add comments to collaborate</small>
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
        this.setActiveTab(tab.getAttribute('data-tab') as PanelTab);
      }
    });

    // Property inputs
    this.container.addEventListener('change', (e) => {
      const target = e.target as HTMLElement;
      const property = target.getAttribute('data-property');
      if (property) {
        const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
        this.emit('property:change', { property, value });
      }

      const color = target.getAttribute('data-color');
      if (color) {
        this.emit('property:change', { property: 'color', value: color });
      }

      const style = target.getAttribute('data-style');
      if (style) {
        this.emit('property:change', { property: 'strokeStyle', value: style });
      }
    });

    // Range inputs
    this.container.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const property = target.getAttribute('data-property');
      if (property && target.type === 'range') {
        const value = parseFloat(target.value);
        this.emit('property:change', { property, value });
        
        // Update slider value display
        const valueDisplay = target.parentElement?.querySelector('.slider-value');
        if (valueDisplay) {
          if (property === 'opacity') {
            valueDisplay.textContent = `${Math.round(value * 100)}%`;
          } else {
            valueDisplay.textContent = `${value}${property === 'strokeWidth' ? 'px' : ''}`;
          }
        }
      }
    });

    // Action buttons
    this.container.addEventListener('click', (e) => {
      const actionBtn = (e.target as HTMLElement).closest('[data-action]');
      if (actionBtn) {
        const action = actionBtn.getAttribute('data-action');
        this.emit(`panel:${action}`);
      }
    });
  }

  setDocument(doc: PDFDocument | null): void {
    this.document = doc;
    if (!doc) {
      this.selectedAnnotation = null;
    }
    this.render();
  }

  setActiveTab(tab: PanelTab): void {
    this.activeTab = tab;
    
    this.container?.querySelectorAll('.panel-tab').forEach(btn => {
      const isActive = btn.getAttribute('data-tab') === tab;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive.toString());
    });

    this.container?.querySelectorAll('[role="tabpanel"]').forEach(panel => {
      panel.hidden = panel.id !== `panel-${tab}`;
    });

    this.activeTab = tab;
  }

  setSelectedAnnotation(annotation: Annotation | null): void {
    this.selectedAnnotation = annotation;
    if (this.activeTab === 'properties' || this.activeTab === 'styles') {
      this.render();
    }
  }

  private getAnnotationTypeLabel(type: string): string {
    const labels: Record<string, string> = {
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
      stamp: 'Stamp',
    };
    return labels[type] || type;
  }

  private hasStroke(type: string): boolean {
    return ['freehand', 'rectangle', 'ellipse', 'line', 'arrow', 'signature'].includes(type);
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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