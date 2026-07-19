window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const start = new Date(text).getTime() || Date.now();
        const output = `Started: ${new Date(start).toLocaleString()}`;
        const result = { name: 'stopwatch.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Stopwatch started', 'success');
        return [result];
    }
};
