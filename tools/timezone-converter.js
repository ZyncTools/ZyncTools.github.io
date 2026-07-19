window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const now = new Date();
        const tz = text || Intl.DateTimeFormat().resolvedOptions().timeZone;
        const output = `Timezone: ${tz}\nUTC Offset: ${now.getTimezoneOffset() > 0 ? '-' : '+'}${Math.abs(now.getTimezoneOffset() / 60)}\nLocal: ${now.toLocaleString()}`;
        const result = { name: 'timezone.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Timezone converted', 'success');
        return [result];
    }
};
