window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = `box-shadow: ${text};\n-webkit-box-shadow: ${text};\n-moz-box-shadow: ${text};`;
        const result = { name: 'box-shadow.css', text: output, size: output.length };
        addResultItem(result);
        showNotification('Box shadow generated', 'success');
        return [result];
    }
};
