window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const lines = text.split('\n');
        const preview = lines.slice(0, 10).map((l, i) => `Line ${i + 1}: ${l}`).join('\n');
        const output = preview + (lines.length > 10 ? `\n\n... and ${lines.length - 10} more lines` : '');
        const result = { name: 'ini-preview.ini', text: output, size: output.length };
        addResultItem(result);
        showNotification('INI processed', 'success');
        return [result];
    }
};
