window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = [
            `UPPER: ${text.toUpperCase()}`,
            `lower: ${text.toLowerCase()}`,
            `Title: ${text.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase())}`,
            `camel: ${text.replace(/[^a-zA-Z0-9]+(.)/g, (m, c) => c.toUpperCase())}`,
            `snake: ${text.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase()}`,
            `kebab: ${text.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}`
        ].join('\n');
        const result = { name: 'case-converted.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Case converted', 'success');
        return [result];
    }
};
