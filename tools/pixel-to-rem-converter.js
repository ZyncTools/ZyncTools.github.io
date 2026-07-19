window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const px = parseFloat(text) || 16;
        const rem = px / 16;
        const output = `${px}px = ${rem}rem`;
        const result = { name: 'pixel-to-rem.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Converted', 'success');
        return [result];
    }
};
