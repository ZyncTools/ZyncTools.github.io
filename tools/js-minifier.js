window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = text.replace(/\s+/g, ' ').trim();
        const result = { name: 'minified.js', text: output, size: output.length };
        addResultItem(result);
        showNotification('JS minified', 'success');
        return [result];
    }
};
