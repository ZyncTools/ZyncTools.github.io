window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const parts = text.split(' ');
        if (parts.length < 2) { showError('Enter two numbers (e.g. 16 9)'); return []; }
        const [w, h] = parts.map(Number);
        if ([w, h].some(isNaN)) { showError('Enter valid numbers'); return []; }
        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const d = gcd(w, h);
        const output = `Aspect Ratio: ${w/d}:${h/d}\nRatio: ${(w/h).toFixed(4)}\nWidth: ${w}\nHeight: ${h}`;
        const result = { name: 'aspect-ratio.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Aspect ratio calculated', 'success');
        return [result];
    }
};
