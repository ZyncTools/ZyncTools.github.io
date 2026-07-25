window.ZyncTool = {
    process(input, ctx) {
        const { addResultItem, showNotification, showError, setStatus } = ctx || {};
        const text = input || '';
        const options = (ctx && ctx.config) || {};
        const mode = options.mode || 'beautify';

        if (!text.trim()) {
            showError && showError('Empty JSON input');
            return [];
        }

        setStatus && setStatus('Processing JSON...');

        let parsed;
        let errorLine = null;
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            const match = e.message.match(/position (\d+)/);
            errorLine = match ? text.slice(0, parseInt(match[1])).split('\n').length : null;
            showError && showError(`JSON Parse Error at line ${errorLine || 'unknown'}: ${e.message}`);
            if (options.continueOnError) {
                parsed = {};
            } else {
                return [];
            }
        }

        let resultText = '';
        let resultName = '';

        if (options.search) {
            resultText = this._searchJson(parsed, options.search.toLowerCase(), '');
            resultName = 'json-search.html';
        } else if (options.showPaths) {
            resultText = this._jsonPaths(parsed, '').join('\n');
            resultName = 'json-paths.txt';
        } else if (mode === 'minify') {
            resultText = JSON.stringify(parsed);
            resultName = 'minified.json';
        } else if (mode === 'tree' || options.tree) {
            const collapseLevel = typeof options.collapseLevel === 'number' ? options.collapseLevel : 0;
            resultText = this._buildTreeView(parsed, 0, collapseLevel);
            resultName = 'json-tree.html';
        } else {
            const indent = typeof options.indent === 'number' ? options.indent : 2;
            resultText = JSON.stringify(parsed, null, indent);
            resultName = 'formatted.json';
        }

        if (options.highlight && mode !== 'tree' && !options.search && !options.showPaths) {
            resultText = this._syntaxHighlight(resultText);
        }

        if (errorLine) {
            resultText = `Error at line ${errorLine}:\n\n` + resultText;
        }

        const result = { name: resultName, text: resultText, size: resultText.length };
        addResultItem && addResultItem(result);
        showNotification && showNotification('JSON processed', 'success');
        return [result];
    },

    _buildTreeView(obj, depth, collapseLevel) {
        const indent = '  '.repeat(depth);
        if (Array.isArray(obj)) {
            const items = obj.map((item, i) => `${indent}  ${this._inlineValue(item)}`).join('\n');
            return `${indent}[\n${items}\n${indent}]`;
        }
        if (obj !== null && typeof obj === 'object') {
            const items = Object.entries(obj).map(([key, val]) => {
                const valStr = typeof val === 'object' && val !== null && depth + 1 < collapseLevel
                    ? `\n${this._buildTreeView(val, depth + 2, collapseLevel)}\n${indent}  `
                    : this._inlineValue(val);
                return `${indent}  "${key}": ${valStr}`;
            }).join('\n');
            return `${indent}{\n${items}\n${indent}}`;
        }
        return this._inlineValue(obj);
    },

    _inlineValue(val) {
        if (val === null) return '<span style="color:#a61717">null</span>';
        if (typeof val === 'boolean') return `<span style="color:#183691">${val}</span>`;
        if (typeof val === 'number') return `<span style="color:#0086b3">${val}</span>`;
        if (typeof val === 'string') return `<span style="color:#df5000">"${val.replace(/"/g, '\\"')}"</span>`;
        if (Array.isArray(val)) return `<span style="color:#a61717">Array(${val.length})</span>`;
        if (typeof val === 'object') return `<span style="color:#a61717">Object</span>`;
        return String(val);
    },

    _searchJson(obj, searchLower, path, lines = []) {
        if (typeof obj === 'object' && obj !== null) {
            if (Array.isArray(obj)) {
                obj.forEach((item, i) => this._searchJson(item, searchLower, `${path}[${i}]`, lines));
            } else {
                Object.entries(obj).forEach(([key, val]) => {
                    const newPath = path ? `${path}.${key}` : key;
                    if (String(key).toLowerCase().includes(searchLower)) {
                        lines.push(`PATH: ${newPath}`);
                    }
                    this._searchJson(val, searchLower, newPath, lines);
                });
            }
        } else {
            if (String(obj).toLowerCase().includes(searchLower)) {
                lines.push(`PATH: ${path} = "${obj}"`);
            }
        }
        return lines;
    },

    _jsonPaths(obj, path, lines = []) {
        if (typeof obj === 'object' && obj !== null) {
            if (Array.isArray(obj)) {
                obj.forEach((item, i) => this._jsonPaths(item, `${path}[${i}]`, lines));
            } else {
                Object.entries(obj).forEach(([key, val]) => {
                    const newPath = path ? `${path}.${key}` : key;
                    lines.push(newPath);
                    this._jsonPaths(val, newPath, lines);
                });
            }
        }
        return lines;
    },

    _syntaxHighlight(json) {
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
            let cls = 'color: #a61717';
            if (/^"/.test(match)) {
                cls = /:$/.test(match) ? 'color: #a61717' : 'color: #df5000';
            } else if (/true|false/.test(match)) {
                cls = 'color: #183691';
            } else if (/null/.test(match)) {
                cls = 'color: #a61717';
            } else {
                cls = 'color: #0086b3';
            }
            return `<span style="${cls}">${match}</span>`;
        });
    }
};
