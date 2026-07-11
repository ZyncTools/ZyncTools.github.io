/**
 * ZyncPDF - Storage Manager
 * Handles IndexedDB and localStorage for persistence
 */

import { AppSettings, PDFDocument, DEFAULT_SETTINGS } from '../types/index.js';

const DB_NAME = 'ZyncPDF';
const DB_VERSION = 2;
const STORES = {
  DOCUMENTS: 'documents',
  ANNOTATIONS: 'annotations',
  SETTINGS: 'settings',
  HISTORY: 'history',
  WORKSPACES: 'workspaces',
  RECENT_FILES: 'recentFiles',
  FAVORITES: 'favorites',
  CACHE: 'cache',
} as const;

export class StorageManager {
  private db: IDBDatabase | null = null;
  private ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  /**
   * Initialize IndexedDB
   */
  private async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('[Storage] IndexedDB not available, falling back to localStorage');
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const database = event.target!.result;

        // Documents store
        if (!database.objectStoreNames.contains(STORES.DOCUMENTS)) {
          const docStore = database.createObjectStore(STORES.DOCUMENTS, { keyPath: 'id' });
          docStore.createIndex('name', 'name', { unique: false });
          docStore.createIndex('createdAt', 'createdAt', { unique: false });
          docStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Annotations store
        if (!database.objectStoreNames.contains(STORES.ANNOTATIONS)) {
          const annStore = database.createObjectStore(STORES.ANNOTATIONS, { keyPath: 'id' });
          annStore.createIndex('documentId', 'documentId', { unique: false });
          annStore.createIndex('pageNumber', 'pageNumber', { unique: false });
          annStore.createIndex('type', 'type', { unique: false });
        }

        // Settings store
        if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
          database.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }

        // History store
        if (!database.objectStoreNames.contains(STORES.HISTORY)) {
          const histStore = database.createObjectStore(STORES.HISTORY, { keyPath: 'id' });
          histStore.createIndex('documentId', 'documentId', { unique: false });
          histStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Workspaces store
        if (!database.objectStoreNames.contains(STORES.WORKSPACES)) {
          database.createObjectStore(STORES.WORKSPACES, { keyPath: 'id' });
        }

        // Recent files store
        if (!database.objectStoreNames.contains(STORES.RECENT_FILES)) {
          const recentStore = database.createObjectStore(STORES.RECENT_FILES, { keyPath: 'id' });
          recentStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Favorites store
        if (!database.objectStoreNames.contains(STORES.FAVORITES)) {
          database.createObjectStore(STORES.FAVORITES, { keyPath: 'id' });
        }

        // Cache store
        if (!database.objectStoreNames.contains(STORES.CACHE)) {
          const cacheStore = database.createObjectStore(STORES.CACHE, { keyPath: 'key' });
          cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });

    // Clean up expired cache entries periodically
    this.startCacheCleanup();
  }

  /**
   * Wait for DB to be ready
   */
  async waitReady(): Promise<void> {
    await this.ready;
  }

