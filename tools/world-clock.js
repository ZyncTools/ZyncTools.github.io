window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const now = new Date();
        const output = `Local: ${now.toLocaleString()}\nUTC: ${now.toUTCString()}\nTimezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
        const result = { name: 'world-clock.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('World clock displayed', 'success');
        return [result];
    }
};
