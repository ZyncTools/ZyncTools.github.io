window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = text.split('').map(c => c.charCodeAt(0)).join(' ');
        const result = { name: 'ascii-codes.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('ASCII codes generated', 'success');
        return [result];
    }
};
