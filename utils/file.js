/**
 * @file File Utilities
 * File handling, validation, and processing utilities
 * @module utils/file
 */

/**
 * @typedef {Object} FileValidationResult
 * @property {boolean} valid - Whether the file is valid
 * @property {string} [error] - Error message if invalid
 * @property {string} [warning] - Warning message if applicable
 */

/**
 * @typedef {Object} FileInfo
 * @property {string} name - File name
 * @property {number} size - File size in bytes
 * @property {string} type - MIME type
 * @property {string} extension - File extension (lowercase, with dot)
 * @property {Date} lastModified - Last modified date
 * @property {boolean} isPDF - Whether file is PDF
 * @property {boolean} isImage - Whether file is an image
 * @property {boolean} isText - Whether file is text-based
 */

/**
 * Supported MIME types by category
 */
export const MIME_TYPES = {
  pdf: ['application/pdf'],
  image: [
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
    'image/svg+xml', 'image/bmp', 'image/tiff', 'image/x-icon',
    'image/heic', 'image/heif', 'image/avif'
  ],
  text: [
    'text/plain', 'text/csv', 'text/markdown', 'text/html',
    'application/json', 'application/xml', 'text/xml'
  ],
  document: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/rtf'
  ],
  archive: [
    'application/zip', 'application/x-zip-compressed',
    'application/x-rar-compressed', 'application/x-7z-compressed'
  ]
};

/**
 * File extension to MIME type mapping
 */
export const EXTENSION_TO_MIME = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.ico': 'image/x-icon',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.avif': 'image/avif',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.rtf': 'application/rtf',
  '.zip': 'application/zip',
  '.rar': 'application/x-rar-compressed',
  '.7z': 'application/x-7z-compressed'
};

/**
 * Maximum file sizes by type (in bytes)
 */
export const MAX_FILE_SIZES = {
  pdf: 500 * 1024 * 1024,      // 500 MB
  image: 100 * 1024 * 1024,    // 100 MB
  text: 50 * 1024 * 1024,      // 50 MB
  document: 200 * 1024 * 1024, // 200 MB
  default: 100 * 1024 * 1024   // 100 MB default
};

/**
 * Get file extension from name
 * @param {string} filename - File name
 * @returns {string} Extension with dot (e.g., '.pdf')
 */
export function getFileExtension(filename) {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.slice(lastDot).toLowerCase() : '';
}

/**
 * Get MIME type from file extension
 * @param {string} filename - File name
 * @returns {string} MIME type or 'application/octet-stream'
 */
export function getMimeFromExtension(filename) {
  const ext = getFileExtension(filename);
  return EXTENSION_TO_MIME[ext] || 'application/octet-stream';
}

/**
 * Get file category from MIME type
 * @param {string} mimeType - MIME type
 * @returns {string} Category: 'pdf', 'image', 'text', 'document', 'archive', or 'unknown'
 */
export function getFileCategory(mimeType) {
  for (const [category, types] of Object.entries(MIME_TYPES)) {
    if (types.includes(mimeType)) return category;
  }
  return 'unknown';
}

/**
 * Get comprehensive file information
 * @param {File} file - File object
 * @returns {FileInfo} File information
 */
export function getFileInfo(file) {
  const extension = getFileExtension(file.name);
  const mimeType = file.type || getMimeFromExtension(file.name);
  const category = getFileCategory(mimeType);
  
  return {
    name: file.name,
    size: file.size,
    type: mimeType,
    extension,
    lastModified: new Date(file.lastModified),
    isPDF: category === 'pdf',
    isImage: category === 'image',
    isText: category === 'text',
    isDocument: category === 'document',
    isArchive: category === 'archive',
    category
  };
}

/**
 * Validate a file for a specific tool
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @param {string[]} options.allowedTypes - Allowed MIME types
 * @param {string[]} options.allowedExtensions - Allowed extensions
 * @param {number} options.maxSize - Maximum file size in bytes
 * @param {number} options.minSize - Minimum file size in bytes
 * @param {boolean} options.requireValidExtension - Require matching extension
 * @returns {FileValidationResult} Validation result
 */
export function validateFile(file, options = {}) {
  const {
    allowedTypes = [],
    allowedExtensions = [],
    maxSize = MAX_FILE_SIZES.default,
    minSize = 0,
    requireValidExtension = true
  } = options;
  
  const info = getFileInfo(file);
  
  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File "${file.name}" exceeds maximum size of ${formatFileSize(maxSize)}`
    };
  }
  
  if (file.size < minSize) {
    return {
      valid: false,
      error: `File "${file.name}" is too small (minimum ${formatFileSize(minSize)})`
    };
  }
  
  // Check MIME type
  if (allowedTypes.length > 0 && !allowedTypes.includes(info.type)) {
    return {
      valid: false,
      error: `File "${file.name}" has unsupported type: ${info.type}`
    };
  }
  
  // Check extension
  if (allowedExtensions.length > 0 && !allowedExtensions.includes(info.extension)) {
    if (requireValidExtension) {
      return {
        valid: false,
        error: `File "${file.name}" has unsupported extension: ${info.extension}`
      };
    }
    return {
      valid: true,
      warning: `File "${file.name}" has unexpected extension: ${info.extension}`
    };
  }
  
  // Check extension matches MIME type
  if (requireValidExtension && info.type !== 'application/octet-stream') {
    const expectedMime = EXTENSION_TO_MIME[info.extension];
    if (expectedMime && expectedMime !== info.type) {
      return {
        valid: true,
        warning: `File "${file.name}" extension doesn't match content type`
      };
    }
  }
  
  return { valid: true };
}

