window.ZyncTool = {
    process(input, { addResultItem, showNotification, config }) {
        const length = parseInt(config?.length || 16, 10);
        const includeUpper = config?.uppercase !== false;
        const includeLower = config?.lowercase !== false;
        const includeNumbers = config?.numbers !== false;
        const includeSymbols = config?.symbols || false;
        const charset = [];
        if (includeUpper) charset.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        if (includeLower) charset.push('abcdefghijklmnopqrstuvwxyz');
        if (includeNumbers) charset.push('0123456789');
        if (includeSymbols) charset.push('!@#$%^&*()_+-=[]{}|;:,.<>?');
        const pool = charset.join('');
        const array = new Uint32Array(length);
        crypto.getRandomValues(array);
        let password = '';
        for (let i = 0; i < length; i++) {
            password += pool[array[i] % pool.length];
        }
        const result = { name: 'password.txt', text: password, size: password.length };
        addResultItem(result);
        showNotification('Password generated', 'success');
        return [result];
    }
};
