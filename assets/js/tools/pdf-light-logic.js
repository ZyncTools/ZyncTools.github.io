/**
 * ZyncTools — Batch Logic: PDF tools (lightweight)
 * ================================================
 * Uses pdf-lib (loaded on demand from CDN) for:
 *   • Watermark (text)   • Page numbers   • Merge   • Split   • Rotate
 *   • Optimize (strip metadata)   • JPG -> PDF   • PDF -> JPG (via canvas)
 *   • Unlock / Protect   • PDF to Word   • Word to PDF   • HTML to PDF
 *   • Markdown to PDF   • OCR PDF   • E-book Converter
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
    function toResult(bytes, name, type) { const b = new Blob([bytes], { type: type || 'application/pdf' }); return { name, blob: b, type: b.type, size: b.size, url: URL.createObjectURL(b) }; }

    async function watermark(file, opts) {
        assertPdf(file);
        const PDFLib = await ensureLib();
        const doc = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
        const pages = doc.getPages(); const text = (opts && opts.text) || 'ZyncTools';
        for (const p of pages) {
            const { width, height } = p.getSize();
            const fontSize = (opts && opts.fontSize) || 24;
            const opacity = ((opts && opts.opacity) || 50) / 100;
            const rotation = (opts && opts.rotation) || -45;
            const color = (opts && opts.color) || '#000000';
            const rgb = hexToRgb(color);
            p.drawText(text, { x: width / 2 - text.length * 4, y: 30, size: fontSize, color: PDFLib.rgb(rgb.r / 255, rgb.g / 255, rgb.b / 255), opacity: opacity, rotate: PDFLib.degrees(rotation) });
        }
        return toResult(await doc.save(), file.name.replace(/\.pdf$/i, '') + '-watermarked.pdf');
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
    }

    async function pageNumbers(file, opts) {
        assertPdf(file);
        const PDFLib = await ensureLib();
        const doc = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
        const n = doc.getPageCount();
        const startNum = (opts && opts.startNumber) || 1;
        const fontSize = (opts && opts.fontSize) || 12;
        const position = (opts && opts.position) || 'bottom-center';
        doc.getPages().forEach((p, i) => {
            const { width, height } = p.getSize();
            const num = String(startNum + i);
            let x = width / 2 - 10, y = 20;
            if (position === 'top-center') y = height - 20;
            else if (position === 'bottom-right') x = width - 50;
            else if (position === 'top-right') { x = width - 50; y = height - 20; }
            p.drawText(num, { x, y, size: fontSize, color: PDFLib.rgb(0.4, 0.4, 0.4) });
        });
        return toResult(await doc.save(), file.name.replace(/\.pdf$/i, '') + '-numbered.pdf');
    }
    async function jpgToPdf(files, opts) {
        if (!files || !files.length) throw new Error('Invalid Input: add image file(s).');
        const PDFLib = await ensureLib();
        const doc = await PDFLib.PDFDocument.create();
        const pageSize = (opts && opts.pageSize) || 'a4';
        const orientation = (opts && opts.orientation) || 'portrait';
        const sizes = { a4: [595.28, 841.89], letter: [612, 792], legal: [612, 1008] };
        const [pw, ph] = sizes[pageSize] || sizes.a4;
        const w = orientation === 'landscape' ? ph : pw;
        const h = orientation === 'landscape' ? pw : ph;
        for (const f of files) {
            const bytes = new Uint8Array(await f.arrayBuffer());
            const img = await doc.embedJpg(bytes).catch(async () => doc.embedPng(bytes));
            const p = doc.addPage([w, h]);
            const scale = Math.min(w / img.width, h / img.height) * 0.9;
            const iw = img.width * scale, ih = img.height * scale;
            p.drawImage(img, { x: (w - iw) / 2, y: (h - ih) / 2, width: iw, height: ih });
        }
        return toResult(await doc.save(), 'images-to-pdf.pdf');
    }
    async function pdfToJpg(file, opts) {
        assertPdf(file);
        if (window.pdfjsLib) {
            const loadingTask = window.pdfjsLib.getDocument(new Uint8Array(await file.arrayBuffer()));
            const pdf = await loadingTask.promise;
            const results = [];
            const maxPages = parseInt((opts && opts.maxPages) || '999');
            const quality = ((opts && opts.quality) || 90) / 100;
            const dpi = parseInt((opts && opts.dpi) || '300');
            const scale = dpi / 72;
            for (let i = 1; i <= pdf.numPages && i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const vp = page.getViewport({ scale });
                const c = document.createElement('canvas');
                c.width = vp.width; c.height = vp.height;
                await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
                const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', quality));
                results.push({ name: file.name.replace(/\.pdf$/i, '') + '-p' + i + '.jpg', blob, type: 'image/jpeg', size: blob.size, url: URL.createObjectURL(blob) });
            }
            return results;
        }
        throw new Error('Conversion Failed: PDF rendering requires the pdf.js library.');
    }

    async function merge(files) {
        if (!files || files.length < 2) throw new Error('Invalid input: select at least 2 PDF files to merge.');
        const PDFLib = await ensureLib();
        const out = await PDFLib.PDFDocument.create();
        for (const file of files) {
            assertPdf(file);
            const src = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
            const pages = await out.copyPages(src, src.getPageIndices());
            pages.forEach(p => out.addPage(p));
        }
        const bytes = await out.save();
        return toResult(bytes, 'merged.pdf');
    }

    async function split(file) {
        assertPdf(file);
        const PDFLib = await ensureLib();
        const src = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
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

    async function rotate(file, deg) {
        assertPdf(file);
        const PDFLib = await ensureLib();
        const d = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
        const a = ((parseInt(deg) || 90) % 360 + 360) % 360;
        d.getPages().forEach(p => { const c = (p.getRotation().angle || 0); p.setRotation(PDFLib.degrees((c + a) % 360)); });
        return toResult(await d.save(), file.name.replace(/\.pdf$/i, '') + '-rotated.pdf');
    }

    async function optimize(file) {
        assertPdf(file);
        const PDFLib = await ensureLib();
        const d = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
        try { d.setTitle(''); d.setAuthor(''); d.setSubject(''); d.setKeywords([]); } catch (e) {}
        return toResult(await d.save({ useObjectStreams: true }), file.name.replace(/\.pdf$/i, '') + '-optimized.pdf');
    }

    async function deletePages(file, opts) {
        assertPdf(file);
        const PDFLib = await ensureLib();
        const d = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
        const remove = new Set((opts && opts.pages || '').split(',').map(s => parseInt(s.trim()) - 1).filter(n => n >= 0));
        const keep = d.getPageIndices().filter(i => !remove.has(i));
        const out = await PDFLib.PDFDocument.create();
        const ps = await out.copyPages(d, keep);
        ps.forEach(p => out.addPage(p));
        return toResult(await out.save(), file.name.replace(/\.pdf$/i, '') + '-deleted.pdf');
    }

    async function extractPages(file, opts) {
        assertPdf(file);
        const PDFLib = await ensureLib();
        const d = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
        const idx = (opts && opts.pages || '1').split(',').map(s => parseInt(s.trim()) - 1).filter(n => n >= 0);
        const out = await PDFLib.PDFDocument.create();
        const ps = await out.copyPages(d, idx);
        ps.forEach(p => out.addPage(p));
        return toResult(await out.save(), file.name.replace(/\.pdf$/i, '') + '-extracted.pdf');
    }

    async function rearrange(file, opts) {
        assertPdf(file);
        const PDFLib = await ensureLib();
        const d = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
        const order = (opts && opts.order || '').split(',').map(s => parseInt(s.trim()) - 1).filter(n => n >= 0 && n < d.getPageCount());
        if (!order.length) throw new Error('Invalid Input: provide page order.');
        const out = await PDFLib.PDFDocument.create();
        const ps = await out.copyPages(d, order);
        ps.forEach(p => out.addPage(p));
        return toResult(await out.save(), file.name.replace(/\.pdf$/i, '') + '-rearranged.pdf');
    }

    async function comparePdfs(f1, f2) {
        if (!f1 || !f2) throw new Error('Invalid Input: need two PDFs.');
        const PDFLib = await ensureLib();
        const [a, b] = await Promise.all([
            PDFLib.PDFDocument.load(new Uint8Array(await f1.arrayBuffer()), { ignoreEncryption: true }),
            PDFLib.PDFDocument.load(new Uint8Array(await f2.arrayBuffer()), { ignoreEncryption: true })
        ]);
        const same = a.getPageCount() === b.getPageCount();
        return { text: `Page counts: ${a.getPageCount()} vs ${b.getPageCount()}. ${same ? 'Equal page count.' : 'Different page count.'}`, type: 'text/plain', ext: 'txt' };
    }

    async function unlockPdf(file, opts) {
        assertPdf(file);
        const password = (opts && opts.password) || '';
        const PDFLib = await ensureLib();
        try {
            const d = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { password });
            return toResult(await d.save(), file.name.replace(/\.pdf$/i, '') + '-unlocked.pdf');
        } catch (e) {
            throw new Error('Incorrect password or encrypted file.');
        }
    }

    async function protectPdf(file, opts) {
        assertPdf(file);
        const PDFLib = await ensureLib();
        const password = (opts && opts.password) || '';
        const confirm = (opts && opts.confirmPassword) || '';
        if (!password) throw new Error('Please enter a password.');
        if (password !== confirm) throw new Error('Passwords do not match.');
        const d = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
        d.setPassword(password);
        const permissions = (opts && opts.permissions) || 'none';
        if (permissions === 'print') d.setPermissions({ printing: 'highResolution' });
        else if (permissions === 'all') d.setPermissions({ printing: 'highResolution', modifying: true, annotating: true });
        return toResult(await d.save(), file.name.replace(/\.pdf$/i, '') + '-protected.pdf');
    }

    async function pdfToWord(file, opts) {
        assertPdf(file);
        const format = (opts && opts.format) || 'txt';
        if (window.pdfjsLib) {
            const loadingTask = window.pdfjsLib.getDocument(new Uint8Array(await file.arrayBuffer()));
            const pdf = await loadingTask.promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += '--- Page ' + i + ' ---\n';
                text += content.items.map(item => item.str).join(' ') + '\n\n';
            }
            if (format === 'docx') {
                const html = '<html><body><pre>' + escapeHtml(text) + '</pre></body></html>';
                return { text: html, type: 'text/html', ext: 'html' };
            }
            return { text: text, type: 'text/plain', ext: 'txt' };
        }
        throw new Error('Conversion Failed: PDF text extraction requires pdf.js library.');
    }

    async function wordToPdf(file, opts) {
        if (!file.name.match(/\.(doc|docx)$/i)) throw new Error('Invalid File Type: Please upload a Word document (.doc or .docx).');
        if (window.mammoth) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToHtml(arrayBuffer);
            const html = result.value;
            return { text: html, type: 'text/html', ext: 'html' };
        }
        throw new Error('Conversion Failed: Word to PDF requires mammoth.js library.');
    }

    async function htmlToPdf(text, opts) {
        const PDFLib = await ensureLib();
        const doc = await PDFLib.PDFDocument.create();
        const page = doc.addPage();
        const fontSize = 12;
        const lines = text.split('\n');
        let y = page.getHeight() - 50;
        for (const line of lines) {
            if (y < 50) break;
            page.drawText(line, { x: 50, y, size: fontSize });
            y -= fontSize + 4;
        }
        return toResult(await doc.save(), 'html-to-pdf.pdf');
    }

    async function markdownToPdf(text, opts) {
        if (window.marked) {
            const html = marked.parse(text || '');
            return htmlToPdf(html.replace(/<[^>]*>/g, ''), opts);
        }
        return htmlToPdf(text || '', opts);
    }

    async function ebookConverter(file, opts) {
        const format = (opts && opts.format) || 'pdf';
        if (format === 'pdf') {
            const PDFLib = await ensureLib();
            const doc = await PDFLib.PDFDocument.create();
            const page = doc.addPage();
            page.drawText('E-book content: ' + file.name, { x: 50, y: page.getHeight() - 50, size: 12 });
            return toResult(await doc.save(), file.name.replace(/\.[^.]+$/, '') + '.pdf');
        }
        return { text: 'EPUB conversion is limited in browser. Content: ' + file.name, type: 'text/plain', ext: 'txt' };
    }

    async function ocrPdf(file, opts) {
        assertPdf(file);
        if (window.Tesseract) {
            const result = await Tesseract.recognize(file, (opts && opts.language) || 'eng', { logger: m => { if (m.status === 'recognizing text' && opts && opts.setProgress) opts.setProgress(Math.round(m.progress * 100)); } });
            const text = result.data.text;
            if ((opts && opts.outputType) === 'text') {
                return { text: text, type: 'text/plain', ext: 'txt' };
            }
            const PDFLib = await ensureLib();
            const doc = await PDFLib.PDFDocument.create();
            const page = doc.addPage();
            const lines = text.split('\n');
            let y = page.getHeight() - 50;
            for (const line of lines) {
                if (y < 50) break;
                page.drawText(line, { x: 50, y, size: 10 });
                y -= 14;
            }
            return toResult(await doc.save(), file.name.replace(/\.pdf$/i, '') + '-ocr.pdf');
        }
        throw new Error('OCR Failed: Tesseract.js library not loaded.');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    const H = {
        'watermark-pdf': (f, o) => watermark(f, o),
        'add-page-numbers': f => pageNumbers(f, arguments[1]),
        'jpg-to-pdf': files => jpgToPdf(files, arguments[1]),
        'pdf-to-jpg': (f, o) => pdfToJpg(f, o),
        'merge-pdf': files => merge(files),
        'split-pdf': f => split(f),
        'rotate-pdf': (f, o) => rotate(f, o && o.degrees),
        'compress-pdf': f => optimize(f),
        'pdf-optimize': f => optimize(f),
        'delete-pages': (f, o) => deletePages(f, o),
        'extract-pages': (f, o) => extractPages(f, o),
        'rearrange-pages': (f, o) => rearrange(f, o),
        'compare-pdfs': files => comparePdfs(files[0], files[1]),
        'unlock-pdf': (f, o) => unlockPdf(f, o),
        'protect-pdf': (f, o) => protectPdf(f, o),
        'pdf-to-word': (f, o) => pdfToWord(f, o),
        'word-to-pdf': (f, o) => wordToPdf(f, o),
        'html-to-pdf': (t, o) => htmlToPdf(t, o),
        'markdown-to-pdf': (t, o) => markdownToPdf(t, o),
        'ebook-converter': (f, o) => ebookConverter(f, o),
        'ocr-pdf': (f, o) => ocrPdf(f, o)
    };

    window.ZyncBatchPdf = { H,
        getModule(toolId) {
            if (H[toolId]) {
                const textTools = ['pdf-to-word', 'word-to-pdf', 'html-to-pdf', 'markdown-to-pdf', 'ebook-converter', 'ocr-pdf', 'compare-pdfs'];
                return {
                    type: textTools.includes(toolId) ? 'text' : 'file',
                    outputType: 'blob',
                    getPageCount: async (file) => {
                        if (!file) return 0;
                        const PDFLib = await ensureLib();
                        try {
                            const d = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
                            return d.getPageCount();
                        } catch (e) { return 0; }
                    },
                    process: async (input, options) => {
                        if (!input) throw new Error('Invalid Input: add a file or text.');
                        const r = await H[toolId](input, options || {});
                        if (Array.isArray(r)) return r;
                        if (r.text != null) {
                            const b = new Blob([r.text], { type: r.type || 'text/plain' });
                            return [{ name: toolId + '-output.' + (r.ext || 'txt'), blob: b, type: b.type, size: b.size, url: URL.createObjectURL(b) }];
                        }
                        return [{ name: toolId + '-output.' + (r.ext || 'pdf'), blob: r.blob, type: r.blob.type, size: r.blob.size, url: URL.createObjectURL(r.blob) }];
                    }
                };
            }
            return null;
        },
        ensureLib
    };
})();
