(function () {
    'use strict';

    const acceptedExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const acceptedMimes = ['image/jpeg', 'image/png', 'image/webp'];

    function getAcceptHint() {
        return acceptedExts.join(',');
    }

    function isAccepted(file) {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        return acceptedExts.includes(ext) || acceptedMimes.includes((file.type || '').toLowerCase());
    }

    function buildOptions() {
        const container = $('#tool-options');
        if (!container) return;
        container.innerHTML = `
            <div class="zync-option-group">
                <label for="quality">Quality (${Math.round((parseFloat(document.getElementById('quality')?.value || '0.7') || 0.7) * 100)}%)</label>
                <input id="quality" type="range" min="0.1" max="1" step="0.05" value="0.7" />
            </div>
            <div class="zync-option-group">
                <label for="max-width">Max Width (px, 0 = original)</label>
                <input id="max-width" type="number" min="0" step="1" value="0" placeholder="e.g. 1920" />
            </div>
            <div class="zync-option-group">
                <label for="max-height">Max Height (px, 0 = original)</label>
                <input id="max-height" type="number" min="0" step="1" value="0" placeholder="e.g. 1080" />
            </div>
        `;

        const qualityInput = $('#quality');
        if (qualityInput) {
            qualityInput.addEventListener('input', () => {
                const label = qualityInput.previousElementSibling || qualityInput.closest('.zync-option-group')?.querySelector('label');
                if (label && label.tagName === 'LABEL') {
                    label.textContent = 'Quality (' + Math.round(parseFloat(qualityInput.value) * 100) + '%)';
                }
            });
        }
    }

    function loadCompressor() {
        return new Promise((resolve, reject) => {
            if (window.Compressor) return resolve(window.Compressor);
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/compressorjs@1.2.1/dist/compressor.min.js';
            script.onload = () => resolve(window.Compressor);
            script.onerror = () => reject(new Error('Failed to load Compressor.js'));
            document.head.appendChild(script);
        });
    }

    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    async function processImage(file, options, onProgress) {
        const quality = parseFloat(options.quality || '0.7');
        const maxWidth = parseInt(options.maxWidth || '0', 10) || 0;
        const maxHeight = parseInt(options.maxHeight || '0', 10) || 0;

        const dataUrl = await readFile(file);
        const image = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = dataUrl;
        });

        let width = image.naturalWidth;
        let height = image.naturalHeight;

        if (maxWidth > 0 && width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
        }
        if (maxHeight > 0 && height > maxHeight) {
            width = Math.round(width * (maxHeight / height));
            height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))), 'image/jpeg', quality);
        });

        const ext = file.name.split('.').pop().toLowerCase();
        let mime = 'image/jpeg';
        let outName = file.name.replace(/\.[^.]+$/, '') + '.jpg';

        if (ext === 'png') {
            mime = 'image/png';
            outName = file.name.replace(/\.[^.]+$/, '') + '.png';
        } else if (ext === 'webp') {
            mime = 'image/webp';
            outName = file.name.replace(/\.[^.]+$/, '') + '.webp';
        }

        if (mime !== 'image/jpeg') {
            const reconverted = await new Promise((resolve, reject) => {
                canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Reconvert failed'))), mime, quality);
            });
            return { name: outName, blob: reconverted, type: mime, size: reconverted.size, url: URL.createObjectURL(reconverted) };
        }

        return { name: outName, blob, type: mime, size: blob.size, url: URL.createObjectURL(blob) };
    }

    async function process(files, ctx) {
        if (!files.length) throw new Error('No files provided.');

        const qualityInput = $('#quality');
        const maxWidthInput = $('#max-width');
        const maxHeightInput = $('#max-height');

        const options = {
            quality: qualityInput ? qualityInput.value : '0.7',
            maxWidth: maxWidthInput ? maxWidthInput.value : '0',
            maxHeight: maxHeightInput ? maxHeightInput.value : '0'
        };

        ctx.setStatus('Compressing images...', 'info');
        ctx.setProgress(5);

        const results = [];
        const total = files.length;

        for (let i = 0; i < total; i++) {
            const file = files[i];
            ctx.setStatus(`Processing ${i + 1} of ${total}...`, 'info');
            ctx.setProgress(5 + ((i / total) * 90));

            try {
                const result = await processImage(file, options, ctx.setProgress);
                results.push(result);
            } catch (err) {
                console.error('Image compression failed for', file.name, err);
            }
        }

        ctx.setProgress(100);
        ctx.setStatus('Done', 'info');

        if (!results.length) throw new Error('No images could be processed.');

        if (results.length > 1) {
            const zip = await loadJsZip();
            const zipFile = await zip.file('images.zip', async () => {
                const chunks = await Promise.all(results.map(async r => {
                    const resp = await fetch(r.url);
                    const buf = await resp.arrayBuffer();
                    return [r.name, new Uint8Array(buf)];
                }));
                return Object.fromEntries(chunks);
            });
            const blob = await zipFile.generateAsync({ type: 'blob' });
            results.unshift({
                name: 'compressed-images.zip',
                type: 'application/zip',
                size: blob.size,
                url: URL.createObjectURL(blob),
                blob
            });
        }

        return results;
    }

    async function loadJsZip() {
        if (window.JSZip) return window.JSZip;
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
            script.onload = () => resolve(window.JSZip);
            script.onerror = () => reject(new Error('Failed to load JSZip'));
            document.head.appendChild(script);
        });
    }

    function init() {
        buildOptions();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.ZyncTool = { process, init };
})();
