window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const encoded = text.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
        const decoded = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        const output = `Encoded:\n${encoded}\n\nDecoded:\n${decoded}`;
        const result = { name: 'html-encoded.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('HTML encoded/decoded', 'success');
        return [result];
    }
};
