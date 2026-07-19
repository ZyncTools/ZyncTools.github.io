window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = `display: flex;\njustify-content: ${text.split(' ')[0] || 'center'};\nalign-items: ${text.split(' ')[1] || 'center'};`;
        const result = { name: 'flexbox.css', text: output, size: output.length };
        addResultItem(result);
        showNotification('Flexbox generated', 'success');
        return [result];
    }
};
