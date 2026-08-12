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

})();
