(function () {
    'use strict';

    let currentConfig = null;
    let currentFile = null;
    let rawText = '';

    function $(sel) { return document.querySelector(sel); }
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* --- SEO Injection --- */
    function injectSEO(config) {
        document.title = config.title;
        const metaDesc = $('#meta-description');
        const metaKeywords = $('#meta-keywords');
        if (metaDesc) metaDesc.setAttribute('content', config.description);
        if (metaKeywords) metaKeywords.setAttribute('content', config.keywords);
        const h1 = $('#tool-title');
        if (h1) h1.textContent = config.h1;
        const desc = $('#tool-description');
        if (desc) desc.textContent = config.description;

        // JSON-LD Schema
        const schema = {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": config.title,
            "description": config.description,
            "applicationCategory": "DeveloperApplication",
            "operatingSystem": "Any",
            "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
            "url": window.location.href
        };
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify(schema);
        document.head.appendChild(script);
    }

    /* --- UI Setup --- */
    function setupToolbar(config) {
        const toolbar = $('#viewer-toolbar');
        const treeBtn = $('#toggle-tree-btn');
        const formatBtn = $('#format-btn');
        const minifyBtn = $('#minify-btn');
        const copyBtn = $('#copy-btn');
        const downloadBtn = $('#download-btn');

        toolbar?.classList.remove('hidden');

        if (config.mode === 'data') {
            treeBtn?.classList.remove('hidden');
            formatBtn?.classList.remove('hidden');
        }
        if (config.mode === 'code' || config.mode === 'data') {
            minifyBtn?.classList.remove('hidden');
        }

        treeBtn?.addEventListener('click', () => toggleTreeView());
        formatBtn?.addEventListener('click', () => beautifyContent());
        minifyBtn?.addEventListener('click', () => minifyContent());
        copyBtn?.addEventListener('click', () => copyContent());
        downloadBtn?.addEventListener('click', () => downloadContent());
    }

    /* --- File Handling --- */
    function handleFiles(fileList) {
        if (!fileList || !fileList.length) return;
        const file = fileList[0];
        currentFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            rawText = e.target.result;
            renderContent(rawText, currentConfig);
            $('#viewer-container')?.classList.remove('hidden');
        };
        reader.readAsText(file);
    }

    /* --- Rendering --- */
    function renderContent(text, config) {
        const container = $('#viewer-content');
        if (!container) return;

        if (config.mode === 'notebook') {
            renderNotebook(container, text);
        } else if (config.mode === 'markdown') {
            renderMarkdown(container, text);
        } else if (config.mode === 'data') {
            renderData(container, text, config.language);
        } else {
            renderCode(container, text, config.language);
        }
    }

    function renderCode(container, text, language) {
        container.innerHTML = `<pre><code class="language-${language}">${escapeHtml(text)}</code></pre>`;
        Prism?.highlightAllUnder(container);
    }

    function renderData(container, text, language) {
        container.innerHTML = `<pre><code class="language-${language}">${escapeHtml(text)}</code></pre>`;
        Prism?.highlightAllUnder(container);
    }

    function renderMarkdown(container, text) {
        const html = marked ? marked.parse(text) : escapeHtml(text).replace(/\n/g, '<br>');
        container.innerHTML = `<div class="prose prose-invert max-w-none">${html}</div>`;
    }

    function renderNotebook(container, text) {
        try {
            const notebook = JSON.parse(text);
            const cells = notebook.cells || [];
            let html = '<div class="space-y-4">';
            cells.forEach((cell, idx) => {
                const type = cell.cell_type;
                const content = (cell.source || []).join('');
                if (type === 'markdown') {
                    html += `<div class="p-4 rounded-lg bg-slate-800/50 border border-white/5"><div class="text-xs text-gray-500 mb-2">Markdown Cell ${idx + 1}</div><div class="prose prose-invert max-w-none">${marked ? marked.parse(content) : escapeHtml(content).replace(/\n/g, '<br>')}</div></div>`;
                } else if (type === 'code') {
                    const outputs = cell.outputs || [];
                    const outputHtml = outputs.map(o => {
                        if (o.output_type === 'stream') return `<pre class="text-xs text-gray-300 mt-2">${escapeHtml((o.text || []).join(''))}</pre>`;
                        if (o.output_type === 'execute_result' || o.output_type === 'display_data') {
                            const data = o.data || {};
                            if (data['text/html']) return `<div class="text-xs text-gray-300 mt-2">${data['text/html'].join('')}</div>`;
                            if (data['image/png']) return `<img src="data:image/png;base64,${data['image/png']}" class="max-w-full mt-2 rounded" />`;
                            return `<pre class="text-xs text-gray-300 mt-2">${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
                        }
                        return '';
                    }).join('');
                    html += `<div class="p-4 rounded-lg bg-slate-900 border border-white/5"><div class="flex items-center justify-between mb-2"><span class="text-xs text-gray-500">Code Cell ${idx + 1}</span>${cell.metadata?.kernelspec ? `<span class="text-xs text-accent">${escapeHtml(cell.metadata.kernelspec.display_name || '')}</span>` : ''}</div><pre><code class="language-python">${escapeHtml(content)}</code></pre>${outputHtml ? `<div class="mt-3 pt-3 border-t border-white/5">${outputHtml}</div>` : ''}</div>`;
                }
            });
            html += '</div>';
            container.innerHTML = html;
            Prism?.highlightAllUnder(container);
        } catch (e) {
            container.innerHTML = `<div class="text-red-400">Failed to parse notebook: ${escapeHtml(e.message)}</div>`;
        }
    }

    /* --- Actions --- */
    function toggleTreeView() {
        const container = $('#viewer-content');
        if (!container || !rawText) return;
        try {
            const data = JSON.parse(rawText);
            const tree = buildJsonTree(data);
            container.innerHTML = tree;
        } catch {
            showNotification('Invalid JSON for tree view', 'error');
        }
    }

    function buildJsonTree(obj) {
        if (typeof obj !== 'object' || obj === null) return escapeHtml(String(obj));
        const isArray = Array.isArray(obj);
        let html = '<ul class="space-y-1">';
        const entries = isArray ? obj.map((v, i) => [i, v]) : Object.entries(obj);
        entries.forEach(([key, val]) => {
            const isObj = typeof val === 'object' && val !== null;
            html += `<li><span class="text-accent">${escapeHtml(String(key))}</span>: ${isObj ? buildJsonTree(val) : escapeHtml(JSON.stringify(val))}</li>`;
        });
        html += '</ul>';
        return html;
    }

    function beautifyContent() {
        if (!rawText) return;
        try {
            const data = JSON.parse(rawText);
            rawText = JSON.stringify(data, null, 2);
            renderContent(rawText, currentConfig);
        } catch {
            showNotification('Invalid JSON', 'error');
        }
    }

    function minifyContent() {
        if (!rawText) return;
        try {
            const data = JSON.parse(rawText);
            rawText = JSON.stringify(data);
            renderContent(rawText, currentConfig);
        } catch {
            showNotification('Invalid JSON', 'error');
        }
    }

    function copyContent() {
        if (!rawText) return;
        navigator.clipboard.writeText(rawText).then(() => showNotification('Copied to clipboard', 'success'));
    }

    function downloadContent() {
        if (!rawText || !currentFile) return;
        const blob = new Blob([rawText], { type: currentFile.type || 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFile.name;
        a.click();
        URL.revokeObjectURL(url);
    }

    function showNotification(message, type) {
        const existing = $('.zync-notification');
        if (existing) existing.remove();
        const el = document.createElement('div');
        el.className = `zync-notification ${type}`;
        el.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${escapeHtml(message)}`;
        document.body.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
    }

    /* --- Related Tools --- */
    function buildRelatedTools() {
        const container = $('#related-tools');
        if (!container || !currentConfig) return;
        const related = currentConfig.related || [];
        if (!related.length) { container.innerHTML = '<p class="text-xs text-gray-500">No related tools.</p>'; return; }
        container.innerHTML = related.map(id => {
            const config = window.ZyncSeoRegistry[id];
            if (!config) return '';
            return `<a href="/viewer.html?lang=${id}" class="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/[0.02] border border-transparent hover:border-white/5 transition-all group">
                <div class="w-8 h-8 rounded-lg bg-accent/8 border border-accent/12 flex items-center justify-center text-accent text-xs flex-shrink-0 group-hover:bg-accent/12 transition-colors"><i data-lucide="file-code"></i></div>
                <div class="min-w-0"><div class="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">${escapeHtml(config.h1)}</div></div>
            </a>`;
        }).join('');
        if (window.lucide) lucide.createIcons();
    }

    /* --- Init --- */
    function init() {
        const params = new URLSearchParams(window.location.search);
        const lang = params.get('lang') || 'txt';
        const config = window.ZyncSeoRegistry[lang];
        if (!config) {
            $('#tool-title').textContent = 'File Viewer';
            $('#tool-description').textContent = 'Select a file type to view.';
            return;
        }
        currentConfig = config;
        injectSEO(config);
        setupToolbar(config);
        buildRelatedTools();
        if (window.lucide) lucide.createIcons();

        const dropZone = $('#drop-zone');
        const fileInput = $('#file-input');
        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());
            dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
            dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });
            fileInput.addEventListener('change', (e) => { handleFiles(e.target.files); fileInput.value = ''; });
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    window.ZyncViewer = { handleFiles, renderContent, injectSEO };
})();
