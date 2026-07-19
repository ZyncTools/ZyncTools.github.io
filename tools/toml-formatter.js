window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        try {
            const obj = JSON.parse(text);
            const lines = [];
            const traverse = (o, indent) => {
                if (Array.isArray(o)) {
                    o.forEach(v => traverse(v, indent));
                } else if (o && typeof o === 'object') {
                    Object.entries(o).forEach(([k, v]) => {
                        lines.push(`${indent}${k} = ${JSON.stringify(v)}`);
                        if (v && typeof v === 'object' && !Array.isArray(v)) traverse(v, indent + '  ');
                    });
                }
            };
            traverse(obj, '');
            const output = lines.join('\n');
            const result = { name: 'formatted.toml', text: output, size: output.length };
            addResultItem(result);
            showNotification('TOML formatted', 'success');
            return [result];
        } catch (e) {
            showError('Invalid JSON input');
            return [];
        }
    }
};
