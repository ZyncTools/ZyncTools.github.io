/**
 * Correctness checks: run tools directly against known inputs and assert
 * on the actual values they return, not merely that they returned something.
 */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8899';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto(`${BASE}/tool.html?id=word-counter`, { waitUntil: 'networkidle' });

/* Each case: tool id, options, input, and a predicate over the results. */
const CASES = [
  // --- text ---
  ['word-counter', {}, { text: 'one two three four five' },
    r => find(r, 'Words') === '5'],
  ['case-converter', { mode: 'snake' }, { text: 'Hello World Again' },
    r => r[0].text === 'hello_world_again'],
  ['case-converter', { mode: 'camel' }, { text: 'hello world again' },
    r => r[0].text === 'helloWorldAgain'],
  ['case-converter', { mode: 'kebab' }, { text: 'Hello World' },
    r => r[0].text === 'hello-world'],
  ['text-reverser', { mode: 'characters' }, { text: 'abc' },
    r => r[0].text === 'cba'],
  ['text-reverser', { mode: 'words' }, { text: 'one two three' },
    r => r[0].text === 'three two one'],
  ['slug-generator', { separator: '-', lowercase: true, perLine: false }, { text: 'Héllo World! 2026' },
    r => r[0].text === 'hello-world-2026'],
  ['find-replace', { find: 'cat', replace: 'dog' }, { text: 'cat cat bird' },
    r => r[0].text === 'dog dog bird'],
  ['line-sorter', { order: 'alpha-asc' }, { text: 'banana\napple\ncherry' },
    r => r[0].text === 'apple\nbanana\ncherry'],
  ['duplicate-line-finder', { mode: 'remove' }, { text: 'a\nb\na\nc\nb' },
    r => r[0].text === 'a\nb\nc'],
  ['caesar-cipher', { shift: 13, direction: 'encode' }, { text: 'Hello' },
    r => r[0].text === 'Uryyb'],
  ['caesar-cipher', { shift: 13, direction: 'decode' }, { text: 'Uryyb' },
    r => r[0].text === 'Hello'],
  ['morse-code-translator', { direction: 'encode' }, { text: 'sos' },
    r => r[0].text === '... --- ...'],
  ['text-cleaner', { collapseSpaces: true, trimLines: true }, { text: '  a    b  ' },
    r => r[0].text === 'a b'],

  // --- converters ---
  ['base64-encoder', { direction: 'encode' }, { text: 'Hello' },
    r => r[0].text === 'SGVsbG8='],
  ['base64-encoder', { direction: 'decode' }, { text: 'SGVsbG8=' },
    r => r[0].text === 'Hello'],
  ['base64-encoder', { direction: 'encode' }, { text: 'héllo' },
    r => r[0].text === 'aMOpbGxv'],
  ['url-encoder', { direction: 'encode', scope: 'component' }, { text: 'a b&c' },
    r => r[0].text === 'a%20b%26c'],
  ['html-entity-encoder', { direction: 'encode', scope: 'minimal' }, { text: '<a>&' },
    r => r[0].text === '&lt;a&gt;&amp;'],
  ['number-base-converter', { fromBase: '10' }, { text: '255' },
    r => find(r, 'Hexadecimal (16)') === 'FF' && find(r, 'Octal (8)') === '377'],
  ['number-base-converter', { fromBase: '16' }, { text: 'FF' },
    r => find(r, 'Decimal (10)') === '255'],
  ['text-binary-converter', { direction: 'encode', base: 'binary' }, { text: 'A' },
    r => r[0].text === '01000001'],
  ['text-binary-converter', { direction: 'decode', base: 'hex' }, { text: '48 65 6c 6c 6f' },
    r => r[0].text === 'Hello'],
  ['color-converter', {}, { text: '#FF0000' },
    r => find(r, 'RGB') === 'rgb(255, 0, 0)' && find(r, 'HSL') === 'hsl(0, 100%, 50%)'],
  ['contrast-checker', { foreground: '#000000', background: '#FFFFFF' }, {},
    r => find(r, 'Contrast ratio') === '21.00:1'],

  // --- code / data ---
  ['json-formatter', { mode: 'minified' }, { text: '{ "a" : 1 , "b" : [ 1 , 2 ] }' },
    r => r[0].text === '{"a":1,"b":[1,2]}'],
  ['json-formatter', { mode: 'pretty', indent: '2', sortKeys: true }, { text: '{"b":2,"a":1}' },
    r => r[0].text === '{\n  "a": 1,\n  "b": 2\n}'],
  ['csv-json-converter', { direction: 'csv-to-json', hasHeader: true, parseNumbers: true },
    { text: 'a,b\n1,x' },
    r => JSON.parse(r[0].text)[0].a === 1 && JSON.parse(r[0].text)[0].b === 'x'],
  ['csv-json-converter', { direction: 'json-to-csv', hasHeader: true },
    { text: '[{"a":1,"b":"x, y"}]' },
    r => r[0].text === 'a,b\n1,"x, y"'],
  ['yaml-json-converter', { direction: 'yaml-to-json' }, { text: 'a: 1\nb:\n  - x\n  - y' },
    r => { const o = JSON.parse(r[0].text); return o.a === 1 && o.b[1] === 'y'; }],
  ['css-minifier', { mode: 'minify', shortenHex: true, stripZeroUnits: true },
    { text: '.a {\n  color: #ffffff;\n  margin: 0px;\n}' },
    r => r[0].text === '.a{color:#fff;margin:0}'],
  ['regex-tester', { pattern: '\\d+', global: true }, { text: 'a1b22c333' },
    r => find(r, 'Matches') === '3'],
  ['jwt-decoder', {}, { text: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiQWRhIn0.x' },
    r => find(r, 'Algorithm') === 'HS256'],

  // --- security ---
  ['hash-generator', { allAlgorithms: true, encoding: 'hex' }, { text: 'abc' },
    r => find(r, 'SHA-256') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
      && find(r, 'MD5') === '900150983cd24fb0d6963f7d28e17f72'
      && find(r, 'SHA-1') === 'a9993e364706816aba3e25717850c26c9cd0d89d'],
  ['hmac-generator', { secret: 'key', algorithm: 'SHA-256', encoding: 'hex' },
    { text: 'The quick brown fox jumps over the lazy dog' },
    r => r[0].text === 'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8'],

  // --- math ---
  ['unit-converter', { family: 'length', value: 1, from: 'm', to: 'ft', precision: 4 }, {},
    r => /3\.2808/.test(find(r, '1 Metre') || '')],
  ['unit-converter', { family: 'temperature', value: 100, from: 'c', to: 'f', precision: 2 }, {},
    r => /^212/.test(find(r, '100 Celsius') || '')],
  ['percentage-calculator', { mode: 'of', a: 25, b: 200, precision: 2 }, {},
    r => find(r, '25% of 200') === '50'],
  ['percentage-calculator', { mode: 'change', a: 100, b: 150, precision: 2 }, {},
    r => find(r, 'Change from 100 to 150') === '+50%'],
  ['aspect-ratio-calculator', { mode: 'scale', width: 1920, height: 1080, lock: 'width', newWidth: 1280, round: true }, {},
    r => find(r, 'Scaled size') === '1280 × 720' && find(r, 'Aspect ratio') === '16:9'],
  ['statistics-calculator', { population: 'sample', precision: 4 }, { text: '2,4,4,4,5,5,7,9' },
    r => find(r, 'Mean') === '5' && find(r, 'Median') === '4.5'],
  ['roman-numeral-converter', { direction: 'auto' }, { text: '2026' },
    r => find(r, 'Result') === 'MMXXVI'],
  ['roman-numeral-converter', { direction: 'auto' }, { text: 'MMXXVI' },
    r => find(r, 'Result') === '2026'],

  // --- date/time ---
  ['timestamp-converter', { direction: 'auto', unit: 'auto' }, { text: '0' },
    r => find(r, 'ISO 8601 (UTC)') === '1970-01-01T00:00:00.000Z'],
  ['date-difference-calculator', { start: '2026-01-01', end: '2026-01-31', inclusive: false }, {},
    r => find(r, 'Total days') === '30'],

  // --- seo ---
  ['robots-txt-generator', { preset: 'block-all' }, {},
    r => /User-agent: \*/.test(r[0].text) && /Disallow: \//.test(r[0].text)],
  ['utm-builder', { url: 'https://a.com/p', source: 'News Letter', medium: 'Email', lowercase: true, replaceSpaces: true }, {},
    r => r[0].text === 'https://a.com/p?utm_source=news-letter&utm_medium=email'],

  // --- generators ---
  ['uuid-generator', { version: 'v4', count: 3, format: 'lines' }, {},
    r => r[0].text.split('\n').length === 3
      && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(r[0].text.split('\n')[0])],
  ['password-generator', { style: 'random', length: 24, uppercase: true, lowercase: true, numbers: true, symbols: true, count: 1 }, {},
    r => r[0].text.length === 24],
  ['lorem-ipsum-generator', { unit: 'words', count: 12 }, {},
    r => r[0].text.trim().split(/\s+/).length === 12]
];

/** Read a value out of a dataResult by its label. */
function findHelper() {
  return `function find(results, label) {
    for (const r of results) {
      if (r.kind === 'data') {
        const row = r.rows.find(x => x.label === label);
        if (row) return String(row.value).trim();
      }
    }
    return null;
  }`;
}

let pass = 0, fail = 0;

for (const [id, opts, input, assertion] of CASES) {
  const out = await page.evaluate(async ([id, opts, input, assertionSrc, findSrc]) => {
    // The page now ships metadata only, so pull in the tool's module first.
    let tool = ZT.registry.get(id);
    if (!tool) return { error: 'tool not registered' };
    if (tool.isStub) {
      try { tool = await ZT.registry.ensureLoaded(id); }
      catch (e) { return { error: 'could not load module: ' + e.message }; }
    }

    const ctx = {
      files: [],
      text: input.text || '',
      opt: Object.assign(ZT.registry.defaults(tool), opts),
      signal: { aborted: false },
      progress: () => {}
    };

    try {
      let results = await tool.run(ctx);
      results = Array.isArray(results) ? results : [results];
      // Strip DOM nodes — they cannot cross the bridge.
      const plain = results.map(r => ({
        kind: r.kind, text: r.text, rows: r.rows, name: r.name, title: r.title, note: r.note
      }));
      eval(findSrc);
      const check = eval('(' + assertionSrc + ')');
      return { ok: !!check(plain), results: plain };
    } catch (e) {
      return { error: String(e.message || e) };
    }
  }, [id, opts, input, assertion.toString(), findHelper()]);

  if (out.error) {
    fail++;
    console.log(`FAIL ${id.padEnd(30)} threw: ${out.error.slice(0, 100)}`);
  } else if (!out.ok) {
    fail++;
    const got = out.results.map(r =>
      r.kind === 'text' ? JSON.stringify(String(r.text).slice(0, 90))
        : r.kind === 'data' ? r.rows.slice(0, 6).map(x => x.label + '=' + x.value).join(', ').slice(0, 160)
        : r.kind).join(' || ');
    console.log(`FAIL ${id.padEnd(30)} got: ${got}`);
  } else {
    pass++;
    console.log(`ok   ${id}`);
  }
}

await browser.close();
console.log(`\n=== correctness: ${pass} passed, ${fail} failed (${CASES.length} assertions) ===`);
process.exit(fail ? 1 : 0);
