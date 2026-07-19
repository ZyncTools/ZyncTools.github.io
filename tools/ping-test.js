window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = `Ping test to: ${text}\n(Requires server-side implementation)`;
        const result = { name: 'ping-test.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Ping test simulated', 'success');
        return [result];
    }
};
