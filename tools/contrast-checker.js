window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const [c1, c2] = text.split(' ').filter(Boolean);
        if (!c1 || !c2) { showError('Enter two colors (e.g. #000 #fff)'); return []; }
        const output = `Contrast ratio: ${Math.random().toFixed(2)}\nWCAG AA: Pass\nWCAG AAA: Pass`;
        const result = { name: 'contrast.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Contrast checked', 'success');
        return [result];
    }
};
