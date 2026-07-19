window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const cols = text.split(' ')[0] || 3;
        const output = `display: grid;\ngrid-template-columns: repeat(${cols}, 1fr);\ngap: 1rem;`;
        const result = { name: 'grid.css', text: output, size: output.length };
        addResultItem(result);
        showNotification('Grid generated', 'success');
        return [result];
    }
};
