window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = `background: linear-gradient(${text});`;
        const result = { name: 'gradient.css', text: output, size: output.length };
        addResultItem(result);
        showNotification('Gradient generated', 'success');
        return [result];
    }
};
