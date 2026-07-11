/**
 * @file History & Storage Utilities
 * LocalStorage, sessionStorage, IndexedDB, and history management
 * @module utils/history
 */

/**
 * @typedef {Object} HistoryItem
 * @property {string} id - Unique identifier
 * @property {string} tool - Tool identifier
 * @property {string} title - Display title
 * @property {FileInfo[]} files - Input files
 * @property {Object} options - Tool options used
 * @property {Blob[]} results - Output files
 * @property {number} timestamp - Unix timestamp
 * @property {number} duration - Processing time in ms
 * @property {boolean} favorite - Whether favorited
 */

/**
 * @typedef {Object} FileInfo
 * @property {string} name - File name
 * @property {number} size - File size
 * @property {string} type - MIME type
 * @property {string} [data] - Base64 data (for small files)
 */

/**
 * @typedef {Object} RecentFile
 * @property {string} id - Unique identifier
 * @property {string} name - File name
 * @property {number} size - File size
 * @property {string} type - MIME type
 * @property {string} tool - Tool used
 * @property {number} timestamp - Unix timestamp
 * @property {string} [data] - Base64 data (for small files < 100KB)
 */

/**
 * Storage keys
 */
const STORAGE_KEYS = {
  HISTORY: 'zyncpdf_history',
  RECENT_FILES: 'zyncpdf_recent_files',
  FAVORITES: 'zyncpdf_favorites',
  SETTINGS: 'zyncpdf_settings',
  THEME: 'zyncpdf_theme',
  RECENT_TOOLS: 'zyncpdf_recent_tools'
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  theme: 'system', // 'light', 'dark', 'system'
  animations: true,
  reducedMotion: false,
  autoSave: true,
  historyLimit: 100,
  recentFilesLimit: 20,
  notifications: true,
  keyboardShortcuts: true,
  language: 'en',
  defaultCompressionQuality: 0.75,
  defaultImageFormat: 'png',
  pageSize: 'A4',
  pageOrientation: 'portrait'
};

/**
 * Get storage item with error handling
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value
 * @returns {any} Parsed value or default
 */
function getStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn(`Failed to read storage key ${key}:`, e);
    return defaultValue;
  }
}

/**
 * Set storage item with error handling
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @returns {boolean} Success status
 */
function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`Failed to write storage key ${key}:`, e);
    return false;
  }
}

/**
 * Remove storage item
 * @param {string} key - Storage key
 */
function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`Failed to remove storage key ${key}:`, e);
  }
}

/**
 * Get all history items
 * @returns {HistoryItem[]} History items
 */
export function getHistory() {
  return getStorage(STORAGE_KEYS.HISTORY, []);
}

/**
 * Save history items
 * @param {HistoryItem[]} history - History items
 * @returns {boolean} Success status
 */
export function saveHistory(history) {
  return setStorage(STORAGE_KEYS.HISTORY, history);
}

/**
 * Add item to history
 * @param {HistoryItem} item - History item to add
 * @param {Object} options - Options
 * @param {number} [options.limit=100] - Maximum history items
 * @returns {HistoryItem} Added item with ID
 */
export function addToHistory(item, options = {}) {
  const { limit = 100 } = options;
  const history = getHistory();
  
  const newItem = {
    ...item,
    id: item.id || generateId(),
    timestamp: item.timestamp || Date.now()
  };
  
  // Remove any existing item with same ID (update)
  const filtered = history.filter(h => h.id !== newItem.id);
  
  // Add to beginning
  filtered.unshift(newItem);
  
  // Trim to limit
  const trimmed = filtered.slice(0, limit);
  
  saveHistory(trimmed);
  return newItem;
}

/**
 * Remove item from history
 * @param {string} id - Item ID
 * @returns {boolean} Success status
 */
export function removeFromHistory(id) {
  const history = getHistory();
  const filtered = history.filter(h => h.id !== id);
  return saveHistory(filtered);
}

/**
 * Clear all history
 * @returns {boolean} Success status
 */
export function clearHistory() {
  return setStorage(STORAGE_KEYS.HISTORY, []);
}

/**
 * Toggle favorite status
 * @param {string} id - History item ID
 * @returns {boolean} New favorite status
 */
