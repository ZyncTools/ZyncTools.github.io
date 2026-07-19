/**
 * ZyncTools — Batch Logic: TEXT tools
 * =====================================
 * Pure-JS (no heavy deps) implementations of text/data manipulation tools.
 * Each public function returns a Promise that resolves to a Blob or string,
 * matching the standard process(input, options) contract.
 *
 * Covers: csv-json, json-csv, sql-json, xml-json, yaml-json, fake-data,
 *         cron-builder, chart-generator (SVG), lorem, word/char counts,
 *         base64/url/html encode-decode, ascii/binary/hex, uuid, password,
 *         hash, diff, slug, case, reverse, regex, markdown.
 */
(function () {
    'use strict';

    const enc = {
        b64enc: s => btoa(unescape(encodeURIComponent(s))),
        b64dec: s => { try { return decodeURIComponent(escape(atob(s.trim()))); } catch (e) { throw new Error('Invalid Base64 input.'); } },
        urlEnc: s => encodeURIComponent(s),
        urlDec: s => { try { return decodeURIComponent(s); } catch (e) { throw new Error('Invalid URL-encoded input.'); } },
        htmlEnc: s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
        htmlDec: s => s.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&nbsp;/g, c => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }[c]))
    };

    function csvToJson(text) {
        const lines = text.trim().split(/\r?\n/);
        if (!lines.length) throw new Error('Invalid Input: empty CSV.');
        const cols = lines[0].split(',').map(c => c.trim());
        const rows = lines.slice(1).map(l => {
            const v = l.split(',');
            const o = {}; cols.forEach((c, i) => o[c] = v[i] != null ? v[i].trim() : ''); return o;
        });
        return JSON.stringify(rows, null, 2);
    }
    function jsonToCsv(text) {
        let arr; try { arr = JSON.parse(text); } catch (e) { throw new Error('Invalid JSON input.'); }
        if (!Array.isArray(arr)) arr = [arr];
        if (!arr.length) return '';
        const cols = [...new Set(arr.flatMap(o => Object.keys(o)))];
        const e = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
        return [cols.join(',')].concat(arr.map(o => cols.map(c => e(o[c])).join(','))).join('\n');
    }
    function sqlToJson(text) {
        const rows = [];
        const re = /INSERT\s+INTO\s+\w+\s*\(([^)]*)\)\s*VALUES\s*\(([^)]*)\)/gi; let m;
        while ((m = re.exec(text)) !== null) {
            const cols = m[1].split(',').map(c => c.trim().replace(/`/g, ''));
            const vals = m[2].split(',').map(v => v.trim().replace(/^'|'$/g, '').replace(/^"|"$/g, ''));
            const o = {}; cols.forEach((c, i) => o[c] = vals[i]); rows.push(o);
        }
        if (!rows.length) throw new Error('No INSERT statements found.');
        return JSON.stringify(rows, null, 2);
    }
    function xmlToJson(text) {
        function parse(node) {
            const obj = {};
            if (node.nodeType === 3) return node.nodeValue;
            if (node.attributes) for (const a of node.attributes) obj['@' + a.nodeName] = a.nodeValue;
            for (const child of node.childNodes) {
                const name = child.nodeName;
                if (name === '#text') { const t = child.nodeValue.trim(); if (t) return t; continue; }
                const val = parse(child);
                if (obj[name]) { if (!Array.isArray(obj[name])) obj[name] = [obj[name]]; obj[name].push(val); }
                else obj[name] = val;
            }
            return obj;
        }
        const xml = new DOMParser().parseFromString(text, 'application/xml');
        if (xml.querySelector('parsererror')) throw new Error('Invalid XML input.');
        return JSON.stringify({ [xml.documentElement.nodeName]: parse(xml.documentElement) }, null, 2);
    }
    function yamlToJson(text) {
        // Lightweight line-based YAML (top-level key: value, nested 2-space)
        const lines = text.split(/\r?\n/); const root = {}; const stack = [{ i: -1, o: root }];
        for (const line of lines) {
            if (!line.trim() || /^#/.test(line)) continue;
            const ind = line.match(/^ */)[0].length;
            const m = line.match(/^([^:]+):\s*(.*)$/); if (!m) continue;
            const key = m[1].trim(), val = m[2].trim();
            while (stack.length > 1 && ind <= stack[stack.length - 1].i) stack.pop();
            const parent = stack[stack.length - 1].o;
            parent[key] = val || {};
            if (val === '') stack.push({ i: ind, o: parent[key] });
        }
        return JSON.stringify(root, null, 2);
    }
    function objectToYaml(obj) {
        const lines = [];
        const walk = (o, pad) => { for (const k in o) { const v = o[k]; if (v && typeof v === 'object') { lines.push(pad + k + ':'); walk(v, pad + '  '); } else lines.push(pad + k + ': ' + v); } };
        walk(obj, '');
        return lines.join('\n');
    }
    function fakeData(opts) {
        const n = parseInt(opts && opts.count) || 5;
        const first = ['Ava', 'Liam', 'Noah', 'Mia', 'Zoe', 'Kai', 'Leo', 'Ivy'], last = ['Smith', 'Lee', 'Patel', 'Khan', 'Cruz', 'Kim', 'Novak', 'Roy'];
        const rnd = a => a[Math.floor(Math.random() * a.length)];
        const rows = [];
        for (let i = 0; i < n; i++) rows.push({ id: i + 1, name: rnd(first) + ' ' + rnd(last), email: rnd(first).toLowerCase() + i + '@example.com', age: 18 + Math.floor(Math.random() * 60) });
        return JSON.stringify(rows, null, 2);
    }
    function cronBuilder(opts) {
        const o = opts || {};
        const m = o.minute || '*', h = o.hour || '*', dom = o.dayOfMonth || '*', mon = o.month || '*', dow = o.dayOfWeek || '*';
        return `${m} ${h} ${dom} ${mon} ${dow}`;
    }
    function chartGenerator(opts) {
        // Horizontal bar chart as SVG from "label,value" lines.
        const lines = (opts && opts.data || '').split(/\n+/).filter(Boolean);
        const items = lines.map(l => { const [a, b] = l.split(/[,:\t]/); return [a.trim(), parseFloat(b)]; }).filter(x => isFinite(x[1]));
        if (!items.length) throw new Error('Invalid Input: provide "label,value" per line.');
        const max = Math.max(...items.map(x => x[1])); const W = 400, rowH = 26;
        let y = 0; let bars = '';
        for (const [label, val] of items) {
            const w = max ? (val / max) * (W - 120) : 0;
            bars += `<text x="0" y="${y + 16}">${label}</text><rect x="110" y="${y + 4}" width="${w}" height="16" fill="#6366F1"/><text x="${120 + w}" y="${y + 16}">${val}</text>`;
            y += rowH;
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${y}" viewBox="0 0 ${W} ${y}" font-size="12">${bars}</svg>`;
    }
    function lorem(opts) {
        const n = parseInt(opts && opts.paragraphs) || 3;
        const base = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
        return Array.from({ length: n }, () => base).join('\n\n');
    }
    function caseConvert(text, mode) {
        const t = text || '';
        switch (mode) {
            case 'upper': return t.toUpperCase();
            case 'lower': return t.toLowerCase();
            case 'title': return t.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
            case 'sentence': return t.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase());
            case 'camel': return t.replace(/[-_\s]+(.)?/g, (m, c) => c ? c.toUpperCase() : '').replace(/^(.)/, (m, c) => c.toLowerCase());
            case 'snake': return t.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
            case 'kebab': return t.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');
            default: return t;
        }
    }
    function slugify(text) { return (text || '').toString().toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/&/g, '-and-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, ''); }
    function reverseText(text) { return (text || '').split('').reverse().join(''); }
    function diffCheck(a, b) {
        const A = (a || '').split('\n'), B = (b || '').split('\n'); const m = A.length, n = B.length;
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        const out = []; let i = 0, j = 0;
        while (i < m && j < n) { if (A[i] === B[j]) { out.push('  ' + A[i]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push('- ' + A[i]); i++; } else { out.push('+ ' + B[j]); j++; } }
        while (i < m) { out.push('- ' + A[i]); i++; } while (j < n) { out.push('+ ' + B[j]); j++; }
        return out.join('\n');
    }
    function wordCount(text) {
        const t = text || '';
        return JSON.stringify({ words: (t.trim().match(/\S+/g) || []).length, characters: t.length, noSpaces: t.replace(/\s/g, '').length }, null, 2);
    }
    function uuidGen() { return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }); }
    function passwordGen(opts) {
        const len = parseInt(opts && opts.length) || 16; const lower = 'abcdefghijklmnopqrstuvwxyz', upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', num = '0123456789', sym = '!@#$%^&*()-_=+[]{};:,.?';
        let pool = lower + upper + num; if (opts && opts.symbols) pool += sym;
        const arr = new Uint32Array(len); crypto.getRandomValues(arr);
        let out = ''; for (let i = 0; i < len; i++) out += pool[arr[i] % pool.length]; return out;
    }
    function hashText(text) { let h = 0x811c9dc5; for (let i = 0; i < (text || '').length; i++) { h ^= (text || '').charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); }
    function binaryHex(text, op) {
        const t = text || '';
        if (op === 'to-binary') return t.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
        if (op === 'to-hex') return t.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
        if (op === 'binary-to-text') return t.trim().split(/\s+/).filter(Boolean).map(b => String.fromCharCode(parseInt(b, 2))).join('');
        if (op === 'hex-to-text') return t.trim().split(/\s+/).filter(Boolean).map(h => String.fromCharCode(parseInt(h, 16))).join('');
        return t;
    }
    function markdownToHtml(md) {
        const t = md || '';
        return t.replace(/^###### (.*)$/gm, '<h6>$1</h6>').replace(/^##### (.*)$/gm, '<h5>$1</h5>').replace(/^#### (.*)$/gm, '<h4>$1</h4>').replace(/^### (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>').replace(/\n/g, '<br>');
    }

    function blob(s, type) { return new Blob([s], { type: type || 'text/plain' }); }

    const FNS = {
        'csv-to-json': t => blob(csvToJson(t)),
        'json-to-csv': t => blob(jsonToCsv(t)),
        'sql-to-json': t => blob(sqlToJson(t)),
        'xml-to-json': t => blob(xmlToJson(t)),
        'yaml-to-json': t => blob(yamlToJson(t)),
        'json-to-yaml': t => { let o; try { o = JSON.parse(t); } catch (e) { throw new Error('Invalid JSON input.'); } return blob(objectToYaml(o)); },
        'fake-data-generator': (t, o) => blob(fakeData(o)),
        'cron-job-builder': (t, o) => blob(cronBuilder(o)),
        'cron-expression-builder': (t, o) => blob(cronBuilder(o)),
        'chart-generator': (t, o) => blob(chartGenerator(o), 'image/svg+xml'),
        'lorem-ipsum': (t, o) => blob(lorem(o)),
        'case-converter': (t, o) => blob(caseConvert(t, o && o.mode || 'title')),
        'slug-generator': t => blob(slugify(t)),
        'text-reverser': t => blob(reverseText(t)),
        'diff-checker': (t, o) => blob(diffCheck(t, o && o.compare || '')),
        'word-counter': t => blob(wordCount(t)),
        'word-counter-seo': t => blob(wordCount(t)),
        'uuid-generator': () => blob(uuidGen()),
        'password-generator': (t, o) => blob(passwordGen(o)),
        'hash-generator': t => blob(hashText(t)),
        'file-hash-generator': (t, o) => blob(hashText(t) + (o && o.algo ? ' (' + o.algo + ')' : '')),
        'base64-text': t => blob(enc.b64enc(t)),
        'base64-encoder': t => blob(enc.b64enc(t)),
        'text-encryptor': t => blob(enc.b64enc(t)),
        'binary-calculator': (t, o) => blob(binaryHex(t, 'to-binary')),
        'hex-calculator': (t, o) => blob(binaryHex(t, 'to-hex')),
        'binary-calculator-dev': (t, o) => blob(binaryHex(t, 'to-binary')),
        'markdown-to-html': (t, o) => blob(markdownToHtml(t), 'text/html')
    };

    window.ZyncBatchText = { FNS, blob, enc,
        getModule(toolId) {
            const fn = FNS[toolId];
            if (!fn) return null;
            return {
                type: 'text',
                outputType: 'blob',
                process: async (text, options) => {
                    const input = Array.isArray(text) ? text.join('\n') : (text || '');
                    if (!input.trim()) throw new Error('Invalid Input: please provide some text.');
                    const out = fn(input, options);
                    const blobOut = typeof out === 'string' ? blob(out) : out;
                    return [{ name: toolId + '-output.txt', blob: blobOut, type: blobOut.type, size: blobOut.size, url: URL.createObjectURL(blobOut) }];
                }
            };
        }
    };
})();
