window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const parts = text.match(/.{1,50}/g) || [text];
        const previews = parts.slice(0, 5).map(p => `[${p}]`).join('\n');
        const output = `Preview (${parts.length} segment${parts.length !== 1 ? 's' : ''}):\n\n${previews}`;
        const result = { name: 'font-preview.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Font preview generated', 'success');
        return [result];
    }
};
