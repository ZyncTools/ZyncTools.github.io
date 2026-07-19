window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const words = text.trim() ? text.trim().split(/\s+/) : [];
        const chars = text.length;
        const charsNoSpaces = text.replace(/\s/g, '').length;
        const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
        const lines = text ? text.split(/\r?\n/).length : 0;
        const readingTime = Math.max(1, Math.ceil(words.length / 200));
        const output = [
            `Words: ${words.length}`,
            `Characters: ${chars}`,
            `Characters (no spaces): ${charsNoSpaces}`,
            `Sentences: ${sentences}`,
            `Lines: ${lines}`,
            `Reading time: ~${readingTime} min`
        ].join('\n');
        const result = { name: 'word-count.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Word count calculated', 'success');
        return [result];
    }
};
