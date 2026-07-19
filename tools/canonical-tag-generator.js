window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = `<link rel="canonical" href="${text}" />`;
        const result = { name: 'canonical-tag.html', text: output, size: output.length };
        addResultItem(result);
        showNotification('Canonical tag generated', 'success');
        return [result];
    }
};
