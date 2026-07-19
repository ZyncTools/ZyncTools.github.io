window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const encoded = encodeURIComponent(text);
        const decoded = decodeURIComponent(text);
        const output = `Encoded:\n${encoded}\n\nDecoded:\n${decoded}`;
        const result = { name: 'url-encoded.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('URL encoded/decoded', 'success');
        return [result];
    }
};
