window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = `<meta name="description" content="${text}">\n<meta property="og:title" content="${text}">\n<meta property="og:description" content="${text}">`;
        const result = { name: 'meta-tags.html', text: output, size: output.length };
        addResultItem(result);
        showNotification('Meta tags generated', 'success');
        return [result];
    }
};
