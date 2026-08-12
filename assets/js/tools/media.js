/**
 * ZyncTools — Audio & video tools
 *
 * Audio work runs through the Web Audio API and is exported as WAV
 * (lossless) or MP3 via lamejs. Video tools use the <video> element and
 * canvas, which covers frame extraction, GIFs and audio extraction
 * without shipping a 30 MB transcoder.
 */
(function () {
    'use strict';

    var ZT = window.ZT;
    var define = ZT.registry.define;

    var AUDIO_ACCEPT = 'audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus,.weba';
    var VIDEO_ACCEPT = 'video/*,.mp4,.webm,.mov,.mkv,.avi,.m4v';

    /* ============================================================
       Audio decoding & encoding
       ============================================================ */

    /**
     * Decode any audio the browser can play into raw samples.
     * Also works on video files — it pulls out the audio track.
     */
    async function decodeAudio(file) {
        var AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) ZT.fail('This browser does not support the Web Audio API.');

        var buffer = await ZT.readAsArrayBuffer(file);
        var context = new AudioContextClass();
        try {
            return await context.decodeAudioData(buffer);
        } catch (err) {
            ZT.fail('"' + file.name + '" could not be decoded. The browser may not support this codec — try converting it to WAV or MP3 first.');
        } finally {
            // Free the hardware context; the decoded buffer stays valid.
            if (context.close) context.close();
        }
    }

    /** Encode an AudioBuffer as a 16-bit PCM WAV file. */
    function encodeWav(audioBuffer) {
        var channels = audioBuffer.numberOfChannels;
        var sampleRate = audioBuffer.sampleRate;
        var frames = audioBuffer.length;

        var data = [];
        for (var c = 0; c < channels; c++) data.push(audioBuffer.getChannelData(c));

        var bytesPerSample = 2;
        var blockAlign = channels * bytesPerSample;
        var dataSize = frames * blockAlign;
        var buffer = new ArrayBuffer(44 + dataSize);
        var view = new DataView(buffer);

        function writeString(offset, text) {
            for (var i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
        }

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);          // PCM header size
        view.setUint16(20, 1, true);           // format 1 = PCM
        view.setUint16(22, channels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, 16, true);          // bits per sample
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);

        var offset = 44;
        for (var i = 0; i < frames; i++) {
            for (c = 0; c < channels; c++) {
                var sample = Math.max(-1, Math.min(1, data[c][i]));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
                offset += 2;
            }
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }

    /** Encode an AudioBuffer as MP3 using lamejs. */
    async function encodeMp3(audioBuffer, bitrate, onProgress) {
        var lame = await ZT.requireLib(function () { return window.lamejs; }, ZT.CDN.lamejs);

        var channels = Math.min(2, audioBuffer.numberOfChannels);
        var sampleRate = audioBuffer.sampleRate;
        var encoder = new lame.Mp3Encoder(channels, sampleRate, bitrate);

        function toInt16(input) {
            var out = new Int16Array(input.length);
            for (var i = 0; i < input.length; i++) {
                var s = Math.max(-1, Math.min(1, input[i]));
                out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            return out;
        }

        var left = toInt16(audioBuffer.getChannelData(0));
        var right = channels > 1 ? toInt16(audioBuffer.getChannelData(1)) : null;

        var blocks = [];
        var BLOCK = 1152;
        for (var i = 0; i < left.length; i += BLOCK) {
            var leftChunk = left.subarray(i, i + BLOCK);
            var chunk = right
                ? encoder.encodeBuffer(leftChunk, right.subarray(i, i + BLOCK))
                : encoder.encodeBuffer(leftChunk);
            if (chunk.length) blocks.push(new Uint8Array(chunk));
            if (onProgress && i % (BLOCK * 200) === 0) onProgress(i / left.length);
            // Yield occasionally so the progress bar can actually paint.
            if (i % (BLOCK * 400) === 0) await new Promise(function (r) { setTimeout(r, 0); });
        }
        var tail = encoder.flush();
        if (tail.length) blocks.push(new Uint8Array(tail));

        return new Blob(blocks, { type: 'audio/mpeg' });
    }

    async function exportAudio(audioBuffer, format, bitrate, onProgress) {
        if (format === 'mp3') return encodeMp3(audioBuffer, bitrate || 192, onProgress);
        return encodeWav(audioBuffer);
    }

    /** Build a new AudioBuffer with the given shape. */
    function createBuffer(channels, frames, sampleRate) {
        var AudioContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        var context = new AudioContextClass(channels, Math.max(1, frames), sampleRate);
        return context.createBuffer(channels, Math.max(1, frames), sampleRate);
    }

    var FORMAT_OPTION = {
        id: 'format', type: 'select', label: 'Output format', value: 'mp3',
        options: [
            { value: 'mp3', label: 'MP3 — compressed, widely supported' },
            { value: 'wav', label: 'WAV — lossless, much larger' }
        ]
    };

    var BITRATE_OPTION = {
        id: 'bitrate', type: 'select', label: 'MP3 bitrate', value: '192',
        options: [
            { value: '96', label: '96 kbps — speech' },
            { value: '128', label: '128 kbps — standard' },
            { value: '192', label: '192 kbps — good quality' },
            { value: '256', label: '256 kbps — high quality' },
            { value: '320', label: '320 kbps — maximum' }
        ],
        when: function (o) { return o.format === 'mp3'; }
    };

    function audioSummary(buffer, file) {
        return [
            { label: 'Duration', value: ZT.formatDuration(buffer.duration) },
            { label: 'Sample rate', value: ZT.formatNumber(buffer.sampleRate) + ' Hz' },
            { label: 'Channels', value: buffer.numberOfChannels === 1 ? 'Mono' : buffer.numberOfChannels === 2 ? 'Stereo' : buffer.numberOfChannels + ' channels' },
            { label: 'Original size', value: ZT.formatBytes(file.size) }
        ];
    }

    /* ============================================================
       Audio converter
       ============================================================ */
    define({
        id: 'audio-converter',
        name: 'Audio Converter',
        category: 'media',
        icon: 'music',
        description: 'Convert audio between formats, change sample rate and channels.',
        tags: ['audio', 'convert', 'mp3', 'wav', 'm4a', 'ogg', 'flac'],
        input: 'files',
        accept: AUDIO_ACCEPT + ',' + VIDEO_ACCEPT,
        popular: true,
        heavy: true,
        options: [
            FORMAT_OPTION, BITRATE_OPTION,
            {
                id: 'channels', type: 'select', label: 'Channels', value: 'keep',
                options: [
                    { value: 'keep', label: 'Keep the original' },
                    { value: 'mono', label: 'Mono — halves the size' },
                    { value: 'stereo', label: 'Stereo' }
                ]
            },
            {
                id: 'sample-rate', type: 'select', label: 'Sample rate', value: 'keep',
                options: [
                    { value: 'keep', label: 'Keep the original' },
                    { value: '48000', label: '48 kHz — video standard' },
                    { value: '44100', label: '44.1 kHz — CD quality' },
                    { value: '32000', label: '32 kHz' },
                    { value: '22050', label: '22.05 kHz — speech' },
                    { value: '16000', label: '16 kHz — voice notes' }
                ]
            },
            { id: 'normalise', type: 'checkbox', label: 'Normalise the volume', value: false, help: 'Raises the loudest peak to just under 0 dB.' },
            { id: 'note', type: 'note', text: 'Works on video files too — the audio track is extracted. Everything is decoded and encoded in your browser.' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var outputs = [];

            for (var i = 0; i < ctx.files.length; i++) {
                var file = ctx.files[i];
                var share = 1 / ctx.files.length;
                ctx.progress(i * share, 'Decoding ' + file.name);

                var decoded = await decodeAudio(file);
                var processed = await resampleBuffer(decoded, o, function (p) {
                    ctx.progress(i * share + p * share * 0.4, 'Processing ' + file.name);
                });

                if (o.normalise) normaliseBuffer(processed);

                ctx.progress(i * share + share * 0.5, 'Encoding ' + file.name);
                var blob = await exportAudio(processed, o.format, parseInt(o.bitrate, 10), function (p) {
                    ctx.progress(i * share + share * (0.5 + p * 0.5));
                });

                outputs.push(ZT.fileResult(blob, ZT.outName(file.name, '', o.format), {
                    note: ZT.formatBytes(file.size) + ' → ' + ZT.formatBytes(blob.size) +
                        '  ·  ' + ZT.formatDuration(processed.duration) +
                        '  ·  ' + (processed.numberOfChannels === 1 ? 'mono' : 'stereo') +
                        ' @ ' + ZT.formatNumber(processed.sampleRate) + ' Hz',
                    previewBlob: blob,
                    previewKind: 'audio'
                }));
            }
            ctx.progress(1);
            return outputs;
        }
    });

    /**
     * Re-render an AudioBuffer at a new sample rate and channel count.
     * OfflineAudioContext does the resampling with a proper filter.
     */
    async function resampleBuffer(buffer, opts, onProgress) {
        var targetRate = opts.sampleRate === 'keep' ? buffer.sampleRate : parseInt(opts.sampleRate, 10);
        var targetChannels = opts.channels === 'keep' ? buffer.numberOfChannels
            : opts.channels === 'mono' ? 1 : 2;

        if (targetRate === buffer.sampleRate && targetChannels === buffer.numberOfChannels) {
            return buffer;
        }

        var OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        var frames = Math.ceil(buffer.duration * targetRate);
        var context = new OfflineContext(targetChannels, frames, targetRate);

        var source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);

        if (onProgress) onProgress(0.5);
        var rendered = await context.startRendering();
        if (onProgress) onProgress(1);
        return rendered;
    }

    /** Scale the whole buffer so its loudest peak sits at -0.3 dBFS. */
    function normaliseBuffer(buffer) {
        var peak = 0;
        for (var c = 0; c < buffer.numberOfChannels; c++) {
            var data = buffer.getChannelData(c);
            for (var i = 0; i < data.length; i++) {
                var abs = Math.abs(data[i]);
                if (abs > peak) peak = abs;
            }
        }
        if (peak === 0 || peak >= 0.9999) return;

        var gain = 0.9661 / peak; // -0.3 dBFS
        for (c = 0; c < buffer.numberOfChannels; c++) {
            data = buffer.getChannelData(c);
            for (i = 0; i < data.length; i++) data[i] *= gain;
        }
    }

    /* ============================================================
       Audio trimmer
       ============================================================ */
    define({
        id: 'audio-trimmer',
        name: 'Audio Trimmer & Cutter',
        category: 'media',
        icon: 'scissors',
        description: 'Cut a section out of an audio file, with optional fades.',
        tags: ['trim', 'cut', 'audio', 'ringtone', 'crop', 'clip'],
        input: 'file',
        accept: AUDIO_ACCEPT + ',' + VIDEO_ACCEPT,
        heavy: true,
        options: [
            { id: 'start', type: 'text', label: 'Start at', value: '0:00', help: 'Use mm:ss, h:mm:ss or plain seconds.' },
            { id: 'end', type: 'text', label: 'End at', value: '', placeholder: 'leave empty for the end of the file' },
            {
                id: 'mode', type: 'radio', label: 'Action', value: 'keep',
                options: [
                    { value: 'keep', label: 'Keep this section' },
                    { value: 'remove', label: 'Remove this section' }
                ]
            },
            { id: 'fade-in', type: 'number', label: 'Fade in', suffix: 'seconds', value: 0, min: 0, max: 30, step: 0.1 },
            { id: 'fade-out', type: 'number', label: 'Fade out', suffix: 'seconds', value: 0, min: 0, max: 30, step: 0.1 },
            FORMAT_OPTION, BITRATE_OPTION
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var file = ctx.files[0];

            ctx.progress(0.1, 'Decoding audio');
            var buffer = await decodeAudio(file);

            var start = parseTime(o.start, 0);
            var end = o.end.trim() ? parseTime(o.end, buffer.duration) : buffer.duration;
            if (start >= buffer.duration) ZT.fail('The start time is past the end of this ' + ZT.formatDuration(buffer.duration) + ' file.');
            if (end > buffer.duration) end = buffer.duration;
            if (end <= start) ZT.fail('The end time must be after the start time.');

            var rate = buffer.sampleRate;
            var channels = buffer.numberOfChannels;
            var startFrame = Math.floor(start * rate);
            var endFrame = Math.floor(end * rate);

            ctx.progress(0.35, 'Trimming');
            var output;

            if (o.mode === 'keep') {
                output = createBuffer(channels, endFrame - startFrame, rate);
                for (var c = 0; c < channels; c++) {
                    output.getChannelData(c).set(buffer.getChannelData(c).subarray(startFrame, endFrame));
                }
            } else {
                var keptFrames = buffer.length - (endFrame - startFrame);
                if (keptFrames < 1) ZT.fail('Removing that section would leave nothing behind.');
                output = createBuffer(channels, keptFrames, rate);
                for (c = 0; c < channels; c++) {
                    var source = buffer.getChannelData(c);
                    var target = output.getChannelData(c);
                    target.set(source.subarray(0, startFrame), 0);
                    target.set(source.subarray(endFrame), startFrame);
                }
            }

            applyFades(output, o.fadeIn, o.fadeOut);

            ctx.progress(0.6, 'Encoding');
            var blob = await exportAudio(output, o.format, parseInt(o.bitrate, 10), function (p) {
                ctx.progress(0.6 + p * 0.4);
            });
            ctx.progress(1);

            return [
                ZT.dataResult(audioSummary(buffer, file).concat([
                    { label: 'Section', value: ZT.formatDuration(start) + ' → ' + ZT.formatDuration(end) },
                    { label: 'Result length', value: ZT.formatDuration(output.duration) }
                ]), { title: 'Details', columns: 2 }),
                ZT.fileResult(blob, ZT.outName(file.name, o.mode === 'keep' ? 'trimmed' : 'cut', o.format), {
                    note: ZT.formatDuration(output.duration) + ' · ' + ZT.formatBytes(blob.size),
                    previewBlob: blob, previewKind: 'audio'
                })
            ];
        }
    });

    /** Accept "90", "1:30" or "0:01:30" and return seconds. */
    function parseTime(input, fallback) {
        var text = String(input || '').trim();
        if (!text) return fallback;
        if (/^\d*\.?\d+$/.test(text)) return parseFloat(text);

        var parts = text.split(':').map(function (p) { return parseFloat(p) || 0; });
        if (parts.some(isNaN)) ZT.fail('"' + input + '" is not a time I understand. Use mm:ss, h:mm:ss or seconds.');

        var seconds = 0;
        parts.forEach(function (p) { seconds = seconds * 60 + p; });
        return seconds;
    }

    function applyFades(buffer, fadeInSeconds, fadeOutSeconds) {
        var rate = buffer.sampleRate;
        var fadeInFrames = Math.min(Math.floor(fadeInSeconds * rate), buffer.length);
        var fadeOutFrames = Math.min(Math.floor(fadeOutSeconds * rate), buffer.length);

        for (var c = 0; c < buffer.numberOfChannels; c++) {
            var data = buffer.getChannelData(c);
            for (var i = 0; i < fadeInFrames; i++) data[i] *= i / fadeInFrames;
            for (i = 0; i < fadeOutFrames; i++) {
                data[data.length - 1 - i] *= i / fadeOutFrames;
            }
        }
    }

    /* ============================================================
       Audio merger
       ============================================================ */
    define({
        id: 'audio-merger',
        name: 'Audio Merger',
        category: 'media',
        icon: 'combine',
        description: 'Join several audio files end to end, with optional crossfades.',
        tags: ['merge', 'join', 'combine', 'audio', 'concatenate', 'playlist'],
        input: 'files',
        accept: AUDIO_ACCEPT,
        heavy: true,
        options: [
            {
                id: 'order', type: 'select', label: 'Order', value: 'as-listed',
                options: [
                    { value: 'as-listed', label: 'The order files are listed' },
                    { value: 'name-asc', label: 'File name (A → Z)' },
                    { value: 'name-desc', label: 'File name (Z → A)' }
                ]
            },
            { id: 'gap', type: 'number', label: 'Silence between tracks', suffix: 'seconds', value: 0, min: 0, max: 30, step: 0.1 },
            { id: 'crossfade', type: 'number', label: 'Crossfade', suffix: 'seconds', value: 0, min: 0, max: 15, step: 0.1, help: 'Overlaps each track with the next. Ignored when a gap is set.' },
            { id: 'normalise', type: 'checkbox', label: 'Normalise the final volume', value: true },
            FORMAT_OPTION, BITRATE_OPTION
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            if (ctx.files.length < 2) ZT.fail('Add at least two audio files to merge.');

            var files = ctx.files.slice();
            if (o.order === 'name-asc') files.sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });
            else if (o.order === 'name-desc') files.sort(function (a, b) { return b.name.localeCompare(a.name, undefined, { numeric: true }); });

            var buffers = [];
            for (var i = 0; i < files.length; i++) {
                ctx.progress(i / files.length * 0.5, 'Decoding ' + files[i].name);
                buffers.push(await decodeAudio(files[i]));
            }

            // Everything is rendered at the highest input rate and widest channel count.
            var rate = Math.max.apply(null, buffers.map(function (b) { return b.sampleRate; }));
            var channels = Math.max.apply(null, buffers.map(function (b) { return b.numberOfChannels; }));

            ctx.progress(0.55, 'Aligning tracks');
            var aligned = [];
            for (i = 0; i < buffers.length; i++) {
                aligned.push(await resampleBuffer(buffers[i], {
                    sampleRate: String(rate),
                    channels: channels === 1 ? 'mono' : 'stereo'
                }));
            }

            var gapFrames = Math.floor(o.gap * rate);
            var crossfadeFrames = o.gap > 0 ? 0 : Math.floor(o.crossfade * rate);

            var totalFrames = aligned.reduce(function (sum, b) { return sum + b.length; }, 0)
                + gapFrames * (aligned.length - 1)
                - crossfadeFrames * (aligned.length - 1);
            if (totalFrames < 1) ZT.fail('The crossfade is longer than the tracks themselves.');

            var output = createBuffer(channels, totalFrames, rate);
            var writeAt = 0;

            aligned.forEach(function (buffer, index) {
                for (var c = 0; c < channels; c++) {
                    var source = buffer.getChannelData(Math.min(c, buffer.numberOfChannels - 1));
                    var target = output.getChannelData(c);

                    for (var f = 0; f < buffer.length; f++) {
                        var position = writeAt + f;
                        if (position >= target.length) break;

                        var sample = source[f];
                        // Inside the overlap, ramp this track in while the previous ramps out.
                        if (crossfadeFrames && index > 0 && f < crossfadeFrames) {
                            var t = f / crossfadeFrames;
                            target[position] = target[position] * (1 - t) + sample * t;
                        } else {
                            target[position] = sample;
                        }
                    }
                }
                writeAt += buffer.length + gapFrames - (index < aligned.length - 1 ? crossfadeFrames : 0);
            });

            if (o.normalise) normaliseBuffer(output);

            ctx.progress(0.75, 'Encoding');
            var blob = await exportAudio(output, o.format, parseInt(o.bitrate, 10), function (p) {
                ctx.progress(0.75 + p * 0.25);
            });
            ctx.progress(1);

            return ZT.fileResult(blob, 'merged-audio.' + o.format, {
                note: files.length + ' tracks · ' + ZT.formatDuration(output.duration) + ' · ' + ZT.formatBytes(blob.size),
                previewBlob: blob, previewKind: 'audio'
            });
        }
    });

    /* ============================================================
       Audio effects
       ============================================================ */
    define({
        id: 'audio-effects',
        name: 'Audio Speed, Pitch & Volume',
        category: 'media',
        icon: 'sliders-horizontal',
        description: 'Change playback speed, adjust volume, reverse audio or trim silence.',
        tags: ['speed', 'pitch', 'volume', 'reverse', 'tempo', 'normalise', 'silence'],
        input: 'file',
        accept: AUDIO_ACCEPT + ',' + VIDEO_ACCEPT,
        heavy: true,
        options: [
            { id: 'speed', type: 'range', label: 'Playback speed', value: 1, min: 0.25, max: 4, step: 0.05, suffix: '×', help: 'Changing speed also shifts pitch, exactly like a tape machine.' },
            { id: 'volume', type: 'range', label: 'Volume', value: 100, min: 0, max: 400, step: 5, suffix: '%' },
            { id: 'normalise', type: 'checkbox', label: 'Normalise peaks first', value: false },
            { id: 'reverse', type: 'checkbox', label: 'Reverse the audio', value: false },
            { id: 'trim-silence', type: 'checkbox', label: 'Trim silence from the start and end', value: false },
            { id: 'silence-threshold', type: 'range', label: 'Silence threshold', value: -50, min: -80, max: -20, step: 1, suffix: 'dB', when: function (o) { return o.trimSilence; } },
            { id: 'fade-in', type: 'number', label: 'Fade in', suffix: 'seconds', value: 0, min: 0, max: 30, step: 0.1 },
            { id: 'fade-out', type: 'number', label: 'Fade out', suffix: 'seconds', value: 0, min: 0, max: 30, step: 0.1 },
            FORMAT_OPTION, BITRATE_OPTION
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var file = ctx.files[0];

            ctx.progress(0.1, 'Decoding audio');
            var buffer = await decodeAudio(file);
            var original = buffer.duration;

            if (o.trimSilence) {
                ctx.progress(0.25, 'Trimming silence');
                buffer = trimSilence(buffer, Math.pow(10, o.silenceThreshold / 20));
            }

            if (o.speed !== 1) {
                ctx.progress(0.35, 'Changing speed');
                var OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
                var frames = Math.ceil(buffer.length / o.speed);
                var context = new OfflineContext(buffer.numberOfChannels, frames, buffer.sampleRate);
                var source = context.createBufferSource();
                source.buffer = buffer;
                source.playbackRate.value = o.speed;
                source.connect(context.destination);
                source.start(0);
                buffer = await context.startRendering();
            }

            if (o.reverse) {
                for (var c = 0; c < buffer.numberOfChannels; c++) {
                    buffer.getChannelData(c).reverse();
                }
            }

            if (o.normalise) normaliseBuffer(buffer);

            if (o.volume !== 100) {
                var gain = o.volume / 100;
                for (c = 0; c < buffer.numberOfChannels; c++) {
                    var data = buffer.getChannelData(c);
                    for (var i = 0; i < data.length; i++) {
                        // Hard-clip rather than wrap, which would sound like harsh noise.
                        data[i] = Math.max(-1, Math.min(1, data[i] * gain));
                    }
                }
            }

            applyFades(buffer, o.fadeIn, o.fadeOut);

            ctx.progress(0.6, 'Encoding');
            var blob = await exportAudio(buffer, o.format, parseInt(o.bitrate, 10), function (p) {
                ctx.progress(0.6 + p * 0.4);
            });
            ctx.progress(1);

            return [
                ZT.dataResult([
                    { label: 'Original length', value: ZT.formatDuration(original) },
                    { label: 'New length', value: ZT.formatDuration(buffer.duration) },
                    { label: 'Speed', value: o.speed + '×' },
                    { label: 'Volume', value: o.volume + '%' }
                ], { title: 'Details', columns: 2 }),
                ZT.fileResult(blob, ZT.outName(file.name, 'edited', o.format), {
                    note: ZT.formatDuration(buffer.duration) + ' · ' + ZT.formatBytes(blob.size),
                    previewBlob: blob, previewKind: 'audio'
                })
            ];
        }
    });

    /** Drop leading and trailing frames quieter than `threshold` (0–1). */
    function trimSilence(buffer, threshold) {
        var channels = buffer.numberOfChannels;
        var length = buffer.length;

        function isLoudAt(frame) {
            for (var c = 0; c < channels; c++) {
                if (Math.abs(buffer.getChannelData(c)[frame]) > threshold) return true;
            }
            return false;
        }

        var start = 0;
        while (start < length && !isLoudAt(start)) start++;
        var end = length - 1;
        while (end > start && !isLoudAt(end)) end--;

        if (start === 0 && end === length - 1) return buffer;
        if (end <= start) return buffer;

        var output = createBuffer(channels, end - start + 1, buffer.sampleRate);
        for (var c = 0; c < channels; c++) {
            output.getChannelData(c).set(buffer.getChannelData(c).subarray(start, end + 1));
        }
        return output;
    }

    /* ============================================================
       Waveform image
       ============================================================ */
    define({
        id: 'audio-waveform',
        name: 'Audio Waveform Image',
        category: 'media',
        icon: 'audio-waveform',
        description: 'Render an audio file as a waveform graphic for thumbnails and posts.',
        tags: ['waveform', 'visualise', 'audio', 'graphic', 'soundwave'],
        input: 'file',
        accept: AUDIO_ACCEPT + ',' + VIDEO_ACCEPT,
        options: [
            { id: 'width', type: 'number', label: 'Image width', suffix: 'px', value: 1600, min: 200, max: 6000 },
            { id: 'height', type: 'number', label: 'Image height', suffix: 'px', value: 400, min: 60, max: 2000 },
            {
                id: 'style', type: 'select', label: 'Style', value: 'bars',
                options: [
                    { value: 'bars', label: 'Bars' }, { value: 'filled', label: 'Filled wave' },
                    { value: 'line', label: 'Outline' }, { value: 'mirror', label: 'Mirrored bars' }
                ]
            },
            { id: 'bar-count', type: 'range', label: 'Detail', value: 200, min: 40, max: 1200, step: 10, suffix: 'bars', when: function (o) { return o.style === 'bars' || o.style === 'mirror'; } },
            { id: 'color', type: 'color', label: 'Wave colour', value: '#22C55E' },
            { id: 'background', type: 'color', label: 'Background', value: '#0F172A' },
            { id: 'transparent', type: 'checkbox', label: 'Transparent background', value: false },
            { id: 'gradient', type: 'checkbox', label: 'Fade the colour vertically', value: true }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var file = ctx.files[0];

            ctx.progress(0.2, 'Decoding audio');
            var buffer = await decodeAudio(file);

            ctx.progress(0.6, 'Drawing waveform');
            var canvas = ZT.makeCanvas(o.width, o.height);
            var c2d = canvas.getContext('2d');

            if (!o.transparent) {
                c2d.fillStyle = o.background;
                c2d.fillRect(0, 0, o.width, o.height);
            }

            var data = buffer.getChannelData(0);
            var mid = o.height / 2;

            var fill = o.color;
            if (o.gradient) {
                var grad = c2d.createLinearGradient(0, 0, 0, o.height);
                grad.addColorStop(0, o.color);
                grad.addColorStop(0.5, o.color);
                grad.addColorStop(1, withAlpha(o.color, 0.35));
                fill = grad;
            }
            c2d.fillStyle = fill;
            c2d.strokeStyle = o.color;

            if (o.style === 'bars' || o.style === 'mirror') {
                var bars = o.barCount;
                var step = Math.floor(data.length / bars) || 1;
                var barWidth = o.width / bars;
                var gap = Math.max(1, barWidth * 0.25);

                for (var b = 0; b < bars; b++) {
                    var peak = 0;
                    var from = b * step;
                    for (var i = from; i < from + step && i < data.length; i++) {
                        var abs = Math.abs(data[i]);
                        if (abs > peak) peak = abs;
                    }
                    var barHeight = Math.max(2, peak * o.height * 0.92);
                    var x = b * barWidth;
                    if (o.style === 'mirror') {
                        c2d.fillRect(x, mid - barHeight / 2, barWidth - gap, barHeight);
                    } else {
                        c2d.fillRect(x, o.height - barHeight, barWidth - gap, barHeight);
                    }
                }
            } else {
                var samplesPerPixel = Math.floor(data.length / o.width) || 1;
                c2d.beginPath();
                c2d.moveTo(0, mid);

                var tops = [], bottoms = [];
                for (var px = 0; px < o.width; px++) {
                    var min = 1, max = -1;
                    var offset = px * samplesPerPixel;
                    for (i = offset; i < offset + samplesPerPixel && i < data.length; i++) {
                        if (data[i] < min) min = data[i];
                        if (data[i] > max) max = data[i];
                    }
                    tops.push(mid - max * mid * 0.92);
                    bottoms.push(mid - min * mid * 0.92);
                }

                if (o.style === 'line') {
                    c2d.lineWidth = 2;
                    c2d.beginPath();
                    tops.forEach(function (y, x) { x === 0 ? c2d.moveTo(x, y) : c2d.lineTo(x, y); });
                    c2d.stroke();
                    c2d.beginPath();
                    bottoms.forEach(function (y, x) { x === 0 ? c2d.moveTo(x, y) : c2d.lineTo(x, y); });
                    c2d.stroke();
                } else {
                    c2d.beginPath();
                    tops.forEach(function (y, x) { x === 0 ? c2d.moveTo(x, y) : c2d.lineTo(x, y); });
                    for (px = bottoms.length - 1; px >= 0; px--) c2d.lineTo(px, bottoms[px]);
                    c2d.closePath();
                    c2d.fill();
                }
            }

            var blob = await ZT.encodeCanvas(canvas, 'png');
            ctx.progress(1);

            return [
                ZT.dataResult(audioSummary(buffer, file), { title: 'Audio', columns: 2 }),
                ZT.fileResult(blob, ZT.outName(file.name, 'waveform', 'png'), {
                    previewBlob: blob, note: o.width + '×' + o.height
                })
            ];
        }
    });

    function withAlpha(hex, alpha) {
        var rgb = ZT.color.parse(hex) || [0, 0, 0, 1];
        return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha + ')';
    }

    /* ============================================================
       Video: extract audio
       ============================================================ */
    define({
        id: 'extract-audio-from-video',
        name: 'Extract Audio from Video',
        category: 'media',
        icon: 'file-audio',
        description: 'Pull the soundtrack out of a video and save it as MP3 or WAV.',
        tags: ['extract audio', 'video to mp3', 'soundtrack', 'rip audio', 'convert'],
        input: 'files',
        accept: VIDEO_ACCEPT,
        popular: true,
        heavy: true,
        options: [
            FORMAT_OPTION, BITRATE_OPTION,
            {
                id: 'channels', type: 'select', label: 'Channels', value: 'keep',
                options: [
                    { value: 'keep', label: 'Keep the original' },
                    { value: 'mono', label: 'Mono — halves the size' },
                    { value: 'stereo', label: 'Stereo' }
                ]
            },
            { id: 'normalise', type: 'checkbox', label: 'Normalise the volume', value: false },
            { id: 'note', type: 'note', text: 'The browser must be able to decode the video container. MP4 and WebM work everywhere; MKV and AVI often do not.' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var outputs = [];

            for (var i = 0; i < ctx.files.length; i++) {
                var file = ctx.files[i];
                var share = 1 / ctx.files.length;
                ctx.progress(i * share, 'Decoding ' + file.name);

                var buffer = await decodeAudio(file);
                if (buffer.duration < 0.05) ZT.fail('"' + file.name + '" appears to have no audio track.');

                var processed = await resampleBuffer(buffer, { sampleRate: 'keep', channels: o.channels });
                if (o.normalise) normaliseBuffer(processed);

                ctx.progress(i * share + share * 0.5, 'Encoding audio');
                var blob = await exportAudio(processed, o.format, parseInt(o.bitrate, 10), function (p) {
                    ctx.progress(i * share + share * (0.5 + p * 0.5));
                });

                outputs.push(ZT.fileResult(blob, ZT.outName(file.name, '', o.format), {
                    note: ZT.formatDuration(processed.duration) + ' · ' + ZT.formatBytes(blob.size),
                    previewBlob: blob, previewKind: 'audio'
                }));
            }
            ctx.progress(1);
            return outputs;
        }
    });

    /* ============================================================
       Video: frame extraction
       ============================================================ */

    /**
     * WebM files written by MediaRecorder — including the ones this site's own
     * screen and video recorders produce — carry no duration in their header,
     * so video.duration reads Infinity. Seeking past the end forces the browser
     * to scan for the real length; then we rewind.
     */
    function resolveDuration(video) {
        return new Promise(function (resolve) {
            if (isFinite(video.duration) && video.duration > 0) return resolve();

            var settled = false;
            function finish() {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                video.removeEventListener('durationchange', onChange);
                video.currentTime = 0;
                resolve();
            }
            function onChange() {
                if (isFinite(video.duration) && video.duration > 0) finish();
            }

            // Give up rather than hang: the caller reports an unreadable duration.
            var timer = setTimeout(finish, 5000);
            video.addEventListener('durationchange', onChange);
            video.currentTime = 1e101;
        });
    }

    /** Load a video element and wait for its metadata. */
    function loadVideo(file) {
        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(file);
            var video = document.createElement('video');
            video.preload = 'auto';
            video.muted = true;
            video.playsInline = true;

            video.onloadedmetadata = function () {
                resolveDuration(video).then(function () {
                    resolve({ video: video, url: url });
                });
            };
            video.onerror = function () {
                URL.revokeObjectURL(url);
                reject(ZT.ToolError('"' + file.name + '" could not be played by this browser. MP4 (H.264) and WebM are the most reliable formats.'));
            };
            video.src = url;
        });
    }

    /** Seek to an exact time and wait until that frame is painted. */
    function seekTo(video, time) {
        return new Promise(function (resolve, reject) {
            var timer = setTimeout(function () {
                reject(ZT.ToolError('Timed out seeking to ' + ZT.formatDuration(time) + '. The video may be corrupt.'));
            }, 15000);

            function done() {
                clearTimeout(timer);
                video.removeEventListener('seeked', done);
                // Give the compositor one frame to actually paint the new position.
                requestAnimationFrame(function () { resolve(); });
            }
            video.addEventListener('seeked', done);
            video.currentTime = Math.min(time, Math.max(0, video.duration - 0.03));
        });
    }

    define({
        id: 'video-frame-extractor',
        name: 'Video Frame Extractor',
        category: 'media',
        icon: 'film',
        description: 'Grab still frames from a video at set intervals or one exact moment.',
        tags: ['frame', 'screenshot', 'still', 'thumbnail', 'video', 'extract'],
        input: 'file',
        accept: VIDEO_ACCEPT,
        heavy: true,
        options: [
            {
                id: 'mode', type: 'select', label: 'Capture', value: 'interval',
                options: [
                    { value: 'single', label: 'One frame at an exact time' },
                    { value: 'interval', label: 'Frames at a fixed interval' },
                    { value: 'count', label: 'A set number of evenly spaced frames' }
                ]
            },
            { id: 'time', type: 'text', label: 'Time', value: '0:05', when: function (o) { return o.mode === 'single'; }, help: 'Use mm:ss, h:mm:ss or seconds.' },
            { id: 'interval', type: 'number', label: 'Every', suffix: 'seconds', value: 5, min: 0.1, max: 600, step: 0.1, when: function (o) { return o.mode === 'interval'; } },
            { id: 'count', type: 'number', label: 'Number of frames', value: 10, min: 1, max: 200, when: function (o) { return o.mode === 'count'; } },
            { id: 'max-frames', type: 'number', label: 'Stop after', suffix: 'frames', value: 60, min: 1, max: 300, when: function (o) { return o.mode === 'interval'; } },
            { id: 'scale', type: 'range', label: 'Frame size', value: 100, min: 10, max: 100, step: 5, suffix: '% of original' },
            {
                id: 'format', type: 'select', label: 'Image format', value: 'jpeg',
                options: [
                    { value: 'jpeg', label: 'JPEG — smaller' }, { value: 'png', label: 'PNG — lossless' },
                    { value: 'webp', label: 'WebP' }
                ]
            },
            { id: 'quality', type: 'range', label: 'Quality', value: 90, min: 30, max: 100, step: 1, suffix: '%', when: function (o) { return o.format !== 'png'; } }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var file = ctx.files[0];
            var loaded = await loadVideo(file);
            var video = loaded.video;

            try {
                var duration = video.duration;
                if (!isFinite(duration) || duration <= 0) ZT.fail('The video duration could not be read.');

                var times = [];
                if (o.mode === 'single') {
                    times = [Math.min(parseTime(o.time, 0), duration - 0.05)];
                } else if (o.mode === 'interval') {
                    for (var t = 0; t < duration && times.length < o.maxFrames; t += o.interval) times.push(t);
                } else {
                    for (var i = 0; i < o.count; i++) {
                        times.push(o.count === 1 ? duration / 2 : (duration - 0.05) * i / (o.count - 1));
                    }
                }
                if (!times.length) ZT.fail('That produced no frames to capture.');

                var scale = o.scale / 100;
                var width = Math.round(video.videoWidth * scale);
                var height = Math.round(video.videoHeight * scale);
                var canvas = ZT.makeCanvas(width, height);
                var c2d = canvas.getContext('2d');

                var frames = [];
                for (i = 0; i < times.length; i++) {
                    if (ctx.signal && ctx.signal.aborted) ZT.fail('Cancelled.');
                    ctx.progress(i / times.length, 'Capturing frame ' + (i + 1) + ' of ' + times.length);

                    await seekTo(video, times[i]);
                    c2d.drawImage(video, 0, 0, width, height);
                    var blob = await ZT.encodeCanvas(canvas, o.format, o.format === 'png' ? undefined : o.quality / 100);

                    frames.push({
                        name: ZT.stem(file.name) + '-' + formatTimecode(times[i]) + '.' + (o.format === 'jpeg' ? 'jpg' : o.format),
                        blob: blob,
                        time: times[i]
                    });
                }
                ctx.progress(1);

                var results = frames.map(function (f) {
                    return ZT.fileResult(f.blob, f.name, {
                        previewBlob: f.blob,
                        note: 'at ' + ZT.formatDuration(f.time) + ' · ' + width + '×' + height
                    });
                });

                if (frames.length > 1) {
                    var zip = await ZT.zipFiles(frames, ZT.stem(file.name) + '-frames.zip');
                    return [ZT.fileResult(zip.blob, zip.name, { note: frames.length + ' frames' })].concat(results);
                }
                return results;
            } finally {
                URL.revokeObjectURL(loaded.url);
                video.src = '';
            }
        }
    });

    function formatTimecode(seconds) {
        var h = Math.floor(seconds / 3600);
        var m = Math.floor(seconds / 60) % 60;
        var s = Math.floor(seconds % 60);
        var ms = Math.round((seconds % 1) * 1000);
        function pad(n, width) { return String(n).padStart(width || 2, '0'); }
        return pad(h) + 'h' + pad(m) + 'm' + pad(s) + 's' + pad(ms, 3);
    }

    /* ============================================================
       Video to GIF
       ============================================================ */
    define({
        id: 'video-to-gif',
        name: 'Video to GIF',
        category: 'media',
        icon: 'file-video',
        description: 'Turn a clip of a video into an animated GIF.',
        tags: ['gif', 'video to gif', 'animation', 'convert', 'clip'],
        input: 'file',
        accept: VIDEO_ACCEPT,
        popular: true,
        heavy: true,
        options: [
            { id: 'start', type: 'text', label: 'Start at', value: '0:00', help: 'Use mm:ss or seconds.' },
            { id: 'duration', type: 'number', label: 'Clip length', suffix: 'seconds', value: 3, min: 0.2, max: 30, step: 0.1 },
            { id: 'fps', type: 'range', label: 'Frame rate', value: 12, min: 2, max: 30, step: 1, suffix: 'fps' },
            { id: 'width', type: 'number', label: 'Output width', suffix: 'px', value: 480, min: 80, max: 1200, help: 'Height follows the aspect ratio. Smaller means a much smaller file.' },
            {
                id: 'quality', type: 'select', label: 'Colour quality', value: '10',
                options: [
                    { value: '1', label: 'Best — slowest, largest' },
                    { value: '10', label: 'Balanced' },
                    { value: '20', label: 'Fast — smallest' }
                ]
            },
            { id: 'loop', type: 'checkbox', label: 'Loop forever', value: true },
            { id: 'note', type: 'note', text: 'GIFs grow quickly. A 3-second clip at 480px and 12 fps usually lands between 1 and 4 MB.' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var file = ctx.files[0];

            ctx.progress(0.02, 'Loading the encoder');
            await ZT.loadScript(ZT.CDN.gifJs);
            if (!window.GIF) ZT.fail('The GIF encoder could not be loaded. Check your connection and retry.');

            var loaded = await loadVideo(file);
            var video = loaded.video;

            try {
                var start = parseTime(o.start, 0);
                if (start >= video.duration) ZT.fail('The start time is past the end of this ' + ZT.formatDuration(video.duration) + ' video.');

                var length = Math.min(o.duration, video.duration - start);
                var frameCount = Math.max(1, Math.round(length * o.fps));
                if (frameCount > 400) ZT.fail('That would need ' + frameCount + ' frames. Shorten the clip or lower the frame rate.');

                var width = o.width;
                var height = Math.round(video.videoHeight * (width / video.videoWidth));
                var canvas = ZT.makeCanvas(width, height);
                var c2d = canvas.getContext('2d');

                // gif.js needs its worker as a blob URL to dodge cross-origin rules.
                var workerResponse = await fetch(ZT.CDN.gifWorker);
                var workerBlob = await workerResponse.blob();
                var workerUrl = URL.createObjectURL(workerBlob);

                var gif = new window.GIF({
                    workers: 2,
                    quality: parseInt(o.quality, 10),
                    width: width,
                    height: height,
                    workerScript: workerUrl,
                    repeat: o.loop ? 0 : -1
                });

                var delay = Math.round(1000 / o.fps);
                for (var i = 0; i < frameCount; i++) {
                    if (ctx.signal && ctx.signal.aborted) ZT.fail('Cancelled.');
                    ctx.progress(0.05 + (i / frameCount) * 0.55, 'Capturing frame ' + (i + 1) + ' of ' + frameCount);

                    await seekTo(video, start + (i / o.fps));
                    c2d.drawImage(video, 0, 0, width, height);
                    gif.addFrame(c2d, { copy: true, delay: delay });
                }

                ctx.progress(0.62, 'Encoding GIF');
                var blob = await new Promise(function (resolve, reject) {
                    gif.on('progress', function (p) { ctx.progress(0.62 + p * 0.36, 'Encoding GIF'); });
                    gif.on('finished', resolve);
                    gif.on('abort', function () { reject(ZT.ToolError('GIF encoding was aborted.')); });
                    gif.render();
                });

                URL.revokeObjectURL(workerUrl);
                ctx.progress(1);

                return ZT.fileResult(blob, ZT.outName(file.name, '', 'gif'), {
                    previewBlob: blob,
                    note: width + '×' + height + ' · ' + frameCount + ' frames · ' + o.fps + ' fps · ' + ZT.formatBytes(blob.size)
                });
            } finally {
                URL.revokeObjectURL(loaded.url);
                video.src = '';
            }
        }
    });

    /* ============================================================
       Media inspector
       ============================================================ */
    define({
        id: 'media-info',
        name: 'Audio & Video Info',
        category: 'media',
        icon: 'info',
        description: 'Inspect duration, resolution, sample rate and other media properties.',
        tags: ['metadata', 'info', 'properties', 'duration', 'resolution', 'inspect'],
        input: 'file',
        accept: AUDIO_ACCEPT + ',' + VIDEO_ACCEPT,
        options: [
            { id: 'analyse-audio', type: 'checkbox', label: 'Analyse the audio track in detail', value: true, help: 'Decodes the audio, which takes a moment on long files.' }
        ],
        run: async function (ctx) {
            var file = ctx.files[0];
            var isVideo = /^video\//.test(file.type) || /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(file.name);

            var rows = [
                { label: 'File name', value: file.name },
                { label: 'File size', value: ZT.formatBytes(file.size) },
                { label: 'MIME type', value: file.type || 'unknown' },
                { label: 'Last modified', value: file.lastModified ? new Date(file.lastModified).toLocaleString() : 'unknown' }
            ];

            var results = [];

            if (isVideo) {
                ctx.progress(0.3, 'Reading video metadata');
                var loaded = await loadVideo(file);
                var video = loaded.video;
                try {
                    rows.push({ label: 'Duration', value: ZT.formatDuration(video.duration) });
                    rows.push({ label: 'Resolution', value: video.videoWidth + ' × ' + video.videoHeight });
                    rows.push({ label: 'Aspect ratio', value: aspectLabel(video.videoWidth, video.videoHeight) });
                    rows.push({ label: 'Megapixels per frame', value: (video.videoWidth * video.videoHeight / 1e6).toFixed(2) + ' MP' });
                    rows.push({ label: 'Average bitrate', value: video.duration ? ZT.formatBytes(file.size / video.duration) + '/s' : '—' });

                    // A poster frame makes the report far more useful at a glance.
                    await seekTo(video, Math.min(1, video.duration / 2));
                    var canvas = ZT.makeCanvas(Math.min(640, video.videoWidth),
                        Math.round(Math.min(640, video.videoWidth) * video.videoHeight / video.videoWidth));
                    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
                    var poster = await ZT.encodeCanvas(canvas, 'jpeg', 0.85);
                    results.push(ZT.fileResult(poster, ZT.outName(file.name, 'poster', 'jpg'), {
                        previewBlob: poster, note: 'Frame from the middle of the video'
                    }));
                } finally {
                    URL.revokeObjectURL(loaded.url);
                    video.src = '';
                }
            }

            if (ctx.opt.analyseAudio) {
                ctx.progress(0.7, 'Analysing audio');
                try {
                    var buffer = await decodeAudio(file);
                    var peak = 0, sumSquares = 0, samples = 0;
                    for (var c = 0; c < buffer.numberOfChannels; c++) {
                        var data = buffer.getChannelData(c);
                        // Sampling every 16th frame is plenty for peak and RMS.
                        for (var i = 0; i < data.length; i += 16) {
                            var abs = Math.abs(data[i]);
                            if (abs > peak) peak = abs;
                            sumSquares += data[i] * data[i];
                            samples++;
                        }
                    }
                    var rms = Math.sqrt(sumSquares / Math.max(1, samples));

                    rows.push({ label: 'Audio duration', value: ZT.formatDuration(buffer.duration) });
                    rows.push({ label: 'Sample rate', value: ZT.formatNumber(buffer.sampleRate) + ' Hz' });
                    rows.push({ label: 'Channels', value: buffer.numberOfChannels === 1 ? 'Mono' : buffer.numberOfChannels === 2 ? 'Stereo' : String(buffer.numberOfChannels) });
                    rows.push({ label: 'Peak level', value: peak > 0 ? (20 * Math.log10(peak)).toFixed(1) + ' dBFS' : 'silent' });
                    rows.push({ label: 'Average level (RMS)', value: rms > 0 ? (20 * Math.log10(rms)).toFixed(1) + ' dBFS' : 'silent' });
                    rows.push({ label: 'Clipping', value: peak >= 0.999 ? 'Yes — the signal reaches full scale' : 'No' });
                } catch (e) {
                    rows.push({ label: 'Audio', value: 'No decodable audio track found.' });
                }
            }

            ctx.progress(1);
            results.unshift(ZT.dataResult(rows, { title: 'Media properties', columns: 2 }));
            return results;
        }
    });

    function aspectLabel(w, h) {
        function gcd(a, b) { return b ? gcd(b, a % b) : a; }
        var g = gcd(w, h) || 1;
        var rw = w / g, rh = h / g;
        return (rw > 40 || rh > 40) ? (w / h).toFixed(2) + ':1' : rw + ':' + rh;
    }


    /* ============================================================
       Screen recorder
       ============================================================ */
    define({
        id: 'screen-recorder',
        name: 'Screen Recorder',
        category: 'media',
        icon: 'monitor',
        description: 'Record your screen, a window or a browser tab and save it as a video.',
        tags: ['screen recorder', 'record screen', 'capture', 'screencast', 'video', 'demo'],
        input: 'none',
        popular: true,
        options: [
            {
                id: 'source', type: 'select', label: 'Record', value: 'prompt',
                options: [{ value: 'prompt', label: 'Let me choose when recording starts' }],
                help: 'Your browser asks which screen, window or tab to share — this page never sees the list.'
            },
            { id: 'audio', type: 'checkbox', label: 'Record system audio', value: false, help: 'Only works when sharing a tab or a whole screen, and only in Chrome and Edge.' },
            { id: 'microphone', type: 'checkbox', label: 'Record microphone', value: false },
            {
                id: 'quality', type: 'select', label: 'Quality', value: '2500000',
                options: [
                    { value: '1000000', label: 'Low — 1 Mbps, small files' },
                    { value: '2500000', label: 'Medium — 2.5 Mbps' },
                    { value: '5000000', label: 'High — 5 Mbps' },
                    { value: '8000000', label: 'Very high — 8 Mbps' }
                ]
            },
            { id: 'max-duration', type: 'number', label: 'Stop automatically after', suffix: 'seconds', value: 300, min: 5, max: 3600, help: 'A safety limit. You can always stop earlier.' },
            { id: 'note', type: 'note', text: 'The recording is held in this tab and written to a file on your device. It is never uploaded. Press Run to start, then use the Stop button that appears — or your browser\'s own "Stop sharing" bar.' }
        ],
        run: async function (ctx) {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                ZT.fail('This browser cannot capture the screen. Chrome, Edge and Firefox on desktop support it; mobile browsers generally do not.');
            }

            var o = ctx.opt;
            var stream;
            try {
                stream = await navigator.mediaDevices.getDisplayMedia({
                    video: { frameRate: 30 },
                    audio: o.audio
                });
            } catch (err) {
                if (err.name === 'NotAllowedError') ZT.fail('Screen sharing was cancelled or blocked.');
                ZT.fail('Could not start screen capture: ' + err.message);
            }

            // Mix the microphone in as a second track if asked for.
            if (o.microphone) {
                try {
                    var mic = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mic.getAudioTracks().forEach(function (track) { stream.addTrack(track); });
                } catch (err) {
                    ZT.toast('Continuing without the microphone — permission was refused.', 'error');
                }
            }

            var mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
                .filter(function (t) { return MediaRecorder.isTypeSupported(t); })[0] || 'video/webm';

            var recorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                videoBitsPerSecond: parseInt(o.quality, 10)
            });

            var chunks = [];
            recorder.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };

            var startedAt = Date.now();
            var stopButton = ZT.el('button', {
                class: 'zt-btn zt-btn--danger zt-btn--lg',
                type: 'button',
                text: 'Stop recording'
            });
            var timer = ZT.el('span', { class: 'zt-field__help', text: 'Recording…' });
            var panel = ZT.el('div', { class: 'zt-row' }, [stopButton, timer]);

            ctx.progress(null, 'Recording — press Stop when you are done');
            ZT.toast('Recording started.', 'success');

            var done = new Promise(function (resolve) {
                recorder.onstop = resolve;
                stopButton.addEventListener('click', function () {
                    if (recorder.state !== 'inactive') recorder.stop();
                });
                // The browser's own "Stop sharing" bar ends the track directly.
                stream.getVideoTracks()[0].addEventListener('ended', function () {
                    if (recorder.state !== 'inactive') recorder.stop();
                });
                setTimeout(function () {
                    if (recorder.state !== 'inactive') recorder.stop();
                }, o.maxDuration * 1000);
            });

            var tick = setInterval(function () {
                timer.textContent = 'Recording — ' + ZT.formatDuration((Date.now() - startedAt) / 1000);
            }, 500);

            recorder.start(1000);

            // Show the stop control while the recording runs.
            var host = ZT.$('#zt-results');
            if (host) {
                host.innerHTML = '';
                host.appendChild(ZT.el('div', { class: 'zt-result' }, [
                    ZT.el('div', { class: 'zt-result__head' }, [ZT.el('span', { class: 'zt-result__title', text: 'Recording in progress' })]),
                    ZT.el('div', { class: 'zt-result__body' }, panel)
                ]));
            }

            await done;
            clearInterval(tick);
            stream.getTracks().forEach(function (track) { track.stop(); });

            var blob = new Blob(chunks, { type: mimeType });
            var seconds = (Date.now() - startedAt) / 1000;
            ctx.progress(1);

            if (!blob.size) ZT.fail('Nothing was recorded. The capture may have been stopped before it began.');

            return [
                ZT.dataResult([
                    { label: 'Length', value: ZT.formatDuration(seconds) },
                    { label: 'Size', value: ZT.formatBytes(blob.size) },
                    { label: 'Format', value: 'WebM' },
                    { label: 'Average bitrate', value: ZT.formatBytes(blob.size / seconds) + '/s' }
                ], { title: 'Recording', columns: 2 }),
                ZT.fileResult(blob, 'screen-recording-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.webm', {
                    previewKind: 'video',
                    note: ZT.formatDuration(seconds) + ' · ' + ZT.formatBytes(blob.size)
                })
            ];
        }
    });

    /* ============================================================
       Audio recorder
       ============================================================ */
    define({
        id: 'audio-recorder',
        name: 'Voice & Audio Recorder',
        category: 'media',
        icon: 'mic',
        description: 'Record from your microphone and save it as MP3 or WAV.',
        tags: ['audio recorder', 'voice recorder', 'record', 'microphone', 'mp3', 'dictation'],
        input: 'none',
        popular: true,
        options: [
            FORMAT_OPTION, BITRATE_OPTION,
            { id: 'max-duration', type: 'number', label: 'Stop automatically after', suffix: 'seconds', value: 300, min: 5, max: 3600 },
            { id: 'echo-cancellation', type: 'checkbox', label: 'Echo cancellation', value: true },
            { id: 'noise-suppression', type: 'checkbox', label: 'Noise suppression', value: true },
            { id: 'normalise', type: 'checkbox', label: 'Normalise the volume afterwards', value: true },
            { id: 'note', type: 'note', text: 'Audio is captured and encoded in this tab, then written to a file on your device. Nothing is uploaded and no recording is kept once you close the page.' }
        ],
        run: async function (ctx) {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                ZT.fail('This browser cannot access a microphone.');
            }

            var o = ctx.opt;
            var stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: o.echoCancellation,
                        noiseSuppression: o.noiseSuppression
                    }
                });
            } catch (err) {
                if (err.name === 'NotAllowedError') ZT.fail('Microphone access was refused.');
                if (err.name === 'NotFoundError') ZT.fail('No microphone was found on this device.');
                ZT.fail('Could not open the microphone: ' + err.message);
            }

            var recorder = new MediaRecorder(stream);
            var chunks = [];
            recorder.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };

            var startedAt = Date.now();
            var level = ZT.el('div', { class: 'zt-meter zt-meter--good' }, ZT.el('div', { class: 'zt-meter__bar', style: { width: '0%' } }));
            var timer = ZT.el('span', { class: 'zt-field__help', text: 'Recording…' });
            var stopButton = ZT.el('button', { class: 'zt-btn zt-btn--danger zt-btn--lg', type: 'button', text: 'Stop recording' });

            // A live level meter, so the user can see the mic is actually working.
            var AudioContextClass = window.AudioContext || window.webkitAudioContext;
            var meterContext = new AudioContextClass();
            var analyser = meterContext.createAnalyser();
            analyser.fftSize = 512;
            meterContext.createMediaStreamSource(stream).connect(analyser);
            var samples = new Uint8Array(analyser.frequencyBinCount);

            var running = true;
            (function paint() {
                if (!running) return;
                analyser.getByteFrequencyData(samples);
                var sum = 0;
                for (var i = 0; i < samples.length; i++) sum += samples[i];
                var average = sum / samples.length / 255;
                level.firstChild.style.width = Math.min(100, average * 220) + '%';
                requestAnimationFrame(paint);
            })();

            var host = ZT.$('#zt-results');
            if (host) {
                host.innerHTML = '';
                host.appendChild(ZT.el('div', { class: 'zt-result' }, [
                    ZT.el('div', { class: 'zt-result__head' }, [ZT.el('span', { class: 'zt-result__title', text: 'Recording' })]),
                    ZT.el('div', { class: 'zt-result__body' }, [
                        level,
                        ZT.el('div', { class: 'zt-row', style: { marginTop: '14px' } }, [stopButton, timer])
                    ])
                ]));
            }

            ctx.progress(null, 'Recording — press Stop when you are done');

            var done = new Promise(function (resolve) {
                recorder.onstop = resolve;
                stopButton.addEventListener('click', function () {
                    if (recorder.state !== 'inactive') recorder.stop();
                });
                setTimeout(function () {
                    if (recorder.state !== 'inactive') recorder.stop();
                }, o.maxDuration * 1000);
            });

            var tick = setInterval(function () {
                timer.textContent = ZT.formatDuration((Date.now() - startedAt) / 1000);
            }, 500);

            recorder.start();
            await done;

            running = false;
            clearInterval(tick);
            stream.getTracks().forEach(function (t) { t.stop(); });
            if (meterContext.close) meterContext.close();

            var raw = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
            if (!raw.size) ZT.fail('Nothing was recorded.');

            ctx.progress(0.4, 'Decoding');
            var buffer = await decodeAudio(new File([raw], 'recording.webm', { type: raw.type }));
            if (o.normalise) normaliseBuffer(buffer);

            ctx.progress(0.6, 'Encoding to ' + o.format.toUpperCase());
            var blob = await exportAudio(buffer, o.format, parseInt(o.bitrate, 10), function (p) {
                ctx.progress(0.6 + p * 0.4);
            });
            ctx.progress(1);

            return [
                ZT.dataResult([
                    { label: 'Length', value: ZT.formatDuration(buffer.duration) },
                    { label: 'Sample rate', value: ZT.formatNumber(buffer.sampleRate) + ' Hz' },
                    { label: 'Channels', value: buffer.numberOfChannels === 1 ? 'Mono' : 'Stereo' },
                    { label: 'Size', value: ZT.formatBytes(blob.size) }
                ], { title: 'Recording', columns: 2 }),
                ZT.fileResult(blob, 'recording-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.' + o.format, {
                    previewBlob: blob, previewKind: 'audio',
                    note: ZT.formatDuration(buffer.duration) + ' · ' + ZT.formatBytes(blob.size)
                })
            ];
        }
    });

    /* ============================================================
       Text to speech
       ============================================================ */
    define({
        id: 'text-to-speech',
        name: 'Text to Speech',
        category: 'media',
        icon: 'audio-waveform',
        description: 'Read text aloud using the voices installed on your device.',
        tags: ['text to speech', 'tts', 'read aloud', 'voice', 'speech', 'accessibility', 'proofread'],
        input: 'text',
        placeholder: 'Type or paste the text you want read aloud…',
        options: [
            { id: 'voice', type: 'select', label: 'Voice', value: 'default', options: [{ value: 'default', label: 'System default' }] },
            { id: 'rate', type: 'range', label: 'Speed', value: 1, min: 0.5, max: 2, step: 0.05, suffix: '×' },
            { id: 'pitch', type: 'range', label: 'Pitch', value: 1, min: 0, max: 2, step: 0.1 },
            { id: 'volume', type: 'range', label: 'Volume', value: 100, min: 0, max: 100, step: 5, suffix: '%' },
            { id: 'note', type: 'note', text: 'Speech is produced by your operating system, so the available voices are the ones installed on your device and nothing is sent anywhere. Browsers do not expose the generated audio to the page, so there is no way to offer a download — for a file, record the output with the Voice Recorder while it plays.' }
        ],
        // The voice list is only available after the browser has loaded it.
        refreshOptions: function (opt, schema) {
            if (!window.speechSynthesis) return opt;
            var voices = window.speechSynthesis.getVoices();
            var field = schema.filter(function (o) { return o.id === 'voice'; })[0];
            if (field && voices.length) {
                field.options = [{ value: 'default', label: 'System default' }].concat(
                    voices.map(function (v) {
                        return { value: v.voiceURI, label: v.name + '  (' + v.lang + ')' + (v.localService ? '' : ' — network') };
                    })
                );
            }
            return opt;
        },
        run: function (ctx) {
            if (!window.speechSynthesis) {
                ZT.fail('This browser does not support speech synthesis.');
            }

            var text = String(ctx.text || '').trim();
            if (!text) {
                return ZT.dataResult([{ label: 'Waiting for input', value: 'Type some text above.' }], { title: 'Text to speech' });
            }

            var o = ctx.opt;
            var synth = window.speechSynthesis;
            synth.cancel();

            var utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = o.rate;
            utterance.pitch = o.pitch;
            utterance.volume = o.volume / 100;

            if (o.voice !== 'default') {
                var match = synth.getVoices().filter(function (v) { return v.voiceURI === o.voice; })[0];
                if (match) utterance.voice = match;
            }

            var status = ZT.el('span', { class: 'zt-field__help', text: 'Speaking…' });

            var pause = ZT.el('button', { class: 'zt-btn zt-btn--outline', type: 'button', text: 'Pause' });
            pause.addEventListener('click', function () {
                if (synth.paused) { synth.resume(); pause.textContent = 'Pause'; }
                else { synth.pause(); pause.textContent = 'Resume'; }
            });

            var stop = ZT.el('button', { class: 'zt-btn zt-btn--danger', type: 'button', text: 'Stop' });
            stop.addEventListener('click', function () {
                synth.cancel();
                status.textContent = 'Stopped.';
            });

            utterance.onend = function () { status.textContent = 'Finished.'; };
            utterance.onerror = function () { status.textContent = 'Playback failed.'; };

            synth.speak(utterance);

            var words = text.split(/\s+/).length;
            var panel = ZT.el('div', {}, [
                ZT.el('div', { class: 'zt-row' }, [pause, stop, status])
            ]);

            return [
                ZT.nodeResult(panel, { title: 'Playback' }),
                ZT.dataResult([
                    { label: 'Words', value: ZT.formatNumber(words) },
                    { label: 'Estimated length', value: ZT.formatDuration(words / (150 * o.rate) * 60) },
                    { label: 'Voice', value: utterance.voice ? utterance.voice.name : 'system default' },
                    { label: 'Saving a file', value: 'Browsers keep synthesised speech out of reach of the page, so it cannot be downloaded here. Run the Voice Recorder alongside this to capture it.' }
                ], { title: 'Details', columns: 2 })
            ];
        }
    });

    /* ============================================================
       GIF maker
       ============================================================ */
    define({
        id: 'gif-maker',
        name: 'GIF Maker',
        category: 'media',
        icon: 'film',
        description: 'Turn a set of images into an animated GIF.',
        tags: ['gif', 'animated gif', 'maker', 'images to gif', 'animation', 'slideshow'],
        input: 'files',
        accept: 'image/*',
        popular: true,
        heavy: true,
        maxFiles: 200,
        options: [
            { id: 'fps', type: 'range', label: 'Frame rate', value: 5, min: 1, max: 30, step: 1, suffix: 'fps' },
            { id: 'width', type: 'number', label: 'Output width', suffix: 'px', value: 480, min: 40, max: 1600, help: 'Height follows the first image. Width is the biggest lever on file size.' },
            {
                id: 'quality', type: 'select', label: 'Colour quality', value: '10',
                options: [
                    { value: '1', label: 'Best — slowest, largest' },
                    { value: '10', label: 'Balanced' },
                    { value: '20', label: 'Fast — smallest' }
                ]
            },
            { id: 'loop', type: 'checkbox', label: 'Loop forever', value: true },
            { id: 'reverse', type: 'checkbox', label: 'Reverse the order', value: false },
            { id: 'boomerang', type: 'checkbox', label: 'Play forwards then backwards', value: false },
            {
                id: 'order', type: 'select', label: 'Frame order', value: 'name-asc',
                options: [
                    { value: 'name-asc', label: 'File name (A → Z)' },
                    { value: 'as-listed', label: 'The order files are listed' },
                    { value: 'name-desc', label: 'File name (Z → A)' }
                ]
            },
            { id: 'background', type: 'color', label: 'Background for transparency', value: '#FFFFFF' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            if (ctx.files.length < 2) ZT.fail('Add at least two images to animate.');

            ctx.progress(0.02, 'Loading the encoder');
            await ZT.loadScript(ZT.CDN.gifJs);
            if (!window.GIF) ZT.fail('The GIF encoder could not be loaded. Check your connection and retry.');

            var files = ctx.files.slice();
            if (o.order === 'name-asc') files.sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });
            else if (o.order === 'name-desc') files.sort(function (a, b) { return b.name.localeCompare(a.name, undefined, { numeric: true }); });
            if (o.reverse) files.reverse();

            var first = await ZT.loadImage(files[0]);
            var firstSize = ZT.imageSize(first);
            var width = o.width;
            var height = Math.round(firstSize.height * (width / firstSize.width));

            var workerResponse = await fetch(ZT.CDN.gifWorker);
            var workerUrl = URL.createObjectURL(await workerResponse.blob());

            var gif = new window.GIF({
                workers: 2,
                quality: parseInt(o.quality, 10),
                width: width,
                height: height,
                workerScript: workerUrl,
                repeat: o.loop ? 0 : -1
            });

            var canvas = ZT.makeCanvas(width, height);
            var c2d = canvas.getContext('2d');
            var delay = Math.round(1000 / o.fps);

            var order = files.slice();
            if (o.boomerang) {
                // Skip the endpoints on the way back so they do not stutter.
                order = order.concat(files.slice(1, -1).reverse());
            }

            for (var i = 0; i < order.length; i++) {
                if (ctx.signal && ctx.signal.aborted) ZT.fail('Cancelled.');
                ctx.progress(0.05 + (i / order.length) * 0.55, 'Frame ' + (i + 1) + ' of ' + order.length);

                var bitmap = await ZT.loadImage(order[i]);
                var size = ZT.imageSize(bitmap);

                c2d.fillStyle = o.background;
                c2d.fillRect(0, 0, width, height);

                // Fit each frame inside the canvas so mixed sizes still line up.
                var fit = ZT.fitInside(size.width, size.height, width, height);
                c2d.drawImage(bitmap, (width - fit.width) / 2, (height - fit.height) / 2, fit.width, fit.height);

                gif.addFrame(c2d, { copy: true, delay: delay });
                if (bitmap.close) bitmap.close();
            }

            ctx.progress(0.62, 'Encoding GIF');
            var blob = await new Promise(function (resolve, reject) {
                gif.on('progress', function (p) { ctx.progress(0.62 + p * 0.36, 'Encoding GIF'); });
                gif.on('finished', resolve);
                gif.on('abort', function () { reject(ZT.ToolError('GIF encoding was aborted.')); });
                gif.render();
            });

            URL.revokeObjectURL(workerUrl);
            ctx.progress(1);

            return ZT.fileResult(blob, 'animation.gif', {
                previewBlob: blob,
                note: width + '×' + height + ' · ' + order.length + ' frames · ' + o.fps + ' fps · ' + ZT.formatBytes(blob.size)
            });
        }
    });

})();
