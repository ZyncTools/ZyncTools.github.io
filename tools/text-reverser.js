window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const reversed = text.split('').reverse().join('');
        const result = { name: 'reversed.txt', text: reversed, size: reversed.length };
        addResultItem(result);
        showNotification('Text reversed', 'success');
        return [result];
    }
};
