/**
 * ZyncPDF - PDF Worker
 * Handles PDF rendering in a Web Worker for performance
 */

import type { PDFDocument } from '../types/index.js';

interface WorkerMessage {
  id: string;
  type: string;
  payload: any;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  payload?: any;
  error?: string;
}

class PDFWorker {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
  private requestId = 0;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create worker from inline code or separate file
      const workerCode = this.getWorkerCode();
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      this.worker = new Worker(workerUrl);
      
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleError.bind(this);

      // Wait for worker to be ready
      await this.sendMessage({ type: 'init' });
      
      this.initialized = true;
    } catch (error) {
      console.warn('[PDFWorker] Failed to initialize worker, falling back to main thread:', error);
      this.worker = null;
    }
  }

  private getWorkerCode(): string {
    return `
      // PDF.js Worker
      self.importScripts('/vendor/pdfjs/pdf.worker.min.mjs');
      
      // Initialize PDF.js
      const pdfjsLib = self.pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';
      
      // Document cache
      const documentCache = new Map();
      const pageCache = new Map();
      
      // Message handlers
      self.onmessage = async (e) => {
        const { id, type, payload } = e.data;
        
        try {
          let result;
          
          switch (type) {
            case 'init':
              result = { ready: true };
              break;
              
            case 'loadDocument':
              result = await loadDocument(payload.docId, payload.data);
              break;
              
            case 'renderPage':
              result = await renderPage(payload.docId, payload.pageNumber, payload.scale);
              break;
              
            case 'getTextContent':
              result = await getTextContent(payload.docId, payload.pageNumber);
              break;
              
            case 'getPageInfo':
              result = await getPageInfo(payload.docId, payload.pageNumber);
              break;
              
            case 'clearCache':
              clearCache(payload.docId);
              result = { success: true };
              break;
              
            default:
              throw new Error(\`Unknown message type: \${type}\`);
          }
          
          self.postMessage({ id, success: true, payload: result });
        } catch (error) {
          self.postMessage({ id, success: false, error: error.message });
        }
      };
      
      async function loadDocument(docId, data) {
        const uint8Array = new Uint8Array(data);
        const doc = await pdfjsLib.getDocument({ data: uint8Array }).promise;
        
        documentCache.set(docId, doc);
        
        return {
          numPages: doc.numPages,
          fingerprints: doc.fingerprints,
        };
      }
      
      async function renderPage(docId, pageNumber, scale = 1) {
        const doc = documentCache.get(docId);
        if (!doc) throw new Error('Document not found');
        
        const cacheKey = \`\${docId}-\${pageNumber}-\${scale}\`;
        if (pageCache.has(cacheKey)) {
          return pageCache.get(cacheKey);
        }
        
        const page = await doc.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        
        const canvas = new OffscreenCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        await page.render({ canvasContext: context, viewport }).promise;
        
        // Convert to blob for transfer
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        
        const result = {
          width: viewport.width,
          height: viewport.height,
          blob,
        };
        
        pageCache.set(cacheKey, result);
        return result;
      }
      
      async function getTextContent(docId, pageNumber) {
        const doc = documentCache.get(docId);
        if (!doc) throw new Error('Document not found');
        
        const page = await doc.getPage(pageNumber);
        const textContent = await page.getTextContent();
        
        return {
          items: textContent.items.map(item => ({
            str: item.str,
            transform: item.transform,
            width: item.width,
            height: item.height,
            fontName: item.fontName,
          }),
        };
      }
      
      async function getPageInfo(docId, pageNumber) {
        const doc = documentCache.get(docId);
        if (!doc) throw new Error('Document not found');
        
        const page = await doc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        
        return {
          width: viewport.width,
          height: viewport.height,
          rotation: page.rotation,
        };
      }
      
      function clearCache(docId) {
        if (docId) {
          // Clear specific document cache
          for (const key of pageCache.keys()) {
            if (key.startsWith(\`\${docId}-\`)) {
              pageCache.delete(key);
            }
          }
          documentCache.delete(docId);
        } else {
          // Clear all
          pageCache.clear();
          documentCache.clear();
        }
      }
    `;
  }

  private handleMessage(e: MessageEvent): void {
    const { id, success, payload, error } = e.data;
    const request = this.pendingRequests.get(id);
    
    if (!request) return;
    
    this.pendingRequests.delete(id);
    
    if (success) {
      request.resolve(payload);
    } else {
      request.reject(new Error(error || 'Unknown error'));
    }
  }

  private handleError(error: ErrorEvent): void {
    console.error('[PDFWorker] Worker error:', error);
  }

  private async sendMessage(message: Omit<WorkerMessage, 'id'>): Promise<any> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    const id = `${++this.requestId}-${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      this.worker!.postMessage({ ...message, id });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Worker request timeout'));
        }
      }, 30000);
    });
  }

  async loadDocument(docId: string, file: File | ArrayBuffer): Promise<any> {
    const data = file instanceof File ? await file.arrayBuffer() : file;
    return this.sendMessage({ type: 'loadDocument', payload: { docId, data } });
  }

  async renderPage(docId: string, pageNumber: number, scale: number = 1): Promise<any> {
    return this.sendMessage({ type: 'renderPage', payload: { docId, pageNumber, scale } });
  }

  async getTextContent(docId: string, pageNumber: number): Promise<any> {
    return this.sendMessage({ type: 'getTextContent', payload: { docId, pageNumber } });
  }

  async getPageInfo(docId: string, pageNumber: number): Promise<any> {
    return this.sendMessage({ type: 'getPageInfo', payload: { docId, pageNumber } });
  }

  clearCache(docId?: string): void {
    this.sendMessage({ type: 'clearCache', payload: { docId } });
  }

  async destroy(): Promise<void> {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.initialized = false;
      this.pendingRequests.clear();
    }
  }
}

export const pdfWorker = new PDFWorker();
export default pdfWorker;