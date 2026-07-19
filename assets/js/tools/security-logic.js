/**
 * ZyncTools — Batch Logic: SECURITY tools
 * ========================================
 * • EXIF viewer / remover (JPEG via lightweight binary parse)
 * • Password strength checker (zxcvbn-lite heuristics)
 * • File hash (FNV-1a + optional Web Crypto SHA-256)
 * • Text encrypt/decrypt (XOR + base64, privacy-first, client-side)
 * • Base64 encode/decode
 * Each process(input, options) -> Promise<[{name,blob,...}]>
 */
(function () {
    'use strict';

    function hashText(text) { let h = 0x811c9dc5; text = text || ''; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); }
    async function sha256Hex(text) { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); }

    function passwordStrength(pw) {
        pw = pw || '';
        let score = 0; const tips = [];
        if (pw.length >= 8) score++; else tips.push('use at least 8 characters');
        if (pw.length >= 12) score++;
        if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++; else tips.push('mix upper & lower case');
        if (/\d/.test(pw)) score++; else tips.push('add numbers');
        if (/[^A-Za-z0-9]/.test(pw)) score++; else tips.push('add symbols');
        if (/(.)\1\1/.test(pw)) { score--; tips.push('avoid repeated characters'); }
        const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        return { score: Math.max(0, score), label: labels[Math.min(4, Math.max(0, score))], tips };
    }
    function fileHash(file) {
        return new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = async () => {
                try {
                    const buf = r.result; const bytes = new Uint8Array(buf);
                    let fnv = 0x811c9dc5; for (let i = 0; i < bytes.length; i++) { fnv ^= bytes[i]; fnv = Math.imul(fnv, 0x01000193); }
                    const sha = await sha256Hex(String.fromCharCode.apply(null, bytes.subarray(0, Math.min(bytes.length, 1e6))));
                    res({ text: `FNV-1a: ${(fnv >>> 0).toString(16)}\nSHA-256 (sample): ${sha}`, type: 'text/plain' });
                } catch (e) { rej(new Error('Conversion Failed: hashing error.')); }
            };
            r.onerror = () => rej(new Error('Invalid File.'));
            r.readAsArrayBuffer(file);
        });
    }
    function exifViewer(file) {
        return new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => {
                const dv = new DataView(r.result); let off = 2; const tags = {};
                try {
                    if (dv.getUint16(0) !== 0xFFD8) throw new Error('Not a JPEG.');
                    while (off < dv.byteLength) {
                        if (dv.getUint16(off) === 0xFFE1) {
                            const start = off + 4; const end = off + dv.getUint16(off + 2);
                            let p = start;
                            if (dv.getUint16(p) === 0x4D4D || dv.getUint16(p) === 0x4949) {
                                const num = dv.getUint16(p + 2 + 2); p += 2;
                                for (let i = 0; i < num; i++) {
                                    const tag = dv.getUint16(p + 12 * i + 2); const val = dv.getUint16(p + 12 * i + 8); const map = { 0x010F: 'Make', 0x0110: 'Model', 0x0112: 'Orientation', 0x8769: 'ExifOffset', 0x8827: 'ISO', 0x9003: 'DateTimeOriginal', 0x829A: 'ExposureTime', 0x829D: 'FNumber' };
                                    if (map[tag]) tags[map[tag]] = val;
                                }
                            }
                            break;
                        }
                        off += 2;
                    }
                } catch (e) { /* ignore, return empty */ }
                res({ text: JSON.stringify(tags, null, 2) || '{}', type: 'text/plain' });
            };
            r.onerror = () => rej(new Error('Invalid File.'));
            r.readAsArrayBuffer(file);
        });
    }
    function exifRemover(file) {
        return new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => {
                const buf = new Uint8Array(r.result); let out = [], i = 0;
                while (i < buf.length) {
                    if (buf[i] === 0xFF && buf[i + 1] === 0xE1) { const len = (buf[i + 2] << 8) + buf[i + 3]; i += 2 + len; continue; }
                    out.push(buf[i]); i++;
                }
                res({ blob: new Blob([new Uint8Array(out)], { type: 'image/jpeg' }), ext: 'jpg' });
            };
            r.onerror = () => rej(new Error('Invalid File.'));
            r.readAsArrayBuffer(file);
        });
    }
    function xorCrypt(text, key) {
        if (!key) throw new Error('Invalid Input: provide a password/key.');
        let o = ''; for (let i = 0; i < text.length; i++) o += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        return o;
    }
    function encryptText(text, key) { return btoa(unescape(encodeURIComponent(xorCrypt(text, key)))); }
    function decryptText(text, key) { try { return xorCrypt(decodeURIComponent(escape(atob(text.trim()))), key); } catch (e) { throw new Error('Decryption Failed: wrong key or corrupted data.'); } }
    function base64(text, op) { try { return op === 'decode' ? decodeURIComponent(escape(atob(text.trim()))) : btoa(unescape(encodeURIComponent(text))); } catch (e) { throw new Error('Invalid Base64 input.'); } }

    const H = {
        'exif-viewer': f => exifViewer(f),
        'exif-remover': f => exifRemover(f),
        'password-strength-checker': (t, o) => ({ text: JSON.stringify(passwordStrength(o && o.password || t), null, 2), type: 'text/plain' }),
        'file-hash-generator': f => fileHash(f),
        'text-encryptor': (t, o) => ({ text: encryptText(t, o && o.key), type: 'text/plain' }),
        'text-decryptor': (t, o) => ({ text: decryptText(t, o && o.key), type: 'text/plain' }),
        'base64-encoder': t => ({ text: base64(t, 'encode'), type: 'text/plain' }),
        'secure-note-encryptor': (t, o) => ({ text: encryptText(t, o && o.key), type: 'text/plain' })
    };

    window.ZyncBatchSecurity = { H,
        getModule(toolId) {
            const fn = H[toolId];
            if (!fn) return null;
            return {
                type: toolId === 'exif-remover' || toolId === 'file-hash-generator' ? 'file' : 'text',
                outputType: 'blob',
                process: async (files, options) => {
                    const opts = options || {};
                    if (toolId === 'exif-remover' || toolId === 'file-hash-generator') {
                        if (!files || !files.length) throw new Error('Invalid Input: add a file.');
                        const r = await fn(files[0], opts);
                        if (r.blob) return [{ name: files[0].name.replace(/\.[^.]+$/, '') + '-clean.' + r.ext, blob: r.blob, type: r.blob.type, size: r.blob.size, url: URL.createObjectURL(r.blob) }];
                    }
                    const text = Array.isArray(files) ? files.join('\n') : (files || '');
                    const r = await fn(text, opts);
                    const b = new Blob([r.text], { type: r.type || 'text/plain' });
                    return [{ name: toolId + '-output.txt', blob: b, type: b.type, size: b.size, url: URL.createObjectURL(b) }];
                }
            };
        }
    };
})();
