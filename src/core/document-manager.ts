/**
 * ZyncPDF - Document Manager
 * Manages PDF documents, pages, rendering, and document operations
 */

import { PDFDocument, PDFPage, ToolMode, ExportOptions } from '../types/index.js';
import { EventEmitter } from '../utils/event-emitter.js';
import { StorageManager } from '../storage/storage-manager.js';
import { PDFWorker } from '../workers/pdf-worker.js';
import { v4 as uuidv4 } from '../utils/uuid.js';

interface RenderTask {
  pageNumber: number;
  scale: number;
  priority: 'high' | 'normal' | 'low';
  resolve: (canvas: HTMLCanvasElement) => void;
  reject: (error: Error) => void;
}

export class DocumentManager extends EventEmitter {
  private app: any;
  private storage: StorageManager;
  private pdfWorker: PDFWorker;
  private documents: Map<string, PDFDocument> = new Map();
  private activeDocumentId: string | null = null;
  private renderQueue: RenderTask[] = [];
  private isRendering = false;
  private currentScale = 1;
  private currentPage = 1;
  private viewport = { x: 0, y: 0, scale: 1, rotation: 0 };
  private canvasContainer: HTMLElement | null = null;
  private mainCanvas: HTMLCanvasElement | null = null;
  private mainContext: CanvasRenderingContext2D | null = null;
  private renderCache: Map<string, HTMLCanvasElement> = new Map();
  private maxCacheSize = 50;

  constructor(app: any) {
    super();
    this.app = app;
    this.storage = app.storage;
    this.pdfWorker = app.pdfWorker;
  }

  async initialize(): Promise<void> {
    this.canvasContainer = document.getElementById('document-canvas-container')!;
    this.setupCanvas();
    await this.loadRecentDocuments();
  }

