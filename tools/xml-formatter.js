window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        try {
            const doc = new DOMParser().parseFromString(text, 'text/xml');
            const errors = doc.querySelectorAll('parsererror');
            if (errors.length) throw new Error('Invalid XML');
            const formatted = new XMLSerializer().serializeToString(doc);
            const result = { name: 'formatted.xml', text: formatted, size: formatted.length };
            addResultItem(result);
            showNotification('XML formatted', 'success');
            return [result];
        } catch (e) {
            showError('Invalid XML input');
            return [];
        }
    }
};
