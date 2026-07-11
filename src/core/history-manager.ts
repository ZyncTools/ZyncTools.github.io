/**
 * ZyncPDF - History Manager
 * Undo/Redo system with document-level history
 */

import { HistoryEntry } from '../types/index.js';
import { EventEmitter } from '../utils/event-emitter.js';
import { v4 as uuidv4 } from '../utils/uuid.js';

interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  maxSize: number;
}

export class HistoryManager extends EventEmitter {
  private app: any;
  private documentManager: any;
  private states: Map<string, HistoryState> = new Map();
  private currentDocumentId: string | null = null;
  private maxHistorySize = 100;
  private isUndoing = false;
  private isRedoing = false;
  private batchMode = false;
  private batchEntries: HistoryEntry[] = [];

  constructor(app: any) {
    super();
    this.app = app;
    this.documentManager = app.documentManager;
  }

  async initialize(): Promise<void> {
    // Listen to document changes
    this.documentManager.on('document:open', (doc: any) => this.switchDocument(doc.id));
    this.documentManager.on('document:close', (id: string) => this.removeDocument(id));
    this.documentManager.on('document:modified', (doc: any) => this.recordDocumentChange(doc));
    this.documentManager.on('annotation:create', (ann: any) => this.recordAnnotationChange(ann, 'create'));
    this.documentManager.on('annotation:update', (ann: any) => this.recordAnnotationChange(ann, 'update'));
    this.documentManager.on('annotation:delete', (id: string) => this.recordAnnotationDelete(id));
    this.documentManager.on('annotation:move', (ids: string[]) => this.recordAnnotationMove(ids));
  }

  // ============================================
  // DOCUMENT STATE MANAGEMENT
  // ============================================

  private switchDocument(documentId: string): void {
    this.currentDocumentId = documentId;
    
    if (!this.states.has(documentId)) {
      this.states.set(documentId, {
        past: [],
        future: [],
        maxSize: this.maxHistorySize,
      });
    }
    
    this.emit('state:change', this.getState());
  }

  private removeDocument(documentId: string): void {
    this.states.delete(documentId);
    if (this.currentDocumentId === documentId) {
      this.currentDocumentId = null;
    }
  }

  private getState(): HistoryState | null {
    if (!this.currentDocumentId) return null;
    return this.states.get(this.currentDocumentId) || null;
  }

  private getCurrentState(): HistoryState {
    const state = this.getState();
    if (!state) {
      throw new Error('No active document');
    }
    return state;
  }

  // ============================================
  // RECORDING CHANGES
  // ============================================

  private recordDocumentChange(doc: any): void {
    if (this.isUndoing || this.isRedoing || this.batchMode) return;
    
    this.addEntry({
      type: 'document',
      action: 'modify',
      timestamp: Date.now(),
      documentId: doc.id,
      data: { metadata: doc.metadata },
      previousData: this.getPreviousDocumentState(doc.id),
    });
  }

  private recordAnnotationChange(annotation: any, action: 'create' | 'update' | 'style'): void {
    if (this.isUndoing || this.isRedoing || this.batchMode) return;

    this.addEntry({
      type: 'annotation',
      action,
      timestamp: Date.now(),
      documentId: this.currentDocumentId!,
      annotationId: annotation.id,
      data: this.serializeAnnotation(annotation),
      previousData: action === 'create' ? null : this.getPreviousAnnotationState(annotation.id),
    });
  }

  private recordAnnotationDelete(annotationId: string): void {
    if (this.isUndoing || this.isRedoing || this.batchMode) return;

    this.addEntry({
      type: 'annotation',
      action: 'delete',
      timestamp: Date.now(),
      documentId: this.currentDocumentId!,
      annotationId,
      data: null,
      previousData: this.getPreviousAnnotationState(annotationId),
    });
  }