  private setupCanvas(): void {
    if (!this.canvasContainer) return;

    this.mainCanvas = document.createElement('canvas');
    this.mainCanvas.className = 'document-canvas';
    this.mainContext = this.mainCanvas.getContext('2d', { alpha: true, desynchronized: true })!;
    
    this.canvasContainer.appendChild(this.mainCanvas);

    // Mouse events for pan tool
    this.mainCanvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.mainCanvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.mainCanvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.mainCanvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    this.mainCanvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));

    // Touch events for mobile
    this.mainCanvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.mainCanvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.mainCanvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  private async loadRecentDocuments(): Promise<void> {
    try {
      const recent = await this.storage.getRecentFiles();
      for (const file of recent.slice(0, 5)) {
        // Could preload thumbnails here
      }
    } catch (e) {
      console.warn('[DocumentManager] Failed to load recent files:', e);
    }
  }

  // ============================================
  // DOCUMENT OPERATIONS
  // ============================================

  async createNew(): Promise<PDFDocument> {
    // Create a blank PDF document
    const doc = await this.createBlankDocument();
    return this.openDocument(doc);
  }

  private async createBlankDocument(): Promise<PDFDocument> {
    // Use pdf-lib to create a blank document
    const { PDFDocument: PDFLibDocument } = await import('pdf-lib');
    const pdfDoc = await PDFLibDocument.create();
    pdfDoc.addPage([595, 842]); // A4 size
    
    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const file = new File([blob], 'Untitled.pdf', { type: 'application/pdf' });
    
    return {
      id: this.generateId(),
      name: 'Untitled.pdf',
      originalName: 'Untitled.pdf',
      file,
      url: URL.createObjectURL(blob),
      pageCount: 1,
      pages: [],
      annotations: [],
      textLayers: [],
      metadata: {
        title: 'Untitled',
        pageCount: 1,
        fileSize: blob.size,
        isEncrypted: false,
        pdfVersion: '1.7',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isModified: false,
      viewport: { x: 0, y: 0, scale: 1, rotation: 0 },
    };
  }

  async openFile(): Promise<PDFDocument | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf';
      input.multiple = false;
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const doc = await this.openDocumentFromFile(file);
          resolve(doc);
        } else {
          resolve(null);
        }
      };
      
      input.click();
    });
  }

  async openDocumentFromFile(file: File): Promise<PDFDocument> {
    const url = URL.createObjectURL(file);
    
    try {
      // Load with PDF.js to get page count and metadata
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';
      
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Get metadata
      const metadata = await pdfDoc.getMetadata();
      const info = metadata.info as any;
      
      const doc: PDFDocument = {
        id: this.generateId(),
        name: file.name,
        originalName: file.name,
        file,
        url,
        pageCount: pdfDoc.numPages,
        pages: [],
        annotations: [],
        textLayers: [],
        metadata: {
          title: info?.Title?.[0] || file.name.replace('.pdf', ''),
          author: info?.Author?.[0],
          subject: info?.Subject?.[0],
          keywords: info?.Keywords?.[0]?.split(',').map((k: string) => k.trim()),
          creator: info?.Creator?.[0],
          producer: info?.Producer?.[0],
          creationDate: info?.CreationDate?.[0] ? new Date(info.CreationDate[0]) : undefined,
          modificationDate: info?.ModDate?.[0] ? new Date(info.ModDate[0]) : undefined,
          pageCount: pdfDoc.numPages,
          fileSize: file.size,
          isEncrypted: false, // Would need to check
          pdfVersion: '1.7',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isModified: false,
        viewport: { x: 0, y: 0, scale: 1, rotation: 0 },
      };

      // Load first page for preview
      await this.loadPageThumbnails(doc);
      
      return this.openDocument(doc);
    } catch (error) {
      console.error('[DocumentManager] Failed to open document:', error);
      throw error;
    }
  }

  async openDocument(doc: PDFDocument): Promise<PDFDocument> {
    // Close current if any
    if (this.activeDocumentId) {
      await this.closeDocument(this.activeDocumentId);
    }

    // Store document
    this.documents.set(doc.id, doc);
    this.activeDocumentId = doc.id;

    // Update UI
    this.app.workspace.setActiveDocument(doc);
    this.app.tabBar.addTab({
      id: doc.id,
      documentId: doc.id,
      title: doc.name,
      icon: 'file',
      isActive: true,
      isPinned: false,
      isModified: doc.isModified,
      scrollPosition: { x: 0, y: 0 },
      zoom: 1,
      pageNumber: 1,
      viewport: doc.viewport,
    });

    // Load first page
    await this.goToPage(1);

    // Add to recent files
    await this.storage.addRecentFile({
      id: doc.id,
      name: doc.name,
      size: doc.metadata?.fileSize ?? 0,
      type: 'application/pdf',
      tool: 'viewer',
    });

    // Emit event
    this.emit('document:open', doc);
    this.emit('document:modified', doc);

    return doc;
  }

  async closeDocument(id: string): Promise<void> {
    const doc = this.documents.get(id);
    if (!doc) return;

    // Check for unsaved changes
    if (doc.isModified) {
      const save = confirm(`Save changes to "${doc.name}" before closing?`);
      if (save) {
        await this.saveDocument(doc);
      }
    }

    // Revoke object URL
    URL.revokeObjectURL(doc.url);

    // Remove from maps
    this.documents.delete(id);
    this.renderCache.clear();

    // Update UI
    this.app.tabBar.removeTab(id);
    
    if (this.activeDocumentId === id) {
      this.activeDocumentId = null;
      this.app.workspace.setActiveDocument(null);
      this.clearCanvas();
    }

    this.emit('document:close', id);
  }

  async saveDocument(doc: PDFDocument): Promise<void> {
    if (!doc.file) {
      console.warn('[DocumentManager] Cannot save document: missing file', doc.id);
      return;
    }
    // Use pdf-lib to save with annotations
    const { PDFDocument: PDFLibDocument } = await import('pdf-lib');
    
    const arrayBuffer = await doc.file.arrayBuffer();
    const pdfDoc = await PDFLibDocument.load(arrayBuffer);
    
    // Apply annotations
    await this.applyAnnotationsToPdf(pdfDoc, doc);
    
    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    
    // Update document
    doc.file = new File([blob], doc.name, { type: 'application/pdf' });
    doc.url = URL.createObjectURL(blob);
    doc.metadata.fileSize = blob.size;
    doc.updatedAt = Date.now();
    doc.isModified = false;
    
    // Update storage
    await this.storage.saveDocument(doc);
    
    // Update UI
    this.app.tabBar.setTabModified(doc.id, false);
    this.app.statusBar.setModified(false);
    
    this.emit('document:saved', doc);
  }

  async save(): Promise<void> {
    const doc = this.getActiveDocument();
    if (!doc) return;
    await this.saveDocument(doc);
  }

  async saveAs(doc?: PDFDocument): Promise<void> {
    if (!doc) doc = this.getActiveDocument();
    if (!doc) return;
    await this.saveDocument(doc);
  }

  async export(doc?: PDFDocument, options: ExportOptions = {}): Promise<void> {
    if (!doc) doc = this.getActiveDocument();
    if (!doc) return;
    this.emit('export:start', { doc, options });
    await this.saveDocument(doc);
    this.emit('export:complete', { doc });
  }

  // ============================================
  // PAGE NAVIGATION
  // ============================================

  async goToPage(pageNumber: number): Promise<void> {
    const doc = this.getActiveDocument();
    if (!doc) return;

    const pageNum = Math.max(1, Math.min(pageNumber, doc.pageCount));
    if (this.currentPage === pageNum) return;

    this.currentPage = pageNum;
    await this.renderPage(pageNum);
    
    // Update UI
    this.app.statusBar.setPage(pageNum, doc.pageCount);
    this.app.toolbar.updatePage(pageNum, doc.pageCount);
    this.app.sidebar.setActivePage(pageNum);
    
    this.emit('page:change', pageNum);
  }

  async nextPage(): Promise<void> {
    const doc = this.getActiveDocument();
    if (doc && this.currentPage < doc.pageCount) {
      await this.goToPage(this.currentPage + 1);
    }
  }

  async prevPage(): Promise<void> {
    if (this.currentPage > 1) {
      await this.goToPage(this.currentPage - 1);
    }
  }

  async firstPage(): Promise<void> {
    await this.goToPage(1);
  }

  async lastPage(): Promise<void> {
    const doc = this.getActiveDocument();
    if (doc) await this.goToPage(doc.pageCount);
  }

  async renderPage(pageNumber: number): Promise<void> {
    const doc = this.getActiveDocument();
    if (!doc) return;

    // Check cache first
    const cacheKey = `${doc.id}-${pageNumber}-${this.currentScale}`;
    if (this.renderCache.has(cacheKey)) {
      const cached = this.renderCache.get(cacheKey)!;
      this.drawCanvas(cached);
      return;
    }

    // Render via PDF worker
    try {
      const canvas = await this.pdfWorker.renderPage(doc.id, pageNumber, this.currentScale);
      this.drawCanvas(canvas);
      
      // Cache the result
      this.cacheCanvas(cacheKey, canvas);
    } catch (error) {
      console.error('[DocumentManager] Failed to render page:', error);
      this.showErrorState();
    }
  }

  private drawCanvas(canvas: HTMLCanvasElement): void {
    if (!this.mainContext || !this.mainCanvas) return;

    const containerRect = this.canvasContainer!.getBoundingClientRect();
    const maxWidth = containerRect.width - 40;
    const maxHeight = containerRect.height - 40;

    // Calculate fit
    const scale = Math.min(
      maxWidth / canvas.width,
      maxHeight / canvas.height,
      1
    );

    this.mainCanvas.width = canvas.width * scale;
    this.mainCanvas.height = canvas.height * scale;
    this.mainCanvas.style.width = `${canvas.width * scale}px`;
    this.mainCanvas.style.height = `${canvas.height * scale}px`;

    this.mainContext.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    this.mainContext.drawImage(canvas, 0, 0, this.mainCanvas.width, this.mainCanvas.height);
  }

  private cacheCanvas(key: string, canvas: HTMLCanvasElement): void {
    if (this.renderCache.size >= this.maxCacheSize) {
      // Remove oldest
      const firstKey = this.renderCache.keys().next().value;
      if (firstKey) this.renderCache.delete(firstKey);
    }
    this.renderCache.set(key, canvas);
  }

  // ============================================
  // ZOOM OPERATIONS
  // ============================================

  setZoom(scale: number): void {
    this.currentScale = Math.max(0.1, Math.min(8, scale));
    this.viewport.scale = this.currentScale;
    this.renderPage(this.currentPage);
    this.app.statusBar.setZoom(this.currentScale);
    this.app.toolbar.updateZoom(this.currentScale);
  }

  zoomIn(): void {
    this.setZoom(this.currentScale * 1.2);
  }

  zoomOut(): void {
    this.setZoom(this.currentScale / 1.2);
  }

  resetZoom(): void {
    this.setZoom(1);
  }

  fitWidth(): void {
    if (!this.mainCanvas || !this.canvasContainer) return;
    const containerWidth = this.canvasContainer!.clientWidth - 40;
    const scale = (containerWidth - 20) / this.mainCanvas!.width;
    this.setZoom(scale);
  }

  fitPage(): void {
    if (!this.mainCanvas || !this.canvasContainer) return;
    const containerRect = this.canvasContainer!.getBoundingClientRect();
    const maxWidth = containerRect.width - 40;
    const maxHeight = containerRect.height - 40;
    
    const doc = this.getActiveDocument();
    if (!doc || !doc.pages[this.currentPage - 1]) return;

    const page = doc.pages[this.currentPage - 1];
    const scale = Math.min(
      maxWidth / page.width,
      maxHeight / page.height
    );
    this.setZoom(scale);
  }

  // ============================================
  // DOCUMENT MODIFICATION
  // ============================================

  async insertPage(afterPage?: number): Promise<void> {
    const doc = this.getActiveDocument();
    if (!doc || !doc.file) return;

    const { PDFDocument: PDFLibDocument } = await import('pdf-lib');
    const arrayBuffer = await doc.file.arrayBuffer();
    const pdfDoc = await PDFLibDocument.load(arrayBuffer);

    const pageIndex = afterPage !== undefined ? afterPage : this.currentPage;
    const newPage = pdfDoc.insertPage(pageIndex, [595, 842]);

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    
    // Update document
    doc.file = new File([blob], doc.name, { type: 'application/pdf' });
    doc.pageCount = pdfDoc.getPageCount();
    doc.updatedAt = Date.now();
    doc.isModified = true;

    // Update UI
    this.app.tabBar.setTabModified(doc.id, true);
    this.app.statusBar.setModified(true);
    this.app.sidebar.setDocument(doc);

    this.emit('document:modified', doc);
  }

  async deletePage(pageNumber?: number): Promise<void> {
    const doc = this.getActiveDocument();
    if (!doc || !doc.file || doc.pageCount <= 1) return;

    const pageNum = pageNumber ?? this.currentPage;
    if (confirm(`Delete page ${pageNum}?`)) {
      const { PDFDocument: PDFLibDocument } = await import('pdf-lib');
      const arrayBuffer = await doc.file.arrayBuffer();
      const pdfDoc = await PDFLibDocument.load(arrayBuffer);

      pdfDoc.removePage(pageNum - 1);

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      
      doc.file = new File([blob], doc.name, { type: 'application/pdf' });
      doc.pageCount = pdfDoc.getPageCount();
      doc.updatedAt = Date.now();
      doc.isModified = true;

      // Adjust current page
      if (this.currentPage > doc.pageCount) {
        this.currentPage = doc.pageCount;
      }

      this.app.tabBar.setTabModified(doc.id, true);
      this.app.statusBar.setModified(true);
      this.app.sidebar.setDocument(doc);
      await this.goToPage(this.currentPage);

      this.emit('document:modified', doc);
    }
  }

  async duplicatePage(pageNumber?: number): Promise<void> {
    const doc = this.getActiveDocument();
    if (!doc || !doc.file) return;

    const pageNum = pageNumber ?? this.currentPage;
    const { PDFDocument: PDFLibDocument } = await import('pdf-lib');
    const arrayBuffer = await doc.file.arrayBuffer();
    const pdfDoc = await PDFLibDocument.load(arrayBuffer);

    const [copiedPage] = await pdfDoc.copyPages(pdfDoc, [pageNum - 1]);
    pdfDoc.insertPage(pageNum, copiedPage);

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    
    doc.file = new File([blob], doc.name, { type: 'application/pdf' });
    doc.pageCount = pdfDoc.getPageCount();
    doc.updatedAt = Date.now();
    doc.isModified = true;

    this.app.tabBar.setTabModified(doc.id, true);
    this.app.statusBar.setModified(true);
    this.app.sidebar.setDocument(doc);

    this.emit('document:modified', doc);
  }

  async rotatePage(degrees: number): Promise<void> {
    const doc = this.getActiveDocument();
    if (!doc || !doc.file) return;

    const pageNum = this.currentPage;
    const { PDFDocument: PDFLibDocument } = await import('pdf-lib');
    const arrayBuffer = await doc.file.arrayBuffer();
    const pdfDoc = await PDFLibDocument.load(arrayBuffer);

    const page = pdfDoc.getPage(pageNum - 1);
    const currentRotation = page.getRotation().angle;
    page.setRotation({ angle: currentRotation + degrees });

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    
    doc.file = new File([blob], doc.name, { type: 'application/pdf' });
    doc.updatedAt = Date.now();
    doc.isModified = true;

    this.app.tabBar.setTabModified(doc.id, true);
    this.app.statusBar.setModified(true);
    await this.renderPage(this.currentPage);

    this.emit('document:modified', doc);
  }

  async extractPage(pageNumber?: number): Promise<void> {
    const doc = this.getActiveDocument();
    if (!doc || !doc.file) return;

    const pageNum = pageNumber ?? this.currentPage;
    const { PDFDocument: PDFLibDocument } = await import('pdf-lib');
    const arrayBuffer = await doc.file.arrayBuffer();
    const pdfDoc = await PDFLibDocument.load(arrayBuffer);

    const newDoc = await PDFLibDocument.create();
    const [copiedPage] = await newDoc.copyPages(pdfDoc, [pageNum - 1]);
    newDoc.addPage(copiedPage);

    const bytes = await newDoc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    
    // Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name.replace('.pdf', '')}_page_${pageNum}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ============================================
  // THUMBNAILS
  // ============================================

  private async loadPageThumbnails(doc: PDFDocument): Promise<void> {
    // Load thumbnails in background
    for (let i = 0; i < Math.min(doc.pageCount, 10); i++) {
      try {
        const canvas = await this.pdfWorker.renderPage(doc.id, i + 1, 0.2);
        doc.pages[i] = {
          pageNumber: i + 1,
          width: canvas.width * 5, // Approximate
          height: canvas.height * 5,
          rotation: 0,
          thumbnail: canvas,
        };
      } catch (e) {
        console.warn(`Failed to load thumbnail for page ${i + 1}`);
      }
    }
  }

  private async renderPageThumbnails(doc: PDFDocument): Promise<void> {
    // Render all page thumbnails for sidebar
    for (let i = 0; i < doc.pageCount; i++) {
      try {
        const canvas = await this.pdfWorker.renderPage(doc.id, i + 1, 0.15);
        this.app.sidebar.thumbnails.set(i + 1, canvas);
      } catch (e) {
        console.warn(`Failed to render thumbnail for page ${i + 1}`);
      }
    }
    this.app.sidebar.renderThumbnails();
  }

  // ============================================
  // ANNOTATION APPLICATION
  // ============================================

  private async applyAnnotationsToPdf(pdfDoc: any, doc: PDFDocument): Promise<void> {
    // Group annotations by page
    const annotationsByPage = new Map<number, any[]>();
    doc.annotations.forEach(ann => {
      if (!annotationsByPage.has(ann.pageNumber)) {
        annotationsByPage.set(ann.pageNumber, []);
      }
      annotationsByPage.get(ann.pageNumber)!.push(ann);
    });

    // Apply each annotation
    for (const [pageNum, annotations] of annotationsByPage) {
      const page = pdfDoc.getPage(pageNum - 1);
      
      for (const ann of annotations) {
        await this.applyAnnotation(page, ann);
      }
    }
  }

  private async applyAnnotation(page: any, ann: any): Promise<void> {
    const data = ann.data;
    const { rgb, degrees } = await import('pdf-lib');

    switch (ann.type) {
      case 'highlight':
        // Draw highlight rectangles
        if (data.quadrilaterals) {
          for (const quad of data.quadrilaterals) {
            page.drawRectangle({
              x: quad[0].x,
              y: quad[0].y,
              width: quad[1].x - quad[0].x,
              height: quad[1].y - quad[0].y,
              color: rgb(...this.hexToRgb(data.color || '#ffff00')),
              opacity: data.opacity ?? 0.5,
            });
          }
        }
        break;

      case 'rectangle':
        page.drawRectangle({
          x: data.rect.x,
          y: data.rect.y,
          width: data.rect.width,
          height: data.rect.height,
          color: data.fillColor ? rgb(...this.hexToRgb(data.fillColor)) : undefined,
          borderColor: data.strokeColor ? rgb(...this.hexToRgb(data.strokeColor)) : undefined,
          borderWidth: data.strokeWidth,
          opacity: data.opacity ?? 1,
        });
        break;

      // ... other annotation types
    }
  }

  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ] : [1, 1, 0];
  }

  // ============================================
  // MOUSE/TOUCH HANDLING
  // ============================================

  private isPanning = false;
  private panStart = { x: 0, y: 0 };
  private viewportStart = { x: 0, y: 0 };

  private handleMouseDown(e: MouseEvent): void {
    if (this.app.toolbar.getCurrentTool() === 'pan') {
      this.isPanning = true;
      this.panStart = { x: e.clientX, y: e.clientY };
      this.viewportStart = { ...this.viewport };
      this.mainCanvas!.style.cursor = 'grabbing';
      e.preventDefault();
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isPanning) {
      const dx = e.clientX - this.panStart.x;
      const dy = e.clientY - this.panStart.y;
      
      this.viewport.x = this.viewportStart.x - dx;
      this.viewport.y = this.viewportStart.y - dy;
      
      this.updateCanvasPosition();
      this.emit('viewport:change', this.viewport);
    }
  }

  private handleMouseUp(): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.mainCanvas!.style.cursor = 'grab';
    }
  }

  private handleWheel(e: WheelEvent): void {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.setZoom(this.currentScale * delta);
    } else {
      // Pan vertically
      this.viewport.y -= e.deltaY;
      this.updateCanvasPosition();
    }
  }

  private handleDoubleClick(e: MouseEvent): void {
    // Zoom in/out on double click
    this.setZoom(this.currentScale === 1 ? 1.5 : 1);
  }

  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      this.isPanning = true;
      this.panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.viewportStart = { ...this.viewport };
    } else if (e.touches.length === 2) {
      // Pinch zoom
      this.isPanning = false;
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (this.isPanning && e.touches.length === 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - this.panStart.x;
      const dy = e.touches[0].clientY - this.panStart.y;
      
      this.viewport.x = this.viewportStart.x - dx;
      this.viewport.y = this.viewportStart.y - dy;
      this.updateCanvasPosition();
    }
  }

  private handleTouchEnd(): void {
    this.isPanning = false;
  }

  private updateCanvasPosition(): void {
    if (this.mainCanvas) {
      this.mainCanvas.style.transform = `translate(${this.viewport.x}px, ${this.viewport.y}px)`;
    }
  }

  // ============================================
  // UTILITY
  // ============================================

  getActiveDocument(): PDFDocument | null {
    if (!this.activeDocumentId) return null;
    return this.documents.get(this.activeDocumentId) || null;
  }

  hasUnsavedChanges(): boolean {
    return Array.from(this.documents.values()).some(d => d.isModified);
  }

  autoSaveAll(): void {
    this.documents.forEach(doc => {
      if (doc.isModified) {
        this.saveDocument(doc).catch(console.error);
      }
    });
  }

  resize(): void {
    if (this.mainCanvas && this.canvasContainer) {
      this.renderPage(this.currentPage);
    }
  }

  clearCanvas(): void {
    if (this.mainContext && this.mainCanvas) {
      this.mainContext.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    }
  }

  private showErrorState(): void {
    if (this.mainContext && this.mainCanvas) {
      this.mainContext.fillStyle = 'var(--bg-tertiary)';
      this.mainContext.fillRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
      this.mainContext.fillStyle = 'var(--text-secondary)';
      this.mainContext.font = '16px var(--font-sans)';
      this.mainContext.textAlign = 'center';
      this.mainContext.fillText('Failed to render page', this.mainCanvas.width / 2, this.mainCanvas.height / 2);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  destroy(): void {
    this.renderCache.clear();
    this.clearCanvas();
  }
}