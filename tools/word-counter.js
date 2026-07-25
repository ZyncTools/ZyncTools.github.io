window.ZyncTool = {
    process(input, ctx) {
        const { addResultItem, showNotification, showError, setStatus } = ctx || {};
        const text = input || '';
        const options = (ctx && ctx.config) || {};
        const showKeywords = options.showKeywords !== false;
        const keywordLimit = parseInt(options.keywordLimit) || 20;

        if (!text.trim()) {
            showError && showError('Empty text input');
            return [];
        }

        setStatus && setStatus('Analyzing text...');

        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        const chars = text.length;
        const charsNoSpaces = text.replace(/\s/g, '').length;
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length || (words.length > 0 ? 1 : 0);
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length || (text.trim() ? 1 : 0);
        const lines = text ? text.split(/\r?\n/).length : 0;
        const readingTime = Math.max(1, Math.ceil(words.length / 200));
        const speakingTime = Math.max(1, Math.ceil(words.length / 150));
        const avgWordLength = words.length > 0 ? (words.reduce((s, w) => s + w.length, 0) / words.length).toFixed(1) : 0;

        let readingLevel = 'N/A';
        if (words.length > 0) {
            const syllableCount = words.reduce((count, word) => count + this._countSyllables(word), 0);
            const flesch = 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syllableCount / words.length);
            if (flesch >= 90) readingLevel = 'Grade 5';
            else if (flesch >= 80) readingLevel = 'Grade 6';
            else if (flesch >= 70) readingLevel = 'Grade 7';
            else if (flesch >= 60) readingLevel = 'Grade 8';
            else if (flesch >= 50) readingLevel = 'Grade 10';
            else if (flesch >= 30) readingLevel = 'Grade 13';
            else readingLevel = 'College';
        }

        let keywordSection = '';
        if (showKeywords) {
            const freq = {};
            const stopWords = new Set(['the','and','or','but','in','on','at','to','for','with','by','of','a','an','is','it','as','be','this','that','have','has','had','will','would','could','should','may','might','shall','can','do','did','not','no','yes','from','into','out','up','down','over','under','again','then','once','here','there','when','where','why','how','all','each','every','both','few','more','most','other','some','such','than','too','very','just','because','if','or','about','against','between','through','during','before','after','above','below','to','from','shy','own','same','so','also']);
            words.forEach(w => {
                const lower = w.toLowerCase().replace(/[^a-z0-9']/g, '');
                if (lower && lower.length > 1 && !stopWords.has(lower)) {
                    freq[lower] = (freq[lower] || 0) + 1;
                }
            });
            const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, keywordLimit);
            if (sorted.length) {
                keywordSection = '\nKEYWORD FREQUENCY:\n';
                sorted.forEach(([kw, cnt]) => {
                    keywordSection += `  ${kw.padEnd(20)} ${cnt}\n`;
                });
            }
        }

        const output = [
            `WORDS:             ${words.length}`,
            `CHARACTERS:        ${chars}`,
            `CHARS (NO SPACES): ${charsNoSpaces}`,
            `SENTENCES:         ${sentences}`,
            `PARAGRAPHS:        ${paragraphs}`,
            `LINES:             ${lines}`,
            `READING TIME:      ~${readingTime} min`,
            `SPEAKING TIME:     ~${speakingTime} min`,
            `AVG WORD LENGTH:   ${avgWordLength} chars`,
            `READING LEVEL:     ${readingLevel}`,
            keywordSection.trim()
        ].filter(l => l).join('\n');

        const result = { name: 'word-count.txt', text: output, size: output.length };
        addResultItem && addResultItem(result);
        showNotification && showNotification('Word count calculated', 'success');
        return [result];
    },

    _countSyllables(word) {
        word = word.toLowerCase().replace(/[^a-z]/g, '');
        if (word.length <= 3) return 1;
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
        word = word.replace(/^y/, '');
        const matches = word.match(/[aeiouy]{1,2}/g);
        return matches ? matches.length : 1;
    }
};
