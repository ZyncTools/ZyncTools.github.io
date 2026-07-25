window.ZyncTool = {
    process(input, ctx) {
        const { addResultItem, showNotification, showError, setStatus } = ctx || {};
        const text = input || '';
        const options = (ctx && ctx.config) || {};
        const mode = options.mode || 'encode';

        if (!text) {
            showError && showError('Empty input');
            return [];
        }

        setStatus && setStatus('Processing URL...');

        let encoded = '', decoded = '';
        let paramsSection = '';

        if (mode === 'encode' || mode === 'both') {
            encoded = encodeURIComponent(text);
        }

        if (mode === 'decode' || mode === 'both') {
            try {
                decoded = decodeURIComponent(text);
            } catch (e) {
                decoded = `[Decode Error: ${e.message}]`;
                showError && showError('URL decode failed');
            }
        }

        if (options.showParams || mode === 'decode') {
            const urlStr = decoded || text;
            const qIndex = urlStr.indexOf('?');
            if (qIndex >= 0) {
                const query = urlStr.slice(qIndex + 1);
                const params = new URLSearchParams(query);
                paramsSection = '\nQUERY PARAMETERS:\n';
                params.forEach((val, key) => {
                    paramsSection += `  ${key} = ${val}\n`;
                });
            }
        }

        let resultText = '';
        let resultName = '';

        if (mode === 'encode') {
            resultText = encoded;
            resultName = 'url-encoded.txt';
        } else if (mode === 'decode') {
            resultText = decoded + paramsSection;
            resultName = 'url-decoded.txt';
        } else {
            resultText = `ENCODED:\n${encoded}\n\nDECODED:\n${decoded}${paramsSection}`;
            resultName = 'url-encoded.txt';
        }

        const result = { name: resultName, text: resultText, size: resultText.length };
        addResultItem && addResultItem(result);
        showNotification && showNotification('URL processed', 'success');
        return [result];
    }
};
