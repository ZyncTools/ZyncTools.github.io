window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        let obj;
        try { obj = JSON.parse(text); } catch (e) { showError('Invalid JSON input'); return []; }
        let path = '$';
        const lines = [path];
        const traverse = (current, p) => {
            if (Array.isArray(current)) {
                current.forEach((v, i) => {
                    const np = `${p}[${i}]`;
                    lines.push(np);
                    traverse(v, np);
                });
            } else if (current && typeof current === 'object') {
                Object.keys(current).forEach(k => {
                    const np = `${p}.${k}`;
                    lines.push(np);
                    traverse(current[k], np);
                });
            }
        };
        traverse(obj, path);
        const output = lines.join('\n');
        const result = { name: 'json-paths.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('JSON paths extracted', 'success');
        return [result];
    }
};
