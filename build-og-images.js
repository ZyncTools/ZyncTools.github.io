#!/usr/bin/env node
/**
 * Render the Open Graph share cards into assets/images/og/.
 *
 *     node build-og-images.js
 *
 * Run this by hand when the branding or the category list changes, not on
 * every build. The output is committed, because PNG encoders differ between
 * machines and CI checks that a rebuild produces no diff — regenerating
 * images on every run would fail that check for no real reason.
 *
 * Needs playwright-core and a local Chrome, the same as the tests.
 */

const fs = require('fs');
const path = require('path');
const { loadRegistry } = require('./build-lib.js');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'assets/images/og');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

/* Per-category accent, so a PDF link and an image link do not look identical
   in a feed. Values mirror the palette in zynctools.css. */
const ACCENTS = {
    image:    ['#4F8DF7', '#7C5CFF'],
    pdf:      ['#F0616B', '#F0932E'],
    media:    ['#A855F7', '#EC4899'],
    text:     ['#34C77B', '#14B8A6'],
    code:     ['#38BDF8', '#4F8DF7'],
    convert:  ['#F59E0B', '#F0616B'],
    design:   ['#EC4899', '#A855F7'],
    security: ['#22C55E', '#0EA5E9'],
    generate: ['#8B5CF6', '#4F8DF7'],
    seo:      ['#0EA5E9', '#22C55E'],
    datetime: ['#F97316', '#F43F5E'],
    math:     ['#6366F1', '#22D3EE'],
    default:  ['#4F8DF7', '#7C5CFF']
};

function card(title, subtitle, accent) {
    const [from, to] = accent;
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:1200px; height:630px;
    font-family:'Inter',system-ui,sans-serif;
    background:#0B0D11;
    color:#EEF1F6;
    display:flex; flex-direction:column; justify-content:space-between;
    padding:72px 80px;
    position:relative; overflow:hidden;
  }
  .glow {
    position:absolute; top:-320px; right:-220px;
    width:820px; height:820px; border-radius:50%;
    background:radial-gradient(circle, ${from}55 0%, ${to}22 45%, transparent 70%);
  }
  .grid {
    position:absolute; inset:0;
    background-image:linear-gradient(#FFFFFF07 1px, transparent 1px),
                     linear-gradient(90deg, #FFFFFF07 1px, transparent 1px);
    background-size:56px 56px;
  }
  .brand { display:flex; align-items:center; gap:16px; position:relative; }
  .mark {
    width:52px; height:52px; border-radius:14px;
    background:linear-gradient(135deg, ${from}, ${to});
    display:flex; align-items:center; justify-content:center;
    font-size:28px;
  }
  .name { font-size:30px; font-weight:800; letter-spacing:-0.02em; }
  .body { position:relative; }
  h1 {
    font-size:78px; font-weight:800; letter-spacing:-0.035em;
    line-height:1.05; margin-bottom:22px;
    max-width:15ch;
  }
  p { font-size:29px; color:#A3ACBD; line-height:1.4; max-width:34ch; }
  .foot { display:flex; align-items:center; gap:14px; position:relative; }
  .pill {
    display:inline-flex; align-items:center; gap:10px;
    padding:11px 22px; border-radius:999px;
    background:${from}1F; border:1px solid ${from}55;
    color:${from}; font-size:22px; font-weight:600;
  }
  .dot { width:9px; height:9px; border-radius:50%; background:${from}; }
</style></head><body>
  <div class="grid"></div><div class="glow"></div>
  <div class="brand"><div class="mark">⚡</div><div class="name">ZyncTools</div></div>
  <div class="body">
    <h1>${title}</h1>
    <p>${subtitle}</p>
  </div>
  <div class="foot">
    <span class="pill"><span class="dot"></span>Runs in your browser</span>
    <span class="pill">Nothing uploaded</span>
    <span class="pill">Free, no account</span>
  </div>
</body></html>`;
}

async function main() {
    let chromium;
    try {
        ({ chromium } = require('playwright-core'));
    } catch (e) {
        console.error('playwright-core is not installed. Run: npm install');
        process.exit(1);
    }

    const { registry } = loadRegistry(ROOT);
    fs.mkdirSync(OUT, { recursive: true });

    const browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

    const cards = [
        ['default', 'Tools that never see your files', registry.all().length + ' free utilities that run entirely in your browser.', ACCENTS.default]
    ];

    registry.categories().forEach((c) => {
        if (!registry.inCategory(c.id).length) return;
        cards.push([
            c.id,
            `${c.name} tools`,
            c.blurb,
            ACCENTS[c.id] || ACCENTS.default
        ]);
    });

    for (const [name, title, subtitle, accent] of cards) {
        await page.setContent(card(title, subtitle, accent), { waitUntil: 'networkidle' });
        // Give the webfont a moment; a fallback face changes the layout.
        await page.waitForTimeout(350);
        await page.screenshot({ path: path.join(OUT, `${name}.png`) });
        console.log(`  ${name}.png`);
    }

    await browser.close();
    console.log(`${cards.length} share cards written to assets/images/og/`);
}

main();
