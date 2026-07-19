window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const parts = text.split(',').map(s => s.trim()).filter(Boolean);
        const output = parts.map((p, i) => `<link rel="alternate" href="${p}" hreflang="${['en','fr','de','es','ja','zh'][i % 6]}" />`).join('\n');
        const result = { name: 'hreflang.html', text: output, size: output.length };
        addResultItem(result);
        showNotification('Hreflang tags generated', 'success');
        return [result];
    }
};
