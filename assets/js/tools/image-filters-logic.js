/**
 * ZyncTools — Batch Logic: IMAGE filters / effects / extra (lightweight)
 * ======================================================================
 * Canvas-based: grayscale, sepia, brightness/contrast, blur, pixelate,
 * invert, saturate, hue-rotate, temperature, exposure, join (horizontal/vertical/grid),
 * split (vertical slices), base64 encode, ico/favicon (proper multi-size ICO),
 * svg-optimize, image-compare, metadata-viewer, meme-generator, ocr, rename.
 */
(function () {
    'use strict';
    const IMG = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'heic', 'heif', 'avif', 'svg', 'ico'];
    function assertImage(file) { const e = (file.name.split('.').pop() || '').toLowerCase(); if (!IMG.includes(e) && !/^image\//.test(file.type || '')) throw new Error(`Invalid File Type: "${file.name}".`); }
    const stem = f => f.name.replace(/\.[^.]+$/, '');
    function loadBitmap(file) { if (window.createImageBitmap) return createImageBitmap(file); return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Conversion Failed.')); i.src = URL.createObjectURL(file); }); }
    function canvasToBlob(c, mime, q) { return new Promise((r, e) => c.toBlob(b => b ? r(b) : e(new Error('Conversion Failed.')), mime, q)); }
    function newCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }
    function px(cx, w, h, fn) {
        const d = cx.getImageData(0, 0, w, h); const p = d.data;
        for (let i = 0; i < p.length; i += 4) fn(p, i);
        cx.putImageData(d, 0, 0);
    }

    async function withFilter(file, apply, opts) {
        assertImage(file);
        const bmp = await loadBitmap(file);
        const c = newCanvas(bmp.width, bmp.height);
        const cx = c.getContext('2d');
        cx.drawImage(bmp, 0, 0);
        apply(cx, c.width, c.height, opts);
        const mime = (opts && opts.format) || 'image/png';
        const q = (opts && opts.quality != null) ? opts.quality / 100 : 0.95;
        const blob = await canvasToBlob(c, mime, q);
        const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
        return { blob, ext: extMap[mime] || 'png' };
    }

    async function applyMultiFilter(file, opts) {
        assertImage(file);
        const bmp = await loadBitmap(file);
        const c = newCanvas(bmp.width, bmp.height);
        const cx = c.getContext('2d');
        cx.drawImage(bmp, 0, 0);
        const d = cx.getImageData(0, 0, c.width, c.height);
        const p = d.data;
        const brightness = (opts && opts.brightness) || 0;
        const contrast = (opts && opts.contrast) || 0;
        const saturation = (opts && opts.saturation != null) ? opts.saturation / 100 : 1;
        const hueRotate = (opts && opts.hueRotate) || 0;
        const sepia = (opts && opts.sepia != null) ? opts.sepia / 100 : 0;
        const grayscale = (opts && opts.grayscale != null) ? opts.grayscale / 100 : 0;
        const invert = (opts && opts.invert != null) ? opts.invert / 100 : 0;
        const exposure = (opts && opts.exposure) || 0;
        const vibrance = (opts && opts.vibrance) || 0;
        const temperature = (opts && opts.temperature) || 0;

        const hueRad = hueRotate * Math.PI / 180;
        const cosH = Math.cos(hueRad), sinH = Math.sin(hueRad);

        for (let i = 0; i < p.length; i += 4) {
            let r = p[i], g = p[i + 1], b = p[i + 2];

            // Exposure
            if (exposure) {
                const e = Math.pow(2, exposure / 50);
                r = clamp(r * e); g = clamp(g * e); b = clamp(b * e);
            }

            // Temperature
            if (temperature) {
                r = clamp(r + temperature * 1.2);
                b = clamp(b - temperature * 1.2);
            }

            // Brightness
            r = clamp(r + brightness);
            g = clamp(g + brightness);
            b = clamp(b + brightness);

            // Contrast
            const cf = (259 * (contrast + 255)) / (255 * (259 - contrast));
            r = clamp(cf * (r - 128) + 128);
            g = clamp(cf * (g - 128) + 128);
            b = clamp(cf * (b - 128) + 128);

            // Saturation + Vibrance
            const gray = 0.3 * r + 0.59 * g + 0.11 * b;
            let sat = saturation;
            if (vibrance) {
                const max = Math.max(r, g, b), min = Math.min(r, g, b);
                const avg = (max + min) / 2;
                sat += (vibrance / 100) * (1 - Math.abs(avg - 128) / 128) * 0.5;
            }
            r = clamp(gray + (r - gray) * sat);
            g = clamp(gray + (g - gray) * sat);
            b = clamp(gray + (b - gray) * sat);

            // Hue rotate
            if (hueRotate) {
                const nr = r * (0.213 + cosH * 0.787 - sinH * 0.213) + g * (0.715 - cosH * 0.715 - sinH * 0.715) + b * (0.072 - cosH * 0.072 + sinH * 0.928);
                const ng = r * (0.213 - cosH * 0.213 + sinH * 0.143) + g * (0.715 + cosH * 0.285 + sinH * 0.140) + b * (0.072 - cosH * 0.072 - sinH * 0.283);
                const nb = r * (0.213 - cosH * 0.213 - sinH * 0.787) + g * (0.715 - cosH * 0.715 + sinH * 0.715) + b * (0.072 + cosH * 0.928 + sinH * 0.072);
                r = clamp(nr); g = clamp(ng); b = clamp(nb);
            }

            // Sepia
            if (sepia) {
                const sr = clamp(r * 0.393 + g * 0.769 + b * 0.189);
                const sg = clamp(r * 0.349 + g * 0.686 + b * 0.168);
                const sb = clamp(r * 0.272 + g * 0.534 + b * 0.131);
                r = r + (sr - r) * sepia;
                g = g + (sg - g) * sepia;
                b = b + (sb - b) * sepia;
            }

            // Grayscale
            if (grayscale) {
                const grayVal = 0.3 * r + 0.59 * g + 0.11 * b;
                r = r + (grayVal - r) * grayscale;
                g = g + (grayVal - g) * grayscale;
                b = b + (grayVal - b) * grayscale;
            }

            // Invert
            if (invert) {
                r = r + (255 - 2 * r) * invert;
                g = g + (255 - 2 * g) * invert;
                b = b + (255 - 2 * b) * invert;
            }

            p[i] = clamp(r);
            p[i + 1] = clamp(g);
            p[i + 2] = clamp(b);
        }
        cx.putImageData(d, 0, 0);
        const mime = (opts && opts.format) || 'image/png';
        const q = (opts && opts.quality != null) ? opts.quality / 100 : 0.95;
        const blob = await canvasToBlob(c, mime, q);
        const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
        return { blob, ext: extMap[mime] || 'png' };
    }

    async function ocrImage(file, opts) {
        assertImage(file);
        if (!window.Tesseract) {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
            await new Promise((res, rej) => { s.onload = res; s.onerror = rej; document.head.appendChild(s); });
        }
        const lang = (opts && opts.language) || 'eng';
        const result = await Tesseract.recognize(file, lang, { logger: m => { if (m.status === 'recognizing text' && opts && opts.setProgress) opts.setProgress(Math.round(m.progress * 100)); } });
        return { text: result.data.text, type: 'text/plain', ext: 'txt' };
    }

    async function batchRename(files, opts) {
        if (!files || !files.length) throw new Error('Invalid Input: add image files.');
        const pattern = (opts && opts.pattern) || 'image_{n}';
        const prefix = (opts && opts.prefix) || '';
        const suffix = (opts && opts.suffix) || '';
        const start = parseInt((opts && opts.start) || '1', 10);
        const pad = Math.max(1, parseInt((opts && opts.pad) || '3', 10));

        if (typeof files[0] === 'string') {
            const names = files.join('\n').split(/\n+/).filter(Boolean).map((nm, i) => prefix + pattern.replace('{n}', String(start + i).padStart(pad, '0')).replace('{name}', nm.replace(/\.[^.]+$/, '')) + suffix + (nm.match(/\.[^.]+$/) || ''));
            return { text: names.join('\n'), type: 'text/plain', ext: 'txt' };
        }

        const fileNames = files.map(f => f.name || 'unknown');
        const newNames = fileNames.map((nm, i) => prefix + pattern.replace('{n}', String(start + i).padStart(pad, '0')).replace('{name}', nm.replace(/\.[^.]+$/, '')) + suffix + '.' + (nm.match(/\.[^.]+$/) || 'jpg'));

        let zip = null;
        if (!window.JSZip) {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }
        if (window.JSZip) zip = new JSZip();
        const results = [];
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const newName = newNames[i];
            if (zip) {
                zip.file(newName, await f.arrayBuffer());
            }
            results.push({ name: newName, blob: f, type: f.type, size: f.size, url: URL.createObjectURL(f) });
        }
        if (zip) {
            const content = await zip.generateAsync({ type: 'blob' });
            results.push({ name: 'renamed-images.zip', blob: content, type: 'application/zip', size: content.size, url: URL.createObjectURL(content) });
        }
        return results;
    }

    async function joinImages(files, opts) {
        if (!files || files.length < 2) throw new Error('Invalid Input: need 2+ images.');
        const bmps = await Promise.all(files.map(loadBitmap));
        const direction = (opts && opts.direction) || 'horizontal';
        const spacing = parseInt((opts && opts.spacing) || '0', 10);
        const bgColor = (opts && opts.background) || '#ffffff';
        const cols = parseInt((opts && opts.columns) || '2', 10);

        let c, cx;
        if (direction === 'vertical') {
            const w = Math.max(...bmps.map(b => b.width));
            const h = bmps.reduce((a, b) => a + b.height, 0) + spacing * (bmps.length - 1);
            c = newCanvas(w, h); cx = c.getContext('2d');
            cx.fillStyle = bgColor; cx.fillRect(0, 0, w, h);
            let y = 0;
            bmps.forEach(b => { cx.drawImage(b, Math.round((w - b.width) / 2), y); y += b.height + spacing; });
        } else if (direction === 'grid') {
            const colsN = Math.max(1, cols);
            const rows = Math.ceil(bmps.length / colsN);
            const cellW = Math.max(...bmps.map(b => b.width));
            const cellH = Math.max(...bmps.map(b => b.height));
            const w = cellW * colsN + spacing * (colsN - 1);
            const h = cellH * rows + spacing * (rows - 1);
            c = newCanvas(w, h); cx = c.getContext('2d');
            cx.fillStyle = bgColor; cx.fillRect(0, 0, w, h);
            bmps.forEach((b, i) => {
                const col = i % colsN, row = Math.floor(i / colsN);
                cx.drawImage(b, col * (cellW + spacing), row * (cellH + spacing));
            });
        } else {
            const w = bmps.reduce((a, b) => a + b.width, 0) + spacing * (bmps.length - 1);
            const h = Math.max(...bmps.map(b => b.height));
            c = newCanvas(w, h); cx = c.getContext('2d');
            cx.fillStyle = bgColor; cx.fillRect(0, 0, w, h);
            let x = 0;
            bmps.forEach(b => { cx.drawImage(b, x, Math.round((h - b.height) / 2)); x += b.width + spacing; });
        }
        const blob = await canvasToBlob(c, 'image/png', 0.95);
        return { blob, ext: 'png' };
    }

    async function splitImage(file, opts) {
        assertImage(file);
        const bmp = await loadBitmap(file);
        const n = parseInt((opts && opts.parts) || '2', 10);
        const partW = Math.floor(bmp.width / n);
        const results = [];
        for (let i = 0; i < n; i++) {
            const c = newCanvas(partW, bmp.height);
            c.getContext('2d').drawImage(bmp, -i * partW, 0);
            const blob = await canvasToBlob(c, 'image/png', 0.95);
            results.push({ name: stem(file) + '-part' + (i + 1) + '.png', blob, type: 'image/png', size: blob.size, url: URL.createObjectURL(blob) });
        }
        return results;
    }

    async function convertIco(file, opts) {
        assertImage(file);
        const bmp = await loadBitmap(file);
        const sizesStr = (opts && opts.sizes) || '16,32,48,64,128,256';
        const sizes = sizesStr.split(',').map(s => parseInt(s.trim(), 10)).filter(s => [16, 32, 48, 64, 128, 256].includes(s));
        if (!sizes.length) sizes.push(16, 32, 48);
        const dirEntries = sizes.length;
        const header = [0, 0, 1, 0, dirEntries & 255, dirEntries >> 8];
        let images = [];
        for (const s of sizes) {
            const c = newCanvas(s, s);
            c.getContext('2d').drawImage(bmp, 0, 0, s, s);
            const blob = await canvasToBlob(c, 'image/png');
            const buf = new Uint8Array(await blob.arrayBuffer());
            images.push({ size: s, png: buf });
        }
        const out = [];
        const base = [].concat(header);
        let offset = 6 + dirEntries * 16;
        const pngs = [];
        for (const im of images) {
            base.push(im.size, im.size, 0, 0, 1, 32, im.png.length & 255, (im.png.length >> 8) & 255, (im.png.length >> 16) & 255, (im.png.length >> 24) & 255, offset & 255, (offset >> 8) & 255, (offset >> 16) & 255, (offset >> 24) & 255);
            pngs.push(im.png);
            offset += im.png.length;
        }
        let all = new Uint8Array(offset);
        let p = 0;
        for (const v of base) all[p++] = v;
        for (const png of pngs) { all.set(png, p); p += png.length; }
        return { blob: new Blob([all], { type: 'image/x-icon' }), ext: 'ico' };
    }

    async function generateFavicon(file, opts) {
        assertImage(file);
        const bmp = await loadBitmap(file);
        const sizes = [16, 32, 48, 64, 96, 128, 180, 192, 256];
        const generateSize = async (s) => {
            const c = newCanvas(s, s);
            c.getContext('2d').drawImage(bmp, 0, 0, s, s);
            const blob = await canvasToBlob(c, 'image/png', 1);
            const buf = new Uint8Array(await blob.arrayBuffer());
            return { size: s, png: buf, blob };
        };
        const entries = await Promise.all(sizes.map(generateSize));

        const dirEntries = entries.length;
        const header = [0, 0, 1, 0, dirEntries & 255, dirEntries >> 8];
        let offset = 6 + dirEntries * 16;
        const pngs = [];
        const base = [].concat(header);
        for (const im of entries) {
            const w = im.size >= 256 ? 0 : im.size;
            const h = im.size >= 256 ? 0 : im.size;
            base.push(w, h, 0, 0, 1, 32, im.png.length & 255, (im.png.length >> 8) & 255, (im.png.length >> 16) & 255, (im.png.length >> 24) & 255, offset & 255, (offset >> 8) & 255, (offset >> 16) & 255, (offset >> 24) & 255);
            pngs.push(im.png);
            offset += im.png.length;
        }
        let all = new Uint8Array(offset);
        let p = 0;
        for (const v of base) all[p++] = v;
        for (const png of pngs) { all.set(png, p); p += png.length; }

        return { blob: new Blob([all], { type: 'image/x-icon' }), ext: 'ico' };
    }

    async function optimizeSvg(t, opts) {
        let s = '';
        if (typeof t === 'string') {
            s = t;
        } else if (t && typeof t.text === 'function') {
            s = await t.text();
        } else if (t && t.arrayBuffer) {
            const buf = new Uint8Array(await t.arrayBuffer());
            for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
        } else {
            s = Array.isArray(t) ? t.join('') : (t || '');
        }
        let out = s;
        if (opts && opts.removeMetadata) {
            out = out.replace(/<!--[\s\S]*?-->/g, '');
            out = out.replace(/\s*xmlns(:[a-zA-Z0-9]+)?="[^"]*"/g, '');
            out = out.replace(/\s*xmlns="[^"]*"/g, '');
        }
        out = out.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
        if (opts && opts.minify) {
            out = out.replace(/<!--[\s\S]*?-->/g, '');
            out = out.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
            out = out.replace(/;\s*}/g, '}').replace(/\{\s*/g, '{').replace(/\s*:\s*/g, ':').replace(/,\s*/g, ',').replace(/\s*;\s*/g, ';');
        }
        return { text: out, type: 'image/svg+xml', ext: 'svg' };
    }

    async function compareImages(files) {
        if (!files || files.length < 2) throw new Error('Invalid Input: need 2 images.');
        const [a, b] = await Promise.all(files.slice(0, 2).map(loadBitmap));
        const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
        const ca = newCanvas(w, h); ca.getContext('2d').drawImage(a, 0, 0, w, h);
        const cb = newCanvas(w, h); cb.getContext('2d').drawImage(b, 0, 0, w, h);
        const da = ca.getContext('2d').getImageData(0, 0, w, h).data, db = cb.getContext('2d').getImageData(0, 0, w, h).data;
        let diff = 0;
        for (let i = 0; i < da.length; i += 4) { if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 30) diff++; }
        return { text: (diff / (w * h) * 100).toFixed(2) + '% of pixels differ', type: 'text/plain', ext: 'txt' };
    }

    async function viewMetadata(f) {
        assertImage(f);
        const bmp = await loadBitmap(f);
        return { text: JSON.stringify({ width: bmp.width, height: bmp.height, name: f.name, sizeKB: Math.round(f.size / 1024), type: f.type }, null, 2), type: 'text/plain', ext: 'txt' };
    }

    async function viewHistogram(f) {
        assertImage(f);
        const bmp = await loadBitmap(f);
        const c = newCanvas(bmp.width, bmp.height);
        c.getContext('2d').drawImage(bmp, 0, 0);
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        const rh = new Array(256).fill(0), gh = new Array(256).fill(0), bh = new Array(256).fill(0);
        for (let i = 0; i < d.length; i += 4) { rh[d[i]]++; gh[d[i + 1]]++; bh[d[i + 2]]++; }
        return { text: JSON.stringify({ redMax: Math.max(...rh), greenMax: Math.max(...gh), blueMax: Math.max(...bh) }), type: 'text/plain', ext: 'txt' };
    }

    async function encodeBase64(f) {
        assertImage(f);
        const buf = new Uint8Array(await f.arrayBuffer());
        let bin = ''; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        return { text: 'data:' + (f.type || 'image/png') + ';base64,' + btoa(bin), type: 'text/plain', ext: 'txt' };
    }

    async function generateMeme(f, o) {
        assertImage(f);
        const bmp = await loadBitmap(f);
        const c = newCanvas(bmp.width, bmp.height);
        const cx = c.getContext('2d'); cx.drawImage(bmp, 0, 0);
        const fs = Math.max(24, bmp.width / 12);
        cx.font = `bold ${fs}px Impact, sans-serif`;
        cx.fillStyle = '#fff'; cx.strokeStyle = '#000'; cx.lineWidth = fs / 12;
        cx.textAlign = 'center';
        const top = (o && o.top) || '', bot = (o && o.bottom) || '';
        cx.strokeText(top, bmp.width / 2, fs + 10); cx.fillText(top, bmp.width / 2, fs + 10);
        cx.strokeText(bot, bmp.width / 2, bmp.height - 16); cx.fillText(bot, bmp.width / 2, bmp.height - 16);
        const blob = await canvasToBlob(c, 'image/png', 0.95);
        return { blob, ext: 'png' };
    }

    async function findDuplicates(files) {
        if (!files || files.length < 2) throw new Error('Invalid Input: need 2+ images.');
        const ha = await Promise.all(files.map(async f => { const buf = new Uint8Array(await f.arrayBuffer()); let h = 0x811c9dc5; for (let i = 0; i < buf.length; i += 997) { h ^= buf[i]; h = Math.imul(h, 0x01000193); } return (h >>> 0); }));
        const seen = {}; const dups = [];
        files.forEach((f, i) => { if (seen[ha[i]] != null) dups.push(f.name + ' == ' + files[seen[ha[i]]].name); else seen[ha[i]] = i; });
        return { text: dups.length ? dups.join('\n') : 'No duplicates found.', type: 'text/plain', ext: 'txt' };
    }

    const H = {
        'image-grayscale': (f, o) => applyMultiFilter(f, Object.assign({}, o, { grayscale: (o && o.intensity != null) ? o.intensity : 100, brightness: 0, contrast: 0 })),
        'image-sepia': (f, o) => applyMultiFilter(f, o),
        'image-invert': f => withFilter(f, (cx, w, h) => px(cx, w, h, (p, i) => { p[i] = 255 - p[i]; p[i + 1] = 255 - p[i + 1]; p[i + 2] = 255 - p[i + 2]; })),
        'image-pixelate': (f, o) => withFilter(f, async (cx, w, h) => { const s = parseInt(o && o.size) || 16; const tmp = newCanvas(Math.ceil(w / s), Math.ceil(h / s)); tmp.getContext('2d').drawImage(cx.canvas, 0, 0, tmp.width, tmp.height); cx.clearRect(0, 0, w, h); cx.imageSmoothingEnabled = false; cx.drawImage(tmp, 0, 0, w, h); }),
        'image-blur': (f, o) => withFilter(f, (cx, w, h, o2) => {
            const r = (o2 && o2.radius) || 4;
            const temp = newCanvas(w, h);
            temp.getContext('2d').drawImage(cx.canvas, 0, 0);
            cx.clearRect(0, 0, w, h);
            cx.filter = `blur(${r}px)`;
            cx.drawImage(temp, 0, 0);
            cx.filter = 'none';
        }),
        'image-brightness-contrast': (f, o) => applyMultiFilter(f, o),
        'image-saturate': (f, o) => applyMultiFilter(f, Object.assign({}, o, { saturation: (o && o.saturation != null) ? o.saturation : 140 })),
        'image-hue-rotate': (f, o) => applyMultiFilter(f, Object.assign({}, o, { hueRotate: (o && o.hueRotate) || 180 })),
        'image-temperature': (f, o) => applyMultiFilter(f, Object.assign({}, o, { temperature: (o && o.temperature) || 30 })),
        'image-exposure': (f, o) => applyMultiFilter(f, Object.assign({}, o, { exposure: (o && o.exposure) || 20 })),
        'image-vibrance': (f, o) => applyMultiFilter(f, Object.assign({}, o, { vibrance: (o && o.vibrance) || 40 })),
        'image-filters': (f, o) => applyMultiFilter(f, o),
        'image-joiner': (files, o) => joinImages(files, o),
        'image-splitter': (f, o) => splitImage(f, o),
        'ico-converter': (f, o) => convertIco(f, o),
        'favicon-generator': (f, o) => generateFavicon(f, o),
        'svg-optimizer': (t, o) => optimizeSvg(t, o),
        'image-compare': files => compareImages(files),
        'image-metadata-viewer': f => viewMetadata(f),
        'image-histogram': f => viewHistogram(f),
        'base64-image-encoder': async f => { assertImage(f); const buf = new Uint8Array(await f.arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]); return { text: 'data:' + (f.type || 'image/png') + ';base64,' + btoa(bin), type: 'text/plain', ext: 'txt' }; },
        'meme-generator': (f, o) => generateMeme(f, o),
        'image-ocr': (f, o) => ocrImage(f, o),
        'batch-rename-images': (f, o) => batchRename(f, o),
        'duplicate-image-finder': files => findDuplicates(files)
    };

    window.ZyncBatchImageFx = { H,
        getModule(toolId) {
            const fn = H[toolId]; if (!fn) return null;
            const textTools = ['image-metadata-viewer', 'image-histogram', 'image-compare', 'svg-optimizer', 'base64-image-encoder', 'batch-rename-images', 'duplicate-image-finder', 'image-ocr'];
            return {
                type: textTools.includes(toolId) ? 'text' : 'file',
                outputType: 'blob',
                process: async (files, options) => {
                    const singleFileTools = ['image-grayscale', 'image-sepia', 'image-invert', 'image-pixelate', 'image-blur', 'image-brightness-contrast', 'image-saturate', 'image-hue-rotate', 'image-temperature', 'image-exposure', 'image-vibrance', 'image-filters', 'ico-converter', 'favicon-generator', 'base64-image-encoder', 'meme-generator', 'image-ocr', 'image-metadata-viewer', 'image-histogram', 'svg-optimizer'];
                    if (!files || !files.length) throw new Error('Invalid Input: add a file.');
                    const input = singleFileTools.indexOf(toolId) !== -1 ? files[0] : files;
                    if (toolId === 'svg-optimizer') {
                        const r = await fn(input, options || {}); const b = new Blob([r.text], { type: r.type || 'text/plain' }); return [{ name: toolId + '-out.' + (r.ext || 'txt'), blob: b, type: b.type, size: b.size, url: URL.createObjectURL(b) }];
                    }
                    if (toolId === 'image-ocr') {
                        const r = await fn(input, options || {}); const b = new Blob([r.text], { type: r.type || 'text/plain' }); return [{ name: toolId + '-output.txt', blob: b, type: b.type, size: b.size, url: URL.createObjectURL(b) }];
                    }
                    const r = await fn(input, options || {});
                    if (Array.isArray(r)) return r;
                    if (r.text != null) { const b = new Blob([r.text], { type: r.type || 'text/plain' }); return [{ name: toolId + '-out.' + (r.ext || 'txt'), blob: b, type: b.type, size: b.size, url: URL.createObjectURL(b) }]; }
                    return [{ name: stem(files[0]) + '-' + toolId + '.' + r.ext, blob: r.blob, type: r.blob.type, size: r.blob.size, url: URL.createObjectURL(r.blob) }];
                }
            };
        }
    };
})();
