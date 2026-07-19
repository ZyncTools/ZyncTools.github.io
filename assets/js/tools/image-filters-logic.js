/**
 * ZyncTools — Batch Logic: IMAGE filters / effects / extra (lightweight)
 * ======================================================================
 * Canvas-based: grayscale, sepia, brightness/contrast, blur, pixelate,
 * invert, saturate, join (horizontal), split (vertical slices), base64 encode,
 * ico/favicon (PNG in .ico container), svg-optimize, image-compare,
 * metadata-viewer (dimensions), meme-generator (top/bottom captions).
 */
(function () {
    'use strict';
    const IMG = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'];
    function assertImage(file) { const e = (file.name.split('.').pop() || '').toLowerCase(); if (!IMG.includes(e) && !/^image\//.test(file.type || '')) throw new Error(`Invalid File Type: "${file.name}".`); }
    const stem = f => f.name.replace(/\.[^.]+$/, '');
    function loadBitmap(file) { if (window.createImageBitmap) return createImageBitmap(file); return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Conversion Failed.')); i.src = URL.createObjectURL(file); }); }
    function canvasToBlob(c, mime, q) { return new Promise((r, e) => c.toBlob(b => b ? r(b) : e(new Error('Conversion Failed.')), mime, q)); }
    function newCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

    async function withFilter(file, apply, opts) {
        assertImage(file);
        const bmp = await loadBitmap(file); const c = newCanvas(bmp.width, bmp.height);
        const cx = c.getContext('2d'); cx.drawImage(bmp, 0, 0);
        apply(cx, c.width, c.height, opts);
        const blob = await canvasToBlob(c, 'image/png', 0.95);
        return { blob, ext: 'png' };
    }
    function px(cx, w, h, fn) {
        const d = cx.getImageData(0, 0, w, h); const p = d.data;
        for (let i = 0; i < p.length; i += 4) fn(p, i);
        cx.putImageData(d, 0, 0);
    }
    function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

    const H = {
        'image-grayscale': f => withFilter(f, (cx, w, h) => px(cx, w, h, (p, i) => { const g = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]; p[i] = p[i + 1] = p[i + 2] = clamp(g); })),
        'image-sepia': f => withFilter(f, (cx, w, h) => px(cx, w, h, (p, i) => { const r = p[i], g = p[i + 1], b = p[i + 2]; p[i] = clamp(r * 0.393 + g * 0.769 + b * 0.189); p[i + 1] = clamp(r * 0.349 + g * 0.686 + b * 0.168); p[i + 2] = clamp(r * 0.272 + g * 0.534 + b * 0.131); })),
        'image-invert': f => withFilter(f, (cx, w, h) => px(cx, w, h, (p, i) => { p[i] = 255 - p[i]; p[i + 1] = 255 - p[i + 1]; p[i + 2] = 255 - p[i + 2]; })),
        'image-pixelate': (f, o) => withFilter(f, async (cx, w, h) => { const s = parseInt(o && o.size) || 16; const tmp = newCanvas(Math.ceil(w / s), Math.ceil(h / s)); tmp.getContext('2d').drawImage(cx.canvas, 0, 0, tmp.width, tmp.height); cx.clearRect(0, 0, w, h); cx.imageSmoothingEnabled = false; cx.drawImage(tmp, 0, 0, w, h); }),
        'image-blur': (f, o) => withFilter(f, (cx, w, h, o2) => cx.filter = `blur(${(o2 && o2.radius) || 4}px)`),
        'image-brightness-contrast': (f, o) => withFilter(f, (cx, w, h, o2) => { const b = (o2 && o2.brightness) || 0, cn = (o2 && o2.contrast) || 0; px(cx, w, h, (p, i) => { let v = (p[i] - 128) * (259 * (cn + 255) / (255 * (259 - cn))) + 128 + b; p[i] = clamp(v); v = (p[i + 1] - 128) * (259 * (cn + 255) / (255 * (259 - cn))) + 128 + b; p[i + 1] = clamp(v); v = (p[i + 2] - 128) * (259 * (cn + 255) / (255 * (259 - cn))) + 128 + b; p[i + 2] = clamp(v); }); }),
        'image-saturate': (f, o) => withFilter(f, (cx, w, h, o2) => px(cx, w, h, (p, i) => { const g = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]; const s = (o2 && o2.saturation != null) ? o2.saturation : 1.4; p[i] = clamp(g + (p[i] - g) * s); p[i + 1] = clamp(g + (p[i + 1] - g) * s); p[i + 2] = clamp(g + (p[i + 2] - g) * s); })),
        'image-histogram': async f => { assertImage(f); const bmp = await loadBitmap(f); const c = newCanvas(bmp.width, bmp.height); c.getContext('2d').drawImage(bmp, 0, 0); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const rh = new Array(256).fill(0), gh = new Array(256).fill(0), bh = new Array(256).fill(0); for (let i = 0; i < d.length; i += 4) { rh[d[i]]++; gh[d[i + 1]]++; bh[d[i + 2]]++; } return { text: JSON.stringify({ redMax: Math.max(...rh), greenMax: Math.max(...gh), blueMax: Math.max(...bh) }), type: 'text/plain', ext: 'txt' }; },
        'image-metadata-viewer': async f => { assertImage(f); const bmp = await loadBitmap(f); return { text: JSON.stringify({ width: bmp.width, height: bmp.height, name: f.name, sizeKB: Math.round(f.size / 1024), type: f.type }, null, 2), type: 'text/plain', ext: 'txt' }; },
        'base64-image-encoder': async f => { assertImage(f); const buf = new Uint8Array(await f.arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]); return { text: 'data:' + (f.type || 'image/png') + ';base64,' + btoa(bin), type: 'text/plain', ext: 'txt' }; },
        'meme-generator': async (f, o) => { assertImage(f); const bmp = await loadBitmap(f); const c = newCanvas(bmp.width, bmp.height); const cx = c.getContext('2d'); cx.drawImage(bmp, 0, 0); const fs = Math.max(24, bmp.width / 12); cx.font = `bold ${fs}px Impact, sans-serif`; cx.fillStyle = '#fff'; cx.strokeStyle = '#000'; cx.lineWidth = fs / 12; cx.textAlign = 'center'; const top = (o && o.top) || '', bot = (o && o.bottom) || ''; cx.strokeText(top, bmp.width / 2, fs + 10); cx.fillText(top, bmp.width / 2, fs + 10); cx.strokeText(bot, bmp.width / 2, bmp.height - 16); cx.fillText(bot, bmp.width / 2, bmp.height - 16); const blob = await canvasToBlob(c, 'image/png', 0.95); return { blob, ext: 'png' }; },
        'image-joiner': async files => { if (!files || files.length < 2) throw new Error('Invalid Input: need 2+ images.'); const bmps = await Promise.all(files.map(loadBitmap)); const w = bmps.reduce((a, b) => a + b.width, 0); const h = Math.max(...bmps.map(b => b.height)); const c = newCanvas(w, h); const cx = c.getContext('2d'); let x = 0; bmps.forEach(b => { cx.drawImage(b, x, 0); x += b.width; }); const blob = await canvasToBlob(c, 'image/png', 0.95); return { blob, ext: 'png' }; },
        'image-splitter': async (f, o) => { assertImage(f); const bmp = await loadBitmap(f); const n = parseInt(o && o.parts) || 2; const partW = Math.floor(bmp.width / n); const results = []; for (let i = 0; i < n; i++) { const c = newCanvas(partW, bmp.height); c.getContext('2d').drawImage(bmp, -i * partW, 0); const blob = await canvasToBlob(c, 'image/png', 0.95); results.push({ name: stem(f) + '-part' + (i + 1) + '.png', blob, type: 'image/png', size: blob.size, url: URL.createObjectURL(blob) }); } return results; },
        'ico-converter': async f => { assertImage(f); const bmp = await loadBitmap(f); const sizes = [16, 32, 48]; const dirEntries = sizes.length; const header = [0, 0, 1, 0, dirEntries & 255, dirEntries >> 8]; let images = []; for (const s of sizes) { const c = newCanvas(s, s); c.getContext('2d').drawImage(bmp, 0, 0, s, s); const blob = await canvasToBlob(c, 'image/png'); const buf = new Uint8Array(await blob.arrayBuffer()); images.push({ size: s, png: buf }); } const out = []; const base = [].concat(header); let offset = 6 + dirEntries * 16; const pngs = []; for (const im of images) { base.push(im.size, im.size, 0, 0, 1, 32, im.png.length & 255, (im.png.length >> 8) & 255, (im.png.length >> 16) & 255, (im.png.length >> 24) & 255, offset & 255, (offset >> 8) & 255, (offset >> 16) & 255, (offset >> 24) & 255); pngs.push(im.png); offset += im.png.length; } let all = new Uint8Array(offset); let p = 0; for (const v of base) all[p++] = v; for (const png of pngs) { all.set(png, p); p += png.length; } return { blob: new Blob([all], { type: 'image/x-icon' }), ext: 'ico' }; },
        'favicon-generator': async f => { assertImage(f); const bmp = await loadBitmap(f); const c = newCanvas(64, 64); c.getContext('2d').drawImage(bmp, 0, 0, 64, 64); const blob = await canvasToBlob(c, 'image/png', 1); return { blob, ext: 'png' }; },
        'svg-optimizer': t => { const s = (Array.isArray(t) ? t.join('') : t) || ''; const out = s.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim(); return { text: out, type: 'image/svg+xml', ext: 'svg' }; },
        'image-compare': async files => { if (!files || files.length < 2) throw new Error('Invalid Input: need 2 images.'); const [a, b] = await Promise.all(files.map(loadBitmap)); const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height); const ca = newCanvas(w, h); ca.getContext('2d').drawImage(a, 0, 0, w, h); const da = ca.getContext('2d').getImageData(0, 0, w, h).data; const cb = newCanvas(w, h); cb.getContext('2d').drawImage(b, 0, 0, w, h); const db = cb.getContext('2d').getImageData(0, 0, w, h).data; let diff = 0; for (let i = 0; i < da.length; i += 4) { if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 30) diff++; } return { text: (diff / (w * h) * 100).toFixed(2) + '% of pixels differ', type: 'text/plain', ext: 'txt' }; },
        'batch-rename-images': (t, o) => { const s = (Array.isArray(t) ? t.join('\n') : t) || ''; const pat = (o && o.pattern) || 'img_{n}'; const names = s.split(/\n+/).filter(Boolean).map((nm, i) => pat.replace('{n}', i + 1).replace('{name}', nm.replace(/\.[^.]+$/, '')) + (nm.match(/\.[^.]+$/) || '')); return { text: names.join('\n'), type: 'text/plain', ext: 'txt' }; },
        'duplicate-image-finder': async files => { if (!files || files.length < 2) throw new Error('Invalid Input: need 2+ images.'); const ha = await Promise.all(files.map(async f => { const buf = new Uint8Array(await f.arrayBuffer()); let h = 0x811c9dc5; for (let i = 0; i < buf.length; i += 997) { h ^= buf[i]; h = Math.imul(h, 0x01000193); } return (h >>> 0); })); const seen = {}; const dups = []; files.forEach((f, i) => { if (seen[ha[i]] != null) dups.push(f.name + ' == ' + files[seen[ha[i]]].name); else seen[ha[i]] = i; }); return { text: dups.length ? dups.join('\n') : 'No duplicates found.', type: 'text/plain', ext: 'txt' }; }
    };

    window.ZyncBatchImageFx = { H,
        getModule(toolId) {
            const fn = H[toolId]; if (!fn) return null;
            return {
                type: ['image-metadata-viewer', 'image-histogram', 'image-compare', 'svg-optimizer', 'base64-image-encoder', 'batch-rename-images', 'duplicate-image-finder'].includes(toolId) ? 'text' : 'file',
                outputType: 'blob',
                process: async (files, options) => {
                    if (Array.isArray(fn) && (toolId === 'image-splitter' || toolId === 'favicon-generator' || toolId.startsWith('image'))) { /* handled below */ }
                    if (['svg-optimizer', 'batch-rename-images'].includes(toolId)) {
                        const text = Array.isArray(files) ? files.join('\n') : (files || '');
                        const r = await fn(text, options || {}); const b = new Blob([r.text], { type: r.type || 'text/plain' }); return [{ name: toolId + '-out.' + (r.ext || 'txt'), blob: b, type: b.type, size: b.size, url: URL.createObjectURL(b) }];
                    }
                    if (!files || !files.length) throw new Error('Invalid Input: add a file.');
                    const r = await fn(files, options || {});
                    if (Array.isArray(r)) return r;
                    if (r.text != null) { const b = new Blob([r.text], { type: r.type || 'text/plain' }); return [{ name: toolId + '-out.' + (r.ext || 'txt'), blob: b, type: b.type, size: b.size, url: URL.createObjectURL(b) }]; }
                    return [{ name: stem(files[0]) + '-' + toolId + '.' + r.ext, blob: r.blob, type: r.blob.type, size: r.blob.size, url: URL.createObjectURL(r.blob) }];
                }
            };
        }
    };
})();
