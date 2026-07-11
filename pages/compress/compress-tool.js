/**
 * @file Compress PDF Tool
 * Compress PDF files with quality slider and estimated size
 * @module pages/compress/compress-tool
 */

import { createFileInput, triggerFileInput, downloadBlob } from '../../../utils/file.js';
import { createDropZone } from '../../../utils/ui.js';
import { createFileList } from '../../../utils/ui.js';
import { createProgress } from '../../../utils/ui.js';
import { createToolbar } from '../../../components/toolbar.js';
import { createModal } from '../../../components/modal.js';
import { showToast, showSuccess, showError, showInfo } from '../../../components/toast.js';
import { compressPDF, estimateCompressedSize } from '../../../utils/pdf.js';
import { addToHistory, addRecentFile } from '../../../utils/history.js';

/**
 * Compress PDF Tool Component
 */
export class CompressPDFTool {
  constructor({ tool, state, utils }) {
    this.tool = tool;
    this.state = state;
    this.utils = utils;
    this.files = [];
    this.toolbar = null;
    this.fileList = null;
    this.progress = null;
    this.container = null;
    this.quality = 0.75;
  }
  
  async render() {
    this.container = document.getElementById('app');
    this.container.innerHTML = this.getHTML();
    
    this.bindElements();
    this.bindEvents();
    this.initFileList();
    this.initToolbar();
    this.initDropZone();
    this.initQualitySlider();
  }
  
  getHTML() {
    return `
      <div class="tool-page compress-pdf-tool">
        <header class="tool-header">
          <div class="tool-header-content">
            <div class="tool-icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="2"></rect>
                <path d="M17 8h-5"></path>
                <path d="M17 12h-5"></path>
                <path d="M17 16h-5"></path>
              </svg>
            </div>
            <div class="tool-info">
              <h1>Compress PDF</h1>
              <p>Reduce PDF file size while maintaining quality</p>
            </div>
          </div>
          <div class="tool-actions" id="tool-toolbar"></div>
        </header>
        
        <div class="tool-body">
          <section class="upload-section" aria-labelledby="upload-heading">
            <h2 id="upload-heading" class="sr-only">Upload PDF File</h2>
            <div class="upload-area" id="upload-area" role="button" tabindex="0" aria-label="Drop PDF file here or click to browse">
              <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </div>
              <p class="upload-title">Drop PDF file here</p>
              <p class="upload-subtitle">or click to browse</p>
              <p class="upload-hint">Single file • Max 500MB</p>
            </div>
            <div class="file-list-container" id="file-list-container"></div>
          </section>
          
          <section class="options-section" aria-labelledby="options-heading">
            <h2 id="options-heading">Compression Settings</h2>
            <div class="options-grid">
              <div class="option-group quality-group">
                <label class="option-label">Compression Quality</label>
                <div class="quality-slider-container">
                  <div class="quality-labels">
                    <span>Smaller file</span>
                    <span>Better quality</span>
                  </div>
                  <input 
                    type="range" 
                    id="quality-slider" 
                    class="quality-slider" 
                    min="0.1" 
                    max="1" 
                    step="0.05" 
                    value="0.75"
                    aria-label="Compression quality"
                  >
                  <div class="quality-value" id="quality-value">75%</div>
                </div>
                <div class="size-estimate" id="size-estimate" hidden>
                  <span class="estimate-label">Estimated size:</span>
                  <span class="estimate-value" id="estimate-value">--</span>
                  <span class="estimate-reduction" id="estimate-reduction"></span>
                </div>
              </div>
              <div class="option-group">
                <label class="option-label">
                  <input type="checkbox" id="option-downsample" checked>
                  <span>Downsample images</span>
                </label>
              </div>
              <div class="option-group">
                <label class="option-label">
                  <input type="checkbox" id="option-remove-unused">
                  <span>Remove unused objects</span>
                </label>
              </div>
            </div>
          </section>
          
          <section class="progress-section" id="progress-section" hidden>
            <h2 class="sr-only">Processing</h2>
            <div class="progress-container" id="progress-container"></div>
          </section>
          
          <section class="results-section" id="results-section" hidden>
            <h2 class="sr-only">Results</h2>
            <div class="results-container" id="results-container"></div>
          </section>
        </div>
      </div>
    `;
  }
  
  bindElements() {
    this.uploadArea = this.container.querySelector('#upload-area');
    this.fileListContainer = this.container.querySelector('#file-list-container');
    this.progressSection = this.container.querySelector('#progress-section');
    this.progressContainer = this.container.querySelector('#progress-container');
    this.resultsSection = this.container.querySelector('#results-section');
    this.resultsContainer = this.container.querySelector('#results-container');
    this.toolbarContainer = this.container.querySelector('#tool-toolbar');
    this.qualitySlider = this.container.querySelector('#quality-slider');
    this.qualityValue = this.container.querySelector('#quality-value');
    this.sizeEstimate = this.container.querySelector('#size-estimate');
    this.estimateValue = this.container.querySelector('#estimate-value');
    this.estimateReduction = this.container.querySelector('#estimate-reduction');
  }
  
