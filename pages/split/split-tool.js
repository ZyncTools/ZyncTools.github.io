/**
 * @file Split PDF Tool
 * Split PDF files by pages or ranges with visual page selector
 * @module pages/split/split-tool
 */

import { createFileInput, triggerFileInput, downloadBlob, downloadAsZip } from '../../../utils/file.js';
import { createDropZone } from '../../../utils/ui.js';
import { createProgress } from '../../../utils/ui.js';
import { createToolbar } from '../../../components/toolbar.js';
import { showToast, showSuccess, showError, showInfo, showLoading } from '../../../components/toast.js';
import { splitPDFByRanges } from '../../../utils/pdf.js';
import { addToHistory, addRecentFile } from '../../../utils/history.js';

/**
 * Split PDF Tool Component
 */
export class SplitPDFTool {
  constructor({ tool, state, utils }) {
    this.tool = tool;
    this.state = state;
    this.utils = utils;
    this.file = null;
    this.pdfDoc = null;
    this.pages = [];
    this.splitMethod = 'pages';
    this.pageRanges = '';
    this.toolbar = null;
    this.container = null;
    this.splitBtn = null;
  }
  
  async render() {
    this.container = document.getElementById('app');
    this.container.innerHTML = this.getHTML();
    
    this.bindElements();
    this.bindEvents();
    this.initDropZone();
    this.initToolbar();
  }
  
  getHTML() {
    return `
      <div class="tool-page split-pdf-tool">
        <header class="tool-header">
          <div class="tool-header-content">
            <div class="tool-icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="22" y2="13"></line>
                <line x1="16" y1="17" x2="22" y2="17"></line>
                <line x1="10" y1="9" x2="10" y2="9"></line>
              </svg>
            </div>
            <div class="tool-info">
              <h1>Split PDF</h1>
              <p>Split PDF into separate files or extract page ranges</p>
            </div>
          </div>
          <div class="tool-actions" id="tool-toolbar"></div>
        </header>
        
        <main class="tool-main">
          <section class="upload-section" aria-label="File upload">
            <div class="upload-area" id="upload-area" role="button" tabindex="0" aria-label="Drop PDF file here or click to browse">
              <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </div>
              <h2>Drop PDF file here</h2>
              <p>or click to browse</p>
              <p class="upload-hint">Single file • Max 500MB</p>
            </div>
            
            <div class="file-preview" id="file-preview" hidden>
              <div class="file-info">
                <div class="file-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
                <div class="file-details">
                  <span class="file-name" id="preview-name"></span>
                  <span class="file-meta" id="preview-meta"></span>
                </div>
              </div>
              <button class="btn btn-secondary" id="clear-file">Remove</button>
            </div>
          </section>
          
          <section class="options-section" id="options-section" hidden aria-label="Split options">
            <h2>Split Options</h2>
            
            <div class="split-method-tabs" role="tablist" aria-label="Split method">
              <button class="tab-btn active" role="tab" aria-selected="true" data-method="pages" id="tab-pages">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg>
                <span>Every N Pages</span>
              </button>
              <button class="tab-btn" role="tab" aria-selected="false" data-method="ranges" id="tab-ranges">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>
                <span>Page Ranges</span>
              </button>
              <button class="tab-btn" role="tab" aria-selected="false" data-method="extract" id="tab-extract">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>
                <span>Extract Pages</span>
              </button>
            </div>
            
            <div class="tab-panels">
              <div class="tab-panel active" id="panel-pages" role="tabpanel" aria-labelledby="tab-pages">
                <div class="option-group">
                  <label class="option-label">
                    <span class="label-main">Pages per file</span>
                    <span class="label-desc">Number of pages in each output file</span>
                  </label>
                  <input type="number" id="pages-per-file" class="input" value="1" min="1" max="999" aria-label="Pages per file">
                </div>
              </div>
              
              <div class="tab-panel" id="panel-ranges" role="tabpanel" aria-labelledby="tab-ranges" hidden>
                <div class="option-group">
                  <label class="option-label">
                    <span class="label-main">Page ranges</span>
                    <span class="label-desc">Enter ranges like: 1-3, 5, 7-9 (one per line or comma separated)</span>
                  </label>
                  <textarea id="page-ranges" class="input textarea" rows="4" placeholder="1-3&#10;5&#10;7-9" aria-label="Page ranges"></textarea>
                </div>
              </div>
              
              <div class="tab-panel" id="panel-extract" role="tabpanel" aria-labelledby="tab-extract" hidden>
                <div class="option-group">
                  <label class="option-label">
                    <span class="label-main">Pages to extract</span>
                    <span class="label-desc">Enter page numbers: 1, 3, 5-7 (comma separated)</span>
                  </label>
                  <input type="text" id="extract-pages" class="input" placeholder="1, 3, 5-7" aria-label="Pages to extract">
                </div>
                <div class="option-group">
                  <label class="option-label checkbox-label">
                    <input type="checkbox" id="extract-single" checked>
                    <span>Create single PDF with selected pages</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div class="split-options">
              <label class="option-label checkbox-label">
                <input type="checkbox" id="option-bookmarks" checked>
                <span>Preserve bookmarks</span>
              </label>
              <label class="option-label checkbox-label">
                <input type="checkbox" id="option-forms" checked>
                <span>Preserve form fields</span>
              </label>
            </div>
          </section>
          
          <section class="pages-preview-section" id="pages-preview-section" hidden aria-label="Page preview">
            <div class="preview-header">
              <h3>PDF Pages (<span id="total-pages">0</span>)</h3>
              <div class="preview-actions">
                <button class="btn btn-secondary btn-sm" id="select-all">Select All</button>
                <button class="btn btn-secondary btn-sm" id="deselect-all">Deselect All</button>
              </div>
            </div>
            <div class="pages-grid" id="pages-grid" role="listbox" aria-label="Page thumbnails"></div>
          </section>
          
          <section class="progress-section" id="progress-section" hidden aria-live="polite">
            <h3 class="sr-only">Processing</h3>
            <div class="progress-container" id="progress-container"></div>
          </section>
          
          <section class="results-section" id="results-section" hidden>
            <div class="results-container" id="results-container"></div>
          </section>
        </main>
      </div>
    `;
  }
  
