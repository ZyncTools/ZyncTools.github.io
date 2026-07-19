window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = `border-radius: ${text};`;
        const result = { name: 'border-radius.css', text: output, size: output.length };
        addResultItem(result);
        showNotification('Border radius generated', 'success');
        return [result];
    }
};