/**
 * Validate multiple files
 * @param {File[]} files - Files to validate
 * @param {Object} options - Validation options (same as validateFile)
 * @returns {Object} Validation results
 * @property {File[]} validFiles - Valid files
 * @property {Object[]} invalidFiles - Invalid files with errors
 * @property {Object[]} warnings - Files with warnings
 */
export function validateFiles(files, options = {}) {
  const validFiles = [];
  const invalidFiles = [];
  const warnings = [];
  
  for (const file of files) {
    const result = validateFile(file, options);
    if (result.valid) {
      validFiles.push(file);
      if (result.warning) warnings.push({ file, warning: result.warning });
    } else {
      invalidFiles.push({ file, error: result.error });
    }
  }
  
  return { validFiles, invalidFiles, warnings };
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  if (bytes < 0) return 'Unknown size';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Format file size for display (compact)
 * @param {number} bytes - Size in bytes
 * @returns {string} Compact formatted size
 */
export function formatFileSizeCompact(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return '?';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  const value = bytes / Math.pow(k, i);
  return value >= 100 ? `${Math.round(value)} ${sizes[i]}` : `${value.toFixed(1)} ${sizes[i]}`;
}

/**
 * Read file as text
 * @param {File|Blob} file - File to read
 * @param {string} [encoding='utf-8'] - Text encoding
 * @returns {Promise<string>} File content as text
 */
export function readFileAsText(file, encoding = 'utf-8') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, encoding);
  });
}

/**
 * Read file as ArrayBuffer
 * @param {File|Blob} file - File to read
 * @returns {Promise<ArrayBuffer>} File content as ArrayBuffer
 */
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Read file as Data URL
 * @param {File|Blob} file - File to read
 * @returns {Promise<string>} Data URL
 */
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Read file as binary string
 * @param {File|Blob} file - File to read
 * @returns {Promise<string>} Binary string
 */
export function readFileAsBinaryString(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(file);
  });
}

/**
 * Create a File object from blob data
 * @param {Blob|ArrayBuffer|Uint8Array} data - File data
 * @param {string} name - File name
 * @param {Object} options - File options
 * @param {string} [options.type] - MIME type
 * @param {Date} [options.lastModified] - Last modified date
 * @returns {File} New File object
 */
export function createFile(data, name, options = {}) {
  const { type = getMimeFromExtension(name), lastModified = new Date() } = options;
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  return new File([blob], name, { type, lastModified: lastModified.getTime() });
}

/**
 * Create object URL for a file/blob
 * @param {File|Blob} file - File or blob
 * @returns {string} Object URL (remember to revoke!)
 */
export function createObjectURL(file) {
  return URL.createObjectURL(file);
}

/**
 * Revoke object URL
 * @param {string} url - Object URL to revoke
 */
export function revokeObjectURL(url) {
  URL.revokeObjectURL(url);
}

/**
 * Download a blob as a file
 * @param {Blob|File} blob - Blob to download
 * @param {string} filename - Download filename
 */
export function downloadBlob(blob, filename) {
  const url = createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Delay revoke to allow download to start
  setTimeout(() => revokeObjectURL(url), 1000);
}

/**
 * Download multiple files as ZIP
 * @param {Object[]} files - Array of { name, blob } objects
 * @param {string} zipName - ZIP filename
 * @returns {Promise<void>}
 */
export async function downloadAsZip(files, zipName) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  
  files.forEach(({ name, blob }) => {
    zip.file(name, blob);
  });
  
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  downloadBlob(blob, zipName);
}

/**
 * Check if File API is supported
 * @returns {boolean} True if supported
 */
export function isFileAPISupported() {
  return !!(window.File && window.FileReader && window.FileList && window.Blob);
}

/**
 * Check if drag and drop is supported
 * @returns {boolean} True if supported
 */
export function isDragDropSupported() {
  const div = document.createElement('div');
  return ('draggable' in div) || ('ondragstart' in div && 'ondrop' in div);
}

/**
 * Get accept attribute string for file input
 * @param {string[]} categories - Categories from MIME_TYPES
 * @returns {string} Accept attribute value
 */
export function getAcceptAttribute(categories) {
  const types = [];
  for (const cat of categories) {
    if (MIME_TYPES[cat]) {
      types.push(...MIME_TYPES[cat]);
    }
  }
  // Add extensions as well
  const extensions = [];
  for (const [ext, mime] of Object.entries(EXTENSION_TO_MIME)) {
    if (types.includes(mime)) {
      extensions.push(ext);
    }
  }
  
  return [...types, ...extensions].join(',');
}

