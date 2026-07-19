window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const parts = text.split('.').map(p => p.trim()).filter(Boolean);
        if (parts.length !== 4) { showError('Invalid IPv4 address'); return []; }
        const hex = parts.map(p => parseInt(p, 10).toString(16).padStart(2, '0')).join(':');
        const binary = parts.map(p => parseInt(p, 10).toString(2).padStart(8, '0')).join('.');
        const output = `IPv4: ${text}\nIPv6-style: ${hex}\nBinary: ${binary}`;
        const result = { name: 'ip-converted.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('IP converted', 'success');
        return [result];
    }
};
