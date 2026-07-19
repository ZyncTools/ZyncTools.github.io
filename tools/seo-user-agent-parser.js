window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = `User Agent: ${navigator.userAgent}\nPlatform: ${navigator.platform}\nLanguage: ${navigator.language}`;
        const result = { name: 'user-agent.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('User agent parsed', 'success');
        return [result];
    }
};