  bindElements() {
    this.uploadArea = this.container.querySelector('#upload-area');
    this.filePreview = this.container.querySelector('#file-preview');
    this.previewName = this.container.querySelector('#preview-name');
    this.previewMeta = this.container.querySelector('#preview-meta');
    this.clearFileBtn = this.container.querySelector('#clear-file');
    this.optionsSection = this.container.querySelector('#options-section');
    this.pagesPreviewSection = this.container.querySelector('#pages-preview-section');
    this.totalPages = this.container.querySelector('#total-pages');
    this.pagesGrid = this.container.querySelector('#pages-grid');
    this.selectAllBtn = this.container.querySelector('#select-all');
    this.deselectAllBtn = this.container.querySelector('#deselect-all');
    this.progressSection = this.container.querySelector('#progress-section');
    this.progressContainer = this.container.querySelector('#progress-container');
    this.resultsSection = this.container.querySelector('#results-section');
    this.resultsContainer = this.container.querySelector('#results-container');
    this.toolbarContainer = this.container.querySelector('#tool-toolbar');
    
    // Split method tabs
    this.tabBtns = this.container.querySelectorAll('.tab-btn');
    this.tabPanels = this.container.querySelectorAll('.tab-panel');
    
    // Form inputs
    this.pagesPerFile = this.container.querySelector('#pages-per-file');
    this.pageRanges = this.container.querySelector('#page-ranges');
    this.extractPages = this.container.querySelector('#extract-pages');
    this.extractSingle = this.container.querySelector('#extract-single');
    this.optionBookmarks = this.container.querySelector('#option-bookmarks');
    this.optionForms = this.container.querySelector('#option-forms');
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
    
    this.clearFileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearFile();
    });
    
    // Tab switching
    this.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.method));
    });
    
    // Page selection
    this.selectAllBtn.addEventListener('click', () => this.selectAllPages());
    this.deselectAllBtn.addEventListener('click', () => this.deselectAllPages());
    
    // Toolbar
    this.splitBtn = this.toolbar.getItem('split-btn');
  }
  
  initDropZone() {
    createDropZone({
      element: this.uploadArea,
      accept: ['application/pdf'],
      multiple: false,
      onFiles: (files) => this.handleFile(files[0])
    });
  }
  
  initToolbar() {
    this.toolbar = createToolbar({
      items: [
        { id: 'clear', label: 'Clear', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>', onClick: () => this.clearFile(), tooltip: 'Clear file' },
        { type: 'divider' },
        { id: 'split-btn', label: 'Split PDF', variant: 'primary', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>', onClick: () => this.splitPDF(), disabled: true }
      ],
      ariaLabel: 'Split PDF actions'
    });
    this.toolbarContainer.appendChild(this.toolbar);
  }
  
  async handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
      showError('Please select a PDF file');
      return;
    }
    
    this.showLoading(true);
    
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';
      
      const arrayBuffer = await file.arrayBuffer();
      this.pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      this.file = file;
      
      // Load page thumbnails
      this.pages = [];
      for (let i = 1; i <= this.pdfDoc.numPages; i++) {
        const page = await this.pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        this.pages.push({ pageNum: i, canvas, viewport });
      }
      
      this.file = file;
      this.showFilePreview();
      this.renderPageThumbnails();
      this.optionsSection.hidden = false;
      this.pagesPreviewSection.hidden = false;
      this.totalPages.textContent = this.pdfDoc.numPages;
      
      showSuccess('PDF loaded successfully');
      
    } catch (error) {
      console.error('Failed to load PDF:', error);
      showError(`Failed to load PDF: ${error.message}`);
    } finally {
      this.showLoading(false);
    }
  }
  
  showFilePreview() {
    this.uploadArea.hidden = true;
    this.filePreview.hidden = false;
    this.previewName.textContent = this.file.name;
    this.previewMeta.textContent = `${this.utils.file.formatFileSize(this.file.size)} • ${this.pdfDoc.numPages} pages`;
  }
  
  clearFile() {
    this.file = null;
    this.pdfDoc = null;
    this.pages = [];
    this.fileInput.value = '';
    this.uploadArea.hidden = false;
    this.filePreview.hidden = true;
    this.optionsSection.hidden = true;
    this.pagesPreviewSection.hidden = true;
    this.pagesPreviewSection.hidden = true;
    this.resultsSection.hidden = true;
    this.toolbar.setItemDisabled('split-btn', true);
    showInfo('File cleared');
  }
  
  switchTab(method) {
    this.splitMethod = method;
    
    this.tabBtns.forEach(btn => {
      const isActive = btn.dataset.method === method;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });
    
    this.tabPanels.forEach(panel => {
      const isActive = panel.id === `panel-${method}`;
      panel.hidden = !isActive;
    });
  }
  
  renderPageThumbnails() {
    this.pagesGrid.innerHTML = this.pages.map((page, index) => `
      <div class="page-thumbnail ${index === 0 ? 'selected' : ''}" 
           data-page="${page.pageNum}" 
           role="option" 
           aria-selected="${index === 0}"
           tabindex="0">
        <div class="thumbnail-wrapper">
          <canvas width="${page.canvas.width}" height="${page.canvas.height}"></canvas>
        </div>
        <div class="page-number">Page ${page.pageNum}</div>
        <div class="page-checkbox" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
      </div>
    `).join('');
    
    // Copy canvas content
    this.pages.forEach((page, index) => {
      const canvas = this.pagesGrid.querySelectorAll('canvas')[index];
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.drawImage(page.canvas, 0, 0);
      }
    });
    
    // Bind click events
    this.pagesGrid.querySelectorAll('.page-thumbnail').forEach(thumb => {
      thumb.addEventListener('click', () => this.togglePageSelection(thumb));
      thumb.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.togglePageSelection(thumb);
        }
      });
    });
  }
  
  togglePageSelection(thumb) {
    const pageNum = parseInt(thumb.dataset.page, 10);
    thumb.classList.toggle('selected');
    thumb.setAttribute('aria-selected', thumb.classList.contains('selected'));
  }
  
  selectAllPages() {
    this.pagesGrid.querySelectorAll('.page-thumbnail').forEach(thumb => {
      thumb.classList.add('selected');
      thumb.setAttribute('aria-selected', 'true');
    });
  }
  
  deselectAllPages() {
    this.pagesGrid.querySelectorAll('.page-thumbnail').forEach(thumb => {
      thumb.classList.remove('selected');
      thumb.setAttribute('aria-selected', 'false');
    });
  }
  
  getSelectedPages() {
    return Array.from(this.pagesGrid.querySelectorAll('.page-thumbnail.selected'))
      .map(thumb => parseInt(thumb.dataset.page, 10))
      .sort((a, b) => a - b);
  }
  
  parsePageRanges(input) {
    if (!input.trim()) return [];
    
    const pages = new Set();
    const parts = input.split(/[\n,]+/);
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(n => parseInt(n.trim(), 10));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
            if (i >= 1 && i <= this.pdfDoc.numPages) pages.add(i);
          }
        }
      } else {
        const num = parseInt(trimmed, 10);
        if (!isNaN(num) && num >= 1 && num <= this.pdfDoc.numPages) {
          pages.add(num);
        }
      }
    }
    
    return Array.from(pages).sort((a, b) => a - b);
  }
  
  async splitPDF() {
    if (!this.pdfDoc) {
      showError('Please load a PDF first');
      return;
    }
    
    const totalPages = this.pdfDoc.numPages;
    let ranges = [];
    
    switch (this.splitMethod) {
      case 'pages':
        const perFile = parseInt(this.pagesPerFile.value, 10);
        if (isNaN(perFile) || perFile < 1) {
          showError('Please enter a valid number of pages per file');
          return;
        }
        for (let i = 1; i <= totalPages; i += perFile) {
          ranges.push([i, Math.min(i + perFile - 1, totalPages)]);
        }
        break;
        
      case 'ranges':
        ranges = this.parsePageRanges(this.pageRanges.value);
        if (ranges.length === 0) {
          showError('Please enter valid page ranges');
          return;
        }
        ranges = ranges.map(p => [p, p]);
        break;
        
      case 'extract':
        const pages = this.parsePageRanges(this.extractPages.value);
        if (pages.length === 0) {
          showError('Please enter valid page numbers');
          return;
        }
        if (this.extractSingle.checked) {
          ranges = [pages];
        } else {
          ranges = pages.map(p => [p, p]);
        }
        break;
    }
    
    if (ranges.length === 0) {
      showError('No valid pages to split');
      return;
    }
    
    this.showProgress(true);
    
    try {
      const progress = createProgress({
        container: this.progressContainer,
        total: ranges.length,
        label: 'Splitting PDF...'
      });
      
      const results = await splitPDFByRanges(this.file, {
        ranges,
        onProgress: (current, total) => {
          progress.setProgress(current, total);
        }
      });
      
      // Create ZIP if multiple files
      if (results.length > 1) {
        const files = results.map((blob, index) => ({
          name: `split_part_${index + 1}.pdf`,
          blob
        }));
        
        await downloadAsZip(files, `split_${this.file.name.replace('.pdf', '')}.zip`);
        
        // History
        addToHistory({
          tool: this.tool.id,
          title: `Split ${this.file.name} into ${results.length} parts`,
          files: [{ name: this.file.name, size: this.file.size, type: this.file.type }],
          options: { method: this.splitMethod, ranges: ranges.length },
          results: files.map(f => ({ name: f.name, size: f.blob.size, type: 'application/pdf' })),
          duration: 0
        });
        
        showSuccess(`Split into ${results.length} files`);
      } else {
        // Single file
        const filename = `split_${this.file.name}`;
        const url = URL.createObjectURL(results[0]);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        addToHistory({
          tool: this.tool.id,
          title: `Split ${this.file.name}`,
          files: [{ name: this.file.name, size: this.file.size, type: this.file.type }],
          options: { method: this.splitMethod, ranges: ranges.length },
          results: [{ name: filename, size: results[0].size, type: 'application/pdf' }],
          duration: 0
        });
        
        showSuccess('PDF split successfully');
      }
      
      addRecentFile({
        name: this.file.name,
        size: this.file.size,
        type: this.file.type,
        tool: this.tool.id
      });
      
    } catch (error) {
      console.error('Split failed:', error);
      showError(`Split failed: ${error.message}`);
    } finally {
      this.showProgress(false);
    }
  }
  
  showProgress(show) {
    this.progressSection.hidden = !show;
    this.uploadArea.style.opacity = show ? '0.5' : '1';
    this.uploadArea.style.pointerEvents = show ? 'none' : 'auto';
    this.toolbar.setItemDisabled('split-btn', show);
  }
  
  showLoading(show) {
    this.uploadArea.classList.toggle('loading', show);
    if (show) {
      this.uploadArea.innerHTML = `
        <div class="spinner"></div>
        <p>Loading PDF...</p>
      `;
    }
  }
  
  destroy() {
    this.toolbar?.destroy();
    this.fileInput?.remove();
    this.container.innerHTML = '';
  }
}

export default SplitPDFTool;