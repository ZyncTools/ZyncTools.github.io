/**
 * ZyncTools — Text tools
 * Counting, transforming, comparing and cleaning prose.
 */
(function () {
    'use strict';

    var ZT = window.ZT;
    var define = ZT.registry.define;

    function lines(text) { return String(text).split(/\r\n|\r|\n/); }
    function words(text) { return String(text).trim().match(/[^\s]+/g) || []; }

    /* ============================================================
       Word / character counter
       ============================================================ */
    define({
        id: 'word-counter',
        name: 'Word Counter',
        category: 'text',
        icon: 'file-text',
        description: 'Count words, characters, sentences and estimated reading time.',
        tags: ['count', 'words', 'characters', 'reading time', 'essay'],
        input: 'text',
        live: true,
        popular: true,
        placeholder: 'Paste or type your text here…',
        options: [
            { id: 'wpm', type: 'number', label: 'Reading speed', suffix: 'words/min', value: 220, min: 50, max: 1000, help: 'Used for the reading-time estimate. 200–250 is typical for adults.' },
            { id: 'show-keywords', type: 'checkbox', label: 'Show top keywords', value: true },
            { id: 'keyword-count', type: 'number', label: 'How many keywords', value: 10, min: 3, max: 50, when: function (o) { return o.showKeywords; } },
            { id: 'min-length', type: 'number', label: 'Ignore words shorter than', suffix: 'chars', value: 3, min: 1, max: 12, when: function (o) { return o.showKeywords; } },
            { id: 'ignore-common', type: 'checkbox', label: 'Ignore common stop words', value: true, when: function (o) { return o.showKeywords; } }
        ],
        run: function (ctx) {
            var text = ctx.text || '';
            var w = words(text);
            var ls = lines(text);
            var sentences = (text.match(/[^.!?\u2026]+[.!?\u2026]+(\s|$)/g) || []).filter(function (s) { return s.trim(); });
            var paragraphs = text.split(/\n\s*\n/).filter(function (p) { return p.trim(); });
            var readingSeconds = w.length / Math.max(1, ctx.opt.wpm) * 60;

            var rows = [
                { label: 'Words', value: ZT.formatNumber(w.length) },
                { label: 'Characters', value: ZT.formatNumber(text.length) },
                { label: 'Characters (no spaces)', value: ZT.formatNumber(text.replace(/\s/g, '').length) },
                { label: 'Sentences', value: ZT.formatNumber(sentences.length) },
                { label: 'Paragraphs', value: ZT.formatNumber(paragraphs.length) },
                { label: 'Lines', value: ZT.formatNumber(text ? ls.length : 0) },
                { label: 'Reading time', value: readingSeconds < 60 ? Math.ceil(readingSeconds) + ' sec' : ZT.formatDuration(readingSeconds) + ' min' },
                { label: 'Speaking time', value: ZT.formatDuration(w.length / 130 * 60) + ' min' },
                { label: 'Avg. word length', value: w.length ? (w.join('').length / w.length).toFixed(1) + ' chars' : '—' },
                { label: 'Avg. sentence length', value: sentences.length ? (w.length / sentences.length).toFixed(1) + ' words' : '—' }
            ];

            var results = [ZT.dataResult(rows, { title: 'Statistics', columns: 2 })];

            if (ctx.opt.showKeywords && w.length) {
                var freq = {};
                w.forEach(function (raw) {
                    var word = raw.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
                    if (word.length < ctx.opt.minLength) return;
                    if (ctx.opt.ignoreCommon && STOP_WORDS.indexOf(word) !== -1) return;
                    freq[word] = (freq[word] || 0) + 1;
                });
                var top = Object.keys(freq)
                    .sort(function (a, b) { return freq[b] - freq[a] || a.localeCompare(b); })
                    .slice(0, ctx.opt.keywordCount)
                    .map(function (k) {
                        return { label: k, value: freq[k] + '×  (' + (freq[k] / w.length * 100).toFixed(1) + '%)' };
                    });
                if (top.length) results.push(ZT.dataResult(top, { title: 'Top keywords', columns: 2 }));
            }

            return results;
        }
    });

    var STOP_WORDS = ('the be to of and a in that have i it for not on with he as you do at this but his by from they we say her she or ' +
        'an will my one all would there their what so up out if about who get which go me when make can like time no just him know take ' +
        'people into year your good some could them see other than then now look only come its over think also back after use two how our ' +
        'work first well way even new want because any these give day most us is are was were been has had did').split(' ');

    /* ============================================================
       Case converter
       ============================================================ */
    var CASE_MODES = {
        upper: function (s) { return s.toUpperCase(); },
        lower: function (s) { return s.toLowerCase(); },
        title: function (s) {
            return s.replace(/\w\S*/g, function (t) { return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(); });
        },
        sentence: function (s) {
            return s.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, function (c) { return c.toUpperCase(); });
        },
        camel: function (s) {
            var p = tokenize(s);
            return p.map(function (w, i) { return i === 0 ? w.toLowerCase() : cap(w); }).join('');
        },
        pascal: function (s) { return tokenize(s).map(cap).join(''); },
        snake: function (s) { return tokenize(s).map(function (w) { return w.toLowerCase(); }).join('_'); },
        kebab: function (s) { return tokenize(s).map(function (w) { return w.toLowerCase(); }).join('-'); },
        constant: function (s) { return tokenize(s).map(function (w) { return w.toUpperCase(); }).join('_'); },
        dot: function (s) { return tokenize(s).map(function (w) { return w.toLowerCase(); }).join('.'); },
        alternating: function (s) {
            var i = 0;
            return s.replace(/[a-z]/gi, function (c) { return (i++ % 2 === 0) ? c.toLowerCase() : c.toUpperCase(); });
        },
        inverse: function (s) {
            return s.replace(/[a-z]/gi, function (c) { return c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase(); });
        }
    };

    function cap(w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }

    function tokenize(s) {
        return String(s)
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .split(/[^a-zA-Z0-9]+/)
            .filter(Boolean);
    }

    define({
        id: 'case-converter',
        name: 'Case Converter',
        category: 'text',
        icon: 'case-sensitive',
        description: 'Switch text between upper, lower, title, camel, snake, kebab and more.',
        tags: ['uppercase', 'lowercase', 'camelcase', 'snake case', 'title case'],
        input: 'text',
        live: true,
        popular: true,
        options: [
            {
                id: 'mode', type: 'select', label: 'Convert to', value: 'title',
                options: [
                    { value: 'upper', label: 'UPPERCASE' },
                    { value: 'lower', label: 'lowercase' },
                    { value: 'title', label: 'Title Case' },
                    { value: 'sentence', label: 'Sentence case' },
                    { value: 'camel', label: 'camelCase' },
                    { value: 'pascal', label: 'PascalCase' },
                    { value: 'snake', label: 'snake_case' },
                    { value: 'kebab', label: 'kebab-case' },
                    { value: 'constant', label: 'CONSTANT_CASE' },
                    { value: 'dot', label: 'dot.case' },
                    { value: 'alternating', label: 'aLtErNaTiNg' },
                    { value: 'inverse', label: 'iNVERSE (swap case)' }
                ]
            },
            { id: 'trim-lines', type: 'checkbox', label: 'Trim whitespace on each line', value: false },
            { id: 'per-line', type: 'checkbox', label: 'Convert each line separately', value: false, help: 'Useful for lists — sentence case restarts on every line.' }
        ],
        run: function (ctx) {
            var fn = CASE_MODES[ctx.opt.mode] || CASE_MODES.title;
            var text = ctx.text || '';
            var out = ctx.opt.perLine
                ? lines(text).map(function (l) { return fn(l); }).join('\n')
                : fn(text);
            if (ctx.opt.trimLines) out = lines(out).map(function (l) { return l.trim(); }).join('\n');
            return ZT.textResult(out);
        }
    });

    /* ============================================================
       Text reverser
       ============================================================ */
    define({
        id: 'text-reverser',
        name: 'Text Reverser',
        category: 'text',
        icon: 'flip-horizontal',
        description: 'Reverse text by character, word or line order.',
        tags: ['reverse', 'backwards', 'mirror', 'flip'],
        input: 'text',
        live: true,
        options: [
            {
                id: 'mode', type: 'select', label: 'Reverse', value: 'characters',
                options: [
                    { value: 'characters', label: 'Character order' },
                    { value: 'words', label: 'Word order' },
                    { value: 'lines', label: 'Line order' },
                    { value: 'words-in-line', label: 'Word order within each line' }
                ]
            }
        ],
        run: function (ctx) {
            var text = ctx.text || '';
            var out;
            switch (ctx.opt.mode) {
                // Split by code point so emoji and accents survive the reversal.
                case 'characters': out = Array.from(text).reverse().join(''); break;
                case 'words': out = text.split(/(\s+)/).reverse().join(''); break;
                case 'lines': out = lines(text).reverse().join('\n'); break;
                default: out = lines(text).map(function (l) { return l.split(/(\s+)/).reverse().join(''); }).join('\n');
            }
            return ZT.textResult(out);
        }
    });

    /* ============================================================
       Slug generator
       ============================================================ */
    define({
        id: 'slug-generator',
        name: 'URL Slug Generator',
        category: 'text',
        icon: 'link',
        description: 'Turn titles into clean, URL-safe slugs.',
        tags: ['slug', 'url', 'permalink', 'seo'],
        input: 'text',
        live: true,
        options: [
            {
                id: 'separator', type: 'select', label: 'Separator', value: '-',
                options: [{ value: '-', label: 'Hyphen ( - )' }, { value: '_', label: 'Underscore ( _ )' }, { value: '.', label: 'Dot ( . )' }, { value: '', label: 'None' }]
            },
            { id: 'lowercase', type: 'checkbox', label: 'Force lowercase', value: true },
            { id: 'strip-stopwords', type: 'checkbox', label: 'Remove stop words (a, the, of…)', value: false },
            { id: 'max-length', type: 'number', label: 'Max length', suffix: 'chars', value: 0, min: 0, max: 200, help: '0 means no limit. Slugs are cut at a word boundary.' },
            { id: 'per-line', type: 'checkbox', label: 'One slug per line', value: true }
        ],
        run: function (ctx) {
            function slug(input) {
                var s = String(input)
                    .normalize('NFKD').replace(/[\u0300-\u036F]/g, '')
                    .replace(/[^\p{L}\p{N}]+/gu, ' ')
                    .trim();
                var parts = s.split(/\s+/).filter(Boolean);
                if (ctx.opt.stripStopwords) {
                    var kept = parts.filter(function (p) { return STOP_WORDS.indexOf(p.toLowerCase()) === -1; });
                    if (kept.length) parts = kept;
                }
                var out = parts.join(ctx.opt.separator || '');
                if (ctx.opt.lowercase) out = out.toLowerCase();
                var max = ctx.opt.maxLength;
                if (max > 0 && out.length > max) {
                    out = out.slice(0, max);
                    var sep = ctx.opt.separator;
                    if (sep) {
                        var lastSep = out.lastIndexOf(sep);
                        if (lastSep > max * 0.5) out = out.slice(0, lastSep);
                    }
                }
                return out;
            }
            var text = ctx.text || '';
            return ZT.textResult(ctx.opt.perLine
                ? lines(text).filter(function (l) { return l.trim(); }).map(slug).join('\n')
                : slug(text));
        }
    });

    /* ============================================================
       Find & replace
       ============================================================ */
    define({
        id: 'find-replace',
        name: 'Find & Replace',
        category: 'text',
        icon: 'replace',
        description: 'Search and replace across text, with optional regular expressions.',
        tags: ['find', 'replace', 'regex', 'substitute'],
        input: 'text',
        live: true,
        options: [
            { id: 'find', type: 'text', label: 'Find', value: '', placeholder: 'text or pattern to find' },
            { id: 'replace', type: 'text', label: 'Replace with', value: '', placeholder: 'leave empty to delete matches' },
            { id: 'use-regex', type: 'checkbox', label: 'Treat "Find" as a regular expression', value: false, help: 'Use $1, $2… in the replacement to reference capture groups.' },
            { id: 'case-sensitive', type: 'checkbox', label: 'Match case', value: false },
            { id: 'whole-word', type: 'checkbox', label: 'Whole words only', value: false, when: function (o) { return !o.useRegex; } }
        ],
        run: function (ctx) {
            var text = ctx.text || '';
            if (!ctx.opt.find) return ZT.textResult(text, { note: 'Enter something to find.' });

            var flags = 'g' + (ctx.opt.caseSensitive ? '' : 'i');
            var pattern;
            if (ctx.opt.useRegex) {
                try {
                    pattern = new RegExp(ctx.opt.find, flags);
                } catch (e) {
                    ZT.fail('That regular expression is not valid: ' + e.message);
                }
            } else {
                var escaped = ctx.opt.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                if (ctx.opt.wholeWord) escaped = '\\b' + escaped + '\\b';
                pattern = new RegExp(escaped, flags);
            }

            var count = (text.match(pattern) || []).length;
            var out = text.replace(pattern, ctx.opt.replace);
            return ZT.textResult(out, { note: count + ' replacement' + (count === 1 ? '' : 's') + ' made.' });
        }
    });

    /* ============================================================
       Line tools
       ============================================================ */
    define({
        id: 'line-sorter',
        name: 'Line Sorter',
        category: 'text',
        icon: 'arrow-down-a-z',
        description: 'Sort lines alphabetically, numerically, by length or at random.',
        tags: ['sort', 'lines', 'alphabetise', 'order'],
        input: 'text',
        live: true,
        options: [
            {
                id: 'order', type: 'select', label: 'Sort by', value: 'alpha-asc',
                options: [
                    { value: 'alpha-asc', label: 'Alphabetical (A → Z)' },
                    { value: 'alpha-desc', label: 'Alphabetical (Z → A)' },
                    { value: 'natural-asc', label: 'Natural / numeric (1, 2, 10)' },
                    { value: 'natural-desc', label: 'Natural / numeric (10, 2, 1)' },
                    { value: 'length-asc', label: 'Length (shortest first)' },
                    { value: 'length-desc', label: 'Length (longest first)' },
                    { value: 'random', label: 'Shuffle randomly' },
                    { value: 'reverse', label: 'Reverse current order' }
                ]
            },
            { id: 'case-sensitive', type: 'checkbox', label: 'Case sensitive', value: false },
            { id: 'unique', type: 'checkbox', label: 'Remove duplicate lines', value: false },
            { id: 'trim', type: 'checkbox', label: 'Trim whitespace', value: true },
            { id: 'drop-empty', type: 'checkbox', label: 'Drop empty lines', value: true }
        ],
        run: function (ctx) {
            var ls = lines(ctx.text || '');
            if (ctx.opt.trim) ls = ls.map(function (l) { return l.trim(); });
            if (ctx.opt.dropEmpty) ls = ls.filter(function (l) { return l.length; });
            if (ctx.opt.unique) {
                var seen = Object.create(null);
                ls = ls.filter(function (l) {
                    var key = ctx.opt.caseSensitive ? l : l.toLowerCase();
                    if (seen[key]) return false;
                    seen[key] = true;
                    return true;
                });
            }

            var collator = new Intl.Collator(undefined, {
                sensitivity: ctx.opt.caseSensitive ? 'variant' : 'base',
                numeric: /^natural/.test(ctx.opt.order)
            });

            switch (ctx.opt.order) {
                case 'alpha-asc': case 'natural-asc': ls.sort(collator.compare); break;
                case 'alpha-desc': case 'natural-desc': ls.sort(collator.compare).reverse(); break;
                case 'length-asc': ls.sort(function (a, b) { return a.length - b.length || collator.compare(a, b); }); break;
                case 'length-desc': ls.sort(function (a, b) { return b.length - a.length || collator.compare(a, b); }); break;
                case 'reverse': ls.reverse(); break;
                case 'random':
                    for (var i = ls.length - 1; i > 0; i--) {
                        var j = Math.floor(Math.random() * (i + 1));
                        var tmp = ls[i]; ls[i] = ls[j]; ls[j] = tmp;
                    }
                    break;
            }
            return ZT.textResult(ls.join('\n'), { note: ls.length + ' lines' });
        }
    });

    define({
        id: 'duplicate-line-finder',
        name: 'Duplicate Line Finder',
        category: 'text',
        icon: 'copy-check',
        description: 'Find, remove or isolate repeated lines in a list.',
        tags: ['duplicate', 'unique', 'dedupe', 'lines'],
        input: 'text',
        live: true,
        options: [
            {
                id: 'mode', type: 'select', label: 'Action', value: 'remove',
                options: [
                    { value: 'remove', label: 'Remove duplicates (keep first)' },
                    { value: 'remove-last', label: 'Remove duplicates (keep last)' },
                    { value: 'only-dupes', label: 'Show only lines that repeat' },
                    { value: 'only-unique', label: 'Show only lines that appear once' },
                    { value: 'count', label: 'Count occurrences of each line' }
                ]
            },
            { id: 'case-sensitive', type: 'checkbox', label: 'Case sensitive', value: false },
            { id: 'trim', type: 'checkbox', label: 'Ignore leading/trailing spaces', value: true },
            { id: 'ignore-empty', type: 'checkbox', label: 'Ignore empty lines', value: true }
        ],
        run: function (ctx) {
            var raw = lines(ctx.text || '');
            var items = raw
                .map(function (l) { return ctx.opt.trim ? l.trim() : l; })
                .filter(function (l) { return !(ctx.opt.ignoreEmpty && !l.length); });

            var key = function (l) { return ctx.opt.caseSensitive ? l : l.toLowerCase(); };
            var counts = Object.create(null);
            items.forEach(function (l) { counts[key(l)] = (counts[key(l)] || 0) + 1; });

            var out, note;
            switch (ctx.opt.mode) {
                case 'remove': {
                    var seen = Object.create(null);
                    out = items.filter(function (l) {
                        if (seen[key(l)]) return false;
                        seen[key(l)] = true; return true;
                    });
                    note = (items.length - out.length) + ' duplicate lines removed';
                    break;
                }
                case 'remove-last': {
                    var lastIndex = Object.create(null);
                    items.forEach(function (l, i) { lastIndex[key(l)] = i; });
                    out = items.filter(function (l, i) { return lastIndex[key(l)] === i; });
                    note = (items.length - out.length) + ' duplicate lines removed';
                    break;
                }
                case 'only-dupes': {
                    var emitted = Object.create(null);
                    out = items.filter(function (l) {
                        if (counts[key(l)] < 2 || emitted[key(l)]) return false;
                        emitted[key(l)] = true; return true;
                    });
                    note = out.length + ' lines appear more than once';
                    break;
                }
                case 'only-unique':
                    out = items.filter(function (l) { return counts[key(l)] === 1; });
                    note = out.length + ' lines appear exactly once';
                    break;
                default: {
                    var done = Object.create(null);
                    out = [];
                    items.forEach(function (l) {
                        if (done[key(l)]) return;
                        done[key(l)] = true;
                        out.push(counts[key(l)] + '\t' + l);
                    });
                    out.sort(function (a, b) { return parseInt(b, 10) - parseInt(a, 10); });
                    note = out.length + ' distinct lines';
                }
            }
            return ZT.textResult(out.join('\n'), { note: note });
        }
    });

    define({
        id: 'random-line-picker',
        name: 'Random Line Picker',
        category: 'text',
        icon: 'shuffle',
        description: 'Pick random lines from a list — draws, raffles and sampling.',
        tags: ['random', 'picker', 'raffle', 'sample', 'lottery'],
        input: 'text',
        options: [
            { id: 'count', type: 'number', label: 'How many to pick', value: 1, min: 1, max: 1000 },
            { id: 'unique', type: 'checkbox', label: 'No repeats', value: true },
            { id: 'trim', type: 'checkbox', label: 'Trim and skip empty lines', value: true },
            { id: 'number-results', type: 'checkbox', label: 'Number the results', value: true }
        ],
        run: function (ctx) {
            var pool = lines(ctx.text || '');
            if (ctx.opt.trim) pool = pool.map(function (l) { return l.trim(); }).filter(Boolean);
            if (!pool.length) ZT.fail('Add some lines to pick from first.');

            var want = ctx.opt.count;
            if (ctx.opt.unique && want > pool.length) {
                ZT.fail('You asked for ' + want + ' unique picks but only supplied ' + pool.length + ' lines.');
            }

            // Crypto RNG keeps draws fair — Math.random is biased and predictable.
            function randomIndex(n) {
                var buf = new Uint32Array(1);
                crypto.getRandomValues(buf);
                return buf[0] % n;
            }

            var picks = [];
            var remaining = pool.slice();
            for (var i = 0; i < want; i++) {
                var idx = randomIndex(remaining.length);
                picks.push(remaining[idx]);
                if (ctx.opt.unique) remaining.splice(idx, 1);
            }

            return ZT.textResult(picks.map(function (p, i) {
                return ctx.opt.numberResults ? (i + 1) + '. ' + p : p;
            }).join('\n'), { note: 'Picked ' + picks.length + ' of ' + pool.length + ' lines' });
        }
    });

    /* ============================================================
       Whitespace / cleanup
       ============================================================ */
    define({
        id: 'text-cleaner',
        name: 'Text Cleaner',
        category: 'text',
        icon: 'eraser',
        description: 'Strip extra spaces, blank lines, line breaks and invisible characters.',
        tags: ['whitespace', 'trim', 'clean', 'line breaks', 'tidy'],
        input: 'text',
        live: true,
        options: [
            { id: 'trim-lines', type: 'checkbox', label: 'Trim spaces at start and end of each line', value: true },
            { id: 'collapse-spaces', type: 'checkbox', label: 'Collapse runs of spaces into one', value: true },
            { id: 'collapse-blank', type: 'checkbox', label: 'Collapse multiple blank lines into one', value: true },
            { id: 'remove-blank', type: 'checkbox', label: 'Remove all blank lines', value: false },
            { id: 'remove-breaks', type: 'checkbox', label: 'Join all lines into one paragraph', value: false },
            { id: 'tabs-to-spaces', type: 'checkbox', label: 'Convert tabs to spaces', value: false },
            { id: 'tab-width', type: 'number', label: 'Spaces per tab', value: 4, min: 1, max: 12, when: function (o) { return o.tabsToSpaces; } },
            { id: 'strip-invisible', type: 'checkbox', label: 'Remove zero-width and control characters', value: true, help: 'Catches the invisible characters that break search and cause odd copy-paste bugs.' },
            { id: 'normalise-quotes', type: 'checkbox', label: 'Convert smart quotes and dashes to plain ASCII', value: false }
        ],
        run: function (ctx) {
            var t = ctx.text || '';
            var o = ctx.opt;

            if (o.stripInvisible) {
                // Zero-width characters, soft hyphen, word joiner and BOM.
                t = t.replace(/[\u200B-\u200D\u2060\u00AD\uFEFF]/g, '')
                     // C0 control characters, keeping tab, line feed and carriage return.
                     .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
            }
            if (o.normaliseQuotes) {
                t = t.replace(/[\u2018\u2019\u201A\u201B]/g, "'")
                     .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
                     .replace(/[\u2013\u2014\u2212]/g, '-')
                     .replace(/\u2026/g, '...')
                     .replace(/[\u00A0\u2007\u2009\u202F]/g, ' ');
            }
            if (o.tabsToSpaces) t = t.replace(/\t/g, ' '.repeat(o.tabWidth));
            if (o.collapseSpaces) t = t.replace(/[^\S\r\n]{2,}/g, ' ');
            if (o.trimLines) t = lines(t).map(function (l) { return l.trim(); }).join('\n');
            if (o.removeBlank) t = lines(t).filter(function (l) { return l.trim(); }).join('\n');
            else if (o.collapseBlank) t = t.replace(/(\r?\n\s*){3,}/g, '\n\n');
            if (o.removeBreaks) t = t.replace(/\s*\r?\n\s*/g, ' ').trim();

            return ZT.textResult(t);
        }
    });

    define({
        id: 'text-repeater',
        name: 'Text Repeater',
        category: 'text',
        icon: 'repeat',
        description: 'Repeat text a set number of times with custom separators.',
        tags: ['repeat', 'duplicate', 'multiply'],
        input: 'text',
        live: true,
        options: [
            { id: 'times', type: 'number', label: 'Repeat', suffix: 'times', value: 10, min: 1, max: 10000 },
            {
                id: 'separator', type: 'select', label: 'Separate with', value: 'newline',
                options: [
                    { value: 'newline', label: 'New line' },
                    { value: 'space', label: 'Space' },
                    { value: 'comma', label: 'Comma + space' },
                    { value: 'none', label: 'Nothing' },
                    { value: 'custom', label: 'Custom…' }
                ]
            },
            { id: 'custom-separator', type: 'text', label: 'Custom separator', value: ' | ', when: function (o) { return o.separator === 'custom'; } },
            { id: 'number-each', type: 'checkbox', label: 'Prefix each copy with its number', value: false }
        ],
        run: function (ctx) {
            var seps = { newline: '\n', space: ' ', comma: ', ', none: '' };
            var sep = ctx.opt.separator === 'custom' ? ctx.opt.customSeparator : seps[ctx.opt.separator];
            var out = [];
            for (var i = 1; i <= ctx.opt.times; i++) {
                out.push(ctx.opt.numberEach ? i + '. ' + ctx.text : ctx.text);
            }
            return ZT.textResult(out.join(sep));
        }
    });

    /* ============================================================
       Diff
       ============================================================ */

    /**
     * Longest-common-subsequence diff over lines or words.
     * Uses the classic dynamic-programming table; inputs are capped so a
     * giant paste cannot lock the tab up.
     */
    function diffTokens(a, b) {
        var n = a.length, m = b.length;
        var MAX = 2500;
        if (n > MAX || m > MAX) {
            ZT.fail('That is too large to compare line by line (limit ' + MAX + ' lines per side).');
        }
        var dp = [];
        for (var i = 0; i <= n; i++) dp.push(new Uint32Array(m + 1));
        for (i = n - 1; i >= 0; i--) {
            for (var j = m - 1; j >= 0; j--) {
                dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
            }
        }
        var out = [];
        i = 0; j = 0;
        while (i < n && j < m) {
            if (a[i] === b[j]) { out.push({ type: 'same', value: a[i] }); i++; j++; }
            else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: 'removed', value: a[i] }); i++; }
            else { out.push({ type: 'added', value: b[j] }); j++; }
        }
        while (i < n) out.push({ type: 'removed', value: a[i++] });
        while (j < m) out.push({ type: 'added', value: b[j++] });
        return out;
    }

    define({
        id: 'diff-checker',
        name: 'Diff Checker',
        category: 'text',
        icon: 'git-compare',
        description: 'Compare two blocks of text and highlight every difference.',
        tags: ['diff', 'compare', 'changes', 'text compare'],
        input: 'text',
        live: true,
        popular: true,
        inputLabel: 'Original text',
        options: [
            { id: 'compare-to', type: 'textarea', label: 'Changed text', value: '', rows: 8, placeholder: 'Paste the second version here…' },
            {
                id: 'granularity', type: 'select', label: 'Compare by', value: 'line',
                options: [{ value: 'line', label: 'Line' }, { value: 'word', label: 'Word' }, { value: 'char', label: 'Character' }]
            },
            { id: 'ignore-case', type: 'checkbox', label: 'Ignore case', value: false },
            { id: 'ignore-whitespace', type: 'checkbox', label: 'Ignore leading/trailing whitespace', value: true },
            { id: 'hide-unchanged', type: 'checkbox', label: 'Hide unchanged parts', value: false }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var left = ctx.text || '';
            var right = o.compareTo || '';

            function prep(text) {
                var toks;
                if (o.granularity === 'line') toks = lines(text);
                else if (o.granularity === 'word') toks = text.split(/(\s+)/).filter(function (t) { return t.length; });
                else toks = Array.from(text);
                if (o.ignoreWhitespace && o.granularity === 'line') toks = toks.map(function (t) { return t.trim(); });
                return toks;
            }

            var a = prep(left), b = prep(right);
            var compareA = o.ignoreCase ? a.map(function (s) { return s.toLowerCase(); }) : a;
            var compareB = o.ignoreCase ? b.map(function (s) { return s.toLowerCase(); }) : b;

            // Diff on the normalised copies but display the originals.
            var parts = diffTokens(compareA, compareB);
            var ai = 0, bi = 0;
            parts.forEach(function (p) {
                if (p.type === 'removed') p.value = a[ai++];
                else if (p.type === 'added') p.value = b[bi++];
                else { p.value = a[ai++]; bi++; }
            });

            var added = 0, removed = 0;
            parts.forEach(function (p) { if (p.type === 'added') added++; else if (p.type === 'removed') removed++; });

            var wrap = ZT.el('div', { class: 'zt-diff zt-diff--' + o.granularity });
            parts.forEach(function (p) {
                if (o.hideUnchanged && p.type === 'same') return;
                wrap.appendChild(ZT.el('span', { class: 'zt-diff__' + p.type, text: p.value }));
                if (o.granularity === 'line') wrap.appendChild(document.createTextNode('\n'));
            });

            if (!added && !removed) {
                wrap.appendChild(ZT.el('span', { class: 'zt-diff__none', text: 'The two texts are identical.' }));
            }

            return [
                ZT.dataResult([
                    { label: 'Added', value: added + ' ' + o.granularity + (added === 1 ? '' : 's') },
                    { label: 'Removed', value: removed + ' ' + o.granularity + (removed === 1 ? '' : 's') },
                    { label: 'Unchanged', value: (parts.length - added - removed) + '' }
                ], { title: 'Summary', columns: 3 }),
                ZT.nodeResult(wrap, { title: 'Differences' })
            ];
        }
    });

    /* ============================================================
       Markdown
       ============================================================ */
    define({
        id: 'markdown-to-html',
        name: 'Markdown to HTML',
        category: 'text',
        icon: 'file-code',
        description: 'Convert Markdown into clean HTML, with a live preview.',
        tags: ['markdown', 'md', 'html', 'convert'],
        input: 'text',
        live: true,
        popular: true,
        placeholder: '# Hello\n\nWrite **Markdown** here…',
        options: [
            { id: 'show-preview', type: 'checkbox', label: 'Show rendered preview', value: true },
            { id: 'breaks', type: 'checkbox', label: 'Treat single line breaks as <br>', value: false },
            { id: 'full-document', type: 'checkbox', label: 'Wrap in a full HTML document', value: false },
            { id: 'doc-title', type: 'text', label: 'Document title', value: 'Document', when: function (o) { return o.fullDocument; } }
        ],
        run: async function (ctx) {
            var marked = await ZT.libs.marked();
            var parser = marked.parse || marked;
            var html = parser(ctx.text || '', { breaks: !!ctx.opt.breaks, gfm: true });

            var output = html;
            if (ctx.opt.fullDocument) {
                output = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
                    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
                    '<title>' + ZT.esc(ctx.opt.docTitle) + '</title>\n</head>\n<body>\n' +
                    html + '</body>\n</html>';
            }

            var results = [ZT.textResult(output, { lang: 'html', title: 'HTML' })];
            if (ctx.opt.showPreview) {
                // Rendered in a sandboxed frame — Markdown can contain raw HTML.
                var frame = ZT.el('iframe', {
                    class: 'zt-preview-frame',
                    sandbox: 'allow-same-origin',
                    title: 'Rendered preview'
                });
                results.push(ZT.nodeResult(frame, {
                    title: 'Preview',
                    onMount: function () {
                        var doc = frame.contentDocument;
                        doc.open();
                        doc.write('<!DOCTYPE html><meta charset="utf-8"><style>' + PREVIEW_CSS + '</style>' + html);
                        doc.close();
                    }
                }));
            }
            return results;
        }
    });

    var PREVIEW_CSS =
        'body{font:15px/1.65 system-ui,-apple-system,Segoe UI,sans-serif;color:#e6e8ee;background:#14161c;padding:16px;margin:0}' +
        'h1,h2,h3,h4{line-height:1.25;margin:1.2em 0 .5em}h1{font-size:1.7em}h2{font-size:1.35em}' +
        'a{color:#5b9dff}code{background:rgba(255,255,255,.09);padding:.15em .4em;border-radius:4px;font-size:.9em}' +
        'pre{background:rgba(255,255,255,.06);padding:12px;border-radius:8px;overflow:auto}pre code{background:none;padding:0}' +
        'blockquote{border-left:3px solid #5b9dff;margin:1em 0;padding:.2em 1em;color:#aab}' +
        'table{border-collapse:collapse;width:100%}th,td{border:1px solid rgba(255,255,255,.14);padding:6px 10px;text-align:left}' +
        'img{max-width:100%}hr{border:0;border-top:1px solid rgba(255,255,255,.14)}';

    define({
        id: 'html-to-markdown',
        name: 'HTML to Markdown',
        category: 'text',
        icon: 'file-down',
        description: 'Convert HTML markup back into readable Markdown.',
        tags: ['html', 'markdown', 'convert', 'md'],
        input: 'text',
        live: true,
        placeholder: '<h1>Hello</h1>\n<p>Paste <b>HTML</b> here…</p>',
        options: [
            {
                id: 'heading-style', type: 'select', label: 'Heading style', value: 'atx',
                options: [{ value: 'atx', label: '# Heading' }, { value: 'setext', label: 'Underlined heading' }]
            },
            {
                id: 'bullet', type: 'select', label: 'Bullet character', value: '-',
                options: [{ value: '-', label: '- dash' }, { value: '*', label: '* asterisk' }, { value: '+', label: '+ plus' }]
            },
            {
                id: 'code-block-style', type: 'select', label: 'Code blocks', value: 'fenced',
                options: [{ value: 'fenced', label: 'Fenced (```)' }, { value: 'indented', label: 'Indented' }]
            }
        ],
        run: async function (ctx) {
            var Turndown = await ZT.libs.turndown();
            var td = new Turndown({
                headingStyle: ctx.opt.headingStyle,
                bulletListMarker: ctx.opt.bullet,
                codeBlockStyle: ctx.opt.codeBlockStyle
            });
            return ZT.textResult(td.turndown(ctx.text || ''), { lang: 'markdown' });
        }
    });

    /* ============================================================
       Morse / novelty encodings
       ============================================================ */
    var MORSE = {
        a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....', i: '..', j: '.---',
        k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-',
        u: '..-', v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..',
        '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
        '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
        '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.',
        '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-',
        '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
    };
    var MORSE_REVERSE = Object.keys(MORSE).reduce(function (acc, k) { acc[MORSE[k]] = k; return acc; }, {});

    define({
        id: 'morse-code-translator',
        name: 'Morse Code Translator',
        category: 'text',
        icon: 'radio',
        description: 'Translate between plain text and Morse code, in either direction.',
        tags: ['morse', 'code', 'translate', 'encode', 'decode'],
        input: 'text',
        live: true,
        options: [
            {
                id: 'direction', type: 'radio', label: 'Direction', value: 'encode',
                options: [{ value: 'encode', label: 'Text → Morse' }, { value: 'decode', label: 'Morse → Text' }]
            },
            { id: 'letter-sep', type: 'text', label: 'Between letters', value: ' ', when: function (o) { return o.direction === 'encode'; } },
            { id: 'word-sep', type: 'text', label: 'Between words', value: ' / ', when: function (o) { return o.direction === 'encode'; } },
            { id: 'uppercase-out', type: 'checkbox', label: 'Uppercase output', value: false, when: function (o) { return o.direction === 'decode'; } }
        ],
        run: function (ctx) {
            var text = ctx.text || '';
            if (ctx.opt.direction === 'encode') {
                var out = text.trim().toLowerCase().split(/\s+/).map(function (word) {
                    return Array.from(word).map(function (ch) { return MORSE[ch] || ''; })
                        .filter(Boolean).join(ctx.opt.letterSep);
                }).filter(Boolean).join(ctx.opt.wordSep);
                return ZT.textResult(out);
            }
            var decoded = text.trim().split(/\s*\/\s*|\s{3,}/).map(function (word) {
                return word.trim().split(/\s+/).map(function (sym) { return MORSE_REVERSE[sym] || ''; }).join('');
            }).join(' ');
            return ZT.textResult(ctx.opt.uppercaseOut ? decoded.toUpperCase() : decoded);
        }
    });

    define({
        id: 'caesar-cipher',
        name: 'Caesar Cipher / ROT13',
        category: 'text',
        icon: 'rotate-cw',
        description: 'Shift letters by a fixed amount — ROT13 and classic Caesar ciphers.',
        tags: ['caesar', 'rot13', 'cipher', 'shift', 'encode'],
        input: 'text',
        live: true,
        options: [
            { id: 'shift', type: 'range', label: 'Shift', value: 13, min: 1, max: 25, step: 1, help: 'A shift of 13 is ROT13, which is its own inverse.' },
            {
                id: 'direction', type: 'radio', label: 'Direction', value: 'encode',
                options: [{ value: 'encode', label: 'Encode (shift forward)' }, { value: 'decode', label: 'Decode (shift back)' }]
            },
            { id: 'shift-digits', type: 'checkbox', label: 'Also shift digits (ROT5)', value: false }
        ],
        run: function (ctx) {
            var shift = ctx.opt.direction === 'decode' ? 26 - ctx.opt.shift : ctx.opt.shift;
            var out = String(ctx.text || '').replace(/[a-z]/gi, function (c) {
                var base = c <= 'Z' ? 65 : 97;
                return String.fromCharCode((c.charCodeAt(0) - base + shift) % 26 + base);
            });
            if (ctx.opt.shiftDigits) {
                var dshift = ctx.opt.direction === 'decode' ? 5 : 5;
                out = out.replace(/[0-9]/g, function (d) { return String((+d + dshift) % 10); });
            }
            return ZT.textResult(out);
        }
    });

    define({
        id: 'leet-speak-converter',
        name: 'Leet Speak Converter',
        category: 'text',
        icon: 'terminal',
        description: 'Convert text to and from 1337 5p34k.',
        tags: ['leet', '1337', 'hacker', 'fun'],
        input: 'text',
        live: true,
        options: [
            {
                id: 'direction', type: 'radio', label: 'Direction', value: 'encode',
                options: [{ value: 'encode', label: 'Text → Leet' }, { value: 'decode', label: 'Leet → Text' }]
            },
            {
                id: 'level', type: 'select', label: 'Intensity', value: 'basic',
                options: [{ value: 'basic', label: 'Basic (a→4, e→3)' }, { value: 'advanced', label: 'Advanced (more substitutions)' }],
                when: function (o) { return o.direction === 'encode'; }
            }
        ],
        run: function (ctx) {
            var basic = { a: '4', e: '3', i: '1', o: '0', s: '5', t: '7' };
            var advanced = Object.assign({}, basic, { b: '8', g: '9', l: '1', z: '2', c: '<', d: '|)', h: '#', k: '|<', m: '/\\/\\', n: '/\\/', u: '|_|', v: '\\/', w: '\\/\\/', x: '><', y: '\'/' });
            var text = String(ctx.text || '');

            if (ctx.opt.direction === 'encode') {
                var map = ctx.opt.level === 'advanced' ? advanced : basic;
                return ZT.textResult(text.replace(/[a-z]/gi, function (c) {
                    var lower = c.toLowerCase();
                    return map[lower] !== undefined ? map[lower] : c;
                }));
            }
            // Decoding only reverses the unambiguous single-character swaps.
            var reverse = { '4': 'a', '3': 'e', '1': 'i', '0': 'o', '5': 's', '7': 't', '8': 'b', '9': 'g', '2': 'z' };
            return ZT.textResult(text.replace(/[0-9]/g, function (c) { return reverse[c] !== undefined ? reverse[c] : c; }));
        }
    });

    /* ============================================================
       ASCII banner
       ============================================================ */
    var BANNER_FONT = {
        // 5-row block letters, kept compact so the whole font fits inline.
        A: ['  #  ', ' # # ', '#####', '#   #', '#   #'], B: ['#### ', '#   #', '#### ', '#   #', '#### '],
        C: [' ####', '#    ', '#    ', '#    ', ' ####'], D: ['#### ', '#   #', '#   #', '#   #', '#### '],
        E: ['#####', '#    ', '#### ', '#    ', '#####'], F: ['#####', '#    ', '#### ', '#    ', '#    '],
        G: [' ####', '#    ', '#  ##', '#   #', ' ####'], H: ['#   #', '#   #', '#####', '#   #', '#   #'],
        I: ['#####', '  #  ', '  #  ', '  #  ', '#####'], J: ['#####', '   # ', '   # ', '#  # ', ' ##  '],
        K: ['#   #', '#  # ', '###  ', '#  # ', '#   #'], L: ['#    ', '#    ', '#    ', '#    ', '#####'],
        M: ['#   #', '## ##', '# # #', '#   #', '#   #'], N: ['#   #', '##  #', '# # #', '#  ##', '#   #'],
        O: [' ### ', '#   #', '#   #', '#   #', ' ### '], P: ['#### ', '#   #', '#### ', '#    ', '#    '],
        Q: [' ### ', '#   #', '# # #', '#  # ', ' ## #'], R: ['#### ', '#   #', '#### ', '#  # ', '#   #'],
        S: [' ####', '#    ', ' ### ', '    #', '#### '], T: ['#####', '  #  ', '  #  ', '  #  ', '  #  '],
        U: ['#   #', '#   #', '#   #', '#   #', ' ### '], V: ['#   #', '#   #', '#   #', ' # # ', '  #  '],
        W: ['#   #', '#   #', '# # #', '## ##', '#   #'], X: ['#   #', ' # # ', '  #  ', ' # # ', '#   #'],
        Y: ['#   #', ' # # ', '  #  ', '  #  ', '  #  '], Z: ['#####', '   # ', '  #  ', ' #   ', '#####'],
        '0': [' ### ', '#  ##', '# # #', '##  #', ' ### '], '1': ['  #  ', ' ##  ', '  #  ', '  #  ', '#####'],
        '2': [' ### ', '#   #', '   # ', '  #  ', '#####'], '3': ['#### ', '    #', ' ### ', '    #', '#### '],
        '4': ['#   #', '#   #', '#####', '    #', '    #'], '5': ['#####', '#    ', '#### ', '    #', '#### '],
        '6': [' ####', '#    ', '#### ', '#   #', ' ### '], '7': ['#####', '   # ', '  #  ', ' #   ', '#    '],
        '8': [' ### ', '#   #', ' ### ', '#   #', ' ### '], '9': [' ### ', '#   #', ' ####', '    #', ' ### '],
        ' ': ['   ', '   ', '   ', '   ', '   '], '!': ['  #  ', '  #  ', '  #  ', '     ', '  #  '],
        '?': [' ### ', '#   #', '   # ', '  #  ', '  #  '], '.': ['   ', '   ', '   ', '   ', ' # '],
        '-': ['     ', '     ', '#####', '     ', '     '], '+': ['     ', '  #  ', ' ### ', '  #  ', '     ']
    };

    define({
        id: 'ascii-banner-generator',
        name: 'ASCII Banner Generator',
        category: 'text',
        icon: 'type',
        description: 'Turn short text into big ASCII-art letters for banners and READMEs.',
        tags: ['ascii', 'art', 'banner', 'figlet', 'text art'],
        input: 'text',
        live: true,
        placeholder: 'ZYNC',
        options: [
            { id: 'fill', type: 'text', label: 'Fill character', value: '#', maxlength: 2 },
            { id: 'spacing', type: 'number', label: 'Space between letters', value: 1, min: 0, max: 6 },
            { id: 'comment', type: 'select', label: 'Wrap as comment', value: 'none',
              options: [{ value: 'none', label: 'No wrapping' }, { value: 'js', label: 'JavaScript /* */' }, { value: 'hash', label: 'Hash #' }, { value: 'html', label: 'HTML <!-- -->' }] }
        ],
        run: function (ctx) {
            var text = String(ctx.text || '').toUpperCase().slice(0, 30);
            if (!text.trim()) return ZT.textResult('');

            var chars = Array.from(text).map(function (c) { return BANNER_FONT[c] || BANNER_FONT[' ']; });
            var gap = ' '.repeat(ctx.opt.spacing);
            var out = [];
            for (var row = 0; row < 5; row++) {
                out.push(chars.map(function (g) { return g[row]; }).join(gap).replace(/\s+$/, ''));
            }
            var art = out.join('\n');
            if (ctx.opt.fill && ctx.opt.fill !== '#') art = art.replace(/#/g, ctx.opt.fill.charAt(0));

            if (ctx.opt.comment === 'js') art = '/*\n' + art + '\n*/';
            else if (ctx.opt.comment === 'hash') art = art.split('\n').map(function (l) { return '# ' + l; }).join('\n');
            else if (ctx.opt.comment === 'html') art = '<!--\n' + art + '\n-->';

            return ZT.textResult(art, { mono: true });
        }
    });

    /* ============================================================
       Lorem ipsum
       ============================================================ */
    var LOREM = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna ' +
        'aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure ' +
        'in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt ' +
        'culpa qui officia deserunt mollit anim id est laborum perspiciatis unde omnis iste natus error voluptatem accusantium ' +
        'doloremque laudantium totam rem aperiam eaque ipsa quae ab illo inventore veritatis quasi architecto beatae vitae dicta').split(' ');

    define({
        id: 'lorem-ipsum-generator',
        name: 'Lorem Ipsum Generator',
        category: 'text',
        icon: 'align-left',
        description: 'Generate placeholder paragraphs, sentences, words or list items.',
        tags: ['lorem', 'ipsum', 'placeholder', 'dummy text', 'filler'],
        input: 'none',
        popular: true,
        options: [
            {
                id: 'unit', type: 'select', label: 'Generate', value: 'paragraphs',
                options: [
                    { value: 'paragraphs', label: 'Paragraphs' },
                    { value: 'sentences', label: 'Sentences' },
                    { value: 'words', label: 'Words' },
                    { value: 'list', label: 'List items' }
                ]
            },
            { id: 'count', type: 'number', label: 'How many', value: 3, min: 1, max: 200 },
            { id: 'min-words', type: 'number', label: 'Min words per sentence', value: 8, min: 3, max: 40, when: function (o) { return o.unit !== 'words'; } },
            { id: 'max-words', type: 'number', label: 'Max words per sentence', value: 18, min: 4, max: 60, when: function (o) { return o.unit !== 'words'; } },
            { id: 'start-classic', type: 'checkbox', label: 'Start with "Lorem ipsum dolor sit amet"', value: true },
            {
                id: 'format', type: 'select', label: 'Output format', value: 'plain',
                options: [{ value: 'plain', label: 'Plain text' }, { value: 'html', label: 'HTML tags' }, { value: 'markdown', label: 'Markdown' }]
            }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var minW = Math.min(o.minWords, o.maxWords);
            var maxW = Math.max(o.minWords, o.maxWords);

            function word() { return LOREM[Math.floor(Math.random() * LOREM.length)]; }
            function sentence() {
                var n = minW + Math.floor(Math.random() * (maxW - minW + 1));
                var ws = [];
                for (var i = 0; i < n; i++) ws.push(word());
                var s = ws.join(' ');
                return s.charAt(0).toUpperCase() + s.slice(1) + '.';
            }
            function paragraph() {
                var n = 3 + Math.floor(Math.random() * 4);
                var ss = [];
                for (var i = 0; i < n; i++) ss.push(sentence());
                return ss.join(' ');
            }

            var items = [];
            for (var i = 0; i < o.count; i++) {
                if (o.unit === 'paragraphs') items.push(paragraph());
                else if (o.unit === 'sentences') items.push(sentence());
                else if (o.unit === 'list') items.push(sentence().replace(/\.$/, ''));
                else items.push(word());
            }

            if (o.startClassic && items.length && o.unit !== 'words') {
                items[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' + items[0];
            } else if (o.startClassic && o.unit === 'words') {
                items = 'lorem ipsum dolor sit amet'.split(' ').concat(items).slice(0, o.count);
            }

            var out;
            if (o.unit === 'words') out = items.join(' ');
            else if (o.format === 'html') {
                out = o.unit === 'list'
                    ? '<ul>\n' + items.map(function (t) { return '  <li>' + t + '</li>'; }).join('\n') + '\n</ul>'
                    : items.map(function (t) { return '<p>' + t + '</p>'; }).join('\n');
            } else if (o.format === 'markdown') {
                out = o.unit === 'list' ? items.map(function (t) { return '- ' + t; }).join('\n') : items.join('\n\n');
            } else {
                out = o.unit === 'list' ? items.map(function (t, i) { return (i + 1) + '. ' + t; }).join('\n') : items.join('\n\n');
            }

            return ZT.textResult(out, { note: items.length + ' ' + o.unit });
        }
    });

    /* ============================================================
       URL parser
       ============================================================ */
    define({
        id: 'url-parser',
        name: 'URL Parser',
        category: 'text',
        icon: 'link-2',
        description: 'Break a URL into its parts and decode every query parameter.',
        tags: ['url', 'query string', 'parse', 'parameters'],
        input: 'text',
        live: true,
        placeholder: 'https://example.com/path?utm_source=news&page=2#section',
        options: [
            { id: 'decode-values', type: 'checkbox', label: 'URL-decode parameter values', value: true },
            { id: 'sort-params', type: 'checkbox', label: 'Sort parameters alphabetically', value: false }
        ],
        run: function (ctx) {
            var raw = String(ctx.text || '').trim();
            if (!raw) return ZT.textResult('', { note: 'Paste a URL to inspect it.' });

            var u;
            try {
                u = new URL(raw);
            } catch (e) {
                try {
                    u = new URL('https://' + raw);
                } catch (e2) {
                    ZT.fail('That does not look like a valid URL.');
                }
            }

            var rows = [
                { label: 'Protocol', value: u.protocol.replace(':', '') },
                { label: 'Host', value: u.host },
                { label: 'Hostname', value: u.hostname },
                { label: 'Port', value: u.port || '(default)' },
                { label: 'Path', value: u.pathname },
                { label: 'Query', value: u.search || '(none)' },
                { label: 'Fragment', value: u.hash.replace('#', '') || '(none)' },
                { label: 'Origin', value: u.origin }
            ];
            if (u.username) rows.push({ label: 'Username', value: u.username });

            var results = [ZT.dataResult(rows, { title: 'URL parts', columns: 2 })];

            var params = Array.from(u.searchParams.entries()).map(function (pair) {
                var value = pair[1];
                if (ctx.opt.decodeValues) {
                    try { value = decodeURIComponent(value); } catch (e) { /* leave as-is */ }
                }
                return { label: pair[0], value: value || '(empty)' };
            });
            if (ctx.opt.sortParams) params.sort(function (a, b) { return a.label.localeCompare(b.label); });
            if (params.length) results.push(ZT.dataResult(params, { title: 'Query parameters (' + params.length + ')', columns: 2 }));

            return results;
        }
    });

})();
