window.ZyncTool = {
    process(input, ctx) {
        const { addResultItem, showNotification, showError, setStatus } = ctx || {};
        const text = input || '';
        const options = (ctx && ctx.config) || {};
        const style = options.style || 'all';

        if (!text) {
            showError && showError('Empty input');
            return [];
        }

        setStatus && setStatus('Converting case...');

        const conversions = {
            uppercase: text.toUpperCase(),
            lowercase: text.toLowerCase(),
            title: text.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase()),
            sentence: text.replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase()),
            camel: text.replace(/[^a-zA-Z0-9]+(.)/g, (m, c) => c.toUpperCase()).replace(/^[A-Z]/, c => c.toLowerCase()),
            pascal: text.replace(/[^a-zA-Z0-9]+(.)/g, (m, c) => c.toUpperCase()).replace(/^./, c => c.toUpperCase()),
            snake: text.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase(),
            kebab: text.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase(),
            constant: text.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toUpperCase(),
            dot: text.replace(/[^a-zA-Z0-9]+/g, '.').replace(/^\.|\.$/g, '').toLowerCase(),
            inverse: text.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join(''),
            random: text.split('').map(c => Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase()).join('')
        };

        let output = '';
        if (style === 'all') {
            output = Object.entries(conversions).map(([k, v]) => `${k.toUpperCase().padEnd(12)}: ${v}`).join('\n');
        } else {
            const key = style.toLowerCase().replace(/[^a-z0-9]/g, '');
            const match = Object.keys(conversions).find(k => k.includes(key) || key.includes(k));
            output = match ? conversions[match] : conversions.lowercase;
        }

        const result = { name: 'case-converted.txt', text: output, size: output.length };
        addResultItem && addResultItem(result);
        showNotification && showNotification('Case converted', 'success');
        return [result];
    }
};
