/**
 * ZyncTools — Image Logic
 * =======================
 * Real client-side image compression & format conversion.
 *   • Compression : compressorjs (real quality-based re-encoding)
 *   • Conversion  : Canvas / createImageBitmap re-encode to jpeg/png/webp
 *   • Resize      : Canvas scaling
 * 100% in-browser. No uploads.
 *
 * Public API:
 *   ZyncImage.compressImage(file, {quality})   -> resultItem
 *   ZyncImage.convertImage(file, format)       -> resultItem   (jpeg|png|webp)
 *   ZyncImage.resizeImage(file, {width,height})-> resultItem
 *   ZyncImage.getModule(toolId)                -> viewer module { process }
 */
window.ZyncImage = (function () {
    'use strict';

    const COMPRESSOR_URL = 'https://cdn.jsdelivr.net/npm/compressorjs@1.2.1/dist/compressor.min.js';
    let compPromise = null;

    async function ensureCompressor() {
        if (window.Compressor) return window.Compressor;
        if (compPromise) return compPromise;
        compPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = COMPRESSOR_URL;
            s.onload = () => window.Compressor ? resolve(window.Compressor) : reject(new Error('load'));
            s.onerror = () => reject(new Error('load'));
            document.head.appendChild(s);
        }).catch(() => { compPromise = null; throw new Error('Load Error: could not load the image compression engine.'); });
        return compPromise;
    }

    const IMG_TYPES = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'];
    function assertImage(file) {
        const e = (file.name.split('.').pop() || '').toLowerCase();
        if (!IMG_TYPES.includes(e) && !/^image\//.test(file.type || '')) {
            throw new Error(`Invalid File Type: "${file.name}" is not a supported image.`);
        }
    }
    function stem(file) { return file.name.replace(/\.[^.]+$/, ''); }
    function toResult(blob, name) {
        return { name, blob, type: blob.type, size: blob.size, url: URL.createObjectURL(blob) };
    }

    /* ---------- Compress (compressorjs) ---------- */
    async function compressImage(file, opts) {
        assertImage(file);
        opts = opts || {};
        const Compressor = await ensureCompressor();
        const quality = typeof opts.quality === 'number' ? opts.quality : 0.6;
        return new Promise((resolve, reject) => {
            new Compressor(file, {
                quality,
                convertSize: Infinity,
                success: (blob) => {
                    const name = stem(file) + '-compressed.' + (file.name.split('.').pop() || 'jpg');
                    resolve(toResult(blob, name));
                },
                error: () => reject(new Error('Conversion Failed: unable to compress this image.'))
            });
        });
    }

    /* ---------- Load into a bitmap for canvas ops ---------- */
    async function loadBitmap(file) {
        try {
            if (window.createImageBitmap) return await createImageBitmap(file);
        } catch (e) { /* fall back to <img> */ }
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Conversion Failed: could not decode the image.'));
            img.src = URL.createObjectURL(file);
        });
    }

    function canvasToBlob(canvas, mime, quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(b => b ? resolve(b) : reject(new Error('Conversion Failed: encoding error.')), mime, quality);
        });
    }

    /* ---------- Convert format ---------- */
    async function convertImage(file, format) {
        assertImage(file);
        format = (format || 'png').toLowerCase().replace('jpg', 'jpeg');
        const mimeMap = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
        const mime = mimeMap[format];
        if (!mime) throw new Error('Invalid input: unsupported target format "' + format + '".');
        const bmp = await loadBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bmp.width; canvas.height = bmp.height;
        const cx = canvas.getContext('2d');
        if (format === 'jpeg') { cx.fillStyle = '#fff'; cx.fillRect(0, 0, canvas.width, canvas.height); }
        cx.drawImage(bmp, 0, 0);
        const blob = await canvasToBlob(canvas, mime, 0.92);
        return toResult(blob, stem(file) + '.' + (format === 'jpeg' ? 'jpg' : format));
    }

    /* ---------- Resize ---------- */
    async function resizeImage(file, opts) {
        assertImage(file);
        opts = opts || {};
        const bmp = await loadBitmap(file);
        let w = parseInt(opts.width, 10) || 0, h = parseInt(opts.height, 10) || 0;
        if (!w && !h) throw new Error('Invalid input: provide a target width or height.');
        if (w && !h) h = Math.round(bmp.height * (w / bmp.width));
        if (h && !w) w = Math.round(bmp.width * (h / bmp.height));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
        const mime = file.type && /^image\//.test(file.type) ? file.type : 'image/png';
        const blob = await canvasToBlob(canvas, mime, 0.92);
        return toResult(blob, stem(file) + `-${w}x${h}.` + (file.name.split('.').pop() || 'png'));
    }

    /* ============================================================
       Viewer-compatible module: process(files, ctx) -> [resultItem]
       ============================================================ */
    function getModule(toolId) {
        const map = {
            'image-compressor': (f) => compressImage(f, { quality: 0.6 }),
            'png-to-jpg': (f) => convertImage(f, 'jpeg'),
            'jpg-to-png': (f) => convertImage(f, 'png'),
            'webp-converter': (f) => convertImage(f, 'webp'),
            'image-to-png': (f) => convertImage(f, 'png'),
            'image-to-jpg': (f) => convertImage(f, 'jpeg'),
            'image-to-webp': (f) => convertImage(f, 'webp'),
            'image-resizer': (f, ctx) => resizeImage(f, (ctx && ctx.config) || { width: 800 })
        };
        const fn = map[toolId];
        if (!fn) return null;
        return {
            type: 'file',
            outputType: 'blob',
            process: async function (files, ctx) {
                ctx = ctx || {};
                if (!files || !files.length) throw new Error('Invalid input: please add an image first.');
                if (ctx.setProgress) ctx.setProgress(20);
                const results = [];
                for (const f of files) results.push(await fn(f, ctx));
                if (ctx.setProgress) ctx.setProgress(100);
                if (results[0]) {
                    const orig = files[0].size, out = results[0].size;
                    if (ctx.showNotification && orig && out) {
                        const pct = Math.round((1 - out / orig) * 100);
                        ctx.showNotification(pct > 0 ? `Reduced by ${pct}% (${(orig/1024).toFixed(0)}KB → ${(out/1024).toFixed(0)}KB)` : 'Done.', 'success');
                    }
                }
                return results;
            }
        };
    }

    return { compressImage, convertImage, resizeImage, getModule };
})();
