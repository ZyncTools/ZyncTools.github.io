window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const parts = text.split(' ').map(Number);
        if (parts.length < 2 || parts.some(isNaN)) { showError('Enter two numbers (e.g. 1920 1080)'); return []; }
        const [w, h] = parts;
        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const d = gcd(w, h);
        const output = `Aspect Ratio: ${w/d}:${h/d}\nRatio: ${(w/h).toFixed(4)}`;
        const result = { name: 'aspect-ratio.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Aspect ratio calculated', 'success');
        return [result];
    }
};
