window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const parts = text.split(' to ').map(s => s.trim());
        if (parts.length !== 2) { showError('Enter two dates (e.g. 2024-01-01 to 2024-12-31)'); return []; }
        const d1 = new Date(parts[0]);
        const d2 = new Date(parts[1]);
        if (isNaN(d1) || isNaN(d2)) { showError('Invalid date format'); return []; }
        const diff = Math.abs(d2 - d1);
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        const output = `From: ${parts[0]}\nTo: ${parts[1]}\nDays: ${days}\nHours: ${days * 24}`;
        const result = { name: 'date-difference.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Date difference calculated', 'success');
        return [result];
    }
};
