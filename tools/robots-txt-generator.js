window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = `User-agent: *\nDisallow: ${text}`;
        const result = { name: 'robots.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Robots.txt generated', 'success');
        return [result];
    }
};
