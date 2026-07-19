window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const parts = text.split(/[ ,]+/).filter(Boolean).map(Number);
        const sum = parts.reduce((a, b) => a + b, 0);
        const output = `Numbers: ${parts.join(', ')}\nCount: ${parts.length}\nSum: ${sum}\nAverage: ${parts.length ? (sum / parts.length).toFixed(2) : 0}`;
        const result = { name: 'math-result.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Math calculated', 'success');
        return [result];
    }
};
