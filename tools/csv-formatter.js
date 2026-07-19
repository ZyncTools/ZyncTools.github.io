window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        try {
            const rows = text.split('\n').filter(r => r.trim());
            if (rows.length < 2) throw new Error('Need header and at least one row');
            const headers = rows[0].split(',').map(h => h.trim());
            const maxW = Math.max(...headers.map(h => h.length));
            const formatRow = (cols) => cols.map(c => c.padEnd(maxW)).join(' | ');
            const output = [
                formatRow(headers),
                formatRow(headers.map(() => '-'.repeat(maxW)))
            ];
            for (let i = 1; i < rows.length; i++) {
                const cols = rows[i].split(',').map(c => c.trim());
                while (cols.length < headers.length) cols.push('');
                output.push(formatRow(cols.slice(0, headers.length)));
            }
            const result = { name: 'formatted.csv', text: output.join('\n'), size: output.join('\n').length };
            addResultItem(result);
            showNotification('CSV formatted', 'success');
            return [result];
        } catch (e) {
            showError(e.message || 'Invalid CSV');
            return [];
        }
    }
};
