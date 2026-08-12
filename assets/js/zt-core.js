/**
 * ZyncTools — Core runtime
 *
 * Shared helpers for every tool: DOM access, formatting, file reading,
 * canvas/image work, downloads, ZIP packaging and lazy CDN loading.
 *
 * Everything here runs client-side only. Nothing is ever uploaded.
 *
 * Namespace: window.ZT
 */
(function (global) {
    'use strict';

    /* ============================================================
       PATHS — resolve relative to the site root so the app works
       from a subdirectory, from file://, and from a custom domain.
       ============================================================ */
    var ROOT = (function () {
        var scripts = document.getElementsByTagName('script');
        for (var i = scripts.length - 1; i >= 0; i--) {
            var src = scripts[i].getAttribute('src') || '';
            var m = src.match(/^(.*\/)assets\/js\/zt-core\.js/);
            if (m) return m[1];
        }
        return '';
    })();

    function url(relPath) {
        return ROOT + String(relPath).replace(/^\//, '');
    }

    /**
     * Canonical address of a tool: a clean directory path such as
     * `/merge-pdf/` rather than `tool.html?id=merge-pdf`.
     *
     * Search engines treat query strings as one page wearing hats, which
     * matters a lot for a site whose visitors arrive by searching for the
     * task they want done. `build-pages.js` writes a real HTML file at each
     * of these paths.
     */
    function toolUrl(id) {
        return ROOT + String(id) + '/';
    }

    /* ============================================================
       DOM
       ============================================================ */
    function $(sel, root) { return (root || document).querySelector(sel); }
    function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    function el(tag, attrs, children) {
        var node = document.createElement(tag);
        if (attrs) {
            Object.keys(attrs).forEach(function (k) {
                var v = attrs[k];
                if (v === null || v === undefined || v === false) return;
                if (k === 'class') node.className = v;
                else if (k === 'text') node.textContent = v;
                else if (k === 'html') node.innerHTML = v;
                else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
                else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
                else if (v === true) node.setAttribute(k, '');
                else node.setAttribute(k, v);
            });
        }
        (Array.isArray(children) ? children : children ? [children] : []).forEach(function (c) {
            if (c === null || c === undefined || c === false) return;
            node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
        });
        return node;
    }

    function esc(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /* ============================================================
       FORMATTING
       ============================================================ */
    function formatBytes(bytes, decimals) {
        if (bytes === 0) return '0 B';
        if (!bytes || bytes < 0 || !isFinite(bytes)) return '—';
        var k = 1024;
        var d = decimals === undefined ? 1 : decimals;
        var units = ['B', 'KB', 'MB', 'GB', 'TB'];
        var i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
        return parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : d)) + ' ' + units[i];
    }

    function formatDuration(seconds) {
        if (!isFinite(seconds) || seconds < 0) return '—';
        var s = Math.floor(seconds % 60);
        var m = Math.floor(seconds / 60) % 60;
        var h = Math.floor(seconds / 3600);
        var pad = function (n) { return n < 10 ? '0' + n : String(n); };
        return h > 0 ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s);
    }

    function formatNumber(n) {
        if (typeof n !== 'number' || !isFinite(n)) return '—';
        return n.toLocaleString('en-US');
    }

    /** Strip the extension from a filename. */
    function stem(name) {
        return String(name || 'file').replace(/\.[^./\\]+$/, '');
    }

    function extOf(name) {
        var m = String(name || '').match(/\.([^./\\]+)$/);
        return m ? m[1].toLowerCase() : '';
    }

    /** Build an output filename that never collides with the input. */
    function outName(inputName, suffix, ext) {
        var base = stem(inputName);
        return base + (suffix ? '-' + suffix : '') + '.' + String(ext).replace(/^\./, '');
    }

    function slugify(str) {
        return String(str || '')
            .toLowerCase()
            .normalize('NFKD').replace(/[\u0300-\u036F]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

    /* ============================================================
       FILE READING
       ============================================================ */
    function readAsText(file, encoding) {
        return new Promise(function (resolve, reject) {
            var fr = new FileReader();
            fr.onload = function () { resolve(fr.result); };
            fr.onerror = function () { reject(new Error('Could not read "' + file.name + '".')); };
            fr.readAsText(file, encoding || 'utf-8');
        });
    }

    function readAsArrayBuffer(file) {
        return new Promise(function (resolve, reject) {
            var fr = new FileReader();
            fr.onload = function () { resolve(fr.result); };
            fr.onerror = function () { reject(new Error('Could not read "' + file.name + '".')); };
            fr.readAsArrayBuffer(file);
        });
    }

    function readAsDataURL(file) {
        return new Promise(function (resolve, reject) {
            var fr = new FileReader();
            fr.onload = function () { resolve(fr.result); };
            fr.onerror = function () { reject(new Error('Could not read "' + file.name + '".')); };
            fr.readAsDataURL(file);
        });
    }

    /* ============================================================
       IMAGE / CANVAS
       ============================================================ */

    /**
     * Decode any image file (or Blob/URL) into something drawable.
     * Prefers createImageBitmap, which decodes off the main thread and
     * honours EXIF orientation; falls back to HTMLImageElement.
     */
    async function loadImage(source) {
        var blob = source;
        if (typeof source === 'string') {
            var res = await fetch(source);
            blob = await res.blob();
        }
        if (typeof createImageBitmap === 'function') {
            try {
                return await createImageBitmap(blob, { imageOrientation: 'from-image' });
            } catch (e) { /* fall through to <img> */ }
        }
        var objectUrl = URL.createObjectURL(blob);
        try {
            return await new Promise(function (resolve, reject) {
                var img = new Image();
                img.onload = function () { resolve(img); };
                img.onerror = function () { reject(new Error('That file is not a readable image.')); };
                img.src = objectUrl;
            });
        } finally {
            // Revoke on the next tick so the decoded image stays valid.
            setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 30000);
        }
    }

    function imageSize(bitmap) {
        return {
            width: bitmap.width || bitmap.naturalWidth,
            height: bitmap.height || bitmap.naturalHeight
        };
    }

    function makeCanvas(width, height) {
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(width));
        c.height = Math.max(1, Math.round(height));
        return c;
    }

    /** Draw a decoded image onto a fresh canvas at an optional new size. */
    function drawToCanvas(bitmap, width, height) {
        var size = imageSize(bitmap);
        var w = width || size.width;
        var h = height || size.height;
        var canvas = makeCanvas(w, h);
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, w, h);
        return canvas;
    }

    var MIME_BY_FORMAT = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
        avif: 'image/avif', bmp: 'image/bmp', gif: 'image/gif', ico: 'image/x-icon',
        svg: 'image/svg+xml', tiff: 'image/tiff'
    };

    function mimeForFormat(format) {
        return MIME_BY_FORMAT[String(format).toLowerCase().replace(/^\./, '')] || 'image/png';
    }

    /** Does this browser actually encode the requested format? */
    async function supportsFormat(format) {
        var mime = mimeForFormat(format);
        if (mime === 'image/png' || mime === 'image/jpeg') return true;
        try {
            var c = makeCanvas(2, 2);
            var blob = await canvasToBlob(c, mime, 0.5);
            return blob && blob.type === mime;
        } catch (e) { return false; }
    }

    function canvasToBlob(canvas, mime, quality) {
        return new Promise(function (resolve, reject) {
            if (canvas.toBlob) {
                canvas.toBlob(function (blob) {
                    if (blob) resolve(blob);
                    else reject(new Error('The browser could not encode this image.'));
                }, mime || 'image/png', quality);
            } else {
                try {
                    var dataUrl = canvas.toDataURL(mime || 'image/png', quality);
                    resolve(dataURLToBlob(dataUrl));
                } catch (e) { reject(e); }
            }
        });
    }

    /**
     * Encode a canvas, transparently handling formats the browser refuses.
     * JPEG has no alpha, so a background is flattened in first.
     */
    async function encodeCanvas(canvas, format, quality) {
        var fmt = String(format || 'png').toLowerCase().replace(/^\./, '');
        var mime = mimeForFormat(fmt);
        var q = typeof quality === 'number' ? clamp(quality, 0.01, 1) : undefined;

        if (mime === 'image/jpeg') canvas = flattenAlpha(canvas, '#ffffff');

        var blob = await canvasToBlob(canvas, mime, q);
        if (blob && blob.type !== mime && mime !== 'image/png') {
            // Browser silently fell back (common for AVIF/WebP on older Safari).
            throw new Error('This browser cannot save ' + fmt.toUpperCase() + ' images. Try PNG or JPEG.');
        }
        return blob;
    }

    /** Composite a canvas over a solid colour, dropping the alpha channel. */
    function flattenAlpha(canvas, color) {
        var out = makeCanvas(canvas.width, canvas.height);
        var ctx = out.getContext('2d');
        ctx.fillStyle = color || '#ffffff';
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(canvas, 0, 0);
        return out;
    }

    function dataURLToBlob(dataUrl) {
        var parts = String(dataUrl).split(',');
        var mime = (parts[0].match(/:(.*?);/) || [])[1] || 'application/octet-stream';
        var binary = atob(parts[1]);
        var len = binary.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: mime });
    }

    function blobToDataURL(blob) {
        return new Promise(function (resolve, reject) {
            var fr = new FileReader();
            fr.onload = function () { resolve(fr.result); };
            fr.onerror = reject;
            fr.readAsDataURL(blob);
        });
    }

    /** Fit `w`x`h` inside a box, preserving aspect ratio. */
    function fitInside(w, h, maxW, maxH) {
        var scale = Math.min(maxW / w, maxH / h);
        return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
    }

    /**
     * Downscale in halving steps. Browsers box-filter poorly on big jumps,
     * so stepping keeps detail instead of producing aliased mush.
     */
    function smoothResize(bitmap, targetW, targetH) {
        var size = imageSize(bitmap);
        var srcW = size.width, srcH = size.height;
        var canvas = drawToCanvas(bitmap);

        while (srcW / 2 > targetW && srcH / 2 > targetH) {
            srcW = Math.max(targetW, Math.floor(srcW / 2));
            srcH = Math.max(targetH, Math.floor(srcH / 2));
            var half = makeCanvas(srcW, srcH);
            var hctx = half.getContext('2d');
            hctx.imageSmoothingEnabled = true;
            hctx.imageSmoothingQuality = 'high';
            hctx.drawImage(canvas, 0, 0, srcW, srcH);
            canvas = half;
        }

        var out = makeCanvas(targetW, targetH);
        var ctx = out.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, targetW, targetH);
        return out;
    }

    /**
     * Per-pixel transform. `fn(r, g, b, a, i, data)` mutates `data` in place.
     * Runs on the whole buffer at once — fine up to ~40MP.
     */
    function mapPixels(canvas, fn) {
        var ctx = canvas.getContext('2d');
        var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var d = img.data;
        for (var i = 0; i < d.length; i += 4) {
            fn(d[i], d[i + 1], d[i + 2], d[i + 3], i, d);
        }
        ctx.putImageData(img, 0, 0);
        return canvas;
    }

    /* ============================================================
       COLOUR
       ============================================================
       Parsing and conversion used by image, PDF, design and media tools.
       Kept here rather than in a tool module so it is available whichever
       single module a page happens to load.
    */
    function parseColor(input) {
        var s = String(input || '').trim().toLowerCase();
        if (!s) return null;

        var m;
        if ((m = s.match(/^#?([0-9a-f]{3})$/))) {
            return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16), 1];
        }
        if ((m = s.match(/^#?([0-9a-f]{4})$/))) {
            return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16),
                parseInt(m[1][3] + m[1][3], 16) / 255];
        }
        if ((m = s.match(/^#?([0-9a-f]{6})$/))) {
            return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16), 1];
        }
        if ((m = s.match(/^#?([0-9a-f]{8})$/))) {
            return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16),
                parseInt(m[1].slice(6, 8), 16) / 255];
        }
        if ((m = s.match(/^rgba?\(([^)]+)\)$/))) {
            var p = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
            if (p.length >= 3) return [ZT.clamp(p[0], 0, 255), ZT.clamp(p[1], 0, 255), ZT.clamp(p[2], 0, 255), p[3] === undefined ? 1 : p[3]];
        }
        if ((m = s.match(/^hsla?\(([^)]+)\)$/))) {
            var q = m[1].split(/[,\s/]+/).filter(Boolean);
            var rgb = hslToRgb(parseFloat(q[0]), parseFloat(q[1]), parseFloat(q[2]));
            return [rgb[0], rgb[1], rgb[2], q[3] === undefined ? 1 : parseFloat(q[3])];
        }

        // Named colours — let the browser resolve them.
        var probe = document.createElement('canvas').getContext('2d');
        probe.fillStyle = '#000';
        probe.fillStyle = s;
        var resolved = probe.fillStyle;
        if (resolved !== '#000000' || s === 'black' || s === '#000000') {
            return parseColor(resolved);
        }
        return null;
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h = 0, s = 0, l = (max + min) / 2;
        var d = max - min;
        if (d) {
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h *= 60;
        }
        return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
    }

    function hslToRgb(h, s, l) {
        h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
        var c = (1 - Math.abs(2 * l - 1)) * s;
        var x = c * (1 - Math.abs((h / 60) % 2 - 1));
        var m = l - c / 2;
        var rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
            : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
        return rgb.map(function (v) { return Math.round((v + m) * 255); });
    }

    function rgbToCmyk(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var k = 1 - Math.max(r, g, b);
        if (k === 1) return [0, 0, 0, 100];
        return [
            Math.round((1 - r - k) / (1 - k) * 100),
            Math.round((1 - g - k) / (1 - k) * 100),
            Math.round((1 - b - k) / (1 - k) * 100),
            Math.round(k * 100)
        ];
    }

    function toHex(r, g, b) {
        return '#' + [r, g, b].map(function (v) {
            return ('0' + Math.round(v).toString(16)).slice(-2);
        }).join('');
    }

    /** WCAG relative luminance. */
    function luminance(r, g, b) {
        var a = [r, g, b].map(function (v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }

    var color = {
        parse: parseColor,
        rgbToHsl: rgbToHsl,
        hslToRgb: hslToRgb,
        rgbToCmyk: rgbToCmyk,
        toHex: toHex,
        luminance: luminance
    };

    /* ============================================================
       DOWNLOADS
       ============================================================ */
    function triggerDownload(blob, filename) {
        var href = URL.createObjectURL(blob);
        var a = el('a', { href: href, download: filename || 'download' });
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            URL.revokeObjectURL(href);
        }, 1500);
    }

    function downloadText(text, filename, mime) {
        triggerDownload(new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' }), filename);
    }

    async function copyText(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (e) { /* fall through */ }
        // Fallback for http:// and older browsers.
        try {
            var ta = el('textarea', { style: { position: 'fixed', opacity: '0', top: '0' } });
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            var ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        } catch (e) { return false; }
    }

    /* ============================================================
       LAZY SCRIPT LOADING (CDN libraries)
       ============================================================ */
    var scriptCache = {};

    function loadScript(src) {
        if (scriptCache[src]) return scriptCache[src];
        scriptCache[src] = new Promise(function (resolve, reject) {
            var existing = $$('script').find(function (s) { return s.src === src; });
            if (existing && existing.dataset.ztLoaded === '1') return resolve();

            var s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = function () { s.dataset.ztLoaded = '1'; resolve(); };
            s.onerror = function () {
                delete scriptCache[src];
                reject(new Error('Could not load a required library. Check your connection and retry.'));
            };
            document.head.appendChild(s);
        });
        return scriptCache[src];
    }

    /**
     * Load a library only once and only when a tool needs it.
     * `test` returns the global once present, so repeat calls are free.
     */
    async function requireLib(test, src) {
        var found = test();
        if (found) return found;
        await loadScript(src);
        // Some UMD bundles attach on the next microtask.
        for (var i = 0; i < 40; i++) {
            found = test();
            if (found) return found;
            await new Promise(function (r) { setTimeout(r, 25); });
        }
        throw new Error('A required library failed to initialise.');
    }

    var CDN = {
        pdfLib: 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
        pdfLibFontkit: 'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js',
        pdfJs: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
        pdfJsWorker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
        jszip: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
        qrcode: 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js',
        jsbarcode: 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js',
        marked: 'https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js',
        jsyaml: 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js',
        heic2any: 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js',
        gifJs: 'https://cdn.jsdelivr.net/npm/gif.js.optimized@1.0.1/dist/gif.js',
        gifWorker: 'https://cdn.jsdelivr.net/npm/gif.js.optimized@1.0.1/dist/gif.worker.js',
        lamejs: 'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js',
        exifr: 'https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.umd.js',
        tesseract: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js',
        docx: 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
        mammoth: 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js',
        turndown: 'https://cdn.jsdelivr.net/npm/turndown@7.1.2/dist/turndown.js',
        fuse: 'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.basic.min.js'
    };

    /* Convenience loaders for the heavier libraries. */
    var libs = {
        pdfLib: function () { return requireLib(function () { return global.PDFLib; }, CDN.pdfLib); },
        fontkit: function () { return requireLib(function () { return global.fontkit; }, CDN.pdfLibFontkit); },
        jsZip: function () { return requireLib(function () { return global.JSZip; }, CDN.jszip); },
        qrcode: function () { return requireLib(function () { return global.qrcode; }, CDN.qrcode); },
        barcode: function () { return requireLib(function () { return global.JsBarcode; }, CDN.jsbarcode); },
        marked: function () { return requireLib(function () { return global.marked; }, CDN.marked); },
        yaml: function () { return requireLib(function () { return global.jsyaml; }, CDN.jsyaml); },
        heic2any: function () { return requireLib(function () { return global.heic2any; }, CDN.heic2any); },
        exifr: function () { return requireLib(function () { return global.exifr; }, CDN.exifr); },
        tesseract: function () { return requireLib(function () { return global.Tesseract; }, CDN.tesseract); },
        mammoth: function () { return requireLib(function () { return global.mammoth; }, CDN.mammoth); },
        turndown: function () { return requireLib(function () { return global.TurndownService; }, CDN.turndown); },
        docx: function () { return requireLib(function () { return global.docx; }, CDN.docx); },
        fuse: function () { return requireLib(function () { return global.Fuse; }, CDN.fuse); },
        async pdfJs() {
            var lib = await requireLib(function () { return global.pdfjsLib; }, CDN.pdfJs);
            lib.GlobalWorkerOptions.workerSrc = CDN.pdfJsWorker;
            return lib;
        }
    };

    /* ============================================================
       ZIP
       ============================================================ */
    async function zipFiles(entries, zipName) {
        var JSZip = await libs.jsZip();
        var zip = new JSZip();
        var used = {};
        entries.forEach(function (entry) {
            // Guard against duplicate names inside the archive.
            var name = entry.name;
            if (used[name]) {
                var n = ++used[name];
                name = stem(name) + '-' + n + '.' + extOf(entry.name);
            } else {
                used[name] = 1;
            }
            zip.file(name, entry.blob);
        });
        var blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        return { blob: blob, name: zipName || 'zynctools-export.zip' };
    }

    /* ============================================================
       RESULTS — the shape every tool returns
       ============================================================ */

    /** A downloadable binary result (image, PDF, audio, archive…). */
    function fileResult(blob, name, meta) {
        return Object.assign({ kind: 'file', blob: blob, name: name, size: blob.size }, meta || {});
    }

    /** A text result shown in a copyable panel. `lang` drives formatting. */
    function textResult(text, opts) {
        return Object.assign({ kind: 'text', text: String(text) }, opts || {});
    }

    /** A key/value report (metadata viewers, analyzers, checkers). */
    function dataResult(rows, opts) {
        return Object.assign({ kind: 'data', rows: rows }, opts || {});
    }

    /** Arbitrary rendered output — the tool supplies a DOM node. */
    function nodeResult(node, opts) {
        return Object.assign({ kind: 'node', node: node }, opts || {});
    }

    /* ============================================================
       ERRORS
       ============================================================ */

    /** An error whose message is safe and useful to show the user. */
    function ToolError(message) {
        var e = new Error(message);
        e.userFacing = true;
        return e;
    }

    function fail(message) { throw ToolError(message); }

    /* ============================================================
       TOAST
       ============================================================ */
    var toastTimer = null;

    function toast(message, type) {
        var host = $('#zt-toast-host');
        if (!host) {
            host = el('div', { id: 'zt-toast-host', class: 'zt-toast-host', role: 'status', 'aria-live': 'polite' });
            document.body.appendChild(host);
        }
        host.innerHTML = '';
        var node = el('div', { class: 'zt-toast zt-toast--' + (type || 'info'), text: message });
        host.appendChild(node);
        requestAnimationFrame(function () { node.classList.add('is-visible'); });
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            node.classList.remove('is-visible');
        }, type === 'error' ? 6000 : 3200);
    }

    /* ============================================================
       MISC
       ============================================================ */
    function debounce(fn, wait) {
        var t;
        return function () {
            var args = arguments, ctx = this;
            clearTimeout(t);
            t = setTimeout(function () { fn.apply(ctx, args); }, wait);
        };
    }

    function bytesToHex(buffer) {
        return Array.prototype.map.call(new Uint8Array(buffer), function (b) {
            return ('0' + b.toString(16)).slice(-2);
        }).join('');
    }

    /** UTF-8 safe base64 encode/decode (btoa alone breaks on non-Latin1). */
    function utf8ToBase64(str) {
        var bytes = new TextEncoder().encode(str);
        var bin = '';
        for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
    }

    function base64ToUtf8(b64) {
        var bin = atob(String(b64).replace(/\s+/g, ''));
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder().decode(bytes);
    }

    global.ZT = {
        ROOT: ROOT, url: url, toolUrl: toolUrl,
        $: $, $$: $$, el: el, esc: esc,
        formatBytes: formatBytes, formatDuration: formatDuration, formatNumber: formatNumber,
        stem: stem, extOf: extOf, outName: outName, slugify: slugify, clamp: clamp,
        readAsText: readAsText, readAsArrayBuffer: readAsArrayBuffer, readAsDataURL: readAsDataURL,
        loadImage: loadImage, imageSize: imageSize, makeCanvas: makeCanvas, drawToCanvas: drawToCanvas,
        canvasToBlob: canvasToBlob, encodeCanvas: encodeCanvas, flattenAlpha: flattenAlpha,
        mimeForFormat: mimeForFormat, supportsFormat: supportsFormat,
        dataURLToBlob: dataURLToBlob, blobToDataURL: blobToDataURL,
        fitInside: fitInside, smoothResize: smoothResize, mapPixels: mapPixels,
        triggerDownload: triggerDownload, downloadText: downloadText, copyText: copyText,
        loadScript: loadScript, requireLib: requireLib, CDN: CDN, libs: libs, zipFiles: zipFiles,
        fileResult: fileResult, textResult: textResult, dataResult: dataResult, nodeResult: nodeResult,
        ToolError: ToolError, fail: fail, toast: toast, debounce: debounce,
        color: color,
        bytesToHex: bytesToHex, utf8ToBase64: utf8ToBase64, base64ToUtf8: base64ToUtf8
    };

})(window);
