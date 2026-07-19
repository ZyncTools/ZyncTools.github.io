/**
 * ZyncTools — Batch Logic: EXTRA text, security, dev-utils
 * ========================================================
 * • text/number converters: binary/octal/decimal/hex, ascii art
 * • color contrast (WCAG), html-to-markdown, url-parser
 * • json/xml/ini/toml ↔ json
 * • csv bidirectional, wifi-qr, chart (simple bar/line)
 * • security hashes: MD5 (FNV approx), SHA-1/256, HMAC
 * • dev-utils: ascii-table, lorem-ipsum, password/qr/barcode generators
 * Each process(input, options) -> Promise<Blob|string>
 */
(function () {
    'use strict';

    function hex(n) { return n.toString(16).padStart(2, '0'); }
    function rgbToHex(r, g, b) { return '#' + hex(r) + hex(g) + hex(b); }
    function hexToRgb(h) { const sh = h.replace('#', ''); return [parseInt(sh.slice(0,2),16), parseInt(sh.slice(2,4),16), parseInt(sh.slice(4,6),16)]; }

    // ----------------- NUMBER BASE -----------------
    function numberBase(input, opts) {
        const from = (opts && opts.from) || 'dec'; const to = (opts && opts.to) || 'bin';
        const n = parseFloat(input); if (!isFinite(n)) throw new Error('Invalid Input: not a number.');
        let s; if (from === 'bin') s = n.toString(2);
        else if (from === 'oct') s = n.toString(8);
        else if (from === 'dec') s = n.toString(10);
        else if (from === 'hex') s = n.toString(16);
        else throw new Error('Invalid Input: unknown base.');
        if (to === 'bin') return parseInt(s, 2).toString(2);
        if (to === 'oct') return parseInt(s, 2).toString(8);
        if (to === 'dec') return parseInt(s, 2).toString(10);
        if (to === 'hex') return parseInt(s, 2).toString(16);
        return s;
    }

    // ----------------- ASCII ART -----------------
    const ASCII_MAP = {
        standard: [ '@', '#', 'S', '%', '?', '*', '+', ';', ':', ',', '.' ],
        simple: [ '@', '%', '#', '*', '+', '=', '-', ':', '.', ' ' ]
    };
    function asciiArt(input, opts) {
        const txt = input || ''; const w = parseInt(opts && opts.width) || 80;
        const mode = (opts && opts.mode) || 'standard'; const map = ASCII_MAP[mode] || ASCII_MAP.standard;
        return { text: txt.split('\n').map(line => {
            if (!line) return '';
            const out = []; for (let i = 0; i < line.length; i++) { const c = line.charCodeAt(i); const idx = Math.floor((c / 256) * (map.length - 1)); out.push(m[idx]); } return out.join('');
        }).join('\n'), type: 'text/plain', ext: 'txt' };
    }

    // ----------------- COLOR CONTRAST -----------------
    function contrastRatio(rgb1, rgb2) {
        const lum = ([r,g,b]) => { const sRGB = [r/255,g/255,b/255].map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4)); return 0.2126*sRGB[0] + 0.7152*sRGB[1] + 0.0722*sRGB[2]; };
        const L1 = lum(rgb1) + 0.05, L2 = lum(rgb2) + 0.05; return Math.max(L1,L2) / Math.min(L1,L2);
    }
    function colorContrastChecker(input, opts) {
        const a = input && input.length >= 2 ? input[0] : '#ffffff';
        const b = input && input.length >= 2 ? input[1] : '#000000';
        const ra = hexToRgb(a), rb = hexToRgb(b);
        const cr = contrastRatio(ra, rb);
        const aa = cr >= 4.5 ? 'AA' : 'FAIL'; const aaa = cr >= 7 ? 'AAA' : 'FAIL';
        return { text: JSON.stringify({ color1: a, color2: b, contrast: cr.toFixed(2), AA: aa, AAA: aaa }, null, 2), type: 'text/plain', ext: 'txt' };
    }

    // ----------------- HTML TO MARKDOWN -----------------
    function htmlToMarkdown(input) {
        const txt = input || '';
        let out = txt.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
                     .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
                     .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
                     .replace(/<h4>(.*?)<\/h4>/gi, '#### $1\n\n')
                     .replace(/<h5>(.*?)<\/h5>/gi, '##### $1\n\n')
                     .replace(/<h6>(.*?)<\/h6>/gi, '###### $1\n\n')
                     .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
                     .replace(/<br\s*\/?>/gi, '\n')
                     .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
                     .replace(/<b>(.*?)<\/b>/gi, '**$1**')
                     .replace(/<em>(.*?)<\/em>/gi, '*$1*')
                     .replace(/<i>(.*?)<\/i>/gi, '*$1*')
                     .replace(/<ul>/gi, '').replace(/<\/ul>/gi, '\n')
                     .replace(/<ol>/gi, '').replace(/<\/ol>/gi, '\n')
                     .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
                     .replace(/<a\s[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
                     .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '```\n$1\n```\n')
                     .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
                     .replace(/&nbsp;/g, ' ').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'");
        return { text: out.trim(), type: 'text/plain', ext: 'md' };
    }

    // ----------------- URL PARSER -----------------
    function urlParser(input) {
        try { const u = new URL(input || 'https://example.com'); return { text: JSON.stringify({ href: u.href, protocol: u.protocol, host: u.host, hostname: u.hostname, port: u.port, pathname: u.pathname, search: u.search, hash: u.hash }, null, 2), type: 'text/plain', ext: 'txt' }; }
        catch (e) { throw new Error('Invalid URL.'); }
    }

    // ----------------- JSON/XML/INI/TOML <-> JSON -----------------
    function xmlToJson(x) {
        const js = (x || '').trim(); if (!js) throw new Error('Invalid Input: empty XML.');
        const parser = new DOMParser(); const doc = parser.parseFromString(js, 'application/xml');
        if (doc.querySelector('parsererror')) throw new Error('Invalid XML.');
        function walk(n) { if (n.nodeType === 3) return n.nodeValue.trim(); const obj = {}; if (n.attributes) for (let i=0;i<n.attributes.length;i++) { const att=n.attributes[i]; obj['@'+att.name]=att.value; } for (let c=n.firstChild;c;c=c.nextSibling) { if (c.nodeType===3) { const t=c.nodeValue.trim(); if(t){if(!obj['#text'])obj['#text']=t;else{if(!Array.isArray(obj['#text']))obj['#text']=[obj['#text']];obj['#text'].push(t);}} } else { const name=c.nodeName; const val=walk(c); if(obj[name]){if(!Array.isArray(obj[name]))obj[name]=[obj[name]];obj[name].push(val);}else obj[name]=val; } } return obj; }
        return JSON.stringify(walk(doc.documentElement), null, 2);
    }
    function jsonToXml(j) {
        const obj = JSON.parse(j || '{}');
        function toXml(name, o) { if (typeof o === 'string' || typeof o === 'number') return `<${name}>${o}</${name}>`; let s = `<${name}>`; for (const k in o) { if (k === '@') continue; if (k.startsWith('@')) { s += ' ' + k.slice(1) + '="' + o[k] + '"'; } else { s += toXml(k, o[k]); } } return s + `</${name}>`; }
        return '<?xml version="1.0" encoding="UTF-8"?>\n' + Object.keys(obj).map(k => toXml(k, obj[k])).join('\n');
    }
    function iniToJson(i) {
        const lines = (i || '').split(/\r?\n/); const root = {}; let section = null;
        for (const line of lines) {
            const t = line.trim(); if (!t || /^#/.test(t)) continue;
            const m = t.match(/^\[(.*)\]$/); if (m) { section = m[1]; if (!(section in root)) root[section] = {}; continue; }
            const kv = t.match(/^([^=]+)=(.*)$/); if (kv) { const key = kv[1].trim(), val = kv[2].trim(); (section ? root[section] : root)[key] = val; }
        }
        return JSON.stringify(root, null, 2);
    }
    function jsonToIni(j) {
        const obj = JSON.parse(j || '{}'); let out = '';
        for (const k in obj) { if (typeof obj[k] === 'object' && !Array.isArray(obj[k])) { out += '[' + k + ']\n'; for (const ik in obj[k]) out += ik + '=' + obj[k][ik] + '\n'; out += '\n'; } else { out += k + '=' + obj[k] + '\n'; } }
        return out.trim();
    }
    function tomlToJson(t) {
        // Very basic: key = value, [section]
        const lines = (t || '').split(/\r?\n/); const root = {}; let section = null;
        for (const line of lines) {
            const ln = line.trim(); if (!ln || /^#/.test(ln)) continue;
            if (/^\[.*\]$/.test(ln)) { section = ln.slice(1,-1); if (!(section in root)) root[section] = {}; continue; }
            const m = ln.match(/^([^=]+)=(.*)$/); if (m) { const key = m[1].trim(), val = m[2].trim(); (section ? root[section] : root)[key] = val; }
        }
        return JSON.stringify(root, null, 2);
    }
    function jsonToToml(j) {
        const obj = JSON.parse(j || '{}'); let out = '';
        for (const k in obj) { if (typeof obj[k] === 'object' && !Array.isArray(obj[k])) { out += '[' + k + ']\n'; for (const ik in obj[k]) out += ik + '=' + obj[k][ik] + '\n'; out += '\n'; } else { out += k + '=' + obj[k] + '\n'; } }
        return out.trim();
    }

    // ----------------- CSV BIDIRECTIONAL -----------------
    function csvToJsonArr(txt) {
        const lines = txt.trim().split(/\r?\n/); if (!lines.length) throw new Error('Invalid Input: empty CSV.');
        const heads = lines[0].split(',').map(h=>h.trim());
        return lines.slice(1).map(l=>{ const vals=l.split(','); const o={}; heads.forEach((h,i)=>o[h]=vals[i]||''); return o; });
    }
    function jsonToCsvArr(obj) {
        if (!Array.isArray(obj)) obj = [obj];
        if (!obj.length) return '';
        const heads = [...new Set(obj.flatMap(o=>Object.keys(o)))];
        const esc = s=>{ s=String(s); return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
        return [heads.map(h=>esc(h)).join(',')].concat(obj.map(o=>heads.map(h=>esc(o[h]||'')).join(','))).join('\n');
    }
    function csvJson(input, opts) {
        const txt = input || ''; if (opts && opts.direction === 'json-to-csv') return { text: jsonToCsvArr(JSON.parse(txt)), type: 'text/plain', ext: 'csv' };
        return { text: JSON.stringify(csvToJsonArr(txt), null, 2), type: 'text/plain', ext: 'json' };
    }

    // ----------------- WIFI QR -----------------
    function wifiQr(input, opts) {
        const ssid = (opts && opts.ssid) || 'MyNetwork';
        const auth = (opts && opts.auth) || 'WPA';
        const pwd = (opts && opts.password) || '';
        const hidden = (opts && opts.hidden) ? 'true' : 'false';
        const str = `WIFI:T:${auth};S:${ssid};P:${pwd};H:${hidden};;`;
        return { text: str, type: 'text/plain', ext: 'txt' };
    }

    // ----------------- SIMPLE CHART -----------------
    function simpleChart(input, opts) {
        const lines = (input || '').split(/\n+/).filter(l=>l.trim()); const data = lines.map(l=>{ const p=l.split(/,|:/); return {label:p[0].trim(), value:parseFloat(p[1])}; }).filter(d=>!isNaN(d.value));
        if (!data.length) throw new Error('Invalid Input: provide "label,value" per line.');
        const max = Math.max(...data.map(d=>d.value)); const w = 600, barH = 20, pad = 20;
        const h = pad*2 + data.length*(barH+10);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`;
        let y = pad;
        for (const d of data) { const pw = max ? (d.value/max)*(w-2*pad) : 0; svg += `<rect x="${pad}" y="${y}" width="${pw}" height="${barH}" fill="#6366F1"/><text x="${pad+5}" y="${y+14}" font-size="12">${d.label}</text><text x="${pad+pw+5}" y="${y+14}" font-size="12">${d.value}</text>`; y += barH+10; }
        return { text: svg + '</svg>', type: 'image/svg+xml', ext: 'svg' };
    }

    // ----------------- HASHES (FNV-1a + Web Crypto) -----------------
    function hashFnv(text) { let h=0x811c9dc5; for (let i=0;i<(text||'').length;i++){h^=(text||'').charCodeAt(i);h=Math.imul(h,0x01000193);} return (h>>>0).toString(16).padStart(8,'0'); }
    async function hashSha(text, alg) { const buf = await crypto.subtle.digest('SHA-'+alg.toUpperCase(), new TextEncoder().encode(text||'')); return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
    async function hmacSha(text, keyVal, alg) { const keyBuf = new TextEncoder().encode(keyVal||''); const msgBuf = new TextEncoder().encode(text||''); const key = await crypto.subtle.importKey('raw', keyBuf, {name:'HMAC',hash:{name:'SHA-'+alg.toUpperCase()}},false,['sign']); const sig = await crypto.subtle.sign('HMAC', key, msgBuf); return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join(''); }

    const H = {
        'number-base-converter': (t, o) => numberBase(t, o),
        'ascii-art-generator': (t, o) => asciiArt(t, o),
        'html-to-markdown': t => htmlToMarkdown(t),
        'url-parser': t => urlParser(t),
        'json-to-xml': t => ({ text: xmlToJson(t), type: 'application/xml', ext: 'xml' }),
        'xml-to-json': t => ({ text: xmlToJson(t), type: 'application/json', ext: 'json' }),
        'ini-to-json': t => ({ text: iniToJson(t), type: 'application/json', ext: 'json' }),
        'json-to-ini': t => ({ text: jsonToIni(t), type: 'text/plain', ext: 'ini' }),
        'toml-to-json': t => ({ text: tomlToJson(t), type: 'application/json', ext: 'json' }),
        'json-to-toml': t => ({ text: jsonToToml(t), type: 'text/plain', ext: 'toml' }),
        'csv-to-json-bidirectional': (t, o) => csvJson(t, o),
        'wifi-qr-generator': (t, o) => wifiQr(t, o),
        'chart-generator-simple': (t, o) => simpleChart(t, o),
        'md5-generator': t => hashFnv(t),
        'sha-generator': (t, o) => hashSha(t, o && o.alg || '256'),
        'hmac-generator': (t, o) => hmacSha(t, o && o.key || '', o && o.alg || '256'),
        'color-contrast-checker': (t, o) => colorContrastChecker(t && t.split('\n'), o),
        'ascii-table': (t, o) => { const w = (o && o.width) || 80; const h = (o && o.height) || 25; let out = ''; for (let y=0;y<h;y++){for(let x=0;x<w;x++){const c=(x+y)%2?' ':'#';out+=c;}out+='\n';}return {text:out,type:'text/plain',ext:'txt'};},
        'lorem-ipsum-dev': () => { const p = (Array.from({length:3},()=>'Lorem ipsum dolor sit amet.').join(' ')); return {text:p,type:'text/plain',ext:'txt'};},
        'password-generator-dev': (t,o)=>{const l=(o&&o.length)||16;const a='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';const r=new Uint32Array(l);crypto.getRandomValues(r);let out='';for(let i=0;i<l;i++)out+=a[r[i]%a.length];return {text:out,type:'text/plain',ext:'txt'};},
        'qr-code-generator-dev': (t,o)=>{if(!window.QRCode)throw new Error('QRCode not loaded.');return {text:window.QRCode.toDataURL(t||'https://example.com',{width:200}),type:'text/plain',ext:'txt'};},
        'barcode-generator-dev': (t,o)=>{if(!window.JsBarcode)throw new Error('JsBarcode not loaded.');const c=document.createElement('canvas');window.JsBarcode(c,t||'1234567890',{format:(o&&o.format)||'CODE128'});return {text:c.toDataURL(),type:'text/plain',ext:'txt'};}
    };

    // helper wrappers
    window.ZyncBatchExtra = { H,
        getModule(toolId) {
            const fn = H[toolId]; if (!fn) return null;
            return {
                type: ['xml-to-json','json-to-xml','ini-to-json','json-to-ini','toml-to-json','json-to-toml'].includes(toolId) ? 'text' : 'text',
                outputType: 'blob',
                process: async (files, options) => {
                    const txt = Array.isArray(files) ? files.join('\n\n') : (files || '');
                    const out = fn(txt, options || {});
                    if (typeof out === 'string') { const b = new Blob([out], {type:'text/plain'}); return [{name:toolId+'-out.txt',blob:b,type:b.type,size:b.size,url:URL.createObjectURL(b)}]; }
                    const b = new Blob([out.text], {type:out.type||'text/plain'});
                    return [{name:toolId+'-out.'+(out.ext||'txt'),blob:b,type:b.type,size:b.size,url:URL.createObjectURL(b)}];
                }
            };
        }
    };
})();