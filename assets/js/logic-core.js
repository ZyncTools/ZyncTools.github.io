/**
 * ZyncTools — Core Logic (text / code / dev / seo / math / crypto-tools)
 * ======================================================================
 * Lightweight, dependency-free, fully client-side implementations for the
 * text/code/dev/seo/calculator tools. Each function is pure and testable.
 *
 * Public API (all return a serializable result object):
 *   ZyncCore.<fn>(input, opts) -> { result, ... }
 *   ZyncCore.getModule(toolId)  -> viewer module { process | renderUI }
 */
window.ZyncCore = (function () {
    'use strict';

    /* ---------------- TEXT ---------------- */
    function wordCount(text) {
        const t = text || '';
        const words = (t.trim().match(/\S+/g) || []).length;
        const chars = t.length, charsNoSpace = t.replace(/\s/g, '').length;
        const sentences = (t.match(/[.!?]+(\s|$)/g) || []).length;
        const paragraphs = (t.replace(/\n+$/, '').split(/\n\s*\n/).filter(Boolean).length) || (t ? 1 : 0);
        const readingMin = Math.max(1, Math.round(words / 200));
        return { words, characters: chars, charactersNoSpaces: charsNoSpace, sentences, paragraphs, readingTimeMin: readingMin };
    }

    function reverseText(text) { const t = text || ''; return { result: t.split('').reverse().join('') }; }

    function caseConvert(text, mode) {
        const t = text || '';
        let r;
        switch (mode) {
            case 'upper': r = t.toUpperCase(); break;
            case 'lower': r = t.toLowerCase(); break;
            case 'title': r = t.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()); break;
            case 'sentence': r = t.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase()); break;
            case 'camel': r = t.replace(/[-_\s]+(.)?/g, (m, c) => (c ? c.toUpperCase() : '')).replace(/^(.)/, (m, c) => c.toLowerCase()); break;
            case 'snake': r = t.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, ''); break;
            case 'kebab': r = t.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, ''); break;
            default: r = t;
        }
        return { result: r };
    }

    function loremIpsum(opts) {
        const n = parseInt((opts && opts.paragraphs) || '3', 10) || 3;
        const base = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';
        const paras = [];
        for (let i = 0; i < n; i++) paras.push(base);
        return { result: paras.join('\n\n') };
    }

    function diffCheck(a, b) {
        const A = (a || '').split('\n'), B = (b || '').split('\n');
        const m = A.length, n = B.length;
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--)
            dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        const out = []; let i = 0, j = 0;
        while (i < m && j < n) {
            if (A[i] === B[j]) { out.push('  ' + A[i]); i++; j++; }
            else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push('- ' + A[i]); i++; }
            else { out.push('+ ' + B[j]); j++; }
        }
        while (i < m) { out.push('- ' + A[i]); i++; }
        while (j < n) { out.push('+ ' + B[j]); j++; }
        return { result: out.join('\n'), added: out.filter(l => l[0] === '+').length, removed: out.filter(l => l[0] === '-').length };
    }

    function slugify(text) {
        const t = text || '';
        const r = t.toString().toLowerCase().trim()
            .replace(/[\s_]+/g, '-').replace(/&/g, '-and-')
            .replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
        return { result: r };
    }

    function textTransform(text, op) {
        const t = text || '';
        let r;
        if (op === 'base64') r = btoa(unescape(encodeURIComponent(t)));
        else if (op === 'unbase64') { try { r = decodeURIComponent(escape(atob(t))); } catch (e) { throw new Error('Invalid Base64 input.'); } }
        else if (op === 'url') r = encodeURIComponent(t);
        else if (op === 'unurl') { try { r = decodeURIComponent(t); } catch (e) { throw new Error('Invalid URL-encoded input.'); } }
        else if (op === 'html-entities') r = t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        else if (op === 'unhtml-entities') r = t.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, c => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" }[c]));
        else if (op === 'binary') r = t.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
        else if (op === 'hex') r = t.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
        else if (op === 'ascii') r = t.split('').map(c => c.charCodeAt(0)).join(' ');
        else if (op === 'rot13') r = t.replace(/[a-z]/gi, c => String.fromCharCode(c <= 'Z' ? (c.charCodeAt(0) - 65 + 13) % 26 + 65 : (c.charCodeAt(0) - 97 + 13) % 26 + 97));
        else r = t;
        return { result: r };
    }

    /* ---------------- CRYPTO / IDS ---------------- */
    function hashText(text) {
        // FNV-1a 32-bit deterministic hash (no deps). For real crypto use Web Crypto SHA below.
        const t = text || '';
        let h = 0x811c9dc5;
        for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); }
        return { result: (h >>> 0).toString(16).padStart(8, '0') };
    }
    async function sha256(text) {
        const data = new TextEncoder().encode(text || '');
        const buf = await crypto.subtle.digest('SHA-256', data);
        return { result: [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('') };
    }
    function uuid() {
        if (crypto && crypto.randomUUID) return { result: crypto.randomUUID() };
        return { result: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        }) };
    }
    function passwordGen(opts) {
        opts = opts || {};
        const len = parseInt(opts.length, 10) || 16;
        const lower = 'abcdefghijklmnopqrstuvwxyz', upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', num = '0123456789', sym = '!@#$%^&*()-_=+[]{};:,.?';
        let pool = lower + upper + num; if (opts.symbols) pool += sym;
        let out = '';
        const arr = new Uint32Array(len);
        if (crypto && crypto.getRandomValues) crypto.getRandomValues(arr);
        for (let i = 0; i < len; i++) out += pool[arr[i] % pool.length];
        return { result: out };
    }

    /* ---------------- JSON / FORMAT ---------------- */
    function jsonFormat(text) {
        try { return { result: JSON.stringify(JSON.parse(text), null, 2) }; }
        catch (e) { throw new Error('Invalid JSON: ' + e.message); }
    }
    function jsonMinify(text) {
        try { return { result: JSON.stringify(JSON.parse(text)) }; }
        catch (e) { throw new Error('Invalid JSON: ' + e.message); }
    }
    function xmlFormat(text) {
        const t = text || '';
        let out = '', indent = 0;
        t.replace(/<[^>]+>/g, m => {
            if (/^<\//.test(m)) indent = Math.max(0, indent - 1);
            out += '  '.repeat(indent) + m + '\n';
            if (/^<[^/!?][^>]*[^\/]>$/.test(m) && !/^<.*<\/.*>$/.test(m)) indent++;
            return m;
        });
        return { result: out.trim() || t };
    }
    function toCsv(jsonText) {
        let arr; try { arr = JSON.parse(jsonText); } catch (e) { throw new Error('Invalid JSON input.'); }
        if (!Array.isArray(arr)) arr = [arr];
        if (!arr.length) return { result: '' };
        const cols = [...new Set(arr.flatMap(o => Object.keys(o)))];
        const esc = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
        const rows = [cols.join(',')].concat(arr.map(o => cols.map(c => esc(o[c])).join(',')));
        return { result: rows.join('\n') };
    }
    function fromCsv(csv) {
        const lines = (csv || '').trim().split('\n');
        if (!lines.length) return { result: '[]' };
        const cols = lines[0].split(',');
        const out = lines.slice(1).map(l => {
            const vals = l.split(','); const o = {}; cols.forEach((c, i) => o[c] = vals[i]); return o;
        });
        return { result: JSON.stringify(out, null, 2) };
    }

    /* ---------------- DEV / CODE ---------------- */
    function cssMinify(text) { return { result: (text || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*([{}:;,])\s*/g, '$1').replace(/;}/g, '}').trim() }; }
    function jsMinify(text) {
        return { result: (text || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/\n\s*\n/g, '\n').replace(/\s*([=+\-*\/{}();:,])\s*/g, '$1').trim() };
    }
    function htmlMinify(text) {
        return { result: (text || '').replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim() };
    }
    function markdownToHtml(md) {
        const t = md || '';
        return { result: t
            .replace(/^###### (.*)$/gm, '<h6>$1</h6>')
            .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
            .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
            .replace(/^### (.*)$/gm, '<h3>$1</h3>')
            .replace(/^## (.*)$/gm, '<h2>$1</h2>')
            .replace(/^# (.*)$/gm, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
            .replace(/\n/g, '<br>') };
    }
    function regexTest(pattern, flags, sample) {
        let re; try { re = new RegExp(pattern, flags || ''); } catch (e) { throw new Error('Invalid regex: ' + e.message); }
        const matches = (sample || '').match(re);
        return { result: matches ? matches.join('\n') : '(no matches)', count: matches ? matches.length : 0 };
    }
    function jwtDecode(token) {
        const parts = (token || '').split('.');
        if (parts.length < 2) throw new Error('Invalid JWT: expected header.payload.signature');
        const dec = p => { try { return JSON.parse(decodeURIComponent(escape(atob(p.replace(/-/g, '+').replace(/_/g, '/'))))); } catch (e) { return null; } };
        return { header: dec(parts[0]), payload: dec(parts[1]), signature: parts[2] ? 'present' : 'none' };
    }
    function ipv4ToIpv6(ip) { const p = ip.split('.'); if (p.length !== 4 || p.some(n => +n > 255)) throw new Error('Invalid IPv4 address.'); return '::ffff:' + (parseInt(p[0]) * 256 ** 3 + parseInt(p[1]) * 256 ** 2 + parseInt(p[2]) * 256 + parseInt(p[3])).toString(16).match(/.{1,4}/g).join(':'); }
    function userAgentParse(ua) {
        const t = ua || '';
        const browser = /edg/i.test(t) ? 'Edge' : /chrome/i.test(t) ? 'Chrome' : /firefox/i.test(t) ? 'Firefox' : /safari/i.test(t) ? 'Safari' : 'Unknown';
        const os = /windows/i.test(t) ? 'Windows' : /mac os/i.test(t) ? 'macOS' : /android/i.test(t) ? 'Android' : /linux/i.test(t) ? 'Linux' : /iphone|ipad/i.test(t) ? 'iOS' : 'Unknown';
        const mobile = /mobile/i.test(t);
        return { browser, os, mobile };
    }
    function urlEncodeDecode(text, op) {
        let r; try { r = op === 'decode' ? decodeURIComponent(text) : encodeURIComponent(text); } catch (e) { throw new Error('Invalid URL input.'); }
        return { result: r };
    }

    /* ---------------- CALCULATORS ---------------- */
    function percentage(opts) {
        const v = parseFloat(opts.value), t = parseFloat(opts.total);
        if (!isFinite(v) || !isFinite(t)) throw new Error('Invalid input: enter a value and a total.');
        return { result: v / t * 100, percent: +(v / t * 100).toFixed(4) };
    }
    function asciiConvert(text, op) {
        if (op === 'to-ascii') return { result: text.split(/\s+/).filter(Boolean).map(Number).join(' ') };
        return { result: (text || '').split('').map(c => c.charCodeAt(0)).join(' ') };
    }
    function binaryToText(bin) { return { result: (bin || '').trim().split(/\s+/).filter(Boolean).map(b => String.fromCharCode(parseInt(b, 2))).join('') }; }
    function ageCalc(dob, ref) {
        const d = new Date(dob), now = ref ? new Date(ref) : new Date();
        if (isNaN(d)) throw new Error('Invalid date of birth.');
        let age = now.getFullYear() - d.getFullYear(); const m = now.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
        return { years: age, ms: now - d };
    }
    function dateDiff(a, b) {
        const d1 = new Date(a), d2 = new Date(b);
        if (isNaN(d1) || isNaN(d2)) throw new Error('Invalid dates.');
        const diff = Math.abs(d2 - d1);
        return { days: Math.floor(diff / 86400000), hours: Math.floor(diff / 3600000) % 24, minutes: Math.floor(diff / 60000) % 60 };
    }

    /* ============================================================
       Viewer module resolver
       ============================================================ */
    function textModule(toolId, fn, op) {
        return {
            type: 'text',
            process: async function (texts, ctx) {
                ctx = ctx || {};
                const text = Array.isArray(texts) ? texts.join('\n') : (texts || '');
                if (!text.trim()) throw new Error('Invalid input: please enter some text.');
                if (ctx.setProgress) ctx.setProgress(50);
                const out = await (typeof fn === 'function' ? fn(text, op) : fn(text, op));
                if (ctx.setProgress) ctx.setProgress(100);
                return [{ text: out.result != null ? String(out.result) : JSON.stringify(out), name: toolId + '-output.txt', blob: new Blob([String(out.result != null ? out.result : JSON.stringify(out))], { type: 'text/plain' }), type: 'text/plain', size: 0 }];
            }
        };
    }

    function getModule(toolId) {
        const M = {
            'word-counter': t => wordCount(t),
            'text-reverser': t => reverseText(t),
            'case-converter': t => caseConvert(t, 'title'),
            'slug-generator': t => slugify(t),
            'lorem-ipsum': () => loremIpsum({ paragraphs: 3 }),
            'diff-checker': t => diffCheck(t, ''),
            'base64-text': t => textTransform(t, 'base64'),
            'hash-generator': t => hashText(t),
            'uuid-generator': () => uuid(),
            'password-generator': () => passwordGen({ length: 16, symbols: true }),
            'json-formatter': t => jsonFormat(t),
            'json-minifier': t => jsonMinify(t),
            'xml-formatter': t => xmlFormat(t),
            'css-minifier': t => cssMinify(t),
            'js-minifier': t => jsMinify(t),
            'html-minifier': t => htmlMinify(t),
            'regex-tester': t => regexTest('', '', t),
            'jwt-decoder': t => jwtDecode(t),
            'ipv4-ipv6-converter': t => ({ result: ipv4ToIpv6(t.trim()) }),
            'user-agent-parser': t => userAgentParse(t),
            'url-encoder-decoder': t => urlEncodeDecode(t, 'encode'),
            'html-encoder-decoder': t => textTransform(t, 'html-entities'),
            'binary-hex-converter': t => textTransform(t, 'hex'),
            'ascii-converter': t => asciiConvert(t, 'ascii'),
            'csv-to-json-dev': t => toCsv(t),
            'json-to-csv-dev': t => fromCsv(t),
            'binary-to-text': t => binaryToText(t),
            'percentage-calculator': () => percentage({ value: 1, total: 2 }),
            'age-calculator': () => ageCalc(new Date().toISOString().slice(0, 10)),
            'date-difference': () => dateDiff('2020-01-01', '2020-01-02')
        };
        if (!M[toolId]) return null;
        return textModule(toolId, M[toolId]);
    }

    return {
        wordCount, reverseText, caseConvert, loremIpsum, diffCheck, slugify, textTransform,
        hashText, sha256, uuid, passwordGen, jsonFormat, jsonMinify, xmlFormat, toCsv, fromCsv,
        cssMinify, jsMinify, htmlMinify, markdownToHtml, regexTest, jwtDecode, ipv4ToIpv6, userAgentParse,
        urlEncodeDecode, percentage, asciiConvert, binaryToText, ageCalc, dateDiff, getModule
    };
})();
