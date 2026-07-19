window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const output = `Screen recording started...\n(Recording requires browser getDisplayMedia API)`;
        const result = { name: 'screen-recording.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Screen recording simulated', 'success');
        return [result];
    }
};
