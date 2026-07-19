window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = `<meta property="og:title" content="${text}">\n<meta property="og:description" content="${text}">\n<meta property="og:image" content="">\n<meta property="og:type" content="website">`;
        const result = { name: 'og-tags.html', text: output, size: output.length };
        addResultItem(result);
        showNotification('OG tags generated', 'success');
        return [result];
    }
};
