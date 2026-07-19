window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const output = `DNS lookup for: ${text}\n(Requires server-side implementation)`;
        const result = { name: 'dns-lookup.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('DNS lookup simulated', 'success');
        return [result];
    }
};
