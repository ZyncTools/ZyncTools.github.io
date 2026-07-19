window.ZyncTool = {
    async process(input, { addResultItem, showNotification }) {
        const text = input || '';
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            const output = `IP: ${data.ip}\nUser Agent: ${navigator.userAgent}`;
            const result = { name: 'my-ip.txt', text: output, size: output.length };
            addResultItem(result);
            showNotification('IP retrieved', 'success');
            return [result];
        } catch (e) {
            showError('Could not retrieve IP');
            return [];
        }
    }
};
