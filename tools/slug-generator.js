window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const slug = text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const result = { name: 'slug.txt', text: slug, size: slug.length };
        addResultItem(result);
        showNotification('Slug generated', 'success');
        return [result];
    }
};
