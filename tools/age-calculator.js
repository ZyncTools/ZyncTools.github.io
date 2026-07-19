window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const parts = text.split('-').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) { showError('Enter birth date as YYYY-MM-DD'); return []; }
        const [y, m, d] = parts;
        const birth = new Date(y, m - 1, d);
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        const mDiff = now.getMonth() - birth.getMonth();
        if (mDiff < 0 || (mDiff === 0 && now.getDate() < birth.getDate())) age--;
        const next = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
        if (now > next) next.setFullYear(next.getFullYear() + 1);
        const daysToBirthday = Math.ceil((next - now) / (1000 * 60 * 60 * 24));
        const output = `Age: ${age} years\nNext birthday in: ${daysToBirthday} days`;
        const result = { name: 'age.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('Age calculated', 'success');
        return [result];
    }
};
