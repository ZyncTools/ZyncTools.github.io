/**
 * ZyncTools — Code & data tools
 * Formatting, minifying and converting between structured data formats.
 */
(function () {
    'use strict';

    var ZT = window.ZT;
    var define = ZT.registry.define;

    ZT.CDN.terser = 'https://cdn.jsdelivr.net/npm/terser@5.27.0/dist/bundle.min.js';
    ZT.libs.terser = function () { return ZT.requireLib(function () { return window.Terser; }, ZT.CDN.terser); };

    var INDENT_OPTION = {
        id: 'indent', type: 'select', label: 'Indentation', value: '2',
        options: [
            { value: '2', label: '2 spaces' },
            { value: '4', label: '4 spaces' },
            { value: 'tab', label: 'Tab' }
        ]
    };

    function indentString(value) {
        return value === 'tab' ? '\t' : ' '.repeat(parseInt(value, 10) || 2);
    }

    /** Parse JSON, turning the browser's terse error into something actionable. */
    function parseJson(text) {
        var trimmed = String(text || '').trim();
        if (!trimmed) ZT.fail('Paste some JSON to work with.');
        try {
            return JSON.parse(trimmed);
        } catch (err) {
            var m = String(err.message).match(/position (\d+)/);
            if (m) {
                var pos = parseInt(m[1], 10);
                var upTo = trimmed.slice(0, pos);
                var line = upTo.split('\n').length;
                var col = pos - upTo.lastIndexOf('\n');
                ZT.fail('Invalid JSON at line ' + line + ', column ' + col + ' — ' + err.message.replace(/ in JSON at position \d+/, '') + '.');
            }
            ZT.fail('Invalid JSON: ' + err.message);
        }
    }

    /* ============================================================
       JSON
       ============================================================ */
    define({
        id: 'json-formatter',
        name: 'JSON Formatter & Validator',
        category: 'code',
        icon: 'braces',
        description: 'Pretty-print, validate and minify JSON with clear error positions.',
        tags: ['json', 'format', 'beautify', 'validate', 'pretty print'],
        input: 'text',
        live: true,
        popular: true,
        placeholder: '{"name":"ZyncTools","tools":[1,2,3]}',
        options: [
            {
                id: 'mode', type: 'radio', label: 'Output', value: 'pretty',
                options: [{ value: 'pretty', label: 'Pretty-printed' }, { value: 'minified', label: 'Minified' }]
            },
            Object.assign({}, INDENT_OPTION, { when: function (o) { return o.mode === 'pretty'; } }),
            { id: 'sort-keys', type: 'checkbox', label: 'Sort object keys alphabetically', value: false },
            { id: 'escape-unicode', type: 'checkbox', label: 'Escape non-ASCII characters', value: false }
        ],
        run: function (ctx) {
            var data = parseJson(ctx.text);

            if (ctx.opt.sortKeys) data = sortDeep(data);

            var out = ctx.opt.mode === 'minified'
                ? JSON.stringify(data)
                : JSON.stringify(data, null, indentString(ctx.opt.indent));

            if (ctx.opt.escapeUnicode) {
                out = out.replace(/[\u0080-\uFFFF]/g, function (c) {
                    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
                });
            }

            var original = String(ctx.text).length;
            return ZT.textResult(out, {
                lang: 'json',
                note: 'Valid JSON · ' + ZT.formatBytes(original) + ' → ' + ZT.formatBytes(out.length) +
                    (ctx.opt.mode === 'minified' && original > 0
                        ? ' (' + Math.max(0, Math.round((1 - out.length / original) * 100)) + '% smaller)' : '')
            });
        }
    });

    function sortDeep(value) {
        if (Array.isArray(value)) return value.map(sortDeep);
        if (value && typeof value === 'object') {
            return Object.keys(value).sort().reduce(function (acc, k) {
                acc[k] = sortDeep(value[k]);
                return acc;
            }, {});
        }
        return value;
    }

    define({
        id: 'json-path-finder',
        name: 'JSON Path Finder',
        category: 'code',
        icon: 'search-code',
        description: 'List every path in a JSON document, or query it with a dot path.',
        tags: ['json', 'path', 'jsonpath', 'query', 'explore'],
        input: 'text',
        live: true,
        placeholder: '{"user":{"name":"Ada","roles":["admin","dev"]}}',
        options: [
            { id: 'query', type: 'text', label: 'Dot path to look up', value: '', placeholder: 'user.roles.0  (leave empty to list all paths)' },
            { id: 'max-paths', type: 'number', label: 'Max paths to list', value: 200, min: 10, max: 5000 },
            { id: 'leaves-only', type: 'checkbox', label: 'Only show leaf values', value: true }
        ],
        run: function (ctx) {
            var data = parseJson(ctx.text);

            if (ctx.opt.query.trim()) {
                var parts = ctx.opt.query.trim().replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
                var cur = data;
                for (var i = 0; i < parts.length; i++) {
                    if (cur === null || cur === undefined) ZT.fail('Path stops existing at "' + parts.slice(0, i).join('.') + '".');
                    cur = cur[parts[i]];
                }
                if (cur === undefined) ZT.fail('No value found at "' + ctx.opt.query.trim() + '".');
                return ZT.textResult(JSON.stringify(cur, null, 2), { lang: 'json', title: 'Value at ' + ctx.opt.query.trim() });
            }

            var rows = [];
            (function walk(node, path) {
                if (rows.length >= ctx.opt.maxPaths) return;
                var isLeaf = node === null || typeof node !== 'object';
                if (path && (isLeaf || !ctx.opt.leavesOnly)) {
                    rows.push({
                        label: path,
                        value: isLeaf ? JSON.stringify(node) : (Array.isArray(node) ? 'array[' + node.length + ']' : 'object{' + Object.keys(node).length + '}')
                    });
                }
                if (isLeaf) return;
                Object.keys(node).forEach(function (k) {
                    walk(node[k], path ? path + '.' + k : k);
                });
            })(data, '');

            return ZT.dataResult(rows, { title: rows.length + ' paths', columns: 2, mono: true });
        }
    });

    /* ============================================================
       YAML
       ============================================================ */
    define({
        id: 'yaml-json-converter',
        name: 'YAML ⇄ JSON Converter',
        category: 'code',
        icon: 'file-json',
        description: 'Convert YAML to JSON and back, in either direction.',
        tags: ['yaml', 'json', 'convert', 'yml'],
        input: 'text',
        live: true,
        popular: true,
        placeholder: 'name: ZyncTools\ntools:\n  - merge\n  - split',
        options: [
            {
                id: 'direction', type: 'radio', label: 'Direction', value: 'yaml-to-json',
                options: [{ value: 'yaml-to-json', label: 'YAML → JSON' }, { value: 'json-to-yaml', label: 'JSON → YAML' }]
            },
            Object.assign({}, INDENT_OPTION, { when: function (o) { return o.direction === 'yaml-to-json'; } }),
            { id: 'yaml-indent', type: 'number', label: 'YAML indent', value: 2, min: 1, max: 8, when: function (o) { return o.direction === 'json-to-yaml'; } },
            { id: 'sort-keys', type: 'checkbox', label: 'Sort keys alphabetically', value: false },
            { id: 'line-width', type: 'number', label: 'Wrap long lines at', suffix: 'chars', value: 0, min: 0, max: 400, when: function (o) { return o.direction === 'json-to-yaml'; }, help: '0 disables wrapping.' }
        ],
        run: async function (ctx) {
            var yaml = await ZT.libs.yaml();
            var text = String(ctx.text || '').trim();
            if (!text) ZT.fail('Paste some ' + (ctx.opt.direction === 'yaml-to-json' ? 'YAML' : 'JSON') + ' to convert.');

            if (ctx.opt.direction === 'yaml-to-json') {
                var data;
                try {
                    data = yaml.load(text);
                } catch (err) {
                    ZT.fail('Invalid YAML: ' + (err.reason || err.message));
                }
                if (ctx.opt.sortKeys) data = sortDeep(data);
                return ZT.textResult(JSON.stringify(data, null, indentString(ctx.opt.indent)), { lang: 'json' });
            }

            var parsed = parseJson(text);
            if (ctx.opt.sortKeys) parsed = sortDeep(parsed);
            try {
                return ZT.textResult(yaml.dump(parsed, {
                    indent: ctx.opt.yamlIndent,
                    lineWidth: ctx.opt.lineWidth > 0 ? ctx.opt.lineWidth : -1,
                    noRefs: true
                }), { lang: 'yaml' });
            } catch (err) {
                ZT.fail('Could not convert to YAML: ' + err.message);
            }
        }
    });

    /* ============================================================
       XML
       ============================================================ */
    function parseXml(text) {
        var doc = new DOMParser().parseFromString(String(text || '').trim(), 'application/xml');
        var err = doc.querySelector('parsererror');
        if (err) {
            ZT.fail('Invalid XML: ' + err.textContent.replace(/\s+/g, ' ').trim().slice(0, 200));
        }
        return doc;
    }

    define({
        id: 'xml-formatter',
        name: 'XML Formatter',
        category: 'code',
        icon: 'file-code-2',
        description: 'Pretty-print, validate or minify XML documents.',
        tags: ['xml', 'format', 'beautify', 'validate', 'minify'],
        input: 'text',
        live: true,
        placeholder: '<root><item id="1">Hello</item></root>',
        options: [
            {
                id: 'mode', type: 'radio', label: 'Output', value: 'pretty',
                options: [{ value: 'pretty', label: 'Pretty-printed' }, { value: 'minified', label: 'Minified' }]
            },
            Object.assign({}, INDENT_OPTION, { when: function (o) { return o.mode === 'pretty'; } }),
            { id: 'keep-declaration', type: 'checkbox', label: 'Keep the <?xml …?> declaration', value: true }
        ],
        run: function (ctx) {
            var doc = parseXml(ctx.text);
            var pad = indentString(ctx.opt.indent);

            function serialize(node, depth) {
                var out = [];
                Array.prototype.forEach.call(node.childNodes, function (child) {
                    if (child.nodeType === 3) {
                        var t = child.nodeValue.trim();
                        if (t) out.push(pad.repeat(depth) + t);
                    } else if (child.nodeType === 8) {
                        out.push(pad.repeat(depth) + '<!--' + child.nodeValue + '-->');
                    } else if (child.nodeType === 1) {
                        var attrs = Array.prototype.map.call(child.attributes, function (a) {
                            return ' ' + a.name + '="' + ZT.esc(a.value) + '"';
                        }).join('');
                        var hasElementChildren = Array.prototype.some.call(child.childNodes, function (c) {
                            return c.nodeType === 1 || c.nodeType === 8;
                        });
                        var textContent = child.textContent.trim();

                        if (!child.childNodes.length) {
                            out.push(pad.repeat(depth) + '<' + child.nodeName + attrs + '/>');
                        } else if (!hasElementChildren) {
                            out.push(pad.repeat(depth) + '<' + child.nodeName + attrs + '>' + ZT.esc(textContent) + '</' + child.nodeName + '>');
                        } else {
                            out.push(pad.repeat(depth) + '<' + child.nodeName + attrs + '>');
                            out.push(serialize(child, depth + 1));
                            out.push(pad.repeat(depth) + '</' + child.nodeName + '>');
                        }
                    }
                });
                return out.filter(Boolean).join('\n');
            }

            var body;
            if (ctx.opt.mode === 'minified') {
                body = new XMLSerializer().serializeToString(doc)
                    .replace(/>\s+</g, '><')
                    .replace(/\s{2,}/g, ' ')
                    .trim();
                return ZT.textResult(body, { lang: 'xml' });
            }

            body = serialize(doc, 0);
            if (ctx.opt.keepDeclaration && /^\s*<\?xml/.test(ctx.text)) {
                body = '<?xml version="1.0" encoding="UTF-8"?>\n' + body;
            }
            return ZT.textResult(body, { lang: 'xml', note: 'Valid XML' });
        }
    });

    define({
        id: 'xml-json-converter',
        name: 'XML ⇄ JSON Converter',
        category: 'code',
        icon: 'arrow-left-right',
        description: 'Convert XML into JSON and JSON back into XML.',
        tags: ['xml', 'json', 'convert'],
        input: 'text',
        live: true,
        placeholder: '<user><name>Ada</name><role>admin</role></user>',
        options: [
            {
                id: 'direction', type: 'radio', label: 'Direction', value: 'xml-to-json',
                options: [{ value: 'xml-to-json', label: 'XML → JSON' }, { value: 'json-to-xml', label: 'JSON → XML' }]
            },
            { id: 'attr-prefix', type: 'text', label: 'Attribute prefix', value: '@', when: function (o) { return o.direction === 'xml-to-json'; }, help: 'Attributes become keys with this prefix so they never clash with child elements.' },
            { id: 'text-key', type: 'text', label: 'Text content key', value: '#text', when: function (o) { return o.direction === 'xml-to-json'; } },
            { id: 'root-name', type: 'text', label: 'Root element name', value: 'root', when: function (o) { return o.direction === 'json-to-xml'; } },
            Object.assign({}, INDENT_OPTION)
        ],
        run: function (ctx) {
            var pad = indentString(ctx.opt.indent);

            if (ctx.opt.direction === 'xml-to-json') {
                var doc = parseXml(ctx.text);

                function toObj(node) {
                    var obj = {};
                    Array.prototype.forEach.call(node.attributes || [], function (a) {
                        obj[ctx.opt.attrPrefix + a.name] = a.value;
                    });

                    var children = Array.prototype.filter.call(node.childNodes, function (c) { return c.nodeType === 1; });
                    var text = Array.prototype.filter.call(node.childNodes, function (c) { return c.nodeType === 3; })
                        .map(function (c) { return c.nodeValue; }).join('').trim();

                    if (!children.length) {
                        // Element with only text and no attributes collapses to a plain string.
                        if (!Object.keys(obj).length) return text;
                        if (text) obj[ctx.opt.textKey] = text;
                        return obj;
                    }

                    children.forEach(function (child) {
                        var value = toObj(child);
                        if (obj[child.nodeName] === undefined) obj[child.nodeName] = value;
                        else if (Array.isArray(obj[child.nodeName])) obj[child.nodeName].push(value);
                        else obj[child.nodeName] = [obj[child.nodeName], value];
                    });
                    if (text) obj[ctx.opt.textKey] = text;
                    return obj;
                }

                var root = doc.documentElement;
                var result = {};
                result[root.nodeName] = toObj(root);
                return ZT.textResult(JSON.stringify(result, null, pad), { lang: 'json' });
            }

            var data = parseJson(ctx.text);

            function toXml(value, name, depth) {
                var ind = pad.repeat(depth);
                if (Array.isArray(value)) {
                    return value.map(function (v) { return toXml(v, name, depth); }).join('\n');
                }
                if (value === null || value === undefined) return ind + '<' + name + '/>';
                if (typeof value !== 'object') return ind + '<' + name + '>' + ZT.esc(String(value)) + '</' + name + '>';

                var attrs = '', children = [];
                Object.keys(value).forEach(function (k) {
                    if (k.charAt(0) === '@') attrs += ' ' + k.slice(1) + '="' + ZT.esc(String(value[k])) + '"';
                    else if (k === '#text') children.push(pad.repeat(depth + 1) + ZT.esc(String(value[k])));
                    else children.push(toXml(value[k], k, depth + 1));
                });
                if (!children.length) return ind + '<' + name + attrs + '/>';
                return ind + '<' + name + attrs + '>\n' + children.join('\n') + '\n' + ind + '</' + name + '>';
            }

            var keys = Object.keys(data);
            var xml = (keys.length === 1 && typeof data[keys[0]] === 'object')
                ? toXml(data[keys[0]], keys[0], 0)
                : toXml(data, ctx.opt.rootName, 0);

            return ZT.textResult('<?xml version="1.0" encoding="UTF-8"?>\n' + xml, { lang: 'xml' });
        }
    });

    /* ============================================================
       CSV
       ============================================================ */

    /** RFC 4180 CSV parser — handles quoted fields, embedded commas and newlines. */
    function parseCsv(text, delimiter) {
        var rows = [], row = [], field = '', inQuotes = false;
        var s = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        for (var i = 0; i < s.length; i++) {
            var c = s[i];
            if (inQuotes) {
                if (c === '"') {
                    if (s[i + 1] === '"') { field += '"'; i++; }
                    else inQuotes = false;
                } else field += c;
            } else if (c === '"') {
                inQuotes = true;
            } else if (c === delimiter) {
                row.push(field); field = '';
            } else if (c === '\n') {
                row.push(field); rows.push(row); row = []; field = '';
            } else {
                field += c;
            }
        }
        if (field.length || row.length) { row.push(field); rows.push(row); }
        return rows.filter(function (r) { return r.length > 1 || (r[0] || '').trim(); });
    }

    function toCsvField(value, delimiter) {
        var s = value === null || value === undefined ? '' : String(value);
        if (s.indexOf(delimiter) !== -1 || s.indexOf('"') !== -1 || /[\n\r]/.test(s)) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    }

    var DELIMITER_OPTION = {
        id: 'delimiter', type: 'select', label: 'Delimiter', value: ',',
        options: [
            { value: ',', label: 'Comma  ( , )' },
            { value: ';', label: 'Semicolon  ( ; )' },
            { value: '\t', label: 'Tab' },
            { value: '|', label: 'Pipe  ( | )' }
        ]
    };

    define({
        id: 'csv-json-converter',
        name: 'CSV ⇄ JSON Converter',
        category: 'code',
        icon: 'table',
        description: 'Convert CSV to JSON records and JSON arrays back to CSV.',
        tags: ['csv', 'json', 'convert', 'spreadsheet', 'excel'],
        input: 'text',
        live: true,
        popular: true,
        placeholder: 'name,role\nAda,admin\nGrace,dev',
        options: [
            {
                id: 'direction', type: 'radio', label: 'Direction', value: 'csv-to-json',
                options: [{ value: 'csv-to-json', label: 'CSV → JSON' }, { value: 'json-to-csv', label: 'JSON → CSV' }]
            },
            DELIMITER_OPTION,
            { id: 'has-header', type: 'checkbox', label: 'First row contains column names', value: true },
            { id: 'parse-numbers', type: 'checkbox', label: 'Convert numeric values to numbers', value: true, when: function (o) { return o.direction === 'csv-to-json'; } },
            { id: 'parse-booleans', type: 'checkbox', label: 'Convert true/false to booleans', value: false, when: function (o) { return o.direction === 'csv-to-json'; } },
            { id: 'trim-fields', type: 'checkbox', label: 'Trim whitespace around values', value: true },
            Object.assign({}, INDENT_OPTION, { when: function (o) { return o.direction === 'csv-to-json'; } })
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var delimiter = o.delimiter === '\\t' ? '\t' : o.delimiter;

            if (o.direction === 'csv-to-json') {
                var rows = parseCsv(ctx.text || '', delimiter);
                if (!rows.length) ZT.fail('No rows found. Paste some CSV first.');

                if (o.trimFields) rows = rows.map(function (r) { return r.map(function (f) { return f.trim(); }); });

                function coerce(v) {
                    if (o.parseNumbers && v !== '' && !isNaN(v) && /^-?\d*\.?\d+(e[+-]?\d+)?$/i.test(v)) return Number(v);
                    if (o.parseBooleans && /^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
                    return v;
                }

                var out;
                if (o.hasHeader) {
                    var header = rows[0];
                    out = rows.slice(1).map(function (r) {
                        var obj = {};
                        header.forEach(function (key, i) { obj[key || 'column' + (i + 1)] = coerce(r[i] === undefined ? '' : r[i]); });
                        return obj;
                    });
                } else {
                    out = rows.map(function (r) { return r.map(coerce); });
                }

                return ZT.textResult(JSON.stringify(out, null, indentString(o.indent)), {
                    lang: 'json',
                    note: out.length + ' records' + (o.hasHeader ? ' · ' + rows[0].length + ' columns' : '')
                });
            }

            var data = parseJson(ctx.text);
            if (!Array.isArray(data)) {
                // A single object is still a perfectly reasonable one-row export.
                if (data && typeof data === 'object') data = [data];
                else ZT.fail('JSON must be an array of objects (or a single object) to become CSV.');
            }
            if (!data.length) ZT.fail('That JSON array is empty.');

            var isObjects = data[0] && typeof data[0] === 'object' && !Array.isArray(data[0]);
            var linesOut = [];

            if (isObjects) {
                var columns = [];
                data.forEach(function (row) {
                    Object.keys(row || {}).forEach(function (k) { if (columns.indexOf(k) === -1) columns.push(k); });
                });
                if (o.hasHeader) linesOut.push(columns.map(function (c) { return toCsvField(c, delimiter); }).join(delimiter));
                data.forEach(function (row) {
                    linesOut.push(columns.map(function (c) {
                        var v = row ? row[c] : '';
                        if (v && typeof v === 'object') v = JSON.stringify(v);
                        return toCsvField(v, delimiter);
                    }).join(delimiter));
                });
            } else {
                data.forEach(function (row) {
                    linesOut.push((Array.isArray(row) ? row : [row]).map(function (v) { return toCsvField(v, delimiter); }).join(delimiter));
                });
            }

            return ZT.textResult(linesOut.join('\n'), { lang: 'csv', note: data.length + ' rows' });
        }
    });

    define({
        id: 'csv-formatter',
        name: 'CSV Formatter & Viewer',
        category: 'code',
        icon: 'table-2',
        description: 'Clean up CSV, change delimiters and preview it as a table.',
        tags: ['csv', 'table', 'tsv', 'delimiter', 'align'],
        input: 'text',
        live: true,
        placeholder: 'name,role,city\nAda,admin,London\nGrace,dev,New York',
        options: [
            Object.assign({}, DELIMITER_OPTION, { label: 'Input delimiter' }),
            {
                id: 'output-delimiter', type: 'select', label: 'Output delimiter', value: ',',
                options: [
                    { value: ',', label: 'Comma  ( , )' },
                    { value: ';', label: 'Semicolon  ( ; )' },
                    { value: '\t', label: 'Tab' },
                    { value: '|', label: 'Pipe  ( | )' },
                    { value: 'align', label: 'Aligned columns (for reading)' },
                    { value: 'markdown', label: 'Markdown table' }
                ]
            },
            { id: 'has-header', type: 'checkbox', label: 'First row is a header', value: true },
            { id: 'trim-fields', type: 'checkbox', label: 'Trim whitespace around values', value: true },
            { id: 'drop-empty-rows', type: 'checkbox', label: 'Drop completely empty rows', value: true },
            { id: 'show-table', type: 'checkbox', label: 'Show a table preview', value: true }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var inDelim = o.delimiter === '\\t' ? '\t' : o.delimiter;
            var rows = parseCsv(ctx.text || '', inDelim);
            if (!rows.length) ZT.fail('No rows found. Paste some CSV first.');

            if (o.trimFields) rows = rows.map(function (r) { return r.map(function (f) { return f.trim(); }); });
            if (o.dropEmptyRows) rows = rows.filter(function (r) { return r.some(function (f) { return f !== ''; }); });

            var width = rows.reduce(function (max, r) { return Math.max(max, r.length); }, 0);
            rows = rows.map(function (r) {
                var copy = r.slice();
                while (copy.length < width) copy.push('');
                return copy;
            });

            var out;
            if (o.outputDelimiter === 'align') {
                var widths = [];
                for (var c = 0; c < width; c++) {
                    widths[c] = rows.reduce(function (m, r) { return Math.max(m, (r[c] || '').length); }, 0);
                }
                out = rows.map(function (r) {
                    return r.map(function (f, i) { return (f || '').padEnd(widths[i]); }).join('  ').replace(/\s+$/, '');
                }).join('\n');
            } else if (o.outputDelimiter === 'markdown') {
                var header = o.hasHeader ? rows[0] : rows[0].map(function (_, i) { return 'Column ' + (i + 1); });
                var body = o.hasHeader ? rows.slice(1) : rows;
                out = '| ' + header.join(' | ') + ' |\n' +
                    '| ' + header.map(function () { return '---'; }).join(' | ') + ' |\n' +
                    body.map(function (r) { return '| ' + r.map(function (f) { return String(f).replace(/\|/g, '\\|'); }).join(' | ') + ' |'; }).join('\n');
            } else {
                var outDelim = o.outputDelimiter === '\\t' ? '\t' : o.outputDelimiter;
                out = rows.map(function (r) {
                    return r.map(function (f) { return toCsvField(f, outDelim); }).join(outDelim);
                }).join('\n');
            }

            var results = [ZT.textResult(out, { lang: 'csv', note: rows.length + ' rows × ' + width + ' columns' })];

            if (o.showTable) {
                var table = ZT.el('table', { class: 'zt-table' });
                var start = 0;
                if (o.hasHeader) {
                    var thead = ZT.el('thead');
                    var htr = ZT.el('tr');
                    rows[0].forEach(function (f) { htr.appendChild(ZT.el('th', { text: f })); });
                    thead.appendChild(htr);
                    table.appendChild(thead);
                    start = 1;
                }
                var tbody = ZT.el('tbody');
                rows.slice(start, start + 500).forEach(function (r) {
                    var tr = ZT.el('tr');
                    r.forEach(function (f) { tr.appendChild(ZT.el('td', { text: f })); });
                    tbody.appendChild(tr);
                });
                table.appendChild(tbody);
                var scroller = ZT.el('div', { class: 'zt-table-scroll' }, table);
                results.push(ZT.nodeResult(scroller, {
                    title: 'Preview' + (rows.length - start > 500 ? ' (first 500 rows)' : '')
                }));
            }

            return results;
        }
    });

    /* ============================================================
       SQL
       ============================================================ */
    define({
        id: 'sql-formatter',
        name: 'SQL Formatter',
        category: 'code',
        icon: 'database',
        description: 'Format SQL queries with consistent keyword casing and indentation.',
        tags: ['sql', 'format', 'beautify', 'query', 'database'],
        input: 'text',
        live: true,
        placeholder: 'select id, name from users where active = 1 order by name',
        options: [
            {
                id: 'keyword-case', type: 'select', label: 'Keyword case', value: 'upper',
                options: [{ value: 'upper', label: 'UPPERCASE' }, { value: 'lower', label: 'lowercase' }, { value: 'keep', label: 'Leave as written' }]
            },
            Object.assign({}, INDENT_OPTION),
            { id: 'comma-first', type: 'checkbox', label: 'Put commas at the start of lines', value: false },
            { id: 'one-column-per-line', type: 'checkbox', label: 'One selected column per line', value: true }
        ],
        run: function (ctx) {
            var sql = String(ctx.text || '').trim();
            if (!sql) ZT.fail('Paste a SQL query to format.');

            var MAJOR = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET',
                'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE',
                'DROP TABLE', 'UNION ALL', 'UNION', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN',
                'CROSS JOIN', 'JOIN', 'ON', 'AND', 'OR'];
            var KEYWORDS = MAJOR.concat(['AS', 'ASC', 'DESC', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
                'NOT', 'NULL', 'IS', 'IN', 'LIKE', 'BETWEEN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'EXISTS']);

            var pad = indentString(ctx.opt.indent);

            // Protect string literals so keyword casing never rewrites data.
            var literals = [];
            sql = sql.replace(/'([^']|'')*'/g, function (m) {
                literals.push(m);
                return '\u0001' + (literals.length - 1) + '\u0001';
            });

            sql = sql.replace(/\s+/g, ' ');

            if (ctx.opt.keywordCase !== 'keep') {
                KEYWORDS.forEach(function (kw) {
                    var re = new RegExp('\\b' + kw.replace(/ /g, '\\s+') + '\\b', 'gi');
                    sql = sql.replace(re, ctx.opt.keywordCase === 'upper' ? kw : kw.toLowerCase());
                });
            }

            MAJOR.forEach(function (kw) {
                var target = ctx.opt.keywordCase === 'lower' ? kw.toLowerCase() : kw;
                var re = new RegExp('\\s*\\b' + target.replace(/ /g, '\\s+') + '\\b\\s*', 'g');
                // AND/OR nest one level under the clause they belong to.
                var prefix = (kw === 'AND' || kw === 'OR' || kw === 'ON') ? '\n' + pad : '\n';
                sql = sql.replace(re, prefix + target + ' ');
            });

            if (ctx.opt.oneColumnPerLine) {
                sql = sql.replace(/,\s*/g, ctx.opt.commaFirst ? '\n' + pad + ', ' : ',\n' + pad);
            }

            sql = sql.split('\n').map(function (l) { return l.replace(/\s+$/, ''); })
                .filter(function (l) { return l.trim(); }).join('\n').trim();

            sql = sql.replace(/\u0001(\d+)\u0001/g, function (_, i) { return literals[+i]; });

            if (!/;$/.test(sql)) sql += ';';
            return ZT.textResult(sql, { lang: 'sql' });
        }
    });

    /* ============================================================
       Minifiers
       ============================================================ */
    define({
        id: 'css-minifier',
        name: 'CSS Minifier & Beautifier',
        category: 'code',
        icon: 'file-code',
        description: 'Shrink CSS for production or expand it back for editing.',
        tags: ['css', 'minify', 'compress', 'beautify', 'stylesheet'],
        input: 'text',
        live: true,
        popular: true,
        placeholder: '.card {\n  color: red;\n  padding: 8px;\n}',
        options: [
            {
                id: 'mode', type: 'radio', label: 'Action', value: 'minify',
                options: [{ value: 'minify', label: 'Minify' }, { value: 'beautify', label: 'Beautify' }]
            },
            { id: 'strip-comments', type: 'checkbox', label: 'Remove comments', value: true },
            { id: 'keep-important-comments', type: 'checkbox', label: 'Keep /*! licence comments', value: true, when: function (o) { return o.stripComments; } },
            { id: 'shorten-hex', type: 'checkbox', label: 'Shorten hex colours (#ffffff → #fff)', value: true, when: function (o) { return o.mode === 'minify'; } },
            { id: 'strip-zero-units', type: 'checkbox', label: 'Drop units from zero values (0px → 0)', value: true, when: function (o) { return o.mode === 'minify'; } },
            Object.assign({}, INDENT_OPTION, { when: function (o) { return o.mode === 'beautify'; } })
        ],
        run: function (ctx) {
            var css = String(ctx.text || '');
            if (!css.trim()) ZT.fail('Paste some CSS to process.');
            var original = css.length;

            // Protect strings and url() so nothing inside them gets rewritten.
            var literals = [];
            css = css.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|url\([^)]*\)/g, function (m) {
                literals.push(m);
                return '\u0001' + (literals.length - 1) + '\u0001';
            });

            if (ctx.opt.stripComments) {
                css = css.replace(/\/\*[\s\S]*?\*\//g, function (m) {
                    return (ctx.opt.keepImportantComments && m.charAt(2) === '!') ? m : '';
                });
            }

            var out;
            if (ctx.opt.mode === 'minify') {
                out = css
                    .replace(/\s+/g, ' ')
                    .replace(/\s*([{}:;,>~+])\s*/g, '$1')
                    .replace(/;}/g, '}')
                    .replace(/\s*!\s*important/gi, '!important')
                    .trim();
                if (ctx.opt.shortenHex) {
                    out = out.replace(/#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3\b/gi, '#$1$2$3');
                }
                if (ctx.opt.stripZeroUnits) {
                    out = out.replace(/\b0(px|em|rem|%|vh|vw|pt|cm|mm|in|ex|ch|vmin|vmax)\b/gi, '0')
                             .replace(/(^|[\s:,(])0\.(\d)/g, '$1.$2');
                }
            } else {
                var pad = indentString(ctx.opt.indent);
                var depth = 0;
                out = css
                    .replace(/\s+/g, ' ')
                    .replace(/\s*([{};])\s*/g, '$1')
                    .replace(/([{};])/g, function (m) {
                        if (m === '{') { depth++; return ' {\n' + pad.repeat(depth); }
                        if (m === '}') { depth = Math.max(0, depth - 1); return '\n' + pad.repeat(depth) + '}\n' + pad.repeat(depth); }
                        return ';\n' + pad.repeat(depth);
                    })
                    .replace(/\s*:\s*/g, ': ')
                    .replace(/,(?![^(]*\))\s*/g, ',\n' + pad.repeat(Math.max(0, depth)))
                    .split('\n').map(function (l) { return l.replace(/\s+$/, ''); })
                    .filter(function (l, i, arr) { return l.trim() || (arr[i - 1] || '').trim(); })
                    .join('\n').trim();
            }

            out = out.replace(/\u0001(\d+)\u0001/g, function (_, i) { return literals[+i]; });

            var note = ZT.formatBytes(original) + ' → ' + ZT.formatBytes(out.length);
            if (ctx.opt.mode === 'minify' && original) {
                note += ' (' + Math.max(0, Math.round((1 - out.length / original) * 100)) + '% smaller)';
            }
            return ZT.textResult(out, { lang: 'css', note: note });
        }
    });

    define({
        id: 'js-minifier',
        name: 'JavaScript Minifier',
        category: 'code',
        icon: 'file-terminal',
        description: 'Minify JavaScript with Terser, including optional name mangling.',
        tags: ['javascript', 'js', 'minify', 'compress', 'terser', 'uglify'],
        input: 'text',
        live: false,
        placeholder: 'function greet(name) {\n  console.log("Hello, " + name);\n}',
        options: [
            { id: 'mangle', type: 'checkbox', label: 'Shorten local variable names', value: true },
            { id: 'compress', type: 'checkbox', label: 'Apply compression passes', value: true },
            { id: 'drop-console', type: 'checkbox', label: 'Remove console.* calls', value: false, when: function (o) { return o.compress; } },
            { id: 'drop-debugger', type: 'checkbox', label: 'Remove debugger statements', value: true, when: function (o) { return o.compress; } },
            { id: 'keep-classnames', type: 'checkbox', label: 'Keep class names', value: false, when: function (o) { return o.mangle; } },
            { id: 'ecma', type: 'select', label: 'Output syntax', value: '2020',
              options: [{ value: '5', label: 'ES5 (widest support)' }, { value: '2015', label: 'ES2015' }, { value: '2020', label: 'ES2020' }] }
        ],
        run: async function (ctx) {
            var code = String(ctx.text || '');
            if (!code.trim()) ZT.fail('Paste some JavaScript to minify.');

            var Terser = await ZT.libs.terser();
            var result;
            try {
                result = await Terser.minify(code, {
                    ecma: parseInt(ctx.opt.ecma, 10),
                    mangle: ctx.opt.mangle ? { keep_classnames: ctx.opt.keepClassnames } : false,
                    compress: ctx.opt.compress ? {
                        drop_console: ctx.opt.dropConsole,
                        drop_debugger: ctx.opt.dropDebugger
                    } : false,
                    format: { comments: false }
                });
            } catch (err) {
                ZT.fail('Could not parse that JavaScript: ' + (err.message || err));
            }
            if (result.error) ZT.fail('Could not parse that JavaScript: ' + result.error.message);

            var out = result.code || '';
            return ZT.textResult(out, {
                lang: 'javascript',
                note: ZT.formatBytes(code.length) + ' → ' + ZT.formatBytes(out.length) +
                    ' (' + Math.max(0, Math.round((1 - out.length / code.length) * 100)) + '% smaller)'
            });
        }
    });

    define({
        id: 'html-minifier',
        name: 'HTML Minifier',
        category: 'code',
        icon: 'code-2',
        description: 'Strip comments and needless whitespace from HTML markup.',
        tags: ['html', 'minify', 'compress', 'markup'],
        input: 'text',
        live: true,
        placeholder: '<div class="card">\n  <!-- note -->\n  <p>Hello</p>\n</div>',
        options: [
            { id: 'strip-comments', type: 'checkbox', label: 'Remove comments', value: true },
            { id: 'keep-conditional', type: 'checkbox', label: 'Keep conditional comments', value: true, when: function (o) { return o.stripComments; } },
            { id: 'collapse-whitespace', type: 'checkbox', label: 'Collapse whitespace between tags', value: true },
            { id: 'remove-quotes', type: 'checkbox', label: 'Remove quotes from simple attributes', value: false, help: 'Safe for values without spaces or special characters.' },
            { id: 'minify-inline-css', type: 'checkbox', label: 'Minify inline <style> blocks', value: true }
        ],
        run: function (ctx) {
            var html = String(ctx.text || '');
            if (!html.trim()) ZT.fail('Paste some HTML to minify.');
            var original = html.length;

            // <pre>, <textarea> and <script> content is whitespace-sensitive.
            var protectedBlocks = [];
            html = html.replace(/<(pre|textarea|script)\b[^>]*>[\s\S]*?<\/\1>/gi, function (m) {
                protectedBlocks.push(m);
                return '\u0001' + (protectedBlocks.length - 1) + '\u0001';
            });

            if (ctx.opt.stripComments) {
                html = html.replace(/<!--[\s\S]*?-->/g, function (m) {
                    return (ctx.opt.keepConditional && /^<!--\[if|<!--<!\[endif\]/.test(m)) ? m : '';
                });
            }
            if (ctx.opt.minifyInlineCss) {
                html = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, function (_, attrs, css) {
                    return '<style' + attrs + '>' +
                        css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')
                           .replace(/\s*([{}:;,])\s*/g, '$1').replace(/;}/g, '}').trim() +
                        '</style>';
                });
            }
            if (ctx.opt.collapseWhitespace) {
                html = html.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim();
            }
            if (ctx.opt.removeQuotes) {
                html = html.replace(/=["']([A-Za-z0-9\-_./:#]+)["']/g, '=$1');
            }

            html = html.replace(/\u0001(\d+)\u0001/g, function (_, i) { return protectedBlocks[+i]; });

            return ZT.textResult(html, {
                lang: 'html',
                note: ZT.formatBytes(original) + ' → ' + ZT.formatBytes(html.length) +
                    ' (' + Math.max(0, Math.round((1 - html.length / original) * 100)) + '% smaller)'
            });
        }
    });

    /* ============================================================
       Regex tester
       ============================================================ */
    define({
        id: 'regex-tester',
        name: 'Regex Tester',
        category: 'code',
        icon: 'regex',
        description: 'Test regular expressions live and inspect every match and capture group.',
        tags: ['regex', 'regexp', 'pattern', 'match', 'test'],
        input: 'text',
        live: true,
        popular: true,
        inputLabel: 'Test string',
        placeholder: 'The year 2024 and the year 2026.',
        options: [
            { id: 'pattern', type: 'text', label: 'Pattern', value: '\\d{4}', placeholder: 'e.g. \\d{4}', mono: true },
            { id: 'global', type: 'checkbox', label: 'Global  (g)', value: true },
            { id: 'ignore-case', type: 'checkbox', label: 'Ignore case  (i)', value: false },
            { id: 'multiline', type: 'checkbox', label: 'Multiline  (m)', value: false },
            { id: 'dotall', type: 'checkbox', label: 'Dot matches newline  (s)', value: false },
            { id: 'unicode', type: 'checkbox', label: 'Unicode  (u)', value: false },
            { id: 'replace-with', type: 'text', label: 'Replacement preview', value: '', placeholder: 'optional — use $1, $2 for groups' }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            if (!o.pattern) return ZT.textResult('', { note: 'Enter a pattern to start matching.' });

            var flags = (o.global ? 'g' : '') + (o.ignoreCase ? 'i' : '') + (o.multiline ? 'm' : '') +
                (o.dotall ? 's' : '') + (o.unicode ? 'u' : '');
            var re;
            try {
                re = new RegExp(o.pattern, flags);
            } catch (err) {
                ZT.fail('Invalid pattern: ' + err.message);
            }

            var text = ctx.text || '';
            var matches = [];
            if (o.global) {
                var m, guard = 0;
                while ((m = re.exec(text)) !== null && guard++ < 10000) {
                    matches.push(m);
                    if (m.index === re.lastIndex) re.lastIndex++; // avoid an infinite loop on empty matches
                }
            } else {
                var single = re.exec(text);
                if (single) matches.push(single);
            }

            // Highlighted view of the test string.
            var view = ZT.el('div', { class: 'zt-regex-view' });
            var cursor = 0;
            matches.forEach(function (match) {
                if (match.index > cursor) view.appendChild(document.createTextNode(text.slice(cursor, match.index)));
                view.appendChild(ZT.el('mark', { class: 'zt-regex-hit', text: match[0] }));
                cursor = match.index + (match[0].length || 1);
            });
            if (cursor < text.length) view.appendChild(document.createTextNode(text.slice(cursor)));

            var results = [
                ZT.dataResult([
                    { label: 'Matches', value: String(matches.length) },
                    { label: 'Pattern', value: '/' + o.pattern + '/' + flags }
                ], { title: 'Result', columns: 2 }),
                ZT.nodeResult(view, { title: 'Highlighted text' })
            ];

            if (matches.length) {
                var rows = [];
                matches.slice(0, 100).forEach(function (match, i) {
                    rows.push({ label: 'Match ' + (i + 1) + ' @ ' + match.index, value: match[0] });
                    for (var g = 1; g < match.length; g++) {
                        rows.push({ label: '  group ' + g, value: match[g] === undefined ? '(no match)' : match[g] });
                    }
                    if (match.groups) {
                        Object.keys(match.groups).forEach(function (name) {
                            rows.push({ label: '  ?<' + name + '>', value: match.groups[name] === undefined ? '(no match)' : match.groups[name] });
                        });
                    }
                });
                results.push(ZT.dataResult(rows, { title: 'Match details', columns: 2, mono: true }));
            }

            if (o.replaceWith) {
                results.push(ZT.textResult(text.replace(re, o.replaceWith), { title: 'After replacement' }));
            }

            return results;
        }
    });

    /* ============================================================
       JWT
       ============================================================ */
    define({
        id: 'jwt-decoder',
        name: 'JWT Decoder',
        category: 'code',
        icon: 'key-round',
        description: 'Decode a JSON Web Token and inspect its header, claims and expiry.',
        tags: ['jwt', 'token', 'decode', 'auth', 'bearer'],
        input: 'text',
        live: true,
        placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.signature',
        options: [
            { id: 'show-raw', type: 'checkbox', label: 'Show raw decoded JSON', value: true },
            { id: 'note', type: 'note', text: 'Decoding happens locally and does not verify the signature — never trust an unverified token for authorisation.' }
        ],
        run: function (ctx) {
            var token = String(ctx.text || '').trim().replace(/^Bearer\s+/i, '');
            if (!token) ZT.fail('Paste a JWT to decode.');

            var parts = token.split('.');
            if (parts.length < 2) ZT.fail('That is not a JWT — expected three dot-separated sections.');

            function decodePart(part, label) {
                try {
                    var b64 = part.replace(/-/g, '+').replace(/_/g, '/');
                    while (b64.length % 4) b64 += '=';
                    return JSON.parse(ZT.base64ToUtf8(b64));
                } catch (e) {
                    ZT.fail('Could not decode the ' + label + ' section — it is not valid base64url JSON.');
                }
            }

            var header = decodePart(parts[0], 'header');
            var payload = decodePart(parts[1], 'payload');

            var claims = [];
            var CLAIM_NAMES = {
                iss: 'Issuer', sub: 'Subject', aud: 'Audience', exp: 'Expires at',
                nbf: 'Not before', iat: 'Issued at', jti: 'Token ID'
            };
            Object.keys(payload).forEach(function (k) {
                var v = payload[k];
                var label = CLAIM_NAMES[k] ? CLAIM_NAMES[k] + ' (' + k + ')' : k;
                if (['exp', 'nbf', 'iat'].indexOf(k) !== -1 && typeof v === 'number') {
                    var d = new Date(v * 1000);
                    claims.push({ label: label, value: d.toLocaleString() + '  ·  ' + v });
                } else {
                    claims.push({ label: label, value: typeof v === 'object' ? JSON.stringify(v) : String(v) });
                }
            });

            var status;
            if (typeof payload.exp === 'number') {
                var msLeft = payload.exp * 1000 - Date.now();
                status = msLeft > 0
                    ? { label: 'Status', value: 'Valid — expires in ' + ZT.formatDuration(msLeft / 1000) }
                    : { label: 'Status', value: 'EXPIRED ' + ZT.formatDuration(-msLeft / 1000) + ' ago' };
            } else {
                status = { label: 'Status', value: 'No expiry claim' };
            }

            var results = [
                ZT.dataResult([
                    { label: 'Algorithm', value: header.alg || 'unknown' },
                    { label: 'Type', value: header.typ || 'unknown' },
                    status,
                    { label: 'Signature', value: parts[2] ? 'present (not verified)' : 'missing' }
                ], { title: 'Overview', columns: 2 }),
                ZT.dataResult(claims, { title: 'Claims', columns: 2, mono: true })
            ];

            if (ctx.opt.showRaw) {
                results.push(ZT.textResult(
                    '// Header\n' + JSON.stringify(header, null, 2) + '\n\n// Payload\n' + JSON.stringify(payload, null, 2),
                    { lang: 'json', title: 'Raw JSON' }
                ));
            }
            return results;
        }
    });

    /* ============================================================
       Cron
       ============================================================ */
    define({
        id: 'cron-expression-builder',
        name: 'Cron Expression Builder',
        category: 'code',
        icon: 'calendar-clock',
        description: 'Build a cron schedule from plain fields and read back what it means.',
        tags: ['cron', 'crontab', 'schedule', 'job', 'timer'],
        input: 'none',
        options: [
            {
                id: 'preset', type: 'select', label: 'Start from a preset', value: 'custom',
                options: [
                    { value: 'custom', label: 'Custom' },
                    { value: '* * * * *', label: 'Every minute' },
                    { value: '*/5 * * * *', label: 'Every 5 minutes' },
                    { value: '0 * * * *', label: 'Hourly, on the hour' },
                    { value: '0 0 * * *', label: 'Daily at midnight' },
                    { value: '0 9 * * 1-5', label: 'Weekdays at 09:00' },
                    { value: '0 0 * * 0', label: 'Weekly on Sunday' },
                    { value: '0 0 1 * *', label: 'Monthly on the 1st' },
                    { value: '0 0 1 1 *', label: 'Yearly on 1 January' }
                ]
            },
            { id: 'minute', type: 'text', label: 'Minute', value: '0', help: '0–59. Use * for every, */5 for steps, 1,15 for a list.', when: function (o) { return o.preset === 'custom'; } },
            { id: 'hour', type: 'text', label: 'Hour', value: '9', help: '0–23', when: function (o) { return o.preset === 'custom'; } },
            { id: 'day-of-month', type: 'text', label: 'Day of month', value: '*', help: '1–31', when: function (o) { return o.preset === 'custom'; } },
            { id: 'month', type: 'text', label: 'Month', value: '*', help: '1–12', when: function (o) { return o.preset === 'custom'; } },
            { id: 'day-of-week', type: 'text', label: 'Day of week', value: '*', help: '0–6, where 0 is Sunday', when: function (o) { return o.preset === 'custom'; } }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var expr = o.preset !== 'custom'
                ? o.preset
                : [o.minute, o.hour, o.dayOfMonth, o.month, o.dayOfWeek].map(function (f) { return String(f || '*').trim() || '*'; }).join(' ');

            var fields = expr.split(/\s+/);
            if (fields.length !== 5) ZT.fail('A cron expression needs exactly five fields.');

            var FIELD_RANGES = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];
            var FIELD_NAMES = ['minute', 'hour', 'day of month', 'month', 'day of week'];
            fields.forEach(function (f, i) {
                var valid = /^(\*|\d+|\d+-\d+|\*\/\d+|\d+(,\d+)*|\d+-\d+\/\d+)$/.test(f);
                if (!valid) ZT.fail('The ' + FIELD_NAMES[i] + ' field ("' + f + '") is not valid cron syntax.');
                var nums = f.match(/\d+/g) || [];
                nums.forEach(function (n) {
                    if (f.indexOf('/') !== -1 && f.split('/')[1] === n) return; // step value, not a field value
                    if (+n < FIELD_RANGES[i][0] || +n > FIELD_RANGES[i][1]) {
                        ZT.fail('The ' + FIELD_NAMES[i] + ' field must be between ' + FIELD_RANGES[i][0] + ' and ' + FIELD_RANGES[i][1] + '.');
                    }
                });
            });

            var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

            function describeField(value, singular, names) {
                if (value === '*') return 'every ' + singular;
                if (/^\*\/(\d+)$/.test(value)) return 'every ' + RegExp.$1 + ' ' + singular + 's';
                if (/^\d+-\d+$/.test(value)) {
                    var r = value.split('-');
                    return singular + ' ' + (names ? names[+r[0]] : r[0]) + ' through ' + (names ? names[+r[1]] : r[1]);
                }
                if (value.indexOf(',') !== -1) {
                    return singular + ' ' + value.split(',').map(function (v) { return names ? names[+v] : v; }).join(', ');
                }
                return singular + ' ' + (names ? names[+value] : value);
            }

            var description = 'Runs at ' + describeField(fields[0], 'minute') + ', ' + describeField(fields[1], 'hour') +
                ', on ' + describeField(fields[2], 'day') + ' of ' + describeField(fields[3], 'month', MONTHS) +
                ', on ' + describeField(fields[4], 'day', DAYS) + '.';

            return [
                ZT.textResult(expr, { mono: true, title: 'Cron expression' }),
                ZT.dataResult([
                    { label: 'Minute', value: fields[0] },
                    { label: 'Hour', value: fields[1] },
                    { label: 'Day of month', value: fields[2] },
                    { label: 'Month', value: fields[3] },
                    { label: 'Day of week', value: fields[4] },
                    { label: 'Meaning', value: description }
                ], { title: 'Breakdown', columns: 2 })
            ];
        }
    });


    /* ============================================================
       Batch: formatters and converters
       ============================================================ */

    ZT.CDN.beautify = 'https://cdn.jsdelivr.net/npm/js-beautify@1.15.1/js/lib/beautify.js';
    ZT.CDN.beautifyHtml = 'https://cdn.jsdelivr.net/npm/js-beautify@1.15.1/js/lib/beautify-html.js';
    ZT.CDN.beautifyCss = 'https://cdn.jsdelivr.net/npm/js-beautify@1.15.1/js/lib/beautify-css.js';

    async function loadBeautifier(kind) {
        // beautify-html depends on the core and CSS bundles being present.
        await ZT.requireLib(function () { return window.js_beautify; }, ZT.CDN.beautify);
        if (kind === 'html') {
            await ZT.requireLib(function () { return window.css_beautify; }, ZT.CDN.beautifyCss);
            await ZT.requireLib(function () { return window.html_beautify; }, ZT.CDN.beautifyHtml);
            return window.html_beautify;
        }
        if (kind === 'css') {
            await ZT.requireLib(function () { return window.css_beautify; }, ZT.CDN.beautifyCss);
            return window.css_beautify;
        }
        return window.js_beautify;
    }

    define({
        id: 'html-formatter',
        name: 'HTML Formatter & Beautifier',
        category: 'code',
        icon: 'code-2',
        description: 'Indent and tidy messy or minified HTML into readable markup.',
        tags: ['html', 'format', 'beautify', 'indent', 'pretty print', 'tidy'],
        input: 'text',
        popular: true,
        placeholder: '<div class="card"><h2>Title</h2><p>Some text</p></div>',
        options: [
            Object.assign({}, INDENT_OPTION),
            { id: 'wrap-width', type: 'number', label: 'Wrap lines at', suffix: 'chars', value: 0, min: 0, max: 300, help: '0 leaves long lines intact.' },
            { id: 'preserve-newlines', type: 'checkbox', label: 'Keep existing blank lines', value: true },
            { id: 'max-blank-lines', type: 'number', label: 'Max blank lines in a row', value: 1, min: 0, max: 5, when: function (o) { return o.preserveNewlines; } },
            { id: 'indent-inner-html', type: 'checkbox', label: 'Indent inside <head> and <body>', value: false },
            { id: 'unformatted', type: 'text', label: 'Leave these tags untouched', value: 'pre,code,textarea', help: 'Comma-separated. Whitespace inside these is meaningful.' }
        ],
        run: async function (ctx) {
            var text = String(ctx.text || '');
            if (!text.trim()) ZT.fail('Paste some HTML to format.');

            var beautify = await loadBeautifier('html');
            return ZT.textResult(beautify(text, {
                indent_size: ctx.opt.indent === 'tab' ? 1 : parseInt(ctx.opt.indent, 10),
                indent_char: ctx.opt.indent === 'tab' ? '\t' : ' ',
                wrap_line_length: ctx.opt.wrapWidth,
                preserve_newlines: ctx.opt.preserveNewlines,
                max_preserve_newlines: ctx.opt.maxBlankLines,
                indent_inner_html: ctx.opt.indentInnerHtml,
                unformatted: String(ctx.opt.unformatted).split(',').map(function (t) { return t.trim(); }).filter(Boolean),
                end_with_newline: true
            }), { lang: 'html' });
        }
    });

    define({
        id: 'js-formatter',
        name: 'JavaScript Formatter & Beautifier',
        category: 'code',
        icon: 'file-terminal',
        description: 'Reformat minified or messy JavaScript into readable code.',
        tags: ['javascript', 'js', 'beautify', 'format', 'unminify', 'prettify', 'json'],
        input: 'text',
        popular: true,
        placeholder: 'function f(a,b){return a>b?a:b}',
        options: [
            Object.assign({}, INDENT_OPTION),
            { id: 'wrap-width', type: 'number', label: 'Wrap lines at', suffix: 'chars', value: 0, min: 0, max: 300, help: '0 leaves long lines intact.' },
            {
                id: 'brace-style', type: 'select', label: 'Brace style', value: 'collapse',
                options: [
                    { value: 'collapse', label: 'Same line  —  if (x) {' },
                    { value: 'expand', label: 'Own line  —  if (x)\\n{' },
                    { value: 'end-expand', label: 'End expanded' }
                ]
            },
            { id: 'space-in-paren', type: 'checkbox', label: 'Spaces inside parentheses', value: false },
            { id: 'preserve-newlines', type: 'checkbox', label: 'Keep existing blank lines', value: true },
            { id: 'keep-array-indentation', type: 'checkbox', label: 'Keep array indentation as written', value: false }
        ],
        run: async function (ctx) {
            var text = String(ctx.text || '');
            if (!text.trim()) ZT.fail('Paste some JavaScript to format.');

            var beautify = await loadBeautifier('js');
            return ZT.textResult(beautify(text, {
                indent_size: ctx.opt.indent === 'tab' ? 1 : parseInt(ctx.opt.indent, 10),
                indent_char: ctx.opt.indent === 'tab' ? '\t' : ' ',
                wrap_line_length: ctx.opt.wrapWidth,
                brace_style: ctx.opt.braceStyle,
                space_in_paren: ctx.opt.spaceInParen,
                preserve_newlines: ctx.opt.preserveNewlines,
                keep_array_indentation: ctx.opt.keepArrayIndentation,
                end_with_newline: true
            }), { lang: 'javascript' });
        }
    });

    /* ============================================================
       JSON to typed code
       ============================================================ */
    define({
        id: 'json-to-code',
        name: 'JSON to TypeScript, Go & Python',
        category: 'code',
        icon: 'braces',
        description: 'Turn a JSON sample into typed interfaces, structs or dataclasses.',
        tags: ['json', 'typescript', 'golang', 'python', 'types', 'interface', 'struct', 'codegen'],
        input: 'text',
        popular: true,
        live: true,
        placeholder: '{"id":1,"name":"Ada","tags":["dev"],"active":true,"address":{"city":"London"}}',
        options: [
            {
                id: 'language', type: 'select', label: 'Generate', value: 'typescript',
                options: [
                    { value: 'typescript', label: 'TypeScript interface' },
                    { value: 'go', label: 'Go struct' },
                    { value: 'python', label: 'Python dataclass' },
                    { value: 'java', label: 'Java class' },
                    { value: 'csharp', label: 'C# class' }
                ]
            },
            { id: 'root-name', type: 'text', label: 'Root type name', value: 'Root' },
            { id: 'optional', type: 'checkbox', label: 'Mark every field optional', value: false, when: function (o) { return o.language === 'typescript'; } },
            { id: 'json-tags', type: 'checkbox', label: 'Include json struct tags', value: true, when: function (o) { return o.language === 'go'; } }
        ],
        run: function (ctx) {
            var data = parseJson(ctx.text);
            var o = ctx.opt;
            var typeName = sanitiseTypeName(o.rootName || 'Root');

            /* Collect nested object shapes as named types, so the output is
               real code rather than one deeply inlined blob. */
            var types = [];
            var seen = Object.create(null);

            function register(name, shape) {
                var unique = name;
                var n = 2;
                while (seen[unique]) unique = name + (n++);
                seen[unique] = true;
                types.push({ name: unique, shape: shape });
                return unique;
            }

            function describe(value, hint) {
                if (value === null) return { kind: 'null' };
                if (Array.isArray(value)) {
                    if (!value.length) return { kind: 'array', of: { kind: 'any' } };
                    // Assume a homogeneous array and describe from the first item.
                    return { kind: 'array', of: describe(value[0], singular(hint)) };
                }
                if (typeof value === 'object') {
                    var shape = {};
                    Object.keys(value).forEach(function (key) {
                        shape[key] = describe(value[key], key);
                    });
                    return { kind: 'object', name: register(sanitiseTypeName(hint), shape) };
                }
                if (typeof value === 'number') {
                    return { kind: Number.isInteger(value) ? 'int' : 'float' };
                }
                if (typeof value === 'boolean') return { kind: 'bool' };
                return { kind: 'string' };
            }

            var root = describe(data, typeName);
            if (root.kind !== 'object') {
                ZT.fail('The top level needs to be a JSON object for this to generate a type.');
            }

            var emit = {
                typescript: emitTypeScript,
                go: emitGo,
                python: emitPython,
                java: emitJava,
                csharp: emitCSharp
            }[o.language];

            return ZT.textResult(emit(types, o), {
                lang: o.language === 'typescript' ? 'typescript' : o.language,
                note: types.length + ' type' + (types.length === 1 ? '' : 's') + ' generated'
            });
        }
    });

    function singular(name) {
        return String(name || 'Item').replace(/ies$/, 'y').replace(/s$/, '');
    }

    function sanitiseTypeName(name) {
        var cleaned = String(name || 'Type').replace(/[^a-zA-Z0-9_]/g, ' ').trim();
        var parts = cleaned.split(/\s+/).filter(Boolean);
        var joined = parts.map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join('');
        return /^[0-9]/.test(joined) ? 'T' + joined : (joined || 'Type');
    }

    function fieldName(key) {
        return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
    }

    function emitTypeScript(types, o) {
        var TS = { string: 'string', int: 'number', float: 'number', bool: 'boolean', null: 'null', any: 'any' };
        function typeOf(d) {
            if (d.kind === 'object') return d.name;
            if (d.kind === 'array') return typeOf(d.of) + '[]';
            return TS[d.kind] || 'any';
        }
        return types.slice().reverse().map(function (t) {
            var lines = ['export interface ' + t.name + ' {'];
            Object.keys(t.shape).forEach(function (key) {
                lines.push('  ' + fieldName(key) + (o.optional ? '?' : '') + ': ' + typeOf(t.shape[key]) + ';');
            });
            lines.push('}');
            return lines.join('\n');
        }).join('\n\n');
    }

    function emitGo(types, o) {
        var GO = { string: 'string', int: 'int', float: 'float64', bool: 'bool', null: 'interface{}', any: 'interface{}' };
        function typeOf(d) {
            if (d.kind === 'object') return d.name;
            if (d.kind === 'array') return '[]' + typeOf(d.of);
            return GO[d.kind] || 'interface{}';
        }
        return types.slice().reverse().map(function (t) {
            var lines = ['type ' + t.name + ' struct {'];
            Object.keys(t.shape).forEach(function (key) {
                var exported = sanitiseTypeName(key);
                var tag = o.jsonTags ? '  `json:"' + key + '"`' : '';
                lines.push('\t' + exported + '\t' + typeOf(t.shape[key]) + tag);
            });
            lines.push('}');
            return lines.join('\n');
        }).join('\n\n');
    }

    function emitPython(types) {
        var PY = { string: 'str', int: 'int', float: 'float', bool: 'bool', null: 'None', any: 'Any' };
        function typeOf(d) {
            if (d.kind === 'object') return d.name;
            if (d.kind === 'array') return 'List[' + typeOf(d.of) + ']';
            return PY[d.kind] || 'Any';
        }
        var body = types.slice().reverse().map(function (t) {
            var lines = ['@dataclass', 'class ' + t.name + ':'];
            var keys = Object.keys(t.shape);
            if (!keys.length) lines.push('    pass');
            keys.forEach(function (key) {
                lines.push('    ' + snakeCase(key) + ': ' + typeOf(t.shape[key]));
            });
            return lines.join('\n');
        }).join('\n\n\n');
        return 'from dataclasses import dataclass\nfrom typing import Any, List, Optional\n\n\n' + body;
    }

    function emitJava(types) {
        var JAVA = { string: 'String', int: 'int', float: 'double', bool: 'boolean', null: 'Object', any: 'Object' };
        function typeOf(d) {
            if (d.kind === 'object') return d.name;
            if (d.kind === 'array') return 'List<' + boxed(typeOf(d.of)) + '>';
            return JAVA[d.kind] || 'Object';
        }
        function boxed(t) {
            return { int: 'Integer', double: 'Double', boolean: 'Boolean' }[t] || t;
        }
        return types.slice().reverse().map(function (t) {
            var lines = ['public class ' + t.name + ' {'];
            Object.keys(t.shape).forEach(function (key) {
                lines.push('    private ' + typeOf(t.shape[key]) + ' ' + camelCase(key) + ';');
            });
            lines.push('}');
            return lines.join('\n');
        }).join('\n\n');
    }

    function emitCSharp(types) {
        var CS = { string: 'string', int: 'int', float: 'double', bool: 'bool', null: 'object', any: 'object' };
        function typeOf(d) {
            if (d.kind === 'object') return d.name;
            if (d.kind === 'array') return 'List<' + typeOf(d.of) + '>';
            return CS[d.kind] || 'object';
        }
        return types.slice().reverse().map(function (t) {
            var lines = ['public class ' + t.name, '{'];
            Object.keys(t.shape).forEach(function (key) {
                lines.push('    public ' + typeOf(t.shape[key]) + ' ' + sanitiseTypeName(key) + ' { get; set; }');
            });
            lines.push('}');
            return lines.join('\n');
        }).join('\n\n');
    }

    function snakeCase(s) {
        return String(s).replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();
    }

    function camelCase(s) {
        var parts = String(s).replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(/\s+/);
        return parts.map(function (p, i) {
            return i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
        }).join('');
    }

    /* ============================================================
       JSON diff
       ============================================================ */
    define({
        id: 'json-diff',
        name: 'JSON Diff',
        category: 'code',
        icon: 'git-compare',
        description: 'Compare two JSON documents and list every added, removed or changed value.',
        tags: ['json', 'diff', 'compare', 'changes', 'difference'],
        input: 'text',
        live: true,
        inputLabel: 'Original JSON',
        placeholder: '{"name":"Ada","age":36,"tags":["dev"]}',
        options: [
            { id: 'compare-to', type: 'textarea', label: 'Changed JSON', value: '', rows: 8, mono: true, placeholder: '{"name":"Ada","age":37,"tags":["dev","lead"]}' },
            { id: 'ignore-order', type: 'checkbox', label: 'Ignore array order', value: false, help: 'Treats arrays as sets, so a reordering is not reported as a change.' },
            { id: 'show-unchanged', type: 'checkbox', label: 'Also list unchanged values', value: false }
        ],
        run: function (ctx) {
            var left = parseJson(ctx.text);
            if (!String(ctx.opt.compareTo || '').trim()) {
                return ZT.dataResult([{ label: 'Waiting for input', value: 'Paste the second JSON document above to compare.' }], { title: 'JSON diff' });
            }
            var right = parseJson(ctx.opt.compareTo);

            var changes = [];

            function normalise(value) {
                if (ctx.opt.ignoreOrder && Array.isArray(value)) {
                    return value.slice().sort(function (a, b) {
                        return JSON.stringify(a).localeCompare(JSON.stringify(b));
                    });
                }
                return value;
            }

            function walk(a, b, path) {
                a = normalise(a); b = normalise(b);

                var aIsObject = a && typeof a === 'object';
                var bIsObject = b && typeof b === 'object';

                if (aIsObject && bIsObject && Array.isArray(a) === Array.isArray(b)) {
                    var keys = Object.keys(a).concat(Object.keys(b))
                        .filter(function (k, i, arr) { return arr.indexOf(k) === i; });
                    keys.forEach(function (key) {
                        var childPath = path ? path + (Array.isArray(a) ? '[' + key + ']' : '.' + key) : key;
                        if (!(key in a)) changes.push({ type: 'added', path: childPath, value: b[key] });
                        else if (!(key in b)) changes.push({ type: 'removed', path: childPath, value: a[key] });
                        else walk(a[key], b[key], childPath);
                    });
                    return;
                }

                if (JSON.stringify(a) !== JSON.stringify(b)) {
                    changes.push({ type: 'changed', path: path || '(root)', from: a, to: b });
                } else if (ctx.opt.showUnchanged) {
                    changes.push({ type: 'same', path: path || '(root)', value: a });
                }
            }

            walk(left, right, '');

            var added = changes.filter(function (c) { return c.type === 'added'; }).length;
            var removed = changes.filter(function (c) { return c.type === 'removed'; }).length;
            var changed = changes.filter(function (c) { return c.type === 'changed'; }).length;

            var rows = changes.map(function (c) {
                if (c.type === 'changed') {
                    return { label: 'changed  ' + c.path, value: JSON.stringify(c.from) + '   →   ' + JSON.stringify(c.to) };
                }
                if (c.type === 'same') return { label: 'same  ' + c.path, value: JSON.stringify(c.value) };
                return { label: c.type + '  ' + c.path, value: JSON.stringify(c.value) };
            });

            return [
                ZT.dataResult([
                    { label: 'Added', value: String(added) },
                    { label: 'Removed', value: String(removed) },
                    { label: 'Changed', value: String(changed) }
                ], { title: added + removed + changed === 0 ? 'The two documents are identical' : 'Summary', columns: 3 }),
                rows.length ? ZT.dataResult(rows, { title: 'Differences', columns: 1, mono: true }) : null
            ].filter(Boolean);
        }
    });

    /* ============================================================
       curl converter
       ============================================================ */
    define({
        id: 'curl-converter',
        name: 'curl to Code Converter',
        category: 'code',
        icon: 'terminal',
        description: 'Turn a curl command into fetch, axios, Python requests or Go code.',
        tags: ['curl', 'fetch', 'axios', 'python', 'requests', 'http', 'api', 'convert'],
        input: 'text',
        live: true,
        popular: true,
        placeholder: "curl -X POST https://api.example.com/users \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"name\":\"Ada\"}'",
        options: [
            {
                id: 'language', type: 'select', label: 'Convert to', value: 'fetch',
                options: [
                    { value: 'fetch', label: 'JavaScript — fetch' },
                    { value: 'axios', label: 'JavaScript — axios' },
                    { value: 'python', label: 'Python — requests' },
                    { value: 'go', label: 'Go — net/http' },
                    { value: 'php', label: 'PHP — cURL' }
                ]
            },
            { id: 'async-await', type: 'checkbox', label: 'Use async/await', value: true, when: function (o) { return o.language === 'fetch' || o.language === 'axios'; } }
        ],
        run: function (ctx) {
            var parsed = parseCurl(ctx.text);
            if (!parsed.url) {
                return ZT.textResult('', { note: 'Paste a curl command to convert.' });
            }

            var emit = {
                fetch: curlToFetch, axios: curlToAxios, python: curlToPython,
                go: curlToGo, php: curlToPhp
            }[ctx.opt.language];

            return [
                ZT.textResult(emit(parsed, ctx.opt), {
                    lang: /fetch|axios/.test(ctx.opt.language) ? 'javascript' : ctx.opt.language
                }),
                ZT.dataResult([
                    { label: 'Method', value: parsed.method },
                    { label: 'URL', value: parsed.url },
                    { label: 'Headers', value: String(Object.keys(parsed.headers).length) },
                    { label: 'Body', value: parsed.body ? ZT.formatBytes(parsed.body.length) : 'none' }
                ], { title: 'Parsed request', columns: 2 })
            ];
        }
    });

    /**
     * Parse a curl command. Handles quoting, line continuations and the
     * flags people actually paste: -X, -H, -d, --data-raw, -u, -F.
     */
    function parseCurl(text) {
        var out = { method: '', url: '', headers: {}, body: '', auth: '' };
        var command = String(text || '').replace(/\\\r?\n/g, ' ').trim();
        if (!command) return out;

        // Split on whitespace, keeping quoted sections together.
        var tokens = command.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\S+/g) || [];

        function unquote(s) {
            if (!s) return '';
            if ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'")) {
                return s.slice(1, -1).replace(/\\(['"])/g, '$1');
            }
            return s;
        }

        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];
            if (token === 'curl') continue;

            if (token === '-X' || token === '--request') {
                out.method = unquote(tokens[++i]).toUpperCase();
            } else if (token === '-H' || token === '--header') {
                var header = unquote(tokens[++i]);
                var at = header.indexOf(':');
                if (at > 0) out.headers[header.slice(0, at).trim()] = header.slice(at + 1).trim();
            } else if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary') {
                out.body = unquote(tokens[++i]);
            } else if (token === '-u' || token === '--user') {
                out.auth = unquote(tokens[++i]);
            } else if (token === '-F' || token === '--form') {
                out.body = (out.body ? out.body + '&' : '') + unquote(tokens[++i]);
                out.headers['Content-Type'] = out.headers['Content-Type'] || 'multipart/form-data';
            } else if (/^-/.test(token)) {
                // Skip flags that take no value we care about (-L, -k, -s…).
                continue;
            } else if (!out.url) {
                out.url = unquote(token);
            }
        }

        if (!out.method) out.method = out.body ? 'POST' : 'GET';
        return out;
    }

    function headerLines(headers, indent, quote) {
        return Object.keys(headers).map(function (k) {
            return indent + quote + k + quote + ': ' + JSON.stringify(headers[k]);
        }).join(',\n');
    }

    function curlToFetch(r, o) {
        var lines = [];
        var init = ["  method: " + JSON.stringify(r.method)];
        if (Object.keys(r.headers).length) {
            init.push('  headers: {\n' + headerLines(r.headers, '    ', "'").replace(/'/g, '"') + '\n  }');
        }
        if (r.body) init.push('  body: ' + JSON.stringify(r.body));

        var call = 'fetch(' + JSON.stringify(r.url) + ', {\n' + init.join(',\n') + '\n})';

        if (o.asyncAwait) {
            lines.push('const response = await ' + call + ';');
            lines.push('const data = await response.json();');
            lines.push('console.log(data);');
        } else {
            lines.push(call);
            lines.push('  .then((response) => response.json())');
            lines.push('  .then((data) => console.log(data));');
        }
        return lines.join('\n');
    }

    function curlToAxios(r, o) {
        var config = ['  method: ' + JSON.stringify(r.method.toLowerCase()), '  url: ' + JSON.stringify(r.url)];
        if (Object.keys(r.headers).length) {
            config.push('  headers: {\n' + headerLines(r.headers, '    ', '"') + '\n  }');
        }
        if (r.body) {
            var parsedBody;
            try { parsedBody = JSON.stringify(JSON.parse(r.body), null, 2).split('\n').join('\n  '); }
            catch (e) { parsedBody = JSON.stringify(r.body); }
            config.push('  data: ' + parsedBody);
        }
        var call = 'axios({\n' + config.join(',\n') + '\n})';
        return o.asyncAwait
            ? 'const { data } = await ' + call + ';\nconsole.log(data);'
            : call + '\n  .then(({ data }) => console.log(data));';
    }

    function curlToPython(r) {
        var lines = ['import requests', ''];
        if (Object.keys(r.headers).length) {
            lines.push('headers = {');
            Object.keys(r.headers).forEach(function (k) {
                lines.push('    ' + JSON.stringify(k) + ': ' + JSON.stringify(r.headers[k]) + ',');
            });
            lines.push('}');
            lines.push('');
        }
        if (r.body) {
            try {
                JSON.parse(r.body);
                lines.push('payload = ' + r.body);
            } catch (e) {
                lines.push('payload = ' + JSON.stringify(r.body));
            }
            lines.push('');
        }
        var args = [JSON.stringify(r.url)];
        if (Object.keys(r.headers).length) args.push('headers=headers');
        if (r.body) args.push(/json/i.test(r.headers['Content-Type'] || '') ? 'json=payload' : 'data=payload');
        if (r.auth) args.push('auth=' + JSON.stringify(r.auth.split(':')).replace('[', '(').replace(']', ')'));

        lines.push('response = requests.' + r.method.toLowerCase() + '(' + args.join(', ') + ')');
        lines.push('print(response.json())');
        return lines.join('\n');
    }

    function curlToGo(r) {
        var lines = ['package main', '', 'import (', '\t"fmt"', '\t"io"', '\t"net/http"'];
        if (r.body) lines.push('\t"strings"');
        lines.push(')', '', 'func main() {');

        if (r.body) {
            lines.push('\tbody := strings.NewReader(`' + r.body.replace(/`/g, '` + "`" + `') + '`)');
            lines.push('\treq, _ := http.NewRequest(' + JSON.stringify(r.method) + ', ' + JSON.stringify(r.url) + ', body)');
        } else {
            lines.push('\treq, _ := http.NewRequest(' + JSON.stringify(r.method) + ', ' + JSON.stringify(r.url) + ', nil)');
        }

        Object.keys(r.headers).forEach(function (k) {
            lines.push('\treq.Header.Set(' + JSON.stringify(k) + ', ' + JSON.stringify(r.headers[k]) + ')');
        });

        lines.push('', '\tresp, err := http.DefaultClient.Do(req)');
        lines.push('\tif err != nil {', '\t\tpanic(err)', '\t}');
        lines.push('\tdefer resp.Body.Close()', '');
        lines.push('\tout, _ := io.ReadAll(resp.Body)');
        lines.push('\tfmt.Println(string(out))');
        lines.push('}');
        return lines.join('\n');
    }

    function curlToPhp(r) {
        var lines = ['<?php', '$ch = curl_init();', ''];
        lines.push('curl_setopt($ch, CURLOPT_URL, ' + JSON.stringify(r.url) + ');');
        lines.push('curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);');
        lines.push('curl_setopt($ch, CURLOPT_CUSTOMREQUEST, ' + JSON.stringify(r.method) + ');');

        if (Object.keys(r.headers).length) {
            lines.push('curl_setopt($ch, CURLOPT_HTTPHEADER, [');
            Object.keys(r.headers).forEach(function (k) {
                lines.push('    ' + JSON.stringify(k + ': ' + r.headers[k]) + ',');
            });
            lines.push(']);');
        }
        if (r.body) lines.push('curl_setopt($ch, CURLOPT_POSTFIELDS, ' + JSON.stringify(r.body) + ');');

        lines.push('', '$response = curl_exec($ch);', 'curl_close($ch);', 'echo $response;');
        return lines.join('\n');
    }

    /* ============================================================
       String escaper
       ============================================================ */
    define({
        id: 'string-escaper',
        name: 'String Escape & Unescape',
        category: 'code',
        icon: 'code',
        description: 'Escape or unescape strings for JavaScript, JSON, SQL, shell, CSV and regex.',
        tags: ['escape', 'unescape', 'string', 'quote', 'sql injection', 'shell', 'regex'],
        input: 'text',
        live: true,
        placeholder: 'He said "hello"\\nand left.',
        options: [
            {
                id: 'target', type: 'select', label: 'Escape for', value: 'javascript',
                options: [
                    { value: 'javascript', label: 'JavaScript / JSON string' },
                    { value: 'sql', label: 'SQL string literal' },
                    { value: 'shell', label: 'Shell / Bash argument' },
                    { value: 'csv', label: 'CSV field' },
                    { value: 'regex', label: 'Regular expression literal' },
                    { value: 'xml', label: 'XML / HTML attribute' }
                ]
            },
            {
                id: 'direction', type: 'radio', label: 'Direction', value: 'escape',
                options: [{ value: 'escape', label: 'Escape' }, { value: 'unescape', label: 'Unescape' }]
            },
            { id: 'wrap', type: 'checkbox', label: 'Wrap the result in quotes', value: false, when: function (o) { return o.direction === 'escape'; } }
        ],
        run: function (ctx) {
            var text = String(ctx.text || '');
            if (!text) return ZT.textResult('');
            var o = ctx.opt;
            var out;

            if (o.direction === 'escape') {
                switch (o.target) {
                    case 'sql':
                        out = text.replace(/'/g, "''");
                        if (o.wrap) out = "'" + out + "'";
                        break;
                    case 'shell':
                        // Single quotes are literal in POSIX shells; the only
                        // trick is ending and reopening around an apostrophe.
                        out = "'" + text.replace(/'/g, "'\\''") + "'";
                        if (!o.wrap) out = out.slice(1, -1);
                        break;
                    case 'csv':
                        out = text.replace(/"/g, '""');
                        if (o.wrap || /[",\n]/.test(text)) out = '"' + out + '"';
                        break;
                    case 'regex':
                        out = text.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
                        if (o.wrap) out = '/' + out + '/';
                        break;
                    case 'xml':
                        out = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                                  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
                        if (o.wrap) out = '"' + out + '"';
                        break;
                    default:
                        out = JSON.stringify(text);
                        if (!o.wrap) out = out.slice(1, -1);
                }
            } else {
                switch (o.target) {
                    case 'sql':
                        out = text.replace(/^'|'$/g, '').replace(/''/g, "'");
                        break;
                    case 'shell':
                        out = text.replace(/^'|'$/g, '').replace(/'\\''/g, "'");
                        break;
                    case 'csv':
                        out = text.replace(/^"|"$/g, '').replace(/""/g, '"');
                        break;
                    case 'regex':
                        out = text.replace(/^\/|\/$/g, '').replace(/\\([.*+?^${}()|[\]\\\/])/g, '$1');
                        break;
                    case 'xml': {
                        var ta = document.createElement('textarea');
                        ta.innerHTML = text;
                        out = ta.value;
                        break;
                    }
                    default:
                        try {
                            out = JSON.parse(text.charAt(0) === '"' ? text : '"' + text + '"');
                        } catch (e) {
                            ZT.fail('That is not a valid escaped string — check for a stray backslash.');
                        }
                }
            }

            return ZT.textResult(out, { mono: true });
        }
    });

    /* ============================================================
       Query string
       ============================================================ */
    define({
        id: 'query-string-converter',
        name: 'Query String ⇄ JSON',
        category: 'code',
        icon: 'link-2',
        description: 'Convert a URL query string into JSON and back again.',
        tags: ['query string', 'querystring', 'url', 'params', 'json', 'convert'],
        input: 'text',
        live: true,
        placeholder: 'page=2&sort=name&filter[]=new&filter[]=sale',
        options: [
            {
                id: 'direction', type: 'radio', label: 'Direction', value: 'to-json',
                options: [{ value: 'to-json', label: 'Query → JSON' }, { value: 'to-query', label: 'JSON → Query' }]
            },
            { id: 'parse-numbers', type: 'checkbox', label: 'Convert numeric values to numbers', value: true, when: function (o) { return o.direction === 'to-json'; } },
            { id: 'array-brackets', type: 'checkbox', label: 'Use key[] notation for arrays', value: true, when: function (o) { return o.direction === 'to-query'; } },
            { id: 'encode', type: 'checkbox', label: 'URL-encode values', value: true, when: function (o) { return o.direction === 'to-query'; } },
            Object.assign({}, INDENT_OPTION, { when: function (o) { return o.direction === 'to-json'; } })
        ],
        run: function (ctx) {
            var text = String(ctx.text || '').trim();
            if (!text) return ZT.textResult('');
            var o = ctx.opt;

            if (o.direction === 'to-json') {
                // Accept a whole URL as well as a bare query string.
                var query = text;
                var at = text.indexOf('?');
                if (at !== -1) query = text.slice(at + 1);
                query = query.replace(/^[?#]/, '');

                var result = {};
                new URLSearchParams(query).forEach(function (value, key) {
                    var clean = key.replace(/\[\]$/, '');
                    var isArray = key !== clean;

                    var parsed = value;
                    if (o.parseNumbers && value !== '' && /^-?\d*\.?\d+$/.test(value)) parsed = Number(value);
                    else if (value === 'true') parsed = true;
                    else if (value === 'false') parsed = false;

                    if (isArray || result[clean] !== undefined) {
                        if (!Array.isArray(result[clean])) {
                            result[clean] = result[clean] === undefined ? [] : [result[clean]];
                        }
                        result[clean].push(parsed);
                    } else {
                        result[clean] = parsed;
                    }
                });

                return ZT.textResult(JSON.stringify(result, null, indentString(o.indent)), {
                    lang: 'json',
                    note: Object.keys(result).length + ' parameters'
                });
            }

            var data = parseJson(text);
            var pairs = [];
            Object.keys(data).forEach(function (key) {
                var value = data[key];
                function encode(v) { return o.encode ? encodeURIComponent(String(v)) : String(v); }

                if (Array.isArray(value)) {
                    value.forEach(function (item) {
                        pairs.push(encode(key) + (o.arrayBrackets ? '[]' : '') + '=' + encode(item));
                    });
                } else if (value !== null && typeof value === 'object') {
                    pairs.push(encode(key) + '=' + encode(JSON.stringify(value)));
                } else {
                    pairs.push(encode(key) + '=' + encode(value));
                }
            });

            return ZT.textResult(pairs.join('&'), { mono: true, note: pairs.length + ' parameters' });
        }
    });

    /* ============================================================
       TOML and .env
       ============================================================ */
    define({
        id: 'toml-json-converter',
        name: 'TOML ⇄ JSON Converter',
        category: 'code',
        icon: 'file-json',
        description: 'Convert TOML configuration to JSON and back.',
        tags: ['toml', 'json', 'convert', 'config', 'cargo', 'pyproject'],
        input: 'text',
        live: true,
        placeholder: 'title = "ZyncTools"\n\n[owner]\nname = "Ada"\nactive = true',
        options: [
            {
                id: 'direction', type: 'radio', label: 'Direction', value: 'toml-to-json',
                options: [{ value: 'toml-to-json', label: 'TOML → JSON' }, { value: 'json-to-toml', label: 'JSON → TOML' }]
            },
            Object.assign({}, INDENT_OPTION, { when: function (o) { return o.direction === 'toml-to-json'; } })
        ],
        run: function (ctx) {
            var text = String(ctx.text || '').trim();
            if (!text) return ZT.textResult('');

            if (ctx.opt.direction === 'toml-to-json') {
                return ZT.textResult(JSON.stringify(parseToml(text), null, indentString(ctx.opt.indent)), { lang: 'json' });
            }
            return ZT.textResult(toToml(parseJson(text)), { mono: true });
        }
    });

    /**
     * A pragmatic TOML reader: tables, nested tables, arrays of tables,
     * and the scalar types people actually put in config files.
     */
    function parseToml(text) {
        var root = {};
        var current = root;

        String(text).split(/\r?\n/).forEach(function (rawLine, index) {
            var line = rawLine.replace(/(^|\s)#.*$/, '').trim();
            if (!line) return;

            var arrayTable = line.match(/^\[\[(.+)\]\]$/);
            var table = line.match(/^\[(.+)\]$/);

            if (arrayTable) {
                current = descend(root, arrayTable[1].trim(), true);
                return;
            }
            if (table) {
                current = descend(root, table[1].trim(), false);
                return;
            }

            var pair = line.match(/^([^=]+)=(.*)$/);
            if (!pair) ZT.fail('Line ' + (index + 1) + ' is not valid TOML: "' + rawLine.trim() + '"');

            var key = pair[1].trim().replace(/^["']|["']$/g, '');
            current[key] = tomlValue(pair[2].trim());
        });

        return root;
    }

    function descend(root, path, isArray) {
        var parts = path.split('.').map(function (p) { return p.trim().replace(/^["']|["']$/g, ''); });
        var node = root;
        parts.forEach(function (part, i) {
            var last = i === parts.length - 1;
            if (last && isArray) {
                if (!Array.isArray(node[part])) node[part] = [];
                var entry = {};
                node[part].push(entry);
                node = entry;
                return;
            }
            if (Array.isArray(node[part])) node = node[part][node[part].length - 1];
            else node = (node[part] = node[part] || {});
        });
        return node;
    }

    function tomlValue(raw) {
        if (/^".*"$/.test(raw) || /^'.*'$/.test(raw)) return raw.slice(1, -1);
        if (raw === 'true') return true;
        if (raw === 'false') return false;
        if (/^\[.*\]$/.test(raw)) {
            var inner = raw.slice(1, -1).trim();
            if (!inner) return [];
            return inner.split(/,(?![^[]*\])/).map(function (v) { return tomlValue(v.trim()); });
        }
        if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
        if (/^-?\d*\.\d+([eE][+-]?\d+)?$/.test(raw)) return parseFloat(raw);
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw;
        return raw;
    }

    function toToml(data, prefix) {
        var scalars = [];
        var tables = [];

        Object.keys(data).forEach(function (key) {
            var value = data[key];
            var path = prefix ? prefix + '.' + key : key;

            if (Array.isArray(value) && value.length && value.every(function (v) { return v && typeof v === 'object' && !Array.isArray(v); })) {
                value.forEach(function (entry) {
                    tables.push('[[' + path + ']]\n' + toToml(entry, path).trim());
                });
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                tables.push('[' + path + ']\n' + toToml(value, path).trim());
            } else {
                scalars.push(key + ' = ' + tomlLiteral(value));
            }
        });

        return scalars.join('\n') + (scalars.length && tables.length ? '\n\n' : '') + tables.join('\n\n') + '\n';
    }

    function tomlLiteral(value) {
        if (typeof value === 'string') return JSON.stringify(value);
        if (typeof value === 'boolean' || typeof value === 'number') return String(value);
        if (value === null) return '""';
        if (Array.isArray(value)) return '[' + value.map(tomlLiteral).join(', ') + ']';
        return JSON.stringify(String(value));
    }

    define({
        id: 'env-json-converter',
        name: '.env ⇄ JSON Converter',
        category: 'code',
        icon: 'file-code',
        description: 'Convert environment files to JSON, YAML or a docker-compose block.',
        tags: ['env', 'dotenv', 'environment', 'json', 'convert', 'config', 'docker'],
        input: 'text',
        live: true,
        placeholder: 'DATABASE_URL=postgres://localhost/app\nDEBUG=true\nPORT=3000',
        options: [
            {
                id: 'direction', type: 'select', label: 'Convert', value: 'env-to-json',
                options: [
                    { value: 'env-to-json', label: '.env → JSON' },
                    { value: 'json-to-env', label: 'JSON → .env' },
                    { value: 'env-to-yaml', label: '.env → YAML' },
                    { value: 'env-to-compose', label: '.env → docker-compose environment' },
                    { value: 'env-to-shell', label: '.env → shell exports' }
                ]
            },
            { id: 'keep-comments', type: 'checkbox', label: 'Keep comments where possible', value: true },
            { id: 'quote-values', type: 'checkbox', label: 'Quote values', value: false, when: function (o) { return o.direction === 'json-to-env'; } },
            { id: 'mask-secrets', type: 'checkbox', label: 'Mask values that look like secrets', value: false, help: 'Replaces anything under a KEY, TOKEN, SECRET or PASSWORD name with asterisks — useful before sharing.' }
        ],
        run: function (ctx) {
            var text = String(ctx.text || '').trim();
            if (!text) return ZT.textResult('');
            var o = ctx.opt;

            function maybeMask(key, value) {
                if (!o.maskSecrets) return value;
                return /(KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|AUTH)/i.test(key)
                    ? '********' : value;
            }

            if (o.direction === 'json-to-env') {
                var data = parseJson(text);
                var lines = Object.keys(data).map(function (key) {
                    var value = data[key];
                    if (value !== null && typeof value === 'object') value = JSON.stringify(value);
                    value = maybeMask(key, String(value));
                    var needsQuotes = o.quoteValues || /[\s#'"]/.test(value);
                    return snakeCase(key).toUpperCase() + '=' + (needsQuotes ? JSON.stringify(value) : value);
                });
                return ZT.textResult(lines.join('\n'), { mono: true, note: lines.length + ' variables' });
            }

            // Parse the .env once, then render whichever target was chosen.
            var entries = [];
            var comments = [];
            text.split(/\r?\n/).forEach(function (line) {
                var trimmed = line.trim();
                if (!trimmed) return;
                if (trimmed.charAt(0) === '#') { comments.push(trimmed); return; }

                var at = trimmed.indexOf('=');
                if (at === -1) return;

                var key = trimmed.slice(0, at).replace(/^export\s+/, '').trim();
                var value = trimmed.slice(at + 1).trim();
                if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
                entries.push({ key: key, value: maybeMask(key, value) });
            });

            if (!entries.length) ZT.fail('No KEY=value lines found.');

            switch (o.direction) {
                case 'env-to-yaml':
                    return ZT.textResult(entries.map(function (e) {
                        return e.key + ': ' + (/[:#{}[\]]/.test(e.value) ? JSON.stringify(e.value) : e.value);
                    }).join('\n'), { lang: 'yaml' });

                case 'env-to-compose':
                    return ZT.textResult('environment:\n' + entries.map(function (e) {
                        return '  - ' + e.key + '=' + e.value;
                    }).join('\n'), { lang: 'yaml' });

                case 'env-to-shell':
                    return ZT.textResult(entries.map(function (e) {
                        return 'export ' + e.key + "='" + e.value.replace(/'/g, "'\\''") + "'";
                    }).join('\n'), { mono: true });

                default: {
                    var result = {};
                    entries.forEach(function (e) {
                        var v = e.value;
                        if (v === 'true') v = true;
                        else if (v === 'false') v = false;
                        else if (v !== '' && /^-?\d*\.?\d+$/.test(v)) v = Number(v);
                        result[e.key] = v;
                    });
                    var json = JSON.stringify(result, null, 2);
                    if (o.keepComments && comments.length) {
                        json = comments.map(function (c) { return '// ' + c.replace(/^#\s*/, ''); }).join('\n') + '\n' + json;
                    }
                    return ZT.textResult(json, { lang: 'json', note: entries.length + ' variables' });
                }
            }
        }
    });

    /* ============================================================
       Markdown table
       ============================================================ */
    define({
        id: 'markdown-table-generator',
        name: 'Markdown Table Generator',
        category: 'code',
        icon: 'table',
        description: 'Turn CSV, TSV or JSON into a formatted Markdown or HTML table.',
        tags: ['markdown', 'table', 'csv', 'generator', 'readme', 'github'],
        input: 'text',
        live: true,
        placeholder: 'Name, Role, City\nAda, Engineer, London\nGrace, Admiral, New York',
        options: [
            {
                id: 'source', type: 'select', label: 'Input format', value: 'csv',
                options: [
                    { value: 'csv', label: 'CSV — comma separated' },
                    { value: 'tsv', label: 'TSV — tab separated' },
                    { value: 'json', label: 'JSON array of objects' }
                ]
            },
            {
                id: 'output', type: 'select', label: 'Output', value: 'markdown',
                options: [
                    { value: 'markdown', label: 'Markdown table' },
                    { value: 'html', label: 'HTML table' },
                    { value: 'ascii', label: 'ASCII box table' }
                ]
            },
            { id: 'has-header', type: 'checkbox', label: 'First row is a header', value: true },
            {
                id: 'align', type: 'select', label: 'Column alignment', value: 'left',
                options: [
                    { value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' },
                    { value: 'right', label: 'Right' }
                ],
                when: function (o) { return o.output === 'markdown'; }
            },
            { id: 'pad', type: 'checkbox', label: 'Pad cells so the source lines up', value: true, when: function (o) { return o.output === 'markdown'; } }
        ],
        run: function (ctx) {
            var text = String(ctx.text || '').trim();
            if (!text) return ZT.textResult('');
            var o = ctx.opt;

            var rows;
            if (o.source === 'json') {
                var data = parseJson(text);
                if (!Array.isArray(data)) data = [data];
                if (!data.length) ZT.fail('That JSON array is empty.');
                var columns = [];
                data.forEach(function (item) {
                    Object.keys(item || {}).forEach(function (k) { if (columns.indexOf(k) === -1) columns.push(k); });
                });
                rows = [columns].concat(data.map(function (item) {
                    return columns.map(function (c) {
                        var v = item ? item[c] : '';
                        return v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v === undefined ? '' : v);
                    });
                }));
            } else {
                rows = parseCsv(text, o.source === 'tsv' ? '\t' : ',')
                    .map(function (r) { return r.map(function (c) { return c.trim(); }); });
            }

            if (!rows.length) ZT.fail('No rows found.');

            var width = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
            rows = rows.map(function (r) {
                var copy = r.slice();
                while (copy.length < width) copy.push('');
                return copy;
            });

            var header = o.hasHeader || o.source === 'json'
                ? rows[0]
                : rows[0].map(function (_, i) { return 'Column ' + (i + 1); });
            var body = (o.hasHeader || o.source === 'json') ? rows.slice(1) : rows;

            if (o.output === 'html') {
                var html = ['<table>', '  <thead>', '    <tr>'];
                header.forEach(function (h) { html.push('      <th>' + ZT.esc(h) + '</th>'); });
                html.push('    </tr>', '  </thead>', '  <tbody>');
                body.forEach(function (r) {
                    html.push('    <tr>');
                    r.forEach(function (c) { html.push('      <td>' + ZT.esc(c) + '</td>'); });
                    html.push('    </tr>');
                });
                html.push('  </tbody>', '</table>');
                return ZT.textResult(html.join('\n'), { lang: 'html' });
            }

            var widths = [];
            for (var c = 0; c < width; c++) {
                widths[c] = Math.max(header[c].length, 3);
                body.forEach(function (r) { widths[c] = Math.max(widths[c], (r[c] || '').length); });
            }

            function cell(value, index) {
                return o.pad || o.output === 'ascii' ? String(value).padEnd(widths[index]) : String(value);
            }

            if (o.output === 'ascii') {
                var rule = '+' + widths.map(function (w) { return '-'.repeat(w + 2); }).join('+') + '+';
                var lines = [rule, '| ' + header.map(cell).join(' | ') + ' |', rule];
                body.forEach(function (r) { lines.push('| ' + r.map(cell).join(' | ') + ' |'); });
                lines.push(rule);
                return ZT.textResult(lines.join('\n'), { mono: true });
            }

            var separator = widths.map(function (w) {
                if (o.align === 'center') return ':' + '-'.repeat(Math.max(1, w - 2)) + ':';
                if (o.align === 'right') return '-'.repeat(Math.max(2, w - 1)) + ':';
                return ':' + '-'.repeat(Math.max(2, w - 1));
            });

            var md = ['| ' + header.map(cell).join(' | ') + ' |', '| ' + separator.join(' | ') + ' |'];
            body.forEach(function (r) {
                md.push('| ' + r.map(function (v, i) { return cell(String(v).replace(/\|/g, '\\|'), i); }).join(' | ') + ' |');
            });

            return ZT.textResult(md.join('\n'), { mono: true, note: body.length + ' rows × ' + width + ' columns' });
        }
    });


    /* ============================================================
       HTTP status codes
       ============================================================ */
    define({
        id: 'http-status-reference',
        name: 'HTTP Status Code Reference',
        category: 'code',
        icon: 'network',
        description: 'Look up any HTTP status code and what it actually means in practice.',
        tags: ['http', 'status code', '404', '500', '301', 'response', 'api', 'reference'],
        input: 'text',
        live: true,
        placeholder: '404   or   redirect   or   leave empty to see them all',
        options: [
            {
                id: 'category', type: 'select', label: 'Show', value: 'all',
                options: [
                    { value: 'all', label: 'All classes' },
                    { value: '1', label: '1xx — informational' },
                    { value: '2', label: '2xx — success' },
                    { value: '3', label: '3xx — redirection' },
                    { value: '4', label: '4xx — client error' },
                    { value: '5', label: '5xx — server error' }
                ]
            },
            { id: 'show-guidance', type: 'checkbox', label: 'Show when to use each one', value: true }
        ],
        run: function (ctx) {
            var CODES = [
                [100, 'Continue', 'The client should carry on with the request body.'],
                [101, 'Switching Protocols', 'Used when upgrading to WebSockets.'],
                [200, 'OK', 'The standard success response.'],
                [201, 'Created', 'Use after a POST that created a resource. Include a Location header pointing at it.'],
                [202, 'Accepted', 'Accepted for processing but not finished. Right for queued or async jobs.'],
                [204, 'No Content', 'Success with nothing to return. Common for DELETE and for PUT updates.'],
                [206, 'Partial Content', 'A range request succeeded — video seeking and resumable downloads use this.'],
                [301, 'Moved Permanently', 'The resource has a new home for good. Search engines transfer ranking to the new URL.'],
                [302, 'Found', 'A temporary redirect. Search engines keep the original URL indexed.'],
                [303, 'See Other', 'Redirect after a POST so a refresh does not resubmit the form.'],
                [304, 'Not Modified', 'The cached copy is still current. Saves re-sending the body.'],
                [307, 'Temporary Redirect', 'Like 302 but the method is guaranteed not to change. Prefer this over 302.'],
                [308, 'Permanent Redirect', 'Like 301 but the method is preserved. Prefer this over 301 for non-GET.'],
                [400, 'Bad Request', 'The request itself is malformed. Use it for syntax problems, not failed validation.'],
                [401, 'Unauthorized', 'Actually means unauthenticated — you have not proven who you are. Must include a WWW-Authenticate header.'],
                [403, 'Forbidden', 'You are authenticated but not allowed. Use this when 401 would be misleading.'],
                [404, 'Not Found', 'No resource at this URL. Also used to hide the existence of something from someone unauthorised.'],
                [405, 'Method Not Allowed', 'The URL exists but not for this verb. Must include an Allow header.'],
                [406, 'Not Acceptable', 'Nothing available matches the Accept header.'],
                [409, 'Conflict', 'The request clashes with current state — a duplicate, or an edit against a stale version.'],
                [410, 'Gone', 'Deliberately removed and not coming back. Stronger than 404; search engines drop it faster.'],
                [413, 'Payload Too Large', 'The request body exceeds what the server will accept.'],
                [418, "I'm a teapot", 'An April Fools joke from 1998 that browsers and servers still implement.'],
                [422, 'Unprocessable Content', 'Well-formed but semantically wrong. The usual choice for validation failures.'],
                [429, 'Too Many Requests', 'Rate limited. Include a Retry-After header so the client knows when to come back.'],
                [451, 'Unavailable For Legal Reasons', 'Blocked by law. The number references Fahrenheit 451.'],
                [500, 'Internal Server Error', 'Something broke and it is not the client\'s fault. The catch-all.'],
                [501, 'Not Implemented', 'The server does not support the functionality required.'],
                [502, 'Bad Gateway', 'A proxy got an invalid response from upstream. Usually the app behind nginx has died.'],
                [503, 'Service Unavailable', 'Temporarily down or overloaded. Include Retry-After. Right for maintenance windows.'],
                [504, 'Gateway Timeout', 'A proxy waited too long for upstream. Usually a slow query or a hung service.'],
                [507, 'Insufficient Storage', 'The server is out of space to complete the request.']
            ];

            var query = String(ctx.text || '').trim().toLowerCase();

            var matches = CODES.filter(function (c) {
                if (ctx.opt.category !== 'all' && String(c[0])[0] !== ctx.opt.category) return false;
                if (!query) return true;
                if (String(c[0]).indexOf(query) === 0) return true;
                return (c[1] + ' ' + c[2]).toLowerCase().indexOf(query) !== -1;
            });

            if (!matches.length) {
                return ZT.dataResult([{ label: 'No match', value: 'Nothing found for "' + query + '". Try a number like 404, or a word like "redirect".' }], { title: 'HTTP status codes' });
            }

            // A single exact hit gets the full treatment.
            if (matches.length === 1 || /^\d{3}$/.test(query)) {
                var exact = matches.filter(function (c) { return String(c[0]) === query; })[0] || matches[0];
                var klass = String(exact[0])[0];
                var CLASSES = {
                    '1': 'Informational — the request was received and is continuing',
                    '2': 'Success — the request was received, understood and accepted',
                    '3': 'Redirection — further action is needed to complete the request',
                    '4': 'Client error — the request has a problem',
                    '5': 'Server error — the server failed to fulfil a valid request'
                };
                return ZT.dataResult([
                    { label: 'Code', value: String(exact[0]) },
                    { label: 'Name', value: exact[1] },
                    { label: 'Class', value: klass + 'xx  —  ' + CLASSES[klass] },
                    { label: 'What it means', value: exact[2] },
                    { label: 'Cacheable by default', value: [200, 203, 204, 206, 300, 301, 308, 404, 405, 410, 414, 501].indexOf(exact[0]) !== -1 ? 'Yes' : 'No' }
                ], { title: exact[0] + ' ' + exact[1], columns: 1 });
            }

            return ZT.dataResult(matches.map(function (c) {
                return { label: c[0] + '  ' + c[1], value: ctx.opt.showGuidance ? c[2] : '' };
            }), { title: matches.length + ' status codes', columns: 1 });
        }
    });

})();