/**
 * Parse file list from data transfer (drag & drop)
 * @param {DataTransfer} dataTransfer - Data transfer object
 * @returns {File[]} Array of files
 */
export function getFilesFromDataTransfer(dataTransfer) {
  const files = [];
  
  if (dataTransfer.files) {
    for (const file of dataTransfer.files) {
      files.push(file);
    }
  }
  
  // Also check for items (for directories)
  if (dataTransfer.items) {
    for (const item of dataTransfer.items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
  }
  
  return files;
}

/**
 * Filter and deduplicate files
 * @param {File[]} files - Files to process
 * @param {Object} options - Options
 * @param {number} [options.maxFiles] - Maximum number of files
 * @param {boolean} [options.allowDuplicates=false] - Allow duplicate files
 * @returns {File[]} Filtered files
 */
export function processFiles(files, options = {}) {
  const { maxFiles = 100, allowDuplicates = false } = options;
  const seen = new Set();
  const result = [];
  
  for (const file of files) {
    if (result.length >= maxFiles) break;
    
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (!allowDuplicates && seen.has(key)) continue;
    
    seen.add(key);
    result.push(file);
  }
  
  return result;
}

/**
 * Create a file input element programmatically
 * @param {Object} options - Input options
 * @param {string} options.accept - Accept attribute
 * @param {boolean} options.multiple - Allow multiple files
 * @param {Function} options.onChange - Change handler
 * @returns {HTMLInputElement} File input element
 */
export function createFileInput(options = {}) {
  const { accept = '', multiple = false, onChange } = options;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.multiple = multiple;
  input.style.display = 'none';
  
  if (onChange) {
    input.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      onChange(files, e);
    });
  }
  
  return input;
}

/**
 * Trigger file input click
 * @param {HTMLInputElement} input - File input element
 */
export function triggerFileInput(input) {
  if (input && input.click) {
    input.click();
  }
}

/**
 * Convert file to base64 string
 * @param {File|Blob} file - File to convert
 * @returns {Promise<string>} Base64 string (without data URL prefix)
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Convert base64 string to blob
 * @param {string} base64 - Base64 string
 * @param {string} mimeType - MIME type
 * @returns {Blob} Blob object
 */
export function base64ToBlob(base64, mimeType) {
  const byteChars = atob(base64);
  const byteArrays = [];
  
  for (let offset = 0; offset < byteChars.length; offset += 1024) {
    const slice = byteChars.slice(offset, offset + 1024);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  
  return new Blob(byteArrays, { type: mimeType });
}

/**
 * Get file icon class based on type
 * @param {File|FileInfo} file - File or file info
 * @returns {string} Font Awesome icon class
 */
export function getFileIcon(file) {
  const info = file instanceof File ? getFileInfo(file) : file;
  
  if (info.isPDF) return 'fas fa-file-pdf text-red-500';
  if (info.isImage) return 'fas fa-file-image text-green-500';
  if (info.isText) return 'fas fa-file-alt text-blue-500';
  if (info.isDocument) {
    if (info.extension === '.docx' || info.extension === '.doc') return 'fas fa-file-word text-blue-600';
    if (info.extension === '.xlsx' || info.extension === '.xls') return 'fas fa-file-excel text-green-600';
    if (info.extension === '.pptx' || info.extension === '.ppt') return 'fas fa-file-powerpoint text-orange-500';
    return 'fas fa-file-alt text-gray-500';
  }
  if (info.isArchive) return 'fas fa-file-archive text-yellow-500';
  return 'fas fa-file text-gray-500';
}

/**
 * Check if file is likely a valid PDF by reading header
 * @param {File|Blob} file - File to check
 * @returns {Promise<boolean>} True if appears to be PDF
 */
export async function isValidPDF(file) {
  try {
    const buffer = await readFileAsArrayBuffer(file.slice(0, 5));
    const header = new Uint8Array(buffer);
    return header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46; // %PDF
  } catch {
    return false;
  }
}

/**
 * Check if file is likely a valid image by reading header
 * @param {File|Blob} file - File to check
 * @returns {Promise<boolean>} True if appears to be valid image
 */
export async function isValidImage(file) {
  try {
    const buffer = await readFileAsArrayBuffer(file.slice(0, 12));
    const header = new Uint8Array(buffer);
    
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) return true;
    // JPEG: FF D8 FF
    if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) return true;
    // GIF: 47 49 46 38
    if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38) return true;
    // WebP: 52 49 46 46 ... 57 45 42 50
    if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
        header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) return true;
    // BMP: 42 4D
    if (header[0] === 0x42 && header[1] === 0x4D) return true;
    // TIFF: 49 49 2A 00 or 4D 4D 00 2A
    if ((header[0] === 0x49 && header[1] === 0x49 && header[2] === 0x2A && header[3] === 0x00) ||
        (header[0] === 0x4D && header[1] === 0x4D && header[2] === 0x00 && header[3] === 0x2A)) return true;
    
    return false;
  } catch {
    return false;
  }
}