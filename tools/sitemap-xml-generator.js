window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const urls = text.split('\n').filter(Boolean);
        const output = urls.map(u => `<url>\n<loc>${u}</loc>\n<lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n</url>`).join('\n');
        const result = { name: 'sitemap.xml', text: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${output}\n</urlset>`, size: output.length };
        addResultItem(result);
        showNotification('Sitemap generated', 'success');
        return [result];
    }
};
