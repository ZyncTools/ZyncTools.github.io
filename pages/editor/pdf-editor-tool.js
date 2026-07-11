/**
 * @file PDF Editor Tool
 * Edit text directly in PDF documents
 * @module pages/editor/pdf-editor-tool
 */

import { createFileInput, triggerFileInput, downloadBlob } from '../../../utils/file.js';
import { createDropZone } from '../../../utils/ui.js';
import { createProgress } from '../../../utils/ui.js';
import { createToolbar } from '../../../components/toolbar.js';
import { showToast, showSuccess, showError, showInfo, showLoading } from '../../../components/toast.js';
import { loadPDFDocument, renderPDFPageToBlob } from '../../../utils/pdf.js';
import { addToHistory, addRecentFile } from '../../../utils/history.js';

/**
 * PDF Editor Tool Component
 */
export class PDFEditorTool {
  constructor({ tool, state, utils }) {
    this.tool = tool;
    this.state = state;
    this.utils = utils;
    this.file = null;
    this.pdfDoc = null;
    this.pages = [];
    this.currentPage = 0;
    this.zoom = 1;
    this.isEditing = false;
    this.toolbar = null;
    this.container = null;
    this.textElements = [];
    this.history = [];
    this.historyIndex = -1;
  }
  
  async render() {
    this.container = document.getElementById('app');
    this.container.innerHTML = this.getHTML();
    
    this.bindElements();
    this.bindEvents();
    this.initDropZone();
    this.initToolbar();
    this.initEditor();
  }
  
  getHTML() {
    return `
      <div class="tool-page pdf-editor-tool">
        <header class="tool-header">
          <div class="tool-header-content">
            <div class="tool-icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
              </svg>
            </div>
            <div class="tool-info">
              <h1>PDF Text Editor</h1>
              <p>Click on any text to edit, then save as PDF</p>
            </div>
          </div>
          <div class="tool-actions" id="tool-toolbar"></div>
        </header>
        
        <main class="tool-main">
          <section class="upload-section" id="upload-section" aria-label="File upload">
            <div class="upload-area" id="upload-area" role="button" tabindex="0" aria-label="Drop PDF file here or click to browse">
              <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="22" y2="13"></line>
                  <line x1="16" y1="17" x2="22" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <h2>Drop PDF file here</h2>
              <p>or click to browse</p>
              <p class="upload-hint">Single file • Max 500MB</p>
            </div>
          </section>
          
          <section class="editor-section" id="editor-section" hidden aria-label="PDF Editor">
            <div class="editor-header">
              <div class="editor-toolbar" id="editor-toolbar"></div>
              <div class="editor-nav" id="editor-nav">
                <button class="btn btn-secondary" id="prev-page" aria-label="Previous page" disabled>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <span class="page-indicator" id="page-indicator">Page 1 of 1</span>
                <button class="btn btn-secondary" id="next-page" aria-label="Next page" disabled>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
                <div class="zoom-controls">
                  <button class="btn btn-secondary" id="zoom-out" aria-label="Zoom out"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg></button>
                  <span id="zoom-level">100%</span>
                  <button class="btn btn-secondary" id="zoom-in" aria-label="Zoom in"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg></button>
                </div>
              </div>
            </div>
            
            <div class="editor-canvas-container" id="canvas-container">
              <canvas id="pdf-canvas" class="pdf-canvas"></canvas>
              <div class="text-layer" id="text-layer"></div>
            </div>
          </section>
          
          <section class="editor-progress" id="progress-section" hidden aria-live="polite">
            <h3 class="sr-only">Processing</h3>
            <div class="progress-container" id="progress-container"></div>
          </section>
          
          <section class="editor-results" id="results-section" hidden>
            <div class="results-container" id="results-container"></div>
          </section>
        </main>
      </div>
    `;
  }
  
