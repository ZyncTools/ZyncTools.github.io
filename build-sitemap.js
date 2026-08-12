#!/usr/bin/env node
/**
 * Generate sitemap.xml from the tool registry.
 *
 * The registry is the single source of truth for which tools exist, so the
 * sitemap is derived from it rather than maintained by hand. Run this after
 * adding or removing a tool:
 *
 *     node build-sitemap.js [https://your-domain.com]
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE = (process.argv[2] || 'https://zynctools.com').replace(/\/+$/, '');
const ROOT = __dirname;

/* Static pages that are not tools. */
const STATIC_PAGES = [
    { url: '/', priority: '1.0', changefreq: 'weekly' },
    { url: '/pages/privacy.html', priority: '0.4', changefreq: 'yearly' },
    { url: '/pages/terms.html', priority: '0.3', changefreq: 'yearly' },
    { url: '/pages/support.html', priority: '0.4', changefreq: 'monthly' },
    { url: '/pages/changelog.html', priority: '0.4', changefreq: 'monthly' }
];

/**
 * Run the registry and tool modules in a sandbox with just enough of a
 * browser to let them register. Nothing here touches the DOM at load time,
 * so a handful of stubs is sufficient.
 */
function loadRegistry() {
    const noop = () => {};
    const stubElement = () => ({
        style: {}, dataset: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
        appendChild: noop, setAttribute: noop, addEventListener: noop, getContext: () => null
    });

    const sandbox = {
        console,
        setTimeout, clearTimeout, setInterval, clearInterval,
        crypto: require('crypto').webcrypto,
        TextEncoder, TextDecoder,
        Intl,
        document: {
            createElement: stubElement,
            createElementNS: stubElement,
            getElementsByTagName: () => [],
            querySelector: () => null,
            querySelectorAll: () => [],
            addEventListener: noop,
            readyState: 'complete',
            head: stubElement(),
            body: stubElement()
        },
        navigator: { clipboard: {} },
        location: { search: '', origin: SITE, pathname: '/' },
        addEventListener: noop,
        matchMedia: () => ({ matches: false, addEventListener: noop }),
        URL, URLSearchParams, Blob: class {}, File: class {},
        FileReader: class {},
        DOMParser: class { parseFromString() { return { documentElement: {} }; } },
        XMLSerializer: class { serializeToString() { return ''; } }
    };
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;

    const context = vm.createContext(sandbox);

    const files = [
        'assets/js/zt-core.js',
        'assets/js/zt-icons.js',
        'assets/js/zt-registry.js',
        'assets/js/tools/image.js',
        'assets/js/tools/pdf.js',
        'assets/js/tools/media.js',
        'assets/js/tools/text.js',
        'assets/js/tools/code.js',
        'assets/js/tools/convert.js',
        'assets/js/tools/design.js',
        'assets/js/tools/security.js',
        'assets/js/tools/generate.js',
        'assets/js/tools/seo.js',
        'assets/js/tools/datetime.js',
        'assets/js/tools/math.js'
    ];

    for (const file of files) {
        const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
        try {
            vm.runInContext(source, context, { filename: file });
        } catch (err) {
            console.error(`Could not load ${file}: ${err.message}`);
            process.exit(1);
        }
    }

    if (!sandbox.ZT || !sandbox.ZT.registry) {
        console.error('The registry did not initialise.');
        process.exit(1);
    }
    return sandbox.ZT.registry;
}

function xmlEscape(value) {
    return String(value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function main() {
    const registry = loadRegistry();
    const tools = registry.all();
    const today = new Date().toISOString().slice(0, 10);

    const entries = STATIC_PAGES.map((page) => ({
        loc: SITE + page.url,
        priority: page.priority,
        changefreq: page.changefreq
    }));

    tools.forEach((tool) => {
        entries.push({
            loc: SITE + '/tool.html?id=' + tool.id,
            // Popular tools are the ones worth crawling most often.
            priority: tool.popular ? '0.9' : '0.7',
            changefreq: 'monthly'
        });
    });

    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ];

    entries.forEach((entry) => {
        xml.push('  <url>');
        xml.push('    <loc>' + xmlEscape(entry.loc) + '</loc>');
        xml.push('    <lastmod>' + today + '</lastmod>');
        xml.push('    <changefreq>' + entry.changefreq + '</changefreq>');
        xml.push('    <priority>' + entry.priority + '</priority>');
        xml.push('  </url>');
    });

    xml.push('</urlset>');

    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml.join('\n') + '\n');
    console.log(`sitemap.xml written — ${entries.length} URLs (${tools.length} tools) for ${SITE}`);
}

main();
