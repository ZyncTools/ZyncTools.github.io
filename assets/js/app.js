/**
 * @file ZyncPDF Main Application
 * SPA entry point with routing, state management, and tool integration
 * @module app
 */

import { themeManager } from './utils/theme.js';
import { initCommandPalette } from './components/command-palette.js';
import { createNavbar } from './components/navbar.js';
import { createFooter } from './components/footer.js';
import { showToast, showSuccess, showError, showInfo, showWarning } from './components/toast.js';
import { getHistory, addToHistory, getRecentFiles, addRecentFile } from './utils/history.js';
import { getFileInfo, validateFile, formatFileSize } from './utils/file.js';
import { loadPDFDocument, convertPDFToImages, mergePDFs, splitPDFByRanges, extractPDFPages, removePDFPages, reorderPDFPages, rotatePDFPages, compressPDF, addPDFPwd, removePDFPwd, updatePDFMetadata, flattenPDF, comparePDFs } from './utils/pdf.js';
import { imagesToPDF, convertImage, compressImage, createThumbnail } from './utils/image.js';
import { createFileInput, triggerFileInput, downloadBlob, downloadAsZip } from './utils/file.js';
import { createDropZone } from './utils/ui.js';

/**
 * Tool registry
 */
const TOOLS = {
  'merge-pdf': {
    id: 'merge-pdf',
    name: 'Merge PDF',
    description: 'Combine multiple PDFs into one document',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
    category: 'pdf',
    accepts: '.pdf',
    multiple: true,
    component: () => import('./pages/merge/merge-tool.js')
  },
  'split-pdf': {
    id: 'split-pdf',
    name: 'Split PDF',
    description: 'Split PDF into separate files or extract pages',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>',
    category: 'pdf',
    accepts: '.pdf',
    multiple: false,
    component: () => import('./pages/split/split-tool.js')
  },
  'compress-pdf': {
    id: 'compress-pdf',
    name: 'Compress PDF',
    description: 'Reduce PDF file size while maintaining quality',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"></rect><path d="M17 8h-5"></path><path d="M17 12h-5"></path><path d="M17 16h-5"></path></svg>',
    category: 'pdf',
    accepts: '.pdf',
    multiple: false,
    component: () => import('./pages/compress/compress-tool.js')
  },
  'pdf-to-png': {
    id: 'pdf-to-png',
    name: 'PDF to PNG',
    description: 'Convert PDF pages to high-quality PNG images',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg>',
    category: 'convert',
    accepts: '.pdf',
    multiple: false,
    component: () => import('./pages/convert/pdf-to-image-tool.js')
  },
  'pdf-to-jpeg': {
    id: 'pdf-to-jpeg',
    name: 'PDF to JPEG',
    description: 'Convert PDF pages to JPEG images',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg>',
    category: 'convert',
    accepts: '.pdf',
    multiple: false,
    component: () => import('./pages/convert/pdf-to-image-tool.js')
  },
  'png-to-pdf': {
    id: 'png-to-pdf',
    name: 'PNG to PDF',
    description: 'Convert PNG images to PDF document',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>',
    category: 'convert',
    accepts: '.png',
    multiple: true,
    component: () => import('./pages/convert/image-to-pdf-tool.js')
  },
  'jpeg-to-pdf': {
    id: 'jpeg-to-pdf',
    name: 'JPEG to PDF',
    description: 'Convert JPEG images to PDF document',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>',
    category: 'convert',
    accepts: '.jpg,.jpeg',
    multiple: true,
    component: () => import('./pages/convert/image-to-pdf-tool.js')
  },
  'pdf-to-txt': {
    id: 'pdf-to-txt',
    name: 'PDF to Text',
    description: 'Extract text content from PDF files',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>',
    category: 'convert',
    accepts: '.pdf',
    multiple: false,
    component: () => import('./pages/convert/pdf-to-text-tool.js')
  },
  'txt-to-pdf': {
    id: 'txt-to-pdf',
    name: 'Text to PDF',
    description: 'Convert text files to PDF documents',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>',
    category: 'convert',
    accepts: '.txt',
    multiple: true,
    component: () => import('./pages/convert/text-to-pdf-tool.js')
  },
  'rotate-pdf': {
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    description: 'Rotate PDF pages by 90, 180, or 270 degrees',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>',
    category: 'pdf',
    accepts: '.pdf',
    multiple: false,
    component: () => import('./pages/rotate/rotate-tool.js')
  },
  'pdf-text-editor': {
    id: 'pdf-text-editor',
    name: 'PDF Text Editor',
    description: 'Edit text directly in PDF documents',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>',
    category: 'editor',
    accepts: '.pdf',
    multiple: false,
    component: () => import('./pages/editor/pdf-editor-tool.js')
  },
  'remove-pages': {
    id: 'remove-pages',
    name: 'Remove Pages',
    description: 'Delete specific pages from PDF files',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
    category: 'pdf',
    accepts: '.pdf',
    multiple: false,
    component: () => import('./pages/extract/remove-pages-tool.js')
  },
  'extract-pages': {
    id: 'extract-pages',
    name: 'Extract Pages',
    description: 'Extract specific pages from PDF files',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>',
    category: 'pdf',
    accepts: '.pdf',
    multiple: false,
    component: () => import('./pages/extract/extract-pages-tool.js')
  },
  'sort-pages': {
    id: 'sort-pages',
    name: 'Sort Pages',
    description: 'Reorder PDF pages by drag and drop',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>',
    category: 'pdf',
    accepts: '.pdf',
    multiple: false,
    component: () => import('./pages/extract/sort-pages-tool.js')
  },
  'add-password': {
    id: 'add-password',
    name: 'Add Password',
    description: 'Encrypt PDF with password protection',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
    category: 'security',
    accepts: '.pdf',
    multiple: false,
    component: () => import('./pages/security/password-tool.js')
  },
  'remove-password': {
    id: 'remove-password',
    name: 'Remove Password',
    description: 'Remove password from PDF files',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
    category: 'security',
    accepts: '.pdf',
    multiple: false,
    component: () => import('./pages/security/password-tool.js')
  },
  'remove-metadata': {
    id: 'remove-metadata',
    name: 'Remove Metadata',
    description: 'Strip all metadata from PDF files',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
    category: 'metadata',
    accepts: '.pdf',
    multiple: false,
    component: () => import('./pages/metadata/metadata-tool.js')
  },
  'edit-metadata': {
    id: 'edit-metadata',
    name: 'Edit Metadata',
    description: 'View and edit PDF document properties',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>',
    category: 'metadata',
    accepts: '.pdf',
    multiple: false,
    component: () => import('./pages/metadata/metadata-tool.js')
  },
  'flatten-pdf': {
    id: 'flatten-pdf',
    name: 'Flatten PDF',
    description: 'Flatten form fields and annotations',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"></rect><path d="M8 12h8"></path><path d="M12 8v8"></path></svg>',
    category: 'pdf',
    accepts: '.pdf',
    multiple: false,
    component: () => import('./pages/security/flatten-tool.js')
  },
  'compare-pdfs': {
    id: 'compare-pdfs',
    name: 'Compare PDFs',
    description: 'Compare two PDFs with visual diff',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>',
    category: 'pdf',
    accepts: '.pdf',
    multiple: false,
    component: () => import('./pages/compare/compare-tool.js')
  },
  'word-to-pdf': {
    id: 'word-to-pdf',
    name: 'Word to PDF',
    description: 'Convert Word documents to PDF',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>',
    category: 'office',
    accepts: '.doc,.docx',
    multiple: true,
    component: () => import('./pages/office/office-to-pdf-tool.js')
  },
  'excel-to-pdf': {
    id: 'excel-to-pdf',
    name: 'Excel to PDF',
    description: 'Convert Excel spreadsheets to PDF',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>',
    category: 'office',
    accepts: '.xls,.xlsx',
    multiple: true,
    component: () => import('./pages/office/office-to-pdf-tool.js')
  },
  'ppt-to-pdf': {
    id: 'ppt-to-pdf',
    name: 'PowerPoint to PDF',
    description: 'Convert PowerPoint presentations to PDF',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>',
    category: 'office',
    accepts: '.ppt,.pptx',
    multiple: true,
    component: () => import('./pages/office/office-to-pdf-tool.js')
  },
  'html-to-pdf': {
    id: 'html-to-pdf',
    name: 'HTML to PDF',
    description: 'Convert HTML files to PDF documents',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>',
    category: 'convert',
    accepts: '.html,.htm',
    multiple: true,
    component: () => import('./pages/convert/html-to-pdf-tool.js')
  },
  'markdown-to-pdf': {
    id: 'markdown-to-pdf',
    name: 'Markdown to PDF',
    description: 'Convert Markdown files to PDF documents',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>',
    category: 'convert',
    accepts: '.md,.markdown',
    multiple: true,
    component: () => import('./pages/convert/markdown-to-pdf-tool.js')
  },
  'webp-to-pdf': {
    id: 'webp-to-pdf',
    name: 'WEBP to PDF',
    description: 'Convert WEBP images to PDF documents',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>',
    category: 'convert',
    accepts: '.webp',
    multiple: true,
    component: () => import('./pages/convert/image-to-pdf-tool.js')
  },
  'heif-to-pdf': {
    id: 'heif-to-pdf',
    name: 'HEIF/HEIC to PDF',
    description: 'Convert HEIF/HEIC images to PDF documents',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>',
    category: 'convert',
    accepts: '.heif,.heic',
    multiple: true,
    component: () => import('./pages/convert/image-to-pdf-tool.js')
  },
  'svg-to-pdf': {
    id: 'svg-to-pdf',
    name: 'SVG to PDF',
    description: 'Convert SVG images to PDF documents',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>',
    category: 'convert',
    accepts: '.svg',
    multiple: true,
    component: () => import('./pages/convert/svg-tool.js')
  },
  'svg-to-png': {
    id: 'svg-to-png',
    name: 'SVG to PNG',
    description: 'Convert SVG to PNG images',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg>',
    category: 'convert',
    accepts: '.svg',
    multiple: true,
    component: () => import('./pages/convert/svg-tool.js')
  },
  'svg-to-jpeg': {
    id: 'svg-to-jpeg',
    name: 'SVG to JPEG',
    description: 'Convert SVG to JPEG images',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg>',
    category: 'convert',
    accepts: '.svg',
    multiple: true,
    component: () => import('./pages/convert/svg-tool.js')
  },
  'webp-to-png': {
    id: 'webp-to-png',
    name: 'WEBP to PNG',
    description: 'Convert WEBP to PNG images',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg>',
    category: 'convert',
    accepts: '.webp',
    multiple: true,
    component: () => import('./pages/convert/image-convert-tool.js')
  },
  'webp-to-jpeg': {
    id: 'webp-to-jpeg',
    name: 'WEBP to JPEG',
    description: 'Convert WEBP to JPEG images',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg>',
    category: 'convert',
    accepts: '.webp',
    multiple: true,
    component: () => import('./pages/convert/image-convert-tool.js')
  },
  'compress-image': {
    id: 'compress-image',
    name: 'Compress Image',
    description: 'Reduce image file size with quality control',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"></rect><path d="M17 8h-5"></path><path d="M17 12h-5"></path><path d="M17 16h-5"></path></svg>',
    category: 'image',
    accepts: '.jpg,.jpeg,.png,.webp',
    multiple: true,
    component: () => import('./pages/image/compress-image-tool.js')
  }
};

