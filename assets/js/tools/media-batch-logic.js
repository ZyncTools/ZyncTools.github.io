/**
 * ZyncTools — Batch Logic: AUDIO & VIDEO tools
 * ============================================
 * ffmpeg.wasm powered. Maps the "coming-soon" audio/video IDs to real
 * FFmpeg command builders. Reuses the loader pattern from ZyncMedia.
 * Each process(files, options) -> Promise<[{name,blob,...}]>
 */
(function () {
    'use strict';

    const CORE = '0.12.6', FF = '0.12.10', UTIL = '0.12.1';
    let ff = null, loaded = false, loadPromise = null, fetchFile = null;
    async function ensureFFmpeg() {
        if (loaded) return ff;
        if (loadPromise) return loadPromise;
        loadPromise = (async () => {
            const ffm = await import(`https://unpkg.com/@ffmpeg/ffmpeg@${FF}/dist/esm/index.js`);
            const util = await import(`https://unpkg.com/@ffmpeg/util@${UTIL}/dist/esm/index.js`);
            fetchFile = util.fetchFile;
            ff = new ffm.FFmpeg();
            ff.on('progress', ({ progress }) => { const p = Math.round(progress * 100); if (window.ZyncApp && window.ZyncApp.setProgress) window.ZyncApp.setProgress(p); });
            const base = `https://unpkg.com/@ffmpeg/core@${CORE}/dist/umd`;
            await ff.load({ coreURL: `${base}/ffmpeg-core.js`, wasmURL: `${base}/ffmpeg-core.wasm` });
            loaded = true; return ff;
        })();
        return loadPromise;
    }
    const ext = f => (f.name.split('.').pop() || 'bin').toLowerCase();
    function assert(file, allow) { const e = ext(file); if (allow && !allow.includes(e)) throw new Error(`Invalid File Type: expected ${allow.join(', ')}.`); }
    async function run(file, out, args, mime, nameFn, ctx) {
        const ef = await ensureFFmpeg();
        const inN = 'in.' + ext(file), outN = out;
        await ef.writeFile(inN, await fetchFile(file));
        if (ctx && ctx.setStatus) ctx.setStatus('Processing…');
        await ef.exec(args);
        const data = await ef.readFile(outN); await ef.deleteFile(inN).catch(() => {}); await ef.deleteFile(outN).catch(() => {});
        if (!data || !data.length) throw new Error('Conversion Failed: empty output.');
        const b = new Blob([data.buffer], { type: mime });
        return { name: nameFn(file), blob: b, type: mime, size: b.size, url: URL.createObjectURL(b) };
    }
    const V = ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v', 'flv'];
    const A = ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a', 'wma', 'ogg'];

    const H = {
        'mp4-to-mp3': f => run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-q:a', '0', '-map', 'a', 'o.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '.mp3'),
        'mov-to-mp3': f => run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-q:a', '0', '-map', 'a', 'o.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '.mp3'),
        'extract-audio': f => run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-vn', '-q:a', '0', '-map', 'a', 'o.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '.mp3'),
        'wav-to-mp3': f => run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-codec:a', 'libmp3lame', '-q:a', '2', 'o.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '.mp3'),
        'aac-to-mp3': f => run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-codec:a', 'libmp3lame', 'o.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '.mp3'),
        'ogg-to-mp3': f => run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-codec:a', 'libmp3lame', 'o.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '.mp3'),
        'flac-to-mp3': f => run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-codec:a', 'libmp3lame', 'o.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '.mp3'),
        'm4a-to-mp3': f => run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-codec:a', 'libmp3lame', 'o.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '.mp3'),
        'wma-to-mp3': f => run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-codec:a', 'libmp3lame', 'o.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '.mp3'),
        'compress-video': f => run(f, 'o.mp4', ['-i', 'in.' + ext(f), '-vcodec', 'libx264', '-crf', '28', '-preset', 'veryfast', 'o.mp4'], 'video/mp4', n => n.name.replace(/\.[^.]+$/, '') + '-compressed.mp4'),
        'video-compressor': f => run(f, 'o.mp4', ['-i', 'in.' + ext(f), '-vcodec', 'libx264', '-crf', '28', '-preset', 'veryfast', 'o.mp4'], 'video/mp4', n => n.name.replace(/\.[^.]+$/, '') + '-compressed.mp4'),
        'video-to-gif': (f, o) => run(f, 'o.gif', ['-i', 'in.' + ext(f), '-vf', `fps=${o && o.fps || 10},scale=${o && o.width || 320}:-1`, 'o.gif'], 'image/gif', n => n.name.replace(/\.[^.]+$/, '') + '.gif'),
        'gif-maker': (f, o) => run(f, 'o.gif', ['-i', 'in.' + ext(f), '-vf', `fps=${o && o.fps || 10},scale=${o && o.width || 320}:-1`, 'o.gif'], 'image/gif', n => n.name.replace(/\.[^.]+$/, '') + '.gif'),
        'merge-audio': async (files, o) => {
            assert(files[0], A); const ef = await ensureFFmpeg();
            const list = 'list.txt'; let txt = '';
            for (let i = 0; i < files.length; i++) { const n = 'a' + i + '.' + ext(files[i]); await ef.writeFile(n, await fetchFile(files[i])); txt += "file '" + n + "'\n"; }
            await ef.writeFile(list, new TextEncoder().encode(txt)); await ef.exec(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', 'o.mp3']);
            const data = await ef.readFile('o.mp3'); return { name: 'merged-audio.mp3', blob: new Blob([data.buffer], { type: 'audio/mpeg' }), type: 'audio/mpeg', size: data.length, url: URL.createObjectURL(new Blob([data.buffer])) };
        },
        'audio-joiner': 'merge-audio',
        'compress-audio': (f, o) => run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-codec:a', 'libmp3lame', '-b:a', (o && o.bitrate) || '128k', 'o.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '-compressed.mp3'),
        'volume-normalizer': (f) => run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-af', 'loudnorm', '-c:a', 'libmp3lame', 'o.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '-normalized.mp3'),
        'audio-speed-pitch': (f, o) => { const r = (o && o.rate) || 1.0; return run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-filter:a', `atempo=${r}`, '-c:a', 'libmp3lame', 'o.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '-speed.mp3'); },
        'audio-pitch-shifter': (f, o) => { const r = (o && o.rate) || 1.0; return run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-filter:a', `asetrate=44100*${r},aresample=44100`, '-c:a', 'libmp3lame', 'o.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '-pitch.mp3'); },
        'silence-trimmer': (f) => run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-af', 'silenceremove=start_periods=1:start_duration=0.3:start_threshold=-50dB', '-c:a', 'libmp3lame', 'o.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '-trimmed.mp3'),
        'video-watermarker': (f, o) => run(f, 'o.mp4', ['-i', 'in.' + ext(f), '-vf', `drawtext=text='${(o && o.text) || 'ZyncTools'}'`, 'o.mp4'], 'video/mp4', n => n.name.replace(/\.[^.]+$/, '') + '-wm.mp4'),
        'avi-to-mp4': f => run(f, 'o.mp4', ['-i', 'in.' + ext(f), '-c:v', 'libx264', '-c:a', 'aac', 'o.mp4'], 'video/mp4', n => n.name.replace(/\.[^.]+$/, '') + '.mp4'),
        'mkv-to-mp4': f => run(f, 'o.mp4', ['-i', 'in.' + ext(f), '-c:v', 'libx264', '-c:a', 'aac', 'o.mp4'], 'video/mp4', n => n.name.replace(/\.[^.]+$/, '') + '.mp4'),
        'webm-to-mp4': f => run(f, 'o.mp4', ['-i', 'in.' + ext(f), '-c:v', 'libx264', '-c:a', 'aac', 'o.mp4'], 'video/mp4', n => n.name.replace(/\.[^.]+$/, '') + '.mp4'),
        'flv-to-mp4': f => run(f, 'o.mp4', ['-i', 'in.' + ext(f), '-c:v', 'libx264', '-c:a', 'aac', 'o.mp4'], 'video/mp4', n => n.name.replace(/\.[^.]+$/, '') + '.mp4'),
        'mp4-to-mkv': f => run(f, 'o.mkv', ['-i', 'in.' + ext(f), '-c', 'copy', 'o.mkv'], 'video/x-matroska', n => n.name.replace(/\.[^.]+$/, '') + '.mkv'),
        'audio-trimmer': (f, o) => run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-ss', (o && o.start) || '0', '-to', (o && o.end) || '30', '-c', 'copy', 'o.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '-trim.mp3'),
        'audio-splitter': (f, o) => run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-f', 'segment', '-segment_time', (o && o.seconds) || '30', '-c', 'copy', 'o_%03d.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '-seg.mp3'),
        'audio-reverse': (f) => run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-af', 'areverse', '-c:a', 'libmp3lame', 'o.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '-rev.mp3'),
        'video-speed-change': (f, o) => { const r = (o && o.rate) || 1.0; return run(f, 'o.mp4', ['-i', 'in.' + ext(f), '-filter:v', `setpts=${1 / r}*PTS`, '-filter:a', `atempo=${r}`, '-c:v', 'libx264', '-c:a', 'aac', 'o.mp4'], 'video/mp4', n => n.name.replace(/\.[^.]+$/, '') + '-speed.mp4'); },
        'video-reverse': (f) => run(f, 'o.mp4', ['-i', 'in.' + ext(f), '-vf', 'reverse', '-af', 'areverse', '-c:v', 'libx264', '-c:a', 'aac', 'o.mp4'], 'video/mp4', n => n.name.replace(/\.[^.]+$/, '') + '-rev.mp4'),
        'video-merge-audio': async (files, o) => { if (!files || files.length < 2) throw new Error('Invalid Input: need video + audio.'); const ef = await ensureFFmpeg(); await ef.writeFile('a.mp4', await fetchFile(files[0])); await ef.writeFile('b.mp3', await fetchFile(files[1])); await ef.exec(['-i', 'a.mp4', '-i', 'b.mp3', '-c', 'copy', 'o.mp4']); const data = await ef.readFile('o.mp4'); return { name: files[0].name.replace(/\.[^.]+$/, '') + '-merged.mp4', blob: new Blob([data.buffer], { type: 'video/mp4' }), type: 'video/mp4', size: data.length, url: URL.createObjectURL(new Blob([data.buffer])) }; },
        'audio-visualizer': (f) => run(f, 'o.mp4', ['-i', 'in.' + ext(f), '-filter_complex', '[0:a]showwaves=s=640x240:mode=line,colors=Blue', '-c:v', 'libx264', '-c:a', 'copy', 'o.mp4'], 'video/mp4', n => n.name.replace(/\.[^.]+$/, '') + '-viz.mp4'),
        'audio-waveform': (f) => run(f, 'o.png', ['-i', 'in.' + ext(f), '-filter_complex', '[0:a]showwaves=s=640x240:mode=line:colors=Blue', '-frames:v', '1', 'o.png'], 'image/png', n => n.name.replace(/\.[^.]+$/, '') + '-wave.png'),
        'silence-remover': (f) => run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-af', 'silenceremove=start_periods=1:start_duration=0.3:start_threshold=-50dB:stop_periods=1:stop_duration=0.5:stop_threshold=-50dB', '-c:a', 'libmp3lame', 'o.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '-nosilence.mp3'),
        'video-screenshot': (f, o) => run(f, 'o.png', ['-i', 'in.' + ext(f), '-ss', (o && o.time) || '00:00:01', '-vframes', '1', 'o.png'], 'image/png', n => n.name.replace(/\.[^.]+$/, '') + '-shot.png'),
        'merge-video': async (files, o) => { if (!files || files.length < 2) throw new Error('Invalid Input: need 2+ videos.'); const ef = await ensureFFmpeg(); let list = 'vlist.txt', txt = ''; for (let i = 0; i < files.length; i++) { const n = 'v' + i + '.' + ext(files[i]); await ef.writeFile(n, await fetchFile(files[i])); txt += "file '" + n + "'\n"; } await ef.writeFile(list, new TextEncoder().encode(txt)); await ef.exec(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', 'o.mp4']); const data = await ef.readFile('o.mp4'); return { name: 'merged-video.mp4', blob: new Blob([data.buffer], { type: 'video/mp4' }), type: 'video/mp4', size: data.length, url: URL.createObjectURL(new Blob([data.buffer])) }; },
        'audio-speed-pitch': (f, o) => { const r = (o && o.rate) || 1.0; return run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-filter:a', `asetrate=44100*${r},aresample=44100`, '-c:a', 'libmp3lame', 'o.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '-pitch.mp3'); },
        'volume-normalizer': (f) => run(f, 'o.mp3', ['-i', 'in.' + ext(f), '-af', 'loudnorm', '-c:a', 'libmp3lame', 'o.mp3'], 'audio/mpeg', n => n.name.replace(/\.[^.]+$/, '') + '-norm.mp3')
    };

    window.ZyncBatchMedia = { H, ensureFFmpeg,
        getModule(toolId) {
            let fn = H[toolId];
            if (typeof fn === 'string') fn = H[fn];
            if (!fn || typeof fn !== 'function') return null;
            return {
                type: 'file',
                outputType: 'blob',
                process: async (files, options) => {
                    if (!files || !files.length) throw new Error('Invalid Input: add a file.');
                    const r = typeof fn === 'function' ? await fn(files, options || {}) : null;
                    return Array.isArray(r) ? r : [r];
                }
            };
        }
    };
})();
