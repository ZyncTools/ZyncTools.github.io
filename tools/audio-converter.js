(function () {
    'use strict';

    const MIME_MAP = {
        'audio/mpeg': 'mp3',
        'audio/mp3': 'mp3',
        'audio/wav': 'wav',
        'audio/wave': 'wav',
        'audio/x-wav': 'wav',
        'audio/ogg': 'ogg',
        'audio/vorbis': 'ogg',
        'audio/flac': 'flac',
        'audio/aac': 'aac',
        'audio/mp4': 'm4a',
        'audio/x-m4a': 'm4a'
    };

    function getFormat(file) {
        const mime = (file.type || '').toLowerCase();
        if (MIME_MAP[mime]) return MIME_MAP[mime];
        const ext = file.name.split('.').pop().toLowerCase();
        if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) return ext;
        return 'bin';
    }

    function buildOptions() {
        const container = $('#tool-options');
        if (!container) return;
        container.innerHTML = `
            <div class="zync-option-group">
                <label for="target-format">Target Format</label>
                <select id="target-format">
                    <option value="mp3">MP3</option>
                    <option value="wav">WAV</option>
                    <option value="ogg">OGG Vorbis</option>
                    <option value="flac">FLAC</option>
                    <option value="aac">AAC</option>
                </select>
            </div>
            <div class="zync-option-group">
                <label for="bitrate">Bitrate (kbps)</label>
                <select id="bitrate">
                    <option value="64">64 kbps</option>
                    <option value="128" selected>128 kbps</option>
                    <option value="192">192 kbps</option>
                    <option value="256">256 kbps</option>
                    <option value="320">320 kbps</option>
                </select>
            </div>
            <div class="zync-option-group">
                <label>
                    <input type="checkbox" id="normalize" /> Normalize volume
                </label>
            </div>
            <p style="font-size:0.85rem;color:var(--zync-muted);margin-top:0.5rem;">
                Note: Browser-native re-encoding is simulated here. For real transcoding, connect a WASM backend or use FFmpeg.wasm.
            </p>
        `;
    }

    async function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    }

    async function process(files, ctx) {
        if (!files.length) throw new Error('No files provided.');

        const targetFormat = $('#target-format')?.value || 'mp3';
        const bitrate = $('#bitrate')?.value || '128';
        const normalize = $('#normalize')?.checked || false;

        ctx.setStatus('Preparing audio...', 'info');
        ctx.setProgress(10);

        const results = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            ctx.setStatus(`Processing ${i + 1} of ${files.length}...`, 'info');
            ctx.setProgress(10 + ((i / files.length) * 80));

            const arrayBuffer = await readFileAsArrayBuffer(file);
            const ext = targetFormat === 'mp3' ? 'mp3' : targetFormat;
            const mimeMap = {
                mp3: 'audio/mpeg',
                wav: 'audio/wav',
                ogg: 'audio/ogg',
                flac: 'audio/flac',
                aac: 'audio/aac'
            };
            const mime = mimeMap[ext] || 'application/octet-stream';
            const outName = file.name.replace(/\.[^.]+$/, '') + '.' + ext;

            const blob = new Blob([arrayBuffer], { type: mime });
            const url = URL.createObjectURL(blob);

            results.push({
                name: outName,
                blob,
                type: mime,
                size: blob.size,
                url
            });
        }

        ctx.setProgress(100);
        ctx.setStatus('Done', 'info');

        if (results.length > 1) {
            const zip = await loadJsZip();
            const zipFile = await zip.file('audio.zip', async () => {
                const entries = await Promise.all(results.map(async r => {
                    const resp = await fetch(r.url);
                    const buf = await resp.arrayBuffer();
                    return [r.name, new Uint8Array(buf)];
                }));
                return Object.fromEntries(entries);
            });
            const blob = await zipFile.generateAsync({ type: 'blob' });
            results.unshift({
                name: 'audio-converted.zip',
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
