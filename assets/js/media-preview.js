window.ZyncMediaPreview = (function() {
    'use strict';

    // ============================================================
    //  UTILITIES
    // ============================================================
    function formatTime(seconds) {
        if (!isFinite(seconds) || seconds < 0) seconds = 0;
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return h > 0 ? `${String(h).padStart(2, '0')}:${mmss}` : mmss;
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function estimateGifSize(width, height, fps, duration) {
        const frames = Math.floor(fps * duration);
        const bytesPerFrame = width * height * 0.5;
        return frames * bytesPerFrame;
    }

    function estimateVideoSize(bitrate, duration) {
        return Math.floor((bitrate / 8) * duration);
    }

    // ============================================================
    //  FFT HELPERS
    // ============================================================
    function fft(reals) {
        const N = reals.length;
        if (N <= 1) return reals.map(r => ({ re: r, im: 0, mag: Math.abs(r) }));

        const bits = Math.log2(N);
        const reversed = new Array(N);
        for (let i = 0; i < N; i++) {
            let rev = 0;
            for (let j = 0; j < bits; j++) {
                rev = (rev << 1) | ((i >> j) & 1);
            }
            reversed[i] = { re: reals[rev], im: 0 };
        }

        for (let len = 2; len <= N; len *= 2) {
            const halfLen = len / 2;
            const angle = -2 * Math.PI / len;
            const wRe = Math.cos(angle);
            const wIm = Math.sin(angle);
            for (let i = 0; i < N; i += len) {
                let wCurRe = 1, wCurIm = 0;
                for (let j = 0; j < halfLen; j++) {
                    const tRe = wCurRe * reversed[i + j + halfLen].re - wCurIm * reversed[i + j + halfLen].im;
                    const tIm = wCurRe * reversed[i + j + halfLen].im + wCurIm * reversed[i + j + halfLen].re;
                    const uRe = reversed[i + j].re;
                    const uIm = reversed[i + j].im;
                    reversed[i + j] = { re: uRe + tRe, im: uIm + tIm };
                    reversed[i + j + halfLen] = { re: uRe - tRe, im: uIm - tIm };
                    const newWRe = wCurRe * wRe - wCurIm * wIm;
                    const newWIm = wCurRe * wIm + wCurIm * wRe;
                    wCurRe = newWRe;
                    wCurIm = newWIm;
                }
            }
        }
        return reversed.map(v => ({ re: v.re, im: v.im, mag: Math.sqrt(v.re * v.re + v.im * v.im) }));
    }

    function getFrequencyData(channelData, fftSize) {
        const size = Math.min(fftSize, 65536);
        const samples = new Array(size);
        const step = Math.max(1, Math.floor(channelData.length / size));
        for (let i = 0; i < size; i++) {
            samples[i] = channelData[i * step] || 0;
        }
        const spectrum = fft(samples);
        const half = Math.floor(size / 2);
        const result = new Array(half);
        for (let i = 0; i < half; i++) {
            result[i] = spectrum[i].mag / size;
        }
        return result;
    }

    // ============================================================
    //  WaveformDrawer
    // ============================================================
    class WaveformDrawer {
        static drawWaveform(canvas, audioBuffer, options = {}) {
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            const {
                color = '#4a90d9',
                backgroundColor = 'transparent',
                progressColor = '#ff6b6b',
                barWidth = 2,
                barGap = 1,
                mirror = true,
                progress = 0
            } = options;

            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);

            const channelData = audioBuffer.getChannelData(0);
            const step = Math.max(1, Math.ceil(channelData.length / width));
            const amp = height / (mirror ? 2 : 1);
            const centerY = mirror ? height / 2 : height;

            for (let i = 0; i < width; i++) {
                let min = 1.0;
                let max = -1.0;
                for (let j = 0; j < step; j++) {
                    const idx = i * step + j;
                    if (idx >= channelData.length) break;
                    const datum = channelData[idx];
                    if (datum < min) min = datum;
                    if (datum > max) max = datum;
                }

                const barH = Math.max(1, (max - min) * amp);
                const x = i * (barWidth + barGap);
                const useProgress = (i / width) <= progress;
                ctx.fillStyle = useProgress ? progressColor : color;

                if (mirror) {
                    ctx.fillRect(x, centerY - barH / 2, barWidth, barH);
                } else {
                    ctx.fillRect(x, centerY - barH, barWidth, barH);
                }
            }
        }

        static drawStereoWaveform(canvas, leftChannel, rightChannel, options = {}) {
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            const halfH = height / 2;
            const {
                color = '#4a90d9',
                backgroundColor = 'transparent',
                barWidth = 2,
                barGap = 1
            } = options;

            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = color;

            // Left channel (top half)
            const stepL = Math.max(1, Math.ceil(leftChannel.length / width));
            const ampL = halfH / 2;
            for (let i = 0; i < width; i++) {
                let min = 1.0, max = -1.0;
                for (let j = 0; j < stepL; j++) {
                    const idx = i * stepL + j;
                    if (idx >= leftChannel.length) break;
                    const d = leftChannel[idx];
                    if (d < min) min = d;
                    if (d > max) max = d;
                }
                const barH = Math.max(1, (max - min) * ampL);
                const x = i * (barWidth + barGap);
                ctx.fillRect(x, halfH / 2 - barH / 2, barWidth, barH);
            }

            // Right channel (bottom half)
            const stepR = Math.max(1, Math.ceil(rightChannel.length / width));
            const ampR = halfH / 2;
            for (let i = 0; i < width; i++) {
                let min = 1.0, max = -1.0;
                for (let j = 0; j < stepR; j++) {
                    const idx = i * stepR + j;
                    if (idx >= rightChannel.length) break;
                    const d = rightChannel[idx];
                    if (d < min) min = d;
                    if (d > max) max = d;
                }
                const barH = Math.max(1, (max - min) * ampR);
                const x = i * (barWidth + barGap);
                ctx.fillRect(x, halfH + halfH / 2 - barH / 2, barWidth, barH);
            }
        }

        static drawFrequencyBars(canvas, audioBuffer, options = {}) {
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            const {
                color = '#4a90d9',
                backgroundColor = 'transparent',
                barWidth = 4,
                barGap = 2,
                barCount = 64
            } = options;

            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);

            const channelData = audioBuffer.getChannelData(0);
            const freqData = getFrequencyData(channelData, 32768);

            const totalBarWidth = barWidth + barGap;
            const count = Math.min(barCount, Math.floor(width / totalBarWidth));
            const step = Math.max(1, Math.floor(freqData.length / count));

            ctx.fillStyle = color;
            for (let i = 0; i < count; i++) {
                let sum = 0;
                for (let j = 0; j < step; j++) {
                    sum += freqData[i * step + j] || 0;
                }
                const avg = sum / step;
                const barH = Math.max(1, avg * height * 5);
                const x = i * totalBarWidth;
                ctx.fillRect(x, height - barH, barWidth, barH);
            }
        }

        static drawCircularVisualizer(canvas, audioBuffer, options = {}) {
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            const {
                color = '#4a90d9',
                backgroundColor = 'transparent',
                barCount = 64,
                innerRadius = 40
            } = options;

            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);

            const channelData = audioBuffer.getChannelData(0);
            const freqData = getFrequencyData(channelData, 32768);

            const cx = width / 2;
            const cy = height / 2;
            const maxRadius = Math.min(width, height) / 2 - 10;
            const count = Math.min(barCount, freqData.length);
            const step = Math.max(1, Math.floor(freqData.length / count));

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            for (let i = 0; i < count; i++) {
                let sum = 0;
                for (let j = 0; j < step; j++) sum += freqData[i * step + j] || 0;
                const avg = sum / step;
                const r = innerRadius + avg * (maxRadius - innerRadius) * 2;
                const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
                const x1 = cx + Math.cos(angle) * innerRadius;
                const y1 = cy + Math.sin(angle) * innerRadius;
                const x2 = cx + Math.cos(angle) * r;
                const y2 = cy + Math.sin(angle) * r;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }

        static drawParticles(canvas, audioBuffer, options = {}) {
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            const {
                color = '#4a90d9',
                backgroundColor = 'transparent',
                count = 120,
                baseSize = 2
            } = options;

            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);

            const channelData = audioBuffer.getChannelData(0);
            const freqData = getFrequencyData(channelData, 32768);

            ctx.fillStyle = color;
            for (let i = 0; i < count; i++) {
                const idx = Math.floor(Math.random() * freqData.length);
                const energy = Math.min(1, freqData[idx] * 30);
                const x = Math.random() * width;
                const y = Math.random() * height;
                const s = baseSize + energy * 6;
                ctx.globalAlpha = 0.4 + energy * 0.6;
                ctx.beginPath();
                ctx.arc(x, y, s, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    }

    // ============================================================
    //  MediaMetadata
    // ============================================================
    class MediaMetadata {
        static getVideoMetadata(file) {
            return new Promise((resolve, reject) => {
                if (!(file instanceof File)) return reject(new Error('Invalid file'));

                const video = document.createElement('video');
                video.preload = 'metadata';
                const url = URL.createObjectURL(file);

                const cleanup = () => URL.revokeObjectURL(url);

                video.onloadedmetadata = () => {
                    cleanup();
                    resolve({
                        duration: video.duration,
                        width: video.videoWidth,
                        height: video.videoHeight,
                        fpsEstimate: 30,
                        bitrateEstimate: video.duration ? Math.floor(file.size / video.duration) : 0,
                        codecHint: file.type || 'unknown',
                        mimeType: file.type || 'unknown'
                    });
                };

                video.onerror = () => {
                    cleanup();
                    reject(new Error('Failed to load video metadata'));
                };

                video.src = url;
            });
        }

        static getAudioMetadata(file) {
            return new Promise((resolve, reject) => {
                if (!(file instanceof File)) return reject(new Error('Invalid file'));

                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                        const audioBuffer = await audioCtx.decodeAudioData(e.target.result.slice(0));
                        const meta = {
                            duration: audioBuffer.duration,
                            sampleRate: audioBuffer.sampleRate,
                            channels: audioBuffer.numberOfChannels,
                            bitrate: audioBuffer.duration ? Math.floor((file.size * 8) / audioBuffer.duration) : 0,
                            codecHint: file.type || 'unknown',
                            mimeType: file.type || 'unknown'
                        };
                        audioCtx.close();
                        resolve(meta);
                    } catch (err) {
                        reject(new Error('Failed to decode audio: ' + err.message));
                    }
                };
                reader.onerror = () => reject(new Error('Failed to read audio file'));
                reader.readAsArrayBuffer(file);
            });
        }

        static extractThumbnail(file, time) {
            return new Promise((resolve, reject) => {
                if (!(file instanceof File)) return reject(new Error('Invalid file'));
                if (!isFinite(time) || time < 0) time = 0;

                const video = document.createElement('video');
                video.preload = 'auto';
                const url = URL.createObjectURL(file);
                video.src = url;
                video.currentTime = time;

                const cleanup = () => URL.revokeObjectURL(url);

                video.onseeked = () => {
                    try {
                        const w = video.videoWidth || 320;
                        const h = video.videoHeight || 240;
                        const canvas = document.createElement('canvas');
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(video, 0, 0, w, h);
                        canvas.toBlob((blob) => {
                            cleanup();
                            if (blob) resolve(blob);
                            else reject(new Error('Failed to create thumbnail blob'));
                        }, 'image/png');
                    } catch (err) {
                        cleanup();
                        reject(err);
                    }
                };

                video.onerror = () => {
                    cleanup();
                    reject(new Error('Failed to load video for thumbnail extraction'));
                };
            });
        }
    }

    // ============================================================
    //  MediaPreviewUI
    // ============================================================
    class MediaPreviewUI {
        constructor(containerId) {
            this.container = document.getElementById(containerId);
            if (!this.container) throw new Error(`Container #${containerId} not found`);
            this.mountedElements = [];
            this._onReplace = null;
            this._onReset = null;
            this._onRetry = null;
        }

        _mount(el) {
            this.container.appendChild(el);
            this.mountedElements.push(el);
            return el;
        }

        clear() {
            this.mountedElements.forEach(el => {
                if (el && el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            });
            this.mountedElements = [];
        }

        mountVideoPlayer(src, type) {
            const wrapper = document.createElement('div');
            wrapper.className = 'zync-media-preview-video';

            const video = document.createElement('video');
            video.src = src;
            video.type = type || 'video/mp4';
            video.controls = false;
            video.style.cssText = 'width:100%;max-height:400px;background:#000;display:block;';
            video.setAttribute('tabindex', '0');
            wrapper.appendChild(video);

            const controls = document.createElement('div');
            controls.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;background:#1a1a1a;color:#fff;font-family:monospace;flex-wrap:wrap;';

            const playBtn = document.createElement('button');
            playBtn.textContent = '▶';
            playBtn.style.cssText = 'cursor:pointer;background:#333;color:#fff;border:none;padding:6px 10px;border-radius:4px;';

            const seekBar = document.createElement('input');
            seekBar.type = 'range';
            seekBar.min = 0;
            seekBar.max = 100;
            seekBar.value = 0;
            seekBar.style.cssText = 'flex:1;min-width:60px;';

            const timeDisplay = document.createElement('span');
            timeDisplay.textContent = '00:00 / 00:00';
            timeDisplay.style.cssText = 'font-size:12px;min-width:90px;text-align:center;';

            const volumeSlider = document.createElement('input');
            volumeSlider.type = 'range';
            volumeSlider.min = 0;
            volumeSlider.max = 1;
            volumeSlider.step = 0.1;
            volumeSlider.value = 1;
            volumeSlider.style.cssText = 'width:60px;';

            const muteBtn = document.createElement('button');
            muteBtn.textContent = '🔊';
            muteBtn.style.cssText = 'cursor:pointer;background:#333;color:#fff;border:none;padding:4px 6px;border-radius:4px;';

            const fsBtn = document.createElement('button');
            fsBtn.textContent = '⛶';
            fsBtn.style.cssText = 'cursor:pointer;background:#333;color:#fff;border:none;padding:4px 6px;border-radius:4px;';

            controls.append(playBtn, seekBar, timeDisplay, volumeSlider, muteBtn, fsBtn);
            wrapper.appendChild(controls);
            this._mount(wrapper);

            const updateTime = () => {
                timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration || 0)}`;
                if (video.duration && isFinite(video.duration)) {
                    seekBar.value = (video.currentTime / video.duration) * 100;
                }
            };

            playBtn.onclick = () => {
                if (video.paused) video.play().catch(() => {});
                else video.pause();
            };

            video.onplay = () => { playBtn.textContent = '⏸'; };
            video.onpause = () => { playBtn.textContent = '▶'; };
            video.ontimeupdate = updateTime;
            video.onloadedmetadata = updateTime;

            seekBar.oninput = () => {
                if (video.duration && isFinite(video.duration)) {
                    video.currentTime = (seekBar.value / 100) * video.duration;
                }
            };

            volumeSlider.oninput = () => { video.volume = volumeSlider.value; };

            muteBtn.onclick = () => {
                video.muted = !video.muted;
                muteBtn.textContent = video.muted ? '🔇' : '🔊';
            };

            fsBtn.onclick = () => {
                if (video.requestFullscreen) video.requestFullscreen().catch(() => {});
                else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
            };

            const keyHandler = (e) => {
                const key = e.key.toLowerCase();
                if (key === ' ' || key === 'spacebar') {
                    e.preventDefault();
                    playBtn.onclick();
                } else if (key === 'arrowleft') {
                    e.preventDefault();
                    video.currentTime = Math.max(0, video.currentTime - 5);
                } else if (key === 'arrowright') {
                    e.preventDefault();
                    video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
                } else if (key === 'm') {
                    muteBtn.onclick();
                } else if (key === 'f') {
                    fsBtn.onclick();
                }
            };

            video.addEventListener('keydown', keyHandler);

            return wrapper;
        }

        mountAudioPlayer(file, audioBuffer) {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'position:relative;width:100%;';

            const timeInfo = document.createElement('div');
            timeInfo.style.cssText = 'font-family:monospace;font-size:12px;margin-bottom:4px;color:#fff;';
            timeInfo.textContent = `${formatTime(0)} / ${formatTime(audioBuffer.duration)}`;
            wrapper.appendChild(timeInfo);

            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 100;
            canvas.style.cssText = 'width:100%;height:100px;background:#111;cursor:pointer;border-radius:4px;';
            wrapper.appendChild(canvas);

            const audio = new Audio(URL.createObjectURL(file));
            audio.preload = 'auto';
            wrapper.appendChild(audio);

            const playhead = document.createElement('div');
            playhead.style.cssText = 'position:absolute;top:0;left:0;width:3px;height:100%;background:#ff6b6b;pointer-events:none;transition:left 0.05s linear;';
            wrapper.appendChild(playhead);

            this._mount(wrapper);

            const drawProgress = (pct) => {
                WaveformDrawer.drawWaveform(canvas, audioBuffer, { color: '#4a90d9', progress: pct });
                playhead.style.left = (pct * 100) + '%';
                timeInfo.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration || 0)}`;
            };

            const raf = () => {
                if (!audio.paused && audio.duration) {
                    drawProgress(audio.currentTime / audio.duration);
                    requestAnimationFrame(raf);
                }
            };

            canvas.onclick = (e) => {
                const rect = canvas.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                if (audio.duration) {
                    audio.currentTime = pct * audio.duration;
                    drawProgress(pct);
                }
            };

            audio.onplay = () => raf();
            audio.onloadedmetadata = () => {
                timeInfo.textContent = `${formatTime(0)} / ${formatTime(audio.duration || 0)}`;
                drawProgress(0);
            };

            return wrapper;
        }

        mountBeforeAfter(originalBlobUrl, processedBlobUrl, type) {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'position:relative;width:100%;overflow:hidden;user-select:none;border-radius:4px;';

            const img = document.createElement('img');
            img.src = originalBlobUrl;
            img.alt = 'Original';
            img.style.cssText = 'width:100%;display:block;pointer-events:none;';
            wrapper.appendChild(img);

            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:absolute;top:0;left:0;width:50%;height:100%;overflow:hidden;';

            const img2 = document.createElement('img');
            img2.src = processedBlobUrl;
            img2.alt = 'Processed';
            img2.style.cssText = 'width:200%;max-width:none;height:100%;display:block;pointer-events:none;';
            overlay.appendChild(img2);

            const slider = document.createElement('div');
            slider.style.cssText = 'position:absolute;top:0;left:50%;width:4px;height:100%;background:#fff;cursor:ew-resize;box-shadow:0 0 4px rgba(0,0,0,0.5);';

            wrapper.append(overlay, slider);
            this._mount(wrapper);

            let dragging = false;

            const onMove = (clientX) => {
                if (!dragging) return;
                const rect = wrapper.getBoundingClientRect();
                let x = (clientX - rect.left) / rect.width;
                x = Math.max(0, Math.min(1, x));
                overlay.style.width = (x * 100) + '%';
                slider.style.left = (x * 100) + '%';
            };

            slider.onmousedown = (e) => { dragging = true; e.preventDefault(); };
            window.addEventListener('mousemove', (e) => onMove(e.clientX));
            window.addEventListener('mouseup', () => { dragging = false; });

            slider.ontouchstart = (e) => { dragging = true; e.preventDefault(); };
            window.addEventListener('touchmove', (e) => {
                if (dragging && e.touches[0]) onMove(e.touches[0].clientX);
            }, { passive: true });
            window.addEventListener('touchend', () => { dragging = false; });

            return wrapper;
        }

        mountTimeline(startTime, endTime, onChange) {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'padding:12px;background:#1a1a1a;color:#fff;font-family:monospace;border-radius:4px;';

            const track = document.createElement('div');
            track.style.cssText = 'position:relative;height:32px;background:#333;border-radius:4px;cursor:pointer;';

            const selection = document.createElement('div');
            selection.style.cssText = 'position:absolute;top:0;height:100%;background:rgba(74,144,217,0.35);left:0;width:100%;';

            const handleStart = document.createElement('div');
            handleStart.style.cssText = 'position:absolute;top:0;width:14px;height:100%;background:#4a90d9;cursor:ew-resize;border-radius:2px;left:0;z-index:2;';

            const handleEnd = document.createElement('div');
            handleEnd.style.cssText = 'position:absolute;top:0;width:14px;height:100%;background:#4a90d9;cursor:ew-resize;border-radius:2px;left:100%;z-index:2;';

            track.append(selection, handleStart, handleEnd);
            wrapper.appendChild(track);
            this._mount(wrapper);

            let dragging = null;

            const update = () => {
                const s = parseFloat(handleStart.style.left) || 0;
                const e = parseFloat(handleEnd.style.left) || 100;
                selection.style.left = s + '%';
                selection.style.width = (e - s) + '%';
                if (typeof onChange === 'function') {
                    const dur = endTime - startTime;
                    onChange({
                        start: (s / 100) * dur + startTime,
                        end: (e / 100) * dur + startTime
                    });
                }
            };

            const onDown = (which, e) => { dragging = which; e.preventDefault(); e.stopPropagation(); };
            handleStart.onmousedown = (e) => onDown('start', e);
            handleEnd.onmousedown = (e) => onDown('end', e);

            window.addEventListener('mousemove', (e) => {
                if (!dragging) return;
                const rect = track.getBoundingClientRect();
                let pct = ((e.clientX - rect.left) / rect.width) * 100;
                pct = Math.max(0, Math.min(100, pct));
                if (dragging === 'start') handleStart.style.left = pct + '%';
                else handleEnd.style.left = pct + '%';
                update();
            });

            window.addEventListener('mouseup', () => { dragging = null; });

            update();
            return wrapper;
        }

        mountProcessingOverlay(progress, status) {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;z-index:100;';

            const barBg = document.createElement('div');
            barBg.style.cssText = 'width:220px;height:10px;background:#333;border-radius:5px;overflow:hidden;';
            const barFill = document.createElement('div');
            barFill.style.cssText = `width:${Math.max(0, Math.min(100, progress))}%;height:100%;background:linear-gradient(90deg,#4a90d9,#50e3c2);transition:width 0.3s;border-radius:5px;`;
            barBg.appendChild(barFill);

            const statusText = document.createElement('div');
            statusText.textContent = status || 'Processing...';
            statusText.style.cssText = 'margin-top:12px;font-family:monospace;font-size:13px;';

            const percentText = document.createElement('div');
            percentText.textContent = `${Math.floor(progress)}%`;
            percentText.style.cssText = 'font-family:monospace;font-size:11px;color:#aaa;margin-top:4px;';

            overlay.append(barBg, statusText, percentText);
            this._mount(overlay);

            return { overlay, setProgress(p) { barFill.style.width = Math.max(0, Math.min(100, p)) + '%'; percentText.textContent = Math.floor(p) + '%'; }, setStatus(s) { statusText.textContent = s; } };
        }

        mountResultCard(blob, filename, size) {
            const card = document.createElement('div');
            card.style.cssText = 'padding:16px;background:#1a1a1a;color:#fff;border-radius:8px;font-family:monospace;border:1px solid #333;';

            const name = document.createElement('div');
            name.textContent = filename || 'result';
            name.style.cssText = 'font-weight:bold;margin-bottom:4px;word-break:break-all;';

            const sizeText = document.createElement('div');
            sizeText.textContent = formatFileSize(size || blob.size);
            sizeText.style.cssText = 'font-size:12px;color:#aaa;margin-bottom:12px;';

            const actions = document.createElement('div');
            actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = 'Download';
            downloadBtn.style.cssText = 'padding:6px 14px;background:#4a90d9;color:#fff;border:none;border-radius:4px;cursor:pointer;';
            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = filename || 'result';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };

            const replaceBtn = document.createElement('button');
            replaceBtn.textContent = 'Replace';
            replaceBtn.style.cssText = 'padding:6px 14px;background:#333;color:#fff;border:none;border-radius:4px;cursor:pointer;';
            replaceBtn.onclick = () => { if (typeof this._onReplace === 'function') this._onReplace(blob); };

            const resetBtn = document.createElement('button');
            resetBtn.textContent = 'Reset';
            resetBtn.style.cssText = 'padding:6px 14px;background:#333;color:#fff;border:none;border-radius:4px;cursor:pointer;';
            resetBtn.onclick = () => { if (typeof this._onReset === 'function') this._onReset(); };

            actions.append(downloadBtn, replaceBtn, resetBtn);
            card.append(name, sizeText, actions);
            this._mount(card);

            return card;
        }

        mountErrorCard(message) {
            const card = document.createElement('div');
            card.style.cssText = 'padding:16px;background:#2a1a1a;color:#ff6b6b;border-radius:8px;font-family:monospace;border:1px solid #5a2a2a;';

            const msg = document.createElement('div');
            msg.textContent = message || 'An error occurred';
            msg.style.cssText = 'margin-bottom:8px;word-break:break-all;';

            const retryBtn = document.createElement('button');
            retryBtn.textContent = 'Retry';
            retryBtn.style.cssText = 'padding:6px 14px;background:#ff6b6b;color:#fff;border:none;border-radius:4px;cursor:pointer;';
            retryBtn.onclick = () => { if (typeof this._onRetry === 'function') this._onRetry(); };

            card.append(msg, retryBtn);
            this._mount(card);

            return card;
        }
    }

    // ============================================================
    //  TimelineSegmentEditor
    // ============================================================
    class TimelineSegmentEditor {
        constructor(canvas, duration) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.duration = duration || 0;
            this.segments = [];
        }

        addSegment(type, start, end, data) {
            this.segments.push({ type, start, end, data: data || {} });
            return this;
        }

        render() {
            const { ctx, canvas, duration, segments } = this;
            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            // Background
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 0, width, height);

            // Time markers
            ctx.fillStyle = '#444';
            ctx.font = '10px monospace';
            const markerCount = 10;
            for (let i = 0; i <= markerCount; i++) {
                const x = (i / markerCount) * width;
                const t = (i / markerCount) * duration;
                ctx.fillRect(x, 0, 1, height);
                ctx.fillText(formatTime(t), x + 3, height - 5);
            }

            // Segments
            const colors = {
                watermark: '#4a90d9',
                trim: '#50e3c2',
                effect: '#ff6b6b',
                default: '#888'
            };

            segments.forEach(seg => {
                const x = duration > 0 ? (seg.start / duration) * width : 0;
                const w = duration > 0 ? ((seg.end - seg.start) / duration) * width : 0;
                ctx.fillStyle = colors[seg.type] || colors.default;
                ctx.fillRect(x, 4, Math.max(1, w), height - 8);

                if (w > 24) {
                    ctx.fillStyle = '#fff';
                    ctx.font = '10px monospace';
                    let label = seg.type;
                    if (seg.data && seg.data.text) label += ': ' + seg.data.text;
                    ctx.fillText(label, x + 4, 16);
                }
            });

            // Center playhead
            ctx.strokeStyle = '#ff0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(width / 2, 0);
            ctx.lineTo(width / 2, height);
            ctx.stroke();
        }

        getSegments() {
            return this.segments.map(s => ({ ...s, data: { ...s.data } }));
        }
    }

    // ============================================================
    //  PUBLIC API
    // ============================================================
    return {
        WaveformDrawer,
        MediaMetadata,
        MediaPreviewUI,
        TimelineSegmentEditor,
        formatTime,
        formatFileSize,
        estimateGifSize,
        estimateVideoSize
    };
})();
