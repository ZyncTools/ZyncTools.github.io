window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = `background: linear-gradient(${text});\nbackground: -webkit-linear-gradient(${text});`;
        const result = { name: 'gradient-preview.css', text: output, size: output.length };
        addResultItem(result);
        showNotification('Gradient preview generated', 'success');
        return [result];
    }
};
