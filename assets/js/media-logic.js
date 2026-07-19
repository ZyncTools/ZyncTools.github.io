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
        compressGif
    };
})();
