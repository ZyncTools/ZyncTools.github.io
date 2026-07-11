/**
 * ZyncPDF - Annotation Manager
 * Manages all annotations, selection, and annotation tools
 */

import { Annotation, AnnotationType, AnnotationData, Point, Rect, ToolMode, ToolOptions } from '../types/index.js';
import { EventEmitter } from '../utils/event-emitter.js';
import { v4 as uuidv4 } from '../utils/uuid.js';

interface DrawingState {
  isDrawing: boolean;
  startPoint: Point | null;
  currentPoint: Point | null;
  previewAnnotation: Annotation | null;
}

interface SelectionState {
  annotationIds: string[];
  bounds: Rect | null;
  handles: SelectionHandle[];
}

interface SelectionHandle {
  id: string;
  position: 'tl' | 'tm' | 'tr' | 'ml' | 'mr' | 'bl' | 'bm' | 'br' | 'rotate';
  point: Point;
  cursor: string;
}

export class AnnotationManager extends EventEmitter {
  private app: any;
  private documentManager: any;
  private annotations: Map<string, Annotation> = new Map();
  private annotationsByPage: Map<number, Set<string>> = new Map();
  
  private currentTool: ToolMode = 'select';
  private toolOptions: ToolOptions = {};
  private drawingState: DrawingState = {
    isDrawing: false,
    startPoint: null,
    currentPoint: null,
    previewAnnotation: null,
  };

  private selection: SelectionState = {
    annotationIds: [],
    bounds: null,
    handles: [],
  };

  private canvasContainer: HTMLElement | null = null;
  private overlayCanvas: HTMLCanvasElement | null = null;
  private overlayContext: CanvasRenderingContext2D | null = null;
  private dragState: { isDragging: boolean; startPoint: Point; annotationId: string; handleId?: string } | null = null;

  constructor(app: any) {
    super();
    this.app = app;
    this.documentManager = app.documentManager;
  }

  async initialize(): Promise<void> {
    this.canvasContainer = document.getElementById('document-canvas-container')!;
    this.setupOverlayCanvas();
    this.bindEvents();
  }

  private setupOverlayCanvas(): void {
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.className = 'annotation-overlay';
    this.overlayContext = this.overlayCanvas.getContext('2d', { alpha: true, desynchronized: true })!;
    
    const container = this.canvasContainer!;
    container.appendChild(this.overlayCanvas);
    this.resizeOverlay();
    
    // Mouse events for drawing/selection
    this.overlayCanvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.overlayCanvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.overlayCanvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.overlayCanvas.addEventListener('click', this.handleClick.bind(this));
    this.overlayCanvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    this.overlayCanvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    
    // Touch events
    this.overlayCanvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.overlayCanvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.overlayCanvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  private resizeOverlay(): void {
    if (!this.overlayCanvas || !this.canvasContainer) return;
    
    const rect = this.canvasContainer.getBoundingClientRect();
    this.overlayCanvas.width = rect.width;
    this.overlayCanvas.height = rect.height;
    this.overlayCanvas.style.width = `${rect.width}px`;
    this.overlayCanvas.style.height = `${rect.height}px`;
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resizeOverlay());
    
    this.documentManager.on('page:change', () => this.renderAnnotations());
    this.documentManager.on('viewport:change', () => this.renderAnnotations());
    this.documentManager.on('document:open', (doc: any) => this.loadAnnotations(doc));
    this.documentManager.on('document:close', () => this.clearAnnotations());
  }

  // ============================================
  // TOOL MANAGEMENT
  // ============================================

  setTool(tool: ToolMode): void {
    this.currentTool = tool;
    this.updateCursor();
    this.cancelDrawing();
    this.clearSelection();
    this.emit('tool:change', tool);
  }

  getCurrentTool(): ToolMode {
    return this.currentTool;
  }

  setToolOptions(options: Partial<ToolOptions>): void {
    this.toolOptions = { ...this.toolOptions, ...options };
  }

  getToolOptions(): ToolOptions {
    return { ...this.toolOptions };
  }

  private updateCursor(): void {
    if (!this.overlayCanvas) return;
    
    const cursors: Record<ToolMode, string> = {
      select: 'default',
      pan: 'grab',
      text: 'text',
      highlight: 'crosshair',
      underline: 'crosshair',
      strikethrough: 'crosshair',
      'sticky-note': 'copy',
      'text-box': 'crosshair',
      freehand: 'crosshair',
      rectangle: 'crosshair',
      ellipse: 'crosshair',
      line: 'crosshair',
      arrow: 'crosshair',
      signature: 'crosshair',
      image: 'copy',
      eraser: 'cell',
    };
    
    this.overlayCanvas.style.cursor = cursors[this.currentTool] || 'default';
  }

