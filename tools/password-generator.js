window.ZyncTool = {
    process(input, ctx) {
        const { addResultItem, showNotification, showError, setStatus } = ctx || {};
        const text = input || '';
        const options = (ctx && ctx.config) || {};
        const length = Math.max(4, Math.min(128, parseInt(options.length) || 16));
        const upper = options.uppercase !== false;
        const lower = options.lowercase !== false;
        const numbers = options.numbers !== false;
        const symbols = options.symbols !== false;
        const excludeAmbiguous = options.excludeAmbiguous || false;
        const pronounceable = options.pronounceable || false;
        const passphrase = options.passphrase || false;
        const count = Math.max(1, Math.min(50, parseInt(options.count) || 1));

        if (!upper && !lower && !numbers && !symbols) {
            showError && showError('Select at least one character type');
            return [];
        }

        setStatus && setStatus(`Generating ${count} password${count > 1 ? 's' : ''}...`);

        const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
        const numberChars = '0123456789';
        const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const ambiguous = 'il1Lo0O';

        let pool = '';
        if (upper) pool += upperChars;
        if (lower) pool += lowerChars;
        if (numbers) pool += numberChars;
        if (symbols) pool += symbolChars;

        if (excludeAmbiguous) {
            pool = pool.split('').filter(c => !ambiguous.includes(c)).join('');
        }

        const charsetSize = pool.length;
        const entropy = Math.log2(Math.pow(charsetSize, length));
        const strength = entropy < 40 ? 'Weak' : entropy < 60 ? 'Fair' : entropy < 80 ? 'Good' : entropy < 100 ? 'Strong' : 'Very Strong';

        const vowels = 'aeiou';
        const consonants = 'bcdfghjklmnpqrstvwxyz';
        const syllable = () => {
            const c = consonants[Math.floor(Math.random() * consonants.length)];
            const v = vowels[Math.floor(Math.random() * vowels.length)];
            return Math.random() > 0.5 ? c + v : v + c;
        };

        const generate = () => {
            if (passphrase) {
                const words = ['alpha','bravo','delta','echo','foxtrot','golf','hotel','india','juliet','kilo','lima','mike','november','oscar','papa','quebec','romeo','sierra','tango','uniform','victor','whiskey','xray','yankee','zulu','apple','banana','cherry','dragon','eagle','falcon','garden','harbor','island','jungle','knight','lantern','mountain','nebula','ocean'];
                const sep = ['-','_','','.','!'];
                const w1 = words[Math.floor(Math.random() * words.length)];
                const w2 = words[Math.floor(Math.random() * words.length)];
                const w3 = words[Math.floor(Math.random() * words.length)];
                const s = sep[Math.floor(Math.random() * sep.length)];
                let pw = passphrase === '2' ? `${w1}${s}${w2}` : `${w1}${s}${w2}${s}${w3}`;
                if (upper) pw = pw.replace(/[a-z]/g, c => Math.random() > 0.5 ? c.toUpperCase() : c);
                if (numbers) pw += Math.floor(Math.random() * 100);
                if (symbols) pw += symbolChars[Math.floor(Math.random() * symbolChars.length)];
                return pw.slice(0, length || undefined);
            }
            if (pronounceable) {
                let pw = '';
                while (pw.length < length) pw += syllable();
                return pw.slice(0, length);
            }
            const arr = new Uint32Array(length);
            crypto.getRandomValues(arr);
            return Array.from(arr).map(n => pool[n % pool.length]).join('');
        };

        const passwords = [];
        for (let i = 0; i < count; i++) {
            passwords.push(generate());
        }

        const output = passwords.map((pw, i) => `Password ${i + 1}: ${pw}  [Strength: ${strength} | Entropy: ${entropy.toFixed(1)} bits]`).join('\n');
        const result = { name: 'passwords.txt', text: output, size: output.length };
        addResultItem && addResultItem(result);
        showNotification && showNotification(`Generated ${count} password${count > 1 ? 's' : ''}`, 'success');
        return [result];
    }
};
