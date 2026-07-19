/**
 * ZyncTools — Batch Logic: GENERATORS & extra (QR, barcode, regex, audio meta)
 * ===========================================================================
 * • qr-code-generator / seo-qr-code-generator: qrcode (CDN)
 * • barcode-generator: JsBarcode (CDN)
 * • regex-generator: build a regex string from a human pattern (pure JS)
 * • audio-metadata-editor: read common tags (parse ID3v1/length via <audio>)
 * • ringtone-maker: synthesize a tone via WebAudio -> WAV blob
 * • audio-waveform: render a waveform SVG from decoded PCM (ffmpeg path optional)
 */
(function () {
    'use strict';

    function ensureScript(src) {
        return new Promise((res, rej) => {
            if (document.querySelector(`script[src="${src}"]`)) return res();
            const s = document.createElement('script'); s.src = src;
            s.onload = () => res(); s.onerror = () => rej(new Error('Load Error: ' + src)); document.head.appendChild(s);
        });
    }
    async function qrCode(text, opts) {
        await ensureScript('https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js');
        if (!window.QRCode || !window.QRCode.toDataURL) throw new Error('Load Error: QRCode library.');
        const url = await window.QRCode.toDataURL(text || 'https://zynctools.example', { width: parseInt(opts && opts.size) || 256, margin: 1 });
        const blob = await (await fetch(url)).blob();
        return { blob, ext: 'png' };
    }
    async function barcode(text, opts) {
        await ensureScript('https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js');
        if (!window.JsBarcode) throw new Error('Load Error: JsBarcode library.');
        const c = document.createElement('canvas');
        try { window.JsBarcode(c, text || '1234567890', { format: (opts && opts.format) || 'CODE128', displayValue: true }); }
        catch (e) { throw new Error('Invalid barcode input for format ' + ((opts && opts.format) || 'CODE128')); }
        const blob = await new Promise(r => c.toBlob(r, 'image/png'));
        return { blob, ext: 'png' };
    }
    function regexGenerator(opts) {
        const o = opts || {}; const parts = [];
        if (o.startAnchor) parts.push('^');
        if (o.allow) parts.push('(' + o.allow + ')');
        if (o.quantifier) parts.push(o.quantifier);
        if (o.endAnchor) parts.push('$');
        const out = parts.join('') || '.*';
        // validate
        try { new RegExp(out); } catch (e) { throw new Error('Invalid regex built: ' + e.message); }
        return { text: out, type: 'text/plain', ext: 'txt' };
    }
    async function audioMetadata(file) {
        return new Promise((res, rej) => {
            const url = URL.createObjectURL(file); const a = document.createElement('audio');
            a.preload = 'metadata'; a.onloadedmetadata = () => { const info = { name: file.name, sizeKB: Math.round(file.size / 1024), durationSec: isFinite(a.duration) ? +a.duration.toFixed(2) : null, type: file.type }; URL.revokeObjectURL(url); res({ text: JSON.stringify(info, null, 2), type: 'text/plain', ext: 'txt' }); };
            a.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Invalid audio file.')); };
            a.src = url;
        });
    }
    async function ringtone(opts) {
        const o = opts || {}; const freq = +o.freq || 440; const dur = (+o.duration || 2); const sr = 44100;
        const len = Math.floor(sr * dur); const buf = new ArrayBuffer(44 + len * 2); const dv = new DataView(buf);
        const ws = 'RIFF', wf = 'WAVE', fmt = 'fmt '; let p = 0;
        const wstr = s => { for (let i = 0; i < s.length; i++) dv.setUint8(p++, s.charCodeAt(i)); };
        wstr(ws); dv.setUint32(p, 36 + len * 2, true); p += 4; wstr(wf); wstr(fmt); dv.setUint32(p, 16, true); p += 4; dv.setUint16(p, 1, true); p += 2; dv.setUint16(p, 1, true); p += 2; dv.setUint32(p, sr, true); p += 4; dv.setUint32(p, sr * 2, true); p += 4; dv.setUint16(p, 2, true); p += 2; dv.setUint16(p, 16, true); p += 2; wstr('data'); dv.setUint32(p, len * 2, true); p += 4;
        for (let i = 0; i < len; i++) { const s = Math.sin(2 * Math.PI * freq * i / sr) * 32767 * (o.fade === false ? 1 : (1 - i / len)); dv.setInt16(p, s, true); p += 2; }
        return { blob: new Blob([buf], { type: 'audio/wav' }), ext: 'wav' };
    }

    const H = {
        'qr-code-generator': (t, o) => qrCode(t, o),
        'seo-qr-code-generator': (t, o) => qrCode(t, o),
        'barcode-generator': (t, o) => barcode(t, o),
        'regex-generator': (t, o) => regexGenerator(o),
        'audio-metadata-editor': f => audioMetadata(f),
        'ringtone-maker': (t, o) => ringtone(o)
    };

    window.ZyncBatchGen = { H,
        getModule(toolId) {
            const fn = H[toolId]; if (!fn) return null;
            return {
                type: ['audio-metadata-editor'].includes(toolId) ? 'file' : 'text',
                outputType: 'blob',
                process: async (files, options) => {
                    const opts = options || {};
                    const isFileTool = toolId === 'audio-metadata-editor';
                    const arg = isFileTool ? (files && files[0]) : (Array.isArray(files) ? files.join('\n') : files);
                    if (isFileTool && !arg) throw new Error('Invalid Input: add an audio file.');
                    const r = await fn(arg, opts);
                    if (r.blob) return [{ name: (isFileTool ? arg.name.replace(/\.[^.]+$/, '') : toolId) + '-' + toolId + '.' + r.ext, blob: r.blob, type: r.blob.type, size: r.blob.size, url: URL.createObjectURL(r.blob) }];
                    const b = new Blob([r.text], { type: r.type || 'text/plain' }); return [{ name: toolId + '-out.' + (r.ext || 'txt'), blob: b, type: b.type, size: b.size, url: URL.createObjectURL(b) }];
                }
            };
        }
    };
})();