  private recordAnnotationMove(annotationIds: string[]): void {
    if (this.isUndoing || this.isRedoing || this.batchMode) return;

    const previousPositions = annotationIds.map(id => {
      const ann = this.app.annotationManager.getAnnotation(id);
      return ann ? { id, rect: { ...ann.rect } } : null;
    }).filter(Boolean);

    this.addEntry({
      type: 'annotation',
      action: 'move',
      timestamp: Date.now(),
      documentId: this.currentDocumentId!,
      annotationId: 'multiple',
      data: { ids: annotationIds },
      previousData: { positions: previousPositions },
    });
  }

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  beginBatch(): void {
    this.batchMode = true;
    this.batchEntries = [];
  }

  endBatch(): void {
    this.batchMode = false;
    if (this.batchEntries.length > 0) {
      // Combine into a single batch entry
      this.addEntry({
        type: 'batch',
        action: 'batch',
        timestamp: Date.now(),
        documentId: this.currentDocumentId!,
        data: { entries: this.batchEntries },
        previousData: null,
      });
      this.batchEntries = [];
    }
  }

  recordInBatch(entry: HistoryEntry): void {
    if (this.batchMode) {
      this.batchEntries.push(entry);
    } else {
      this.addEntry(entry);
    }
  }

  // ============================================
  // CORE HISTORY OPERATIONS
  // ============================================

  private addEntry(entry: HistoryEntry): void {
    const state = this.getCurrentState();
    
    // Add to past
    state.past.push(entry);
    
    // Trim if exceeds max size
    if (state.past.length > state.maxSize) {
      state.past.shift();
    }
    
    // Clear future
    state.future = [];
    
    this.emit('history:change', { canUndo: true, canRedo: false });
  }

  private getPreviousDocumentState(documentId: string): any {
    const doc = this.app.documentManager.documents.get(documentId);
    return doc ? { metadata: { ...doc.metadata } } : null;
  }

  private getPreviousAnnotationState(annotationId: string): any {
    const ann = this.app.annotationManager.getAnnotation(annotationId);
    return ann ? this.serializeAnnotation(ann) : null;
  }

  private serializeAnnotation(annotation: any): any {
    return {
      id: annotation.id,
      type: annotation.type,
      pageNumber: annotation.pageNumber,
      rect: { ...annotation.rect },
      color: annotation.color,
      opacity: annotation.opacity,
      lineWidth: annotation.lineWidth,
      data: { ...annotation.data },
      author: annotation.author,
      layer: annotation.layer,
    };
  }

  // ============================================
  // UNDO/REDO
  // ============================================

  undo(): boolean {
    const state = this.getCurrentState();
    if (state.past.length === 0) return false;

    this.isUndoing = true;
    
    const entry = state.past.pop()!;
    state.future.push(entry);
    
    this.applyUndo(entry);
    
    this.isUndoing = false;
    this.emit('history:change', this.getCanUndoRedo());
    this.emit('undo', entry);
    
    return true;
  }

  redo(): boolean {
    const state = this.getCurrentState();
    if (state.future.length === 0) return false;

    this.isRedoing = true;
    
    const entry = state.future.pop()!;
    state.past.push(entry);
    
    this.applyRedo(entry);
    
    this.isRedoing = false;
    this.emit('history:change', this.getCanUndoRedo());
    this.emit('redo', entry);
    
    return true;
  }

