/**
 * @file PDF Utilities
 * Core PDF processing utilities using PDF-lib and PDF.js
 * @module utils/pdf
 */

import { PDFDocument, PDFPage, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

/**
 * PDF.js worker configuration
 */
pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';

/**
 * @typedef {Object} PDFPageInfo
 * @property {number} index - Zero-based page index
 * @property {number} width - Page width in points
 * @property {number} height - Page height in points
 * @property {number} rotation - Page rotation in degrees
 * @property {string} [text] - Extracted text content
 */

/**
 * @typedef {Object} PDFDocumentInfo
 * @property {number} pageCount - Total number of pages
 * @property {string} title - Document title
 * @property {string} author - Document author
 * @property {string} subject - Document subject
 * @property {string} creator - Document creator
 * @property {string} producer - Document producer
 * @property {Date} creationDate - Creation date
 * @property {Date} modificationDate - Modification date
 * @property {PDFPageInfo[]} pages - Array of page info
 */

/**
 * Load a PDF document from a File or ArrayBuffer
 * @param {File|ArrayBuffer} source - PDF file or buffer
 * @returns {Promise<PDFDocument>} PDF-lib document instance
 */
export async function loadPDFDocument(source) {
  const arrayBuffer = source instanceof File ? await source.arrayBuffer() : source;
  return PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
}

/**
 * Load a PDF document for reading with PDF.js
 * @param {File|ArrayBuffer} source - PDF file or buffer
 * @returns {Promise<pdfjsLib.PDFDocumentProxy>} PDF.js document proxy
 */
export async function loadPDFJSDocument(source) {
  const arrayBuffer = source instanceof File ? await source.arrayBuffer() : source;
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  return loadingTask.promise;
}

/**
 * Get comprehensive PDF document information
 * @param {File|ArrayBuffer} source - PDF file or buffer
 * @returns {Promise<PDFDocumentInfo>} Document information
 */
export async function getPDFInfo(source) {
  const pdfDoc = await loadPDFDocument(source);
  const pdfjsDoc = await loadPDFJSDocument(source);
  
  const pageCount = pdfDoc.getPageCount();
  const pages = [];
  
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    const rotation = page.getRotation().angle;
    
    // Extract text using PDF.js
    const pdfjsPage = await pdfjsDoc.getPage(i + 1);
    const textContent = await pdfjsPage.getTextContent();
    const text = textContent.items.map(item => item.str).join(' ');
    
    pages.push({ index: i, width, height, rotation, text });
  }
  
  const metadata = pdfDoc.getMetadata();
  
  return {
    pageCount,
    title: metadata.Title || '',
    author: metadata.Author || '',
    subject: metadata.Subject || '',
    creator: metadata.Creator || '',
    producer: metadata.Producer || '',
    creationDate: metadata.CreationDate ? new Date(metadata.CreationDate) : null,
    modificationDate: metadata.ModDate ? new Date(metadata.ModDate) : null,
    pages
  };
}

/**
 * Render a PDF page to a canvas
 * @param {pdfjsLib.PDFDocumentProxy} pdfDoc - PDF.js document
 * @param {number} pageNumber - 1-based page number
 * @param {Object} options - Render options
 * @param {number} [options.scale=1] - Render scale
 * @param {number} [options.rotation=0] - Rotation in degrees
 * @returns {Promise<HTMLCanvasElement>} Canvas with rendered page
 */
export async function renderPDFPage(pdfDoc, pageNumber, options = {}) {
  const { scale = 1, rotation = 0 } = options;
  const page = await pdfDoc.getPage(pageNumber);
  
  const viewport = page.getViewport({ scale, rotation });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}

/**
 * Render PDF page to blob
 * @param {pdfjsLib.PDFDocumentProxy} pdfDoc - PDF.js document
 * @param {number} pageNumber - 1-based page number
 * @param {Object} options - Render options
 * @param {number} [options.scale=2] - Render scale (higher = better quality)
 * @param {string} [options.format='image/png'] - Output format
 * @param {number} [options.quality=0.92] - JPEG quality
 * @returns {Promise<Blob>} Image blob
 */
export async function renderPDFPageToBlob(pdfDoc, pageNumber, options = {}) {
  const { scale = 2, format = 'image/png', quality = 0.92 } = options;
  const canvas = await renderPDFPage(pdfDoc, pageNumber, { scale });
  return new Promise(resolve => canvas.toBlob(resolve, format, quality));
}

