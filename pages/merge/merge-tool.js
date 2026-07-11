/**
 * @file Merge PDF Tool
 * Merge multiple PDF files with drag-and-drop reordering
 * @module pages/merge/merge-tool
 */

import { createFileInput, triggerFileInput, downloadBlob, downloadAsZip } from '../../../utils/file.js';
import { createDropZone } from '../../../utils/ui.js';
import { createFileList } from '../../../utils/ui.js';
import { createProgress } from '../../../utils/ui.js';
import { createToolbar } from '../../../components/toolbar.js';
import { showToast, showSuccess, showError, showInfo } from '../../../components/toast.js';
import { mergePDFs } from '../../../utils/pdf.js';
import { addToHistory, addRecentFile } from '../../../utils/history.js';

/**
 * Merge PDF Tool Component
 */
export class MergePDFTool {
  constructor({ tool, state, utils }) {
    this.tool = tool;
    this.state = state;
    this.utils = utils;
    this.files = [];
    this.toolbar = null;
    this.fileList = null;
    this.progress = null;
    this.container = null;
  }
  
  async render() {
    this.container = document.getElementById('app');
    this.container.innerHTML = this.getHTML();
    
    this.bindElements();
    this.bindEvents();
    this.initFileList();
    this.initToolbar();
    this.initDropZone();
  }
  
  getHTML() {
    return `
      <div class="tool-page merge-pdf-tool">
        <header class="tool-header">
          <div class="tool-header-content">
            <div class="tool-icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </div>
            <div class="tool-info">
              <h1>Merge PDF</h1>
              <p>Combine multiple PDF files into a single document</p>
            </div>
          </div>
          <div class="tool-actions" id="tool-toolbar"></div>
        </header>
        
        <main class="tool-main">
          <section class="tool-upload" aria-label="File upload">
            <div class="upload-area" id="upload-area" role="button" tabindex="0" aria-label="Click or drag PDF files here to upload">
              <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </div>
              <h2>Drag & drop PDF files here</h2>
              <p>or click to browse</p>
              <p class="upload-hint">Multiple files supported</p>
            </div>
            
            <div class="file-list-section" id="file-list-section" hidden>
              <div class="file-list-header">
                <h3>Files to merge (<span id="file-count">0</span>)</h3>
                <p class="reorder-hint">Drag to reorder files before merging</p>
              </div>
              <div class="file-list-container" id="file-list-container"></div>
            </div>
          </section>
          
          <section class="tool-options" aria-label="Merge options">
            <h3>Merge Options</h3>
            <div class="options-grid">
              <label class="option-item">
                <input type="checkbox" id="option-bookmarks" checked>
                <span class="option-label">Preserve bookmarks</span>
              </label>
              <label class="option-item">
                <input type="checkbox" id="option-forms" checked>
                <span class="option-label">Preserve form fields</span>
              </label>
              <label class="option-item">
                <input type="checkbox" id="option-metadata">
                <span class="option-label">Merge metadata</span>
              </label>
            </div>
          </section>
          
          <section class="tool-progress" id="progress-section" hidden aria-live="polite">
            <div class="progress-header">
              <h3>Merging PDFs...</h3>
            </div>
            <div class="progress-container" id="progress-container"></div>
          </section>
          
          <section class="tool-results" id="results-section" hidden>
            <div class="results-container" id="results-container"></div>
          </section>
        </main>
      </div>
    `;
  }
  
  bindElements() {
    this.uploadArea = this.container.querySelector('#upload-area');
    this.fileListSection = this.container.querySelector('#file-list-section');
    this.fileCount = this.container.querySelector('#file-count');
    this.fileListContainer = this.container.querySelector('#file-list-container');
    this.toolbarContainer = this.container.querySelector('#tool-toolbar');
    this.progressSection = this.container.querySelector('#progress-section');
    this.progressContainer = this.container.querySelector('#progress-container');
    this.resultsSection = this.container.querySelector('#results-section');
    this.resultsContainer = this.container.querySelector('#results-container');
  }
  
