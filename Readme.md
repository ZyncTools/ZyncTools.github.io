# ZyncTools

**124 file and developer utilities that run entirely in your browser.**

No uploads. No accounts. No server. Your files are read with the File API,
processed in JavaScript and WebAssembly, and handed back to you — all on your
own device.

---

## Quick start

It is a static site with no build step.

```bash
python -m http.server 3000
# or: npx serve .
```

Then open <http://localhost:3000>.

---

## Architecture

The whole app is driven by one **tool registry**. A tool cannot appear in the
catalogue without a working implementation behind it — the registry validates
every definition at load time and refuses to register anything incomplete.

```
index.html                  Homepage — renders the catalogue from the registry
tool.html                   Every tool runs on this one page, driven by its schema

assets/css/
  zynctools.css             The entire design system. Mobile-first, three themes.

assets/js/
  zt-core.js                Helpers: files, canvas, encoding, downloads, ZIP, lazy CDN loads
  zt-icons.js               Inline SVG icon set (no icon-font dependency)
  zt-registry.js            define() / search() / categories — the single source of truth
  zt-theme.js               dark / light / midnight
  zt-home.js                Homepage grid, search, category filter
  zt-tool-page.js           Renders any tool from its option schema and runs it
  zt-tool-search.js         Header search on tool pages
  zt-assistant.js           Local tool-finding assistant (no API calls)

  tools/
    image.js      19 tools   pdf.js      15 tools   media.js     9 tools
    text.js       19 tools   code.js     14 tools   convert.js   8 tools
    design.js     10 tools   security.js  6 tools   generate.js  5 tools
    seo.js         8 tools   datetime.js  5 tools   math.js      6 tools

build-sitemap.js            Regenerates sitemap.xml from the registry
sw.js                       Service worker — offline support

test/
  run.mjs                   Serves the site and runs every suite
  smoke.mjs                 Loads all 124 tools, feeds each one input, asserts output
  correctness.mjs           50 known-input/known-output assertions
  video.mjs                 Video tools against a browser-recorded clip
```

---

## Tests

The catalogue is large enough that "it works" needs to be checkable rather
than asserted. The suite drives a real Chrome via Playwright.

```bash
npm install     # playwright-core only; the site itself has no dependencies
npm test
```

`smoke.mjs` opens every registered tool, feeds it a synthetic file or sample
text, clicks Run, and fails on a JS error, an empty result, or any horizontal
overflow at 380px wide. `correctness.mjs` checks actual values — SHA-256 and
HMAC against published test vectors, unit conversions, base64 round-trips,
Roman numerals and so on.

Set `CHROME_PATH` if Chrome is not at the default Windows location.

### Adding a tool

Add one `define()` call. The homepage card, the tool page, its options, the
search index, the assistant and the sitemap all follow automatically.

```js
ZT.registry.define({
    id: 'image-resizer',              // unique; becomes ?id=image-resizer
    name: 'Image Resizer',
    category: 'image',                // must exist in CATEGORIES
    icon: 'maximize-2',               // key in zt-icons.js
    description: 'Resize images by pixels, percentage or to fit inside a box.',
    tags: ['resize', 'scale', 'dimensions'],
    input: 'files',                   // 'none' | 'text' | 'file' | 'files'
    accept: 'image/*',
    options: [
        { id: 'width', type: 'number', label: 'Width', suffix: 'px', value: 1280, min: 1 },
        { id: 'mode',  type: 'select', label: 'Mode', value: 'fit',
          options: [{ value: 'fit', label: 'Fit inside a box' }] },
        // `when` hides an option until it is relevant
        { id: 'quality', type: 'range', label: 'Quality', value: 85, min: 10, max: 100,
          when: function (o) { return o.format !== 'png'; } }
    ],
    run: async function (ctx) {
        // ctx.files / ctx.text / ctx.opt / ctx.progress(fraction, label) / ctx.signal
        return ZT.fileResult(blob, 'resized.png', { previewBlob: blob });
    }
});
```

Option types: `range`, `number`, `select`, `radio`, `checkbox`, `text`,
`textarea`, `color`, `file`, `date`, `time`, `datetime-local`, `note`.

Result builders: `ZT.fileResult`, `ZT.textResult`, `ZT.dataResult`,
`ZT.nodeResult`. Throw a user-facing error with `ZT.fail('message')`.

After adding a tool, regenerate the sitemap:

```bash
node build-sitemap.js https://your-domain.com
```

---

## Libraries

Loaded lazily from jsDelivr, only when a tool that needs them is actually run.
Most of the catalogue uses none of these.