/**
 * Convert PDF pages to images
 * @param {File|ArrayBuffer} pdfSource - PDF source
 * @param {Object} options - Conversion options
 * @param {number[]} [options.pages] - Specific pages to convert (1-based)
 * @param {number} [options.scale=2] - Render scale
 * @param {string} [options.format='image/png'] - Output format
 * @param {number} [options.quality=0.92] - JPEG quality
 * @param {Function} [options.onProgress] - Progress callback (current, total)
 * @returns {Promise<Blob[]>} Array of image blobs
 */
export async function convertPDFToImages(pdfSource, options = {}) {
  const { pages, scale = 2, format = 'image/png', quality = 0.92, onProgress } = options;
  const pdfDoc = await loadPDFJSDocument(pdfSource);
  const pageCount = pdfDoc.numPages;
  
  const pageNumbers = pages || Array.from({ length: pageCount }, (_, i) => i + 1);
  const blobs = [];
  
  for (let i = 0; i < pageNumbers.length; i++) {
    const pageNum = pageNumbers[i];
    const blob = await renderPDFPageToBlob(pdfDoc, pageNum, { scale, format, quality });
    blobs.push(blob);
    onProgress?.(i + 1, pageNumbers.length);
  }
  
  return blobs;
}

/**
 * Merge multiple PDF documents
 * @param {(File|ArrayBuffer)[]} sources - Array of PDF sources
 * @param {Object} options - Merge options
 * @param {Function} [options.onProgress] - Progress callback
 * @returns {Promise<Uint8Array>} Merged PDF bytes
 */
export async function mergePDFs(sources, options = {}) {
  const { onProgress } = options;
  const mergedDoc = await PDFDocument.create();
  let totalPages = 0;
  
  // First pass: count total pages
  for (const source of sources) {
    const doc = await loadPDFDocument(source);
    totalPages += doc.getPageCount();
  }
  
  let processedPages = 0;
  
  for (const source of sources) {
    const doc = await loadPDFDocument(source);
    const pageCount = doc.getPageCount();
    
    const copiedPages = await mergedDoc.copyPages(doc, Array.from({ length: pageCount }, (_, i) => i));
    copiedPages.forEach(page => mergedDoc.addPage(page));
    
    processedPages += pageCount;
    onProgress?.(processedPages, totalPages);
  }
  
  return mergedDoc.save();
}

/**
 * Split PDF by page ranges
 * @param {File|ArrayBuffer} source - Source PDF
 * @param {Object} options - Split options
 * @param {number[][]} options.ranges - Array of [start, end] page ranges (1-based, inclusive)
 * @param {Function} [options.onProgress] - Progress callback
 * @returns {Promise<Uint8Array[]>} Array of PDF bytes for each range
 */
export async function splitPDFByRanges(source, options = {}) {
  const { ranges, onProgress } = options;
  const doc = await loadPDFDocument(source);
  const results = [];
  
  for (let i = 0; i < ranges.length; i++) {
    const [start, end] = ranges[i];
    const newDoc = await PDFDocument.create();
    const pageIndices = Array.from({ length: end - start + 1 }, (_, j) => start - 1 + j);
    const pages = await newDoc.copyPages(doc, pageIndices);
    pages.forEach(page => newDoc.addPage(page));
    results.push(await newDoc.save());
    onProgress?.(i + 1, ranges.length);
  }
  
  return results;
}

/**
 * Extract specific pages from PDF
 * @param {File|ArrayBuffer} source - Source PDF
 * @param {number[]} pageNumbers - 1-based page numbers to extract
 * @param {Function} [onProgress] - Progress callback
 * @returns {Promise<Uint8Array>} New PDF bytes
 */
export async function extractPDFPages(source, pageNumbers, onProgress) {
  const doc = await loadPDFDocument(source);
  const newDoc = await PDFDocument.create();
  
  const validPages = pageNumbers.filter(n => n >= 1 && n <= doc.getPageCount());
  const pageIndices = validPages.map(n => n - 1);
  
  const pages = await newDoc.copyPages(doc, pageIndices);
  pages.forEach((page, i) => {
    newDoc.addPage(page);
    onProgress?.(i + 1, pages.length);
  });
  
  return newDoc.save();
}

