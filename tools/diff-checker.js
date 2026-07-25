window.ZyncTool = {
    process(input, ctx) {
        const { addResultItem, showNotification, showError, setStatus } = ctx || {};
        const text = input || '';
        const options = (ctx && ctx.config) || {};
        const mode = options.mode || 'line';
        const ignoreWs = options.ignoreWhitespace || false;

        if (!text.trim()) {
            showError && showError('Empty diff input');
            return [];
        }

        setStatus && setStatus('Computing diff...');

        const parts = text.split('\n---\n');
        const left = (parts[0] || '').trim();
        const right = (parts[1] || '').trim();

        const processLine = (line) => ignoreWs ? line.replace(/\s+/g, '').trim() : line;
        const leftLines = left.split('\n');
        const rightLines = right.split('\n');

        let diff = '=== DIFF RESULTS ===\n';
        diff += `Mode: ${mode} differences\n`;
        diff += `Ignore Whitespace: ${ignoreWs ? 'Yes' : 'No'}\n\n`;

        if (mode === 'line') {
            const max = Math.max(leftLines.length, rightLines.length);
            for (let i = 0; i < max; i++) {
                const l = i < leftLines.length ? processLine(leftLines[i]) : '';
                const r = i < rightLines.length ? processLine(rightLines[i]) : '';
                if (l === r) {
                    diff += `  ${l}\n`;
                } else {
                    diff += `- ${l}\n`;
                    diff += `+ ${r}\n`;
                }
            }
        } else if (mode === 'word') {
            diff += this._wordDiff(leftLines.join('\n'), rightLines.join('\n'), ignoreWs);
        } else if (mode === 'char') {
            diff += this._charDiff(leftLines.join('\n'), rightLines.join('\n'), ignoreWs);
        }

        const stats = this._calcStats(diff);
        diff += `\n=== STATISTICS ===\n`;
        diff += `Additions: ${stats.additions}\n`;
        diff += `Deletions: ${stats.deletions}\n`;
        diff += `Unchanged: ${stats.unchanged}\n`;

        const result = { name: 'diff.txt', text: diff, size: diff.length };
        addResultItem && addResultItem(result);
        showNotification && showNotification('Diff computed', 'success');
        return [result];
    },

    _wordDiff(left, right, ignoreWs) {
        const proc = (s) => ignoreWs ? s.replace(/\s+/g, '').trim() : s;
        const lWords = proc(left).split(/(\s+)/);
        const rWords = proc(right).split(/(\s+)/);
        const max = Math.max(lWords.length, rWords.length);
        let diff = '';
        for (let i = 0; i < max; i++) {
            const l = i < lWords.length ? lWords[i] : '';
            const r = i < rWords.length ? rWords[i] : '';
            if (l === r) diff += l;
            else {
                if (l) diff += `[-${l}-]`;
                if (r) diff += `{+${r}+}`;
            }
        }
        return diff;
    },

    _charDiff(left, right, ignoreWs) {
        const l = ignoreWs ? left.replace(/\s/g, '') : left;
        const r = ignoreWs ? right.replace(/\s/g, '') : right;
        const max = Math.max(l.length, r.length);
        let diff = '';
        for (let i = 0; i < max; i++) {
            const lc = i < l.length ? l[i] : '';
            const rc = i < r.length ? r[i] : '';
            if (lc === rc) diff += lc;
            else {
                if (lc) diff += `[-${lc === '\n' ? '\\n' : lc}-]`;
                if (rc) diff += `{+${rc === '\n' ? '\\n' : rc}+}`;
            }
        }
        return diff;
    },

    _calcStats(diff) {
        const lines = diff.split('\n');
        return {
            additions: (diff.match(/^\+/gm) || []).length,
            deletions: (diff.match(/^-/gm) || []).length,
            unchanged: lines.filter(l => l.startsWith('  ')).length
        };
    }
};