  // ============================================
  // ANNOTATION CREATION
  // ============================================

  async createAnnotation(type: AnnotationType, pageNumber: number, data: Partial<AnnotationData> = {}): Promise<Annotation> {
    const doc = this.documentManager.getActiveDocument();
    if (!doc) throw new Error('No active document');

    const page = doc.pages[pageNumber - 1];
    if (!page) throw new Error('Invalid page number');

    const annotation: Annotation = {
      id: this.generateId(),
      type,
      pageNumber,
      rect: this.getDefaultRect(type, page),
      color: this.toolOptions.color || this.getDefaultColor(type),
      opacity: this.toolOptions.opacity ?? 1,
      lineWidth: this.toolOptions.lineWidth ?? 2,
      author: 'User',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: this.getDefaultData(type, data),
      selected: false,
      locked: false,
      layer: this.getNextLayer(),
    };

    this.addAnnotation(annotation);
    this.emit('annotation:create', annotation);
    
    return annotation;
  }

  private getDefaultRect(type: AnnotationType, page: any): Rect {
    const centerX = page.width / 2;
    const centerY = page.height / 2;
    
    const defaults: Record<AnnotationType, Rect> = {
      highlight: { x: centerX - 100, y: centerY - 20, width: 200, height: 40 },
      underline: { x: centerX - 100, y: centerY + 10, width: 200, height: 2 },
      strikethrough: { x: centerX - 100, y: centerY, width: 200, height: 2 },
      'sticky-note': { x: centerX - 75, y: centerY - 75, width: 150, height: 150 },
      'text-box': { x: centerX - 150, y: centerY - 50, width: 300, height: 100 },
      freehand: { x: centerX - 50, y: centerY - 50, width: 100, height: 100 },
      rectangle: { x: centerX - 75, y: centerY - 50, width: 150, height: 100 },
      ellipse: { x: centerX - 75, y: centerY - 50, width: 150, height: 100 },
      line: { x: centerX - 75, y: centerY, width: 150, height: 2 },
      arrow: { x: centerX - 75, y: centerY, width: 150, height: 2 },
      signature: { x: centerX - 150, y: centerY - 50, width: 300, height: 100 },
      image: { x: centerX - 100, y: centerY - 100, width: 200, height: 200 },
    };
    
    return defaults[type] || { x: 0, y: 0, width: 100, height: 100 };
  }

  private getDefaultColor(type: AnnotationType): string {
    const colors: Record<AnnotationType, string> = {
      highlight: '#fff3bf',
      underline: '#ef4444',
      strikethrough: '#ef4444',
      'sticky-note': '#fff3bf',
      'text-box': '#000000',
      freehand: '#000000',
      rectangle: '#000000',
      ellipse: '#000000',
      line: '#000000',
      arrow: '#000000',
      signature: '#000000',
      image: '#000000',
    };
    return colors[type] || '#000000';
  }

  private getDefaultData(type: AnnotationType, userData: Partial<AnnotationData>): AnnotationData {
    const defaults: Record<AnnotationType, AnnotationData> = {
      highlight: { quadrilaterals: [], text: '' },
      underline: { quadrilaterals: [], text: '' },
      strikethrough: { quadrilaterals: [], text: '' },
      'sticky-note': { note: '', icon: 'note', open: false },
      'text-box': { content: '', fontSize: 12, fontFamily: 'Helvetica', fontColor: '#000000', alignment: 'left', backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0, borderStyle: 'solid', padding: 8 },
      freehand: { points: [], pressure: [] },
      rectangle: { fillColor: 'transparent', strokeColor: '#000000', strokeWidth: 2, strokeStyle: 'solid' },
      ellipse: { fillColor: 'transparent', strokeColor: '#000000', strokeWidth: 2, strokeStyle: 'solid' },
      line: { strokeColor: '#000000', strokeWidth: 2, strokeStyle: 'solid', startArrow: false, endArrow: false },
      arrow: { strokeColor: '#000000', strokeWidth: 2, strokeStyle: 'solid', startArrow: false, endArrow: true },
      signature: { signatureData: '', signatureType: 'drawn', strokeColor: '#000000', strokeWidth: 2 },
      image: { imageData: '', imageWidth: 0, imageHeight: 0, maintainAspectRatio: true },
    };

    return { ...defaults[type], ...userData } as AnnotationData;
  }

