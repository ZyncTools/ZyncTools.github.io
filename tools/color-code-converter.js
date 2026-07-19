window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const hex = text.replace(/#/g, '').match(/.{1,6}/g) || [text.replace(/#/g, '')];
        const output = hex.map(h => {
            const r = parseInt(h.slice(0, 2), 16);
            const g = parseInt(h.slice(2, 4), 16);
            const b = parseInt(h.slice(4, 6), 16);
            return `#${h} => RGB(${r}, ${g}, ${b}), HSL(${Math.round(r * 0.299 + g * 0.587 + b * 0.114)}, 50%, 50%)`;
        }).join('\n');
        const result = { name: 'color-codes.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Color codes converted', 'success');
        return [result];
    }
};