export function toggleFavorite(id) {
  const history = getHistory();
  const item = history.find(h => h.id === id);
  if (item) {
    item.favorite = !item.favorite;
    saveHistory(history);
    return item.favorite;
  }
  return false;
}

/**
 * Get favorite items
 * @returns {HistoryItem[]} Favorite items
 */
export function getFavorites() {
  return getHistory().filter(h => h.favorite);
}

/**
 * Get recent files
 * @returns {RecentFile[]} Recent files
 */
export function getRecentFiles() {
  return getStorage(STORAGE_KEYS.RECENT_FILES, []);
}

/**
 * Add file to recent files
 * @param {RecentFile} file - File info
 * @param {Object} options - Options
 * @param {number} [options.limit=20] - Maximum recent files
 * @returns {RecentFile} Added file
 */
export function addRecentFile(file, options = {}) {
  const { limit = 20 } = options;
  const recent = getRecentFiles();
  
  const newFile = {
    ...file,
    id: file.id || generateId(),
    timestamp: file.timestamp || Date.now()
  };
  
  // Remove existing entry with same name+size+type
  const filtered = recent.filter(f => 
    !(f.name === newFile.name && f.size === newFile.size && f.type === newFile.type)
  );
  
  filtered.unshift(newFile);
  const trimmed = filtered.slice(0, limit);
  
  setStorage(STORAGE_KEYS.RECENT_FILES, trimmed);
  return newFile;
}

/**
 * Remove recent file
 * @param {string} id - File ID
 * @returns {boolean} Success status
 */
export function removeRecentFile(id) {
  const recent = getRecentFiles();
  const filtered = recent.filter(f => f.id !== id);
  return setStorage(STORAGE_KEYS.RECENT_FILES, filtered);
}

/**
 * Clear recent files
 * @returns {boolean} Success status
 */
export function clearRecentFiles() {
  return setStorage(STORAGE_KEYS.RECENT_FILES, []);
}

/**
 * Get recent tools
 * @returns {string[]} Recent tool IDs
 */
export function getRecentTools() {
  return getStorage(STORAGE_KEYS.RECENT_TOOLS, []);
}

/**
 * Add tool to recent tools
 * @param {string} toolId - Tool ID
 * @param {Object} options - Options
 * @param {number} [options.limit=10] - Maximum recent tools
 */
export function addRecentTool(toolId, options = {}) {
  const { limit = 10 } = options;
  const recent = getRecentTools();
  
  const filtered = recent.filter(t => t !== toolId);
  filtered.unshift(toolId);
  const trimmed = filtered.slice(0, limit);
  
  setStorage(STORAGE_KEYS.RECENT_TOOLS, trimmed);
}

/**
 * Get settings
 * @returns {Object} Settings object
 */
export function getSettings() {
  const stored = getStorage(STORAGE_KEYS.SETTINGS, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

/**
 * Save settings
 * @param {Object} settings - Settings to save
 * @returns {boolean} Success status
 */
export function saveSettings(settings) {
  const current = getSettings();
  const merged = { ...current, ...settings };
  return setStorage(STORAGE_KEYS.SETTINGS, merged);
}

/**
 * Update a single setting
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 * @returns {boolean} Success status
 */
export function setSetting(key, value) {
  const settings = getSettings();
  settings[key] = value;
  return saveSettings(settings);
}

/**
 * Get theme setting
 * @returns {'light'|'dark'|'system'} Current theme
 */
export function getTheme() {
  return getSettings().theme;
}

/**
 * Set theme
 * @param {'light'|'dark'|'system'} theme - Theme value
 * @returns {boolean} Success status
 */
export function setTheme(theme) {
  return setSetting('theme', theme);
}

/**
 * Apply theme to document
 * @param {'light'|'dark'|'system'} theme - Theme to apply
 */
export function applyTheme(theme) {
  const root = document.documentElement;
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
  
  // Update meta theme-color
  updateMetaThemeColor(theme);
}

/**
 * Initialize theme system
 */
export function initTheme() {
  const theme = getTheme();
  applyTheme(theme);
  
  // Listen for system theme changes
  if (theme === 'system') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (getTheme() === 'system') {
        applyTheme('system');
      }
    });
  }
  
  return theme;
}

