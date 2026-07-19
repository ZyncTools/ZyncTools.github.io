window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const length = parseInt(text) || 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
        const array = new Uint32Array(length);
        crypto.getRandomValues(array);
        let password = '';
        for (let i = 0; i < length; i++) password += charset[array[i] % charset.length];
        const result = { name: 'password.txt', text: password, size: password.length };
        addResultItem(result);
        showNotification('Password generated', 'success');
        return [result];
    }
};
