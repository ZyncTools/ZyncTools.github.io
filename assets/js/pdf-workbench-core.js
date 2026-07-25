/**
 * ZyncPDF — Shared PDF Workbench Engine
 * ======================================
 * Core PDF viewer, thumbnail sidebar, navigation, zoom,
 * fullscreen mode, and annotation overlay — shared by
 * all professional PDF editing tools.
 */

(function () {
  'use strict';

  const PDFJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';
  const PDFJS_LIB = PDFJS_BASE + '/pdf.min.js';
  const PDFJS_WORKER = PDFJS_BASE + '/pdf.worker.min.js';
  const PDFLIB_URL = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

  window.ZyncPdfEngine = (function () {
    let pdfDoc = null;
    let pdfBytes = null;
    let currentPage = 1;
    let totalPages = 0;
    let scale = 1.2;
    let rotation = 0;
    let isRendering = false;
    let annotations = {};
    let undoStack = [];
    let redoStack = [];
    let file = null;
    let filename = '';

    const state = {
      pdfDoc, pdfBytes, currentPage, totalPages, scale, rotation,
      isRendering, annotations, undoStack, redoStack, file, filename
    };

    // Load scripts dynamically
    function loadScript(src) {
      return new Promise((resolve, reject) => {
        if (document.querySelector('script[src="' + src + '"]')) {
          resolve();
          return;
        }
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    async function loadDependencies() {
      await loadScript(PDFJS_LIB);
      await loadScript(PDFLIB_URL);
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    }

    async function ensureLoaded() {
      if (window.pdfjsLib && window.PDFLib) return true;
      await loadDependencies();
      return true;
    }

    // Render a single page to a canvas
    async function renderPage(pageNum) {
      if (!pdfDoc) return null;
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale, rotation });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
      return { canvas, page, viewport };
    }

    // Render page to existing canvas
    async function renderToCanvas(pageNum, canvas) {
      if (!pdfDoc) return;
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale, rotation });
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
    }

    async function getPageImage(pageNum, maxWidth = 400) {
      if (!pdfDoc) return null;
      const page = await pdfDoc.getPage(pageNum);
      const nativeViewport = page.getViewport({ scale: 1 });
      const imgScale = maxWidth / nativeViewport.width;
      const viewport = page.getViewport({ scale: imgScale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      return canvas.toDataURL('image/jpeg', 0.7);
    }

    // Build thumbnails
    async function buildThumbnails(container, onSelect) {
      if (!pdfDoc) return;
      container.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        const item = document.createElement('div');
        item.className = 'page-thumbnail-item';
        item.dataset.page = i;
        item.innerHTML = `
          <div class="page-thumbnail-wrapper">
            <canvas class="page-thumbnail-canvas" width="160"></canvas>
          </div>
          <span class="page-thumbnail-label">${i}</span>
        `;
        item.addEventListener('click', () => onSelect && onSelect(i));
        container.appendChild(item);
        const canvas = item.querySelector('.page-thumbnail-canvas');
        try {
          const img = await getPageImage(i, 160);
          const imgEl = new Image();
          imgEl.onload = () => {
            const ctx = canvas.getContext('2d');
            const aspect = imgEl.height / imgEl.width;
            canvas.width = 160;
            canvas.height = 160 * aspect;
            ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
          };
          imgEl.src = img;
        } catch (e) {
          // Thumbnail failed silently
        }
      }
    }

    async function loadFile(fileObj) {
      await ensureLoaded();
      file = fileObj;
      filename = file.name;
      const bytes = new Uint8Array(await file.arrayBuffer());
      pdfBytes = bytes;
      pdfDoc = await window.pdfjsLib.getDocument({ data: bytes }).promise;
      totalPages = pdfDoc.numPages;
      currentPage = 1;
      scale = 1.2;
      rotation = 0;
      undoStack = [];
      redoStack = [];
      annotations = {};
    }

    async function exportPdf(transforms) {
      if (!pdfBytes) throw new Error('No PDF loaded');
      await ensureLoaded();
      const PDFLib = window.PDFLib;
      const doc = await PDFLib.PDFDocument.load(pdfBytes);
      const pages = doc.getPages();
      
      if (transforms && transforms.length) {
        for (const t of transforms) {
          if (t.type === 'delete' && pages[t.index]) {
            doc.removePage(t.index);
          } else if (t.type === 'rotate' && pages[t.index]) {
            const page = doc.getPage(t.index);
            const cur = page.getRotation().angle || 0;
            page.setRotation(PDFLib.degrees((cur + t.angle) % 360));
          }
        }
      }
      
      // Apply annotations if any
      if (Object.keys(annotations).length > 0) {
        for (let i = 0; i < doc.getPageCount(); i++) {
          const page = doc.getPage(i);
          const [width, height] = page.getSize();
          const pageAnn = annotations[i + 1];
          if (pageAnn) {
            for (const ann of pageAnn) {
              try {
                if (ann.type === 'text') {
                  page.drawText(ann.text, {
                    x: ann.x * (width / ann.pageWidth),
                    y: height - (ann.y * (height / ann.pageHeight)),
                    size: ann.size,
                    color: hexToRgb(ann.color),
                  });
                } else if (ann.type === 'rect') {
                  page.drawRectangle({
                    x: ann.x * (width / ann.pageWidth),
                    y: height - (ann.y * (height / ann.pageHeight)),
                    width: ann.w,
                    height: ann.h,
                    color: PDFLib.rgb(1, 0, 0),
                    opacity: 0.5,
                  });
                } else if (ann.type === 'redact') {
                  page.drawRectangle({
                    x: ann.x * (width / ann.pageWidth),
                    y: height - (ann.y * (height / ann.pageHeight)),
                    width: ann.w,
                    height: ann.h,
                    color: PDFLib.rgb(0, 0, 0),
                    opacity: 1,
                  });
                }
              } catch (e) {
                // Annotation application failed, skip
              }
            }
          }
        }
      }
      
      const outputBytes = await doc.save();
      const blob = new Blob([outputBytes], { type: 'application/pdf' });
      return { blob, url: URL.createObjectURL(blob), name: filename, size: blob.size };
    }

    function hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      } : { r: 0, g: 0, b: 0 };
    }

    function undo() {
      if (undoStack.length === 0) return;
      const last = undoStack.pop();
      redoStack.push(last);
      // Re-evaluate state... simplified
    }

    function redo() {
      if (redoStack.length === 0) return;
      const last = redoStack.pop();
      undoStack.push(last);
    }

    function getState() {
      return {
        pdfDoc, pdfBytes, currentPage, totalPages, scale, rotation,
        annotations, undoStack, redoStack, file, filename,
        isEmpty: !pdfDoc
      };
    }

    return {
      loadDependencies,
      ensureLoaded,
      loadFile,
      renderPage,
      renderToCanvas,
      getPageImage,
      buildThumbnails,
      exportPdf,
      undo,
      redo,
      getState,
      get pdfDoc() { return pdfDoc; },
      get currentPage() { return currentPage; },
      set currentPage(v) { currentPage = v; },
      get totalPages() { return totalPages; },
      set totalPages(v) { totalPages = v; },
      get scale() { return scale; },
      set scale(v) { scale = v; },
      get rotation() { return rotation; },
      set rotation(v) { rotation = v; },
      get filename() { return filename; },
      get annotations() { return annotations; },
      set annotations(v) { annotations = v; },
      get file() { return file; },
      get undoStack() { return undoStack; },
      get redoStack() { return redoStack; },
    };
  })();
})();
