window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const parts = text.split('\n---\n');
        const left = parts[0] || '';
        const right = parts[1] || '';
        const leftLines = left.split('\n');
        const rightLines = right.split('\n');
        const max = Math.max(leftLines.length, rightLines.length);
        let diff = '';
        for (let i = 0; i < max; i++) {
            const l = leftLines[i] || '';
            const r = rightLines[i] || '';
            if (l === r) diff += `  ${l}\n`;
            else diff += `- ${l}\n+ ${r}\n`;
        }
        const result = { name: 'diff.txt', text: diff, size: diff.length };
        addResultItem(result);
        showNotification('Diff generated', 'success');
        return [result];
    }
};