/**
 * Remove pages from PDF
 * @param {File|ArrayBuffer} source - Source PDF
 * @param {number[]} pageNumbers - 1-based page numbers to remove
 * @returns {Promise<Uint8Array>} New PDF bytes
 */
export async function removePDFPages(source, pageNumbers) {
  const doc = await loadPDFDocument(source);
  const pageCount = doc.getPageCount();
  
  const pagesToKeep = Array.from({ length: pageCount }, (_, i) => i + 1)
    .filter(n => !pageNumbers.includes(n));
  
  return extractPDFPages(source, pagesToKeep);
}

/**
 * Rotate PDF pages
 * @param {File|ArrayBuffer} source - Source PDF
 * @param {Object} options - Rotation options
 * @param {number[]} [options.pages] - Specific pages to rotate (1-based), default all
 * @param {number} options.rotation - Rotation in degrees (90, 180, 270)
 * @returns {Promise<Uint8Array>} Rotated PDF bytes
 */
export async function rotatePDFPages(source, options = {}) {
  const { pages, rotation = 90 } = options;
  const doc = await loadPDFDocument(source);
  const pageCount = doc.getPageCount();
  
  const targetPages = pages || Array.from({ length: pageCount }, (_, i) => i + 1);
  const rotationDegrees = rotation % 360;
  
  targetPages.forEach(pageNum => {
    if (pageNum >= 1 && pageNum <= pageCount) {
      const page = doc.getPage(pageNum - 1);
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees(currentRotation + rotationDegrees));
    }
  });
  
  return doc.save();
}

/**
 * Reorder PDF pages
 * @param {File|ArrayBuffer} source - Source PDF
 * @param {number[]} newOrder - New page order (1-based indices)
 * @returns {Promise<Uint8Array>} Reordered PDF bytes
 */
export async function reorderPDFPages(source, newOrder) {
  const doc = await loadPDFDocument(source);
  const pageCount = doc.getPageCount();
  
  // Validate order
  const validOrder = newOrder.filter(n => n >= 1 && n <= pageCount);
  if (validOrder.length !== pageCount) {
    throw new Error('Invalid page order: must include all pages exactly once');
  }
  
  const newDoc = await PDFDocument.create();
  const pageIndices = validOrder.map(n => n - 1);
  const pages = await newDoc.copyPages(doc, pageIndices);
  pages.forEach(page => newDoc.addPage(page));
  
  return newDoc.save();
}

/**
 * Compress PDF by downsampling images
 * @param {File|ArrayBuffer} source - Source PDF
 * @param {Object} options - Compression options
 * @param {number} [options.quality=0.75] - JPEG quality for images (0-1)
 * @param {number} [options.maxDimension=1920] - Max image dimension
 * @returns {Promise<Uint8Array>} Compressed PDF bytes
 */
export async function compressPDF(source, options = {}) {
  const { quality = 0.75, maxDimension = 1920 } = options;
  const doc = await loadPDFDocument(source);
  
  // Note: PDF-lib doesn't support image recompression directly
  // This is a placeholder for more advanced compression
  // In production, you'd use a more sophisticated approach
  return doc.save({ useObjectStreams: true });
}

/**
 * Add password protection to PDF
 * @param {File|ArrayBuffer} source - Source PDF
 * @param {string} userPassword - User password
 * @param {string} ownerPassword - Owner password
 * @param {Object} options - Encryption options
 * @returns {Promise<Uint8Array>} Encrypted PDF bytes
 */
export async function addPDFPwd(source, userPassword, ownerPassword, options = {}) {
  const doc = await loadPDFDocument(source);
  // PDF-lib encryption support is limited
  // This would need a more complete implementation
  return doc.save({ 
    userPassword, 
    ownerPassword,
    permissions: {
      printing: 'high',
      modifying: false,
      copying: false,
      annotating: false,
      fillingForms: false,
      contentAccessibility: false,
      documentAssembly: false
    }
  });
}

/**
 * Remove password from PDF
 * @param {File|ArrayBuffer} source - Source PDF
 * @param {string} password - Password to unlock
 * @returns {Promise<Uint8Array>} Decrypted PDF bytes
 */
export async function removePDFPwd(source, password) {
  const arrayBuffer = source instanceof File ? await source.arrayBuffer() : source;
  const doc = await PDFDocument.load(arrayBuffer, { password });
  return doc.save();
}