/**
 * Current application state
 */
const state = {
  currentTool: null,
  currentToolComponent: null,
  history: [],
  recentFiles: [],
  favorites: [],
  settings: {}
};

/**
 * Initialize application
 */
export async function initApp() {
  // Initialize theme
  themeManager.init();
  
  // Initialize history
  state.history = getHistory();
  state.recentFiles = getRecentFiles();
  
  // Create navbar
  const navbar = createNavbar({
    logoSrc: '/logo.png',
    logoAlt: 'ZyncPDF',
    brandName: 'ZyncPDF',
    links: [
      { href: '/', label: 'Home', icon: 'fas fa-home' },
      { href: '#tools', label: 'Tools', icon: 'fas fa-tools' },
      { href: '#features', label: 'Features', icon: 'fas fa-star' },
      { href: 'support.html', label: 'Support', icon: 'fas fa-heart', external: true }
    ],
    showSearch: true,
    onSearch: () => {
      const palette = window.commandPalette;
      if (palette) palette.open();
    },
    showThemeToggle: true,
    userMenu: [
      { label: 'Settings', href: 'settings.html', icon: 'fas fa-cog' },
      { label: 'Keyboard Shortcuts', href: '#', icon: 'fas fa-keyboard', action: showKeyboardShortcuts },
      { label: 'History', href: '#', icon: 'fas fa-history', action: showHistory },
      { label: 'Favorites', href: '#', icon: 'fas fa-star', action: showFavorites }
    ]
  });
  
  // Mount navbar
  document.body.insertBefore(navbar, document.body.firstChild);
  
  // Create footer
  const footer = createFooter();
  document.body.appendChild(footer);
  
  // Initialize command palette
  initCommandPalette([
    {
      id: 'new-file',
      title: 'New File',
      description: 'Create a new document',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
      shortcut: '⌘N',
      section: 'File',
      action: () => window.location.href = '/'
    },
    {
      id: 'open-recent',
      title: 'Open Recent',
      description: 'Open a recently used file',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>',
      shortcut: '⌘⇧O',
      section: 'File',
      action: showRecentFiles
    },
    {
      id: 'toggle-theme',
      title: 'Toggle Theme',
      description: 'Switch between light and dark mode',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
      shortcut: '⌘⇧T',
      section: 'View',
      action: () => themeManager.toggle()
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      description: 'Show all keyboard shortcuts',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01"></path></svg>',
      shortcut: '⌘/',
      section: 'Help',
      action: showKeyboardShortcuts
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Open application settings',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 1 4.6 9a1.65 1.65 0 0 1 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
      shortcut: '⌘,',
      section: 'Settings',
      action: () => window.location.href = 'settings.html'
    }
  ]);
  
  // Register global shortcuts
  registerGlobalShortcuts();
  
  // Check for tool in URL
  const toolFromUrl = getToolFromUrl();
  if (toolFromUrl) {
    await loadTool(toolFromUrl);
  }
  
  // Handle browser back/forward
  window.addEventListener('popstate', handlePopState);
  
  console.log('[ZyncPDF] Application initialized');
}

