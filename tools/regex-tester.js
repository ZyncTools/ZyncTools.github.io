window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const lines = text.split('\n');
        const output = lines.map((l, i) => `${String(i + 1).padStart(3)}: ${l}`).join('\n');
        const result = { name: 'numbered.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Lines numbered', 'success');
        return [result];
    }
};
