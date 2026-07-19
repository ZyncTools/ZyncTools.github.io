window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const mins = parseInt(text) || 5;
        const end = new Date(Date.now() + mins * 60000);
        const output = `Timer set for ${mins} minute(s)\nEnds: ${end.toLocaleTimeString()}`;
        const result = { name: 'timer.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Timer set', 'success');
        return [result];
    }
};
