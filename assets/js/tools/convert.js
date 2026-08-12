/**
 * ZyncTools — Converters
 * Encodings, number bases, character sets and colour formats.
 */
(function () {
    'use strict';

    var ZT = window.ZT;
    var define = ZT.registry.define;

    /* ============================================================
       Base64
       ============================================================ */
    define({
        id: 'base64-encoder',
        name: 'Base64 Encoder / Decoder',
        category: 'convert',
        icon: 'binary',
        description: 'Encode text to Base64 or decode it back, with URL-safe support.',
        tags: ['base64', 'encode', 'decode', 'btoa', 'atob'],
        input: 'text',
        live: true,
        popular: true,
        placeholder: 'Hello, world!',
        options: [
            {
                id: 'direction', type: 'radio', label: 'Direction', value: 'encode',
                options: [{ value: 'encode', label: 'Text → Base64' }, { value: 'decode', label: 'Base64 → Text' }]
            },
            { id: 'url-safe', type: 'checkbox', label: 'URL-safe alphabet ( - and _ instead of + and / )', value: false },
            { id: 'no-padding', type: 'checkbox', label: 'Strip = padding', value: false, when: function (o) { return o.direction === 'encode'; } },
            { id: 'wrap', type: 'number', label: 'Wrap lines at', suffix: 'chars', value: 0, min: 0, max: 200, when: function (o) { return o.direction === 'encode'; }, help: '0 keeps it on one line. MIME uses 76.' }
        ],
        run: function (ctx) {
            var text = ctx.text || '';
            if (!text) return ZT.textResult('');

            if (ctx.opt.direction === 'encode') {
                var out = ZT.utf8ToBase64(text);
                if (ctx.opt.urlSafe) out = out.replace(/\+/g, '-').replace(/\//g, '_');
                if (ctx.opt.noPadding || ctx.opt.urlSafe) out = out.replace(/=+$/, '');
                if (ctx.opt.wrap > 0) {
                    out = out.replace(new RegExp('.{1,' + ctx.opt.wrap + '}', 'g'), '$&\n').trim();
                }
                return ZT.textResult(out, { note: text.length + ' chars → ' + out.replace(/\n/g, '').length + ' base64 chars' });
            }

            var b64 = text.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
            while (b64.length % 4) b64 += '=';
            try {
                return ZT.textResult(ZT.base64ToUtf8(b64));
            } catch (e) {
                ZT.fail('That is not valid Base64. Check for stray characters or a truncated string.');
            }
        }
    });

    define({
        id: 'base64-image-encoder',
        name: 'Image to Base64 / Data URI',
        category: 'convert',
        icon: 'file-image',
        description: 'Turn an image into a Base64 data URI for CSS, HTML or JSON.',
        tags: ['base64', 'data uri', 'image', 'inline', 'embed'],
        input: 'file',
        accept: 'image/*',
        options: [
            {
                id: 'format', type: 'select', label: 'Output as', value: 'datauri',
                options: [
                    { value: 'datauri', label: 'Data URI' },
                    { value: 'raw', label: 'Raw Base64 only' },
                    { value: 'css', label: 'CSS background-image rule' },
                    { value: 'html', label: 'HTML <img> tag' },
                    { value: 'markdown', label: 'Markdown image' }
                ]
            },
            { id: 'wrap', type: 'number', label: 'Wrap lines at', suffix: 'chars', value: 0, min: 0, max: 200, help: '0 keeps it on one line.' }
        ],
        run: async function (ctx) {
            var file = ctx.files[0];
            if (file.size > 8 * 1024 * 1024) {
                ZT.fail('That image is ' + ZT.formatBytes(file.size) + '. Base64 inflates files by about a third, so keep it under 8 MB.');
            }
            var dataUri = await ZT.readAsDataURL(file);
            var raw = dataUri.split(',')[1] || '';

            var out;
            switch (ctx.opt.format) {
                case 'raw': out = raw; break;
                case 'css': out = 'background-image: url("' + dataUri + '");'; break;
                case 'html': out = '<img src="' + dataUri + '" alt="' + ZT.esc(ZT.stem(file.name)) + '">'; break;
                case 'markdown': out = '![' + ZT.stem(file.name) + '](' + dataUri + ')'; break;
                default: out = dataUri;
            }
            if (ctx.opt.wrap > 0) {
                out = out.replace(new RegExp('.{1,' + ctx.opt.wrap + '}', 'g'), '$&\n').trim();
            }

            return ZT.textResult(out, {
                note: ZT.formatBytes(file.size) + ' file → ' + ZT.formatBytes(out.length) + ' of text',
                lang: ctx.opt.format === 'css' ? 'css' : ctx.opt.format === 'html' ? 'html' : 'text'
            });
        }
    });

    /* ============================================================
       URL encoding
       ============================================================ */
    define({
        id: 'url-encoder',
        name: 'URL Encoder / Decoder',
        category: 'convert',
        icon: 'link',
        description: 'Percent-encode text for URLs, or decode an encoded string.',
        tags: ['url', 'encode', 'decode', 'percent', 'uri', 'escape'],
        input: 'text',
        live: true,
        popular: true,
        placeholder: 'hello world & more',
        options: [
            {
                id: 'direction', type: 'radio', label: 'Direction', value: 'encode',
                options: [{ value: 'encode', label: 'Encode' }, { value: 'decode', label: 'Decode' }]
            },
            {
                id: 'scope', type: 'select', label: 'Encode', value: 'component',
                options: [
                    { value: 'component', label: 'A single value (encodeURIComponent)' },
                    { value: 'full', label: 'A whole URL (encodeURI)' }
                ],
                when: function (o) { return o.direction === 'encode'; },
                help: 'Use the value option for query parameters — it escapes & = ? and / too.'
            },
            { id: 'plus-for-space', type: 'checkbox', label: 'Use + for spaces (form encoding)', value: false }
        ],
        run: function (ctx) {
            var text = ctx.text || '';
            if (!text) return ZT.textResult('');

            if (ctx.opt.direction === 'encode') {
                var out = ctx.opt.scope === 'full' ? encodeURI(text) : encodeURIComponent(text);
                if (ctx.opt.plusForSpace) out = out.replace(/%20/g, '+');
                return ZT.textResult(out);
            }

            var input = ctx.opt.plusForSpace ? text.replace(/\+/g, ' ') : text;
            try {
                return ZT.textResult(decodeURIComponent(input));
            } catch (e) {
                ZT.fail('That string contains an invalid percent-escape sequence.');
            }
        }
    });

    /* ============================================================
       HTML entities
       ============================================================ */
    define({
        id: 'html-entity-encoder',
        name: 'HTML Entity Encoder / Decoder',
        category: 'convert',
        icon: 'code',
        description: 'Escape HTML special characters, or turn entities back into text.',
        tags: ['html', 'entities', 'escape', 'encode', 'decode', 'amp'],
        input: 'text',
        live: true,
        placeholder: '<p class="hi">Tom & Jerry</p>',
        options: [
            {
                id: 'direction', type: 'radio', label: 'Direction', value: 'encode',
                options: [{ value: 'encode', label: 'Encode' }, { value: 'decode', label: 'Decode' }]
            },
            {
                id: 'scope', type: 'select', label: 'Encode which characters', value: 'minimal',
                options: [
                    { value: 'minimal', label: 'Only & < > " \' (safe default)' },
                    { value: 'non-ascii', label: 'Also every non-ASCII character' }
                ],
                when: function (o) { return o.direction === 'encode'; }
            },
            { id: 'numeric', type: 'checkbox', label: 'Use numeric entities (&#60;) instead of named (&lt;)', value: false, when: function (o) { return o.direction === 'encode'; } }
        ],
        run: function (ctx) {
            var text = ctx.text || '';
            if (!text) return ZT.textResult('');

            if (ctx.opt.direction === 'decode') {
                // The parser handles every named entity without shipping a table.
                var ta = document.createElement('textarea');
                ta.innerHTML = text;
                return ZT.textResult(ta.value);
            }

            var NAMED = { '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": 'apos' };
            var out = text.replace(/[&<>"']/g, function (c) {
                return ctx.opt.numeric ? '&#' + c.charCodeAt(0) + ';' : '&' + NAMED[c] + ';';
            });
            if (ctx.opt.scope === 'non-ascii') {
                out = out.replace(/[\u0080-\uFFFF]/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; });
            }
            return ZT.textResult(out, { lang: 'html' });
        }
    });

    /* ============================================================
       Number bases
       ============================================================ */
    define({
        id: 'number-base-converter',
        name: 'Number Base Converter',
        category: 'convert',
        icon: 'binary',
        description: 'Convert numbers between binary, octal, decimal, hex and any base up to 36.',
        tags: ['binary', 'hex', 'octal', 'decimal', 'base', 'radix', 'convert'],
        input: 'text',
        live: true,
        popular: true,
        placeholder: '255',
        options: [
            {
                id: 'from-base', type: 'select', label: 'Input base', value: '10',
                options: [
                    { value: '2', label: 'Binary (2)' }, { value: '8', label: 'Octal (8)' },
                    { value: '10', label: 'Decimal (10)' }, { value: '16', label: 'Hexadecimal (16)' },
                    { value: 'custom', label: 'Custom base…' }
                ]
            },
            { id: 'custom-from', type: 'number', label: 'Custom input base', value: 32, min: 2, max: 36, when: function (o) { return o.fromBase === 'custom'; } },
            { id: 'uppercase', type: 'checkbox', label: 'Uppercase letters in output', value: true },
            { id: 'group-binary', type: 'checkbox', label: 'Group binary digits in fours', value: true },
            { id: 'per-line', type: 'checkbox', label: 'Convert one number per line', value: false }
        ],
        run: function (ctx) {
            var fromBase = ctx.opt.fromBase === 'custom' ? ctx.opt.customFrom : parseInt(ctx.opt.fromBase, 10);

            function convertOne(raw) {
                var cleaned = String(raw).trim().replace(/[\s_,]/g, '')
                    .replace(/^0x/i, '').replace(/^0b/i, '').replace(/^0o/i, '');
                if (!cleaned) return null;

                var value = parseInt(cleaned, fromBase);
                if (isNaN(value)) {
                    ZT.fail('"' + raw.trim() + '" is not a valid base-' + fromBase + ' number.');
                }
                if (!Number.isSafeInteger(value)) {
                    ZT.fail('That number is too large to convert exactly (limit is 2^53).');
                }

                var bin = value.toString(2);
                if (ctx.opt.groupBinary && bin.length > 4) {
                    bin = bin.padStart(Math.ceil(bin.length / 4) * 4, '0').replace(/(.{4})(?=.)/g, '$1 ');
                }
                var hex = value.toString(16);
                var b36 = value.toString(36);
                if (ctx.opt.uppercase) { hex = hex.toUpperCase(); b36 = b36.toUpperCase(); }

                return { value: value, bin: bin, oct: value.toString(8), hex: hex, b36: b36 };
            }

            var inputs = ctx.opt.perLine
                ? String(ctx.text || '').split(/\r?\n/).filter(function (l) { return l.trim(); })
                : [ctx.text || ''];

            if (!inputs.length || !String(inputs[0]).trim()) {
                return ZT.textResult('', { note: 'Enter a number to convert.' });
            }

            if (ctx.opt.perLine) {
                var out = inputs.map(function (line) {
                    var r = convertOne(line);
                    return r ? [r.value, r.bin.replace(/ /g, ''), r.oct, r.hex].join('\t') : '';
                }).filter(Boolean);
                return ZT.textResult('dec\tbin\toct\thex\n' + out.join('\n'), { mono: true });
            }

            var res = convertOne(inputs[0]);
            if (!res) return ZT.textResult('', { note: 'Enter a number to convert.' });

            return ZT.dataResult([
                { label: 'Decimal (10)', value: String(res.value) },
                { label: 'Binary (2)', value: res.bin },
                { label: 'Octal (8)', value: res.oct },
                { label: 'Hexadecimal (16)', value: res.hex },
                { label: 'Base 36', value: res.b36 },
                { label: 'Bytes', value: ZT.formatBytes(res.value) },
                { label: 'Bit length', value: res.value.toString(2).length + ' bits' }
            ], { title: 'Conversions', columns: 2, mono: true });
        }
    });

    define({
        id: 'text-binary-converter',
        name: 'Text ⇄ Binary / Hex',
        category: 'convert',
        icon: 'file-digit',
        description: 'Convert text to binary, hexadecimal or decimal byte values, and back.',
        tags: ['binary', 'hex', 'text', 'ascii', 'bytes', 'convert'],
        input: 'text',
        live: true,
        placeholder: 'Hello',
        options: [
            {
                id: 'direction', type: 'radio', label: 'Direction', value: 'encode',
                options: [{ value: 'encode', label: 'Text → codes' }, { value: 'decode', label: 'Codes → text' }]
            },
            {
                id: 'base', type: 'select', label: 'Number format', value: 'binary',
                options: [
                    { value: 'binary', label: 'Binary (8 bits per byte)' },
                    { value: 'hex', label: 'Hexadecimal' },
                    { value: 'decimal', label: 'Decimal' }
                ]
            },
            { id: 'separator', type: 'text', label: 'Separator', value: ' ', when: function (o) { return o.direction === 'encode'; } },
            { id: 'uppercase', type: 'checkbox', label: 'Uppercase hex', value: true, when: function (o) { return o.direction === 'encode' && o.base === 'hex'; } }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var text = ctx.text || '';
            if (!text) return ZT.textResult('');

            var radix = o.base === 'binary' ? 2 : o.base === 'hex' ? 16 : 10;
            var width = o.base === 'binary' ? 8 : o.base === 'hex' ? 2 : 0;

            if (o.direction === 'encode') {
                // Encode UTF-8 bytes so non-Latin text round-trips correctly.
                var bytes = new TextEncoder().encode(text);
                var parts = Array.from(bytes).map(function (b) {
                    var s = b.toString(radix);
                    if (width) s = s.padStart(width, '0');
                    return o.uppercase && radix === 16 ? s.toUpperCase() : s;
                });
                return ZT.textResult(parts.join(o.separator), { mono: true, note: bytes.length + ' bytes' });
            }

            var tokens = text.trim().split(/[\s,]+/).filter(Boolean);
            var values = tokens.map(function (t) {
                var clean = t.replace(/^0x/i, '').replace(/^0b/i, '');
                var v = parseInt(clean, radix);
                if (isNaN(v) || v < 0 || v > 255) {
                    ZT.fail('"' + t + '" is not a valid ' + o.base + ' byte value (0–255).');
                }
                return v;
            });
            try {
                return ZT.textResult(new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(values)));
            } catch (e) {
                ZT.fail('Those bytes are not valid UTF-8 text.');
            }
        }
    });

    /* ============================================================
       Colour
       ------------------------------------------------------------
       The colour maths lives in zt-core.js as ZT.color, because five
       modules need it and only one of them loads on any given page.
       ============================================================ */

    define({
        id: 'color-converter',
        name: 'Colour Converter',
        category: 'convert',
        icon: 'palette',
        description: 'Convert a colour between HEX, RGB, HSL, CMYK and named values.',
        tags: ['color', 'colour', 'hex', 'rgb', 'hsl', 'cmyk', 'convert'],
        input: 'text',
        live: true,
        popular: true,
        placeholder: '#3B82F6   or   rgb(59,130,246)   or   dodgerblue',
        options: [
            { id: 'picker', type: 'color', label: 'Or pick a colour', value: '#3B82F6', help: 'Picking here replaces whatever is in the text box.' },
            { id: 'use-picker', type: 'checkbox', label: 'Use the picker instead of the text input', value: false },
            { id: 'show-shades', type: 'checkbox', label: 'Show tints and shades', value: true }
        ],
        run: function (ctx) {
            var source = ctx.opt.usePicker ? ctx.opt.picker : (ctx.text || ctx.opt.picker);
            var rgba = ZT.color.parse(source);
            if (!rgba) ZT.fail('"' + String(source).trim() + '" is not a colour I recognise. Try #RRGGBB, rgb(), hsl() or a CSS colour name.');

            var r = Math.round(rgba[0]), g = Math.round(rgba[1]), b = Math.round(rgba[2]), a = rgba[3];
            var hsl = ZT.color.rgbToHsl(r, g, b);
            var cmyk = ZT.color.rgbToCmyk(r, g, b);
            var hex = ZT.color.toHex(r, g, b);
            var lum = ZT.color.luminance(r, g, b);

            var swatch = ZT.el('div', { class: 'zt-color-preview' }, [
                ZT.el('div', { class: 'zt-color-chip', style: { background: 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')' } }),
                ZT.el('div', { class: 'zt-color-meta' }, [
                    ZT.el('strong', { text: hex.toUpperCase() }),
                    ZT.el('span', { text: lum > 0.45 ? 'Light colour — use dark text' : 'Dark colour — use light text' })
                ])
            ]);

            var rows = [
                { label: 'HEX', value: hex.toUpperCase() },
                { label: 'HEX + alpha', value: hex.toUpperCase() + ('0' + Math.round(a * 255).toString(16)).slice(-2).toUpperCase() },
                { label: 'RGB', value: 'rgb(' + r + ', ' + g + ', ' + b + ')' },
                { label: 'RGBA', value: 'rgba(' + r + ', ' + g + ', ' + b + ', ' + (+a.toFixed(2)) + ')' },
                { label: 'HSL', value: 'hsl(' + hsl[0] + ', ' + hsl[1] + '%, ' + hsl[2] + '%)' },
                { label: 'CMYK', value: 'cmyk(' + cmyk.join('%, ') + '%)' },
                { label: 'Relative luminance', value: lum.toFixed(4) },
                { label: 'Contrast vs white', value: ((1.05) / (lum + 0.05)).toFixed(2) + ':1' },
                { label: 'Contrast vs black', value: ((lum + 0.05) / 0.05).toFixed(2) + ':1' }
            ];

            var results = [
                ZT.nodeResult(swatch, { title: 'Preview' }),
                ZT.dataResult(rows, { title: 'Formats', columns: 2, mono: true })
            ];

            if (ctx.opt.showShades) {
                var strip = ZT.el('div', { class: 'zt-swatch-row' });
                for (var i = 9; i >= 1; i--) {
                    var l = i * 10;
                    var shade = ZT.color.hslToRgb(hsl[0], hsl[1], l);
                    var shadeHex = ZT.color.toHex(shade[0], shade[1], shade[2]);
                    strip.appendChild(ZT.el('button', {
                        class: 'zt-swatch',
                        style: { background: shadeHex },
                        title: shadeHex + ' — click to copy',
                        'data-copy': shadeHex,
                        type: 'button'
                    }, ZT.el('span', { text: String(l) + '%' })));
                }
                results.push(ZT.nodeResult(strip, { title: 'Lightness scale' }));
            }

            return results;
        }
    });

    define({
        id: 'contrast-checker',
        name: 'Colour Contrast Checker',
        category: 'convert',
        icon: 'contrast',
        description: 'Check text and background contrast against WCAG AA and AAA levels.',
        tags: ['contrast', 'accessibility', 'wcag', 'a11y', 'color'],
        input: 'none',
        options: [
            { id: 'foreground', type: 'color', label: 'Text colour', value: '#1F2937' },
            { id: 'background', type: 'color', label: 'Background colour', value: '#FFFFFF' },
            { id: 'font-size', type: 'number', label: 'Font size', suffix: 'px', value: 16, min: 8, max: 96 },
            { id: 'bold', type: 'checkbox', label: 'Bold text', value: false }
        ],
        run: function (ctx) {
            var fg = ZT.color.parse(ctx.opt.foreground);
            var bg = ZT.color.parse(ctx.opt.background);
            if (!fg || !bg) ZT.fail('Both colours must be valid.');

            var l1 = ZT.color.luminance(fg[0], fg[1], fg[2]);
            var l2 = ZT.color.luminance(bg[0], bg[1], bg[2]);
            var ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

            // WCAG treats 18.66px bold or 24px regular as "large text".
            var isLarge = ctx.opt.fontSize >= 24 || (ctx.opt.bold && ctx.opt.fontSize >= 18.66);
            var aaThreshold = isLarge ? 3 : 4.5;
            var aaaThreshold = isLarge ? 4.5 : 7;

            var preview = ZT.el('div', {
                class: 'zt-contrast-preview',
                style: {
                    background: ctx.opt.background, color: ctx.opt.foreground,
                    fontSize: ctx.opt.fontSize + 'px', fontWeight: ctx.opt.bold ? '700' : '400'
                }
            }, [
                ZT.el('p', { text: 'The quick brown fox jumps over the lazy dog.' }),
                ZT.el('p', { text: 'Pack my box with five dozen liquor jugs.' })
            ]);

            function verdict(pass) { return pass ? 'PASS' : 'FAIL'; }

            return [
                ZT.nodeResult(preview, { title: 'Preview' }),
                ZT.dataResult([
                    { label: 'Contrast ratio', value: ratio.toFixed(2) + ':1' },
                    { label: 'Text size classed as', value: isLarge ? 'Large' : 'Normal' },
                    { label: 'WCAG AA  (needs ' + aaThreshold + ':1)', value: verdict(ratio >= aaThreshold) },
                    { label: 'WCAG AAA  (needs ' + aaaThreshold + ':1)', value: verdict(ratio >= aaaThreshold) },
                    { label: 'AA for UI components (3:1)', value: verdict(ratio >= 3) }
                ], { title: 'Results', columns: 2 })
            ];
        }
    });

})();