/**
 * Register global keyboard shortcuts
 */
function registerGlobalShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ignore if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      return;
    }
    
    const isMac = navigator.platform.includes('Mac');
    const modKey = isMac ? e.metaKey : e.ctrlKey;
    
    // Command palette: Ctrl/Cmd + K
    if (modKey && e.key === 'k') {
      e.preventDefault();
      const palette = window.commandPalette;
      if (palette) palette.toggle();
    }
    
    // Toggle theme: Ctrl/Cmd + Shift + T
    if (modKey && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      themeManager.toggle();
    }
    
    // Settings: Ctrl/Cmd + ,
    if (modKey && e.key === ',') {
      e.preventDefault();
      window.location.href = 'settings.html';
    }
    
    // Help/Shortcuts: Ctrl/Cmd + /
    if (modKey && e.key === '/') {
      e.preventDefault();
      showKeyboardShortcuts();
    }
    
    // New file: Ctrl/Cmd + N
    if (modKey && e.key === 'n') {
      e.preventDefault();
      window.location.href = '/';
    }
    
    // Escape - close modals/dropdowns
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
}

/**
 * Load a tool by ID
 * @param {string} toolId - Tool ID
 */
export async function loadTool(toolId) {
  const tool = TOOLS[toolId];
  if (!tool) {
    showError(`Tool "${toolId}" not found`);
    return;
  }
  
  // Update state
  state.currentTool = toolId;
  
  // Update URL without reload
  const url = new URL(window.location.href);
  url.pathname = `/${toolId}.html`;
  window.history.pushState({ tool: toolId }, '', url);
  
  // Show loading state
  const loadingToast = showLoading(`Loading ${tool.name}...`);
  
  try {
    // Load tool component
    const module = await tool.component();
    const ToolComponent = module.default || module;
    
    // Create tool instance
    state.currentToolComponent = new ToolComponent({
      tool,
      state,
      utils: {
        pdf: {
          loadPDFDocument,
          convertPDFToImages,
          mergePDFs,
          splitPDFByRanges,
          extractPDFPages,
          removePDFPages,
          reorderPDFPages,
          rotatePDFPages,
          compressPDF,
          addPDFPwd,
          removePDFPwd,
          updatePDFMetadata,
          flattenPDF,
          comparePDFs
        },
        image: {
          imagesToPDF,
          convertImage,
          compressImage,
          createThumbnail
        },
        file: {
          createFileInput,
          triggerFileInput,
          downloadBlob,
          downloadAsZip,
          getFileInfo,
          validateFile,
          formatFileSize
        },
        ui: {
          createDropZone,
          showToast,
          showSuccess,
          showError,
          showInfo,
          showWarning,
          showLoading
        }
      }
    });
    
    // Render tool
    await state.currentToolComponent.render();
    
    loadingToast();
    showSuccess(`${tool.name} loaded`);
    
  } catch (error) {
    console.error('Failed to load tool:', error);
    loadingToast();
    showError(`Failed to load ${tool.name}: ${error.message}`);
  }
}

