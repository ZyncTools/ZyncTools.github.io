/**
 * ZyncTools — Batch Logic: IMAGE tools (lightweight)
 * ===================================================
 * • Compression: compressorjs (CDN)
 * • Convert/resize/crop/rotate/flip/watermark: Canvas API (no heavy libs)
 * • Color picker / palette: Canvas + native JS
 *
 * Each process(file, options) -> Promise<[{name,blob,type,size,url}]>
 * Specific errors: "Invalid File Type", "Conversion Failed".
 */
(function () {
    'use strict';

    const IMG = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'heic', 'heif', 'avif', 'svg', 'ico'];
    function assertImage(file) {
        const e = (file.name.split('.').pop() || '').toLowerCase();
        if (!IMG.includes(e) && !/^image\//.test(file.type || '')) throw new Error(`Invalid File Type: "${file.name}" is not a supported image.`);
    }
    const stem = f => f.name.replace(/\.[^.]+$/, '');

    function ensureCompressor() {
        return new Promise((res, rej) => {
            if (window.Compressor) return res(window.Compressor);
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/compressorjs@1.2.1/dist/compressor.min.js';
            s.onload = () => window.Compressor ? res(window.Compressor) : rej(new Error('load'));
            s.onerror = () => rej(new Error('Load Error: compressorjs'));
            document.head.appendChild(s);
        });
    }
    function loadBitmap(file) {
        if (window.createImageBitmap) return createImageBitmap(file);
        return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => rej(new Error('Conversion Failed: cannot decode image.')); img.src = URL.createObjectURL(file); });
    }
    function canvasToBlob(canvas, mime, q) { return new Promise((r, e) => canvas.toBlob(b => b ? r(b) : e(new Error('Conversion Failed: encode error.')), mime, q)); }
    function newCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

    async function compress(file, opts) {
        assertImage(file);
        const C = await ensureCompressor();
        const quality = (opts && opts.quality != null) ? opts.quality / 100 : 0.6;
        return new Promise((res, rej) => new C(file, { quality, convertSize: Infinity, success: (blob) => res({ blob, ext: (file.name.split('.').pop() || 'jpg').toLowerCase() }), error: () => rej(new Error('Conversion Failed: compression failed.')) }));
    }
    async function convertFormat(file, fmt, quality) {
        assertImage(file);
        fmt = (fmt || 'png').toLowerCase().replace('jpg', 'jpeg');
        const mimeMap = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' };
        const mime = mimeMap[fmt];
        if (!mime) throw new Error('Invalid Input: unsupported target format.');
        const testC = document.createElement('canvas');
        const supported = await new Promise(res => testC.toBlob(b => res(!!b), mime));
        if (!supported) throw new Error('Invalid Input: browser does not support ' + fmt.toUpperCase() + ' encoding.');
        const bmp = await loadBitmap(file);
        const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
        const cx = c.getContext('2d');
        if (fmt === 'jpeg') { cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height); }
        cx.drawImage(bmp, 0, 0);
        const q = (quality != null) ? quality / 100 : 0.92;
        const blob = await canvasToBlob(c, mime, q);
        return { blob, ext: fmt === 'jpeg' ? 'jpg' : fmt };
    }
    async function resize(file, opts) {
        assertImage(file);
        const bmp = await loadBitmap(file);
        let w = +opts.width || 0, h = +opts.height || 0;
        const mode = (opts && opts.mode) || 'pixels';
        if (mode === 'percentage') {
            w = Math.round(bmp.width * (w / 100));
            h = Math.round(bmp.height * (h / 100));
            if (opts.lockAspect) {
                if (w && !h) h = Math.round(bmp.height * (w / bmp.width));
                if (h && !w) w = Math.round(bmp.width * (h / bmp.height));
            }
        } else {
            if (w && !h) h = Math.round(bmp.height * (w / bmp.width));
            if (h && !w) w = Math.round(bmp.width * (h / bmp.height));
        }
        if (!w && !h) throw new Error('Invalid Input: width or height required.');
        w = Math.max(1, w); h = Math.max(1, h);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(bmp, 0, 0, w, h);
        const fmt = (opts && opts.outputFormat) || 'png';
        const mimeMap = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
        const mime = mimeMap[fmt] || 'image/png';
        const q = (opts && opts.quality != null) ? opts.quality / 100 : 0.92;
        const blob = await canvasToBlob(c, mime, q);
        return { blob, ext: fmt === 'jpeg' ? 'jpg' : fmt };
    }
    async function crop(file, opts) {
        assertImage(file);
        const bmp = await loadBitmap(file);
        const c = document.createElement('canvas');
        let x = +opts.x || 0, y = +opts.y || 0, w = +opts.w || bmp.width, h = +opts.h || bmp.height;
        const aspect = (opts && opts.aspectRatio) || 'free';
        if (aspect !== 'free') {
            const parts = aspect.split(':');
            if (parts.length === 2) {
                const ratio = parseFloat(parts[0]) / parseFloat(parts[1]);
                if (w && !h) h = Math.round(w / ratio);
                else if (h && !w) w = Math.round(h * ratio);
                else {
                    const currentRatio = w / h;
                    if (currentRatio > ratio) w = Math.round(h * ratio);
                    else h = Math.round(w / ratio);
                }
            }
        }
        if (x + w > bmp.width) w = bmp.width - x;
        if (y + h > bmp.height) h = bmp.height - y;
        c.width = w; c.height = h; c.getContext('2d').drawImage(bmp, x, y, w, h, 0, 0, w, h);
        const blob = await canvasToBlob(c, 'image/png', 0.92);
        return { blob, ext: 'png' };
    }
    async function rotate(file, deg) {
        assertImage(file);
        deg = +deg || 90;
        const bmp = await loadBitmap(file);
        const rad = deg * Math.PI / 180;
        const w = Math.ceil(Math.abs(bmp.width * Math.cos(rad)) + Math.abs(bmp.height * Math.sin(rad)));
        const h = Math.ceil(Math.abs(bmp.width * Math.sin(rad)) + Math.abs(bmp.height * Math.cos(rad)));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const cx = c.getContext('2d'); cx.translate(c.width / 2, c.height / 2); cx.rotate(rad); cx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
        const blob = await canvasToBlob(c, 'image/png', 0.92);
        return { blob, ext: 'png' };
    }
    async function flip(file, mode) {
        assertImage(file);
        const bmp = await loadBitmap(file);
        const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
        const cx = c.getContext('2d');
        if (mode === 'vertical') cx.scale(1, -1);
        else if (mode === 'both') cx.scale(-1, -1);
        else cx.scale(-1, 1);
        cx.drawImage(bmp, mode === 'vertical' ? 0 : -bmp.width, mode === 'vertical' || mode === 'both' ? -bmp.height : 0);
        const blob = await canvasToBlob(c, 'image/png', 0.92);
        return { blob, ext: 'png' };
    }
    async function watermark(file, opts) {
        assertImage(file);
        const bmp = await loadBitmap(file);
        const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
        const cx = c.getContext('2d'); cx.drawImage(bmp, 0, 0);

        if (opts && opts.imageUrl) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = opts.imageUrl; });
            const scale = (opts && opts.scale) ? opts.scale / 100 : 0.2;
            const w = bmp.width * scale, h = bmp.height * scale;
            cx.globalAlpha = (opts && opts.opacity != null) ? opts.opacity / 100 : 0.6;
            const x = (opts && opts.x != null) ? opts.x : 10;
            const y = (opts && opts.y != null) ? opts.y : bmp.height - h - 10;
            const rotation = (opts && opts.rotation) ? opts.rotation * Math.PI / 180 : 0;
            cx.save();
            cx.translate(x + w / 2, y + h / 2);
            cx.rotate(rotation);
            cx.drawImage(img, -w / 2, -h / 2, w, h);
            cx.restore();
            cx.globalAlpha = 1;
        } else {
            const text = (opts && opts.text) || 'ZyncTools';
            const fontSize = (opts && opts.fontSize) || 24;
            cx.font = `bold ${fontSize}px Inter, sans-serif`;
            const color = (opts && opts.color) || 'rgba(255,255,255,0.6)';
            cx.fillStyle = color;
            cx.globalAlpha = (opts && opts.opacity != null) ? opts.opacity / 100 : 0.6;
            const x = (opts && opts.x != null) ? opts.x : 10;
            const y = (opts && opts.y != null) ? opts.y : bmp.height - 10;
            const rotation = (opts && opts.rotation) ? opts.rotation * Math.PI / 180 : 0;
            cx.save();
            cx.translate(x, y);
            cx.rotate(rotation);
            cx.fillText(text, 0, 0);
            cx.restore();
            cx.globalAlpha = 1;
        }
        const blob = await canvasToBlob(c, 'image/png', 0.92);
        return { blob, ext: 'png' };
    }
    async function upscale(file, scale) {
        assertImage(file); scale = +(scale || 2);
        const bmp = await loadBitmap(file); const c = document.createElement('canvas');
        c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
        c.getContext('2d').imageSmoothingQuality = 'high'; c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        const blob = await canvasToBlob(c, 'image/png', 0.95); return { blob, ext: 'png' };
    }
    async function colorPicker(file) {
        assertImage(file);
        const bmp = await loadBitmap(file);
        const sampleSize = 200;
        const c = newCanvas(sampleSize, Math.round(sampleSize * (bmp.height / bmp.width)));
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        const set = {};
        for (let i = 0; i < d.length; i += 4) {
            const hex = '#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
            set[hex] = (set[hex] || 0) + 1;
        }
        const top = Object.entries(set).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);
        const dominant = top[0] || '#000000';
        const r = parseInt(dominant.slice(1, 3), 16), g = parseInt(dominant.slice(3, 5), 16), b = parseInt(dominant.slice(5, 7), 16);
        const toHsl = (r, g, b) => {
            r /= 255; g /= 255; b /= 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h = 0, s = 0, l = (max + min) / 2;
            if (max !== min) {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                    case g: h = ((b - r) / d + 2) / 6; break;
                    case b: h = ((r - g) / d + 4) / 6; break;
                }
            }
            return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
        };
        const hsl = toHsl(r, g, b);
        const result = {
            dominant: { hex: dominant, rgb: { r, g, b }, hsl },
            palette: top.map(hex => {
                const r2 = parseInt(hex.slice(1, 3), 16), g2 = parseInt(hex.slice(3, 5), 16), b2 = parseInt(hex.slice(5, 7), 16);
                return { hex, rgb: { r: r2, g: g2, b: b2 } };
            })
        };
        return { text: JSON.stringify(result, null, 2), type: 'application/json', ext: 'json' };
    }
    async function palette(file) { return colorPicker(file); }
    async function imageToAscii(file) {
        assertImage(file);
        const bmp = await loadBitmap(file); const W = 80; const c = document.createElement('canvas'); c.width = W; c.height = Math.round(bmp.height * W / bmp.width / 2);
        const cx = c.getContext('2d'); cx.drawImage(bmp, 0, 0, c.width, c.height);
        const d = cx.getImageData(0, 0, c.width, c.height).data; const ramp = '@%#*+=-:. '; let out = '';
        for (let y = 0; y < c.height; y++) { for (let x = 0; x < c.width; x++) { const i = (y * c.width + x) * 4; const lum = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255; out += ramp[Math.floor((1 - lum) * (ramp.length - 1))]; } out += '\n'; }
        return { text: out, type: 'text/plain', ext: 'txt' };
    }
    async function spriteSheet(files) {
        if (!files || files.length < 2) throw new Error('Invalid Input: need 2+ images.');
        const bmps = await Promise.all(files.map(loadBitmap));
        const w = Math.max(...bmps.map(b => b.width)), h = Math.max(...bmps.map(b => b.height));
        const c = document.createElement('canvas'); c.width = w * bmps.length; c.height = h;
        const cx = c.getContext('2d'); bmps.forEach((b, i) => cx.drawImage(b, i * w, 0));
        const blob = await canvasToBlob(c, 'image/png', 1); return { blob, ext: 'png' };
    }
    async function imageDiff(f1, f2) {
        if (!f1 || !f2) throw new Error('Invalid Input: provide two images.');
        const [a, b] = await Promise.all([loadBitmap(f1), loadBitmap(f2)]);
        const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
        const ca = document.createElement('canvas'); ca.width = w; ca.height = h; ca.getContext('2d').drawImage(a, 0, 0, w, h);
        const cb = document.createElement('canvas'); cb.width = w; cb.height = h; cb.getContext('2d').drawImage(b, 0, 0, w, h);
        const da = ca.getContext('2d').getImageData(0, 0, w, h).data, db = cb.getContext('2d').getImageData(0, 0, w, h).data;
        const cc = document.createElement('canvas'); cc.width = w; cc.height = h; const cx = cc.getContext('2d');
        const out = cx.createImageData(w, h); let diff = 0;
        for (let i = 0; i < da.length; i += 4) { const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]); if (d > 30) diff++; out.data[i] = d; out.data[i + 1] = d; out.data[i + 2] = d; out.data[i + 3] = 255; }
        cx.putImageData(out, 0, 0);
        const blob = await canvasToBlob(cc, 'image/png', 1);
        return { blob, ext: 'png', note: (diff / (w * h) * 100).toFixed(1) + '% pixels differ' };
    }

    const H = {
        'image-compressor': (f, o) => compress(Array.isArray(f) ? f[0] : f, o),
        'image-converter': (f, o) => convertFormat(Array.isArray(f) ? f[0] : f, o && o.format || 'png', o && o.quality),
        'image-resizer': (f, o) => resize(Array.isArray(f) ? f[0] : f, o),
        'image-cropper': (f, o) => crop(Array.isArray(f) ? f[0] : f, o),
        'image-rotate': (f, o) => rotate(Array.isArray(f) ? f[0] : f, (o && o.angle === 'custom') ? (o.customAngle || 45) : (o && o.angle != null ? o.angle : (o && o.deg || 90))),
        'image-flip': (f, o) => flip(Array.isArray(f) ? f[0] : f, o && o.mode || 'horizontal'),
        'image-watermark': (f, o) => watermark(Array.isArray(f) ? f[0] : f, o),
        'image-upscaler': (f, o) => upscale(Array.isArray(f) ? f[0] : f, o && o.scale || 2),
        'color-picker-image': f => colorPicker(Array.isArray(f) ? f[0] : f),
        'color-palette-generator': f => palette(Array.isArray(f) ? f[0] : f),
        'image-to-ascii': f => imageToAscii(Array.isArray(f) ? f[0] : f),
        'sprite-sheet-packer': files => spriteSheet(files),
        'image-diff': files => imageDiff(files && files[0], files && files[1])
    };

    window.ZyncBatchImage = { H,
        getModule(toolId) {
            const fn = H[toolId];
            if (!fn) return null;
            const singleFileTools = ['image-compressor', 'image-converter', 'image-resizer', 'image-cropper', 'image-rotate', 'image-flip', 'image-watermark', 'image-upscaler', 'color-picker-image', 'color-palette-generator', 'image-to-ascii'];
            return {
                type: 'file',
                outputType: 'blob',
                process: async (files, options) => {
                    if (!files || !files.length) throw new Error('Invalid Input: add an image file.');
                    const input = singleFileTools.indexOf(toolId) !== -1 ? files[0] : files;
                    const r = await fn(input, options || {});
                    if (r.text != null) { const b = new Blob([r.text], { type: r.type || 'text/plain' }); return [{ name: toolId + '-output.' + (r.ext || 'txt'), blob: b, type: b.type, size: b.size, url: URL.createObjectURL(b) }]; }
                    const name = stem(files[0]) + (toolId === 'image-compressor' ? '-compressed' : '-edited') + '.' + r.ext;
                    return [{ name, blob: r.blob, type: r.blob.type, size: r.blob.size, url: URL.createObjectURL(r.blob) }];
                }
            };
        }
    };
})();
