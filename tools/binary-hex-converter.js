window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const bin = text.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
        const hex = text.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
        const dec = text.split('').map(c => c.charCodeAt(0)).join(' ');
        const output = `Binary:\n${bin}\n\nHexadecimal:\n${hex}\n\nDecimal:\n${dec}`;
        const result = { name: 'conversions.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Binary/Hex converted', 'success');
        return [result];
    }
};
