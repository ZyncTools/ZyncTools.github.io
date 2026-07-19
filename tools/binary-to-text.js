window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        let bin = text;
        try {
            if (text.includes(' ')) {
                bin = text.split(' ').map(b => String.fromCharCode(parseInt(b, 2))).join('');
            } else if (/^[01]+$/.test(text)) {
                const padded = text.match(/.{1,8}/g) || [];
                bin = padded.map(b => String.fromCharCode(parseInt(b, 2))).join('');
            }
        } catch (e) {
            showError('Invalid binary input');
            return [];
        }
        const result = { name: 'binary-to-text.txt', text: bin, size: bin.length };
        addResultItem(result);
        showNotification('Binary converted to text', 'success');
        return [result];
    }
};
