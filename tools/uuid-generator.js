window.ZyncTool = {
    process(input, ctx) {
        const { addResultItem, showNotification, showError, setStatus } = ctx || {};
        const options = (ctx && ctx.config) || {};
        const version = options.version || 'v4';
        const count = Math.min(1000, Math.max(1, parseInt(options.count) || 1));
        const upper = options.uppercase || false;

        setStatus && setStatus(`Generating ${count} UUID${count > 1 ? 's' : ''}...`);

        const uuids = [];
        for (let i = 0; i < count; i++) {
            let uuid = '';
            switch (version) {
                case 'v1':
                    uuid = this._v1();
                    break;
                case 'v7':
                    uuid = this._v7();
                    break;
                case 'v4':
                default:
                    uuid = this._v4();
                    break;
            }
            uuids.push(upper ? uuid.toUpperCase() : uuid.toLowerCase());
        }

        const output = uuids.join('\n');
        const result = { name: 'uuids.txt', text: output, size: output.length };
        addResultItem && addResultItem(result);
        showNotification && showNotification(`Generated ${count} UUID${count > 1 ? 's' : ''}`, 'success');
        return [result];
    },

    _v4() {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0F) | 0x40;
        bytes[8] = (bytes[8] & 0x3F) | 0x80;
        const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    },

    _v1() {
        const now = Date.now();
        const timeLow = (now & 0xFFFFFFFF) >>> 0;
        const timeMid = ((now / 0x10000) & 0xFFFF) >>> 0;
        const timeHi = ((now / 0x100000000) & 0x0FFF) >>> 0;
        const clockSeq = Math.floor(Math.random() * 0x3FFF);
        const nodeBytes = new Uint8Array(6);
        crypto.getRandomValues(nodeBytes);
        const hex = [
            timeLow.toString(16).padStart(8, '0'),
            timeMid.toString(16).padStart(4, '0'),
            ((timeHi & 0x0FFF) | 0x1000).toString(16).padStart(4, '0'),
            ((clockSeq & 0x3FFF) | 0x8000).toString(16).padStart(4, '0'),
            Array.from(nodeBytes).map(b => b.toString(16).padStart(2, '0')).join('')
        ];
        return `${hex[0]}-${hex[1]}-${hex[2]}-${hex[3]}-${hex[4]}`;
    },

    _v7() {
        const now = Date.now();
        const timeHigh = Math.floor(now / 0x100000000) & 0xFFFF;
        const timeMid = Math.floor(now / 0x10000) & 0xFFFF;
        const timeLow = now & 0xFFFF;
        const randBytes = new Uint8Array(10);
        crypto.getRandomValues(randBytes);
        const hex = [
            timeHigh.toString(16).padStart(4, '0'),
            timeMid.toString(16).padStart(4, '0'),
            timeLow.toString(16).padStart(4, '0'),
            Array.from(randBytes.slice(0, 2)).map(b => b.toString(16).padStart(2, '0')).join(''),
            Array.from(randBytes.slice(2)).map(b => b.toString(16).padStart(2, '0')).join('')
        ];
        const varByte = parseInt(hex[3], 16);
        const v7Byte = ((varByte & 0x0FFF) | 0x7000).toString(16).padStart(4, '0');
        const resByte = ((parseInt(hex[3], 16) & 0x0FFF) | 0x8000).toString(16).padStart(4, '0');
        return `${hex[0]}-${hex[1]}-7${v7Byte.slice(1)}-${resByte}-${hex[4]}`;
    }
};
