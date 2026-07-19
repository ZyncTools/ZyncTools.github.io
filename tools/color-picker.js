window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = `Color: ${text}\n(Use a hex code like #FF5733)`;
        const result = { name: 'color-picker.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Color picked', 'success');
        return [result];
    }
};
