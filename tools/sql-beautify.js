window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'INDEX', 'UNION', 'ALL', 'AS', 'IN', 'NOT', 'NULL', 'IS', 'BETWEEN', 'LIKE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'EXISTS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];
        let formatted = text;
        keywords.forEach(kw => {
            const regex = new RegExp('\\b' + kw + '\\b', 'g');
            formatted = formatted.replace(regex, kw);
        });
        const lines = formatted.split(';').filter(s => s.trim()).map(s => s.trim() + ';');
        const output = lines.join('\n\n');
        const result = { name: 'sql-beautified.sql', text: output, size: output.length };
        addResultItem(result);
        showNotification('SQL beautified', 'success');
        return [result];
    }
};
