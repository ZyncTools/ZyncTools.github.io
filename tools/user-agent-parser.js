window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const output = navigator.userAgent;
        const result = { name: 'user-agent.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('User agent parsed', 'success');
        return [result];
    }
};
