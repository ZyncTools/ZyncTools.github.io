window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const lines = text.split('\n');
        const output = lines.map((l, i) => `${String(i + 1).padStart(3)}: ${l}`).join('\n');
        const result = { name: 'regex-tested.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Regex tested', 'success');
        return [result];
    }
};
