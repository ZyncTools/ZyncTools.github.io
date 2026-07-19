window.ZyncTool = {
    process(input, { addResultItem, showNotification }) {
        const text = input || '';
        const codes = [
            { code: 200, desc: 'OK' }, { code: 201, desc: 'Created' }, { code: 204, desc: 'No Content' },
            { code: 301, desc: 'Moved Permanently' }, { code: 302, desc: 'Found' }, { code: 400, desc: 'Bad Request' },
            { code: 401, desc: 'Unauthorized' }, { code: 403, desc: 'Forbidden' }, { code: 404, desc: 'Not Found' },
            { code: 500, desc: 'Internal Server Error' }, { code: 502, desc: 'Bad Gateway' }, { code: 503, desc: 'Service Unavailable' }
        ];
        const match = codes.find(c => String(c.code) === text.trim() || c.desc.toLowerCase().includes(text.toLowerCase()));
        const output = match ? `${match.code} - ${match.desc}` : 'Enter a status code or keyword to search.';
        const result = { name: 'http-status.txt', text: output, size: output.length };
        addResultItem(result);
        showNotification('HTTP status found', 'success');
        return [result];
    }
};
