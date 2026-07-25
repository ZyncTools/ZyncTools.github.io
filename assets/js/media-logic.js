/**
 * ZyncTools — Media Logic Module
 * FFmpeg.wasm-powered media converters, compressors, and editors.
 * Runs heavy operations in a Web Worker to keep UI responsive.
 */

window.ZyncMediaLogic = (function () {
    'use strict';

    let ffmpeg = null;
    let ffmpegLoaded = false;
    let loadPromise = null;

    /* ============================================
       FFmpeg Lazy Loader
       ============================================ */

    async function ensureFFmpeg() {
        if (ffmpegLoaded) return ffmpeg;
        if (loadPromise) return loadPromise;

        loadPromise = (async () => {
            try {
                const { FFmpeg } = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js');
                const { fetchFile } = await import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js');
                
                ffmpeg = new FFmpeg();
                
                ffmpeg.on('log', ({ message }) => {
                    console.log('[FFmpeg]', message);
                });
                
                ffmpeg.on('progress', ({ progress }) => {
                    const pct = Math.round(progress * 100);
                    if (window.ZyncApp && window.ZyncApp.setProgress) {
                        window.ZyncApp.setProgress(pct);
                    }
                });

                await ffmpeg.load({
                    coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
                    wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm'
                });

                ffmpegLoaded = true;
                console.log('[FFmpeg] Loaded successfully');
                return ffmpeg;
            } catch (err) {
                console.error('[FFmpeg] Load failed:', err);
                throw new Error('Failed to load FFmpeg engine. Please try again.');
            }
        })();

        return loadPromise;
    }

    /* ============================================
       VIDEO TO AUDIO CONVERTERS
       ============================================ */

    async function videoToAudio(file, outputFormat = 'mp3') {
        const ff = await ensureFFmpeg();
        const inputName = `input.${file.name.split('.').pop()}`;
        const outputName = `output.${outputFormat}`;
        
        await ff.writeFile(inputName, await fetchFile(file));
        
        const args = ['-i', inputName, '-vn', '-acodec', 'libmp3lame', '-q:a', '2'];
        if (outputFormat === 'aac') {
            args[args.length - 2] = 'aac';
            args[args.length - 1] = '-b:a';
            args.push('192k');
        } else if (outputFormat === 'wav') {
            args[args.length - 2] = 'pcm_s16le';
            args.pop();
        } else if (outputFormat === 'ogg') {
            args[args.length - 2] = 'libvorbis';
            args[args.length - 1] = '-q:a';
            args.push('5');
        }
        
        args.push(outputName);
        await ff.exec(args);
        
        const data = await ff.readFile(outputName);
        const blob = new Blob([data.buffer], { 
            type: outputFormat === 'mp3' ? 'audio/mpeg' : 
                  outputFormat === 'wav' ? 'audio/wav' : 
                  outputFormat === 'aac' ? 'audio/aac' : 'audio/ogg' 
        });
        
        // Cleanup
        await ff.deleteFile(inputName);
        await ff.deleteFile(outputName);
        
        return {
            name: file.name.replace(/\.[^.]+$/, '') + '.' + outputFormat,
            blob,
            type: blob.type,
            size: blob.size,
            url: URL.createObjectURL(blob)
        };
    }

    /* ============================================
       VIDEO COMPRESSOR
       ============================================ */

    async function compressVideo(file, preset = 'whatsapp') {
        const ff = await ensureFFmpeg();
        const inputName = `input.${file.name.split('.').pop()}`;
        const outputName = 'output.mp4';
        
        await ff.writeFile(inputName, await fetchFile(file));
        
        let args = [];
        switch (preset) {
            case 'whatsapp':
                args = ['-i', inputName, '-vcodec', 'libx264', '-crf', '28', '-preset', 'fast', '-acodec', 'aac', '-b:a', '128k', outputName];
                break;
            case 'instagram':
                args = ['-i', inputName, '-vcodec', 'libx264', '-crf', '23', '-preset', 'medium', '-acodec', 'aac', '-b:a', '192k', '-movflags', '+faststart', outputName];
                break;
            case 'email':
                args = ['-i', inputName, '-vcodec', 'libx264', '-crf', '32', '-preset', 'slow', '-acodec', 'aac', '-b:a', '96k', outputName];
                break;
            default:
                args = ['-i', inputName, '-vcodec', 'libx264', '-crf', '25', '-acodec', 'aac', outputName];
        }
        
        await ff.exec(args);
        
        const data = await ff.readFile(outputName);
        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        
        await ff.deleteFile(inputName);
        await ff.deleteFile(outputName);
        
        return {
            name: file.name.replace(/\.[^.]+$/, '') + '_compressed.mp4',
            blob,
            type: 'video/mp4',
            size: blob.size,
            url: URL.createObjectURL(blob)
        };
    }

    /* ============================================
       AUDIO TOOLS
       ============================================ */

    async function cutAudio(file, startTime, endTime) {
        const ff = await ensureFFmpeg();
        const inputName = `input.${file.name.split('.').pop()}`;
        const outputName = 'output.mp3';
        
        await ff.writeFile(inputName, await fetchFile(file));
        await ff.exec(['-i', inputName, '-ss', startTime, '-to', endTime, '-c', 'copy', outputName]);
        
        const data = await ff.readFile(outputName);
        const blob = new Blob([data.buffer], { type: 'audio/mpeg' });
        
        await ff.deleteFile(inputName);
        await ff.deleteFile(outputName);
        
        return {
            name: file.name.replace(/\.[^.]+$/, '') + '_cut.mp3',
            blob,
            type: 'audio/mpeg',
            size: blob.size,
            url: URL.createObjectURL(blob)
        };
    }

    async function mergeAudio(files) {
        const ff = await ensureFFmpeg();
        const inputNames = files.map((f, i) => `input${i}.${f.name.split('.').pop()}`);
        const outputName = 'merged.mp3';
        
        for (let i = 0; i < files.length; i++) {
            await ff.writeFile(inputNames[i], await fetchFile(files[i]));
        }
        
        // Create concat list
        const concatList = inputNames.map(f => `file '${f}'`).join('\n');
        await ff.writeFile('concat.txt', concatList);
        
        await ff.exec(['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', outputName]);
        
        const data = await ff.readFile(outputName);
        const blob = new Blob([data.buffer], { type: 'audio/mpeg' });
        
        // Cleanup
        for (const name of inputNames) await ff.deleteFile(name);
        await ff.deleteFile('concat.txt');
        await ff.deleteFile(outputName);
        
        return {
            name: 'merged_audio.mp3',
            blob,
            type: 'audio/mpeg',
            size: blob.size,
            url: URL.createObjectURL(blob)
        };
    }

    async function changeAudioSpeed(file, speed = 1.0, pitch = 1.0) {
        const ff = await ensureFFmpeg();
        const inputName = `input.${file.name.split('.').pop()}`;
        const outputName = 'output.mp3';
        
        await ff.writeFile(inputName, await fetchFile(file));
        
        // atempo filter supports 0.5 to 2.0
        const atempo = Math.max(0.5, Math.min(2.0, speed));
        await ff.exec(['-i', inputName, '-filter:a', `atempo=${atempo}`, outputName]);
        
        const data = await ff.readFile(outputName);
        const blob = new Blob([data.buffer], { type: 'audio/mpeg' });
        
        await ff.deleteFile(inputName);
        await ff.deleteFile(outputName);
        
        return {
            name: file.name.replace(/\.[^.]+$/, '') + '_speed.mp3',
            blob,
            type: 'audio/mpeg',
            size: blob.size,
            url: URL.createObjectURL(blob)
        };
    }

    async function normalizeAudio(file) {
        const ff = await ensureFFmpeg();
        const inputName = `input.${file.name.split('.').pop()}`;
        const outputName = 'normalized.mp3';
        
        await ff.writeFile(inputName, await fetchFile(file));
        await ff.exec(['-i', inputName, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', outputName]);
        
        const data = await ff.readFile(outputName);
        const blob = new Blob([data.buffer], { type: 'audio/mpeg' });
        
        await ff.deleteFile(inputName);
        await ff.deleteFile(outputName);
        
        return {
            name: file.name.replace(/\.[^.]+$/, '') + '_normalized.mp3',
            blob,
            type: 'audio/mpeg',
            size: blob.size,
            url: URL.createObjectURL(blob)
        };
    }

    /* ============================================
       GIF TOOLS
       ============================================ */

    async function videoToGif(file, fps = 10, width = 480) {
        const ff = await ensureFFmpeg();
        const inputName = `input.${file.name.split('.').pop()}`;
        const outputName = 'output.gif';
        
        await ff.writeFile(inputName, await fetchFile(file));
        await ff.exec([
            '-i', inputName,
            '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos`,
            '-c:v', 'gif',
            outputName
        ]);
        
        const data = await ff.readFile(outputName);
        const blob = new Blob([data.buffer], { type: 'image/gif' });
        
        await ff.deleteFile(inputName);
        await ff.deleteFile(outputName);
        
        return {
            name: file.name.replace(/\.[^.]+$/, '') + '.gif',
            blob,
            type: 'image/gif',
            size: blob.size,
            url: URL.createObjectURL(blob)
        };
    }

    async function gifToMp4(file) {
        const ff = await ensureFFmpeg();
        const inputName = `input.${file.name.split('.').pop()}`;
        const outputName = 'output.mp4';
        
        await ff.writeFile(inputName, await fetchFile(file));
        await ff.exec(['-i', inputName, '-movflags', '+faststart', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', outputName]);
        
        const data = await ff.readFile(outputName);
        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        
        await ff.deleteFile(inputName);
        await ff.deleteFile(outputName);
        
        return {
            name: file.name.replace(/\.[^.]+$/, '') + '.mp4',
            blob,
            type: 'video/mp4',
            size: blob.size,
            url: URL.createObjectURL(blob)
        };
    }

    async function compressGif(file) {
        const ff = await ensureFFmpeg();
        const inputName = `input.${file.name.split('.').pop()}`;
        const outputName = 'compressed.gif';
        
        await ff.writeFile(inputName, await fetchFile(file));
        await ff.exec(['-i', inputName, '-vf', 'fps=10,scale=480:-1:flags=lanczos', '-f', 'gif', outputName]);
        
        const data = await ff.readFile(outputName);
        const blob = new Blob([data.buffer], { type: 'image/gif' });
        
        await ff.deleteFile(inputName);
        await ff.deleteFile(outputName);
        
        return {
            name: file.name.replace(/\.[^.]+$/, '') + '_compressed.gif',
            blob,
            type: 'image/gif',
            size: blob.size,
            url: URL.createObjectURL(blob)
        };
    }

    /* ============================================
       EXTENDED MEDIA TOOLS
       ============================================ */

    async function videoToGifWithOptions(file, options = {}) {
        const ff = await ensureFFmpeg();
        const inputName = `input.${file.name.split('.').pop()}`;
        const outputName = 'output.gif';
        const { fps = 10, width = 480, startTime = 0, endTime, crop, quality = 80, loop = 0 } = options;

        await ff.writeFile(inputName, await fetchFile(file));

        const vf = [];
        if (crop && crop.width && crop.height) {
            vf.push(`crop=${crop.width}:${crop.height}:${crop.x || 0}:${crop.y || 0}`);
        } else if (options.cropW && options.cropH && options.cropW > 0 && options.cropH > 0) {
            vf.push(`crop=${options.cropW}:${options.cropH}:${options.cropX || 0}:${options.cropY || 0}`);
        }
        vf.push(`fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`);

        const args = ['-i', inputName];
        if (startTime > 0) args.push('-ss', String(startTime));
        if (endTime !== undefined && endTime !== null && String(endTime).trim()) args.push('-to', String(endTime));
        args.push('-vf', vf.join(','));
        args.push('-loop', String(loop));
        if (quality > 0 && quality < 100) args.push('-fs', String(quality * 1024));
        args.push(outputName);

        await ff.exec(args);

        const data = await ff.readFile(outputName);
        const blob = new Blob([data.buffer], { type: 'image/gif' });

        await ff.deleteFile(inputName);
        await ff.deleteFile(outputName);

        return {
            name: file.name.replace(/\.[^.]+$/, '') + '.gif',
            blob,
            type: 'image/gif',
            size: blob.size,
            url: URL.createObjectURL(blob)
        };
    }

    async function addVideoWatermark(file, options = {}) {
        const ff = await ensureFFmpeg();
        const inputName = `input.${file.name.split('.').pop()}`;
        const outputName = 'output.mp4';
        const {
            text, imageUrl, opacity = 1, rotation = 0, scale = 1,
            x = 10, y = 10, shadow = false, outline = false,
            fontSize = 24, color = 'white', startTime, endTime
        } = options;

        await ff.writeFile(inputName, await fetchFile(file));

        const args = ['-i', inputName];
        let filterComplex = null;

        if (text) {
            const escapedText = text.replace(/'/g, "\\'").replace(/:/g, "\\:");
            let drawtext = `drawtext=text='${escapedText}'`;
            drawtext += `:fontsize=${fontSize}:fontcolor=${color}`;
            if (shadow) drawtext += ':shadowx=2:shadowy=2';
            if (outline) drawtext += ':bordercolor=black:borderw=2';
            const xPos = typeof x === 'number' ? `x=${x}` : 'x=(w-text_w)/2';
            const yPos = typeof y === 'number' ? `y=${y}` : 'y=(h-text_h)/2';
            drawtext += `:${xPos}:${yPos}`;
            if (rotation !== 0) drawtext += `:rotate=${rotation}`;
            if (opacity < 1) drawtext += `:alpha=${opacity}`;
            filterComplex = drawtext;
        } else if (imageUrl) {
            const overlayImageName = 'overlay.png';
            let imageBlob = imageUrl instanceof File ? imageUrl : await fetch(imageUrl).then(r => r.blob());
            await ff.writeFile(overlayImageName, await fetchFile(imageBlob));
            filterComplex = `[0:v][1:v]overlay=${x}:${y}:format=auto`;
            args.push('-i', overlayImageName);
        } else {
            throw new Error('Either text or imageUrl must be provided');
        }

        if (filterComplex) args.push('-filter_complex', filterComplex);
        if (startTime !== undefined) args.push('-ss', String(startTime));
        if (endTime !== undefined && endTime >= 0) args.push('-to', String(endTime));
        args.push('-c:a', 'copy', outputName);

        await ff.exec(args);

        const data = await ff.readFile(outputName);
        const blob = new Blob([data.buffer], { type: 'video/mp4' });

        await ff.deleteFile(inputName);
        if (imageUrl) await ff.deleteFile('overlay.png');
        await ff.deleteFile(outputName);

        return {
            name: file.name.replace(/\.[^.]+$/, '') + '_watermarked.mp4',
            blob,
            type: 'video/mp4',
            size: blob.size,
            url: URL.createObjectURL(blob)
        };
    }

    async function compressVideoPreset(file, preset = 'balanced', options = {}) {
        const ff = await ensureFFmpeg();
        const inputName = `input.${file.name.split('.').pop()}`;
        const outputName = 'output.mp4';

        await ff.writeFile(inputName, await fetchFile(file));

        let args = [];
        switch (preset) {
            case 'high':
                args = ['-i', inputName, '-vcodec', 'libx264', '-crf', '18', '-preset', 'medium', '-acodec', 'aac', '-b:a', '192k', outputName];
                break;
            case 'balanced':
                args = ['-i', inputName, '-vcodec', 'libx264', '-crf', '23', '-acodec', 'aac', outputName];
                break;
            case 'max':
                args = ['-i', inputName, '-vcodec', 'libx264', '-crf', '32', '-preset', 'slow', '-acodec', 'aac', outputName];
                break;
            case 'youtube':
                args = ['-i', inputName, '-vcodec', 'libx264', '-crf', '20', '-preset', 'medium', '-acodec', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-pix_fmt', 'yuv420p', outputName];
                break;
            case 'instagram':
                args = ['-i', inputName, '-vcodec', 'libx264', '-crf', '22', '-preset', 'medium', '-acodec', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', outputName];
                break;
            case 'whatsapp':
                args = ['-i', inputName, '-vcodec', 'libx264', '-crf', '28', '-preset', 'fast', '-acodec', 'aac', '-b:a', '128k', '-b:v', '1M', outputName];
                break;
            case 'tiktok':
                args = ['-i', inputName, '-vcodec', 'libx264', '-crf', '23', '-preset', 'medium', '-acodec', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-pix_fmt', 'yuv420p', '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease', outputName];
                break;
             case 'custom':
                 args = ['-i', inputName, '-vcodec', 'libx264'];
                 if (options.bitrate) args.push('-b:v', options.bitrate);
                 if (options.resolution && options.resolution !== 'original') args.push('-vf', `scale=${options.resolution}`);
                 if (options.fps && options.fps !== 'original') args.push('-r', String(options.fps));
                 args.push('-acodec', 'aac', outputName);
                 break;
            default:
                args = ['-i', inputName, '-vcodec', 'libx264', '-crf', '23', outputName];
        }

        await ff.exec(args);

        const data = await ff.readFile(outputName);
        const blob = new Blob([data.buffer], { type: 'video/mp4' });

        await ff.deleteFile(inputName);
        await ff.deleteFile(outputName);

        return {
            name: file.name.replace(/\.[^.]+$/, '') + '_compressed.mp4',
            blob,
            type: 'video/mp4',
            size: blob.size,
            url: URL.createObjectURL(blob),
            estimatedSize: blob.size
        };
    }

    async function convertAudioFormat(file, outputFormat, options = {}) {
        const ff = await ensureFFmpeg();
        const inputName = `input.${file.name.split('.').pop()}`;
        const outputName = `output.${outputFormat}`;
        const { bitrate = '192k', normalize = false, trimSilence = false } = options;

        await ff.writeFile(inputName, await fetchFile(file));

        const args = ['-i', inputName];
        const filters = [];

        if (normalize) filters.push('loudnorm=I=-16:TP=-1.5:LRA=11');
        if (trimSilence) filters.push('silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB');

        if (filters.length > 0) args.push('-af', filters.join(','));

        switch (outputFormat) {
            case 'mp3':
                args.push('-acodec', 'libmp3lame', '-b:a', bitrate);
                break;
            case 'wav':
                args.push('-acodec', 'pcm_s16le');
                break;
            case 'aac':
            case 'm4a':
            case 'm4r':
                args.push('-acodec', 'aac', '-b:a', bitrate);
                break;
            case 'ogg':
                args.push('-acodec', 'libvorbis', '-q:a', '5');
                break;
            case 'flac':
                args.push('-acodec', 'flac');
                break;
            case 'opus':
                args.push('-acodec', 'libopus', '-b:a', bitrate);
                break;
        }

        args.push(outputName);
        await ff.exec(args);

        const data = await ff.readFile(outputName);
        const mime = { mp3: 'audio/mpeg', wav: 'audio/wav', aac: 'audio/aac', m4a: 'audio/mp4', ogg: 'audio/ogg', flac: 'audio/flac', opus: 'audio/opus', m4r: 'audio/m4r' }[outputFormat] || 'audio/mpeg';
        const blob = new Blob([data.buffer], { type: mime });

        await ff.deleteFile(inputName);
        await ff.deleteFile(outputName);

        return {
            name: file.name.replace(/\.[^.]+$/, '') + `.${outputFormat}`,
            blob,
            type: mime,
            size: blob.size,
            url: URL.createObjectURL(blob),
            format: outputFormat
        };
    }

    async function shiftPitch(file, options = {}) {
        const ff = await ensureFFmpeg();
        const inputName = `input.${file.name.split('.').pop()}`;
        const outputName = 'output.mp3';
        const { pitch = 0, cents = 0, speed = 1 } = options;

        await ff.writeFile(inputName, await fetchFile(file));

        const rate = Math.round(44100 * Math.pow(2, (pitch + cents / 100) / 12));
        const atempo = Math.max(0.5, Math.min(2.0, speed));
        const filter = `asetrate=${rate},aresample=44100,atempo=${atempo}`;

        await ff.exec(['-i', inputName, '-filter:a', filter, outputName]);

        const data = await ff.readFile(outputName);
        const blob = new Blob([data.buffer], { type: 'audio/mpeg' });

        await ff.deleteFile(inputName);
        await ff.deleteFile(outputName);

        return {
            name: file.name.replace(/\.[^.]+$/, '') + '_pitch.mp3',
            blob,
            type: 'audio/mpeg',
            size: blob.size,
            url: URL.createObjectURL(blob)
        };
    }

    async function trimSilence(file, options = {}) {
        const ff = await ensureFFmpeg();
        const inputName = `input.${file.name.split('.').pop()}`;
        const outputName = 'output.mp3';
        const { threshold = -50, minSilenceDuration = 0.5, padding = 0.1 } = options;

        await ff.writeFile(inputName, await fetchFile(file));

        const filter = `silenceremove=start_periods=1:start_duration=${minSilenceDuration}:start_threshold=${threshold}dB,areverse,silenceremove=start_periods=1:start_duration=${minSilenceDuration}:start_threshold=${threshold}dB,areverse`;

        await ff.exec(['-i', inputName, '-af', filter, outputName]);

        const data = await ff.readFile(outputName);
        const blob = new Blob([data.buffer], { type: 'audio/mpeg' });

        await ff.deleteFile(inputName);
        await ff.deleteFile(outputName);

        return {
            name: file.name.replace(/\.[^.]+$/, '') + '_trimmed.mp3',
            blob,
            type: 'audio/mpeg',
            size: blob.size,
            url: URL.createObjectURL(blob)
        };
    }

    async function splitStems(file, options = {}) {
        const ff = await ensureFFmpeg();
        const inputName = `input.${file.name.split('.').pop()}`;
        const stemsOption = options.stems || 'all';
        const vocals = stemsOption === 'all' || stemsOption === 'vocals';
        const drums = stemsOption === 'all' || stemsOption === 'drums';
        const bass = stemsOption === 'all' || stemsOption === 'bass';
        const other = stemsOption === 'all' || stemsOption === 'other';

        await ff.writeFile(inputName, await fetchFile(file));

        const stems = [];

        if (vocals) {
            const vName = 'stem_vocals.mp3';
            await ff.exec(['-i', inputName, '-af', 'bandpass=f=1000:width_type=h:w=500', '-ac', '1', vName]);
            const data = await ff.readFile(vName);
            const blob = new Blob([data.buffer], { type: 'audio/mpeg' });
            stems.push({ name: file.name.replace(/\.[^.]+$/, '') + '_vocals.mp3', blob, type: 'audio/mpeg', size: blob.size, url: URL.createObjectURL(blob), stemType: 'vocals' });
            await ff.deleteFile(vName);
        }

        if (drums) {
            const dName = 'stem_drums.mp3';
            await ff.exec(['-i', inputName, '-af', 'highpass=f=100,lowpass=f=5000', '-ac', '1', dName]);
            const data = await ff.readFile(dName);
            const blob = new Blob([data.buffer], { type: 'audio/mpeg' });
            stems.push({ name: file.name.replace(/\.[^.]+$/, '') + '_drums.mp3', blob, type: 'audio/mpeg', size: blob.size, url: URL.createObjectURL(blob), stemType: 'drums' });
            await ff.deleteFile(dName);
        }

        if (bass) {
            const bName = 'stem_bass.mp3';
            await ff.exec(['-i', inputName, '-af', 'lowpass=f=200', '-ac', '1', bName]);
            const data = await ff.readFile(bName);
            const blob = new Blob([data.buffer], { type: 'audio/mpeg' });
            stems.push({ name: file.name.replace(/\.[^.]+$/, '') + '_bass.mp3', blob, type: 'audio/mpeg', size: blob.size, url: URL.createObjectURL(blob), stemType: 'bass' });
            await ff.deleteFile(bName);
        }

        if (other) {
            const oName = 'stem_other.mp3';
            await ff.exec(['-i', inputName, '-af', 'lowpass=f=200,highpass=f=5000', '-ac', '1', oName]);
            const data = await ff.readFile(oName);
            const blob = new Blob([data.buffer], { type: 'audio/mpeg' });
            stems.push({ name: file.name.replace(/\.[^.]+$/, '') + '_other.mp3', blob, type: 'audio/mpeg', size: blob.size, url: URL.createObjectURL(blob), stemType: 'other' });
            await ff.deleteFile(oName);
        }

        await ff.deleteFile(inputName);
        return stems;
    }

    async function addFades(file, options = {}) {
        const ff = await ensureFFmpeg();
        const inputName = `input.${file.name.split('.').pop()}`;
        const outputName = 'output.mp3';
        const { fadeIn = 0, fadeOut = 0, fadeInCurve = 'lin' } = options;

        await ff.writeFile(inputName, await fetchFile(file));

        let afilter = '';
        if (fadeIn > 0) afilter += `afade=t=in:curve=${fadeInCurve}:d=${fadeIn}`;
        if (fadeOut > 0) afilter += (afilter ? ',' : '') + `afade=t=out:curve=${fadeInCurve}:d=${fadeOut}`;

        const args = ['-i', inputName];
        if (afilter) args.push('-af', afilter);
        args.push(outputName);

        await ff.exec(args);

        const data = await ff.readFile(outputName);
        const blob = new Blob([data.buffer], { type: 'audio/mpeg' });

        await ff.deleteFile(inputName);
        await ff.deleteFile(outputName);

        return {
            name: file.name.replace(/\.[^.]+$/, '') + '_faded.mp3',
            blob,
            type: 'audio/mpeg',
            size: blob.size,
            url: URL.createObjectURL(blob)
        };
    }

    async function makeRingtone(file, options = {}) {
        const ff = await ensureFFmpeg();
        const inputName = `input.${file.name.split('.').pop()}`;
        const outputName = `output.${options.format || 'm4r'}`;
        const {
            start, end, fadeIn = 0, fadeOut = 0,
            volume = 1, normalize = false, format = 'm4r', duration, durationPreset
        } = options;

        const finalDuration = durationPreset && durationPreset !== 'custom' ? parseInt(durationPreset, 10) : duration;

        await ff.writeFile(inputName, await fetchFile(file));

        const filters = [];
        if (normalize) filters.push('loudnorm=I=-16:TP=-1.5:LRA=11');
        if (volume !== 1) filters.push(`volume=${volume}`);
        if (fadeIn > 0) filters.push(`afade=t=in:curve=lin:d=${fadeIn}`);
        if (fadeOut > 0) filters.push(`afade=t=out:curve=lin:d=${fadeOut}`);

        const args = ['-i', inputName];
        if (start !== undefined) args.push('-ss', String(start));
        if (end !== undefined && end >= 0) args.push('-to', String(end));
        if (filters.length > 0) args.push('-af', filters.join(','));
        if (finalDuration) args.push('-t', String(finalDuration));

        const codecMap = { mp3: 'libmp3lame', m4r: 'aac', wav: 'pcm_s16le', aac: 'aac' };
        if (codecMap[format]) args.push('-acodec', codecMap[format]);
        args.push(outputName);

        await ff.exec(args);

        const data = await ff.readFile(outputName);
        const mime = format === 'mp3' ? 'audio/mpeg' : format === 'wav' ? 'audio/wav' : 'audio/mp4';
        const blob = new Blob([data.buffer], { type: mime });

        await ff.deleteFile(inputName);
        await ff.deleteFile(outputName);

        return {
            name: file.name.replace(/\.[^.]+$/, '') + `_ringtone.${format}`,
            blob,
            type: mime,
            size: blob.size,
            url: URL.createObjectURL(blob)
        };
    }

    async function createAudioVisualizer(file, options = {}) {
        const ff = await ensureFFmpeg();
        const inputName = `input.${file.name.split('.').pop()}`;
        const outputName = 'visualizer.mp4';
        const {
            style = 'bars', width = 1280, height = 720, fps = 30,
            backgroundColor = 'black', barColor = 'white', accentColor = 'white',
            duration
        } = options;

        await ff.writeFile(inputName, await fetchFile(file));

        let vf = '';
        switch (style) {
            case 'bars':
            case 'spectrum':
                vf = `showfreqs=s=${width}x${height}:fps=${fps}:mode=bar:bg=${backgroundColor}:fg=${barColor}`;
                break;
            case 'wave':
                vf = `showwaves=s=${width}x${height}:fps=${fps}:mode=line:bg=${backgroundColor}:fg=${accentColor}`;
                break;
            case 'circular':
            case 'minimal':
            case 'particles':
            default:
                vf = `showwaves=s=${width}x${height}:fps=${fps}:mode=line:bg=${backgroundColor}:fg=${accentColor}`;
                break;
        }

        const args = ['-i', inputName, '-vf', vf];
        if (duration) args.push('-t', String(duration));
        args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', outputName);

        await ff.exec(args);

        const data = await ff.readFile(outputName);
        const blob = new Blob([data.buffer], { type: 'video/mp4' });

        await ff.deleteFile(inputName);
        await ff.deleteFile(outputName);

        return {
            name: file.name.replace(/\.[^.]+$/, '') + '_visualizer.mp4',
            blob,
            type: 'video/mp4',
            size: blob.size,
            url: URL.createObjectURL(blob)
        };
    }

    async function batchConvert(files, options = {}) {
        const { outputFormat = 'mp3', quality = 'medium', renamePattern = '{n}', zipOutput = false, fileName = 'converted-audio.zip' } = options;
        const qualityMap = { low: '128k', medium: '192k', high: '320k' };
        const results = [];
        const total = files.length;

        for (let i = 0; i < total; i++) {
            if (window.ZyncApp && window.ZyncApp.setProgress) {
                window.ZyncApp.setProgress(Math.round((i / total) * 100));
            }
            try {
                const result = await convertAudioFormat(files[i], outputFormat, { bitrate: qualityMap[quality] || '192k' });
                result.name = renamePattern.replace('{n}', result.name.replace(/\.[^.]+$/, ''));
                results.push(result);
            } catch (err) {
                results.push({ error: true, name: files[i].name, message: err.message });
            }
        }

        if (window.ZyncApp && window.ZyncApp.setProgress) {
            window.ZyncApp.setProgress(100);
        }

        if (zipOutput && results.length > 1 && !results[0].error && window.JSZip) {
            const zip = new JSZip();
            results.forEach(function(r) {
                if (!r.error && r.blob) {
                    zip.file(r.name, r.blob);
                }
            });
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            return [{
                name: fileName,
                blob: zipBlob,
                type: 'application/zip',
                size: zipBlob.size,
                url: URL.createObjectURL(zipBlob)
            }];
        }

        return results;
    }

    async function applySilenceTrimmerAdvanced(file, options = {}) {
        const ff = await ensureFFmpeg();
        const inputName = `input.${file.name.split('.').pop()}`;
        const outputName = 'output.mp3';
        const { detectSilenceFirst = true, threshold = -50, minLength = 0.5, padding = 0.1 } = options;

        await ff.writeFile(inputName, await fetchFile(file));

        const detectedSilences = [];

        if (detectSilenceFirst) {
            const silenceFilter = `silencedetect=n=-${Math.abs(threshold)}dB:d=${minLength}`;
            const detectorArgs = ['-i', inputName, '-af', silenceFilter, '-f', 'null', '-'];

            const handler = ({ message }) => {
                const startMatch = message.match(/silence_start: ([\d.]+)/);
                const endMatch = message.match(/silence_end: ([\d.]+)/);
                if (startMatch) detectedSilences.push({ start: parseFloat(startMatch[1]), end: null });
                if (endMatch && detectedSilences.length) detectedSilences[detectedSilences.length - 1].end = parseFloat(endMatch[1]);
            };

            ff.on('log', handler);
            try {
                await ff.exec(detectorArgs);
            } finally {
                ff.off('log', handler);
            }
        }

        const filter = `silenceremove=start_periods=1:start_duration=${minLength}:start_threshold=${threshold}dB,areverse,silenceremove=start_periods=1:start_duration=${minLength}:start_threshold=${threshold}dB,areverse`;
        await ff.exec(['-i', inputName, '-af', filter, outputName]);

        const data = await ff.readFile(outputName);
        const blob = new Blob([data.buffer], { type: 'audio/mpeg' });

        await ff.deleteFile(inputName);
        await ff.deleteFile(outputName);

        return {
            name: file.name.replace(/\.[^.]+$/, '') + '_trimmed_advanced.mp3',
            blob,
            type: 'audio/mpeg',
            size: blob.size,
            url: URL.createObjectURL(blob),
            detectedSilences
        };
    }

    /* ============================================
       PUBLIC API
       ============================================ */

    return {
        ensureFFmpeg,
        videoToAudio,
        compressVideo,
        cutAudio,
        mergeAudio,
        changeAudioSpeed,
        normalizeAudio,
        videoToGif,
        gifToMp4,
        compressGif,
        videoToGifWithOptions,
        addVideoWatermark,
        compressVideoPreset,
        convertAudioFormat,
        shiftPitch,
        trimSilence,
        splitStems,
        addFades,
        makeRingtone,
        createAudioVisualizer,
        batchConvert,
        applySilenceTrimmerAdvanced
    };
})();
