window.ZyncTool = {
    process(input, ctx) {
        const { addResultItem, showNotification, showError, setStatus } = ctx || {};
        const text = input || '';
        const options = (ctx && ctx.config) || {};
        const format = options.format || 'html';
        const includeToc = options.includeToc !== false;

        if (!text.trim()) {
            showError && showError('Empty markdown input');
            return [];
        }

        setStatus && setStatus('Converting markdown...');

        let html = '';
        if (format === 'md') {
            const result = { name: 'markdown.md', text: text, size: text.length };
            addResultItem && addResultItem(result);
            showNotification && showNotification('Markdown exported', 'success');
            return [result];
        }

        html = this._parseMarkdown(text);

        if (includeToc) {
            const headings = text.match(/^#{1,6}\s+.+$/gm) || [];
            if (headings.length) {
                html = '<nav class="toc"><h3>Table of Contents</h3><ul>' +
                    headings.map(h => {
                        const level = h.match(/^#+/)[0].length;
                        const title = h.replace(/^#+\s+/, '');
                        const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                        return `<li style="margin-left:${(level - 1) * 16}px"><a href="#${id}">${title}</a></li>`;
                    }).join('') + '</ul></nav><hr/>' + html;
            }
        }

        if (format === 'pdf') {
            html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Document</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;}h1,h2,h3,h4{color:#333;}pre{background:#f5f5f5;padding:16px;border-radius:4px;overflow-x:auto;}code{background:#f5f5f5;padding:2px 6px;border-radius:3px;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ddd;padding:8px;}th{background:#f5f5f5;}.toc{background:#f9f9f9;padding:16px;border-radius:4px;}</style></head><body>${html}</body></html>`;
        } else {
            html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Markdown Preview</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:900px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333;}h1,h2,h3,h4,h5,h6{margin-top:24px;margin-bottom:16px;font-weight:600;}h1{border-bottom:1px solid #eee;padding-bottom:0.3em;}h2{border-bottom:1px solid #eee;padding-bottom:0.3em;}pre{background:#f6f8fa;padding:16px;border-radius:6px;overflow-x:auto;font-size:85%;}code{background:#f6f8fa;padding:2px 6px;border-radius:3px;font-size:90%;}pre code{background:none;padding:0;}blockquote{border-left:4px solid #dfe2e5;padding-left:16px;color:#6a737d;margin-left:0;}a{color:#0366d6;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #dfe2e5;padding:6px 13px;}th{background:#f6f8fa;font-weight:600;}tr:nth-child(2n){background:#f6f8fa;}img{max-width:100%;}ul,ol{padding-left:24px;}.toc{background:#f9f9f9;padding:16px;border-radius:6px;margin-bottom:24px;}.toc ul{list-style:none;padding-left:16px;}.toc a{text-decoration:none;}</style></head><body>${html}</body></html>`;
        }

        const result = { name: format === 'pdf' ? 'markdown.html' : 'markdown.html', text: html, size: html.length };
        addResultItem && addResultItem(result);
        showNotification && showNotification('Markdown converted', 'success');
        return [result];
    },

    _parseMarkdown(text) {
        let html = text;
        html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        html = html.replace(/^#{6}\s+(.+)$/gm, '<h6 id="$1">$1</h6>');
        html = html.replace(/^#{5}\s+(.+)$/gm, '<h5 id="$1">$1</h5>');
        html = html.replace(/^#{4}\s+(.+)$/gm, '<h4 id="$1">$1</h4>');
        html = html.replace(/^#{3}\s+(.+)$/gm, '<h3 id="$1">$1</h3>');
        html = html.replace(/^#{2}\s+(.+)$/gm, '<h2 id="$1">$1</h2>');
        html = html.replace(/^#{1}\s+(.+)$/gm, '<h1 id="$1">$1</h1>');
        html = html.replace(/```([\s\S]*?)```/g, (m, code) => {
            const lang = code.match(/^(\w+)\n/);
            const body = lang ? code.slice(lang[1].length + 1) : code;
            const cls = lang ? ` class="language-${lang[1]}"` : '';
            return `<pre><code${cls}>${this._escapeHtml(body.trim())}</code></pre>`;
        });
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
        html = html.replace(/_(.+?)_/g, '<em>$1</em>');
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        html = html.replace(/^\s*-\s+\[x\]\s+(.+)$/gm, '<li><input type="checkbox" checked disabled> $1</li>');
        html = html.replace(/^\s*-\s+\[ \]\s+(.+)$/gm, '<li><input type="checkbox" disabled> $1</li>');
        html = html.replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');
        html = html.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');
        html = html.replace(/^\s*>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />');
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\s+"([^"]+)"\)/g, '<img alt="$1" src="$2" title="$3" />');
        html = html.replace(/\|(.+)\|/g, (match) => {
            if (!/^\|?[\s-:]+\|?$/.test(match)) return this._tableRow(match);
            return '';
        });
        html = html.replace(/<\/h[1-6]>\n<\/h[1-6]>/g, '</h1></h1>');
        html = html.replace(/<li>([\s\S]*?)<\/li>/g, (m, content) => {
            if (content.includes('<li>')) return content;
            return m;
        });
        html = html.replace(/(<li>.*<\/li>)/s, (m) => {
            if (m.includes('<li>') && m.split('<li>').length > 2) return `<ul>${m}</ul>`;
            return m;
        });
        const lines = html.split('\n');
        const result = [];
        let inUl = false, inOl = false, inBlockquote = false, inTable = false;
        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) { if (inUl) { result.push('</ul>'); inUl = false; } if (inOl) { result.push('</ol>'); inOl = false; } if (inBlockquote) { result.push('</blockquote>'); inBlockquote = false; } result.push('<br/>'); return; }
            if (trimmed.startsWith('<li>')) { if (!inUl && !inOl) { result.push('<ul>'); inUl = true; } result.push(line); }
            else if (trimmed.startsWith('<blockquote>')) { result.push(line); inBlockquote = true; }
            else if (trimmed.startsWith('<table>') || trimmed.startsWith('<tr>') || trimmed.startsWith('<th>') || trimmed.startsWith('<td>')) { if (!inTable) { result.push('<table>'); inTable = true; } result.push(line); }
            else { if (inUl) { result.push('</ul>'); inUl = false; } if (inOl) { result.push('</ol>'); inOl = false; } if (inBlockquote) { result.push('</blockquote>'); inBlockquote = false; } if (inTable) { result.push('</table>'); inTable = false; } result.push(line); }
        });
        if (inUl) result.push('</ul>');
        if (inOl) result.push('</ol>');
        if (inBlockquote) result.push('</blockquote>');
        if (inTable) result.push('</table>');
        return result.join('\n');
    },

    _tableRow(row) {
        const cells = row.split('|').filter((c, i, arr) => i > 0 && i < arr.length - 1 || arr.length <= 2 ? i < arr.length - 1 : true);
        const filtered = row.split('|').map(c => c.trim()).filter((c, i, arr) => !(arr.length > 2 && (i === 0 || i === arr.length - 1)) || arr.length <= 2);
        const tag = filtered.every(c => /^:?-+:?$/.test(c)) ? 'th' : 'td';
        const cellsHtml = filtered.map(c => `<${tag}>${c}</${tag}>`).join('');
        return `<tr>${cellsHtml}</tr>`;
    },

    _escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
};