/**
 * Update meta theme-color tag
 * @param {'light'|'dark'|'system'} theme - Current theme
 */
function updateMetaThemeColor(theme) {
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.name = 'theme-color';
    document.head.appendChild(metaThemeColor);
  }
  
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  metaThemeColor.content = isDark ? '#0a0a0f' : '#ffffff';
}

/**
 * Export all data as JSON
 * @returns {string} JSON string
 */
export function exportData() {
  const data = {
    history: getHistory(),
    recentFiles: getRecentFiles(),
    favorites: getFavorites(),
    settings: getSettings(),
    recentTools: getRecentTools(),
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Import data from JSON
 * @param {string} json - JSON string
 * @returns {boolean} Success status
 */
export function importData(json) {
  try {
    const data = JSON.parse(json);
    
    if (data.history) saveHistory(data.history);
    if (data.recentFiles) setStorage(STORAGE_KEYS.RECENT_FILES, data.recentFiles);
    if (data.settings) saveSettings(data.settings);
    if (data.recentTools) setStorage(STORAGE_KEYS.RECENT_TOOLS, data.recentTools);
    
    // Re-apply theme
    if (data.settings?.theme) {
      applyTheme(data.settings.theme);
    }
    
    return true;
  } catch (e) {
    console.error('Failed to import data:', e);
    return false;
  }
}

/**
 * Clear all data
 * @returns {boolean} Success status
 */
export function clearAllData() {
  try {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    return true;
  } catch (e) {
    console.error('Failed to clear data:', e);
    return false;
  }
}

/**
 * Get storage usage info
 * @returns {Object} Storage info
 */
export function getStorageInfo() {
  let total = 0;
  const details = {};
  
  for (const [name, key] of Object.entries(STORAGE_KEYS)) {
    const item = localStorage.getItem(key);
    const size = item ? new Blob([item]).size : 0;
    details[name] = size;
    total += size;
  }
  
  return {
    total,
    details,
    formatted: formatBytes(total)
  };
}

/**
 * Format bytes to human readable
 * @param {number} bytes - Bytes
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
function generateId() {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

/**
 * File to base64 for small files
 * @param {File} file - File to convert
 * @param {number} [maxSize=102400] - Max size in bytes (100KB)
 * @returns {Promise<string|null>} Base64 string or null if too large
 */
export async function fileToBase64(file, maxSize = 102400) {
  if (file.size > maxSize) return null;
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Base64 to File
 * @param {string} base64 - Base64 string
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 * @returns {File} File object
 */
export function base64ToFile(base64, filename, mimeType) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new File([byteArray], filename, { type: mimeType });
}

/**
 * IndexedDB wrapper for large file storage
 */
export class FileStore {
  constructor(dbName = 'ZyncPDF', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }
  
  async init() {
    if (this.db) return this.db;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('files')) {
          const store = db.createObjectStore('files', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('tool', 'tool', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('results')) {
          const store = db.createObjectStore('results', { keyPath: 'id' });
          store.createIndex('historyId', 'historyId', { unique: false });
        }
      };
    });
  }
  
  async saveFile(file, metadata = {}) {
    await this.init();
    const id = metadata.id || generateId();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      
      const request = store.put({
        id,
        file: await this.fileToBlob(file),
        name: file.name,
        size: file.size,
        type: file.type,
        timestamp: Date.now(),
        ...metadata
      });
      
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }
  
  async getFile(id) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async deleteFile(id) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
  
  async getFilesByTool(tool, limit = 50) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const index = store.index('tool');
      const request = index.getAll(IDBKeyRange.only(tool), limit);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async clearOldFiles(maxAge = 30 * 24 * 60 * 60 * 1000) {
    await this.init();
    const cutoff = Date.now() - maxAge;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoff));
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve(true);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  async fileToBlob(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsArrayBuffer(file);
    });
  }
  
  blobToFile(blob, name, type) {
    return new File([blob], name, { type });
  }
}

/**
 * Singleton file store instance
 */
export const fileStore = new FileStore();

/**
 * Initialize all storage systems
 */
export async function initStorage() {
  initTheme();
  await fileStore.init();
  console.log('[ZyncPDF] Storage initialized');
}