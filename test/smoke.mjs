/**
 * Load every registered tool page, run it with synthetic input,
 * and report anything that errors, produces no output, or overflows.
 */
import { chromium } from 'playwright-core';
import fs from 'fs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8899';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
const doRun = !process.argv.includes('--no-run');

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

/* ---- Read the registry from a loaded page ---- */
const probe = await browser.newPage();
await probe.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
const tools = await probe.evaluate(() =>
  ZT.registry.all().map(t => ({
    id: t.id, name: t.name, category: t.category, input: t.input,
    accept: t.accept, live: t.live, heavy: t.heavy,
    optionCount: (t.options || []).filter(o => o.type !== 'note').length
  }))
);
const homeErrors = await probe.evaluate(() => window.__errors || []);
await probe.close();

console.log(`Registry: ${tools.length} tools across ${new Set(tools.map(t => t.category)).size} categories`);
const noOptions = tools.filter(t => t.optionCount === 0);
if (noOptions.length) console.log(`WARNING: tools with no options: ${noOptions.map(t => t.id).join(', ')}`);

/* ---- Synthetic fixtures ---- */
const FIXTURES = {};
async function fixtures(page) {
  return page.evaluate(async () => {
    function canvasBlob(w, h, draw, type = 'image/png') {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d');
      draw(x, w, h);
      return new Promise(r => c.toBlob(r, type, 0.9));
    }
    const png = await canvasBlob(320, 240, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#3b82f6'); g.addColorStop(1, '#ec4899');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = '#fff'; x.font = 'bold 32px sans-serif'; x.fillText('ZT', 20, 60);
      for (let i = 0; i < 40; i++) {
        x.fillStyle = `hsl(${i * 9},70%,${40 + (i % 5) * 8}%)`;
        x.fillRect((i * 17) % w, (i * 31) % h, 14, 14);
      }
    });
    const png2 = await canvasBlob(320, 240, (x, w, h) => {
      x.fillStyle = '#3b82f6'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#10b981'; x.fillRect(40, 40, 120, 90);
    });
    const jpg = await canvasBlob(400, 300, (x, w, h) => {
      x.fillStyle = '#222'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#f59e0b'; x.beginPath(); x.arc(200, 150, 90, 0, 7); x.fill();
    }, 'image/jpeg');

    // Minimal one-page PDF, written by hand so no library is needed.
    function makePdf(pages = 2) {
      const objs = [];
      const kids = [];
      let n = 3;
      for (let p = 0; p < pages; p++) {
        const contentId = n + 1;
        kids.push(`${n} 0 R`);
        objs.push(`${n} 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 ${3 + pages * 2} 0 R>>>>/Contents ${contentId} 0 R>>endobj`);
        const stream = `BT /F1 28 Tf 60 760 Td (ZyncTools test page ${p + 1}) Tj ET`;
        objs.push(`${contentId} 0 obj<</Length ${stream.length}>>stream\n${stream}\nendstream endobj`);
        n += 2;
      }
      objs.push(`${n} 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj`);
      let pdf = '%PDF-1.4\n';
      const offsets = [];
      const head = [
        `1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj`,
        `2 0 obj<</Type/Pages/Kids[${kids.join(' ')}]/Count ${pages}>>endobj`
      ];
      [...head, ...objs].forEach(o => { offsets.push(pdf.length); pdf += o + '\n'; });
      const xref = pdf.length;
      pdf += `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`;
      offsets.forEach(o => { pdf += String(o).padStart(10, '0') + ' 00000 n \n'; });
      pdf += `trailer<</Size ${offsets.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;
      return new Blob([pdf], { type: 'application/pdf' });
    }

    // 1-second stereo WAV tone.
    function makeWav(seconds = 1, rate = 8000) {
      const frames = seconds * rate;
      const buf = new ArrayBuffer(44 + frames * 4);
      const v = new DataView(buf);
      const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
      w(0, 'RIFF'); v.setUint32(4, 36 + frames * 4, true); w(8, 'WAVE'); w(12, 'fmt ');
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
      v.setUint32(24, rate, true); v.setUint32(28, rate * 4, true);
      v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data');
      v.setUint32(40, frames * 4, true);
      for (let i = 0; i < frames; i++) {
        const s = Math.sin(i / rate * 440 * Math.PI * 2) * 0.5 * 32767;
        v.setInt16(44 + i * 4, s, true);
        v.setInt16(44 + i * 4 + 2, s, true);
      }
      return new Blob([buf], { type: 'audio/wav' });
    }

    const toFile = (blob, name) => new File([blob], name, { type: blob.type });
    window.__FIX = {
      png: toFile(png, 'sample.png'),
      png2: toFile(png2, 'sample-b.png'),
      jpg: toFile(jpg, 'photo.jpg'),
      pdf: toFile(makePdf(3), 'document.pdf'),
      pdf2: toFile(makePdf(2), 'second.pdf'),
      wav: toFile(makeWav(1), 'tone.wav'),
      wav2: toFile(makeWav(1), 'tone-b.wav'),
      txt: toFile(new Blob(['line one\nline two\nline three'], { type: 'text/plain' }), 'notes.txt')
    };
    return Object.keys(window.__FIX);
  });
}

/* Sample text per tool so text tools get input they can actually parse. */
const EXACT_TEXT = {
  "xml-json-converter": "<root><item id=\"1\">Hello</item><item id=\"2\">World</item></root>",
  "yaml-json-converter": "name: ZyncTools\ntags:\n  - fast\n  - private\ncount: 42",
  "csv-json-converter": "name,role,city\nAda,admin,London\nGrace,dev,New York"
};
function sampleText(tool) {
  const id = tool.id;
  if (EXACT_TEXT[id]) return EXACT_TEXT[id];
  if (/json/.test(id)) return '{"name":"ZyncTools","tags":["fast","private"],"count":42,"nested":{"a":1,"b":[1,2,3]}}';
  if (/yaml/.test(id)) return 'name: ZyncTools\ntags:\n  - fast\n  - private\ncount: 42';
  if (/xml/.test(id)) return '<root><item id="1">Hello</item><item id="2">World</item></root>';
  if (/csv/.test(id)) return 'name,role,city\nAda,admin,London\nGrace,dev,New York\nLinus,ops,Helsinki';
  if (/sql/.test(id)) return 'select id, name, email from users where active = 1 and age > 18 order by name limit 10';
  if (/jwt/.test(id)) return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NSIsIm5hbWUiOiJBZGEiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTkwMDAwMDAwMH0.abc';
  if (/^css-minifier/.test(id)) return '.card {\n  color: #ffffff;\n  padding: 0px;\n  /* note */\n}\n.b { margin : 10px }';
  if (/js-minifier/.test(id)) return 'function greet(name) {\n  var msg = "Hello, " + name;\n  console.log(msg);\n  return msg;\n}';
  if (/html-minifier/.test(id)) return '<div class="card">\n  <!-- note -->\n  <p>Hello   world</p>\n</div>';
  if (/markdown-to-html/.test(id)) return '# Title\n\nSome **bold** text and a [link](https://example.com).\n\n- one\n- two';
  if (/html-to-markdown|heading-analyz/.test(id)) return '<h1>Title</h1><p>Some <b>bold</b> text.</p><h2>Section</h2><img src="a.png"><a href="/x">click here</a>';
  if (/url-parser/.test(id)) return 'https://example.com/path/page?utm_source=news&page=2&q=hello#section';
  if (/base64-encoder/.test(id)) return 'Hello, world! Ünïcödé too.';
  if (/url-encoder/.test(id)) return 'hello world & more=stuff';
  if (/html-entity/.test(id)) return '<p class="hi">Tom & Jerry</p>';
  if (/number-base/.test(id)) return '255';
  if (/text-binary/.test(id)) return 'Hello';
  if (/roman/.test(id)) return '2026';
  if (/timestamp/.test(id)) return '1767225600';
  if (/statistics/.test(id)) return '12, 7, 3, 19, 7, 21, 15, 8, 11';
  if (/color-converter/.test(id)) return '#3B82F6';
  if (/hmac|hash/.test(id)) return 'message to sign';
  if (/password-strength/.test(id)) return 'Tr0ub4dor&3';
  if (/text-encryptor/.test(id)) return 'secret message';
  if (/sitemap/.test(id)) return 'https://example.com/\nhttps://example.com/about\nhttps://example.com/blog/post';
  if (/hreflang/.test(id)) return 'en-us | https://example.com/\nes-es | https://example.com/es/';
  if (/keyword-density/.test(id)) return 'Privacy matters. Our privacy tools keep your files private. Privacy first, always. Files stay on your device and privacy is preserved.';
  if (/regex/.test(id)) return 'The year 2024 and the year 2026 and 1999.';
  if (/ascii-banner/.test(id)) return 'ZYNC';
  if (/morse/.test(id)) return 'hello world';
  if (/caesar|leet/.test(id)) return 'Attack at dawn';
  if (/text-to-pdf/.test(id)) return '# My document\n\nSome **body text** here.\n\n- point one\n- point two';
  return 'The quick brown fox jumps over the lazy dog.\nSecond line here.\nThird line, with the word fox again.';
}

/* Which fixture a file tool should receive. */
function filesFor(tool) {
  const a = tool.accept || '';
  if (/pdf/.test(a)) {
    if (tool.id === 'merge-pdf') return ['pdf', 'pdf2'];
    if (/ocr/.test(tool.id)) return ['pdf'];
    return ['pdf'];
  }
  if (/^video|video\//.test(a) && !/audio/.test(a)) return null;  // needs a real video
  if (tool.id === 'audio-merger') return ['wav', 'wav2'];
  if (/audio/.test(a) && /video/.test(a)) return ['wav'];
  if (/audio/.test(a)) return ['wav'];
  if (/video/.test(a)) return null;
  if (/image/.test(a)) {
    if (tool.id === 'image-diff') return ['png', 'png2'];
    if (tool.id === 'image-joiner') return ['png', 'png2'];
    return ['png'];
  }
  if (a === '*/*' || !a) return ['txt'];
  return ['png'];
}

const results = [];
const list = only.length ? tools.filter(t => only.includes(t.id)) : tools;

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

for (const tool of list) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + String(e.message || e).slice(0, 180)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 180)); });

  const row = { id: tool.id, category: tool.category, status: 'ok', notes: [] };

  try {
    await page.goto(`${BASE}/tool.html?id=${tool.id}`, { waitUntil: 'networkidle', timeout: 25000 });

    const title = await page.textContent('.zt-tool-head__title').catch(() => null);
    if (!title) { row.status = 'FAIL'; row.notes.push('tool header did not render'); }

    const optionCount = await page.locator('#zt-options .zt-field, #zt-options .zt-check, #zt-options .zt-note').count();
    row.options = optionCount;
    if (tool.optionCount > 0 && optionCount === 0) {
      row.status = 'FAIL'; row.notes.push('options declared but none rendered');
    }

    // Horizontal overflow at mobile width
    await page.setViewportSize({ width: 380, height: 820 });
    await page.waitForTimeout(160);
    const ov = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth
    }));
    if (ov.s > ov.c + 1) { row.status = 'FAIL'; row.notes.push(`mobile overflow ${ov.s}>${ov.c}`); }
    await page.setViewportSize({ width: 1280, height: 900 });

    if (doRun) {
      await fixtures(page);

      if (tool.input === 'text') {
        await page.fill('#zt-text-input', sampleText(tool));
        await page.dispatchEvent('#zt-text-input', 'input');
      } else if (tool.input === 'file' || tool.input === 'files') {
        const want = filesFor(tool);
        if (!want) { row.status = 'skip'; row.notes.push('needs a real video file'); }
        else {
          await page.evaluate(keys => {
            const dt = new DataTransfer();
            keys.forEach(k => dt.items.add(window.__FIX[k]));
            const input = document.querySelector('#zt-file-input');
            input.files = dt.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }, want);
          await page.waitForTimeout(120);
        }
      }

      // Some tools legitimately refuse to run without a secret or URL.
      const REQUIRED = {
        'protect-pdf': { password: 'test-pass-1234' },
        'unlock-pdf': { password: '' },
        'text-encryptor': { passphrase: 'test-pass-1234' },
        'file-encryptor': { passphrase: 'test-pass-1234' },
        'hmac-generator': { secret: 'test-secret' },
        'utm-builder': { url: 'https://example.com/landing', source: 'newsletter', medium: 'email', campaign: 'spring' },
        'meta-tag-generator': { title: 'Example page title for testing', description: 'An example meta description used by the verification harness.' },
        'age-calculator': { 'birth-date': '1990-06-15' },
        'date-difference-calculator': { start: '2026-01-01', end: '2026-08-12' },
        'find-replace': { find: 'fox', replace: 'cat' },
        'image-watermark': {},
        'schema-markup-generator': { name: 'Example article', description: 'Example description', url: 'https://example.com/a' },
        'sitemap-generator': {},
        'qr-code-generator': {}
      };
      const fills = REQUIRED[tool.id];
      if (fills && Object.keys(fills).length) {
        for (const [optId, value] of Object.entries(fills)) {
          await page.evaluate(([optId, value]) => {
            const node = document.querySelector('#zt-opt-' + optId);
            if (!node) return;
            node.value = value;
            node.dispatchEvent(new Event('input', { bubbles: true }));
            node.dispatchEvent(new Event('change', { bubbles: true }));
          }, [optId, value]);
        }
        await page.waitForTimeout(120);
      }

      if (row.status !== 'skip') {
        const runBtn = page.locator('#zt-run');
        const disabled = await runBtn.isDisabled();
        if (disabled) { row.status = 'FAIL'; row.notes.push('run button stayed disabled'); }
        else {
          await runBtn.click();
          // Wait for either results or an error, up to a generous ceiling.
          await page.waitForFunction(() => {
            const r = document.querySelector('#zt-results');
            const e = document.querySelector('#zt-error');
            return (r && r.children.length) || (e && e.children.length);
          }, null, { timeout: tool.heavy ? 90000 : 30000 }).catch(() => {
            row.status = 'FAIL'; row.notes.push('no result within timeout');
          });

          const errText = await page.textContent('#zt-error').catch(() => '');
          if (errText && errText.trim()) {
            row.status = 'FAIL';
            row.notes.push('error: ' + errText.trim().slice(0, 160));
          } else {
            const n = await page.locator('#zt-results > *').count();
            row.results = n;
            if (!n) { row.status = 'FAIL'; row.notes.push('zero results rendered'); }
          }
        }
      }
    }
  } catch (e) {
    row.status = 'FAIL';
    row.notes.push('exception: ' + String(e.message || e).slice(0, 160));
  }

  const real = errors.filter(e => !/favicon|sw\.js|manifest|Failed to load resource.*404/i.test(e));
  if (real.length) {
    if (row.status === 'ok') row.status = 'FAIL';
    row.notes.push(...[...new Set(real)].slice(0, 3));
  }

  results.push(row);
  const tag = row.status === 'ok' ? 'ok  ' : row.status === 'skip' ? 'skip' : 'FAIL';
  console.log(`${tag} ${tool.id.padEnd(32)} opts=${String(row.options ?? '-').padStart(2)} res=${String(row.results ?? '-').padStart(2)} ${row.notes.join(' | ')}`);

  await page.close();
}

await ctx.close();
await browser.close();

const failed = results.filter(r => r.status === 'FAIL');
const skipped = results.filter(r => r.status === 'skip');
console.log(`\n=== ${results.length - failed.length - skipped.length} ok · ${failed.length} failed · ${skipped.length} skipped ===`);
if (failed.length) {
  console.log('\nFAILURES:');
  failed.forEach(f => console.log(`  ${f.id}: ${f.notes.join(' | ')}`));
}
fs.writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify(results, null, 2));

process.exit(failed.length ? 1 : 0);
