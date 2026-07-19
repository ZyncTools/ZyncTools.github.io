window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = JSON.stringify(JSON.parse(text), null, 2);
        const result = { name: 'formatted.json', text: output, size: output.length };
        addResultItem(result);
        showNotification('JSON formatted', 'success');
        return [result];
    }
};
