window.ZyncTool = {
    async process(input, { addResultItem, showNotification, setProgress }) {
        const text = input || '';
        const md5 = await crypto.subtle.digest('MD5', new TextEncoder().encode(text)).catch(() => null);
        const sha1 = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text)).catch(() => null);
        const sha256 = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).catch(() => null);
        const sha512 = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(text)).catch(() => null);
        const toHex = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        const output = [
            `MD5: ${md5 ? toHex(md5) : 'N/A'}`,
            `SHA-1: ${sha1 ? toHex(sha1) : 'N/A'}`,
            `SHA-256: ${sha256 ? toHex(sha256) : 'N/A'}`,
            `SHA-512: ${sha512 ? toHex(sha512) : 'N/A'}`
        ].join('\n');
        const result = { name: 'hashes.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Hashes generated', 'success');
        return [result];
    }
};
