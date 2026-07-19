window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = `<script type="application/ld+json">\n${text}\n</script>`;
        const result = { name: 'schema-markup.html', text: output, size: output.length };
        addResultItem(result);
        showNotification('Schema markup generated', 'success');
        return [result];
    }
};