/**
 * Get tool from URL
 * @returns {string|null} Tool ID
 */
function getToolFromUrl() {
  const path = window.location.pathname;
  const match = path.match(/\/([^/]+)\.html$/);
  if (match && TOOLS[match[1]]) {
    return match[1];
  }
  return null;
}

/**
 * Handle browser back/forward
 */
function handlePopState(e) {
  if (e.state?.tool) {
    loadTool(e.state.tool);
  } else {
    // Go home
    state.currentTool = null;
    if (state.currentToolComponent?.destroy) {
      state.currentToolComponent.destroy();
    }
    renderHomePage();
  }
}

/**
 * Render home page
 */
function renderHomePage() {
  const main = document.querySelector('main') || document.body;
  main.innerHTML = `
    <section class="hero">
      <div class="container">
        <h1>ZyncPDF</h1>
        <p>Your Files Stay With You. Convert, Merge, Edit — Privately.</p>
        <div class="hero-actions">
          <button class="btn btn-primary" data-action="browse-tools">Browse Tools</button>
          <button class="btn btn-secondary" data-action="recent-files">Recent Files</button>
        </div>
      </div>
    </section>
    <section class="tools-grid" id="tools-grid"></section>
  `;
  
  // Render tools grid
  renderToolsGrid();
  
  // Add event listeners
  main.querySelector('[data-action="browse-tools"]').addEventListener('click', () => {
    document.getElementById('tools-grid')?.scrollIntoView({ behavior: 'smooth' });
  });
  
  main.querySelector('[data-action="recent-files"]').addEventListener('click', showRecentFiles);
}