  private getNextLayer(): number {
    let maxLayer = 0;
    this.annotations.forEach(ann => {
      if (ann.layer > maxLayer) maxLayer = ann.layer;
    });
    return maxLayer + 1;
  }

  // ============================================
  // ANNOTATION MANAGEMENT
  // ============================================

  addAnnotation(annotation: Annotation): void {
    this.annotations.set(annotation.id, annotation);
    
    if (!this.annotationsByPage.has(annotation.pageNumber)) {
      this.annotationsByPage.set(annotation.pageNumber, new Set());
    }
    this.annotationsByPage.get(annotation.pageNumber)!.add(annotation.id);
    
    this.renderAnnotations();
    this.documentManager.getActiveDocument()?.annotations.push(annotation);
  }

  updateAnnotation(id: string, updates: Partial<Annotation>): void {
    const annotation = this.annotations.get(id);
    if (!annotation) return;

    Object.assign(annotation, updates, { updatedAt: Date.now() });
    
    // Update rect if provided
    if (updates.rect) {
      annotation.rect = { ...annotation.rect, ...updates.rect };
    }

    this.renderAnnotations();
    this.emit('annotation:update', annotation);
  }

  deleteAnnotation(id: string): void {
    const annotation = this.annotations.get(id);
    if (!annotation) return;

    this.annotations.delete(id);
    this.annotationsByPage.get(annotation.pageNumber)?.delete(id);
    
    this.renderAnnotations();
    this.emit('annotation:delete', id);
  }

  deleteSelected(): void {
    const ids = Array.from(this.selection.annotationIds);
    ids.forEach(id => this.deleteAnnotation(id));
    this.clearSelection();
  }

  getAnnotation(id: string): Annotation | undefined {
    return this.annotations.get(id);
  }

  getAnnotationsByPage(pageNumber: number): Annotation[] {
    const ids = this.annotationsByPage.get(pageNumber);
    if (!ids) return [];
    
    return Array.from(ids)
      .map(id => this.annotations.get(id))
      .filter((a): a is Annotation => a !== undefined)
      .sort((a, b) => a.layer - b.layer);
  }

  getAllAnnotations(): Annotation[] {
    return Array.from(this.annotations.values()).sort((a, b) => a.layer - b.layer);
  }

  // ============================================
  // SELECTION MANAGEMENT
  // ============================================

  selectAnnotation(id: string, add = false): void {
    const annotation = this.annotations.get(id);
    if (!annotation) return;

    if (!add) {
      this.clearSelection();
    }

    this.selection.annotationIds.push(id);
    annotation.selected = true;
    this.updateSelectionBounds();
    this.renderAnnotations();
    this.emit('selection:change', this.selection);
  }

  selectAll(pageNumber?: number): void {
    const annotations = pageNumber 
      ? this.getAnnotationsByPage(pageNumber)
      : this.getAllAnnotations();

    this.clearSelection();
    annotations.forEach(ann => {
      this.selection.annotationIds.push(ann.id);
      ann.selected = true;
    });
    this.updateSelectionBounds();
    this.renderAnnotations();
    this.emit('selection:change', this.selection);
  }

  clearSelection(): void {
    this.selection.annotationIds.forEach(id => {
      const ann = this.annotations.get(id);
      if (ann) ann.selected = false;
    });
    this.selection.annotationIds = [];
    this.selection.bounds = null;
    this.selection.handles = [];
    this.emit('selection:change', this.selection);
  }

  private updateSelectionBounds(): void {
    if (this.selection.annotationIds.length === 0) {
      this.selection.bounds = null;
      this.selection.handles = [];
      return;
    }

    const annotations = this.selection.annotationIds
      .map(id => this.annotations.get(id))
      .filter((a): a is Annotation => a !== undefined);

    if (annotations.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    annotations.forEach(ann => {
      minX = Math.min(minX, ann.rect.x);
      minY = Math.min(minY, ann.rect.y);
      maxX = Math.max(maxX, ann.rect.x + ann.rect.width);
      maxY = Math.max(maxY, ann.rect.y + ann.rect.height);
    });

    this.selection.bounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };

    // Create handles
    this.selection.handles = [
      { id: 'tl', position: 'tl', point: { x: minX, y: minY }, cursor: 'nw-resize' },
      { id: 'tm', position: 'tm', point: { x: minX + (maxX - minX) / 2, y: minY }, cursor: 'n-resize' },
      { id: 'tr', position: 'tr', point: { x: maxX, y: minY }, cursor: 'ne-resize' },
      { id: 'ml', position: 'ml', point: { x: minX, y: minY + (maxY - minY) / 2 }, cursor: 'w-resize' },
      { id: 'mr', position: 'mr', point: { x: maxX, y: minY + (maxY - minY) / 2 }, cursor: 'e-resize' },
      { id: 'bl', position: 'bl', point: { x: minX, y: maxY }, cursor: 'sw-resize' },
      { id: 'bm', position: 'bm', point: { x: minX + (maxX - minX) / 2, y: maxY }, cursor: 's-resize' },
      { id: 'br', position: 'br', point: { x: maxX, y: maxY }, cursor: 'se-resize' },
      { id: 'rotate', position: 'rotate', point: { x: minX + (maxX - minX) / 2, y: minY - 30 }, cursor: 'crosshair' },
    ];
  }

