window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const output = `Audio recording started...\n(Recording requires browser MediaRecorder API)`;
        const result = { name: 'audio-recording.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Audio recording simulated', 'success');
        return [result];
    }
};