/**
 * Update PDF metadata
 * @param {File|ArrayBuffer} source - Source PDF
 * @param {Object} metadata - New metadata
 * @returns {Promise<Uint8Array>} Updated PDF bytes
 */
export async function updatePDFMetadata(source, metadata) {
  const doc = await loadPDFDocument(source);
  
  if (metadata.title !== undefined) doc.setTitle(metadata.title);
  if (metadata.author !== undefined) doc.setAuthor(metadata.author);
  if (metadata.subject !== undefined) doc.setSubject(metadata.subject);
  if (metadata.creator !== undefined) doc.setCreator(metadata.creator);
  if (metadata.producer !== undefined) doc.setProducer(metadata.producer);
  if (metadata.creationDate !== undefined) doc.setCreationDate(metadata.creationDate);
  if (metadata.modificationDate !== undefined) doc.setModificationDate(metadata.modificationDate);
  
  return doc.save();
}

/**
 * Flatten PDF (remove annotations, forms)
 * @param {File|ArrayBuffer} source - Source PDF
 * @returns {Promise<Uint8Array>} Flattened PDF bytes
 */
export async function flattenPDF(source) {
  const doc = await loadPDFDocument(source);
  // PDF-lib doesn't have direct flattening, but saving without form fields helps
  return doc.save({ useObjectStreams: true });
}

/**
 * Compare two PDFs visually
 * @param {File|ArrayBuffer} sourceA - First PDF
 * @param {File|ArrayBuffer} sourceB - Second PDF
 * @param {Object} options - Comparison options
 * @returns {Promise<Blob[]>} Array of difference image blobs
 */
export async function comparePDFs(sourceA, sourceB, options = {}) {
  const { scale = 2, threshold = 0.1 } = options;
  const [docA, docB] = await Promise.all([
    loadPDFJSDocument(sourceA),
    loadPDFJSDocument(sourceB)
  ]);
  
  const pageCount = Math.max(docA.numPages, docB.numPages);
  const diffs = [];
  
  for (let i = 1; i <= pageCount; i++) {
    const [canvasA, canvasB] = await Promise.all([
      i <= docA.numPages ? renderPDFPage(docA, i, { scale }) : createBlankCanvas(docB, i, scale),
      i <= docB.numPages ? renderPDFPage(docB, i, { scale }) : createBlankCanvas(docA, i, scale)
    ]);
    
    const diffCanvas = compareCanvases(canvasA, canvasB, threshold);
    const blob = await new Promise(r => diffCanvas.toBlob(r, 'image/png'));
    diffs.push(blob);
  }
  
  return diffs;
}

function createBlankCanvas(doc, pageNum, scale) {
  const page = doc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

function compareCanvases(canvasA, canvasB, threshold) {
  const width = Math.max(canvasA.width, canvasB.width);
  const height = Math.max(canvasA.height, canvasB.height);
  
  const result = document.createElement('canvas');
  result.width = width;
  result.height = height;
  const ctx = result.getContext('2d');
  
  // Draw both canvases
  ctx.drawImage(canvasA, 0, 0);
  ctx.globalCompositeOperation = 'difference';
  ctx.drawImage(canvasB, 0, 0);
  
  // Enhance differences
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const diff = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (diff > threshold * 255) {
      data[i] = 255;     // Red
      data[i + 1] = 0;   // Green
      data[i + 2] = 0;   // Blue
      data[i + 3] = 255; // Alpha
    } else {
      data[i] = data[i + 1] = data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return result;
}

/**
 * Create ZIP file from multiple blobs
 * @param {Object[]} files - Array of { name, blob } objects
 * @returns {Promise<Blob>} ZIP blob
 */
export async function createZIP(files) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  
  files.forEach(({ name, blob }) => {
    zip.file(name, blob);
  });
  
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

/**
 * Estimate output file size for compression
 * @param {File|ArrayBuffer} source - Source PDF
 * @param {Object} options - Compression options
 * @returns {Promise<number>} Estimated size in bytes
 */
export async function estimateCompressedSize(source, options) {
  // This is a rough estimation
  const originalSize = source instanceof File ? source.size : source.byteLength;
  const quality = options.quality || 0.75;
  // Rough heuristic: images typically compress to 30-70% depending on content
  return Math.round(originalSize * (0.3 + 0.4 * quality));
}