window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        let ts = parseInt(text, 10);
        if (isNaN(ts) && text.length === 10) ts = parseInt(text, 10) * 1000;
        else if (isNaN(ts) && text.length === 13) ts = parseInt(text, 10);
        else if (isNaN(ts)) { showError('Invalid Unix timestamp'); return []; }
        const date = new Date(ts);
        const output = `Timestamp: ${ts}\nUTC: ${date.toUTCString()}\nLocal: ${date.toLocaleString()}`;
        const result = { name: 'timestamp.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Timestamp converted', 'success');
        return [result];
    }
};
