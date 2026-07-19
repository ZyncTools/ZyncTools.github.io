/**
 * ZyncTools — PDF Logic (pdf-lib)
 * ===============================
 * Real client-side PDF manipulation with pdf-lib. 100% in-browser.
 *
 * Implements:
 *   • Merge  : load multiple PDFs, copy pages into one document, save
 *   • Split  : load one PDF, export each page as its own PDF
 *   • Rotate : rotate all pages by 90/180/270°
 *   • Optimize: strip metadata + re-save (pdf-lib cannot re-compress streams;
 *               honestly labeled "Optimize / Clean Metadata", not "Compress")
 *   • getPageCount: shown BEFORE processing (spec requirement)
 *
 * Public API:
 *   ZyncPdf.mergePdf(files)             -> resultItem
 *   ZyncPdf.splitPdf(file)             -> [resultItem per page]
 *   ZyncPdf.rotatePdf(file, degrees)   -> resultItem
 *   ZyncPdf.optimizePdf(file)          -> resultItem
 *   ZyncPdf.getPageCount(file)         -> number
 *   ZyncPdf.getModule(toolId)          -> viewer module { process }
 */
window.ZyncPdf = (function () {
    'use strict';

    const PDFLIB_URL = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
    let libPromise = null;

    async function ensureLib() {
        if (window.PDFLib) return window.PDFLib;
        if (libPromise) return libPromise;
        libPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = PDFLIB_URL;
            s.onload = () => window.PDFLib ? resolve(window.PDFLib) : reject(new Error('load'));
            s.onerror = () => reject(new Error('load'));
            document.head.appendChild(s);
        }).catch(() => { libPromise = null; throw new Error('Load Error: could not load the PDF engine (pdf-lib).'); });
        return libPromise;
    }

    function assertPdf(file) {
        const e = (file.name.split('.').pop() || '').toLowerCase();
        if (e !== 'pdf') throw new Error(`Invalid File Type: "${file.name}" is not a PDF.`);
    }

    async function loadDoc(PDFLib, file) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        try {
            return await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
        } catch (e) {
            throw new Error(`Conversion Failed: "${file.name}" is corrupt or password-protected.`);
        }
    }

    function toResult(bytes, name) {
        const blob = new Blob([bytes], { type: 'application/pdf' });
        return { name, blob, type: 'application/pdf', size: blob.size, url: URL.createObjectURL(blob) };
    }

    /* ---------- Page count (pre-processing preview) ---------- */
    async function getPageCount(file) {
        assertPdf(file);
        const PDFLib = await ensureLib();
        const doc = await loadDoc(PDFLib, file);
        return doc.getPageCount();
    }

    /* ---------- Merge ---------- */
    async function mergePdf(files) {
        if (!files || files.length < 2) throw new Error('Invalid input: select at least 2 PDF files to merge.');
        const PDFLib = await ensureLib();
        const out = await PDFLib.PDFDocument.create();
        for (const file of files) {
            assertPdf(file);
            const src = await loadDoc(PDFLib, file);
            const pages = await out.copyPages(src, src.getPageIndices());
            pages.forEach(p => out.addPage(p));
        }
        const bytes = await out.save();
        return toResult(bytes, 'merged.pdf');
    }

    /* ---------- Split (one file per page) ---------- */
    async function splitPdf(file) {
        assertPdf(file);
        const PDFLib = await ensureLib();
        const src = await loadDoc(PDFLib, file);
        const n = src.getPageCount();
        if (n < 2) throw new Error('This PDF has only one page — nothing to split.');
        const results = [];
        const stem = file.name.replace(/\.pdf$/i, '');
        for (let i = 0; i < n; i++) {
            const doc = await PDFLib.PDFDocument.create();
            const [page] = await doc.copyPages(src, [i]);
            doc.addPage(page);
            const bytes = await doc.save();
            results.push(toResult(bytes, `${stem}-page-${i + 1}.pdf`));
        }
        return results;
    }

    /* ---------- Rotate ---------- */
    async function rotatePdf(file, degrees) {
        assertPdf(file);
        const deg = ((parseInt(degrees, 10) || 90) % 360 + 360) % 360;
        const PDFLib = await ensureLib();
        const doc = await loadDoc(PDFLib, file);
        doc.getPages().forEach(p => {
            const cur = p.getRotation().angle || 0;
            p.setRotation(PDFLib.degrees((cur + deg) % 360));
        });
        const bytes = await doc.save();
        return toResult(bytes, file.name.replace(/\.pdf$/i, '') + '-rotated.pdf');
    }

    /* ---------- Optimize / clean metadata (honest naming) ---------- */
    async function optimizePdf(file) {
        assertPdf(file);
        const PDFLib = await ensureLib();
        const doc = await loadDoc(PDFLib, file);
        try {
            doc.setTitle(''); doc.setAuthor(''); doc.setSubject('');
            doc.setKeywords([]); doc.setProducer('ZyncTools'); doc.setCreator('ZyncTools');
        } catch (e) { /* metadata optional */ }
        const bytes = await doc.save({ useObjectStreams: true });
        return toResult(bytes, file.name.replace(/\.pdf$/i, '') + '-optimized.pdf');
    }

    /* ============================================================
       Viewer-compatible module: process(files, ctx) -> [resultItem]
       ============================================================ */
    function getModule(toolId) {
        const map = {
            'merge-pdf': { multi: true, fn: (files) => mergePdf(files) },
            'split-pdf': { multi: false, fn: (files) => splitPdf(files[0]) },
            'rotate-pdf': { multi: false, fn: (files, ctx) => rotatePdf(files[0], (ctx && ctx.config && ctx.config.degrees) || 90) },
            'pdf-optimize': { multi: false, fn: (files) => optimizePdf(files[0]) },
            'compress-pdf': { multi: false, fn: (files) => optimizePdf(files[0]) }
        };
        const cfg = map[toolId];
        if (!cfg) return null;
        return {
            type: 'file',
            outputType: 'blob',
            getPageCount,
            process: async function (files, ctx) {
                ctx = ctx || {};
                if (!files || !files.length) throw new Error('Invalid input: please add a PDF first.');
                if (ctx.setProgress) ctx.setProgress(10);
                // Page-count preview
                try {
                    if (!cfg.multi) {
                        const pc = await getPageCount(files[0]);
                        if (ctx.showNotification) ctx.showNotification(`Page Count: ${pc}`, 'info');
                    } else if (ctx.showNotification) {
                        ctx.showNotification(`Merging ${files.length} PDF file(s)…`, 'info');
                    }
                } catch (e) { /* non-fatal */ }
                if (ctx.setProgress) ctx.setProgress(40);
                const out = await cfg.fn(files, ctx);
                if (ctx.setProgress) ctx.setProgress(100);
                return Array.isArray(out) ? out : [out];
            }
        };
    }

    return { mergePdf, splitPdf, rotatePdf, optimizePdf, getPageCount, getModule };
})();
