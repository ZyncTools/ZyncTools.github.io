#!/usr/bin/env node
/**
 * Generate a static HTML page per tool, plus sitemap.xml.
 *
 *     node build-pages.js [https://your-domain.com]
 *
 * Each tool gets a real file at /<tool-id>/index.html carrying its own
 * title, description, canonical, Open Graph tags, JSON-LD and a crawlable
 * <h1> and intro. A crawler sees a complete, distinct page without running
 * any JavaScript; the browser then hydrates it with the normal tool UI.
 *
 * The registry stays the single source of truth — this script reads it the
 * same way the site does, so pages cannot drift from the tools they describe.
 */

const fs = require('fs');
const path = require('path');
const { loadRegistry } = require('./build-lib.js');
const { buildSteps, buildFaqs } = require('./build-content.js');

const SITE = (process.argv[2] || readConfiguredSite() || 'https://zynctools.github.io').replace(/\/+$/, '');
const ROOT = __dirname;

/** tool id -> owning module, filled in by main(). */
let MODULE_OF = {};

/** Reuse whatever host the existing sitemap was built for. */
function readConfiguredSite() {
    try {
        const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
        const match = xml.match(/<loc>(https?:\/\/[^/<]+)/);
        return match ? match[1] : null;
    } catch (e) {
        return null;
    }
}

function esc(value) {
    return String(value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ============================================================
   PAGE TEMPLATE
   ============================================================ */
function renderToolPage(tool, registry) {
    const url = `${SITE}/${tool.id}/`;
    const title = `${tool.name} — free, private, in your browser | ZyncTools`;
    const category = registry.category(tool.category);

    /* A short, tool-specific intro. Generic boilerplate on 124 pages reads
       as thin content; this at least says what this tool does with what. */
    const intro = buildIntro(tool);
    const steps = buildSteps(tool);
    const faqs = buildFaqs(tool);
    const related = registry.inCategory(tool.category)
        .filter((t) => t.id !== tool.id)
        .slice(0, 6);

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: tool.name,
        description: tool.description,
        url,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any browser',
        browserRequirements: 'Requires JavaScript',
        image: `${SITE}/assets/images/og/${tool.category}.png`,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        featureList: (tool.options || [])
            .filter((o) => o.type !== 'note')
            .map((o) => o.label)
            .slice(0, 12)
    };

    const howTo = {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: `How to use ${tool.name}`,
        description: tool.description,
        totalTime: 'PT1M',
        supply: [], tool: [],
        step: steps.map((st, i) => ({
            '@type': 'HowToStep',
            position: i + 1,
            name: st.name,
            text: st.text
        }))
    };

    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer }
        }))
    };

    const breadcrumbs = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Tools', item: SITE + '/' },
            { '@type': 'ListItem', position: 2, name: category ? category.name : tool.category, item: `${SITE}/#${tool.category}` },
            { '@type': 'ListItem', position: 3, name: tool.name, item: url }
        ]
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(tool.description)} Runs entirely in your browser — no upload, no account, no limits.">
<link rel="canonical" href="${esc(url)}">

<meta property="og:type" content="website">
<meta property="og:title" content="${esc(tool.name)} — ZyncTools">
<meta property="og:description" content="${esc(tool.description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:site_name" content="ZyncTools">
<meta property="og:image" content="${SITE}/assets/images/og/${esc(tool.category)}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(tool.name)} — ZyncTools">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(tool.name)} — ZyncTools">
<meta name="twitter:description" content="${esc(tool.description)}">
<meta name="twitter:image" content="${SITE}/assets/images/og/${esc(tool.category)}.png">
<meta name="theme-color" content="#0B0D11">

<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%234F8DF7'/><path d='M56 12 30 54h16l-6 34 30-44H54z' fill='%23fff'/></svg>">
<link rel="manifest" href="../site.webmanifest">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/css/zynctools.css">

<script type="application/ld+json">${JSON.stringify(schema)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbs)}</script>
<script type="application/ld+json">${JSON.stringify(howTo)}</script>
<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>

