window.ZyncTool = {
    process(input, ctx) {
        const { addResultItem, showNotification, showError, setStatus } = ctx || {};
        const options = (ctx && ctx.config) || {};
        const type = options.type || 'paragraphs';
        const count = Math.max(1, Math.min(10000, parseInt(options.count) || 5));
        const startWithLorem = options.startWithLorem !== false;
        const random = options.random !== false;

        setStatus && setStatus(`Generating ${count} ${type}...`);

        const words = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim','ad','minim','veniam','quis','nostrud','exercitation','ullamco','laboris','nisi','aliquip','ex','ea','commodo','consequat','duis','aute','irure','in','reprehenderit','voluptate','velit','esse','cillum','fugiat','nulla','pariatur','excepteur','sint','occaecat','cupidatat','non','proident','sunt','culpa','qui','officia','deserunt','mollit','anim','id','est','laborum','amet','sodales','augue','aliquam','gravida','tortor','dictum','feugiat','lectus','pellentesque','habitant','morbi','tristique','senectus','netus','malesuada','fames','ac','turpis','egestas','integer','feugiat','scelerisque','varius','morbi','nunc','sed','cursus','turpis','massa','tincidunt','dui','ut','ornare','lectus','arcu','purus','ultrices','vestibulum','cras','auctor','neque','vitae','tempus','quam','pellentesque','nec','nam','aliquam','sem','tortor','consequat','interdum','varius','sagittis','nisl','rhoncus','congue','elit','pellentesque','habitant','morbi','tristique','senectus','netus','malesuada','fames','ac','turpis','egestas','mauris','augue','neque','gravida','fermentum','vitae','tristique','lectus','habitant','morbi','tristique','senectus','netus','malesuada','fames','ac','turpis','egestas','mauris','augue','neque','gravida','fermentum','vitae','tristique','lectus'];

        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const word = () => random ? pick(words) : words[Math.floor(Math.random() * words.length)];
        const sentence = (min = 5, max = 20) => {
            const len = min + Math.floor(Math.random() * (max - min));
            let s = [];
            for (let i = 0; i < len; i++) s.push(i === 0 && startWithLorem ? (s.length === 0 ? 'Lorem' : word()) : word());
            return s.join(' ').replace(/^./, c => c.toUpperCase()) + '.';
        };

        let output = '';

        switch (type) {
            case 'words':
                for (let i = 0; i < count; i++) output += (i ? ' ' : '') + word();
                break;
            case 'sentences':
                for (let i = 0; i < count; i++) output += (i ? ' ' : '') + sentence();
                break;
            case 'paragraphs':
                for (let i = 0; i < count; i++) {
                    const sentenceCount = 4 + Math.floor(Math.random() * 4);
                    let para = [];
                    for (let s = 0; s < sentenceCount; s++) para.push(sentence());
                    output += para.join(' ') + '\n\n';
                }
                break;
            case 'lists':
                output += '# List Items\n\n';
                for (let i = 0; i < count; i++) {
                    const itemWords = 2 + Math.floor(Math.random() * 5);
                    let item = [];
                    for (let w = 0; w < itemWords; w++) item.push(word());
                    output += `${i + 1}. ${item.join(' ').replace(/^./, c => c.toUpperCase())}\n`;
                }
                break;
            default:
                for (let i = 0; i < count; i++) {
                    const sentenceCount = 4 + Math.floor(Math.random() * 4);
                    let para = [];
                    for (let s = 0; s < sentenceCount; s++) para.push(sentence());
                    output += para.join(' ') + '\n\n';
                }
        }

        const trimmed = output.trim();
        const result = { name: 'lorem-ipsum.txt', text: trimmed, size: trimmed.length };
        addResultItem && addResultItem(result);
        showNotification && showNotification('Lorem Ipsum generated', 'success');
        return [result];
    }
};
