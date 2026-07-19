/**
 * ZyncTools — Advanced Logic Module
 * Complex client-side logic for AI, AV, and data tools.
 */

window.ZyncAdvancedLogic = (function () {
    'use strict';

    /* ============================
       AI IMAGE TOOLS
       ============================ */

    async function removeBackground(file) {
        const module = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/dist/index.umd.js');
        const blob = await module.removeBackground(file, {
            model: 'medium',
            output: {
                format: 'image/png',
                quality: 0.9
            },
            progress: (key, current, total) => {
                const pct = Math.round((current / total) * 100);
                if (window.ZyncApp && window.ZyncApp.setProgress) window.ZyncApp.setProgress(pct);
            }
        });
        return URL.createObjectURL(blob);
    }

    async function extractColorPalette(file) {
        const ColorThief = window.ColorThief;
        if (!ColorThief) throw new Error('ColorThief not loaded');
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
        });
        const ct = new ColorThief();
        const palette = ct.getPalette(img, 5);
        URL.revokeObjectURL(url);
        return palette.map(c => `RGB(${c[0]}, ${c[1]}, ${c[2]})`).join('\n');
    }

    function imageToAscii(file, cols = 80) {
        return new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = cols;
                canvas.height = Math.round(cols * (img.height / img.width) * 0.5);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                const chars = ' .:-=+*#%@';
                let ascii = '';
                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        const i = (y * canvas.width + x) * 4;
                        const brightness = (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
                        const charIndex = Math.floor((brightness / 255) * (chars.length - 1));
                        ascii += chars[charIndex];
                    }
                    ascii += '\n';
                }
                URL.revokeObjectURL(url);
                resolve(ascii);
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
            img.src = url;
        });
    }

    /* ============================
       AUDIO / VIDEO
       ============================ */

    async function extractAudioFromVideo(file) {
        const ffmpeg = await loadFFmpeg();
        await ffmpeg.writeFile('input', await file.arrayBuffer());
        await ffmpeg.exec(['-i', 'input', '-vn', '-acodec', 'libmp3lame', '-q:a', '2', 'output.mp3']);
        const data = await ffmpeg.readFile('output.mp3');
        return new Blob([data.buffer], { type: 'audio/mpeg' });
    }

    async function videoToGif(file) {
        const ffmpeg = await loadFFmpeg();
        await ffmpeg.writeFile('input', await file.arrayBuffer());
        await ffmpeg.exec(['-i', 'input', '-vf', 'fps=10,scale=480:-1:flags=lanczos', '-c:v', 'gif', 'output.gif']);
        const data = await ffmpeg.readFile('output.gif');
        return new Blob([data.buffer], { type: 'image/gif' });
    }

    async function silenceTrimmer(file) {
        const ffmpeg = await loadFFmpeg();
        await ffmpeg.writeFile('input', await file.arrayBuffer());
        await ffmpeg.exec(['-i', 'input', '-af', 'silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-50dB', 'output.mp3']);
        const data = await ffmpeg.readFile('output.mp3');
        return new Blob([data.buffer], { type: 'audio/mpeg' });
    }

    async function loadFFmpeg() {
        if (window.ZyncFFmpeg) return window.ZyncFFmpeg;
        const { FFmpeg } = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js');
        const { fetchFile } = await import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js');
        const ffmpeg = new FFmpeg();
        await ffmpeg.load({
            coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
            wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm'
        });
        window.ZyncFFmpeg = ffmpeg;
        return ffmpeg;
    }

    /* ============================
       DATA / VISUALIZATION
       ============================ */

    function csvToJson(csvText) {
        const lines = csvText.trim().split('\n');
        if (!lines.length) return [];
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const obj = {};
            headers.forEach((h, i) => { obj[h] = values[i] || ''; });
            return obj;
        });
    }

    function jsonToCsv(jsonText) {
        const data = JSON.parse(jsonText);
        if (!Array.isArray(data) || !data.length) return '';
        const headers = Object.keys(data[0]);
        const rows = [headers.join(',')];
        data.forEach(item => {
            rows.push(headers.map(h => JSON.stringify(item[h] || '')).join(','));
        });
        return rows.join('\n');
    }

    async function generateChart(data, type = 'bar') {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');

        if (window.Chart) {
            new Chart(ctx, {
                type,
                data: JSON.parse(data),
                options: {
                    responsive: false,
                    plugins: {
                        legend: { labels: { color: '#EDEDED' } }
                    },
                    scales: {
                        x: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        y: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                    }
                }
            });
        } else {
            ctx.fillStyle = '#13151A';
            ctx.fillRect(0, 0, 800, 600);
            ctx.fillStyle = '#EDEDED';
            ctx.font = '20px Inter';
            ctx.fillText('Chart.js loading...', 20, 40);
        }

        return new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
        });
    }

    /* ============================
       PRIVACY / SECURITY
       ============================ */

    async function hashFile(file, algorithm = 'SHA-256') {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function estimatePasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        const entropy = password.length * (score > 4 ? 4.5 : score > 2 ? 3.5 : 2.5);
        const crackTime = Math.pow(2, -entropy) > 0 ? 'Instant' : '> 1000 years';
        return { score: Math.min(score, 5), entropy, crackTime };
    }

    function encryptAES(text, password) {
        const key = CryptoJS.PBKDF2(password, CryptoJS.enc.Utf8.parse('ZyncToolsSalt'), { keySize: 256 / 32, iterations: 1000 });
        const encrypted = CryptoJS.AES.encrypt(text, key, { mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
        return encrypted.toString();
    }

    function decryptAES(ciphertext, password) {
        const key = CryptoJS.PBKDF2(password, CryptoJS.enc.Utf8.parse('ZyncToolsSalt'), { keySize: 256 / 32, iterations: 1000 });
        const decrypted = CryptoJS.AES.decrypt(ciphertext, key, { mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
        return decrypted.toString(CryptoJS.enc.Utf8);
    }

    return {
        removeBackground,
        extractColorPalette,
        imageToAscii,
        extractAudioFromVideo,
        videoToGif,
        silenceTrimmer,
        loadFFmpeg,
        csvToJson,
        jsonToCsv,
        generateChart,
        hashFile,
        estimatePasswordStrength,
        encryptAES,
        decryptAES
    };
})();
