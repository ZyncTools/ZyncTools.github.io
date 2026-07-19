/**
 * ZyncTools — Batch Logic: IMAGE tools (lightweight)
 * ===================================================
 * • Compression: compressorjs (CDN)
 * • Convert/resize/crop/rotate/flip/watermark: Canvas API (no heavy libs)
 * • Color picker / palette / image-to-ascii / sprite-sheet / image-diff:
 *   Canvas + native JS
 *
 * Each process(file, options) -> Promise<[{name,blob,type,size,url}]>
 * Specific errors: "Invalid File Type", "Conversion Failed".
 */
(function () {
    'use strict';

    const IMG = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'];
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

    async function compress(file, opts) {
        assertImage(file);
        const C = await ensureCompressor();
        return new Promise((res, rej) => new C(file, { quality: (opts && opts.quality) || 0.6, success: res, error: () => rej(new Error('Conversion Failed: compression failed.')) }));
    }
    async function convertFormat(file, fmt) {
        assertImage(file); fmt = (fmt || 'png').toLowerCase().replace('jpg', 'jpeg');
        const mime = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[fmt];
        if (!mime) throw new Error('Invalid Input: unsupported target format.');
        const bmp = await loadBitmap(file); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
        const cx = c.getContext('2d'); if (fmt === 'jpeg') { cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height); } cx.drawImage(bmp, 0, 0);
        const blob = await canvasToBlob(c, mime, 0.92); return { blob, ext: fmt === 'jpeg' ? 'jpg' : fmt };
    }
    async function resize(file, opts) {
        assertImage(file);
        const bmp = await loadBitmap(file); let w = +opts.width || 0, h = +opts.height || 0;
        if (!w && !h) throw new Error('Invalid Input: width or height required.');
        if (w && !h) h = Math.round(bmp.height * (w / bmp.width)); if (h && !w) w = Math.round(bmp.width * (h / bmp.height));
        const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(bmp, 0, 0, w, h);
        const blob = await canvasToBlob(c, 'image/png', 0.92); return { blob, ext: 'png' };
    }
    async function crop(file, opts) {
        assertImage(file);
        const bmp = await loadBitmap(file); const c = document.createElement('canvas');
        const x = +opts.x || 0, y = +opts.y || 0, w = +opts.w || bmp.width, h = +opts.h || bmp.height;
        c.width = w; c.height = h; c.getContext('2d').drawImage(bmp, x, y, w, h, 0, 0, w, h);
        const blob = await canvasToBlob(c, 'image/png', 0.92); return { blob, ext: 'png' };
    }
    async function rotate(file, deg) {
        assertImage(file); deg = +deg || 90;
        const bmp = await loadBitmap(file); const rad = deg * Math.PI / 180;
        const w = Math.abs(bmp.width * Math.cos(rad)) + Math.abs(bmp.height * Math.sin(rad));
        const h = Math.abs(bmp.width * Math.sin(rad)) + Math.abs(bmp.height * Math.cos(rad));
        const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h);
        const cx = c.getContext('2d'); cx.translate(c.width / 2, c.height / 2); cx.rotate(rad); cx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
        const blob = await canvasToBlob(c, 'image/png', 0.92); return { blob, ext: 'png' };
    }
    async function flip(file, mode) {
        assertImage(file);
        const bmp = await loadBitmap(file); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
        const cx = c.getContext('2d'); if (mode === 'vertical') cx.scale(1, -1); else cx.scale(-1, 1);
        cx.drawImage(bmp, mode === 'vertical' ? 0 : -bmp.width, mode === 'vertical' ? -bmp.height : 0);
        const blob = await canvasToBlob(c, 'image/png', 0.92); return { blob, ext: 'png' };
    }
    async function watermark(file, opts) {
        assertImage(file);
        const bmp = await loadBitmap(file); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
        const cx = c.getContext('2d'); cx.drawImage(bmp, 0, 0);
        cx.font = (opts.fontSize || 24) + 'px sans-serif'; cx.fillStyle = (opts.color || 'rgba(255,255,255,0.6)');
        cx.fillText(opts.text || 'ZyncTools', (opts.x || 10), (opts.y || bmp.height - 10));
        const blob = await canvasToBlob(c, 'image/png', 0.92); return { blob, ext: 'png' };
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
        const bmp = await loadBitmap(file); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0);
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const set = {};
        for (let i = 0; i < d.length; i += 4) { const hex = '#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join(''); set[hex] = (set[hex] || 0) + 1; }
        const top = Object.entries(set).sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x[0]);
        return { text: JSON.stringify({ dominant: top[0], palette: top }, null, 2), type: 'text/plain', ext: 'txt' };
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
        'image-compressor': f => compress(f, { quality: 0.6 }),
        'image-converter': (f, o) => convertFormat(f, o && o.format || 'png'),
        'image-resizer': (f, o) => resize(f, o),
        'image-cropper': (f, o) => crop(f, o),
        'image-rotate': (f, o) => rotate(f, o && o.deg || 90),
        'image-flip': (f, o) => flip(f, o && o.mode || 'horizontal'),
        'image-watermark': (f, o) => watermark(f, o),
        'image-upscaler': (f, o) => upscale(f, o && o.scale || 2),
        'color-picker-image': f => colorPicker(f),
        'color-palette-generator': f => palette(f),
        'image-to-ascii': f => imageToAscii(f),
        'sprite-sheet-packer': files => spriteSheet(files),
        'image-diff': files => imageDiff(files[0], files[1])
    };

    window.ZyncBatchImage = { H,
        getModule(toolId) {
            const fn = H[toolId];
            if (!fn) return null;
            return {
                type: 'file',
                outputType: 'blob',
                process: async (files, options) => {
                    if (!files || !files.length) throw new Error('Invalid Input: add an image file.');
                    const r = await fn(files, options || {});
                    if (r.text != null) { const b = new Blob([r.text], { type: r.type || 'text/plain' }); return [{ name: toolId + '-output.' + (r.ext || 'txt'), blob: b, type: b.type, size: b.size, url: URL.createObjectURL(b) }]; }
                    const name = stem(files[0]) + (toolId === 'image-compressor' ? '-compressed' : '-edited') + '.' + r.ext;
                    return [{ name, blob: r.blob, type: r.blob.type, size: r.blob.size, url: URL.createObjectURL(r.blob) }];
                }
            };
        }
    };
})();
