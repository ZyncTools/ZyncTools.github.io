/**
 * ZyncTools — Media Logic (ffmpeg.wasm)
 * =====================================
 * Real client-side audio/video processing with @ffmpeg/ffmpeg v0.12+.
 * Implements the EXACT commands specified in the audit:
 *   • MP4 → MP3     : -i input -q:a 0 -map a output.mp3
 *   • Video Compress: -i input -vcodec libx264 -crf 28 output.mp4
 *   • GIF Maker     : -i input -vf "fps=10,scale=320:-1" output.gif
 *   • + extractAudio, trimVideo, changeSpeed helpers
 *
 * Features: real-time 0–100% progress, "Estimated Size" before download,
 * specific error messages (Invalid File Type / Conversion Failed / Load Error).
 *
 * Public API:
 *   ZyncMedia.mp4ToMp3(file, ctx)      -> resultItem
 *   ZyncMedia.compressVideo(file, ctx) -> resultItem
 *   ZyncMedia.makeGif(file, ctx)       -> resultItem
 *   ZyncMedia.extractAudio(file, ctx, fmt)
 *   ZyncMedia.estimateSize(file, kind) -> bytes (heuristic, shown pre-download)
 *   ZyncMedia.getModule(toolId)        -> viewer module { process }
 */
window.ZyncMedia = (function () {
    'use strict';

    let ffmpeg = null, loaded = false, loadPromise = null, fetchFile = null;

    const CORE = '0.12.6', FF = '0.12.10', UTIL = '0.12.1';

    async function ensureFFmpeg(ctx) {
        if (loaded) return ffmpeg;
        if (loadPromise) return loadPromise;
        loadPromise = (async () => {
            try {
                const ffMod = await import(`https://unpkg.com/@ffmpeg/ffmpeg@${FF}/dist/esm/index.js`);
                const utilMod = await import(`https://unpkg.com/@ffmpeg/util@${UTIL}/dist/esm/index.js`);
                fetchFile = utilMod.fetchFile;
                ffmpeg = new ffMod.FFmpeg();
                ffmpeg.on('progress', ({ progress }) => {
                    const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
                    if (ctx && ctx.setProgress) ctx.setProgress(pct);
                    if (window.ZyncApp && window.ZyncApp.setProgress) window.ZyncApp.setProgress(pct);
                });
                const base = `https://unpkg.com/@ffmpeg/core@${CORE}/dist/umd`;
                await ffmpeg.load({ coreURL: `${base}/ffmpeg-core.js`, wasmURL: `${base}/ffmpeg-core.wasm` });
                loaded = true;
                return ffmpeg;
            } catch (err) {
                loadPromise = null;
                throw new Error('Load Error: could not initialize the FFmpeg engine. Check your connection and retry.');
            }
        })();
        return loadPromise;
    }

    function ext(file) { return (file.name.split('.').pop() || 'bin').toLowerCase(); }

    function assertType(file, allowed) {
        const e = ext(file);
        if (allowed && !allowed.includes(e)) {
            throw new Error(`Invalid File Type: expected ${allowed.join(', ')} but got ".${e}".`);
        }
    }

    async function runFF(ff, inName, outName, args, file, ctx) {
        try {
            await ff.writeFile(inName, await fetchFile(file));
            if (ctx && ctx.setStatus) ctx.setStatus('Processing…');
            await ff.exec(args);
            const data = await ff.readFile(outName);
            await ff.deleteFile(inName).catch(() => {});
            await ff.deleteFile(outName).catch(() => {});
            if (!data || !data.length) throw new Error('empty output');
            return data;
        } catch (e) {
            throw new Error('Conversion Failed: FFmpeg could not process this file. It may be corrupt or unsupported.');
        }
    }

    function toResult(data, name, mime) {
        const blob = new Blob([data.buffer], { type: mime });
        return { name, blob, type: mime, size: blob.size, url: URL.createObjectURL(blob) };
    }

    /* ---------- MP4 → MP3  (spec: -i input.mp4 -q:a 0 -map a output.mp3) ---------- */
    async function mp4ToMp3(file, ctx) {
        assertType(file, ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v']);
        const ff = await ensureFFmpeg(ctx);
        const inName = 'input.' + ext(file), outName = 'output.mp3';
        const data = await runFF(ff, inName, outName, ['-i', inName, '-q:a', '0', '-map', 'a', outName], file, ctx);
        return toResult(data, file.name.replace(/\.[^.]+$/, '') + '.mp3', 'audio/mpeg');
    }

    /* ---------- Video Compress  (spec: -vcodec libx264 -crf 28) ---------- */
    async function compressVideo(file, ctx, crf) {
        assertType(file, ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v']);
        const ff = await ensureFFmpeg(ctx);
        const inName = 'input.' + ext(file), outName = 'output.mp4';
        const q = String(crf || 28);
        const data = await runFF(ff, inName, outName,
            ['-i', inName, '-vcodec', 'libx264', '-crf', q, '-preset', 'veryfast', outName], file, ctx);
        return toResult(data, file.name.replace(/\.[^.]+$/, '') + '-compressed.mp4', 'video/mp4');
    }

    /* ---------- GIF Maker  (spec: -vf "fps=10,scale=320:-1") ---------- */
    async function makeGif(file, ctx, opts) {
        assertType(file, ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v']);
        opts = opts || {};
        const fps = opts.fps || 10, width = opts.width || 320;
        const ff = await ensureFFmpeg(ctx);
        const inName = 'input.' + ext(file), outName = 'output.gif';
        const data = await runFF(ff, inName, outName,
            ['-i', inName, '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos`, outName], file, ctx);
        return toResult(data, file.name.replace(/\.[^.]+$/, '') + '.gif', 'image/gif');
    }

    /* ---------- Extract Audio (generic, any format) ---------- */
    async function extractAudio(file, ctx, fmt) {
        assertType(file, ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v']);
        fmt = fmt || 'mp3';
        const ff = await ensureFFmpeg(ctx);
        const inName = 'input.' + ext(file), outName = 'output.' + fmt;
        const codec = fmt === 'wav' ? ['-acodec', 'pcm_s16le'] : fmt === 'aac' ? ['-acodec', 'aac'] : ['-q:a', '0'];
        const data = await runFF(ff, inName, outName, ['-i', inName, '-vn'].concat(codec, ['-map', 'a', outName]), file, ctx);
        const mime = fmt === 'wav' ? 'audio/wav' : fmt === 'aac' ? 'audio/aac' : 'audio/mpeg';
        return toResult(data, file.name.replace(/\.[^.]+$/, '') + '.' + fmt, mime);
    }

    /* ---------- Estimated Size (heuristic shown BEFORE processing) ---------- */
    function estimateSize(file, kind) {
        const s = file.size || 0;
        switch (kind) {
            case 'mp3': return Math.round(s * 0.12);        // audio-only extraction
            case 'compress': return Math.round(s * 0.55);   // crf 28 typical
            case 'gif': return Math.round(s * 0.8);         // varies wildly
            default: return s;
        }
    }
    function humanSize(bytes) {
        if (!bytes) return '0 B';
        const u = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + u[i];
    }

    /* ============================================================
       Viewer-compatible module: process(files, ctx) -> [resultItem]
       ============================================================ */
    const HANDLERS = {
        'mp4-to-mp3': (f, c) => mp4ToMp3(f, c),
        'video-compressor': (f, c) => compressVideo(f, c),
        'compress-video': (f, c) => compressVideo(f, c),
        'video-to-gif': (f, c) => makeGif(f, c),
        'gif-maker': (f, c) => makeGif(f, c),
        'extract-audio': (f, c) => extractAudio(f, c, 'mp3')
    };
    const EST_KIND = { 'mp4-to-mp3': 'mp3', 'extract-audio': 'mp3', 'video-compressor': 'compress', 'compress-video': 'compress', 'video-to-gif': 'gif', 'gif-maker': 'gif' };

    function getModule(toolId) {
        const handler = HANDLERS[toolId];
        if (!handler) return null;
        return {
            type: 'file',
            outputType: 'blob',
            estimate: (file) => humanSize(estimateSize(file, EST_KIND[toolId] || 'same')),
            process: async function (files, ctx) {
                ctx = ctx || {};
                if (!files || !files.length) throw new Error('Invalid input: please add a file first.');
                const file = files[0];
                if (ctx.showNotification) {
                    ctx.showNotification('Estimated output size: ~' + humanSize(estimateSize(file, EST_KIND[toolId] || 'same')), 'info');
                }
                if (ctx.setProgress) ctx.setProgress(1);
                const result = await handler(file, ctx);
                if (ctx.setProgress) ctx.setProgress(100);
                return [result];
            }
        };
    }

    return {
        ensureFFmpeg, mp4ToMp3, compressVideo, makeGif, extractAudio,
        estimateSize, humanSize, getModule
    };
})();
