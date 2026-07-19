window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const encoded = btoa(unescape(encodeURIComponent(text)));
        const decoded = decodeURIComponent(escape(atob(text)));
        const output = `Encoded (Base64):\n${encoded}\n\nDecoded:\n${decoded}`;
        const result = { name: 'base64.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Base64 processed', 'success');
        return [result];
    }
};
