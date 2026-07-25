/**
 * ZyncTools — Tool Viewer
 * Dynamically renders tool interfaces based on tool.type
 * Enforces strict UI patterns: file, text, generator
 */

(function () {
    'use strict';

    const state = {
        toolId: '',
        toolConfig: null,
        toolType: 'file',
        files: [],
        textContent: '',
        isProcessing: false
    };

    const $ = (sel) => document.querySelector(sel);

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* ============================================
       TOOL TYPE DETECTION
       ============================================ */

    function detectToolType(tool) {
        if (!tool) return 'file';
        if (tool.type === 'generator') return 'generator';
        if (tool.type === 'text') return 'text';
        if (tool.outputType === 'string' && (!tool.accept || !tool.accept.includes('.'))) return 'text';
        if (tool.accept && tool.accept.includes('.')) return 'file';
        return 'file';
    }

    /* ============================================
        INTERFACE RENDERERS — Premium UI
        ============================================ */

    function renderFileTool(tool) {
        return `
            <div class="workbench">
                <div class="workbench-main">
                    <div class="mb-8">
                        <div class="step-label">
                            <span class="step-number">1</span>
                            <span class="step-title">Upload Files</span>
                        </div>
                        <div id="drop-zone" class="drop-zone">
                            <div class="pointer-events-none">
                                <svg class="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                                <p class="text-white font-medium mb-1">Drag & drop files here</p>
                                <p class="text-gray-500 text-sm">or click to browse</p>
                            </div>
                            <input type="file" id="file-input" multiple accept="${tool.accept || '*'}" class="hidden" />
                        </div>
                        <div id="file-list" class="mt-4 space-y-2"></div>
                    </div>

                    <div class="mb-8">
                        <div class="step-label">
                            <span class="step-number">2</span>
                            <span class="step-title">Settings</span>
                        </div>
                        <div id="tool-options" class="tool-options-card">
                            <p class="text-sm text-gray-400">No additional settings required for this tool.</p>
                        </div>
                    </div>

                    <div class="mb-8">
                        <div class="step-label">
                            <span class="step-number">3</span>
                            <span class="step-title">Process</span>
                        </div>
                        <div class="process-section">
                            <button id="process-btn" class="process-btn" disabled>
                                <i data-lucide="zap" class="w-4 h-4"></i>
                                <span id="process-btn-text">Process</span>
                            </button>
                            <div id="progress-container" class="progress-container hidden">
                                <div class="progress-bar">
                                    <div id="progress-fill" class="progress-fill"></div>
                                </div>
                                <p id="progress-text" class="progress-text">Processing...</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div class="step-label">
                            <span class="step-number">4</span>
                            <span class="step-title">Result</span>
                        </div>
                        <div id="results-section" class="results-section"></div>
                    </div>
                </div>
                <div class="workbench-sidebar">
                    <div class="sidebar-card">
                        <h3 class="sidebar-title">About This Tool</h3>
                        <p class="text-sm text-gray-400">${escapeHtml(tool.description || '')}</p>
                    </div>
                </div>
            </div>
        `;
    }

    function renderTextTool(tool) {
        return `
            <div class="workbench">
                <div class="workbench-main">
                    <div class="mb-8">
                        <div class="step-label">
                            <span class="step-number">1</span>
                            <span class="step-title">Enter Text</span>
                        </div>
                        <textarea id="text-input" rows="8" placeholder="Paste or type your text here..." class="w-full bg-[#111318] border border-white/10 rounded-xl p-4 text-gray-200 text-sm placeholder-gray-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 resize-vertical"></textarea>
                    </div>

                    <div class="mb-8">
                        <div class="step-label">
                            <span class="step-number">2</span>
                            <span class="step-title">Settings</span>
                        </div>
                        <div id="tool-options" class="tool-options-card">
                            <p class="text-sm text-gray-400">No additional settings required.</p>
                        </div>
                    </div>

                    <div class="mb-8">
                        <div class="step-label">
                            <span class="step-number">3</span>
                            <span class="step-title">Process</span>
                        </div>
                        <div class="process-section">
                            <button id="process-btn" class="process-btn">
                                <i data-lucide="zap" class="w-4 h-4"></i>
                                <span id="process-btn-text">Process</span>
                            </button>
                            <div id="progress-container" class="progress-container hidden">
                                <div class="progress-bar">
                                    <div id="progress-fill" class="progress-fill"></div>
                                </div>
                                <p id="progress-text" class="progress-text">Processing...</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div class="step-label">
                            <span class="step-number">4</span>
                            <span class="step-title">Result</span>
                        </div>
                        <div id="results-section" class="results-section"></div>
                    </div>
                </div>
                <div class="workbench-sidebar">
                    <div class="sidebar-card">
                        <h3 class="sidebar-title">About This Tool</h3>
                        <p class="text-sm text-gray-400">${escapeHtml(tool.description || '')}</p>
                    </div>
                </div>
            </div>
        `;
    }

    function renderGeneratorTool(tool) {
        return `
            <div class="workbench">
                <div class="workbench-main">
                    <div class="mb-8">
                        <div class="step-label">
                            <span class="step-number">1</span>
                            <span class="step-title">Configure</span>
                        </div>
                        <div id="generator-options" class="tool-options-card">
                            <p class="text-sm text-gray-400">Click the button below to generate ${escapeHtml(tool.name.toLowerCase())}.</p>
                        </div>
                    </div>

                    <div class="mb-8">
                        <div class="step-label">
                            <span class="step-number">2</span>
                            <span class="step-title">Generate</span>
                        </div>
                        <div class="process-section">
                            <button id="process-btn" class="process-btn">
                                <i data-lucide="zap" class="w-4 h-4"></i>
                                Generate
                            </button>
                            <div id="progress-container" class="progress-container hidden">
                                <div class="progress-bar">
                                    <div id="progress-fill" class="progress-fill"></div>
                                </div>
                                <p id="progress-text" class="progress-text">Generating...</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div class="step-label">
                            <span class="step-number">3</span>
                            <span class="step-title">Result</span>
                        </div>
                        <div id="results-section" class="results-section"></div>
                    </div>
                </div>
                <div class="workbench-sidebar">
                    <div class="sidebar-card">
                        <h3 class="sidebar-title">About This Tool</h3>
                        <p class="text-sm text-gray-400">${escapeHtml(tool.description || '')}</p>
                    </div>
                </div>
            </div>
        `;
    }

    /* ============================================
       TOOL INTERFACE FACTORY
       ============================================ */

    function renderToolInterface(tool) {
        const container = $('#tool-interface');
        if (!container) return;
        
        state.toolConfig = tool;
        state.toolType = detectToolType(tool);
        
        let html = '';
        switch (state.toolType) {
            case 'file':
                html = renderFileTool(tool);
                break;
            case 'text':
                html = renderTextTool(tool);
                break;
            case 'generator':
                html = renderGeneratorTool(tool);
                break;
            default:
                html = renderFileTool(tool);
        }
        
        container.innerHTML = html;
        
        // Initialize Lucide icons
        if (window.lucide) lucide.createIcons();
        
        // Bind events
        bindToolEvents();
    }

    /* ============================================
       EVENT BINDING
       ============================================ */

    function bindToolEvents() {
        const dropZone = $('#drop-zone');
        const fileInput = $('#file-input');
        const textInput = $('#text-input');
        const processBtn = $('#process-btn');
        
        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-over');
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
        
        if (textInput) {
            textInput.addEventListener('input', () => {
                state.textContent = textInput.value;
            });
        }
        
        if (processBtn) {
            processBtn.addEventListener('click', () => {
                if (state.toolType === 'generator') {
                    processGenerator();
                } else if (state.toolType === 'text') {
                    processText();
                } else {
                    processFiles();
                }
            });
        }
    }

    /* ============================================
       PROCESSING LOGIC
       ============================================ */

    async function handleFiles(fileList) {
        const fileListEl = $('#file-list');
        if (!fileListEl) return;
        
        Array.from(fileList).forEach(file => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <div class="file-icon">
                    <i data-lucide="file" class="w-5 h-5"></i>
                </div>
                <div class="file-details">
                    <div class="file-name">${escapeHtml(file.name)}</div>
                    <div class="file-meta">${formatFileSize(file.size)}</div>
                </div>
                <button class="remove-file-btn" data-index="${state.files.length}" aria-label="Remove file">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            `;
            fileListEl.appendChild(item);
            state.files.push(file);
            
            const removeBtn = item.querySelector('.remove-file-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    const idx = parseInt(removeBtn.dataset.index);
                    if (state.files[idx]) {
                        state.files[idx] = null;
                    }
                    item.style.opacity = '0';
                    item.style.transform = 'translateX(12px)';
                    setTimeout(() => {
                        item.remove();
                        updateFileCount();
                    }, 200);
                });
            }
            
            if (window.lucide) lucide.createIcons();
        });
        
        updateFileCount();
    }
    
    function updateFileCount() {
        const processBtn = $('#process-btn');
        if (processBtn) {
            const validFiles = state.files.filter(Boolean);
            processBtn.disabled = validFiles.length === 0;
            const btnText = $('#process-btn-text');
            if (btnText && validFiles.length > 0) {
                btnText.textContent = 'Process';
            }
        }
    }

    async function processFiles() {
        if (state.isProcessing) return;
        const validFiles = state.files.filter(Boolean);
        if (!validFiles.length) {
            alert('Please add files first.');
            return;
        }
        
        state.isProcessing = true;
        const btn = $('#process-btn');
        if (btn) btn.disabled = true;
        
        const progressContainer = $('#progress-container');
        const progressFill = $('#progress-fill');
        const progressText = $('#progress-text');
        const resultsSection = $('#results-section');
        
        if (progressContainer) {
            progressContainer.classList.remove('hidden');
            if (progressFill) progressFill.style.width = '0%';
            if (progressText) progressText.textContent = 'Starting...';
        }
        
        try {
            const toolModule = await loadToolModule(state.toolId);
            if (!toolModule || typeof toolModule.process !== 'function') {
                throw new Error('Tool not implemented yet. This tool is coming soon!');
            }
            
            const results = await toolModule.process(validFiles, {
                setStatus: (msg) => {
                    if (progressText) progressText.textContent = msg;
                },
                setProgress: (pct, msg) => {
                    if (progressFill) progressFill.style.width = `${pct}%`;
                    if (progressText && msg) progressText.textContent = msg;
                },
                addResultItem: (result) => showResult(result),
                showNotification: (msg) => console.log(msg),
                showError: (msg) => alert(msg),
                config: state.toolConfig
            });
            
            if (results && results.length) {
                results.forEach(r => showResult(r));
            }
            
            if (progressFill) progressFill.style.width = '100%';
            if (progressText) progressText.textContent = 'Done!';
        } catch (err) {
            console.error(err);
            if (progressText) progressText.textContent = 'Error: ' + (err.message || 'Processing failed');
        } finally {
            state.isProcessing = false;
            if (btn) {
                btn.disabled = state.files.filter(Boolean).length === 0;
                btn.innerHTML = '<i data-lucide="zap" class="w-4 h-4"></i><span id="process-btn-text">Process</span>';
                if (window.lucide) lucide.createIcons();
            }
            setTimeout(() => {
                if (progressContainer) progressContainer.classList.add('hidden');
            }, 2000);
        }
    }

    async function processText() {
        if (state.isProcessing) return;
        const textInput = $('#text-input');
        if (!textInput || !textInput.value.trim()) {
            alert('Please enter some text first.');
            return;
        }
        
        state.isProcessing = true;
        const btn = $('#process-btn');
        if (btn) btn.disabled = true;
        
        const progressContainer = $('#progress-container');
        const progressFill = $('#progress-fill');
        const progressText = $('#progress-text');
        
        if (progressContainer) {
            progressContainer.classList.remove('hidden');
            if (progressFill) progressFill.style.width = '0%';
            if (progressText) progressText.textContent = 'Processing...';
        }
        
        try {
            const toolModule = await loadToolModule(state.toolId);
            if (!toolModule || typeof toolModule.process !== 'function') {
                throw new Error('Tool not implemented yet. This tool is coming soon!');
            }
            
            const results = await toolModule.process(textInput.value, {
                setStatus: (msg) => {
                    if (progressText) progressText.textContent = msg;
                },
                setProgress: (pct, msg) => {
                    if (progressFill) progressFill.style.width = `${pct}%`;
                    if (progressText && msg) progressText.textContent = msg;
                },
                addResultItem: (result) => showResult(result),
                showNotification: (msg) => console.log(msg),
                showError: (msg) => alert(msg),
                config: state.toolConfig
            });
            
            if (results && results.length) {
                results.forEach(r => showResult(r));
            }
            
            if (progressFill) progressFill.style.width = '100%';
            if (progressText) progressText.textContent = 'Done!';
        } catch (err) {
            console.error(err);
            if (progressText) progressText.textContent = 'Error: ' + (err.message || 'Processing failed');
        } finally {
            state.isProcessing = false;
            if (btn) btn.disabled = false;
            setTimeout(() => {
                if (progressContainer) progressContainer.classList.add('hidden');
            }, 2000);
        }
    }

    async function processGenerator() {
        if (state.isProcessing) return;
        
        state.isProcessing = true;
        const btn = $('#process-btn');
        if (btn) btn.disabled = true;
        
        const progressContainer = $('#progress-container');
        const progressFill = $('#progress-fill');
        const progressText = $('#progress-text');
        
        if (progressContainer) {
            progressContainer.classList.remove('hidden');
            if (progressFill) progressFill.style.width = '30%';
            if (progressText) progressText.textContent = 'Generating...';
        }
        
        try {
            const toolModule = await loadToolModule(state.toolId);
            if (!toolModule || typeof toolModule.process !== 'function') {
                throw new Error('Tool not implemented yet. This tool is coming soon!');
            }
            
            const results = await toolModule.process('', {
                setStatus: (msg) => {
                    if (progressText) progressText.textContent = msg;
                },
                setProgress: (pct, msg) => {
                    if (progressFill) progressFill.style.width = `${pct}%`;
                    if (progressText && msg) progressText.textContent = msg;
                },
                addResultItem: (result) => showResult(result),
                showNotification: (msg) => console.log(msg),
                showError: (msg) => alert(msg),
                config: state.toolConfig
            });
            
            if (results && results.length) {
                results.forEach(r => showResult(r));
            }
            
            if (progressFill) progressFill.style.width = '100%';
            if (progressText) progressText.textContent = 'Done!';
        } catch (err) {
            console.error(err);
            if (progressText) progressText.textContent = 'Error: ' + (err.message || 'Processing failed');
        } finally {
            state.isProcessing = false;
            if (btn) btn.disabled = false;
            setTimeout(() => {
                if (progressContainer) progressContainer.classList.add('hidden');
            }, 2000);
        }
    }

    function showResult(result) {
        const section = $('#results-section');
        if (!section) return;
        
        const item = document.createElement('div');
        item.className = 'result-card';
        
        const isText = !!result.text;
        const content = isText ? result.text : '';
        const iconName = isText ? 'file-text' : (result.type === 'blob' ? 'file' : 'file-check');
        
        item.innerHTML = `
            <div class="result-info">
                <div class="result-icon">
                    <i data-lucide="${iconName}" class="w-5 h-5"></i>
                </div>
                <div class="result-details">
                    <div class="result-name">${escapeHtml(result.name)}</div>
                    ${isText ? `<div class="result-meta">Text output</div>` : ''}
                </div>
            </div>
            <div class="result-actions">
                ${isText ? `<button class="copy-btn btn-secondary" data-text="${escapeHtml(content)}"><i data-lucide="copy" class="w-3 h-3 mr-1"></i>Copy</button>` : ''}
                ${result.url ? `<a href="${result.url}" download="${escapeHtml(result.name)}" class="btn-secondary"><i data-lucide="download" class="w-3 h-3 mr-1"></i>Download</a>` : ''}
            </div>
        `;
        
        section.appendChild(item);
        if (window.lucide) lucide.createIcons();
        
        const copyBtn = item.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(copyBtn.dataset.text);
                    copyBtn.innerHTML = '<i data-lucide="check" class="w-3 h-3 mr-1"></i>Copied';
                    if (window.lucide) lucide.createIcons();
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i data-lucide="copy" class="w-3 h-3 mr-1"></i>Copy';
                        if (window.lucide) lucide.createIcons();
                    }, 2000);
                } catch (e) {
                    alert('Failed to copy');
                }
            });
        }
    }

    /* ============================================
       TOOL MODULE LOADER
       ============================================ */

    async function loadToolModule(toolId) {
        try {
            // Try SEO module first
            if (window.ZyncSeoTools) {
                const seoModule = window.ZyncSeoTools.getModule(toolId);
                if (seoModule) return seoModule;
            }
            
            // Try loading from tools directory
            const script = document.createElement('script');
            script.src = `tools/${toolId}.js`;
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = () => reject(new Error(`Failed to load: ${toolId}.js`));
                document.head.appendChild(script);
            });
            
            if (typeof window.ZyncTool === 'function') return window.ZyncTool;
            if (typeof window.ZyncTool === 'object' && typeof window.ZyncTool.process === 'function') return window.ZyncTool;
            return null;
        } catch (e) {
            console.error('Module load error:', e);
            return null;
        }
    }

    /* ============================================
       UTILITIES
       ============================================ */

    function formatFileSize(bytes) {
        if (!bytes && bytes !== 0) return '0 Bytes';
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /* ============================================
       INITIALIZATION
       ============================================ */

    async function init() {
        const params = new URLSearchParams(window.location.search);
        const toolId = params.get('id') || '';
        state.toolId = toolId;
        
        try {
            await window.ZyncRegistry.loadRegistry();
        } catch(e) {
            console.error('Failed to load registry:', e);
        }
        
        const toolConfig = window.ZyncRegistry.getToolById(toolId);
        if (!toolConfig) {
            $('#tool-title').textContent = 'Tool Not Found';
            $('#tool-description').textContent = 'The requested tool could not be found.';
            return;
        }
        
        document.title = `${toolConfig.name} — ZyncTools`;
        $('#tool-title').textContent = toolConfig.name;
        $('#tool-description').textContent = toolConfig.description;
        
        const toolIconEl = $('#tool-icon');
        if (toolIconEl) {
            const iconName = (window.ZyncToolIcons && window.ZyncToolIcons[toolId]) || 'tool';
            toolIconEl.setAttribute('data-lucide', iconName);
            if (window.lucide) lucide.createIcons();
        }
        
        renderToolInterface(toolConfig);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.ZyncToolViewer = { state, init };
})();
