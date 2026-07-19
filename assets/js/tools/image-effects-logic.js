/**
 * ZyncTools — Batch Logic: IMAGE EFFECTS
 * ======================================
 * Simple canvas-based image effects (vignette, sharpen, emboss, etc.)
 * Each process(file, options) -> Promise<Blob>
 */
(function () {
    'use strict';

    const IMG = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'];
    function assertImage(file) {
        const e = (file.name.split('.').pop() || '').toLowerCase();
        if (!IMG.includes(e) && !/^image\//.test(file.type || '')) throw new Error(`Invalid File Type: "${file.name}".`);
    }
    const stem = f => f.name.replace(/\.[^.]+$/, '');
    function loadBitmap(file) {
        if (window.createImageBitmap) return createImageBitmap(file);
        return new Promise((res, rej) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = () => rej(new Error('Decode failed.'));
            img.src = URL.createObjectURL(file);
        });
    }
    function newCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    function canvasToBlob(c, mime, q) { return new Promise((r, e) => c.toBlob(b => b ? r(b) : e(new Error('Encode failed.')), mime, q)); }
    function getData(c) { return c.getContext('2d').getImageData(0, 0, c.width, c.height); }
    function putData(c, d) { c.getContext('2d').putImageData(d, 0, 0); }
    function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

    // Simple vignette effect
    function vignette(amount = 0.5) {
        return (data, w, h) => {
            const cx = w / 2, cy = h / 2, rad = Math.max(w, h) * 0.5;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const dx = x - cx, dy = y - cy;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    const v = 1 - Math.min(1, Math.max(0, (d - rad / 2) / (rad / 2)) * amount);
                    const i = (y * w + x) * 4;
                    data.data[i] *= v;
                    data.data[i + 1] *= v;
                    data.data[i + 2] *= v;
                }
            }
        };
    }

    // Sharpen kernel
    function sharpen() { return [[0, -1, 0], [-1, 5, -1], [0, -1, 0]]; }

    // Emboss kernel
    function emboss() { return [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]]; }

    // Outline kernel
    function outline() { return [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]]; }

    // Gaussian blur
    function gaussianBlur(radius = 1) {
        const size = Math.ceil(radius * 3) | 1 | 1;
        const kernel = [];
        const sigma = radius || 1;
        const two_sigma2 = 2 * sigma * sigma;
        let sum = 0;
        for (let y = 0; y < size; y++) {
            const row = [];
            for (let x = 0; x < size; x++) {
                const dx = x - Math.floor(size / 2);
                const dy = y - Math.floor(size / 2);
                const w = Math.exp(-(dx * dx + dy * dy) / two_sigma2);
                row.push(w);
                sum += w;
            }
            kernel.push(row);
        }
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                kernel[y][x] /= sum;
            }
        }
        return kernel;
    }

    // Motion blur
    function motionBlur(length = 10, angle = 0) {
        const size = length | 1;
        const kernel = Array.from({ length: size }, () => Array(size).fill(0));
        const cx = Math.floor(size / 2);
        const cy = Math.floor(size / 2);
        const rad = angle * Math.PI / 180;
        for (let i = 0; i < length; i++) {
            const x = Math.round(cx + i * Math.cos(rad));
            const y = Math.round(cy + i * Math.sin(rad));
            if (x >= 0 && x < size && y >= 0 && y < size) {
                kernel[y][x] = 1 / length;
            }
        }
        return kernel;
    }

    // Zoom blur
    function zoomBlur(amount = 0.1) {
        const size = 15;
        const kernel = Array.from({ length: size }, () => Array(size).fill(0));
        const cx = Math.floor(size / 2);
        const cy = Math.floor(size / 2);
        let sum = 0;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - cx;
                const dy = y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const w = Math.max(0, 1 - dist * amount);
                kernel[y][x] = w;
                sum += w;
            }
        }
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                kernel[y][x] /= sum;
            }
        }
        return kernel;
    }

    // Radial blur
    function radialBlur(amount = 0.2) {
        const size = 15;
        const kernel = Array.from({ length: size }, () => Array(size).fill(0));
        const cx = Math.floor(size / 2);
        const cy = Math.floor(size / 2);
        let sum = 0;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - cx;
                const dy = y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const w = Math.max(0, 1 - dist * amount);
                kernel[y][x] = w;
                sum += w;
            }
        }
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                kernel[y][x] /= sum;
            }
        }
        return kernel;
    }

    // Kernel convolution
    function kernelConv(data, w, h, kernel) {
        const kh = kernel.length;
        const kw = kernel[0].length;
        const kh2 = Math.floor(kh / 2);
        const kw2 = Math.floor(kw / 2);
        const src = new Uint8ClampedArray(data.data);
        const dst = new Uint8ClampedArray(data.data);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let r = 0, g = 0, b = 0, a = 0;
                let sum = 0;
                for (let ky = 0; ky < kh; ky++) {
                    for (let kx = 0; kx < kw; kx++) {
                        const yy = y + ky - kh2;
                        const xx = x + kx - kw2;
                        if (xx >= 0 && xx < w && yy >= 0 && yy < h) {
                            const i = (yy * w + xx) * 4;
                            const wgt = kernel[ky][kx];
                            r += src[i] * wgt;
                            g += src[i + 1] * wgt;
                            b += src[i + 2] * wgt;
                            a += src[i + 3] * wgt;
                            sum += wgt;
                        }
                    }
                }
                const f = sum === 0 ? 1 : sum;
                const i = (y * w + x) * 4;
                dst[i] = clamp(r / f);
                dst[i + 1] = clamp(g / f);
                dst[i + 2] = clamp(b / f);
                if (a !== 0) dst[i + 3] = clamp(a / f);
            }
        }
        data.data.set(dst);
    }

    // Effect map
    const FX = {
        'vignette': f => {
            assertImage(f);
            return new Promise((res, rej) => {
                loadBitmap(f)
                    .then(bmp => {
                        const c = newCanvas(bmp.width, bmp.height);
                        const ctx = c.getContext('2d');
                        ctx.drawImage(bmp, 0, 0);
                        const d = getData(c);
                        vignette(0.5)(d, bmp.width, bmp.height);
                        putData(c, d);
                        return canvasToBlob(c, 'image/png', 0.95);
                    })
                    .then(blob => res({ blob, ext: 'png' }))
                    .catch(rej);
            })
                .catch(rej);
        },
        'sharpen': f => {
            assertImage(f);
            return new Promise((res, rej) => {
                loadBitmap(f)
                    .then(bmp => {
                        const c = newCanvas(bmp.width, bmp.height);
                        const ctx = c.getContext('2d');
                        ctx.drawImage(bmp, 0, 0);
                        const d = getData(c);
                        kernelConv(d, bmp.width, bmp.height, sharpen());
                        putData(c, d);
                        return canvasToBlob(c, 'image/png', 0.95);
                    })
                    .then(blob => res({ blob, ext: 'png' }))
                    .catch(rej);
            })
                .catch(rej);
        },
        'emboss': f => {
            assertImage(f);
            return new Promise((res, rej) => {
                loadBitmap(f)
                    .then(bmp => {
                        const c = newCanvas(bmp.width, bmp.height);
                        const ctx = c.getContext('2d');
                        ctx.drawImage(bmp, 0, 0);
                        const d = getData(c);
                        kernelConv(d, bmp.width, bmp.height, emboss());
                        putData(c, d);
                        return canvasToBlob(c, 'image/png', 0.95);
                    })
                    .then(blob => res({ blob, ext: 'png' }))
                    .catch(rej);
            })
                .catch(rej);
        },
        'outline': f => {
            assertImage(f);
            return new Promise((res, rej) => {
                loadBitmap(f)
                    .then(bmp => {
                        const c = newCanvas(bmp.width, bmp.height);
                        const ctx = c.getContext('2d');
                        ctx.drawImage(bmp, 0, 0);
                        const d = getData(c);
                        kernelConv(d, bmp.width, bmp.height, outline());
                        putData(c, d);
                        return canvasToBlob(c, 'image/png', 0.95);
                    })
                    .then(blob => res({ blob, ext: 'png' }))
                    .catch(rej);
            })
                .catch(rej);
        },
        'gaussian-blur': (f, o) => {
            assertImage(f);
            const r = (o && o.radius) || 1;
            return new Promise((res, rej) => {
                loadBitmap(f)
                    .then(bmp => {
                        const c = newCanvas(bmp.width, bmp.height);
                        const ctx = c.getContext('2d');
                        ctx.drawImage(bmp, 0, 0);
                        const d = getData(c);
                        kernelConv(d, bmp.width, bmp.height, gaussianBlur(r));
                        putData(c, d);
                        return canvasToBlob(c, 'image/png', 0.95);
                    })
                    .then(blob => res({ blob, ext: 'png' }))
                    .catch(rej);
            })
                .catch(rej);
        }
    };

    window.ZyncBatchImageFx = {
        FX,
        getModule(toolId) {
            const fn = FX[toolId];
            if (!fn) return null;
            return {
                type: 'file',
                outputType: 'blob',
                process: async (files, options) => {
                    if (!files || !files.length) throw new Error('No image.');
                    const r = await fn(files[0], options || {});
                    if (!r || !r.blob) throw new Error('Effect failed.');
                    return [{ name: stem(files[0]) + '-' + toolId + '.' + r.ext, blob: r.blob, type: r.blob.type, size: r.blob.size, url: URL.createObjectURL(r.blob) }];
                }
            };
        }
    };
})();