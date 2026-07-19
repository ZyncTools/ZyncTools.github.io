(function () {
    'use strict';

    const state = {
        toolId: '',
        files: [],
        toolConfig: null,
        modulesLoaded: new Set(),
        isProcessing: false
    };

    function $(selector) {
        return document.querySelector(selector);
    }

    function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function formatFileSize(bytes) {
        if (!bytes && bytes !== 0) return '0 Bytes';
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function getFileIcon(mimeType) {
        if (!mimeType) return 'fa-file';
        if (mimeType.includes('pdf')) return 'fa-file-pdf';
        if (mimeType.includes('image')) return 'fa-file-image';
        if (mimeType.includes('audio')) return 'fa-file-audio';
        if (mimeType.includes('video')) return 'fa-file-video';
        if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('javascript')) return 'fa-file-alt';
        if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'fa-file-archive';
        return 'fa-file';
    }

    function setStatus(message) {
        const text = $('#progress-text');
        if (text) text.textContent = message;
    }

    function setProgress(percent) {
        const fill = $('#progress-fill');
        const text = $('#progress-text');
        const container = $('#progress-container');
        if (!fill || !text || !container) return;
        container.classList.remove('hidden');
        fill.style.width = Math.max(0, Math.min(100, percent)) + '%';
        text.textContent = Math.round(percent) + '%';
    }

    function showProgress() {
        const container = $('#progress-container');
        if (container) container.classList.remove('hidden');
    }

    function hideProgress() {
        const container = $('#progress-container');
        if (container) container.classList.add('hidden');
        setProgress(0);
    }

    function updateProcessButton() {
        const btn = $('#process-btn');
        if (!btn) return;
        btn.disabled = state.files.length === 0 || state.isProcessing;
    }

    function addFileToList(file) {
        const list = $('#file-list');
        if (!list) return;

        const item = document.createElement('div');
        item.className = 'flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-white/5 animate-fade-in-up';
        item.dataset.fileId = `${file.name}_${file.size}_${file.lastModified}`;

        const size = formatFileSize(file.size);
        const icon = getFileIcon(file.type);

        item.innerHTML = `
            <i class="fas ${icon} text-accent text-lg"></i>
            <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-white truncate">${escapeHtml(file.name)}</div>
                <div class="text-xs text-gray-500">${size}</div>
            </div>
            <button class="remove-file w-8 h-8 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 flex items-center justify-center transition-colors" data-name="${escapeHtml(file.name)}" data-size="${file.size}" data-modified="${file.lastModified}">
                <i class="fas fa-times text-xs"></i>
            </button>
        `;

        list.appendChild(item);
    }

    function removeFile(name, size, modified) {
        state.files = state.files.filter(f => !(f.name === name && f.size === size && f.lastModified === modified));
        renderFileList();
        updateProcessButton();
    }

    function renderFileList() {
        const list = $('#file-list');
        if (list) list.innerHTML = '';
        state.files.forEach(f => addFileToList(f));
    }

    function clearFileList() {
        const list = $('#file-list');
        if (list) list.innerHTML = '';
    }

    function clearResults() {
        const section = $('#results-section');
        if (section) section.innerHTML = '';
    }

    function addResultItem(result) {
        const section = $('#results-section');
        if (!section) return;

        const item = document.createElement('div');
        item.className = 'flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-white/5 animate-fade-in-up';

        const size = formatFileSize(result.size || result.blob?.size || 0);
        const type = result.type || (result.blob?.type) || '';

        item.innerHTML = `
            <div class="flex items-center gap-3 min-w-0">
                <i class="fas ${getFileIcon(type)} text-accent"></i>
                <div class="min-w-0">
                    <div class="text-sm font-medium text-white truncate">${escapeHtml(result.name)}</div>
                    <div class="text-xs text-gray-500">${size}${type ? ' • ' + escapeHtml(type) : ''}</div>
                </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
                ${result.url ? `<a href="${result.url}" download="${escapeHtml(result.name)}" class="btn-secondary text-xs py-2 px-3"><i class="fas fa-download mr-1.5"></i>Download</a>` : ''}
                ${result.previewHtml ? `<button class="preview-btn btn-secondary text-xs py-2 px-3"><i class="fas fa-eye mr-1.5"></i>Preview</button>` : ''}
            </div>
        `;

        const previewBtn = item.querySelector('.preview-btn');
        if (previewBtn && result.previewHtml) {
            previewBtn.addEventListener('click', () => {
                const modal = $('#preview-modal') || createPreviewModal();
                const body = $('#preview-modal-body');
                if (body) body.innerHTML = result.previewHtml;
                modal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            });
        }

        section.appendChild(item);
    }

    function createPreviewModal() {
        const modal = document.createElement('div');
        modal.id = 'preview-modal';
        modal.className = 'fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-slate-900 border border-white/5 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl">
                <div class="flex items-center justify-between p-4 border-b border-white/5">
                    <h3 class="font-semibold text-white">Preview</h3>
                    <button id="preview-close-btn" class="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="preview-modal-body" class="p-4 overflow-auto max-h-[70vh]"></div>
            </div>
        `;
        document.body.appendChild(modal);
        $('#preview-close-btn').addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
        return modal;
    }

    function showNotification(message, type = 'info') {
        const existing = $('.zync-notification');
        if (existing) existing.remove();

        const el = document.createElement('div');
        el.className = `zync-notification ${type}`;
        const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
        el.innerHTML = `<i class="fas fa-${icon}"></i> <span>${escapeHtml(message)}</span>`;
        document.body.appendChild(el);

        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        }, 4000);
    }

    function showError(message) {
        showNotification(message, 'error');
    }

    function validateFile(file) {
        if (!state.toolConfig) return true;
        const accepted = (state.toolConfig.accept || '').split(',').map(s => s.trim());
        if (accepted.includes('*') || accepted.length === 0 || !state.toolConfig.accept) return true;

        const ext = '.' + file.name.split('.').pop().toLowerCase();
        const lowerName = file.name.toLowerCase();

        const valid = accepted.some(rule => {
            if (rule === ext) return true;
            if (rule.startsWith('.') && lowerName.endsWith(rule)) return true;
            return false;
        });

        if (!valid) {
            showError(`Unsupported file: ${file.name}`);
        }
        return valid;
    }

    function handleFiles(fileList) {
        Array.from(fileList).forEach(file => {
            if (validateFile(file)) {
                const exists = state.files.find(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified);
                if (!exists) {
                    state.files.push(file);
                    addFileToList(file);
                }
            }
        });
        updateProcessButton();
    }

    async function loadScripts(urls) {
        for (const url of urls) {
            if (state.modulesLoaded.has(url)) continue;
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.async = true;
                script.onload = () => {
                    state.modulesLoaded.add(url);
                    resolve();
                };
                script.onerror = () => reject(new Error('Failed to load script: ' + url));
                document.head.appendChild(script);
            });
        }
    }

    async function loadToolModule(toolId) {
        if (window.ZyncSeoTools) {
            const seoModule = window.ZyncSeoTools.getModule(toolId);
            if (seoModule) return seoModule;
        }
        const script = $('#tool-module-script');
        if (!script) return null;
        const modulePath = `tools/${toolId}.js`;
        script.src = modulePath;
        await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load tool module: ' + modulePath));
        });
        if (typeof window.ZyncTool === 'function') return window.ZyncTool;
        if (typeof window.ZyncTool === 'object' && typeof window.ZyncTool.process === 'function') return window.ZyncTool;
        return null;
    }

    async function processFiles() {
        if (state.isProcessing) return;
        if (!state.files.length) {
            showError('Please add files first.');
            return;
        }

        state.isProcessing = true;
        updateProcessButton();
        showProgress();
        setProgress(0);
        clearResults();

        try {
            let toolModule = window.ZyncTool;
            if (!toolModule) {
                toolModule = await loadToolModule(state.toolId);
            }
            if (!toolModule || typeof toolModule.process !== 'function') {
                throw new Error('Tool module is not implemented yet.');
            }

            if (state.toolConfig && state.toolConfig.cdns && state.toolConfig.cdns.length) {
                setProgress(5);
                await loadScripts(state.toolConfig.cdns);
                setProgress(20);
            }

            const results = await toolModule.process(state.files, {
                setStatus,
                setProgress,
                addResultItem,
                showNotification,
                showError,
                config: state.toolConfig
            });

            setProgress(100);
            if (!results || !results.length) {
                showNotification('No results returned.', 'info');
                return;
            }

            results.forEach(r => addResultItem(r));
            showNotification(`Processed ${results.length} item(s).`, 'success');
        } catch (err) {
            console.error(err);
            showError(err.message || 'Processing failed.');
        } finally {
            state.isProcessing = false;
            updateProcessButton();
            setTimeout(hideProgress, 1200);
        }
    }

    function buildRelatedTools() {
        const container = $('#related-tools');
        if (!container || !state.toolConfig) return;
        const currentCategory = state.toolConfig.category;
        const related = window.ZyncRegistry.getAllTools()
            .filter(t => t.category === currentCategory && t.id !== state.toolId)
            .slice(0, 6);

        if (!related.length) {
            container.innerHTML = '<p class="text-xs text-gray-500">No related tools found.</p>';
            return;
        }

        container.innerHTML = related.map(t => `
            <a href="/tool.html?id=${t.id}" class="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/[0.02] border border-transparent hover:border-white/5 transition-all group">
                <div class="w-8 h-8 rounded-lg bg-accent/8 border border-accent/12 flex items-center justify-center text-accent text-xs flex-shrink-0 group-hover:bg-accent/12 transition-colors">
                    <i class="fas ${t.icon}"></i>
                </div>
                <div class="min-w-0">
                    <div class="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">${escapeHtml(t.name)}</div>
                </div>
            </a>
        `).join('');
    }

    function setupToolPage() {
        const params = new URLSearchParams(window.location.search);
        const toolId = params.get('id') || '';
        state.toolId = toolId;

        const toolConfig = window.ZyncRegistry.getToolById(toolId);
        if (!toolConfig) {
            $('#tool-title').textContent = 'Tool Not Found';
            $('#tool-description').textContent = 'The requested tool could not be found.';
            return;
        }

        state.toolConfig = toolConfig;
        document.title = `${toolConfig.name} — ZyncTools`;
        $('#tool-title').textContent = toolConfig.name;
        $('#tool-description').textContent = toolConfig.description;
        $('#tool-icon').className = `fas ${toolConfig.icon}`;

        const fileInput = $('#file-input');
        if (fileInput && toolConfig.accept) {
            fileInput.accept = toolConfig.accept;
        }

        buildRelatedTools();

        if (window.ZyncSeoTools) {
            const seoModule = window.ZyncSeoTools.getModule(toolId);
            if (seoModule && typeof seoModule.init === 'function') {
                seoModule.init();
            }
        }
    }

    function bindEvents() {
        const dropZone = $('#drop-zone');
        const fileInput = $('#file-input');

        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
                dropZone.addEventListener(evt, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (evt === 'dragenter' || evt === 'dragover') {
                        dropZone.classList.add('drag-over');
                    } else {
                        dropZone.classList.remove('drag-over');
                    }
                });
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                handleFiles(e.dataTransfer.files);
            });

            fileInput.addEventListener('change', (e) => {
                handleFiles(e.target.files);
                fileInput.value = '';
            });
        }

        $('#file-list')?.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.remove-file');
            if (removeBtn) {
                const { name, size, modified } = removeBtn.dataset;
                removeFile(name, Number(size), Number(modified));
            }
        });

        $('#process-btn')?.addEventListener('click', processFiles);
    }

    async function init() {
        try {
            await window.ZyncRegistry.loadRegistry();
            setupToolPage();
            bindEvents();
            initThemeToggle();
        } catch (err) {
            console.error('ZyncTools init failed:', err);
        }
    }

    function initThemeToggle() {
        const btn = $('#theme-toggle');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const next = window.ZyncTheme.toggle();
            updateThemeIcon(next);
        });
        updateThemeIcon(window.ZyncTheme.getCurrent());
    }

    function updateThemeIcon(theme) {
        const btn = $('#theme-toggle');
        if (!btn) return;
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.ZyncApp = {
        state,
        processFiles,
        addResultItem,
        showNotification,
        showError,
        setProgress,
        setStatus,
        removeFile
    };
})();
