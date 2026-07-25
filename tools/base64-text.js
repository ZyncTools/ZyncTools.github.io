window.ZyncTool = {
    process(input, ctx) {
        const { addResultItem, showNotification, showError, setStatus } = ctx || {};
        const text = input || '';
        const options = (ctx && ctx.config) || {};
        const mode = options.mode || 'encode';

        if (!text && mode !== 'decode') {
            showError && showError('Empty input');
            return [];
        }

        setStatus && setStatus('Processing Base64...');

        let encoded = '', decoded = '';
        let validationMsg = '';

        try {
            if (mode === 'encode' || mode === 'both') {
                encoded = btoa(unescape(encodeURIComponent(text)));
            }
            if (mode === 'decode' || mode === 'both') {
                const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
                const isBase64 = base64Regex.test(text) && text.length > 0 && text.length % 4 === 0;
                if (!isBase64) {
                    showError && showError('Invalid Base64 input');
                    validationMsg = 'WARNING: Input does not appear to be valid Base64.\n';
                }
                decoded = decodeURIComponent(escape(atob(text)));
            }
        } catch (e) {
            showError && showError(`Base64 Error: ${e.message}`);
            return [];
        }

        let resultText = '';
        let resultName = '';

        if (mode === 'encode') {
            resultText = encoded;
            resultName = 'base64-encoded.txt';
        } else if (mode === 'decode') {
            resultText = validationMsg + decoded;
            resultName = 'base64-decoded.txt';
        } else {
            resultText = `ENCODED:\n${encoded}\n\nDECODED:\n${validationMsg}${decoded}`;
            resultName = 'base64.txt';
        }

        const result = { name: resultName, text: resultText, size: resultText.length };
        addResultItem && addResultItem(result);
        showNotification && showNotification('Base64 processed', 'success');
        return [result];
    }
};
