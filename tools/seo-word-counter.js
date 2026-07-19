window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const words = text.trim() ? text.trim().split(/\s+/) : [];
        const output = `Words: ${words.length}\nCharacters: ${text.length}\nReading time: ~${Math.max(1, Math.ceil(words.length / 200))} min`;
        const result = { name: 'word-count.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Word count calculated', 'success');
        return [result];
    }
};
