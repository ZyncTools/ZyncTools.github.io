/**
 * ZyncTools — Batch Logic: PDF tools (lightweight)
 * ================================================
 * Uses pdf-lib (loaded on demand from CDN) for:
 *   • Watermark (text)   • Page numbers   • Merge   • Split   • Rotate
 *   • Optimize (strip metadata)   • JPG -> PDF   • PDF -> JPG (via canvas)
 * Delegates merge/split/rotate/optimize to the existing ZyncPdf module when
 * available, so logic is centralized. Each process(files, options) returns
 * a Promise resolving to result items with a Page Count preview.
 */
(function () {
    'use strict';

    const PDFLIB_URL = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
    let libPromise = null;
    function ensureLib() {
        if (window.PDFLib) return Promise.resolve(window.PDFLib);
        if (libPromise) return libPromise;
        libPromise = new Promise((res, rej) => { const s = document.createElement('script'); s.src = PDFLIB_URL; s.onload = () => window.PDFLib ? res(window.PDFLib) : rej(new Error('load')); s.onerror = () => rej(new Error('Load Error: pdf-lib')); document.head.appendChild(s); }).catch(() => { libPromise = null; throw new Error('Load Error: could not load pdf-lib.'); });
        return libPromise;
    }
    function assertPdf(file) { if ((file.name.split('.').pop() || '').toLowerCase() !== 'pdf') throw new Error(`Invalid File Type: "${file.name}" is not a PDF.`); }
    function toResult(bytes, name) { const b = new Blob([bytes], { type: 'application/pdf' }); return { name, blob: b, type: b.type, size: b.size, url: URL.createObjectURL(b) }; }

    async function watermark(file, opts) {
        assertPdf(file);
        const PDFLib = await ensureLib();
        const doc = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
        const pages = doc.getPages(); const text = (opts && opts.text) || 'ZyncTools';
        for (const p of pages) {
            const { width, height } = p.getSize();
            p.drawText(text, { x: width / 2 - text.length * 4, y: 30, size: 18, color: PDFLib.rgb(0.6, 0.6, 0.6), opacity: 0.5, rotate: PDFLib.degrees(45) });
        }
        return toResult(await doc.save(), file.name.replace(/\.pdf$/i, '') + '-watermarked.pdf');
    }
    async function pageNumbers(file) {
        assertPdf(file);
        const PDFLib = await ensureLib();
        const doc = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
        const n = doc.getPageCount();
        doc.getPages().forEach((p, i) => { const { width, height } = p.getSize(); p.drawText(String(i + 1), { x: width - 50, y: 20, size: 12, color: PDFLib.rgb(0.4, 0.4, 0.4) }); });
        return toResult(await doc.save(), file.name.replace(/\.pdf$/i, '') + '-numbered.pdf');
    }
    async function jpgToPdf(files) {
        if (!files || !files.length) throw new Error('Invalid Input: add image file(s).');
        const PDFLib = await ensureLib();
        const doc = await PDFLib.PDFDocument.create();
        for (const f of files) {
            const bytes = new Uint8Array(await f.arrayBuffer());
            const img = await doc.embedJpg(bytes).catch(async () => doc.embedPng(bytes));
            const p = doc.addPage([img.width, img.height]); p.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        }
        return toResult(await doc.save(), 'images-to-pdf.pdf');
    }
    async function pdfToJpg(file, opts) {
        assertPdf(file);
        // pdf-lib cannot rasterize; use canvas + pdf.js if present, else informative fallback
        if (window.pdfjsLib) {
            const loadingTask = window.pdfjsLib.getDocument(new Uint8Array(await file.arrayBuffer()));
            const pdf = await loadingTask.promise; const results = [];
            for (let i = 1; i <= pdf.numPages && i <= (parseInt(opts && opts.maxPages) || 1); i++) {
                const page = await pdf.getPage(i); const vp = page.getViewport({ scale: 1.5 });
                const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
                const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9)); results.push({ name: file.name.replace(/\.pdf$/i, '') + '-p' + i + '.jpg', blob, type: 'image/jpeg', size: blob.size, url: URL.createObjectURL(blob) });
            }
            return results;
        }
        throw new Error('Conversion Failed: PDF rendering requires the pdf.js library. Add it to enable PDF → JPG.');
    }

    async function merge(files) {
        if (!files || files.length < 2) throw new Error('Invalid Input: need 2+ PDFs.');
        const PDFLib = await ensureLib(); const out = await PDFLib.PDFDocument.create();
        for (const f of files) { assertPdf(f); const src = await PDFLib.PDFDocument.load(new Uint8Array(await f.arrayBuffer()), { ignoreEncryption: true }); const ps = await out.copyPages(src, src.getPageIndices()); ps.forEach(p => out.addPage(p)); }
        return toResult(await out.save(), 'merged.pdf');
    }
    async function split(file) {
        assertPdf(file); const PDFLib = await ensureLib(); const src = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true }); const n = src.getPageCount(); if (n < 2) throw new Error('Only one page to split.'); const res = []; const stem = file.name.replace(/\.pdf$/i, '');
        for (let i = 0; i < n; i++) { const d = await PDFLib.PDFDocument.create(); const [p] = await d.copyPages(src, [i]); d.addPage(p); res.push(toResult(await d.save(), stem + '-p' + (i + 1) + '.pdf')); } return res;
    }
    async function rotate(file, deg) {
        assertPdf(file); const PDFLib = await ensureLib(); const d = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true }); const a = ((parseInt(deg) || 90) % 360 + 360) % 360; d.getPages().forEach(p => { const c = (p.getRotation().angle || 0); p.setRotation(PDFLib.degrees((c + a) % 360)); });
        return toResult(await d.save(), file.name.replace(/\.pdf$/i, '') + '-rotated.pdf');
    }
    async function optimize(file) {
        assertPdf(file); const PDFLib = await ensureLib(); const d = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
        try { d.setTitle(''); d.setAuthor(''); d.setSubject(''); d.setKeywords([]); } catch (e) {}
        return toResult(await d.save({ useObjectStreams: true }), file.name.replace(/\.pdf$/i, '') + '-optimized.pdf');
    }
    async function deletePages(file, opts) {
        assertPdf(file); const PDFLib = await ensureLib(); const d = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
        const remove = new Set((opts && opts.pages || '').split(',').map(s => parseInt(s.trim()) - 1).filter(n => n >= 0)); const keep = d.getPageIndices().filter(i => !remove.has(i));
        const out = await PDFLib.PDFDocument.create(); const ps = await out.copyPages(d, keep); ps.forEach(p => out.addPage(p));
        return toResult(await out.save(), file.name.replace(/\.pdf$/i, '') + '-deleted.pdf');
    }
    async function extractPages(file, opts) {
        assertPdf(file); const PDFLib = await ensureLib(); const d = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
        const idx = (opts && opts.pages || '1').split(',').map(s => parseInt(s.trim()) - 1).filter(n => n >= 0);
        const out = await PDFLib.PDFDocument.create(); const ps = await out.copyPages(d, idx); ps.forEach(p => out.addPage(p));
        return toResult(await out.save(), file.name.replace(/\.pdf$/i, '') + '-extracted.pdf');
    }
    async function rearrange(file, opts) {
        assertPdf(file); const PDFLib = await ensureLib(); const d = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
        const order = (opts && opts.order || '').split(',').map(s => parseInt(s.trim()) - 1).filter(n => n >= 0 && n < d.getPageCount());
        if (!order.length) throw new Error('Invalid Input: provide page order.');
        const out = await PDFLib.PDFDocument.create(); const ps = await out.copyPages(d, order); ps.forEach(p => out.addPage(p));
        return toResult(await out.save(), file.name.replace(/\.pdf$/i, '') + '-rearranged.pdf');
    }
    async function comparePdfs(f1, f2) {
        if (!f1 || !f2) throw new Error('Invalid Input: need two PDFs.');
        const PDFLib = await ensureLib(); const [a, b] = await Promise.all([PDFLib.PDFDocument.load(new Uint8Array(await f1.arrayBuffer()), { ignoreEncryption: true }), PDFLib.PDFDocument.load(new Uint8Array(await f2.arrayBuffer()), { ignoreEncryption: true })]);
        const same = a.getPageCount() === b.getPageCount();
        return { text: `Page counts: ${a.getPageCount()} vs ${b.getPageCount()}. ${same ? 'Equal page count.' : 'Different page count.'}`, type: 'text/plain', ext: 'txt' };
    }

    const H = {
        'pdf-watermark': (f, o) => watermark(f, o),
        'pdf-page-numbers': f => pageNumbers(f),
        'jpg-to-pdf': files => jpgToPdf(files),
        'pdf-to-jpg': (f, o) => pdfToJpg(f, o),
        'merge-pdf': files => merge(files),
        'split-pdf': f => split(f),
        'rotate-pdf': (f, o) => rotate(f, o && o.degrees),
        'compress-pdf': f => optimize(f),
        'pdf-optimize': f => optimize(f),
        'delete-pages': (f, o) => deletePages(f, o),
        'extract-pages': (f, o) => extractPages(f, o),
        'rearrange-pages': (f, o) => rearrange(f, o),
        'compare-pdfs': files => comparePdfs(files[0], files[1])
    };
    // delegate to ZyncPdf for the operations already implemented there
    function delegate(toolId) {
        if (window.ZyncPdf && window.ZyncPdf.getModule) return window.ZyncPdf.getModule(toolId);
        return null;
    }

    window.ZyncBatchPdf = { H,
        getModule(toolId) {
            if (H[toolId]) {
                return {
                    type: toolId === 'jpg-to-pdf' ? 'file' : 'file',
                    outputType: 'blob',
                    getPageCount: async (file) => { const PDFLib = await ensureLib(); return (await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true })).getPageCount(); },
                    process: async (files, options) => {
                        if (!files || !files.length) throw new Error('Invalid Input: add a PDF file.');
                        const r = await H[toolId](files, options || {});
                        return Array.isArray(r) ? r : [r];
                    }
                };
            }
            const d = delegate(toolId);
            if (d) return d;
            return null;
        },
        ensureLib
    };
})();
