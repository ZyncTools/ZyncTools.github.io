(function () {
    'use strict';

    function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function buildOptions() {
        const container = $('#tool-options');
        if (!container) return;
        container.innerHTML = `
            <div class="zync-option-group">
                <label for="json-input">Input JSON</label>
                <textarea id="json-input" rows="8" style="width:100%;padding:0.9rem;border-radius:10px;border:1px solid var(--zync-border);background:var(--zync-surface-2);color:var(--zync-text);font-family:monospace;resize:vertical;">{\n\t"hello": "world",\n\t"zync": true,\n\t"tools": 150\n}</textarea>
            </div>
            <div class="zync-option-group">
                <label>Action</label>
                <select id="json-action">
                    <option value="format">Format / Beautify</option>
                    <option value="minify">Minify</option>
                    <option value="escape">Escape String</option>
                    <option value="unescape">Unescape String</option>
                    <option value="csv">JSON to CSV (flat)</option>
                </select>
            </div>
            <div class="zync-option-group">
                <label for="json-indent">Indent</label>
                <select id="json-indent">
                    <option value="2">2 Spaces</option>
                    <option value="4">4 Spaces</option>
                    <option value="tab">Tab</option>
                </select>
            </div>
        `;
    }

    function getIndent() {
        const el = $('#json-indent');
        if (!el) return 2;
        return el.value === 'tab' ? '\t' : parseInt(el.value, 10);
    }

    function minifyJson(obj) {
        return JSON.stringify(obj);
    }

    function formatJson(obj, indent) {
        return JSON.stringify(obj, null, indent);
    }

    function jsonToCsv(obj) {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return JSON.stringify(obj);
        const headers = Object.keys(obj);
        const values = headers.map(h => {
            const v = obj[h];
            if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))) {
                return '"' + v.replace(/"/g, '""') + '"';
            }
            return v;
        });
        return headers.join(',') + '\n' + values.join(',');
    }

    async function process(files, ctx) {
        const action = $('#json-action')?.value || 'format';
        const input = $('#json-input')?.value?.trim();

        if (!input) {
            ctx.showError('Please enter JSON text.');
            throw new Error('Empty input');
        }

        ctx.setStatus('Parsing JSON...', 'info');
        ctx.setProgress(10);

        let parsed;
        try {
            parsed = JSON.parse(input);
        } catch (e) {
            ctx.showError('Invalid JSON: ' + e.message);
            throw e;
        }

        ctx.setProgress(40);
        ctx.setStatus('Transforming...', 'info');

        let output = '';
        let fileName = 'result.txt';
        let mime = 'text/plain';

        switch (action) {
            case 'format':
                output = formatJson(parsed, getIndent());
                fileName = 'formatted.json';
                mime = 'application/json';
                break;
            case 'minify':
                output = minifyJson(parsed);
                fileName = 'minified.json';
                mime = 'application/json';
                break;
            case 'escape':
                output = JSON.stringify(parsed);
                fileName = 'escaped.json';
                mime = 'application/json';
                break;
            case 'unescape': {
                const unescaped = JSON.parse(JSON.parse(JSON.stringify('"' + input.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"')));
                output = JSON.stringify(unescaped, null, 2);
                fileName = 'unescaped.json';
                mime = 'application/json';
                break;
            }
            case 'csv':
                output = jsonToCsv(parsed);
                fileName = 'data.csv';
                mime = 'text/csv';
                break;
        }

        ctx.setProgress(90);
        ctx.setStatus('Finalizing...', 'info');

        const blob = new Blob([output], { type: mime });
        const url = URL.createObjectURL(blob);

        ctx.setProgress(100);
        ctx.setStatus('Done', 'info');

        return [
            {
                name: fileName,
                blob,
                type: mime,
                size: blob.size,
                url,
                previewHtml: `<pre style="background:var(--zync-surface-2);padding:1rem;border-radius:10px;overflow:auto;font-size:0.85rem;line-height:1.6;border:1px solid var(--zync-border);">${escapeHtml(output)}</pre>`
            }
        ];
    }

    function init() {
        buildOptions();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.ZyncTool = { process, init };
})();
