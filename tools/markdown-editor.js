window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = text.split('\n').map((line, i) => `- ${line}`).join('\n');
        const result = { name: 'markdown-preview.md', text: output, size: output.length };
        addResultItem(result);
        showNotification('Markdown converted', 'success');
        return [result];
    }
};