  private applyUndo(entry: HistoryEntry): void {
    switch (entry.type) {
      case 'document':
        if (entry.action === 'modify' && entry.previousData) {
          const doc = this.app.documentManager.documents.get(entry.documentId);
          if (doc) {
            Object.assign(doc.metadata, entry.previousData.metadata);
            this.app.documentManager.emit('document:modified', doc);
          }
        }
        break;
        
      case 'annotation':
        if (entry.action === 'create') {
          // Delete the annotation
          this.app.annotationManager.deleteAnnotation(entry.annotationId);
        } else if (entry.action === 'delete') {
          // Restore the annotation
          if (entry.previousData) {
            this.app.annotationManager.addAnnotation(entry.previousData);
          }
        } else if (entry.action === 'update' || entry.action === 'style' || entry.action === 'move') {
          // Restore previous state
          if (entry.previousData) {
            if (entry.annotationId === 'multiple' && entry.previousData.positions) {
              entry.previousData.positions.forEach((pos: any) => {
                const ann = this.app.annotationManager.getAnnotation(pos.id);
                if (ann) {
                  ann.rect = pos.rect;
                  ann.updatedAt = Date.now();
                }
              });
            } else {
              const ann = this.app.annotationManager.getAnnotation(entry.annotationId);
              if (ann && entry.previousData) {
                Object.assign(ann, entry.previousData);
                ann.updatedAt = Date.now();
              }
            }
          }
        break;
        
      case 'batch':
        // Reverse batch entries
        entry.data.entries.reverse().forEach((batchEntry: HistoryEntry) => {
          this.applyUndo(batchEntry);
        });
        break;
    }
    
    this.app.annotationManager.renderAnnotations();
    this.app.documentManager.emit('document:modified', this.app.documentManager.getActiveDocument());
  }

  private applyRedo(entry: HistoryEntry): void {
    switch (entry.type) {
      case 'document':
        if (entry.action === 'modify' && entry.data) {
          const doc = this.app.documentManager.documents.get(entry.documentId);
          if (doc) {
            Object.assign(doc.metadata, entry.data.metadata);
            this.app.documentManager.emit('document:modified', doc);
          }
        }
        break;
        
      case 'annotation':
        if (entry.action === 'create') {
          // Recreate the annotation
          if (entry.data) {
            this.app.annotationManager.addAnnotation(entry.data);
          }
        } else if (entry.action === 'delete') {
          // Delete again
          this.app.annotationManager.deleteAnnotation(entry.annotationId);
        } else if (entry.action === 'update' || entry.action === 'style' || entry.action === 'move') {
          // Apply the new state
          if (entry.data) {
            if (entry.annotationId === 'multiple') {
              // Handle multiple
            } else {
              const ann = this.app.annotationManager.getAnnotation(entry.annotationId);
              if (ann) {
                Object.assign(ann, entry.data);
                ann.updatedAt = Date.now();
              }
            }
          }
        }
        break;
        
      case 'batch':
        entry.data.entries.forEach((batchEntry: HistoryEntry) => {
          this.applyRedo(batchEntry);
        });
        break;
    }
    
    this.app.annotationManager.renderAnnotations();
    this.app.documentManager.emit('document:modified', this.app.documentManager.getActiveDocument());
  }

  // ============================================
  // PUBLIC API
  // ============================================

  canUndo(): boolean {
    const state = this.getState();
    return state ? state.past.length > 0 : false;
  }

  canRedo(): boolean {
    const state = this.getState();
    return state ? state.future.length > 0 : false;
  }

  private getCanUndoRedo(): { canUndo: boolean; canRedo: boolean } {
    return { canUndo: this.canUndo(), canRedo: this.canRedo() };
  }

  getHistory(): HistoryEntry[] {
    const state = this.getState();
    if (!state) return [];
    return [...state.past];
  }

  getFuture(): HistoryEntry[] {
    const state = this.getState();
    if (!state) return [];
    return [...state.future];
  }

  clearHistory(): void {
    const state = this.getCurrentState();
    state.past = [];
    state.future = [];
    this.emit('history:change', this.getCanUndoRedo());
  }

  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    const state = this.getCurrentState();
    state.maxSize = size;
    
    if (state.past.length > size) {
      state.past = state.past.slice(-size);
    }
  }

  // ============================================
  // UTILITIES
  // ============================================

  getState(): HistoryState | null {
    return this.getState();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  destroy(): void {
    this.states.clear();
    this.currentDocumentId = null;
  }
}