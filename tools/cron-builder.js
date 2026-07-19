window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const parts = text.split(' ').filter(Boolean);
        const output = `Cron: ${parts[0] || '*/5 * * * *'}\nDescription: ${parts.slice(1).join(' ') || 'Every 5 minutes'}`;
        const result = { name: 'cron-expression.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Cron expression built', 'success');
        return [result];
    }
};