<script>
(function () {
    try {
        var stored = localStorage.getItem('zynctools-theme');
        var valid = stored === 'dark' || stored === 'light' || stored === 'midnight';
        document.documentElement.setAttribute('data-theme', valid ? stored
            : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
    } catch (e) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
})();
</script>
</head>

<body>
<a href="#zt-main" class="zt-skip-link">Skip to content</a>

<div class="zt-shell">

    <header class="zt-header">
        <a class="zt-brand" href="../">
            <span class="zt-brand__mark" aria-hidden="true">⚡</span>
            <span class="zt-brand__name">ZyncTools</span>
        </a>

        <div class="zt-search">
            <svg class="zt-search__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input type="search" class="zt-search__input" id="zt-search" placeholder="Search other tools…"
                   autocomplete="off" aria-label="Search tools">
            <span class="zt-search__kbd">/</span>
            <div class="zt-suggest" id="zt-suggest" role="listbox" aria-label="Search suggestions"></div>
        </div>

        <button class="zt-icon-btn" id="zt-theme-toggle" aria-label="Switch theme"></button>
    </header>

    <main class="zt-main" id="zt-main">
        <div id="zt-tool-root">

            <div class="zt-tool-head" id="zt-tool-head">
                <!-- Rendered statically so the page is complete without JavaScript.
                     zt-tool-page.js replaces this with the interactive version. -->
                <nav class="zt-breadcrumb" aria-label="Breadcrumb">
                    <a href="../">Tools</a>
                    <span>/</span>
                    <a href="../#${esc(tool.category)}">${esc(category ? category.name : tool.category)}</a>
                    <span>/</span>
                    <span>${esc(tool.name)}</span>
                </nav>
                <div class="zt-tool-head__row">
                    <div class="zt-tool-head__icon">${iconSvg(tool.icon)}</div>
                    <div style="min-width:0">
                        <div class="zt-row" style="gap:10px">
                            <h1 class="zt-tool-head__title">${esc(tool.name)}</h1>
                            ${tool.popular ? '<span class="zt-badge zt-badge--popular">Popular</span>' : ''}
                            ${tool.heavy ? '<span class="zt-badge zt-badge--heavy">Heavy</span>' : ''}
                        </div>
                        <p class="zt-tool-head__desc">${esc(tool.description)}</p>
                    </div>
                </div>
            </div>

            <div class="zt-work">
                <div class="zt-work__main">

                    <section class="zt-step" id="zt-input-step">
                        <div class="zt-step__head">
                            <span class="zt-step__num">1</span>
                            <span class="zt-step__title" id="zt-input-title">Input</span>
                        </div>
                    </section>

                    <section class="zt-step" id="zt-options-step">
                        <div class="zt-step__head">
                            <span class="zt-step__num">2</span>
                            <span class="zt-step__title">Settings</span>
                        </div>
                        <div class="zt-step__body" id="zt-options"></div>
                    </section>

                    <section class="zt-step" id="zt-run-step">
                        <div class="zt-step__head">
                            <span class="zt-step__num">3</span>
                            <span class="zt-step__title">Run</span>
                        </div>
                        <div class="zt-step__body">
                            <div class="zt-runbar" id="zt-runbar"></div>
                            <div id="zt-error" class="zt-mt-4"></div>
                        </div>
                    </section>

                    <section class="zt-step" id="zt-results-step">
                        <div class="zt-step__head">
                            <span class="zt-step__num">4</span>
                            <span class="zt-step__title">Results</span>
                        </div>
                        <div class="zt-step__body">
                            <div class="zt-results" id="zt-results"></div>
                            <p class="zt-fields--empty" id="zt-results-placeholder">
                                Results will appear here once you run the tool.
                            </p>
                        </div>
                    </section>

                    <section class="zt-step">
                        <div class="zt-step__head">
                            <span class="zt-step__title">About ${esc(tool.name)}</span>
                        </div>
                        <div class="zt-step__body zt-prose-sm">
${intro}
                        </div>
                    </section>

                    <section class="zt-step">
                        <div class="zt-step__head">
                            <span class="zt-step__title">How to use ${esc(tool.name)}</span>
                        </div>
                        <div class="zt-step__body">
                            <ol class="zt-howto">
${steps.map((st) => `                                <li><strong>${esc(st.name)}.</strong> ${esc(st.text)}</li>`).join('\n')}
                            </ol>
                        </div>
                    </section>

                    <section class="zt-step">
                        <div class="zt-step__head">
                            <span class="zt-step__title">Frequently asked questions</span>
                        </div>
                        <div class="zt-step__body">
                            <div class="zt-faq">
${faqs.map((f) => `                                <details>
                                    <summary>${esc(f.question)}</summary>
                                    <div class="zt-faq__body"><p>${esc(f.answer)}</p></div>
                                </details>`).join('\n')}
                            </div>
                        </div>
                    </section>

${related.length ? `                    <section class="zt-step">
                        <div class="zt-step__head">
                            <span class="zt-step__title">Related ${esc(category ? category.name.toLowerCase() : '')} tools</span>
                        </div>
                        <div class="zt-step__body">
                            <div class="zt-related-grid">
${related.map((t) => `                                <a href="../${t.id}/">
                                    <span class="zt-related-grid__icon">${iconSvg(t.icon)}</span>
                                    <span>
                                        <span class="zt-related-grid__name">${esc(t.name)}</span>
                                        <span class="zt-related-grid__desc">${esc(t.description)}</span>
                                    </span>
                                </a>`).join('\n')}
                            </div>
                        </div>
                    </section>` : ''}

                </div>

                <aside class="zt-work__side" id="zt-side" aria-label="About this tool"></aside>
            </div>

        </div>
    </main>

    <footer class="zt-footer">
        <div class="zt-footer__inner">
            <div>
                <div class="zt-brand" style="margin-bottom:8px">
                    <span class="zt-brand__mark" aria-hidden="true">⚡</span>
                    <span class="zt-brand__name">ZyncTools</span>
                </div>
                <p class="zt-footer__copy">Private, browser-based utilities. Open source under AGPL-3.0.</p>
            </div>
            <nav class="zt-footer__links" aria-label="Footer">
                <a href="../">All tools</a>
                <a href="../pages/privacy.html">Privacy</a>
                <a href="../pages/terms.html">Terms</a>
                <a href="../pages/support.html">Support</a>
                <a href="https://github.com/ZyncTools/ZyncTools.github.io" rel="noopener">GitHub</a>
            </nav>
        </div>
    </footer>

</div>


<!-- Assistant -->
<button class="zt-chat-fab" id="zt-chat-fab" aria-label="Open the assistant" aria-expanded="false" aria-controls="zt-chat">
    <svg class="zt-chat-fab__open" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>
    </svg>
    <svg class="zt-chat-fab__close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
</button>

<div class="zt-chat" id="zt-chat" role="dialog" aria-label="ZyncTools assistant">
    <div class="zt-chat__head">
        <div class="zt-chat__avatar" aria-hidden="true">Z</div>
        <div style="flex:1;min-width:0">
            <div class="zt-chat__title">Assistant</div>
            <div class="zt-chat__status"><span class="zt-chat__dot"></span>Runs offline, in this tab</div>
        </div>
        <button class="zt-icon-btn" id="zt-chat-close" aria-label="Close assistant">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
        </button>
    </div>
    <div class="zt-chat__body" id="zt-chat-body"></div>
    <div class="zt-chat__foot">
        <input type="text" class="zt-chat__input" id="zt-chat-input"
               placeholder="Ask about this tool…" autocomplete="off" aria-label="Message">
        <button class="zt-chat__send" id="zt-chat-send" aria-label="Send">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/>
                <path d="m21.854 2.147-10.94 10.939"/>
            </svg>
        </button>
    </div>
</div>

<script>window.__ZT_TOOL_ID__ = ${JSON.stringify(tool.id)};</script>

<script src="../assets/js/zt-core.js"></script>
<script src="../assets/js/zt-icons.js"></script>
<script src="../assets/js/zt-registry.js"></script>

<!-- The full catalogue as metadata, then only the module this tool needs. -->
<script src="../assets/js/zt-catalog.js"></script>
<script src="../assets/js/tools/${MODULE_OF[tool.id]}.js"></script>

<script src="../assets/js/zt-theme.js"></script>
<script src="../assets/js/zt-tool-page.js"></script>
<script src="../assets/js/zt-tool-search.js"></script>
<script src="../assets/js/zt-assistant.js"></script>
<script src="../assets/js/zt-analytics.js"></script>

<script>
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('../sw.js').catch(function () {});
    });
}
</script>
</body>
</html>
`;
}

/* ============================================================
   INTRO COPY
   ============================================================
   Built from what the tool actually declares, so it stays true when a
   tool changes and never claims a capability the tool does not have.
*/
function buildIntro(tool) {
    const lines = [];
    const settings = (tool.options || []).filter((o) => o.type !== 'note');

    const inputSentence = {
        none: `${tool.name} needs no input file — choose your settings and it generates the result straight away.`,
        text: `Paste or type your text into ${tool.name}, adjust the settings, and the result appears below.`,
        file: `Drop a file into ${tool.name} or click to browse, then choose your settings.`,
        files: `Drop one or more files into ${tool.name} — it handles up to ${tool.maxFiles} at a time.`
    }[tool.input];

    lines.push(`<p>${esc(tool.description)} ${esc(inputSentence)}</p>`);

    lines.push(
        '<p><strong>Your files stay on your device.</strong> ZyncTools has no upload step: ' +
        'the file is read in your browser, processed there, and handed straight back to you. ' +
        'There is no account, no watermark and no size cap beyond what your own device can hold.</p>'
    );

    if (settings.length) {
        const names = settings.slice(0, 8).map((o) => esc(o.label.toLowerCase()));
        lines.push(
            `<p><strong>Settings.</strong> ${esc(tool.name)} gives you control over ` +
            names.slice(0, -1).join(', ') + (names.length > 1 ? ` and ${names[names.length - 1]}` : names[0]) +
            (settings.length > 8 ? `, plus ${settings.length - 8} more` : '') + '.</p>'
        );
    }

    if (tool.heavy) {
        lines.push(
            '<p><strong>This one works your device hard.</strong> Processing happens locally, ' +
            'so a large file takes real time and real CPU. It is still faster than uploading for most files, ' +
            'and nothing leaves your machine.</p>'
        );
    }

    if (tool.tags && tool.tags.length) {
        lines.push(`<p class="zt-field__help">Also known as: ${tool.tags.map(esc).join(', ')}.</p>`);
    }

    return lines.map((l) => '                            ' + l).join('\n');
}

/** Minimal inline icon lookup so generated pages are not blank before JS runs. */
let iconCache = null;
function iconSvg(name) {
    if (!iconCache) {
        const src = fs.readFileSync(path.join(ROOT, 'assets/js/zt-icons.js'), 'utf8');
        const sandbox = { window: {}, ZT: {} };
        sandbox.window.ZT = sandbox.ZT;
        // eslint-disable-next-line no-new-func
        new Function('window', 'ZT', src + '\nreturn ZT;')(sandbox.window, sandbox.ZT);
        iconCache = sandbox.ZT.icons;
    }
    return iconCache.svg(name);
}

/* ============================================================
   SITEMAP
   ============================================================ */
function writeSitemap(registry) {
    const today = new Date().toISOString().slice(0, 10);
    const entries = [
        { loc: SITE + '/', priority: '1.0', changefreq: 'weekly' },
        { loc: SITE + '/pages/support.html', priority: '0.4', changefreq: 'monthly' },
        { loc: SITE + '/pages/changelog.html', priority: '0.4', changefreq: 'monthly' },
        { loc: SITE + '/pages/blog.html', priority: '0.4', changefreq: 'monthly' },
        { loc: SITE + '/pages/privacy.html', priority: '0.3', changefreq: 'yearly' },
        { loc: SITE + '/pages/terms.html', priority: '0.3', changefreq: 'yearly' }
    ];

    registry.all().forEach((tool) => {
        entries.push({
            loc: `${SITE}/${tool.id}/`,
            priority: tool.popular ? '0.9' : '0.7',
            changefreq: 'monthly'
        });
    });

    const xml = ['<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
    entries.forEach((e) => {
        xml.push('  <url>');
        xml.push(`    <loc>${esc(e.loc)}</loc>`);
        xml.push(`    <lastmod>${today}</lastmod>`);
        xml.push(`    <changefreq>${e.changefreq}</changefreq>`);
        xml.push(`    <priority>${e.priority}</priority>`);
        xml.push('  </url>');
    });
    xml.push('</urlset>');

    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml.join('\n') + '\n');
    return entries.length;
}

/* ============================================================
   MAIN
   ============================================================ */
/**
 * Write assets/js/zt-catalog.js — name, description, tags and icon for every
 * tool, and nothing else. Roughly a tenth the size of the twelve modules it
 * replaces on pages that only need to list tools rather than run them.
 */
function writeCatalog(registry, owner) {
    const meta = registry.all().map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        description: t.description,
        icon: t.icon,
        tags: t.tags,
        // Interface-level facts, not implementation. They cost a few bytes and
        // let anything reading the catalogue describe the tool accurately
        // before its module has loaded.
        input: t.input,
        accept: t.accept || undefined,
        live: t.live || undefined,
        popular: t.popular || undefined,
        heavy: t.heavy || undefined,
        maxFiles: t.maxFiles,
        module: owner[t.id]
    }));

    const body = `/**
 * ZyncTools — tool catalogue (generated)
 *
 * Metadata only: enough for the homepage grid, search and the assistant,
 * without the option schemas and run() implementations that make up most of
 * the weight. Generated by build-pages.js — do not edit by hand.
 */
