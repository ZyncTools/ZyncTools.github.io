/**
 * ZyncTools — Batch Logic: SEO tools
 * ====================================
 * Generators that produce downloadable .txt / .xml blobs, reusing the
 * generateRobotsTxt pattern (string -> Blob).
 *
 * Covers: meta-title/description generators, twitter-card, og-tag,
 *         hreflang-tag, canonical-url, robots-txt, sitemap-xml, schema-markup,
 *         heading-extractor, keyword-density-checker, meta-tag generator.
 */
(function () {
    'use strict';

    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    function metaTitle(o) { const t = (o.title || '').trim(); if (t.length > 60) throw new Error('Title exceeds 60 chars (SEO best practice).'); return `<title>${esc(t)}</title>`; }
    function metaDescription(o) { const d = (o.description || '').trim(); if (d.length > 160) throw new Error('Description exceeds 160 chars.'); return `<meta name="description" content="${esc(d)}">`; }
    function metaTag(o) {
        const tags = [];
        if (o.title) tags.push(`<title>${esc(o.title)}</title>`);
        if (o.description) tags.push(`<meta name="description" content="${esc(o.description)}">`);
        if (o.keywords) tags.push(`<meta name="keywords" content="${esc(o.keywords)}">`);
        if (o.author) tags.push(`<meta name="author" content="${esc(o.author)}">`);
        if (o.viewport !== false) tags.push(`<meta name="viewport" content="width=device-width, initial-scale=1">`);
        return tags.join('\n');
    }
    function ogTag(o) {
        return [
            '<meta property="og:type" content="' + (o.type || 'website') + '">',
            '<meta property="og:title" content="' + esc(o.title) + '">',
            '<meta property="og:description" content="' + esc(o.description) + '">',
            '<meta property="og:url" content="' + esc(o.url) + '">',
            o.image ? '<meta property="og:image" content="' + esc(o.image) + '">' : ''
        ].filter(Boolean).join('\n');
    }
    function twitterCard(o) {
        return [
            '<meta name="twitter:card" content="' + (o.card || 'summary_large_image') + '">',
            '<meta name="twitter:title" content="' + esc(o.title) + '">',
            '<meta name="twitter:description" content="' + esc(o.description) + '">',
            o.image ? '<meta name="twitter:image" content="' + esc(o.image) + '">' : ''
        ].filter(Boolean).join('\n');
    }
    function hreflang(o) {
        const langs = (o.langs || 'en:https://example.com/,es:https://example.com/es/').split(',').filter(Boolean);
        return langs.map(l => { const [code, url] = l.split(':'); return `<link rel="alternate" hreflang="${esc(code)}" href="${esc(url)}" />`; }).join('\n');
    }
    function canonical(o) { return `<link rel="canonical" href="${esc(o.url)}" />`; }
    function robotsTxt(o) {
        const lines = ['User-agent: ' + (o.agent || '*')];
        lines.push('Disallow: ' + (Array.isArray(o.disallow) && o.disallow.length ? o.disallow.join('\nDisallow: ') : (o.disallow || '')));
        if (o.sitemap) lines.push('Sitemap: ' + o.sitemap);
        return lines.join('\n');
    }
    function sitemapXml(o) {
        const urls = (o.urls || 'https://example.com/').split(/[\n,]/).filter(Boolean);
        const items = urls.map(u => `  <url>\n    <loc>${esc(u.trim())}</loc>\n  </url>`).join('\n');
        return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`;
    }
    function schemaMarkup(o) {
        const obj = {
            '@context': 'https://schema.org',
            '@type': o.type || 'WebSite',
            name: o.name || '',
            url: o.url || ''
        };
        if (o.description) obj.description = o.description;
        return JSON.stringify(obj, null, 2);
    }
    function headingExtractor(html) {
        const div = document.createElement('div'); div.innerHTML = html;
        const hs = div.querySelectorAll('h1,h2,h3,h4,h5,h6');
        let out = ''; hs.forEach(h => out += h.tagName + ': ' + h.textContent.trim() + '\n');
        return out || '(no headings found)';
    }
    function keywordDensity(text, opts) {
        const words = (text || '').toLowerCase().match(/[a-z0-9']+/g) || [];
        const stop = new Set('the a an and or of to in is are was were be been being for on at by with as it this that'.split(' '));
        const freq = {}; words.forEach(w => { if (w.length > 2 && !stop.has(w)) freq[w] = (freq[w] || 0) + 1; });
        const total = words.length; const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, parseInt(opts && opts.top) || 10);
        return sorted.map(([w, n]) => `${w}: ${n} (${(n / total * 100).toFixed(2)}%)`).join('\n');
    }

    const FNS = {
        'meta-title-generator': (t, o) => metaTitle(o),
        'meta-description-generator': (t, o) => metaDescription(o),
        'meta-tag-generator': (t, o) => metaTag(o),
        'twitter-card-generator': (t, o) => twitterCard(o),
        'og-tag-generator': (t, o) => ogTag(o),
        'hreflang-tag-generator': (t, o) => hreflang(o),
        'canonical-url-generator': (t, o) => canonical(o),
        'robots-txt-generator': (t, o) => robotsTxt(o),
        'sitemap-xml-generator': (t, o) => sitemapXml(o),
        'schema-markup-generator': (t, o) => schemaMarkup(o),
        'heading-extractor': t => headingExtractor(t),
        'keyword-density-checker': (t, o) => keywordDensity(t, o)
    };
    function blob(s, type) { return new Blob([s], { type: type || 'text/plain' }); }

    window.ZyncBatchSeo = { FNS,
        getModule(toolId) {
            const fn = FNS[toolId];
            if (!fn) return null;
            return {
                type: 'text',
                outputType: 'blob',
                process: async (text, options) => {
                    const out = fn(Array.isArray(text) ? text.join('\n') : text, options || {});
                    const isXml = /xml/.test(toolId);
                    const b = blob(out, isXml ? 'application/xml' : 'text/plain');
                    return [{ name: toolId + (isXml ? '.xml' : '.txt'), blob: b, type: b.type, size: b.size, url: URL.createObjectURL(b) }];
                }
            };
        }
    };
})();