  // ============================================
  // DRAWING INTERACTION
  // ============================================

  private handleMouseDown(e: MouseEvent): void {
    const point = this.getCanvasPoint(e);
    
    if (this.currentTool === 'select') {
      this.handleSelectMouseDown(e, point);
    } else if (this.isDrawingTool(this.currentTool)) {
      this.startDrawing(point);
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const point = this.getCanvasPoint(e);
    this.app.statusBar.setCoordinates(point.x, point.y);

    if (this.drawingState.isDrawing) {
      this.updateDrawing(point);
    } else if (this.dragState?.isDragging) {
      this.handleDrag(point);
    } else if (this.currentTool === 'select') {
      this.handleSelectMouseMove(point);
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (this.drawingState.isDrawing) {
      this.finishDrawing();
    } else if (this.dragState?.isDragging) {
      this.endDrag();
    }
  }

  private handleClick(e: MouseEvent): void {
    if (this.currentTool === 'select') {
      const point = this.getCanvasPoint(e);
      this.handleSelectClick(point, e.shiftKey);
    }
  }

  private handleDoubleClick(e: MouseEvent): void {
    const point = this.getCanvasPoint(e);
    const annotation = this.hitTestAnnotation(point);
    
    if (annotation) {
      this.emit('annotation:edit', annotation);
    }
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
    const point = this.getCanvasPoint(e);
    const annotation = this.hitTestAnnotation(point);
    
    if (annotation) {
      this.showContextMenu(annotation, e.clientX, e.clientY);
    }
  }

  // Touch events
  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const point = this.getCanvasPoint({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
      
      if (this.isDrawingTool(this.currentTool)) {
        this.startDrawing(point);
      } else if (this.currentTool === 'select') {
        this.handleSelectMouseDown({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent, point);
      }
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const point = this.getCanvasPoint({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
      
      if (this.drawingState.isDrawing) {
        this.updateDrawing(point);
      }
    }
  }

  private handleTouchEnd(): void {
    if (this.drawingState.isDrawing) {
      this.finishDrawing();
    }
  }

  // ============================================
  // DRAWING LOGIC
  // ============================================

  private isDrawingTool(tool: ToolMode): boolean {
    return !['select', 'pan', 'text'].includes(tool);
  }

  private startDrawing(point: Point): void {
    this.drawingState = {
      isDrawing: true,
      startPoint: point,
      currentPoint: point,
      previewAnnotation: this.createPreviewAnnotation(point),
    };
    
    this.emit('drawing:start', { tool: this.currentTool, point });
  }

  private updateDrawing(point: Point): void {
    this.drawingState.currentPoint = point;
    this.drawingState.previewAnnotation = this.updatePreviewAnnotation(this.drawingState.previewAnnotation!, point);
    this.renderPreview();
  }

  private finishDrawing(): void {
    if (!this.drawingState.previewAnnotation) return;

    const annotation = this.finalizePreviewAnnotation(this.drawingState.previewAnnotation);
    this.createAnnotation(this.currentTool, this.documentManager.currentPage, annotation.data)
      .then(ann => {
        this.emit('drawing:finish', ann);
      });

    this.drawingState = {
      isDrawing: false,
      startPoint: null,
      currentPoint: null,
      previewAnnotation: null,
    };
    this.renderPreview();
  }

  private cancelDrawing(): void {
    this.drawingState = {
      isDrawing: false,
      startPoint: null,
      currentPoint: null,
      previewAnnotation: null,
    };
    this.renderPreview();
  }

  // Preview annotation helpers
  private createPreviewAnnotation(point: Point): Annotation {
    const page = this.documentManager.getActiveDocument()?.pages[this.documentManager.currentPage - 1];
    const rect = this.getDefaultRect(this.currentTool, page || { width: 800, height: 600 });
    
    return {
      id: 'preview',
      type: this.currentTool,
      pageNumber: this.documentManager.currentPage,
      rect: { ...rect, x: point.x, y: point.y },
      color: this.toolOptions.color || this.getDefaultColor(this.currentTool),
      opacity: this.toolOptions.opacity ?? 1,
      lineWidth: this.toolOptions.lineWidth ?? 2,
      author: 'User',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: this.getDefaultData(this.currentTool, {}),
      selected: false,
      locked: false,
      layer: 9999,
    };
  }

  private updatePreviewAnnotation(preview: Annotation, point: Point): Annotation {
    const start = this.drawingState.startPoint!;
    const current = point;
    
    let x = Math.min(start.x, current.x);
    let y = Math.min(start.y, current.y);
    let width = Math.abs(current.x - start.x);
    let height = Math.abs(current.y - start.y);

    // Minimum size
    width = Math.max(width, 10);
    height = Math.max(height, 10);

    preview.rect = { x, y, width, height };
    preview.updatedAt = Date.now();
    
    return preview;
  }

  private finalizePreviewAnnotation(preview: Annotation): Partial<Annotation> {
    return {
      rect: preview.rect,
      color: preview.color,
      opacity: preview.opacity,
      lineWidth: preview.lineWidth,
      data: preview.data,
    };
  }

  private renderPreview(): void {
    if (!this.overlayContext || !this.overlayCanvas) return;

    const ctx = this.overlayContext;
    ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

    if (this.drawingState.previewAnnotation) {
      this.drawAnnotation(ctx, this.drawingState.previewAnnotation, true);
    }
  }

  // ============================================
  // SELECTION INTERACTION
  // ============================================

  private handleSelectMouseDown(e: MouseEvent, point: Point): void {
    const annotation = this.hitTestAnnotation(point);
    
    if (annotation) {
      if (e.shiftKey) {
        this.selectAnnotation(annotation.id, true);
      } else {
        this.selectAnnotation(annotation.id, false);
      }
      this.startDrag(point, annotation.id);
    } else {
      // Check for handle click
      const handle = this.hitTestHandle(point);
      if (handle) {
        this.startDrag(point, this.selection.annotationIds[0], handle.id);
      } else {
        this.clearSelection();
        this.dragState = { isDragging: false, startPoint: point, annotationId: '' };
      }
    }
  }

  private handleSelectMouseMove(point: Point): void {
    // Update hover state
  }

  private handleSelectClick(point: Point, addToSelection: boolean): void {
    const annotation = this.hitTestAnnotation(point);
    if (annotation) {
      this.selectAnnotation(annotation.id, addToSelection);
    } else {
      if (!addToSelection) this.clearSelection();
    }
  }

  // ============================================
  // DRAG HANDLING
  // ============================================

  private dragState: { isDragging: boolean; startPoint: Point; annotationId: string; handleId?: string } | null = null;

  private startDrag(point: Point, annotationId: string, handleId?: string): void {
    this.dragState = {
      isDragging: true,
      startPoint: point,
      annotationId,
      handleId,
    };
  }

  private handleDrag(point: Point): void {
    if (!this.dragState?.isDragging) return;

    const dx = point.x - this.dragState.startPoint.x;
    const dy = point.y - this.dragState.startPoint.y;

    if (this.dragState.handleId) {
      // Resize via handle
      this.resizeViaHandle(this.dragState.annotationId, this.dragState.handleId, dx, dy);
    } else {
      // Move annotation(s)
      this.moveAnnotations(this.selection.annotationIds, dx, dy);
    }

    this.dragState.startPoint = point;
    this.renderAnnotations();
  }

  private endDrag(): void {
    this.dragState = null;
    this.updateSelectionBounds();
    this.emit('annotation:move', this.selection.annotationIds);
  }

  private moveAnnotations(ids: string[], dx: number, dy: number): void {
    ids.forEach(id => {
      const ann = this.annotations.get(id);
      if (ann) {
        ann.rect.x += dx;
        ann.rect.y += dy;
        ann.updatedAt = Date.now();
      }
    });
  }

  private resizeViaHandle(id: string, handleId: string, dx: number, dy: number): void {
    const ann = this.annotations.get(id);
    if (!ann) return;

    const rect = ann.rect;
    const handle = this.selection.handles.find(h => h.id === handleId);
    if (!handle) return;

    switch (handle.position) {
      case 'tl': rect.x += dx; rect.y += dy; rect.width -= dx; rect.height -= dy; break;
      case 'tm': rect.y += dy; rect.height -= dy; break;
      case 'tr': rect.y += dy; rect.width += dx; rect.height -= dy; break;
      case 'ml': rect.x += dx; rect.width -= dx; break;
      case 'mr': rect.width += dx; break;
      case 'bl': rect.x += dx; rect.width -= dx; rect.height += dy; break;
      case 'bm': rect.height += dy; break;
      case 'br': rect.width += dx; rect.height += dy; break;
      case 'rotate': this.rotateAnnotation(id, Math.atan2(dy, dx) * 180 / Math.PI); break;
    }

    // Minimum size
    ann.rect.width = Math.max(ann.rect.width, 10);
    ann.rect.height = Math.max(ann.rect.height, 10);
    ann.updatedAt = Date.now();
  }

  private rotateAnnotation(id: string, angle: number): void {
    const ann = this.annotations.get(id);
    if (!ann) return;
    // Implementation would rotate the annotation
    ann.updatedAt = Date.now();
  }

  // ============================================
  // HIT TESTING
  // ============================================

  private hitTestAnnotation(point: Point): Annotation | null {
    const pageAnnotations = this.getAnnotationsByPage(this.documentManager.currentPage);
    
    // Check in reverse layer order (top first)
    for (let i = pageAnnotations.length - 1; i >= 0; i--) {
      const ann = pageAnnotations[i];
      if (this.pointInRect(point, ann.rect)) {
        return ann;
      }
    }
    return null;
  }

  private hitTestHandle(point: Point): SelectionHandle | null {
    for (const handle of this.selection.handles) {
      const dx = point.x - handle.point.x;
      const dy = point.y - handle.point.y;
      if (Math.hypot(dx, dy) <= 8) {
        return handle;
      }
    }
    return null;
  }

  private pointInRect(point: Point, rect: Rect): boolean {
    return point.x >= rect.x && point.x <= rect.x + rect.width &&
           point.y >= rect.y && point.y <= rect.y + rect.height;
  }

  // ============================================
  // RENDERING
  // ============================================

  renderAnnotations(): void {
    if (!this.overlayContext || !this.overlayCanvas) return;

    const ctx = this.overlayContext;
    ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

    const annotations = this.getAnnotationsByPage(this.documentManager.currentPage);
    
    // Draw in layer order
    annotations.forEach(ann => {
      this.drawAnnotation(ctx, ann);
    });

    // Draw selection handles
    this.drawSelectionHandles(ctx);
  }

  private drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation, isPreview = false): void {
    if (isPreview) {
      ctx.globalAlpha = 0.7;
      ctx.setLineDash([5, 5]);
    } else {
      ctx.globalAlpha = ann.opacity ?? 1;
      ctx.setLineDash([]);
    }

    const rect = ann.rect;
    const color = ann.color;
    const lineWidth = ann.lineWidth;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;

    switch (ann.type) {
      case 'highlight':
        this.drawHighlight(ctx, ann);
        break;
      case 'underline':
      case 'strikethrough':
        this.drawLine(ctx, ann);
        break;
      case 'sticky-note':
        this.drawStickyNote(ctx, ann);
        break;
      case 'text-box':
        this.drawTextBox(ctx, ann);
        break;
      case 'freehand':
        this.drawFreehand(ctx, ann);
        break;
      case 'rectangle':
        this.drawRectangle(ctx, ann);
        break;
      case 'ellipse':
        this.drawEllipse(ctx, ann);
        break;
      case 'line':
      case 'arrow':
        this.drawLine(ctx, ann);
        break;
      case 'signature':
        this.drawSignature(ctx, ann);
        break;
      case 'image':
        this.drawImage(ctx, ann);
        break;
    }

    // Draw selection outline
    if (ann.selected && !isPreview) {
      ctx.strokeStyle = 'var(--accent-primary)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(
        ann.rect.x - 2,
        ann.rect.y - 2,
        ann.rect.width + 4,
        ann.rect.height + 4
      );
      ctx.setLineDash([]);
    }

    ctx.globalAlpha = 1;
  }

  // Drawing methods for each annotation type
  private drawHighlight(ctx: CanvasRenderingContext2D, ann: Annotation): void {
    ctx.fillStyle = ann.color;
    ctx.globalAlpha = (ann.opacity ?? 0.5) * ctx.globalAlpha;
    
    if (ann.data.quadrilaterals) {
      ann.data.quadrilaterals.forEach((quad: Point[]) => {
        ctx.beginPath();
        ctx.moveTo(quad[0].x, quad[0].y);
        quad.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fill();
      });
    } else {
      ctx.fillRect(ann.rect.x, ann.rect.y, ann.rect.width, ann.rect.height);
    }
  }

  private drawLine(ctx: CanvasRenderingContext2D, ann: Annotation): void {
    ctx.beginPath();
    ctx.moveTo(ann.rect.x, ann.rect.y + ann.rect.height / 2);
    ctx.lineTo(ann.rect.x + ann.rect.width, ann.rect.y + ann.rect.height / 2);
    ctx.stroke();
  }

  private drawStickyNote(ctx: CanvasRenderingContext2D, ann: Annotation): void {
    const rect = ann.rect;
    const radius = 8;
    
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
    ctx.fillStyle = ann.color;
    ctx.globalAlpha = ann.opacity ?? 1;
    ctx.fill();
    
    if (ann.data.note) {
      ctx.fillStyle = '#000';
      ctx.font = '12px sans-serif';
      ctx.fillText(ann.data.note.substring(0, 30), rect.x + 8, rect.y + 20);
    }
  }

  private drawTextBox(ctx: CanvasRenderingContext2D, ann: Annotation): void {
    const rect = ann.rect;
    const data = ann.data;
    
    if (data.backgroundColor !== 'transparent') {
      ctx.fillStyle = data.backgroundColor;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
    
    if (data.borderWidth > 0 && data.borderColor !== 'transparent') {
      ctx.strokeStyle = data.borderColor;
      ctx.lineWidth = data.borderWidth;
      ctx.setLineDash(data.borderStyle === 'dashed' ? [4, 4] : data.borderStyle === 'dotted' ? [2, 4] : []);
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      ctx.setLineDash([]);
    }
    
    if (data.content) {
      ctx.fillStyle = data.fontColor;
      ctx.font = `${data.fontSize}px ${data.fontFamily}`;
      ctx.textAlign = data.alignment;
      const x = data.alignment === 'center' ? rect.x + rect.width / 2 :
                data.alignment === 'right' ? rect.x + rect.width - data.padding :
                rect.x + data.padding;
      ctx.fillText(data.content, x, rect.y + data.padding + data.fontSize);
    }
  }

  private drawFreehand(ctx: CanvasRenderingContext2D, ann: Annotation): void {
    const points = ann.data.points;
    if (!points || points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  }

  private drawRectangle(ctx: CanvasRenderingContext2D, ann: Annotation): void {
    const rect = ann.rect;
    const data = ann.data;
    
    if (data.fillColor !== 'transparent') {
      ctx.fillStyle = data.fillColor;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
    
    ctx.strokeStyle = data.strokeColor || ann.color;
    ctx.lineWidth = data.strokeWidth ?? ann.lineWidth;
    ctx.setLineDash(data.strokeStyle === 'dashed' ? [4, 4] : data.strokeStyle === 'dotted' ? [2, 4] : []);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.setLineDash([]);
  }

  private drawEllipse(ctx: CanvasRenderingContext2D, ann: Annotation): void {
    const rect = ann.rect;
    const data = ann.data;
    
    ctx.beginPath();
    ctx.ellipse(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      rect.width / 2,
      rect.height / 2,
      0, 0, 2 * Math.PI
    );
    
    if (data.fillColor !== 'transparent') {
      ctx.fillStyle = data.fillColor;
      ctx.fill();
    }
    
    ctx.strokeStyle = data.strokeColor || ann.color;
    ctx.lineWidth = data.strokeWidth ?? ann.lineWidth;
    ctx.setLineDash(data.strokeStyle === 'dashed' ? [4, 4] : data.strokeStyle === 'dotted' ? [2, 4] : []);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawSignature(ctx: CanvasRenderingContext2D, ann: Annotation): void {
    if (ann.data.signatureData) {
      const img = new Image();
      img.src = ann.data.signatureData;
      img.onload = () => {
        ctx.drawImage(img, ann.rect.x, ann.rect.y, ann.rect.width, ann.rect.height);
      };
    }
  }

  private drawImage(ctx: CanvasRenderingContext2D, ann: Annotation): void {
    if (ann.data.imageData) {
      const img = new Image();
      img.src = ann.data.imageData;
      img.onload = () => {
        if (ann.data.maintainAspectRatio) {
          const scale = Math.min(ann.rect.width / img.width, ann.rect.height / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          const x = ann.rect.x + (ann.rect.width - w) / 2;
          const y = ann.rect.y + (ann.rect.height - h) / 2;
          ctx.drawImage(img, x, y, w, h);
        } else {
          ctx.drawImage(img, ann.rect.x, ann.rect.y, ann.rect.width, ann.rect.height);
        }
      };
    }
  }

  private drawSelectionHandles(ctx: CanvasRenderingContext2D): void {
    if (!this.selection.bounds) return;

    ctx.fillStyle = 'var(--accent-primary)';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;

    this.selection.handles.forEach(handle => {
      const size = 8;
      const x = handle.point.x - size / 2;
      const y = handle.point.y - size / 2;

      if (handle.position === 'rotate') {
        ctx.beginPath();
        ctx.arc(handle.point.x, handle.point.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(x, y, size, size);
        ctx.strokeRect(x, y, size, size);
      }
    });
  }

  // ============================================
  // COPY/PASTE/DUPLICATE
  // ============================================

  copy(): void {
    if (this.selection.annotationIds.length === 0) return;
    
    const annotations = this.selection.annotationIds
      .map(id => this.annotations.get(id))
      .filter((a): a is Annotation => a !== undefined);
    
    const clipboardData = annotations.map(ann => ({
      type: ann.type,
      rect: { ...ann.rect },
      color: ann.color,
      opacity: ann.opacity,
      lineWidth: ann.lineWidth,
      data: { ...ann.data },
    }));

    localStorage.setItem('zyncpdf-clipboard', JSON.stringify(clipboardData));
    this.app.toasts.info('Copied to clipboard');
  }

  paste(): void {
    const clipboardData = localStorage.getItem('zyncpdf-clipboard');
    if (!clipboardData) return;

    try {
      const annotations = JSON.parse(clipboardData);
      const offset = 20;

      annotations.forEach((data: any, i: number) => {
        const rect = {
          ...data.rect,
          x: data.rect.x + offset * i,
          y: data.rect.y + offset * i,
        };
        
        this.createAnnotation(data.type, this.documentManager.currentPage, {
          ...data,
          rect,
        });
      });
    } catch (e) {
      console.error('Paste failed:', e);
    }
  }

  duplicate(): void {
    const ids = [...this.selection.annotationIds];
    this.clearSelection();
    
    ids.forEach((id, i) => {
      const ann = this.annotations.get(id);
      if (ann) {
        const newRect = {
          ...ann.rect,
          x: ann.rect.x + 20,
          y: ann.rect.y + 20,
        };
        
        this.createAnnotation(ann.type, ann.pageNumber, {
          ...ann.data,
          rect: newRect,
        });
      });
    });
  }

  // ============================================
  // UTILITIES
  // ============================================

  private getCanvasPoint(e: MouseEvent | TouchEvent): Point {
    const rect = this.overlayCanvas!.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private showContextMenu(annotation: Annotation, x: number, y: number): void {
    // Would show a context menu
    this.emit('annotation:contextmenu', { annotation, x, y });
  }

  private renderAnnotations(): void {
    if (!this.overlayContext || !this.overlayCanvas) return;
    
    const ctx = this.overlayContext;
    ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

    const annotations = this.getAnnotationsByPage(this.documentManager.currentPage);
    annotations.forEach(ann => this.drawAnnotation(ctx, ann));
    
    this.drawSelectionHandles(ctx);
  }

  loadAnnotations(doc: any): void {
    this.annotations.clear();
    this.annotationsByPage.clear();
    
    doc.annotations?.forEach((ann: Annotation) => {
      this.addAnnotation(ann);
    });
  }

  clearAnnotations(): void {
    this.annotations.clear();
    this.annotationsByPage.clear();
    this.clearSelection();
    this.renderAnnotations();
  }

  private clearSelection(): void {
    this.selection.annotationIds.forEach(id => {
      const ann = this.annotations.get(id);
      if (ann) ann.selected = false;
    });
    this.selection.annotationIds = [];
    this.selection.bounds = null;
    this.selection.handles = [];
    this.emit('selection:change', this.selection);
  }

  setAnnotationTool(options: Partial<ToolOptions>): void {
    this.toolOptions = { ...this.toolOptions, ...options };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  destroy(): void {
    this.overlayCanvas?.remove();
    this.annotations.clear();
    this.annotationsByPage.clear();
  }
}