/**
 * Render tools grid
 */
function renderToolsGrid() {
  const grid = document.getElementById('tools-grid');
  if (!grid) return;
  
  const categories = {};
  Object.values(TOOLS).forEach(tool => {
    if (!categories[tool.category]) categories[tool.category] = [];
    categories[tool.category].push(tool);
  });
  
  grid.innerHTML = Object.entries(categories).map(([category, tools]) => `
    <div class="tool-category">
      <h2>${formatCategoryName(category)}</h2>
      <div class="tools-row">
        ${tools.map(tool => `
          <button class="tool-card" data-tool="${tool.id}" aria-label="${tool.name}">
            <span class="tool-icon">${tool.icon}</span>
            <span class="tool-name">${tool.name}</span>
            <span class="tool-desc">${tool.description}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  grid.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', () => loadTool(card.dataset.tool));
  });
}

/**
 * Format category name
 */
function formatCategoryName(category) {
  return category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ');
}

/**
 * Show keyboard shortcuts modal
 */
function showKeyboardShortcuts() {
  const shortcuts = [
    { keys: '⌘K', action: 'Open Command Palette' },
    { keys: '⌘⇧T', action: 'Toggle Theme' },
    { keys: '⌘/', action: 'Show Keyboard Shortcuts' },
    { keys: '⌘,', action: 'Open Settings' },
    { keys: '⌘N', action: 'New File / Home' },
    { keys: '⌘⇧O', action: 'Open Recent Files' },
    { keys: 'Escape', action: 'Close Modal / Cancel' },
    { keys: 'Enter', action: 'Confirm / Execute' },
    { keys: 'Tab / ↑↓', action: 'Navigate Options' },
    { keys: 'Drag & Drop', action: 'Upload Files' }
  ];
  
  const content = document.createElement('div');
  content.className = 'shortcuts-modal';
  content.innerHTML = `
    <div class="shortcuts-list">
      ${shortcuts.map(s => `
        <div class="shortcut-item">
          <kbd class="shortcut-keys">${s.keys.split(' + ').map(k => `<span>${k}</span>`).join('')}</kbd>
          <span class="shortcut-action">${s.action}</span>
        </div>
      `).join('')}
    </div>
  `;
  
  import('./components/modal.js').then(m => m.showModal({
    title: 'Keyboard Shortcuts',
    content,
    size: 'md',
    actions: [{ label: 'Close', variant: 'primary', onClick: () => {} }]
  }));
}

/**
 * Show history modal
 */