  /**
   * Get settings
   */
  async getSettings(): Promise<AppSettings> {
    await this.waitReady();
    
    if (!this.db) {
      return this.getSettingsFromLocalStorage();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.SETTINGS, 'readonly');
      const store = transaction.objectStore(STORES.SETTINGS);
      const request = store.get('app-settings');

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve({ ...DEFAULT_SETTINGS, ...result.value });
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save settings
   */
  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    await this.waitReady();

    const currentSettings = await this.getSettings();
    const newSettings = { ...currentSettings, ...settings };

    if (!this.db) {
      this.saveSettingsToLocalStorage(newSettings);
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.SETTINGS, 'readwrite');
      const store = transaction.objectStore(STORES.SETTINGS);
      const request = store.put({ key: 'app-settings', value: newSettings, updatedAt: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get settings from localStorage fallback
   */
  private getSettingsFromLocalStorage(): AppSettings {
    try {
      const stored = localStorage.getItem('zyncpdf-settings');
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('[Storage] Failed to parse settings from localStorage');
    }
    return DEFAULT_SETTINGS;
  }

  /**
   * Save settings to localStorage fallback
   */
  private saveSettingsToLocalStorage(settings: AppSettings): void {
    try {
      localStorage.setItem('zyncpdf-settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('[Storage] Failed to save settings to localStorage');
    }
  }

  /**
   * Save a document
   */
  async saveDocument(document: PDFDocument): Promise<void> {
    await this.waitReady();

    if (!this.db) {
      this.saveDocumentToLocalStorage(document);
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.DOCUMENTS, 'readwrite');
      const store = transaction.objectStore(STORES.DOCUMENTS);
      const request = store.put({
        ...document,
        updatedAt: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a document by ID
   */
  async getDocument(id: string): Promise<PDFDocument | null> {
    await this.waitReady();

    if (!this.db) {
      return this.getDocumentFromLocalStorage(id);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.DOCUMENTS, 'readonly');
      const store = transaction.objectStore(STORES.DOCUMENTS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all documents
   */
  async getAllDocuments(): Promise<PDFDocument[]> {
    await this.waitReady();

    if (!this.db) {
      return this.getAllDocumentsFromLocalStorage();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.DOCUMENTS, 'readonly');
      const store = transaction.objectStore(STORES.DOCUMENTS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<void> {
    await this.waitReady();

    if (!this.db) {
      this.deleteDocumentFromLocalStorage(id);
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.DOCUMENTS, 'readwrite');
      const store = transaction.objectStore(STORES.DOCUMENTS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save annotation
   */
  async saveAnnotation(annotation: any): Promise<void> {
    await this.waitReady();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.ANNOTATIONS, 'readwrite');
      const store = transaction.objectStore(STORES.ANNOTATIONS);
      const request = store.put({
        ...annotation,
        updatedAt: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get annotations for a document
   */
  async getAnnotations(documentId: string): Promise<any[]> {
    await this.waitReady();

    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.ANNOTATIONS, 'readonly');
      const store = transaction.objectStore(STORES.ANNOTATIONS);
      const index = store.index('documentId');
      const request = index.getAll(documentId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete annotation
   */
  async deleteAnnotation(id: string): Promise<void> {
    await this.waitReady();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.ANNOTATIONS, 'readwrite');
      const store = transaction.objectStore(STORES.ANNOTATIONS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save history entry
   */
  async saveHistory(entry: any): Promise<void> {
    await this.waitReady();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.HISTORY, 'readwrite');
      const store = transaction.objectStore(STORES.HISTORY);
      const request = store.put({
        ...entry,
        timestamp: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get history for a document
   */
  async getHistory(documentId: string, limit = 100): Promise<any[]> {
    await this.waitReady();

    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.HISTORY, 'readonly');
      const store = transaction.objectStore(STORES.HISTORY);
      const index = store.index('documentId');
      const request = index.getAll(documentId);

      request.onsuccess = () => {
        const results = (request.result || []).sort((a, b) => b.timestamp - a.timestamp);
        resolve(results.slice(0, limit));
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add recent file
   */
  async addRecentFile(file: any): Promise<void> {
    await this.waitReady();

    if (!this.db) return;

    const maxRecent = 20;
    const existing = await this.getRecentFiles();
    const filtered = existing.filter(f => f.id !== file.id);
    filtered.unshift({ ...file, timestamp: Date.now() });
    const trimmed = filtered.slice(0, maxRecent);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.RECENT_FILES, 'readwrite');
      const store = transaction.objectStore(STORES.RECENT_FILES);
      
      // Clear and re-add
      store.clear().onsuccess = () => {
        for (const file of trimmed) {
          store.put(file);
        }
        resolve();
      };
      store.clear().onerror = () => reject(store.transaction?.error);
    });
  }

  /**
   * Get recent files
   */
  async getRecentFiles(): Promise<any[]> {
    await this.waitReady();

    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.RECENT_FILES, 'readonly');
      const store = transaction.objectStore(STORES.RECENT_FILES);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result || []).sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save workspace
   */
  async saveWorkspace(workspace: any): Promise<void> {
    await this.waitReady();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.WORKSPACES, 'readwrite');
      const store = transaction.objectStore(STORES.WORKSPACES);
      const request = store.put({
        ...workspace,
        updatedAt: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get workspace
   */
  async getWorkspace(id: string): Promise<any> {
    await this.waitReady();

    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.WORKSPACES, 'readonly');
      const store = transaction.objectStore(STORES.WORKSPACES);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all workspaces
   */
  async getAllWorkspaces(): Promise<any[]> {
    await this.waitReady();

    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.WORKSPACES, 'readonly');
      const store = transaction.objectStore(STORES.WORKSPACES);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cache operations
   */
  async setCache(key: string, value: any, ttl = 86400000): Promise<void> { // 24h default
    await this.waitReady();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CACHE, 'readwrite');
      const store = transaction.objectStore(STORES.CACHE);
      const request = store.put({
        key,
        value,
        createdAt: Date.now(),
        expiresAt: Date.now() + ttl,
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCache(key: string): Promise<any> {
    await this.waitReady();

    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CACHE, 'readonly');
      const store = transaction.objectStore(STORES.CACHE);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.expiresAt > Date.now()) {
          resolve(result.value);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCache(key: string): Promise<void> {
    await this.waitReady();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CACHE, 'readwrite');
      const store = transaction.objectStore(STORES.CACHE);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear expired cache entries
   */
  private async startCacheCleanup(): Promise<void> {
    if (!this.db) return;

    setInterval(async () => {
      try {
        const transaction = this.db!.transaction(STORES.CACHE, 'readwrite');
        const store = transaction.objectStore(STORES.CACHE);
        const index = store.index('expiresAt');
        const now = Date.now();
        const range = IDBKeyRange.upperBound(now);
        const request = index.openCursor(range);

        request.onsuccess = (event) => {
          const cursor = event.target!.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
      } catch (e) {
        console.warn('[Storage] Cache cleanup failed:', e);
      }
    }, 3600000); // Every hour
  }

  /**
   * LocalStorage fallbacks
   */
  private saveDocumentToLocalStorage(document: PDFDocument): void {
    try {
      const key = `zyncpdf-doc-${document.id}`;
      localStorage.setItem(key, JSON.stringify(document));
    } catch (e) {
      console.warn('[Storage] Failed to save document to localStorage');
    }
  }

  private getDocumentFromLocalStorage(id: string): PDFDocument | null {
    try {
      const key = `zyncpdf-doc-${id}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }

  private getAllDocumentsFromLocalStorage(): PDFDocument[] {
    const docs: PDFDocument[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('zyncpdf-doc-')) {
          const stored = localStorage.getItem(key!);
          if (stored) {
            docs.push(JSON.parse(stored));
          }
        }
      }
    } catch (e) {
      console.warn('[Storage] Failed to get documents from localStorage');
    }
    return docs;
  }

  private deleteDocumentFromLocalStorage(id: string): void {
    try {
      const key = `zyncpdf-doc-${id}`;
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('[Storage] Failed to delete document from localStorage');
    }
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    await this.waitReady();

    if (!this.db) {
      // Clear localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('zyncpdf-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      return;
    }

    const stores = Object.values(STORES);
    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Export all data as JSON
   */
  async exportData(): Promise<string> {
    const data = {
      settings: await this.getSettings(),
      documents: await this.getAllDocuments(),
      workspaces: await this.getAllWorkspaces(),
      recentFiles: await this.getRecentFiles(),
      exportedAt: new Date().toISOString(),
      version: '2.0.0',
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import data from JSON
   */
  async importData(json: string): Promise<void> {
    const data = JSON.parse(json);
    
    if (data.settings) {
      await this.saveSettings(data.settings);
    }
    
    if (data.documents) {
      for (const doc of data.documents) {
        await this.saveDocument(doc);
      }
    }
    
    if (data.workspaces) {
      for (const ws of data.workspaces) {
        await this.saveWorkspace(ws);
      }
    }
    
    if (data.recentFiles) {
      for (const file of data.recentFiles) {
        await this.addRecentFile(file);
      }
    }
  }
}

// Export singleton
export const storage = new StorageManager();