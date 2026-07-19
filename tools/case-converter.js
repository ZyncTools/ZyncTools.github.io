window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = [
            `UPPER CASE: ${text.toUpperCase()}`,
            `lower case: ${text.toLowerCase()}`,
            `Title Case: ${text.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase())}`,
            `camelCase: ${text.replace(/[^a-zA-Z0-9]+(.)/g, (m, c) => c.toUpperCase())}`,
            `snake_case: ${text.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase()}`,
            `kebab-case: ${text.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}`,
            `Sentence case. ${text.toLowerCase()}`,
            `ALLCAPS: ${text.toUpperCase().replace(/[^A-Z0-9]+/g, '')}`,
            `iNVERTED: ${text.split('').reverse().join('')}`
        ].join('\n\n');
        const result = { name: 'case-converted.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Case conversion done', 'success');
        return [result];
    }
};