(function () {
    'use strict';
    window.ZT.registry.defineMeta(${JSON.stringify(meta, null, 0)});
})();
`;

    fs.writeFileSync(path.join(ROOT, 'assets/js/zt-catalog.js'), body);
    return body.length;
}

function main() {
    const { registry, owner } = loadRegistry(ROOT);
    const tools = registry.all();
    const ids = new Set(tools.map((t) => t.id));
    MODULE_OF = owner;

    let written = 0;
    tools.forEach((tool) => {
        const dir = path.join(ROOT, tool.id);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'), renderToolPage(tool, registry));
        written++;
    });

    /* Remove pages for tools that no longer exist, so renaming or deleting a
       tool does not leave an orphaned page behind. The manifest records what
       this script owns, so it can never delete a directory it did not create. */
    const manifestPath = path.join(ROOT, 'generated-pages.json');
    let previous = [];
    try {
        previous = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).pages || [];
    } catch (e) { /* first run */ }

    let removed = 0;
    previous.forEach((id) => {
        if (ids.has(id)) return;
        const dir = path.join(ROOT, id);
        if (fs.existsSync(path.join(dir, 'index.html'))) {
            fs.rmSync(dir, { recursive: true, force: true });
            removed++;
        }
    });

    /* Deliberately no timestamp. CI checks that rebuilding produces no diff,
       so anything that changes on every run — a build time, a random id —
       makes that check impossible to pass. Git history already records when
       this file last changed. */
    fs.writeFileSync(manifestPath, JSON.stringify({
        note: 'Written by build-pages.js. Lists the tool directories it owns so stale ones can be cleaned up. Do not edit by hand.',
        pages: tools.map((t) => t.id).sort()
    }, null, 2) + '\n');

    const catalogBytes = writeCatalog(registry, owner);
    const urls = writeSitemap(registry);

    console.log(`${written} tool pages written for ${SITE}`);
    if (removed) console.log(`${removed} stale tool directories removed`);
    console.log(`sitemap.xml written — ${urls} URLs`);
    console.log(`zt-catalog.js written — ${Math.round(catalogBytes / 1024)} KB of metadata`);
}

main();
