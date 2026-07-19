window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'ON', 'GROUP', 'BY', 'ORDER', 'LIMIT'];
        let sql = text;
        keywords.forEach(kw => { sql = sql.replace(new RegExp('\\b' + kw + '\\b', 'g'), kw); });
        const lines = sql.split(';').filter(s => s.trim()).map(s => s.trim() + ';');
        const output = lines.join('\n\n');
        const result = { name: 'sql-beautified.sql', text: output, size: output.length };
        addResultItem(result);
        showNotification('SQL beautified', 'success');
        return [result];
    }
};
