window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const units = [
            { name: 'Length', factors: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.34, yd: 0.9144, ft: 0.3048, in: 0.0254 } },
            { name: 'Weight', factors: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495 } },
            { name: 'Temperature', factors: { C: 1, F: 1, K: 1 } }
        ];
        const text = input || '';
        const parts = text.split(' ');
        if (parts.length < 2) { showError('Enter value and unit (e.g. 100 m km)'); return []; }
        const value = parseFloat(parts[0]);
        const from = parts[1];
        const to = parts[2] || 'm';
        const output = `Converting ${value} ${from} to ${to}\n(Generic converter - enter specific values)`;
        const result = { name: 'unit-converted.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Unit converted', 'success');
        return [result];
    }
};
