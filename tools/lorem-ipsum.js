window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate', 'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'];
        const count = parseInt(input) || 100;
        const paras = Math.max(1, Math.ceil(count / 100));
        let text = '';
        for (let p = 0; p < paras; p++) {
            const sentenceCount = 4 + Math.floor(Math.random() * 4);
            for (let s = 0; s < sentenceCount; s++) {
                const wordCount = 5 + Math.floor(Math.random() * 20);
                let sentence = [];
                for (let w = 0; w < wordCount; w++) {
                    const word = words[Math.floor(Math.random() * words.length)];
                    sentence.push(s === 0 && w === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word);
                }
                text += sentence.join(' ') + '. ';
            }
            text += '\n\n';
        }
        const trimmed = text.trim();
        const result = { name: 'lorem-ipsum.txt', text: trimmed, size: trimmed.length };
        addResultItem(result);
        showNotification('Lorem Ipsum generated', 'success');
        return [result];
    }
};