  bindElements() {
    this.uploadArea = this.container.querySelector('#upload-area');
    this.uploadSection = this.container.querySelector('#upload-section');
    this.editorSection = this.container.querySelector('#editor-section');
    this.progressSection = this.container.querySelector('#progress-section');
    this.progressContainer = this.container.querySelector('#progress-container');
    this.resultsSection = this.container.querySelector('#results-section');
    this.resultsContainer = this.container.querySelector('#results-container');
    this.toolbarContainer = this.container.querySelector('#tool-toolbar');
    this.canvas = this.container.querySelector('#pdf-canvas');
    this.textLayer = this.container.querySelector('#text-layer');
    this.canvasContainer = this.container.querySelector('#canvas-container');
    this.pageIndicator = this.container.querySelector('#page-indicator');
    this.prevPageBtn = this.container.querySelector('#prev-page');
    this.nextPageBtn = this.container.querySelector('#next-page');
    this.zoomInBtn = this.container.querySelector('#zoom-in');
    this.zoomOutBtn = this.container.querySelector('#zoom-out');
    this.zoomLevel = this.container.querySelector('#zoom-level');
  }
  
  bindEvents() {
    const fileInput = createFileInput({
      accept: '.pdf',
      multiple: false,
      onChange: (files) => this.handleFile(files[0])
    });
    this.container.appendChild(fileInput);
    this.fileInput = fileInput;
    
    this.uploadArea.addEventListener('click', () => triggerFileInput(this.fileInput));
    this.uploadArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerFileInput(this.fileInput);
      }
    });
    
    // Navigation
    this.prevPageBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
    this.nextPageBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
    this.zoomInBtn.addEventListener('click', () => this.setZoom(this.zoom * 1.25));
    this.zoomOutBtn.addEventListener('click', () => this.setZoom(this.zoom / 1.25));
    
    // Keyboard shortcuts
    this.handleKeyDown = (e) => this.onKeyDown(e);
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Canvas click for text editing
    this.textLayer.addEventListener('click', (e) => this.onTextClick(e));
    this.textLayer.addEventListener('dblclick', (e) => this.onTextDoubleClick(e));
    
    // Toolbar
    this.toolbar = createToolbar({
      items: [
        { id: 'undo', label: 'Undo', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>', onClick: () => this.undo(), disabled: true, tooltip: 'Undo (Ctrl+Z)' },
        { id: 'redo', label: 'Redo', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path></svg>', onClick: () => this.redo(), disabled: true, tooltip: 'Redo (Ctrl+Y)' },
        { type: 'divider' },
        { id: 'save-btn', label: 'Save PDF', variant: 'primary', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>', onClick: () => this.savePDF(), disabled: true, tooltip: 'Save PDF (Ctrl+S)' },
        { type: 'divider' },
        { id: 'reset-btn', label: 'Reset', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>', onClick: () => this.resetDocument(), disabled: true, tooltip: 'Reset changes' }
      ],
      ariaLabel: 'PDF Editor actions'
    });
    this.toolbarContainer.appendChild(this.toolbar);
  }
  
  initDropZone() {
    createDropZone({
      element: this.uploadArea,
      accept: ['application/pdf'],
      multiple: false,
      onFiles: (files) => this.handleFile(files[0])
    });
  }
  
  initToolbar() {}
  
  initEditor() {
    this.ctx = this.canvas.getContext('2d');
  }
  
  async handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
      if (file && !file.name.toLowerCase().endsWith('.pdf')) {
        showError('Please select a PDF file');
        return;
      }
    }
    
    this.showUploadLoading(true);
    
    try {
      this.pdfDoc = await loadPDFDocument(file);
      this.pages = [];
      
      for (let i = 0; i < this.pdfDoc.numPages; i++) {
        const page = await this.pdfDoc.getPage(i + 1);
        this.pages.push(page);
      }
      
      this.file = file;
      this.currentPage = 0;
      this.zoom = 1;
      this.textElements = [];
      this.history = [];
      this.historyIndex = -1;
      
      this.showUploadLoading(false);
      this.showEditor();
      this.renderPage(0);
      this.updateNavButtons();
      
      showSuccess('PDF loaded successfully');
      
    } catch (error) {
      console.error('Failed to load PDF:', error);
      this.showUploadLoading(false);
      showError(`Failed to load PDF: ${error.message}`);
    }
  }
  
  async renderPage(pageNum) {
    if (pageNum < 0 || pageNum >= this.pages.length) return;
    
    this.currentPage = pageNum;
    const page = this.pages[pageNum];
    
    // Render page to canvas
    const viewport = page.getViewport({ scale: this.zoom });
    this.canvas.width = viewport.width;
    this.canvas.height = viewport.height;
    this.canvas.style.width = `${viewport.width}px`;
    this.canvas.style.height = `${viewport.height}px`;
    
    await page.render({ canvasContext: this.ctx, viewport }).promise;
    
    // Render text layer
    this.renderTextLayer(page, viewport);
    
    // Update page indicator
    this.pageIndicator.textContent = `Page ${pageNum + 1} of ${this.pages.length}`;
    this.updateNavButtons();
    this.updateZoomDisplay();
  }
  
  async renderTextLayer(page, viewport) {
    this.textLayer.innerHTML = '';
    this.textLayer.style.width = `${viewport.width}px`;
    this.textLayer.style.height = `${viewport.height}px`;
    
    const textContent = await page.getTextContent();
    
    textContent.items.forEach((item, index) => {
      const span = document.createElement('span');
      span.className = 'text-item';
      span.textContent = item.str;
      span.dataset.index = index;
      span.dataset.page = this.currentPage;
      span.style.left = `${item.transform[4]}px`;
      span.style.top = `${viewport.height - item.transform[5] - item.height}px`;
      span.style.fontSize = `${item.height}px`;
      span.style.fontFamily = item.fontName || 'sans-serif';
      span.style.transform = `scaleX(${item.transform[0]}) scaleY(${item.transform[3]})`;
      span.style.transformOrigin = '0 0';
      
      this.textLayer.appendChild(span);
    });
    
    this.textElements = Array.from(this.textLayer.querySelectorAll('.text-item'));
  }
  
  onTextClick(e) {
    const textItem = e.target.closest('.text-item');
    if (!textItem) return;
    
    if (this.isEditing) return;
    this.startEditing(textItem);
  }
  
  onTextDoubleClick(e) {
    const textItem = e.target.closest('.text-item');
    if (!textItem) return;
    
    this.startEditing(textItem);
  }
  
  startEditing(textItem) {
    this.isEditing = true;
    const originalText = textItem.textContent;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.className = 'text-editor-input';
    input.style.left = textItem.style.left;
    input.style.top = textItem.style.top;
    input.style.fontSize = textItem.style.fontSize;
    input.style.fontFamily = textItem.style.fontFamily;
    input.style.transform = textItem.style.transform;
    input.style.transformOrigin = '0 0';
    input.style.width = `${textItem.offsetWidth}px`;
    
    this.textLayer.replaceChild(input, textItem);
    input.focus();
    input.select();
    
    const finishEditing = () => {
      const newText = input.value.trim();
      if (newText && newText !== originalText) {
        this.recordChange(textItem, originalText, newText);
        textItem.textContent = newText;
      }
      if (input.parentNode) {
        this.textLayer.replaceChild(textItem, input);
      }
      this.isEditing = false;
    };
    
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finishEditing();
      if (e.key === 'Escape') {
        this.textLayer.replaceChild(textItem, input);
        this.isEditing = false;
      }
    });
  }
  
  recordChange(element, oldText, newText) {
    // Trim history after current index
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({ element, oldText, newText });
    this.historyIndex = this.history.length - 1;
    
    this.updateUndoRedoButtons();
  }
  
  undo() {
    if (this.historyIndex < 0) return;
    
    const change = this.history[this.historyIndex];
    change.element.textContent = change.oldText;
    this.historyIndex--;
    this.updateUndoRedoButtons();
    showInfo('Undo');
  }
  
  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    
    this.historyIndex++;
    const change = this.history[this.historyIndex];
    change.element.textContent = change.newText;
    this.updateUndoRedoButtons();
    showInfo('Redo');
  }
  
  updateUndoRedoButtons() {
    this.toolbar.setItemDisabled('undo', this.historyIndex < 0);
    this.toolbar.setItemDisabled('redo', this.historyIndex >= this.history.length - 1);
  }
  
  async savePDF() {
    if (!this.pdfDoc) return;
    
    const loadingToast = showLoading('Saving PDF...');
    
    try {
      // Apply text changes to PDF
      // This is a simplified version - full implementation would need PDF-lib
      
      const pdfBytes = await this.pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      const baseName = this.file.name.replace(/\.pdf$/i, '');
      const filename = `${baseName}-edited.pdf`;
      
      downloadBlob(blob, filename);
      
      addToHistory({
        tool: this.tool.id,
        title: `Edited ${this.file.name}`,
        files: [{ name: this.file.name, size: this.file.size, type: this.file.type }],
        options: {},
        results: [{ name: filename, size: blob.size, type: 'application/pdf' }],
        duration: 0
      });
      
      addRecentFile({
        name: this.file.name,
        size: this.file.size,
        type: this.file.type,
        tool: this.tool.id
      });
      
      loadingToast();
      showSuccess(`Saved as ${filename}`);
      
    } catch (error) {
      console.error('Save failed:', error);
      loadingToast();
      showError(`Save failed: ${error.message}`);
    }
  }
  
  resetDocument() {
    if (confirm('Reset all changes?')) {
      this.history = [];
      this.historyIndex = -1;
      this.updateUndoRedoButtons();
      
      // Re-render current page
      this.renderPage(this.currentPage);
      showInfo('Document reset');
    }
  }
  
  goToPage(pageNum) {
    if (pageNum >= 0 && pageNum < this.pages.length) {
      this.renderPage(pageNum);
    }
  }
  
  setZoom(newZoom) {
    this.zoom = Math.max(0.25, Math.min(4, newZoom));
    this.renderPage(this.currentPage);
  }
  
  updateZoomDisplay() {
    this.zoomLevel.textContent = `${Math.round(this.zoom * 100)}%`;
  }
  
  updateNavButtons() {
    this.prevPageBtn.disabled = this.currentPage === 0;
    this.nextPageBtn.disabled = this.currentPage === this.pages.length - 1;
  }
  
  showUploadLoading(show) {
    this.uploadArea.classList.toggle('loading', show);
    if (show) {
      this.uploadArea.innerHTML = `
        <div class="spinner"></div>
        <p>Loading PDF...</p>
      `;
    }
  }
  
  showEditor() {
    this.uploadSection.hidden = true;
    this.editorSection.hidden = false;
    this.toolbar.setItemDisabled('save-btn', false);
    this.toolbar.setItemDisabled('reset-btn', false);
  }
  
  onKeyDown(e) {
    // Ctrl+Z / Cmd+Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
    }
    
    // Ctrl+Y / Cmd+Shift+Z for redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      this.redo();
    }
    
    // Ctrl+S / Cmd+S for save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      this.savePDF();
    }
    
    // Arrow keys for navigation
    if (e.key === 'ArrowLeft' && e.ctrlKey) {
      e.preventDefault();
      this.goToPage(this.currentPage - 1);
    }
    
    if (e.key === 'ArrowRight' && e.ctrlKey) {
      e.preventDefault();
      this.goToPage(this.currentPage + 1);
    }
    
    // Zoom
    if (e.key === '=' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.setZoom(this.zoom * 1.25);
    }
    
    if (e.key === '-' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.setZoom(this.zoom / 1.25);
    }
    
    if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.setZoom(1);
    }
  }
  
  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.toolbar?.destroy();
    this.fileInput?.remove();
    this.container.innerHTML = '';
  }
}

export default PDFEditorTool;