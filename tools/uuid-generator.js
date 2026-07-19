window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const uuid = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        const result = { name: 'uuid.txt', text: uuid, size: uuid.length };
        addResultItem(result);
        showNotification('UUID generated', 'success');
        return [result];
    }
};
