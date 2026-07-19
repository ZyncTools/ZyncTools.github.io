window.ZyncTool = {
    async process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const md5 = await crypto.subtle.digest('MD5', new TextEncoder().encode(text)).catch(() => null);
        const toHex = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        const output = md5 ? toHex(md5) : 'N/A';
        const result = { name: 'md5-hash.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('MD5 hash generated', 'success');
        return [result];
    }
};