  bindEvents() {
    const fileInput = createFileInput({
      accept: '.pdf',
      multiple: true,
      onChange: (files) => this.handleFiles(files)
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
    
    this.toolbar = createToolbar({
      items: [
        { id: 'clear', label: 'Clear All', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>', onClick: () => this.clearAll(), tooltip: 'Clear all files' },
        { type: 'divider' },
        { id: 'merge-btn', label: 'Merge PDFs', variant: 'primary', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>', onClick: () => this.mergePDFs(), disabled: true }
      ],
      ariaLabel: 'Merge PDF actions'
    });
    this.toolbarContainer.appendChild(this.toolbar);
    
    this.mergeBtn = this.toolbar.getItem('merge-btn');
  }
  
  initFileList() {
    this.fileList = createFileList({
      container: this.fileListContainer,
      files: this.files,
      onRemove: (file, index) => this.removeFile(index),
      onReorder: (fromIndex, toIndex) => this.reorderFiles(fromIndex, toIndex),
      onPreview: (file, index) => this.previewFile(file, index)
    });
  }
  
  initToolbar() {}
  
  initDropZone() {
    createDropZone({
      element: this.uploadArea,
      accept: ['application/pdf'],
      multiple: true,
      onFiles: (files) => this.handleFiles(files)
    });
  }
  
  handleFiles(files) {
    if (files.length === 0) return;
    
    const validFiles = files.filter(f => 
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    
    if (validFiles.length !== files.length) {
      showWarning('Some files were skipped (not PDF)');
    }
    
    // Check for duplicates
    validFiles.forEach(file => {
      const exists = this.files.some(f => 
        f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
      );
      if (!exists) {
        this.files.push(file);
      }
    });
    
    this.updateUI();
  }
  
  clearAll() {
    this.files = [];
    this.fileInput.value = '';
    this.updateUI();
    showInfo('All files cleared');
  }
  
  removeFile(index) {
    this.files.splice(index, 1);
    this.updateUI();
  }
  
  reorderFiles(fromIndex, toIndex) {
    const [file] = this.files.splice(fromIndex, 1);
    this.files.splice(toIndex, 0, file);
    this.fileList.setFiles(this.files);
  }
  
  previewFile(file, index) {
    showInfo(`Preview: ${file.name} (${this.utils.file.formatFileSize(file.size)})`);
  }
  
  updateUI() {
    this.fileList.setFiles(this.files);
    const hasFiles = this.files.length > 0;
    
    this.fileCount.textContent = this.files.length;
    this.fileListSection.hidden = !hasFiles;
    this.uploadArea.classList.toggle('has-files', hasFiles);
    this.toolbar.setItemDisabled('merge-btn', !hasFiles || this.files.length < 2);
    
    if (hasFiles && this.files.length === 1) {
      showInfo('Add at least one more PDF to merge');
    }
  }
  
  async mergePDFs() {
    if (this.files.length < 2) {
      showError('Please add at least 2 PDF files to merge');
      return;
    }
    
    const options = {
      preserveBookmarks: this.container.querySelector('#option-bookmarks').checked,
      preserveForms: this.container.querySelector('#option-forms').checked,
      mergeMetadata: this.container.querySelector('#option-metadata').checked
    };
    
    this.showProgress(true);
    
    try {
      const progress = createProgress({
        container: this.progressContainer,
        total: 100,
        label: 'Merging PDFs...'
      });
      
      let processed = 0;
      const total = this.files.length;
      
      const mergedBytes = await mergePDFs(this.files, {
        ...options,
        onProgress: (current, totalPages) => {
          processed = current;
          progress.setProgress(Math.round((current / totalPages) * 100));
        }
      });
      
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const totalSize = this.files.reduce((sum, f) => sum + f.size, 0);
      const filename = `merged-${Date.now()}.pdf`;
      
      downloadBlob(blob, filename);
      
      // History
      addToHistory({
        tool: this.tool.id,
        title: `Merged ${this.files.length} PDFs`,
        files: this.files.map(f => ({ name: f.name, size: f.size, type: f.type })),
        options,
        results: [{ name: filename, size: blob.size, type: 'application/pdf' }],
        duration: 0
      });
      
      this.files.forEach(f => addRecentFile({ name: f.name, size: f.size, type: f.type, tool: this.tool.id }));
      
      this.showResults(filename, blob.size, totalSize);
      showSuccess(`${this.files.length} PDFs merged successfully (${this.utils.file.formatFileSize(totalSize)} → ${this.utils.file.formatFileSize(blob.size)})`);
      
    } catch (error) {
      console.error('Merge failed:', error);
      showError(`Merge failed: ${error.message}`);
    } finally {
      this.showProgress(false);
    }
  }
  
  showProgress(show) {
    this.progressSection.hidden = !show;
    this.resultsSection.hidden = true;
    this.uploadArea.style.opacity = show ? '0.5' : '1';
    this.uploadArea.style.pointerEvents = show ? 'none' : 'auto';
  }
  
  showResults(filename, size, originalSize) {
    this.resultsSection.hidden = false;
    this.resultsContainer.innerHTML = `
      <div class="result-card">
        <div class="result-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <div class="result-info">
          <h3>${filename}</h3>
          <p class="result-sizes">
            <span class="original-size">${this.utils.file.formatFileSize(originalSize)}</span>
            <span class="arrow">→</span>
            <span class="merged-size">${this.utils.file.formatFileSize(size)}</span>
          </p>
        </div>
        <div class="result-actions">
          <button class="btn btn-primary" id="download-result">Download</button>
          <button class="btn btn-secondary" id="merge-more">Merge More</button>
        </div>
      </div>
    `;
    
    this.resultsContainer.querySelector('#download-result').addEventListener('click', () => {
      this.mergePDFs();
    });
    
    this.resultsContainer.querySelector('#merge-more').addEventListener('click', () => {
      this.resultsSection.hidden = true;
      this.clearAll();
    });
  }
  
  destroy() {
    this.toolbar?.destroy();
    this.fileInput?.remove();
    this.container.innerHTML = '';
  }
}

export default MergePDFTool;