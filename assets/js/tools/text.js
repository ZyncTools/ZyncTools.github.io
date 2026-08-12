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


    /* ============================================================
       Character counter
       ============================================================ */
    define({
        id: 'character-counter',
        name: 'Character Counter',
        category: 'text',
        icon: 'type',
        description: 'Count characters against the limits of every major platform, live.',
        tags: ['character counter', 'character count', 'twitter', 'sms', 'meta description', 'limit', 'length'],
        input: 'text',
        live: true,
        placeholder: 'Start typing and the counts update as you go…',
        options: [
            { id: 'count-spaces', type: 'checkbox', label: 'Count spaces', value: true },
            { id: 'show-limits', type: 'checkbox', label: 'Show platform limits', value: true },
            { id: 'custom-limit', type: 'number', label: 'Your own limit', value: 0, min: 0, max: 100000, help: '0 hides it.' }
        ],
        run: function (ctx) {
            var text = ctx.text || '';
            var counted = ctx.opt.countSpaces ? text : text.replace(/\s/g, '');

            // Count by code point so emoji and accents count as one character,
            // which is what a human means and what most platforms measure.
            var characters = Array.from(counted).length;
            var withoutSpaces = Array.from(text.replace(/\s/g, '')).length;
            var words = (text.trim().match(/[^\s]+/g) || []).length;

            var results = [
                ZT.dataResult([
                    { label: 'Characters', value: ZT.formatNumber(characters) },
                    { label: 'Characters without spaces', value: ZT.formatNumber(withoutSpaces) },
                    { label: 'Words', value: ZT.formatNumber(words) },
                    { label: 'Lines', value: ZT.formatNumber(text ? text.split(/\r?\n/).length : 0) },
                    { label: 'Bytes (UTF-8)', value: ZT.formatNumber(new TextEncoder().encode(text).length) },
                    { label: 'SMS segments', value: smsSegments(text) }
                ], { title: 'Counts', columns: 2 })
            ];

            if (ctx.opt.showLimits) {
                var LIMITS = [
                    ['X / Twitter post', 280], ['Bluesky post', 300], ['SMS (single message)', 160],
                    ['Meta description', 160], ['Page title', 60], ['Instagram caption', 2200],
                    ['LinkedIn post', 3000], ['Facebook post', 63206], ['YouTube title', 100],
                    ['YouTube description', 5000], ['Reddit title', 300]
                ];
                if (ctx.opt.customLimit > 0) LIMITS.unshift(['Your limit', ctx.opt.customLimit]);

                results.push(ZT.dataResult(LIMITS.map(function (l) {
                    var remaining = l[1] - characters;
                    return {
                        label: l[0] + '  (' + ZT.formatNumber(l[1]) + ')',
                        value: remaining >= 0
                            ? ZT.formatNumber(remaining) + ' left'
                            : ZT.formatNumber(-remaining) + ' over'
                    };
                }), { title: 'Against platform limits', columns: 2 }));
            }

            return results;
        }
    });

    /** GSM-7 fits 160 per segment, Unicode drops to 70 — and 153/67 when split. */
    function smsSegments(text) {
        if (!text) return '0';
        var GSM = /^[A-Za-z0-9@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà\n\r^{}\\[~\]|€]*$/;
        var unicode = !GSM.test(text);
        var length = Array.from(text).length;
        var single = unicode ? 70 : 160;
        var multi = unicode ? 67 : 153;

        if (length <= single) return '1  (' + (unicode ? 'Unicode' : 'GSM-7') + ')';
        return Math.ceil(length / multi) + '  (' + (unicode ? 'Unicode' : 'GSM-7') + ', split)';
    }

    /* ============================================================
       Readability
       ============================================================ */
    define({
        id: 'readability-score',
        name: 'Readability Score Checker',
        category: 'text',
        icon: 'file-text',
        description: 'Score how easy your writing is to read with Flesch, Gunning Fog and more.',
        tags: ['readability', 'flesch', 'kincaid', 'grade level', 'reading ease', 'seo', 'writing'],
        input: 'text',
        live: true,
        placeholder: 'Paste the text you want to assess…',
        options: [
            { id: 'target', type: 'select', label: 'Writing for', value: 'general',
              options: [
                  { value: 'general', label: 'A general audience' },
                  { value: 'academic', label: 'An academic or technical audience' },
                  { value: 'children', label: 'Children' }
              ] },
            { id: 'show-hardest', type: 'checkbox', label: 'Show the hardest sentences', value: true }
        ],
        run: function (ctx) {
            var text = String(ctx.text || '').trim();
            if (text.split(/\s+/).length < 20) {
                return ZT.dataResult([{ label: 'Waiting for input', value: 'Paste at least 20 words — these formulas are meaningless on a fragment.' }], { title: 'Readability' });
            }

            var sentences = text.split(/[.!?…]+(?=\s|$)/).map(function (s) { return s.trim(); }).filter(function (s) { return s.split(/\s+/).length > 1; });
            var words = text.match(/[\p{L}\p{N}'-]+/gu) || [];
            var syllables = words.reduce(function (sum, w) { return sum + countSyllables(w); }, 0);
            var complexWords = words.filter(function (w) { return countSyllables(w) >= 3; });

            var sentenceCount = Math.max(1, sentences.length);
            var wordCount = words.length;
            var wordsPerSentence = wordCount / sentenceCount;
            var syllablesPerWord = syllables / wordCount;

            // Flesch Reading Ease: higher is easier, 0–100.
            var flesch = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
            // Flesch-Kincaid Grade: US school grade needed.
            var fkGrade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;
            // Gunning Fog: years of education needed.
            var fog = 0.4 * (wordsPerSentence + 100 * (complexWords.length / wordCount));
            // SMOG, designed for health material.
            var smog = 1.043 * Math.sqrt(complexWords.length * (30 / sentenceCount)) + 3.1291;
            // Automated Readability Index, from characters rather than syllables.
            var characters = words.join('').length;
            var ari = 4.71 * (characters / wordCount) + 0.5 * wordsPerSentence - 21.43;

            var band, advice;
            if (flesch >= 90) { band = 'Very easy — around age 11'; advice = 'Simple enough for almost anyone.'; }
            else if (flesch >= 80) { band = 'Easy — around age 12'; advice = 'Conversational and widely accessible.'; }
            else if (flesch >= 70) { band = 'Fairly easy — around age 13'; advice = 'A comfortable level for most web writing.'; }
            else if (flesch >= 60) { band = 'Standard — ages 13 to 15'; advice = 'This is the sweet spot for general audiences.'; }
            else if (flesch >= 50) { band = 'Fairly difficult — ages 15 to 18'; advice = 'Fine for an engaged reader; heavy for casual browsing.'; }
            else if (flesch >= 30) { band = 'Difficult — university level'; advice = 'Shorten sentences and prefer shorter words where you can.'; }
            else { band = 'Very difficult — graduate level'; advice = 'Most readers will struggle. Break up long sentences first — that helps more than vocabulary.'; }

            var targetRange = { general: [60, 80], academic: [30, 60], children: [80, 100] }[ctx.opt.target];
            var onTarget = flesch >= targetRange[0] && flesch <= targetRange[1];

            var tone = onTarget ? 'good' : (Math.abs(flesch - (targetRange[0] + targetRange[1]) / 2) > 30 ? 'bad' : 'warn');
            var meter = ZT.el('div', { class: 'zt-meter-wrap' }, [
                ZT.el('div', { class: 'zt-meter__label' }, [
                    ZT.el('strong', { text: Math.round(flesch) + ' — ' + band }),
                    ZT.el('span', { text: 'target for this audience: ' + targetRange[0] + '–' + targetRange[1] })
                ]),
                ZT.el('div', { class: 'zt-meter zt-meter--' + tone },
                    ZT.el('div', { class: 'zt-meter__bar', style: { width: ZT.clamp(flesch, 0, 100) + '%' } }))
            ]);

            var results = [
                ZT.nodeResult(meter, { title: 'Reading ease' }),
                ZT.dataResult([
                    { label: 'Flesch Reading Ease', value: flesch.toFixed(1) + '  /100' },
                    { label: 'Flesch-Kincaid Grade', value: 'grade ' + Math.max(0, fkGrade).toFixed(1) },
                    { label: 'Gunning Fog Index', value: fog.toFixed(1) + ' years of education' },
                    { label: 'SMOG Index', value: 'grade ' + smog.toFixed(1) },
                    { label: 'Automated Readability', value: 'grade ' + Math.max(0, ari).toFixed(1) },
                    { label: 'Verdict', value: onTarget ? 'On target for your audience' : 'Outside the target range' }
                ], { title: 'Scores', columns: 2 }),
                ZT.dataResult([
                    { label: 'Words', value: ZT.formatNumber(wordCount) },
                    { label: 'Sentences', value: ZT.formatNumber(sentenceCount) },
                    { label: 'Average sentence length', value: wordsPerSentence.toFixed(1) + ' words' },
                    { label: 'Words of 3+ syllables', value: complexWords.length + '  (' + (complexWords.length / wordCount * 100).toFixed(1) + '%)' },
                    { label: 'Advice', value: advice }
                ], { title: 'Statistics', columns: 2 })
            ];

            if (ctx.opt.showHardest) {
                var ranked = sentences.map(function (s) {
                    var w = s.match(/[\p{L}\p{N}'-]+/gu) || [];
                    return { text: s, words: w.length };
                }).sort(function (a, b) { return b.words - a.words; }).slice(0, 5);

                results.push(ZT.dataResult(ranked.map(function (s) {
                    return { label: s.words + ' words', value: s.text.length > 180 ? s.text.slice(0, 180) + '…' : s.text };
                }), { title: 'Longest sentences — usually the first thing to fix', columns: 1 }));
            }

            return results;
        }
    });

    /** Approximate English syllable count. Good enough for these formulas. */
    function countSyllables(word) {
        var w = String(word).toLowerCase().replace(/[^a-z]/g, '');
        if (!w) return 0;
        if (w.length <= 3) return 1;

        w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
        w = w.replace(/^y/, '');
        var groups = w.match(/[aeiouy]{1,2}/g);
        return Math.max(1, groups ? groups.length : 1);
    }

    /* ============================================================
       Number to words
       ============================================================ */
    define({
        id: 'number-to-words',
        name: 'Number to Words Converter',
        category: 'text',
        icon: 'type',
        description: 'Spell out numbers in words, including currency for cheques and invoices.',
        tags: ['number to words', 'spell out', 'cheque', 'check', 'currency', 'amount in words'],
        input: 'text',
        live: true,
        placeholder: '1234.56',
        options: [
            {
                id: 'style', type: 'select', label: 'Format', value: 'plain',
                options: [
                    { value: 'plain', label: 'Plain words' },
                    { value: 'currency', label: 'Currency (for cheques)' },
                    { value: 'ordinal', label: 'Ordinal — first, second, third' }
                ]
            },
            { id: 'currency-name', type: 'text', label: 'Currency name', value: 'pounds', when: function (o) { return o.style === 'currency'; } },
            { id: 'cents-name', type: 'text', label: 'Fractional unit', value: 'pence', when: function (o) { return o.style === 'currency'; } },
            {
                id: 'case', type: 'select', label: 'Capitalisation', value: 'sentence',
                options: [
                    { value: 'sentence', label: 'Sentence case' }, { value: 'lower', label: 'lowercase' },
                    { value: 'upper', label: 'UPPERCASE' }, { value: 'title', label: 'Title Case' }
                ]
            },
            { id: 'use-and', type: 'checkbox', label: 'Use "and" before the tens', value: true, help: 'British usage: one hundred and one. American usage omits it.' },
            { id: 'per-line', type: 'checkbox', label: 'Convert one number per line', value: false }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var input = String(ctx.text || '').trim();
            if (!input) return ZT.textResult('');

            function convert(raw) {
                var cleaned = String(raw).replace(/[,\s£$€]/g, '');
                var value = parseFloat(cleaned);
                if (isNaN(value)) ZT.fail('"' + raw + '" is not a number.');

                var out;
                if (o.style === 'ordinal') {
                    if (!Number.isInteger(value)) ZT.fail('Ordinals need a whole number.');
                    out = toOrdinalWords(value, o.useAnd);
                } else if (o.style === 'currency') {
                    var whole = Math.floor(Math.abs(value));
                    var fraction = Math.round((Math.abs(value) - whole) * 100);
                    out = numberToWords(whole, o.useAnd) + ' ' + o.currencyName;
                    if (fraction > 0) out += ' and ' + numberToWords(fraction, o.useAnd) + ' ' + o.centsName;
                    out += ' only';
                    if (value < 0) out = 'minus ' + out;
                } else {
                    out = numberToWords(value, o.useAnd);
                }

                switch (o.case) {
                    case 'upper': return out.toUpperCase();
                    case 'title': return out.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
                    case 'lower': return out;
                    default: return out.charAt(0).toUpperCase() + out.slice(1);
                }
            }

            if (o.perLine) {
                var lines = input.split(/\r?\n/).filter(function (l) { return l.trim(); });
                return ZT.textResult(lines.map(function (l) { return l.trim() + '  =  ' + convert(l); }).join('\n'));
            }

            return ZT.dataResult([
                { label: 'Number', value: input },
                { label: 'In words', value: convert(input) }
            ], { title: 'Result', columns: 1 });
        }
    });

    var ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
        'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    var SCALES = [[1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million'], [1000, 'thousand']];

    function numberToWords(value, useAnd) {
        if (!isFinite(value)) return 'not a number';
        if (value < 0) return 'minus ' + numberToWords(-value, useAnd);

        var whole = Math.floor(value);
        var decimals = String(value).split('.')[1];

        var words = wholeToWords(whole, useAnd);
        if (decimals) {
            words += ' point ' + Array.from(decimals).map(function (d) { return ONES[+d]; }).join(' ');
        }
        return words;
    }

    function wholeToWords(n, useAnd) {
        if (n < 20) return ONES[n];
        if (n < 100) {
            return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
        }
        if (n < 1000) {
            var rest = n % 100;
            return ONES[Math.floor(n / 100)] + ' hundred' + (rest ? (useAnd ? ' and ' : ' ') + wholeToWords(rest, useAnd) : '');
        }
        for (var i = 0; i < SCALES.length; i++) {
            if (n >= SCALES[i][0]) {
                var count = Math.floor(n / SCALES[i][0]);
                var remainder = n % SCALES[i][0];
                var text = wholeToWords(count, useAnd) + ' ' + SCALES[i][1];
                if (remainder) {
                    // "and" only reads correctly before a value under 100.
                    text += (remainder < 100 && useAnd ? ' and ' : ' ') + wholeToWords(remainder, useAnd);
                }
                return text;
            }
        }
        return String(n);
    }

    function toOrdinalWords(n, useAnd) {
        var IRREGULAR = {
            one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth',
            nine: 'ninth', twelve: 'twelfth'
        };
        var words = wholeToWords(n, useAnd);
        var parts = words.split(/([\s-])/);
        var lastIndex = parts.length - 1;
        var last = parts[lastIndex];

        if (IRREGULAR[last]) parts[lastIndex] = IRREGULAR[last];
        else if (/y$/.test(last)) parts[lastIndex] = last.replace(/y$/, 'ieth');
        else parts[lastIndex] = last + 'th';

        return parts.join('');
    }

    /* ============================================================
       Bionic reading
       ============================================================ */
    define({
        id: 'bionic-reading-converter',
        name: 'Bionic Reading Converter',
        category: 'text',
        icon: 'align-left',
        description: 'Bold the leading letters of each word to guide the eye while reading.',
        tags: ['bionic reading', 'speed reading', 'focus', 'adhd', 'accessibility', 'bold'],
        input: 'text',
        live: true,
        placeholder: 'Paste the text you want to convert…',
        options: [
            { id: 'intensity', type: 'range', label: 'How much of each word to bold', value: 50, min: 20, max: 80, step: 5, suffix: '%' },
            { id: 'skip-short', type: 'checkbox', label: 'Leave very short words alone', value: true },
            { id: 'min-length', type: 'number', label: 'Shortest word to convert', value: 4, min: 2, max: 10, when: function (o) { return o.skipShort; } },
            {
                id: 'output', type: 'select', label: 'Output', value: 'html',
                options: [
                    { value: 'html', label: 'HTML with <b> tags' },
                    { value: 'markdown', label: 'Markdown with **bold**' },
                    { value: 'unicode', label: 'Unicode bold — pastes anywhere' }
                ]
            },
            { id: 'preview', type: 'checkbox', label: 'Show a rendered preview', value: true }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var text = String(ctx.text || '');
            if (!text.trim()) return ZT.textResult('');

            function boldPart(word) {
                var letters = word.match(/^[\p{L}\p{N}]+/u);
                if (!letters) return word;
                var core = letters[0];
                if (o.skipShort && core.length < o.minLength) return word;

                var cut = Math.max(1, Math.round(core.length * o.intensity / 100));
                var head = word.slice(0, cut);
                var tail = word.slice(cut);

                if (o.output === 'markdown') return '**' + head + '**' + tail;
                if (o.output === 'unicode') return toUnicodeBold(head) + tail;
                return '<b>' + head + '</b>' + tail;
            }

            var converted = text.replace(/\S+/g, boldPart);
            var results = [ZT.textResult(converted, { lang: o.output === 'html' ? 'html' : 'text' })];

            if (o.preview) {
                var previewHtml = o.output === 'html'
                    ? converted
                    : ZT.esc(converted).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
                var node = ZT.el('div', {
                    style: { fontSize: '16px', lineHeight: '1.8', whiteSpace: 'pre-wrap', maxWidth: '70ch' }
                });
                node.innerHTML = previewHtml.replace(/\n/g, '<br>');
                results.push(ZT.nodeResult(node, { title: 'Preview' }));
            }

            results.push(ZT.dataResult([
                { label: 'How it works', value: 'Bolding the first part of a word is meant to give the eye a fixation point so it can skip ahead. Some readers find it genuinely helpful; controlled studies have not shown a consistent speed gain. Judge it on whether it helps you.' }
            ], { title: 'Worth knowing', columns: 1 }));

            return results;
        }
    });

    /** Map ASCII letters to the Unicode mathematical bold block. */
    function toUnicodeBold(text) {
        return Array.from(text).map(function (ch) {
            var code = ch.codePointAt(0);
            if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D400 + code - 65);
            if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D41A + code - 97);
            if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7CE + code - 48);
            return ch;
        }).join('');
    }

    /* ============================================================
       NATO phonetic
       ============================================================ */
    define({
        id: 'nato-phonetic-converter',
        name: 'NATO Phonetic Alphabet Converter',
        category: 'text',
        icon: 'radio',
        description: 'Spell text using the NATO phonetic alphabet — Alpha, Bravo, Charlie.',
        tags: ['nato', 'phonetic', 'alphabet', 'spelling', 'alpha bravo charlie', 'radio', 'call'],
        input: 'text',
        live: true,
        placeholder: 'AB-1234',
        options: [
            {
                id: 'direction', type: 'radio', label: 'Direction', value: 'to-phonetic',
                options: [{ value: 'to-phonetic', label: 'Text → phonetic' }, { value: 'from-phonetic', label: 'Phonetic → text' }]
            },
            {
                id: 'separator', type: 'select', label: 'Separate with', value: 'space',
                options: [
                    { value: 'space', label: 'Space' }, { value: 'dash', label: 'Dash' },
                    { value: 'newline', label: 'New line' }, { value: 'comma', label: 'Comma' }
                ],
                when: function (o) { return o.direction === 'to-phonetic'; }
            },
            { id: 'spell-digits', type: 'checkbox', label: 'Spell out digits too', value: true },
            { id: 'uppercase', type: 'checkbox', label: 'Uppercase output', value: false }
        ],
        run: function (ctx) {
            var NATO = {
                a: 'Alpha', b: 'Bravo', c: 'Charlie', d: 'Delta', e: 'Echo', f: 'Foxtrot', g: 'Golf',
                h: 'Hotel', i: 'India', j: 'Juliett', k: 'Kilo', l: 'Lima', m: 'Mike', n: 'November',
                o: 'Oscar', p: 'Papa', q: 'Quebec', r: 'Romeo', s: 'Sierra', t: 'Tango', u: 'Uniform',
                v: 'Victor', w: 'Whiskey', x: 'X-ray', y: 'Yankee', z: 'Zulu'
            };
            var DIGITS = {
                '0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four',
                '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine'
            };
            var PUNCTUATION = { '-': 'Dash', '.': 'Stop', ' ': '(space)', '/': 'Slash', '@': 'At' };

            var o = ctx.opt;
            var text = String(ctx.text || '');
            if (!text) return ZT.textResult('');

            if (o.direction === 'from-phonetic') {
                var reverse = {};
                Object.keys(NATO).forEach(function (k) { reverse[NATO[k].toLowerCase()] = k; });
                Object.keys(DIGITS).forEach(function (k) { reverse[DIGITS[k].toLowerCase()] = k; });

                var decoded = text.split(/[\s,\-\n]+/).filter(Boolean).map(function (word) {
                    var key = word.toLowerCase().replace(/[^a-z-]/g, '');
                    return reverse[key] !== undefined ? reverse[key] : '';
                }).join('');

                return ZT.textResult(o.uppercase ? decoded.toUpperCase() : decoded);
            }

            var separators = { space: ' ', dash: ' - ', newline: '\n', comma: ', ' };
            var out = Array.from(text).map(function (ch) {
                var lower = ch.toLowerCase();
                if (NATO[lower]) return NATO[lower];
                if (o.spellDigits && DIGITS[ch]) return DIGITS[ch];
                if (PUNCTUATION[ch]) return PUNCTUATION[ch];
                return ch;
            }).filter(function (v) { return v.trim(); }).join(separators[o.separator]);

            if (o.uppercase) out = out.toUpperCase();

            return [
                ZT.textResult(out),
                ZT.dataResult(Array.from(text).slice(0, 40).map(function (ch) {
                    var lower = ch.toLowerCase();
                    return { label: ch, value: NATO[lower] || DIGITS[ch] || PUNCTUATION[ch] || ch };
                }), { title: 'Letter by letter', columns: 3, mono: true })
            ];
        }
    });


    /* ============================================================
       Emoji search
       ============================================================ */
    define({
        id: 'emoji-search',
        name: 'Emoji Search & Copy',
        category: 'text',
        icon: 'smile',
        description: 'Find an emoji by name or feeling and copy it with one click.',
        tags: ['emoji', 'copy paste', 'search', 'smiley', 'symbols', 'unicode', 'icons'],
        input: 'text',
        live: true,
        placeholder: 'Search: happy, fire, rocket, heart, food…',
        options: [
            {
                id: 'category', type: 'select', label: 'Category', value: 'all',
                options: [
                    { value: 'all', label: 'All' }, { value: 'faces', label: 'Faces & emotion' },
                    { value: 'people', label: 'People & gestures' }, { value: 'nature', label: 'Animals & nature' },
                    { value: 'food', label: 'Food & drink' }, { value: 'travel', label: 'Travel & places' },
                    { value: 'objects', label: 'Objects' }, { value: 'symbols', label: 'Symbols' }
                ]
            },
            { id: 'show-codes', type: 'checkbox', label: 'Show the Unicode code point', value: false }
        ],
        run: function (ctx) {
            var EMOJI = [
                ['😀', 'grinning face happy smile', 'faces'], ['😃', 'smiley happy joy', 'faces'],
                ['😄', 'smile happy laugh', 'faces'], ['😁', 'grin beaming happy', 'faces'],
                ['😆', 'laughing satisfied happy', 'faces'], ['😅', 'sweat smile relief nervous', 'faces'],
                ['🤣', 'rofl rolling laughing lol', 'faces'], ['😂', 'joy tears laughing crying lol', 'faces'],
                ['🙂', 'slight smile happy', 'faces'], ['😉', 'wink flirt', 'faces'],
                ['😊', 'blush smile shy happy', 'faces'], ['😍', 'heart eyes love adore', 'faces'],
                ['🥰', 'smiling hearts love affection', 'faces'], ['😘', 'kiss blowing love', 'faces'],
                ['😎', 'sunglasses cool', 'faces'], ['🤩', 'star struck excited amazed', 'faces'],
                ['🥳', 'partying celebrate party birthday', 'faces'], ['😏', 'smirk smug', 'faces'],
                ['😐', 'neutral face blank', 'faces'], ['😑', 'expressionless annoyed', 'faces'],
                ['🙄', 'eye roll annoyed exasperated', 'faces'], ['😴', 'sleeping tired sleep zzz', 'faces'],
                ['🤔', 'thinking hmm consider', 'faces'], ['🤨', 'raised eyebrow skeptical suspicious', 'faces'],
                ['😬', 'grimace awkward nervous', 'faces'], ['😱', 'scream shocked fear', 'faces'],
                ['😢', 'cry sad tear', 'faces'], ['😭', 'sob crying loudly sad', 'faces'],
                ['😤', 'triumph frustrated steam angry', 'faces'], ['😡', 'angry rage mad', 'faces'],
                ['🤯', 'mind blown exploding head shocked', 'faces'], ['😳', 'flushed embarrassed surprised', 'faces'],
                ['🥺', 'pleading puppy eyes begging', 'faces'], ['😇', 'innocent halo angel', 'faces'],
                ['🤗', 'hug hugging friendly', 'faces'], ['🤫', 'shush quiet secret', 'faces'],
                ['🫠', 'melting overwhelmed', 'faces'], ['💀', 'skull dead dying laughing', 'faces'],

                ['👍', 'thumbs up approve yes good like', 'people'], ['👎', 'thumbs down disapprove no bad', 'people'],
                ['👏', 'clap applause bravo', 'people'], ['🙏', 'pray thanks please folded hands', 'people'],
                ['🤝', 'handshake deal agreement', 'people'], ['👋', 'wave hello goodbye hi', 'people'],
                ['✌️', 'peace victory', 'people'], ['🤞', 'fingers crossed luck hope', 'people'],
                ['👌', 'ok perfect good', 'people'], ['💪', 'muscle strong flex', 'people'],
                ['🫶', 'heart hands love', 'people'], ['🤷', 'shrug dunno whatever', 'people'],
                ['🤦', 'facepalm frustrated disbelief', 'people'], ['👀', 'eyes looking watching', 'people'],
                ['🧠', 'brain smart mind', 'people'], ['👶', 'baby infant', 'people'],

                ['🔥', 'fire hot lit flame trending', 'nature'], ['⭐', 'star favourite', 'nature'],
                ['🌟', 'glowing star sparkle', 'nature'], ['✨', 'sparkles magic shine new', 'nature'],
                ['⚡', 'lightning bolt fast power energy', 'nature'], ['🌈', 'rainbow pride colourful', 'nature'],
                ['☀️', 'sun sunny bright', 'nature'], ['🌙', 'moon night crescent', 'nature'],
                ['☁️', 'cloud cloudy weather', 'nature'], ['🌧️', 'rain raining weather', 'nature'],
                ['❄️', 'snowflake cold winter snow', 'nature'], ['🌊', 'wave ocean sea water', 'nature'],
                ['🌱', 'seedling plant growth new', 'nature'], ['🌳', 'tree nature forest', 'nature'],
                ['🌸', 'blossom flower spring cherry', 'nature'], ['🍀', 'four leaf clover luck', 'nature'],
                ['🐶', 'dog puppy pet', 'nature'], ['🐱', 'cat kitten pet', 'nature'],
                ['🦊', 'fox', 'nature'], ['🐻', 'bear', 'nature'], ['🐼', 'panda', 'nature'],
                ['🦁', 'lion', 'nature'], ['🐧', 'penguin', 'nature'], ['🦄', 'unicorn magic', 'nature'],
                ['🐝', 'bee honey', 'nature'], ['🦋', 'butterfly', 'nature'],

                ['🍕', 'pizza food italian', 'food'], ['🍔', 'burger hamburger food', 'food'],
                ['🍟', 'fries chips food', 'food'], ['🌮', 'taco mexican food', 'food'],
                ['🍣', 'sushi japanese food', 'food'], ['🍜', 'noodles ramen soup', 'food'],
                ['🍎', 'apple fruit', 'food'], ['🍌', 'banana fruit', 'food'],
                ['🍓', 'strawberry fruit', 'food'], ['🥑', 'avocado', 'food'],
                ['🍰', 'cake dessert slice', 'food'], ['🎂', 'birthday cake celebration', 'food'],
                ['🍪', 'cookie biscuit', 'food'], ['🍫', 'chocolate', 'food'],
                ['☕', 'coffee tea hot drink', 'food'], ['🍺', 'beer drink pub', 'food'],
                ['🍷', 'wine drink', 'food'], ['🥂', 'cheers celebrate toast', 'food'],
                ['🧋', 'bubble tea boba', 'food'], ['🍿', 'popcorn cinema film', 'food'],

                ['🚀', 'rocket launch space fast startup', 'travel'], ['✈️', 'plane flight travel', 'travel'],
                ['🚗', 'car drive vehicle', 'travel'], ['🚲', 'bicycle bike cycling', 'travel'],
                ['🏠', 'house home', 'travel'], ['🏢', 'office building work', 'travel'],
                ['🌍', 'earth globe world europe africa', 'travel'], ['🗺️', 'map world', 'travel'],
                ['🏖️', 'beach holiday vacation', 'travel'], ['⛰️', 'mountain hiking', 'travel'],
                ['🎢', 'rollercoaster theme park', 'travel'], ['🚦', 'traffic light signal', 'travel'],

                ['💻', 'laptop computer work code', 'objects'], ['🖥️', 'desktop computer monitor', 'objects'],
                ['📱', 'phone mobile smartphone', 'objects'], ['⌨️', 'keyboard typing', 'objects'],
                ['🖱️', 'mouse computer', 'objects'], ['🔒', 'lock locked secure private', 'objects'],
                ['🔓', 'unlock open unlocked', 'objects'], ['🔑', 'key password access', 'objects'],
                ['📁', 'folder directory files', 'objects'], ['📄', 'document page file', 'objects'],
                ['📊', 'chart graph analytics data', 'objects'], ['📈', 'chart increasing growth up', 'objects'],
                ['📉', 'chart decreasing loss down', 'objects'], ['📌', 'pin pinned important', 'objects'],
                ['📎', 'paperclip attachment', 'objects'], ['✏️', 'pencil write edit', 'objects'],
                ['📝', 'memo note writing', 'objects'], ['🔍', 'search magnifying glass find', 'objects'],
                ['💡', 'idea lightbulb tip', 'objects'], ['🔔', 'bell notification alert', 'objects'],
                ['🎁', 'gift present', 'objects'], ['💰', 'money bag cash', 'objects'],
                ['💳', 'credit card payment', 'objects'], ['⚙️', 'gear settings config', 'objects'],
                ['🔧', 'wrench tool fix', 'objects'], ['🧰', 'toolbox tools', 'objects'],
                ['🎧', 'headphones music audio', 'objects'], ['📷', 'camera photo', 'objects'],
                ['🎬', 'clapper film movie video', 'objects'], ['🕐', 'clock time hour', 'objects'],
                ['⏰', 'alarm clock time wake', 'objects'], ['🏆', 'trophy win award first', 'objects'],
                ['🎯', 'target dart goal bullseye', 'objects'], ['🧪', 'test tube science experiment', 'objects'],

                ['❤️', 'red heart love', 'symbols'], ['💙', 'blue heart', 'symbols'],
                ['💚', 'green heart', 'symbols'], ['💜', 'purple heart', 'symbols'],
                ['🖤', 'black heart', 'symbols'], ['🧡', 'orange heart', 'symbols'],
                ['💔', 'broken heart sad breakup', 'symbols'], ['💯', 'hundred perfect score full', 'symbols'],
                ['✅', 'check tick done complete yes', 'symbols'], ['❌', 'cross x no wrong error', 'symbols'],
                ['⚠️', 'warning caution alert', 'symbols'], ['❓', 'question mark', 'symbols'],
                ['❗', 'exclamation important', 'symbols'], ['➕', 'plus add', 'symbols'],
                ['➖', 'minus subtract', 'symbols'], ['♻️', 'recycle sustainable', 'symbols'],
                ['🔁', 'repeat loop', 'symbols'], ['🔀', 'shuffle random', 'symbols'],
                ['▶️', 'play start', 'symbols'], ['⏸️', 'pause', 'symbols'],
                ['🆕', 'new', 'symbols'], ['🆓', 'free', 'symbols'],
                ['💤', 'sleep zzz tired', 'symbols'], ['🎉', 'party popper celebrate congrats', 'symbols'],
                ['🎊', 'confetti celebrate', 'symbols'], ['🏳️‍🌈', 'pride rainbow flag lgbtq', 'symbols']
            ];

            var query = String(ctx.text || '').trim().toLowerCase();
            var matches = EMOJI.filter(function (e) {
                if (ctx.opt.category !== 'all' && e[2] !== ctx.opt.category) return false;
                if (!query) return true;
                return e[1].indexOf(query) !== -1;
            });

            if (!matches.length) {
                return ZT.dataResult([{ label: 'No match', value: 'Nothing found for "' + query + '". Try a feeling, an object or a category.' }], { title: 'Emoji search' });
            }

            var grid = ZT.el('div', { class: 'zt-emoji-grid' });
            matches.forEach(function (e) {
                grid.appendChild(ZT.el('button', {
                    class: 'zt-emoji', type: 'button',
                    title: e[1] + ' — click to copy',
                    'data-copy': e[0]
                }, [
                    ZT.el('span', { class: 'zt-emoji__char', text: e[0] }),
                    ctx.opt.showCodes
                        ? ZT.el('span', { class: 'zt-emoji__code', text: 'U+' + e[0].codePointAt(0).toString(16).toUpperCase() })
                        : null
                ].filter(Boolean)));
            });

            return [
                ZT.nodeResult(grid, { title: matches.length + ' emoji — click any to copy' }),
                ZT.textResult(matches.map(function (e) { return e[0]; }).join(' '), { title: 'All of them together' })
            ];
        }
    });

})();
