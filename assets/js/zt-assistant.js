/**
 * ZyncTools — Assistant
 *
 * A local, rule-and-retrieval assistant. It reads the tool registry to
 * answer "which tool does X?", explains how tools work, and handles
 * questions about privacy, formats and limits.
 *
 * It runs entirely in the browser — no API calls, nothing sent anywhere.
 * It is deliberately presented as a tool finder rather than a general
 * chatbot, so it never has to bluff an answer it cannot give.
 */
(function () {
    'use strict';

    var ZT = window.ZT;
    var $ = ZT.$, el = ZT.el;

    var dom = {};
    var history = [];

    /* ============================================================
       INTENT VOCABULARY
       ============================================================
       Maps everyday phrasing onto the words tools actually use, so
       "make my photo smaller" finds the compressor and the resizer.
    */
    var SYNONYMS = {
        'smaller': 'compress reduce size',
        'make smaller': 'compress reduce size',
        'reduce size': 'compress',
        'file size': 'compress',
        'shrink': 'compress resize',
        'difference': 'diff compare',
        'differences': 'diff compare',
        'compare two': 'diff compare',
        'side by side': 'diff compare',
        'lower quality': 'compress',
        'optimise': 'compress optimise',
        'optimize': 'compress optimise',
        'photo': 'image',
        'picture': 'image',
        'pic': 'image',
        'jpg': 'image jpeg convert',
        'jpeg': 'image convert',
        'png': 'image convert',
        'webp': 'image convert',
        'heic': 'image convert heic',
        'iphone photo': 'heic image convert',
        'screenshot': 'image',
        'combine': 'merge join',
        'put together': 'merge',
        'stick together': 'merge',
        'join': 'merge',
        'split up': 'split',
        'cut': 'trim split cut',
        'chop': 'trim cut',
        'password protect': 'protect password encrypt',
        'lock': 'protect password',
        'unlock': 'password remove',
        'remove password': 'unlock password',
        'sign': 'signature',
        'scan': 'ocr scan',
        'read text from': 'ocr text extract',
        'text from image': 'ocr',
        'transcribe': 'ocr text',
        'rotate': 'rotate',
        'flip': 'flip mirror',
        'watermark': 'watermark',
        'logo': 'watermark',
        'thumbnail': 'resize image',
        'favicon': 'favicon icon',
        'qr': 'qr code',
        'barcode': 'barcode',
        'password': 'password generator strength',
        'random': 'random generator',
        'hash': 'hash checksum',
        'checksum': 'hash checksum',
        'md5': 'hash',
        'sha': 'hash',
        'encrypt': 'encrypt security',
        'decrypt': 'encrypt decrypt',
        'beautify': 'format beautify',
        'prettify': 'format beautify',
        'pretty print': 'format',
        'minify': 'minify compress',
        'uglify': 'minify',
        'validate': 'validate format',
        'convert': 'convert',
        'change format': 'convert',
        'timestamp': 'timestamp unix epoch',
        'epoch': 'timestamp',
        'timezone': 'timezone time zone',
        'age': 'age birthday',
        'days between': 'date difference',
        'percentage': 'percent calculator',
        'discount': 'percent',
        'tip': 'percent calculator',
        'colour': 'color',
        'hex code': 'color hex',
        'palette': 'palette color',
        'gradient': 'gradient css',
        'shadow': 'shadow css',
        'meta tags': 'meta seo tags',
        'seo': 'seo meta',
        'sitemap': 'sitemap',
        'robots': 'robots txt',
        'schema': 'schema structured data',
        'mp3': 'audio convert mp3',
        'audio': 'audio',
        'sound': 'audio',
        'music': 'audio',
        'song': 'audio',
        'video': 'video',
        'movie': 'video',
        'clip': 'video trim',
        'gif': 'gif video',
        'ringtone': 'audio trim',
        'lorem': 'lorem placeholder',
        'dummy text': 'lorem placeholder',
        'fake data': 'test data fake',
        'mock data': 'test data',
        'uuid': 'uuid id',
        'guid': 'uuid',
        'regex': 'regex pattern',
        'difference between': 'diff compare',
        'compare': 'diff compare',
        'word count': 'word counter',
        'character count': 'word counter',
        'case': 'case converter',
        'uppercase': 'case converter',
        'lowercase': 'case converter',
        'slug': 'slug url',
        'base64': 'base64 encode',
        'url encode': 'url encoder',
        'jwt': 'jwt token',
        'cron': 'cron schedule',
        'exif': 'metadata exif',
        'metadata': 'metadata',
        'strip metadata': 'metadata remove privacy'
    };

    /* Canned answers for questions about the site itself. */
    var FAQ = [
        {
            match: /(privacy|private|safe|secure|upload|server|store|data|track|spy|send)/i,
            answer: 'Everything runs inside your browser. Your files are read locally with the File API, processed with JavaScript and WebAssembly, and never uploaded anywhere. There is no account, no analytics on your file contents, and nothing is stored after you close the tab.'
        },
        {
            match: /(free|cost|price|pay|subscription|premium|trial)/i,
            answer: 'Every tool is free with no account, no watermarks on your output, and no usage limits. The project is open source under the AGPL licence.'
        },
        {
            match: /(offline|no internet|without internet|plane)/i,
            answer: 'Most tools work offline once the page has loaded. A few pull in a library the first time you use them — PDF, OCR, QR codes and audio encoding — so those need a connection on first run, then they are cached.'
        },
        {
            match: /(file size limit|how big|max size|maximum size|large file)/i,
            answer: 'There is no server limit because nothing is uploaded. The practical ceiling is your device memory. As a rule of thumb: images up to about 50 megapixels, PDFs up to a few hundred pages, and audio or video up to roughly 500 MB work comfortably on a modern laptop. Phones handle less.'
        },
        {
            match: /(how many tools|how much tools|number of tools|what tools)/i,
            answer: function () {
                var counts = ZT.registry.countByCategory();
                var lines = ZT.registry.categories()
                    .filter(function (c) { return counts[c.id]; })
                    .map(function (c) { return counts[c.id] + ' ' + c.name.toLowerCase(); });
                return 'There are ' + ZT.registry.all().length + ' tools right now: ' + lines.join(', ') + '. Ask for anything specific and I will point you at it.';
            }
        },
        {
            match: /(who (made|built|created)|about you|what are you|are you (an? )?(ai|robot|chatgpt|gpt|llm))/i,
            answer: 'I am a small search assistant built into ZyncTools — not a large language model. I match what you describe against the tool catalogue and answer questions about how the site works. I run entirely in your browser, which is why I am fast and why nothing you type here goes anywhere.'
        },
        {
            match: /(thank|thanks|cheers|ta$|appreciate)/i,
            answer: 'Happy to help. Ask me anything else whenever you need a tool.'
        },
        {
            match: /(bug|broken|not working|doesn.?t work|error|issue|problem)/i,
            answer: 'Sorry that is not working. A few things worth trying: reload the page, check the file is not corrupt or password-protected, and try a smaller file to rule out a memory limit. If a tool needs a library it downloads on first use, a blocked connection will stop it. You can also report it on the project GitHub page.'
        }
    ];

    /* ============================================================
       INIT
       ============================================================ */
    function init() {
        dom.fab = $('#zt-chat-fab');
        dom.panel = $('#zt-chat');
        dom.body = $('#zt-chat-body');
        dom.input = $('#zt-chat-input');
        dom.send = $('#zt-chat-send');
        dom.close = $('#zt-chat-close');

        if (!dom.fab || !dom.panel) return;

        // Each listener is attached exactly once. The previous build bound
        // these twice, so every click toggled the panel open then shut.
        dom.fab.addEventListener('click', toggle);
        if (dom.close) dom.close.addEventListener('click', close);
        if (dom.send) dom.send.addEventListener('click', submit);

        if (dom.input) {
            dom.input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                }
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isOpen()) close();
        });

        greet();
    }

    function isOpen() { return dom.panel.classList.contains('is-open'); }

    function toggle() { isOpen() ? close() : open(); }

    function open() {
        dom.panel.classList.add('is-open');
        dom.fab.classList.add('is-open');
        dom.fab.setAttribute('aria-expanded', 'true');
        setTimeout(function () { if (dom.input) dom.input.focus(); }, 260);
    }

    function close() {
        dom.panel.classList.remove('is-open');
        dom.fab.classList.remove('is-open');
        dom.fab.setAttribute('aria-expanded', 'false');
    }

    function greet() {
        if (dom.body.children.length) return;

        var tool = window.__ZT_CURRENT_TOOL__;
        var text = tool
            ? 'You are on <strong>' + ZT.esc(tool.name) + '</strong>. Ask me how it works, or describe another job and I will find the right tool.'
            : 'Hi. Describe what you want to do and I will find the tool for it — for example <em>"make this PDF smaller"</em> or <em>"convert HEIC to JPG"</em>.';

        addBot(text, {
            chips: tool
                ? ['How does this tool work?', 'Is my file uploaded?', 'Show related tools']
                : ['Compress a PDF', 'Convert an image', 'Extract audio from video', 'Is this private?']
        });
    }

    /* ============================================================
       MESSAGE FLOW
       ============================================================ */
    function submit() {
        var text = (dom.input.value || '').trim();
        if (!text) return;

        dom.input.value = '';
        addUser(text);
        history.push({ role: 'user', text: text });

        showTyping();
        // A short pause reads as considered rather than instant and mechanical.
        setTimeout(function () {
            hideTyping();
            respond(text);
        }, 260 + Math.random() * 220);
    }

    function respond(question) {
        var reply = buildReply(question);
        addBot(reply.text, { cards: reply.cards, chips: reply.chips });
        history.push({ role: 'bot', text: reply.text });
    }

    function buildReply(question) {
        var normalised = question.toLowerCase().trim();

        if (/^(hi|hey|hello|yo|sup|good (morning|afternoon|evening))\b/.test(normalised)) {
            return {
                text: 'Hello. What are you trying to do? Describe it in your own words — "shrink a photo", "merge PDFs", "read text out of a scan" all work.',
                chips: ['Compress an image', 'Merge PDFs', 'Generate a QR code', 'Convert audio']
            };
        }

        if (/^(help|what can you do|options|commands)\b/.test(normalised)) {
            return {
                text: 'I can find a tool from a plain description, explain what a tool does and what its settings mean, and answer questions about privacy, file limits and formats. Try describing the job rather than the tool name.',
                chips: ['Remove a PDF password', 'Resize images in bulk', 'Check colour contrast']
            };
        }

        // Site questions answer directly rather than returning a tool list.
        for (var i = 0; i < FAQ.length; i++) {
            if (FAQ[i].match.test(normalised)) {
                var related = findTools(normalised, 3);
                return {
                    text: typeof FAQ[i].answer === 'function' ? FAQ[i].answer() : FAQ[i].answer,
                    cards: related.length && !/privacy|free|who|thank/.test(normalised) ? related : []
                };
            }
        }

        // "How does X work?" about the tool currently open.
        var currentTool = window.__ZT_CURRENT_TOOL__;
        if (currentTool && /(this tool|how (do|does) (it|this)|what does this|explain (this|it)|settings|options)/.test(normalised)) {
            return { text: describeTool(currentTool), cards: [] };
        }

        var matches = findTools(normalised, 4);

        if (!matches.length) {
            return {
                text: 'I could not match that to a tool. Try naming the file type and the action — for example <em>"PDF to Word"</em>, <em>"compress MP4"</em> or <em>"format JSON"</em>. You can also browse everything from the sidebar.',
                chips: suggestPopular()
            };
        }

        var lead = matches[0];
        var text;

        if (matches.length === 1) {
            text = '<strong>' + ZT.esc(lead.name) + '</strong> does that. ' + ZT.esc(lead.description);
        } else {
            text = '<strong>' + ZT.esc(lead.name) + '</strong> is the closest match — ' +
                ZT.esc(lead.description.charAt(0).toLowerCase() + lead.description.slice(1)) +
                ' Here are the others worth a look:';
        }

        return { text: text, cards: matches };
    }

    function describeTool(tool) {
        var parts = ['<strong>' + ZT.esc(tool.name) + '</strong> — ' + ZT.esc(tool.description)];

        var inputText = {
            none: 'It needs no input — set the options and press Generate.',
            text: 'Paste or type your text in the box, then adjust the settings.',
            file: 'Upload a single file, then choose your settings.',
            files: 'Upload one or more files — up to ' + tool.maxFiles + ' at a time.'
        }[tool.input];
        parts.push(inputText);

        var realOptions = (tool.options || []).filter(function (o) { return o.type !== 'note'; });
        if (realOptions.length) {
            var names = realOptions.slice(0, 5).map(function (o) { return o.label.toLowerCase(); });
            parts.push('Its settings cover ' + names.join(', ') +
                (realOptions.length > 5 ? ' and ' + (realOptions.length - 5) + ' more' : '') + '.');
        }

        if (tool.heavy) {
            parts.push('This one is compute-heavy, so large files take a while and your fan may spin up. It still runs entirely on your device.');
        }

        return parts.join(' ');
    }

    /**
     * Expand everyday phrasing into tool vocabulary, then search.
     * Expansion matters: users type "make smaller", tools say "compress".
     */
    function findTools(question, limit) {
        var expanded = question;
        Object.keys(SYNONYMS).forEach(function (phrase) {
            if (question.indexOf(phrase) !== -1) expanded += ' ' + SYNONYMS[phrase];
        });

        // Drop filler so the scorer sees the meaningful words.
        var cleaned = expanded
            .replace(/\b(how|do|i|can|you|to|a|an|the|my|me|please|want|need|is|it|for|with|from|of|in|on|get|make|there|any|way|tool|that|will|would)\b/g, ' ')
            .replace(/[^\w\s-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        var scored = ZT.registry.searchScored(cleaned || question, limit || 4);

        // Fall back to the raw question if stripping filler lost the signal.
        if (!scored.length) scored = ZT.registry.searchScored(question, limit || 4);
        if (!scored.length) return [];

        // One stray word landing in a tag is not a real answer. Require a
        // name-or-tag hit, and on longer queries a reasonable share of them,
        // before claiming a match — otherwise say so and offer suggestions.
        var best = scored[0];
        if (best.strongMatches === 0) return [];
        if (cleaned.split(/\s+/).length >= 3 && best.confidence < 0.34) return [];

        return scored.map(function (s) { return s.tool; });
    }

    function suggestPopular() {
        return ZT.registry.all()
            .filter(function (t) { return t.popular; })
            .slice(0, 4)
            .map(function (t) { return t.name; });
    }

    /* ============================================================
       RENDERING
       ============================================================ */
    function addUser(text) {
        dom.body.appendChild(el('div', { class: 'zt-msg zt-msg--user' }, [
            el('div', { class: 'zt-msg__avatar', text: 'You' }),
            el('div', { class: 'zt-msg__bubble', text: text })
        ]));
        scroll();
    }

    function addBot(html, extras) {
        extras = extras || {};

        var bubble = el('div', { class: 'zt-msg__bubble' });
        bubble.innerHTML = html;

        if (extras.cards && extras.cards.length) {
            var cards = el('div', { class: 'zt-chat-cards' });
            extras.cards.forEach(function (tool) {
                cards.appendChild(el('a', {
                    class: 'zt-chat-card',
                    href: ZT.toolUrl(tool.id)
                }, [
                    el('span', { class: 'zt-chat-card__icon', html: ZT.icons.svg(tool.icon) }),
                    el('span', { class: 'zt-chat-card__info' }, [
                        el('span', { class: 'zt-chat-card__title', text: tool.name }),
                        el('span', { class: 'zt-chat-card__desc', text: tool.description })
                    ]),
                    el('span', { class: 'zt-chat-card__arrow', html: ZT.icons.svg('chevron-right') })
                ]));
            });
            bubble.appendChild(cards);
        }

        if (extras.chips && extras.chips.length) {
            var chips = el('div', { class: 'zt-chat-chips' });
            extras.chips.forEach(function (label) {
                chips.appendChild(el('button', {
                    class: 'zt-chip', type: 'button', text: label,
                    onclick: function () {
                        dom.input.value = label;
                        submit();
                    }
                }));
            });
            bubble.appendChild(chips);
        }

        dom.body.appendChild(el('div', { class: 'zt-msg zt-msg--bot' }, [
            el('div', { class: 'zt-msg__avatar', text: 'Z' }),
            bubble
        ]));
        scroll();
    }

    function showTyping() {
        var node = el('div', { class: 'zt-msg zt-msg--bot', id: 'zt-typing-row' }, [
            el('div', { class: 'zt-msg__avatar', text: 'Z' }),
            el('div', { class: 'zt-msg__bubble' },
                el('div', { class: 'zt-typing' }, [el('span'), el('span'), el('span')]))
        ]);
        dom.body.appendChild(node);
        scroll();
    }

    function hideTyping() {
        var node = $('#zt-typing-row');
        if (node) node.remove();
    }

    function scroll() {
        requestAnimationFrame(function () {
            dom.body.scrollTop = dom.body.scrollHeight;
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
