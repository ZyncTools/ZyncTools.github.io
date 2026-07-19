window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = text.replace(/\s+/g, ' ').trim();
        const result = { name: 'minified.css', text: output, size: output.length };
        addResultItem(result);
        showNotification('CSS minified', 'success');
        return [result];
    }
};
