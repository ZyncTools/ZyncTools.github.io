window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const parts = text.split('?');
        if (parts.length < 2) { showError('Invalid JWT format'); return []; }
        const header = JSON.parse(atob(parts[0]));
        const payload = JSON.parse(atob(parts[1]));
        const output = `Header:\n${JSON.stringify(header, null, 2)}\n\nPayload:\n${JSON.stringify(payload, null, 2)}`;
        const result = { name: 'jwt-decoded.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('JWT decoded', 'success');
        return [result];
    }
};