| Library | Used by |
|---|---|
| pdf-lib | PDF create, merge, split, watermark, page numbers |
| PDF.js | PDF rendering and text extraction |
| qpdf-wasm | PDF password protect / unlock |
| Tesseract.js | OCR |
| JSZip | multi-file downloads |
| lamejs | MP3 encoding |
| gif.js | video to GIF |
| exifr | EXIF metadata |
| Terser | JavaScript minifier |
| js-yaml, marked, turndown | YAML, Markdown, HTML conversion |
| heic2any | HEIC decoding |
| qrcode-generator | QR codes |
| JsBarcode | barcodes |

---

## Legacy files

This repository was rewritten. The old application layer is still present but
is **no longer referenced by anything** — `index.html` and `tool.html` load
only the `zt-*` files listed above.

The files below are dead and can be deleted whenever you are ready. They are
kept for now so nothing is lost before you have reviewed the rewrite.

**Old app scripts** — `assets/js/`:
`advanced-logic.js`, `app.js`, `chat-ui.js`, `chatbot-global.js`,
`chatbot-logic.js`, `dashboard-logic.js`, `db-manager.js`, `dev-utilities.js`,
`icon-mapping-logic.js`, `implementation-check.js`, `logic-core.js`,
`logic-currency.js`, `logic-image.js`, `logic-media.js`, `logic-pdf.js`,
`logic-units.js`, `main-fixed.js`, `main.js`, `media-logic.js`,
`media-preview.js`, `pdf-workbench-core.js`, `privacy-settings.js`,
`registry-loader.js`, `script.js`, `search-engine.js`, `seo-generators.js`,
`seo-logic.js`, `seo-registry.js`, `sidebar-ui.js`, `theme-cycler.js`,
`theme-switcher.js`, `theme.js`, `tool-bridge.js`, `tool-registry.js`,
`tool-viewer.js`, `tools-batch-logic.js`, `ui-components.js`,
`verify-tools.js`, `viewer.js`, `virtualized-grid.js`, and the old
`assets/js/tools/*-logic.js` files.

**Old stylesheets** — `assets/css/`: `components.css`, `modern-styles.css`,
`styles-chat.css`, `styles-dashboard.css`, `styles-fixed.css`, `styles.css`,
`zync-tools.css`.

**Old pages**: `image-tool.html`, `pdf-tool.html`, `tool-viewer.html`,
`seo-tools.html`, `viewer.html`, `settings-ui.html`, `chat-ui.html`,
`chat-widget.html`, `index-legacy.html`, and the entire `tools/` directory
(147 per-tool pages, now replaced by `tool.html?id=…`).

**Old data and build scripts**: `tools-database.json`,
`tools-database-real.json`, `tools-database-cleaned.json`,
`tools-database.backup.json`, `registry.json`, `new-tools-registry.json`,
`tool-status.json`, `knowledge-base.json`, `icon-migration-map.json`,
`activate-batch.js`, `build-cleaned.js`, `build-real-db.js`,
`check-status.js`, `generate_tool_status.py`, `audit-report.txt`.

`robots.txt` already tells crawlers to ignore the old paths, so they will not
be indexed while they remain.

To remove them all:

```bash
git rm -r tools/ \
  image-tool.html pdf-tool.html tool-viewer.html seo-tools.html viewer.html \
  settings-ui.html chat-ui.html chat-widget.html index-legacy.html \
  tools-database*.json registry.json new-tools-registry.json tool-status.json \
  knowledge-base.json icon-migration-map.json audit-report.txt \
  activate-batch.js build-cleaned.js build-real-db.js check-status.js \
  generate_tool_status.py
```

---

## Deploying

Pushing to `main` deploys automatically via `.github/workflows/deploy.yml`.
The site is live at <https://zynctools.github.io>.

### Moving to a custom domain

Canonical tags, `robots.txt` and `sitemap.xml` currently point at
`zynctools.github.io`. Point them somewhere that does not resolve yet and
search engines will follow the canonical to a dead URL, so change these only
once the domain actually serves the site:

1. Add a `CNAME` file at the repo root containing just the domain, e.g.
   `zynctools.com`.
2. Point the domain's DNS at GitHub Pages, and wait for the certificate to
   issue under **Settings → Pages**.
3. Confirm the domain serves the site over HTTPS.
4. Then update the URLs:
   ```bash
   node build-sitemap.js https://your-domain.com
   # replace the old host in the canonical/og:url tags and robots.txt
   grep -rl "zynctools.github.io" index.html tool.html pages robots.txt
   ```
5. Bump `CACHE_VERSION` in `sw.js` so returning visitors get the new build
   rather than a cached copy of the old one.

---

## Licence

AGPL-3.0-or-later — see [LICENSE](LICENSE).
