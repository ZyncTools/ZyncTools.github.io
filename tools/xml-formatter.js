window.ZyncTool = {
    process(input, ctx) {
        const { addResultItem, showNotification, showError, setStatus } = ctx || {};
        const text = input || '';
        const options = (ctx && ctx.config) || {};
        const mode = options.mode || 'beautify';

        if (!text.trim()) {
            showError && showError('Empty XML input');
            return [];
        }

        setStatus && setStatus('Processing XML...');

        let doc;
        try {
            doc = new DOMParser().parseFromString(text, 'application/xml');
            const errorNodes = doc.querySelectorAll('parsererror');
            if (errorNodes.length > 0) {
                const errMsg = errorNodes[0].textContent || 'Invalid XML';
                showError && showError(`XML Error: ${errMsg.split('\n')[0]}`);
                return [];
            }
        } catch (e) {
            showError && showError(`XML Error: ${e.message}`);
            return [];
        }

        if (mode === 'minify') {
            const serializer = new XMLSerializer();
            const xmlStr = serializer.serializeToString(doc);
            const minified = xmlStr.replace(/>\s+</g, '><').trim();
            const result = { name: 'minified.xml', text: minified, size: minified.length };
            addResultItem && addResultItem(result);
            showNotification && showNotification('XML minified', 'success');
            return [result];
        }

        const output = [];
        output.push('<?xml version="1.0" encoding="UTF-8"?>');
        output.push('');
        output.push(this._renderNode(doc.documentElement, 0, options.namespaces !== false));

        if (options.tree) {
            output.push('');
            output.push('=== TREE VIEW ===');
            output.push(this._buildTreeView(doc.documentElement, 0));
        }

        if (options.search) {
            output.push('');
            output.push('=== SEARCH RESULTS ===');
            output.push(this._searchXml(doc, options.search.toLowerCase()));
        }

        const resultText = output.join('\n');
        const result = { name: 'formatted.xml', text: resultText, size: resultText.length };
        addResultItem && addResultItem(result);
        showNotification && showNotification('XML processed', 'success');
        return [result];
    },

    _renderNode(node, depth, showNs) {
        const indent = '  '.repeat(depth);
        const tagName = node.tagName;
        const attrs = Array.from(node.attributes || []);
        const ns = showNs ? this._formatNamespaces(attrs) : '';

        let attrStr = '';
        attrs.forEach(attr => {
            if (showNs && (attr.name === 'xmlns' || attr.name.startsWith('xmlns:'))) return;
            attrStr += ` ${attr.name}="${attr.value}"`;
        });
        if (ns) attrStr += ' ' + ns;

        const children = Array.from(node.childNodes).filter(n => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim()));

        if (children.length === 0) {
            if (node.textContent && node.textContent.trim()) {
                return `${indent}<${tagName}${attrStr}>${this._escapeXml(node.textContent)}</${tagName}>`;
            }
            return `${indent}<${tagName}${attrStr} />`;
        }

        const lines = [`${indent}<${tagName}${attrStr}>`];
        children.forEach(child => {
            if (child.nodeType === 1) {
                lines.push(this._renderNode(child, depth + 1, showNs));
            } else if (child.nodeType === 3 && child.textContent.trim()) {
                lines.push(`${indent}  ${this._escapeXml(child.textContent.trim())}`);
            }
        });
        lines.push(`${indent}</${tagName}>`);
        return lines.join('\n');
    },

    _formatNamespaces(attrs) {
        const nsAttrs = attrs.filter(a => a.name === 'xmlns' || a.name.startsWith('xmlns:'));
        if (!nsAttrs.length) return '';
        return nsAttrs.map(a => `${a.name}="${a.value}"`).join(' ');
    },

    _buildTreeView(node, depth) {
        const indent = '  '.repeat(depth);
        const lines = [`${indent}${node.tagName}`];
        Array.from(node.attributes || []).forEach(attr => {
            lines.push(`${indent}  @${attr.name}="${attr.value}"`);
        });
        Array.from(node.childNodes).filter(n => n.nodeType === 1).forEach(child => {
            lines.push(this._buildTreeView(child, depth + 1));
        });
        return lines.join('\n');
    },

    _searchXml(doc, query) {
        const results = [];
        const walk = (node, path) => {
            if (node.nodeType === 1) {
                const tag = node.tagName.toLowerCase();
                const pathStr = path ? `${path}/${tag}` : tag;
                if (tag.includes(query)) {
                    results.push(`FOUND: ${pathStr}`);
                }
                Array.from(node.attributes).forEach(attr => {
                    if (attr.name.toLowerCase().includes(query) || attr.value.toLowerCase().includes(query)) {
                        results.push(`ATTR: ${pathStr} @${attr.name}="${attr.value}"`);
                    }
                });
                Array.from(node.childNodes).forEach(child => walk(child, pathStr));
            } else if (node.nodeType === 3 && node.textContent.trim().toLowerCase().includes(query)) {
                results.push(`TEXT: ${path} => "${node.textContent.trim()}"`);
            }
        };
        walk(doc.documentElement, '');
        return results.length ? results.join('\n') : 'No matches found';
    },

    _escapeXml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
};
