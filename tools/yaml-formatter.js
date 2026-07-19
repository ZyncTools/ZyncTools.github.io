window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        try {
            const obj = JSON.parse(text);
            const output = JSON.stringify(obj, null, 2);
            const result = { name: 'yaml-converted.yaml', text: output, size: output.length };
            addResultItem(result);
            showNotification('YAML converted', 'success');
            return [result];
        } catch (e) {
            showError('Invalid input for YAML conversion');
            return [];
        }
    }
};
