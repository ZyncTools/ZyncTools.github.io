window.ZyncTool = {
    process(input, ctx) {
        const { addResultItem, showNotification, showError, setStatus } = ctx || {};
        const text = input || '';
        const options = (ctx && ctx.config) || {};
        const pattern = options.pattern || '';
        const flags = options.flags || 'g';
        const replaceText = options.replace || '';
        const testText = options.testText || text;

        if (!pattern) {
            showError && showError('Empty regex pattern');
            return [];
        }

        setStatus && setStatus('Testing regex...');

        let regex;
        try {
            regex = new RegExp(pattern, flags);
        } catch (e) {
            const errorOutput = `INVALID REGEX\nPattern: ${pattern}\nError: ${e.message}\n\nCommon fixes:\n- Escape special chars: \\ . * + ? ^ $ ( ) [ ] { } |\n- Check unclosed groups: ( or [\n- Verify flag syntax: g, i, m, s, u, y`;
            const result = { name: 'regex-result.txt', text: errorOutput, size: errorOutput.length };
            addResultItem && addResultItem(result);
            showError && showError('Invalid regex pattern');
            return [result];
        }

        let output = `Pattern: /${pattern}/${flags}\n`;
        let matches = [];
        let match;

        if (flags.includes('g')) {
            while ((match = regex.exec(testText)) !== null) {
                matches.push({ text: match[0], index: match.index, groups: match.slice(1) });
                if (match.index === regex.lastIndex) regex.lastIndex++;
                if (matches.length > 1000) break;
            }
        } else {
            match = regex.exec(testText);
            if (match) matches.push({ text: match[0], index: match.index, groups: match.slice(1) });
        }

        output += `Matches: ${matches.length}\n\n`;

        if (matches.length === 0) {
            output += 'No matches found.\n';
        } else {
            matches.forEach((m, i) => {
                output += `${i + 1}. full match: "${m.text}" at position ${m.index}\n`;
                if (m.groups.length > 0) {
                    output += `   groups: [${m.groups.map(g => `"${g}"`).join(', ')}]\n`;
                }
            });
        }

        if (replaceText) {
            try {
                const replaced = testText.replace(regex, replaceText);
                output += `\nREPLACE RESULT:\n${replaced}\n`;
            } catch (e) {
                output += `\nReplace Error: ${e.message}\n`;
            }
        }

        output += `\nTEST TEXT:\n${testText}\n`;
        output += `\nFLAGS: g=global, i=ignoreCase, m=multiline, s=dotAll, u=unicode, y=sticky\n`;

        const result = { name: 'regex-result.txt', text: output, size: output.length };
        addResultItem && addResultItem(result);
        showNotification && showNotification('Regex tested', 'success');
        return [result];
    }
};
