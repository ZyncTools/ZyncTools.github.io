window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = text.replace(/\s+/g, ' ').trim();
        const result = { name: 'minified.html', text: output, size: output.length };
        addResultItem(result);
        showNotification('HTML minified', 'success');
        return [result];
    }
};