  bindEvents() {
    const fileInput = createFileInput({
      accept: '.pdf',
      multiple: false,
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
        { id: 'clear', label: 'Clear', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>', onClick: () => this.clearFile(), tooltip: 'Clear file' },
        { type: 'divider' },
        { id: 'compress-btn', label: 'Compress PDF', variant: 'primary', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"></rect><path d="M17 8h-5"></path><path d="M17 12h-5"></path><path d="M17 16h-5"></path></svg>', onClick: () => this.compressPDF(), disabled: true }
      ],
      ariaLabel: 'Compress PDF actions'
    });
    this.toolbarContainer.appendChild(this.toolbar);
    
    this.compressBtn = this.toolbar.getItem('compress-btn');
    
    // Quality slider
    this.qualitySlider.addEventListener('input', (e) => {
      this.quality = parseFloat(e.target.value);
      this.qualityValue.textContent = Math.round(this.quality * 100) + '%';
      this.updateSizeEstimate();
    });
    
    this.qualitySlider.addEventListener('change', () => {
      this.updateSizeEstimate();
    });
  }
  
  initFileList() {
    this.fileList = createFileList({
      container: this.fileListContainer,
      files: this.files,
      onRemove: () => this.clearFile(),
      onPreview: (file) => this.previewFile(file)
    });
  }
  
  initToolbar() {}
  
  initDropZone() {
    createDropZone({
      element: this.uploadArea,
      accept: ['application/pdf'],
      multiple: false,
      onFiles: (files) => this.handleFiles(files)
    });
  }
  
  initQualitySlider() {
    // Initial estimate update will happen when file is loaded
  }
  
  handleFiles(files) {
    if (files.length === 0) return;
    
    const file = files[0];
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showError('Please select a PDF file');
      return;
    }
    
    this.files = [file];
    this.updateUI();
    this.updateSizeEstimate();
  }
  
  clearFile() {
    this.files = [];
    this.fileInput.value = '';
    this.updateUI();
    this.sizeEstimate.hidden = true;
    showInfo('File cleared');
  }
  
  updateUI() {
    this.fileList.setFiles(this.files);
    const hasFile = this.files.length > 0;
    this.toolbar.setItemDisabled('compress-btn', !hasFile);
    this.uploadArea.classList.toggle('has-files', hasFile);
    this.sizeEstimate.hidden = !hasFile;
  }
  
  updateSizeEstimate() {
    if (this.files.length === 0) return;
    
    const file = this.files[0];
    const estimated = estimateCompressedSize(file.size, this.quality);
    const reduction = Math.round((1 - estimated / file.size) * 100);
    
    this.estimateValue.textContent = this.utils.file.formatFileSize(estimated);
    this.estimateReduction.textContent = `(${reduction}% smaller)`;
    this.sizeEstimate.hidden = false;
  }
  
  previewFile(file) {
    showInfo(`Preview: ${file.name}`);
  }
  
  async compressPDF() {
    if (this.files.length === 0) {
      showError('Please select a PDF file');
      return;
    }
    
    const downsample = this.container.querySelector('#option-downsample').checked;
    const removeUnused = this.container.querySelector('#option-remove-unused').checked;
    
    this.showProgress(true);
    
    try {
      const progress = createProgress({
        container: this.progressContainer,
        total: 100,
        label: 'Compressing PDF...'
      });
      
      const file = this.files[0];
      const compressedBytes = await compressPDF(file, {
        quality: this.quality,
        downsample,
        removeUnused,
        onProgress: (current, total) => {
          progress.setProgress(current, total);
        }
      });
      
      const blob = new Blob([compressedBytes], { type: 'application/pdf' });
      const originalSize = file.size;
      const compressedSize = blob.size;
      const reduction = Math.round((1 - compressedSize / originalSize) * 100);
      
      // Generate filename
      const baseName = file.name.replace(/\.pdf$/i, '');
      const filename = `${baseName}-compressed.pdf`;
      
      downloadBlob(blob, filename);
      
      // History
      addToHistory({
        tool: this.tool.id,
        title: `Compressed ${file.name}`,
        files: [{ name: file.name, size: file.size, type: file.type }],
        options: { quality: this.quality, downsample, removeUnused },
        results: [{ name: filename, size: compressedSize, type: 'application/pdf' }],
        duration: 0
      });
      
      addRecentFile({
        name: file.name,
        size: file.size,
        type: file.type,
        tool: this.tool.id
      });
      
      this.showResults(filename, compressedSize, originalSize, reduction);
      showSuccess(`PDF compressed by ${reduction}% (${this.utils.file.formatFileSize(originalSize)} → ${this.utils.file.formatFileSize(compressedSize)})`);
      
    } catch (error) {
      console.error('Compression failed:', error);
      showError(`Compression failed: ${error.message}`);
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
  
  showResults(filename, compressedSize, originalSize, reduction) {
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
            <span class="compressed-size">${this.utils.file.formatFileSize(compressedSize)}</span>
            <span class="reduction-badge">${reduction}% smaller</span>
          </p>
        </div>
        <div class="result-actions">
          <button class="btn btn-primary" id="download-result">Download</button>
          <button class="btn btn-secondary" id="compress-more">Compress Another</button>
        </div>
      </div>
    `;
    
    this.resultsContainer.querySelector('#download-result').addEventListener('click', () => {
      this.compressPDF();
    });
    
    this.resultsContainer.querySelector('#compress-more').addEventListener('click', () => {
      this.resultsSection.hidden = true;
      this.clearFile();
    });
  }
  
  destroy() {
    this.toolbar?.destroy();
    this.fileInput?.remove();
    this.container.innerHTML = '';
  }
}

export default CompressPDFTool;