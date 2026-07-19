window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        try {
            let sql = text;
            const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'INDEX'];
            keywords.forEach(kw => {
                sql = sql.replace(new RegExp('\\b' + kw + '\\b', 'gi'), kw);
            });
            const lines = sql.split(';').filter(s => s.trim()).map(s => s.trim() + ';');
            const output = lines.join('\n\n');
            const result = { name: 'sql-formatted.sql', text: output, size: output.length };
            addResultItem(result);
            showNotification('SQL formatted', 'success');
            return [result];
        } catch (e) {
            showError('Failed to format SQL');
            return [];
        }
    }
};