function showHistory() {
  const history = getHistory();
  
  const content = document.createElement('div');
  content.className = 'history-modal';
  
  if (history.length === 0) {
    content.innerHTML = '<p class="empty-state">No history yet</p>';
  } else {
    content.innerHTML = `
      <div class="history-list">
        ${history.slice(0, 20).map(item => `
          <div class="history-item" data-id="${item.id}">
            <div class="history-tool">
              <span class="history-tool-icon">${getToolIcon(item.tool)}</span>
              <span class="history-tool-name">${getToolName(item.tool)}</span>
            </div>
            <div class="history-time">${formatTime(item.timestamp)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  import('./components/modal.js').then(m => m.showModal({
    title: 'Conversion History',
    content,
    size: 'lg',
    actions: [{ label: 'Close', variant: 'primary', onClick: () => {} }]
  }));
}

/**
 * Show favorites modal
 */
function showFavorites() {
  const favorites = getHistory().filter(h => h.favorite);
  
  const content = document.createElement('div');
  content.className = 'favorites-modal';
  
  if (favorites.length === 0) {
    content.innerHTML = '<p class="empty-state">No favorites yet. Click the star icon on history items to add them.</p>';
  } else {
    content.innerHTML = `
      <div class="favorites-list">
        ${favorites.map(item => `
          <div class="favorite-item" data-id="${item.id}">
            <div class="favorite-tool">
              <span class="favorite-tool-icon">${getToolIcon(item.tool)}</span>
              <span class="favorite-tool-name">${getToolName(item.tool)}</span>
            </div>
            <div class="favorite-time">${formatTime(item.timestamp)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  import('./components/modal.js').then(m => m.showModal({
    title: 'Favorites',
    content,
    size: 'md',
    actions: [{ label: 'Close', variant: 'primary', onClick: () => {} }]
  }));
}

/**
 * Show recent files modal
 */
function showRecentFiles() {
  const recent = getRecentFiles();
  
  const content = document.createElement('div');
  content.className = 'recent-files-modal';
  
  if (recent.length === 0) {
    content.innerHTML = '<p class="empty-state">No recent files</p>';
  } else {
    content.innerHTML = `
      <div class="recent-files-list">
        ${recent.slice(0, 10).map(file => `
          <button class="recent-file-item" data-file='${JSON.stringify(file)}'>
            <div class="recent-file-info">
              <span class="recent-file-icon">${getFileIcon(file.type)}</span>
              <div class="recent-file-details">
                <span class="recent-file-name">${file.name}</span>
                <span class="recent-file-size">${formatFileSize(file.size)}</span>
              </div>
            </div>
            <span class="recent-file-time">${formatTime(file.timestamp)}</span>
          </button>
        `).join('')}
      </div>
    `;
    
    content.querySelectorAll('.recent-file-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const file = JSON.parse(btn.dataset.file);
        // Re-load file if possible
        showInfo(`Recent file: ${file.name}`);
      });
    });
  }
  
  import('./components/modal.js').then(m => m.showModal({
    title: 'Recent Files',
    content,
    size: 'md',
    actions: [{ label: 'Close', variant: 'primary', onClick: () => {} }]
  }));
}

/**
 * Get tool icon
 */
function getToolIcon(toolId) {
  const tool = TOOLS[toolId];
  return tool?.icon || '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect></svg>';
}

/**
 * Get tool name
 */
function getToolName(toolId) {
  return TOOLS[toolId]?.name || toolId;
}

/**
 * Get file icon
 */
function getFileIcon(mimeType) {
  if (mimeType?.includes('pdf')) return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';
  if (mimeType?.includes('image')) return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';
}

/**
 * Format time
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return date.toLocaleDateString();
}

/**
 * Close all modals
 */
function closeAllModals() {
  document.querySelectorAll('.modal-overlay.open').forEach(modal => {
    import('./components/modal.js').then(m => m.closeModal(modal));
  });
  
  // Close command palette
  const palette = window.commandPalette;
  if (palette?.isOpen) palette.close();
  
  // Close dropdowns
  document.querySelectorAll('.dropdown.open, .toolbar-dropdown.open').forEach(d => d.classList.remove('open'));
}

/**
 * Show loading toast
 * @param {string} message - Loading message
 * @returns {Function} Dismiss function
 */
function showLoading(message) {
  return showToast({
    message,
    type: 'loading',
    duration: 0,
    dismissible: false
  });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

export { TOOLS, state, loadTool, showToast, showSuccess, showError, showInfo, showWarning };

export default {
  init: initApp,
  loadTool,
  TOOLS,
  state
};