window.ZyncTool = {
    process(input, ctx) {
        const { addResultItem, showNotification, showError, setStatus } = ctx || {};
        const text = input || '';
        const options = (ctx && ctx.config) || {};
        const mode = options.mode || 'encode';

        if (!text) {
            showError && showError('Empty input');
            return [];
        }

        setStatus && setStatus('Processing HTML...');

        let encoded = '', decoded = '';

        if (mode === 'encode' || mode === 'both') {
            encoded = text.replace(/[&<>"']/g, (m) => {
                const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
                return map[m];
            });
        }

        if (mode === 'decode' || mode === 'both') {
            const decoder = document.createElement('textarea');
            decoder.innerHTML = text;
            decoded = decoder.value;
            decoded = decoded.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
        }

        let resultText = '';
        let resultName = '';

        if (mode === 'encode') {
            resultText = encoded;
            resultName = 'encoded.html';
        } else if (mode === 'decode') {
            resultText = decoded;
            resultName = 'decoded.html';
        } else {
            resultText = `ENCODED:\n${encoded}\n\nDECODED:\n${decoded}`;
            resultName = 'html-encoded.txt';
        }

        if (options.validate) {
            const validation = this._validateHtml(decoded || text);
            resultText = `VALIDATION:\n${validation}\n\n${resultText}`;
        }

        const result = { name: resultName, text: resultText, size: resultText.length };
        addResultItem && addResultItem(result);
        showNotification && showNotification('HTML encoded/decoded', 'success');
        return [result];
    },

    _validateHtml(html) {
        if (!html) return 'No content to validate';
        const issues = [];
        if (!html.trim()) return 'Empty content';
        if ((html.match(/<script/g) || []).length !== (html.match(/<\/script>/g) || []).length) {
            issues.push('Unmatched <script> tags');
        }
        if ((html.match(/<div/g) || []).length !== (html.match(/<\/div>/g) || []).length) {
            issues.push('Unmatched <div> tags');
        }
        if ((html.match(/<p/g) || []).length !== (html.match(/<\/p>/g) || []).length) {
            issues.push('Unmatched <p> tags');
        }
        if ((html.match(/<span/g) || []).length !== (html.match(/<\/span>/g) || []).length) {
            issues.push('Unmatched <span> tags');
        }
        const unclosed = html.match(/<[^/][^>]*>/g) || [];
        const closed = html.match(/<\/[^>]+>/g) || [];
        if (unclosed.length - closed.length > 5) {
            issues.push(`Possible unclosed tags: ${unclosed.length - closed.length} more opening than closing`);
        }
        return issues.length ? `Issues found:\n${issues.map(i => '- ' + i).join('\n')}` : 'HTML structure looks valid';
    }
};
