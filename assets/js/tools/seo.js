/**
 * ZyncTools — SEO & web tools
 * Meta tags, structured data, sitemaps and content checks.
 */
(function () {
    'use strict';

    var ZT = window.ZT;
    var define = ZT.registry.define;

    function esc(s) { return ZT.esc(s); }

    /* ============================================================
       Meta tag generator
       ============================================================ */
    define({
        id: 'meta-tag-generator',
        name: 'Meta Tag Generator',
        category: 'seo',
        icon: 'tags',
        description: 'Generate title, description, Open Graph and Twitter Card tags at once.',
        tags: ['meta', 'seo', 'open graph', 'twitter card', 'tags', 'head'],
        input: 'none',
        options: [
            { id: 'title', type: 'text', label: 'Page title', value: '', placeholder: 'Aim for 50–60 characters' },
            { id: 'description', type: 'textarea', label: 'Meta description', value: '', rows: 3, placeholder: 'Aim for 140–160 characters' },
            { id: 'url', type: 'text', label: 'Canonical URL', value: '', placeholder: 'https://example.com/page' },
            { id: 'image', type: 'text', label: 'Preview image URL', value: '', placeholder: 'https://example.com/og.jpg — 1200×630 works best' },
            { id: 'site-name', type: 'text', label: 'Site name', value: '' },
            { id: 'author', type: 'text', label: 'Author', value: '' },
            { id: 'keywords', type: 'text', label: 'Keywords', value: '', help: 'Comma-separated. Google ignores these, but some other engines still read them.' },
            {
                id: 'og-type', type: 'select', label: 'Open Graph type', value: 'website',
                options: [
                    { value: 'website', label: 'Website' }, { value: 'article', label: 'Article' },
                    { value: 'product', label: 'Product' }, { value: 'profile', label: 'Profile' },
                    { value: 'video.other', label: 'Video' }
                ]
            },
            {
                id: 'twitter-card', type: 'select', label: 'Twitter card type', value: 'summary_large_image',
                options: [
                    { value: 'summary_large_image', label: 'Large image' }, { value: 'summary', label: 'Summary' },
                    { value: 'player', label: 'Player' }, { value: 'app', label: 'App' }
                ]
            },
            { id: 'twitter-handle', type: 'text', label: 'Twitter handle', value: '', placeholder: '@yoursite' },
            { id: 'locale', type: 'text', label: 'Locale', value: 'en_US' },
            { id: 'include-robots', type: 'checkbox', label: 'Include robots and viewport tags', value: true },
            { id: 'include-preview', type: 'checkbox', label: 'Show a search and social preview', value: true }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            if (!o.title.trim() && !o.description.trim()) {
                // Opening the page is not a mistake — prompt rather than error.
                return ZT.dataResult(
                    [{ label: 'Waiting for input', value: 'Enter a page title or description above and your tags appear here.' }],
                    { title: 'Meta tags' }
                );
            }

            var lines = [];
            if (o.title) lines.push('<title>' + esc(o.title) + '</title>');
            if (o.description) lines.push('<meta name="description" content="' + esc(o.description) + '">');
            if (o.keywords) lines.push('<meta name="keywords" content="' + esc(o.keywords) + '">');
            if (o.author) lines.push('<meta name="author" content="' + esc(o.author) + '">');
            if (o.url) lines.push('<link rel="canonical" href="' + esc(o.url) + '">');

            if (o.includeRobots) {
                lines.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
                lines.push('<meta name="robots" content="index, follow, max-image-preview:large">');
            }

            lines.push('');
            lines.push('<!-- Open Graph -->');
            lines.push('<meta property="og:type" content="' + esc(o.ogType) + '">');
            if (o.title) lines.push('<meta property="og:title" content="' + esc(o.title) + '">');
            if (o.description) lines.push('<meta property="og:description" content="' + esc(o.description) + '">');
            if (o.url) lines.push('<meta property="og:url" content="' + esc(o.url) + '">');
            if (o.image) {
                lines.push('<meta property="og:image" content="' + esc(o.image) + '">');
                lines.push('<meta property="og:image:width" content="1200">');
                lines.push('<meta property="og:image:height" content="630">');
                lines.push('<meta property="og:image:alt" content="' + esc(o.title || 'Preview image') + '">');
            }
            if (o.siteName) lines.push('<meta property="og:site_name" content="' + esc(o.siteName) + '">');
            if (o.locale) lines.push('<meta property="og:locale" content="' + esc(o.locale) + '">');

            lines.push('');
            lines.push('<!-- Twitter -->');
            lines.push('<meta name="twitter:card" content="' + esc(o.twitterCard) + '">');
            if (o.title) lines.push('<meta name="twitter:title" content="' + esc(o.title) + '">');
            if (o.description) lines.push('<meta name="twitter:description" content="' + esc(o.description) + '">');
            if (o.image) lines.push('<meta name="twitter:image" content="' + esc(o.image) + '">');
            if (o.twitterHandle) {
                var handle = o.twitterHandle.charAt(0) === '@' ? o.twitterHandle : '@' + o.twitterHandle;
                lines.push('<meta name="twitter:site" content="' + esc(handle) + '">');
                lines.push('<meta name="twitter:creator" content="' + esc(handle) + '">');
            }

            var results = [ZT.textResult(lines.join('\n'), { lang: 'html', title: 'Paste this into your <head>' })];

            // Length guidance is where most meta-tag mistakes actually live.
            var checks = [];
            var titleLength = o.title.length;
            var descLength = o.description.length;
            if (titleLength) {
                checks.push({
                    label: 'Title length',
                    value: titleLength + ' characters — ' + (
                        titleLength < 30 ? 'shorter than ideal, aim for 50–60'
                        : titleLength > 60 ? 'likely truncated in search results, aim for 50–60'
                        : 'good')
                });
            }
            if (descLength) {
                checks.push({
                    label: 'Description length',
                    value: descLength + ' characters — ' + (
                        descLength < 70 ? 'shorter than ideal, aim for 140–160'
                        : descLength > 160 ? 'likely truncated, aim for 140–160'
                        : 'good')
                });
            }
            if (!o.image) checks.push({ label: 'Preview image', value: 'Missing — links will share without a thumbnail' });
            if (!o.url) checks.push({ label: 'Canonical URL', value: 'Missing — add one to avoid duplicate-content issues' });
            if (checks.length) results.push(ZT.dataResult(checks, { title: 'Checks', columns: 2 }));

            if (o.includePreview) {
                var domain = '';
                try { domain = o.url ? new URL(o.url).hostname : 'example.com'; } catch (e) { domain = 'example.com'; }

                var serp = ZT.el('div', { class: 'zt-serp' }, [
                    ZT.el('div', { class: 'zt-serp__url', text: domain + (o.url ? new URL(o.url, 'https://x').pathname : '/') }),
                    ZT.el('div', { class: 'zt-serp__title', text: truncate(o.title || 'Your page title', 60) }),
                    ZT.el('div', { class: 'zt-serp__desc', text: truncate(o.description || 'Your meta description appears here.', 160) })
                ]);

                var social = ZT.el('div', { class: 'zt-social-card' }, [
                    o.image ? ZT.el('img', { class: 'zt-social-card__img', src: o.image, alt: '', loading: 'lazy' })
                            : ZT.el('div', { class: 'zt-social-card__img zt-social-card__img--empty', text: 'No preview image' }),
                    ZT.el('div', { class: 'zt-social-card__body' }, [
                        ZT.el('div', { class: 'zt-social-card__domain', text: domain.toUpperCase() }),
                        ZT.el('div', { class: 'zt-social-card__title', text: truncate(o.title || 'Your page title', 70) }),
                        ZT.el('div', { class: 'zt-social-card__desc', text: truncate(o.description || '', 120) })
                    ])
                ]);

                results.unshift(ZT.nodeResult(
                    ZT.el('div', { class: 'zt-preview-pair' }, [
                        ZT.el('div', {}, [ZT.el('h4', { class: 'zt-preview-label', text: 'Google result' }), serp]),
                        ZT.el('div', {}, [ZT.el('h4', { class: 'zt-preview-label', text: 'Social share' }), social])
                    ]),
                    { title: 'Preview' }
                ));
            }

            return results;
        }
    });

    function truncate(s, n) {
        s = String(s || '');
        return s.length > n ? s.slice(0, n - 1).trim() + '…' : s;
    }

    /* ============================================================
       Schema / structured data
       ============================================================ */
    define({
        id: 'schema-markup-generator',
        name: 'Schema Markup Generator',
        category: 'seo',
        icon: 'braces',
        description: 'Build JSON-LD structured data for articles, products, FAQs and more.',
        tags: ['schema', 'json-ld', 'structured data', 'rich results', 'seo'],
        input: 'none',
        options: [
            {
                id: 'type', type: 'select', label: 'Schema type', value: 'Article',
                options: [
                    { value: 'Article', label: 'Article / Blog post' },
                    { value: 'Product', label: 'Product' },
                    { value: 'FAQPage', label: 'FAQ page' },
                    { value: 'LocalBusiness', label: 'Local business' },
                    { value: 'Organization', label: 'Organisation' },
                    { value: 'Person', label: 'Person' },
                    { value: 'BreadcrumbList', label: 'Breadcrumbs' },
                    { value: 'Event', label: 'Event' },
                    { value: 'Recipe', label: 'Recipe' },
                    { value: 'VideoObject', label: 'Video' }
                ]
            },
            { id: 'name', type: 'text', label: 'Name / headline', value: '' },
            { id: 'description', type: 'textarea', label: 'Description', value: '', rows: 2 },
            { id: 'url', type: 'text', label: 'URL', value: '' },
            { id: 'image', type: 'text', label: 'Image URL', value: '' },

            { id: 'author', type: 'text', label: 'Author name', value: '', when: typeIn(['Article', 'Recipe']) },
            { id: 'publisher', type: 'text', label: 'Publisher name', value: '', when: typeIn(['Article']) },
            { id: 'date-published', type: 'date', label: 'Date published', value: '', when: typeIn(['Article', 'VideoObject']) },
            { id: 'date-modified', type: 'date', label: 'Date modified', value: '', when: typeIn(['Article']) },

            { id: 'price', type: 'text', label: 'Price', value: '', when: typeIn(['Product', 'Event']) },
            { id: 'currency', type: 'text', label: 'Currency code', value: 'USD', when: typeIn(['Product', 'Event']) },
            { id: 'availability', type: 'select', label: 'Availability', value: 'InStock',
              options: [
                  { value: 'InStock', label: 'In stock' }, { value: 'OutOfStock', label: 'Out of stock' },
                  { value: 'PreOrder', label: 'Pre-order' }, { value: 'Discontinued', label: 'Discontinued' }
              ],
              when: typeIn(['Product']) },
            { id: 'brand', type: 'text', label: 'Brand', value: '', when: typeIn(['Product']) },
            { id: 'sku', type: 'text', label: 'SKU', value: '', when: typeIn(['Product']) },
            { id: 'rating', type: 'text', label: 'Average rating', value: '', when: typeIn(['Product', 'Recipe']), help: 'For example 4.6' },
            { id: 'review-count', type: 'text', label: 'Number of reviews', value: '', when: typeIn(['Product', 'Recipe']) },

            { id: 'phone', type: 'text', label: 'Phone number', value: '', when: typeIn(['LocalBusiness', 'Organization']) },
            { id: 'street', type: 'text', label: 'Street address', value: '', when: typeIn(['LocalBusiness', 'Organization', 'Event']) },
            { id: 'city', type: 'text', label: 'City', value: '', when: typeIn(['LocalBusiness', 'Organization', 'Event']) },
            { id: 'region', type: 'text', label: 'Region / state', value: '', when: typeIn(['LocalBusiness', 'Organization', 'Event']) },
            { id: 'postal-code', type: 'text', label: 'Postcode', value: '', when: typeIn(['LocalBusiness', 'Organization', 'Event']) },
            { id: 'country', type: 'text', label: 'Country', value: '', when: typeIn(['LocalBusiness', 'Organization', 'Event']) },

            { id: 'start-date', type: 'datetime-local', label: 'Start date and time', value: '', when: typeIn(['Event']) },
            { id: 'end-date', type: 'datetime-local', label: 'End date and time', value: '', when: typeIn(['Event']) },

            { id: 'job-title', type: 'text', label: 'Job title', value: '', when: typeIn(['Person']) },
            { id: 'works-for', type: 'text', label: 'Works for', value: '', when: typeIn(['Person']) },

            { id: 'faq-pairs', type: 'textarea', label: 'Questions and answers', value: '', rows: 6,
              when: typeIn(['FAQPage']),
              placeholder: 'Q: How much does it cost?\nA: It is free.\n\nQ: Do you store my files?\nA: No.',
              help: 'One "Q:" line followed by an "A:" line per question.' },

            { id: 'breadcrumbs', type: 'textarea', label: 'Breadcrumb trail', value: '', rows: 4,
              when: typeIn(['BreadcrumbList']),
              placeholder: 'Home | https://example.com\nBlog | https://example.com/blog\nThis post | https://example.com/blog/post',
              help: 'One "Name | URL" pair per line.' },

            { id: 'wrap-script', type: 'checkbox', label: 'Wrap in a <script> tag', value: true }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var schema = { '@context': 'https://schema.org', '@type': o.type };

            function setIf(key, value) { if (value !== undefined && value !== null && value !== '') schema[key] = value; }

            function postalAddress() {
                if (!o.street && !o.city && !o.country) return null;
                var address = { '@type': 'PostalAddress' };
                if (o.street) address.streetAddress = o.street;
                if (o.city) address.addressLocality = o.city;
                if (o.region) address.addressRegion = o.region;
                if (o.postalCode) address.postalCode = o.postalCode;
                if (o.country) address.addressCountry = o.country;
                return address;
            }

            switch (o.type) {
                case 'FAQPage': {
                    var faqs = parseFaq(o.faqPairs);
                    if (!faqs.length) ZT.fail('Add at least one Q: / A: pair.');
                    schema.mainEntity = faqs.map(function (pair) {
                        return {
                            '@type': 'Question',
                            name: pair.question,
                            acceptedAnswer: { '@type': 'Answer', text: pair.answer }
                        };
                    });
                    break;
                }
                case 'BreadcrumbList': {
                    var crumbs = String(o.breadcrumbs || '').split(/\r?\n/).filter(function (l) { return l.trim(); });
                    if (!crumbs.length) ZT.fail('Add at least one "Name | URL" line.');
                    schema.itemListElement = crumbs.map(function (line, i) {
                        var parts = line.split('|');
                        return {
                            '@type': 'ListItem',
                            position: i + 1,
                            name: (parts[0] || '').trim(),
                            item: (parts[1] || '').trim() || undefined
                        };
                    });
                    break;
                }
                case 'Article':
                    setIf('headline', o.name);
                    setIf('description', o.description);
                    setIf('image', o.image);
                    setIf('url', o.url);
                    if (o.author) schema.author = { '@type': 'Person', name: o.author };
                    if (o.publisher) schema.publisher = { '@type': 'Organization', name: o.publisher };
                    setIf('datePublished', o.datePublished);
                    setIf('dateModified', o.dateModified || o.datePublished);
                    if (o.url) schema.mainEntityOfPage = { '@type': 'WebPage', '@id': o.url };
                    break;
                case 'Product':
                    setIf('name', o.name);
                    setIf('description', o.description);
                    setIf('image', o.image);
                    setIf('sku', o.sku);
                    if (o.brand) schema.brand = { '@type': 'Brand', name: o.brand };
                    if (o.price) {
                        schema.offers = {
                            '@type': 'Offer',
                            price: String(o.price).replace(/[^0-9.]/g, ''),
                            priceCurrency: o.currency || 'USD',
                            availability: 'https://schema.org/' + o.availability
                        };
                        if (o.url) schema.offers.url = o.url;
                    }
                    if (o.rating && o.reviewCount) {
                        schema.aggregateRating = {
                            '@type': 'AggregateRating',
                            ratingValue: o.rating,
                            reviewCount: o.reviewCount
                        };
                    }
                    break;
                case 'LocalBusiness':
                case 'Organization':
                    setIf('name', o.name);
                    setIf('description', o.description);
                    setIf('url', o.url);
                    setIf('logo', o.image);
                    setIf('image', o.image);
                    setIf('telephone', o.phone);
                    var addr = postalAddress();
                    if (addr) schema.address = addr;
                    break;
                case 'Person':
                    setIf('name', o.name);
                    setIf('description', o.description);
                    setIf('url', o.url);
                    setIf('image', o.image);
                    setIf('jobTitle', o.jobTitle);
                    if (o.worksFor) schema.worksFor = { '@type': 'Organization', name: o.worksFor };
                    break;
                case 'Event':
                    setIf('name', o.name);
                    setIf('description', o.description);
                    setIf('url', o.url);
                    setIf('image', o.image);
                    setIf('startDate', o.startDate);
                    setIf('endDate', o.endDate);
                    var venue = postalAddress();
                    if (venue) schema.location = { '@type': 'Place', name: o.city || o.name, address: venue };
                    if (o.price) {
                        schema.offers = { '@type': 'Offer', price: String(o.price).replace(/[^0-9.]/g, ''), priceCurrency: o.currency || 'USD' };
                    }
                    break;
                case 'Recipe':
                    setIf('name', o.name);
                    setIf('description', o.description);
                    setIf('image', o.image);
                    if (o.author) schema.author = { '@type': 'Person', name: o.author };
                    if (o.rating && o.reviewCount) {
                        schema.aggregateRating = { '@type': 'AggregateRating', ratingValue: o.rating, reviewCount: o.reviewCount };
                    }
                    break;
                case 'VideoObject':
                    setIf('name', o.name);
                    setIf('description', o.description);
                    setIf('thumbnailUrl', o.image);
                    setIf('contentUrl', o.url);
                    setIf('uploadDate', o.datePublished);
                    break;
                default:
                    setIf('name', o.name);
                    setIf('description', o.description);
                    setIf('url', o.url);
                    setIf('image', o.image);
            }

            var json = JSON.stringify(schema, null, 2);
            var output = o.wrapScript
                ? '<script type="application/ld+json">\n' + json + '\n<\/script>'
                : json;

            return [
                ZT.textResult(output, { lang: o.wrapScript ? 'html' : 'json', title: 'JSON-LD structured data' }),
                ZT.dataResult([
                    { label: 'Schema type', value: o.type },
                    { label: 'Properties set', value: String(Object.keys(schema).length - 2) },
                    { label: 'Validate at', value: 'https://validator.schema.org' },
                    { label: 'Rich results test', value: 'https://search.google.com/test/rich-results' }
                ], { title: 'Next steps', columns: 2 })
            ];
        }
    });

    function typeIn(list) {
        return function (o) { return list.indexOf(o.type) !== -1; };
    }

    function parseFaq(text) {
        var pairs = [];
        var current = null;
        String(text || '').split(/\r?\n/).forEach(function (line) {
            var q = line.match(/^\s*Q\s*[:.)-]\s*(.+)$/i);
            var a = line.match(/^\s*A\s*[:.)-]\s*(.+)$/i);
            if (q) {
                if (current && current.answer) pairs.push(current);
                current = { question: q[1].trim(), answer: '' };
            } else if (a && current) {
                current.answer = a[1].trim();
            } else if (current && current.answer && line.trim()) {
                current.answer += ' ' + line.trim();
            }
        });
        if (current && current.answer) pairs.push(current);
        return pairs;
    }

    /* ============================================================
       robots.txt
       ============================================================ */
    define({
        id: 'robots-txt-generator',
        name: 'robots.txt Generator',
        category: 'seo',
        icon: 'bot',
        description: 'Build a robots.txt file with crawl rules and a sitemap reference.',
        tags: ['robots', 'robots.txt', 'crawler', 'seo', 'disallow'],
        input: 'none',
        options: [
            {
                id: 'preset', type: 'select', label: 'Start from', value: 'allow-all',
                options: [
                    { value: 'allow-all', label: 'Allow everything' },
                    { value: 'block-all', label: 'Block everything' },
                    { value: 'standard', label: 'Typical site (block admin and search pages)' },
                    { value: 'wordpress', label: 'WordPress' },
                    { value: 'custom', label: 'Custom' }
                ]
            },
            { id: 'disallow', type: 'textarea', label: 'Disallow paths', value: '', rows: 5, placeholder: '/admin/\n/private/\n/tmp/', when: presetIsCustom, help: 'One path per line.' },
            { id: 'allow', type: 'textarea', label: 'Allow paths', value: '', rows: 3, placeholder: '/public/', when: presetIsCustom },
            { id: 'sitemap', type: 'text', label: 'Sitemap URL', value: '', placeholder: 'https://example.com/sitemap.xml' },
            { id: 'crawl-delay', type: 'number', label: 'Crawl delay', suffix: 'seconds', value: 0, min: 0, max: 120, help: '0 omits the directive. Google ignores it; Bing and Yandex honour it.' },
            { id: 'block-ai', type: 'checkbox', label: 'Block common AI training crawlers', value: false },
            { id: 'block-bad-bots', type: 'checkbox', label: 'Block aggressive SEO scraper bots', value: false }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var lines = ['# robots.txt generated by ZyncTools', ''];

            var PRESETS = {
                'allow-all': { disallow: [], allow: [] },
                'block-all': { disallow: ['/'], allow: [] },
                standard: { disallow: ['/admin/', '/login', '/cart', '/checkout', '/search', '/*?s=', '/tmp/'], allow: [] },
                wordpress: { disallow: ['/wp-admin/', '/wp-includes/', '/wp-content/plugins/', '/readme.html', '/?s='], allow: ['/wp-admin/admin-ajax.php'] }
            };

            var rules = o.preset === 'custom'
                ? {
                    disallow: splitLines(o.disallow),
                    allow: splitLines(o.allow)
                }
                : PRESETS[o.preset];

            lines.push('User-agent: *');
            rules.allow.forEach(function (p) { lines.push('Allow: ' + normalisePath(p)); });
            if (rules.disallow.length) {
                rules.disallow.forEach(function (p) { lines.push('Disallow: ' + normalisePath(p)); });
            } else {
                lines.push('Disallow:');
            }
            if (o.crawlDelay > 0) lines.push('Crawl-delay: ' + o.crawlDelay);

            if (o.blockAi) {
                lines.push('', '# AI training crawlers');
                ['GPTBot', 'ChatGPT-User', 'CCBot', 'anthropic-ai', 'ClaudeBot', 'Google-Extended', 'PerplexityBot', 'Applebot-Extended', 'Bytespider']
                    .forEach(function (bot) {
                        lines.push('User-agent: ' + bot);
                        lines.push('Disallow: /');
                        lines.push('');
                    });
                lines.pop();
            }

            if (o.blockBadBots) {
                lines.push('', '# Aggressive SEO crawlers');
                ['AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'BLEXBot', 'DataForSeoBot']
                    .forEach(function (bot) {
                        lines.push('User-agent: ' + bot);
                        lines.push('Disallow: /');
                        lines.push('');
                    });
                lines.pop();
            }

            if (o.sitemap) {
                lines.push('', 'Sitemap: ' + o.sitemap.trim());
            }

            var content = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';

            return [
                ZT.textResult(content, { mono: true, title: 'robots.txt' }),
                ZT.fileResult(new Blob([content], { type: 'text/plain' }), 'robots.txt', {
                    note: 'Upload to the root of your domain'
                })
            ];
        }
    });

    function presetIsCustom(o) { return o.preset === 'custom'; }

    function splitLines(text) {
        return String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    }

    function normalisePath(p) {
        return p.charAt(0) === '/' ? p : '/' + p;
    }

    /* ============================================================
       Sitemap
       ============================================================ */
    define({
        id: 'sitemap-generator',
        name: 'XML Sitemap Generator',
        category: 'seo',
        icon: 'network',
        description: 'Turn a list of URLs into a valid XML sitemap with priorities.',
        tags: ['sitemap', 'xml', 'seo', 'urls', 'crawl'],
        input: 'text',
        inputLabel: 'URLs — one per line',
        placeholder: 'https://example.com/\nhttps://example.com/about\nhttps://example.com/blog',
        options: [
            {
                id: 'changefreq', type: 'select', label: 'Change frequency', value: 'weekly',
                options: [
                    { value: '', label: 'Do not include' }, { value: 'always', label: 'Always' },
                    { value: 'hourly', label: 'Hourly' }, { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' },
                    { value: 'yearly', label: 'Yearly' }, { value: 'never', label: 'Never' }
                ]
            },
            { id: 'priority', type: 'range', label: 'Default priority', value: 0.8, min: 0, max: 1, step: 0.1 },
            { id: 'auto-priority', type: 'checkbox', label: 'Lower the priority for deeper pages', value: true, help: 'The homepage gets 1.0 and each extra path segment reduces it.' },
            { id: 'lastmod', type: 'checkbox', label: 'Include a last-modified date', value: true },
            { id: 'lastmod-date', type: 'date', label: 'Last modified', value: '', when: function (o) { return o.lastmod; }, help: 'Leave empty to use today.' },
            { id: 'strip-trailing', type: 'checkbox', label: 'Normalise trailing slashes', value: false }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var urls = splitLines(ctx.text);
            if (!urls.length) ZT.fail('Add at least one URL, one per line.');

            var date = o.lastmodDate || new Date().toISOString().slice(0, 10);
            var seen = {};
            var entries = [];
            var skipped = 0;

            urls.forEach(function (raw) {
                var url = raw;
                if (!/^https?:\/\//i.test(url)) url = 'https://' + url.replace(/^\/+/, '');

                var parsed;
                try {
                    parsed = new URL(url);
                } catch (e) { skipped++; return; }

                if (o.stripTrailing && parsed.pathname !== '/' ) {
                    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
                }
                var normalised = parsed.toString();
                if (seen[normalised]) { skipped++; return; }
                seen[normalised] = true;

                var depth = parsed.pathname.split('/').filter(Boolean).length;
                var priority = o.autoPriority
                    ? Math.max(0.1, Math.min(1, 1 - depth * 0.2)).toFixed(1)
                    : Number(o.priority).toFixed(1);

                entries.push({ loc: normalised, priority: priority, depth: depth });
            });

            if (!entries.length) ZT.fail('None of those lines were valid URLs.');
            entries.sort(function (a, b) { return a.depth - b.depth || a.loc.localeCompare(b.loc); });

            var xml = ['<?xml version="1.0" encoding="UTF-8"?>',
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];

            entries.forEach(function (entry) {
                xml.push('  <url>');
                xml.push('    <loc>' + esc(entry.loc) + '</loc>');
                if (o.lastmod) xml.push('    <lastmod>' + date + '</lastmod>');
                if (o.changefreq) xml.push('    <changefreq>' + o.changefreq + '</changefreq>');
                xml.push('    <priority>' + entry.priority + '</priority>');
                xml.push('  </url>');
            });
            xml.push('</urlset>');

            var content = xml.join('\n');
            return [
                ZT.textResult(content, { lang: 'xml', note: entries.length + ' URLs' + (skipped ? ' · ' + skipped + ' skipped as invalid or duplicate' : '') }),
                ZT.fileResult(new Blob([content], { type: 'application/xml' }), 'sitemap.xml', {
                    note: 'Upload to your site root and reference it from robots.txt'
                })
            ];
        }
    });

    /* ============================================================
       Keyword density
       ============================================================ */
    define({
        id: 'keyword-density-checker',
        name: 'Keyword Density Checker',
        category: 'seo',
        icon: 'chart-bar',
        description: 'Analyse word and phrase frequency to spot thin or over-optimised copy.',
        tags: ['keyword', 'density', 'seo', 'content', 'frequency', 'analysis'],
        input: 'text',
        live: true,
        placeholder: 'Paste your page copy here…',
        options: [
            { id: 'focus-keyword', type: 'text', label: 'Focus keyword', value: '', placeholder: 'the phrase you are targeting' },
            {
                id: 'phrase-length', type: 'select', label: 'Analyse', value: '1',
                options: [
                    { value: '1', label: 'Single words' }, { value: '2', label: 'Two-word phrases' },
                    { value: '3', label: 'Three-word phrases' }, { value: 'all', label: 'All of the above' }
                ]
            },
            { id: 'top-count', type: 'number', label: 'How many results', value: 20, min: 5, max: 100 },
            { id: 'min-occurrences', type: 'number', label: 'Minimum occurrences', value: 2, min: 1, max: 50 },
            { id: 'ignore-stopwords', type: 'checkbox', label: 'Ignore common stop words', value: true }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var text = String(ctx.text || '');
            var words = (text.toLowerCase().match(/[\p{L}\p{N}'-]+/gu) || [])
                .map(function (w) { return w.replace(/^['-]+|['-]+$/g, ''); })
                .filter(Boolean);

            if (words.length < 5) return ZT.dataResult([{ label: 'Status', value: 'Paste at least a few sentences to analyse.' }], { title: 'Keyword density' });

            var STOP = ('a an the and or but if then than that this these those of in on at to for with from by as is are was were be been ' +
                'being have has had do does did will would can could should may might must i you he she it we they them his her its our ' +
                'their my your not no so up out about into over after before more most some any all each other such only own same very').split(' ');

            function analyse(n) {
                var counts = {};
                for (var i = 0; i <= words.length - n; i++) {
                    var slice = words.slice(i, i + n);
                    if (o.ignoreStopwords && (STOP.indexOf(slice[0]) !== -1 || STOP.indexOf(slice[n - 1]) !== -1)) continue;
                    if (n === 1 && slice[0].length < 3) continue;
                    var phrase = slice.join(' ');
                    counts[phrase] = (counts[phrase] || 0) + 1;
                }
                var total = words.length - n + 1;
                return Object.keys(counts)
                    .filter(function (k) { return counts[k] >= o.minOccurrences; })
                    .sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); })
                    .slice(0, o.topCount)
                    .map(function (k) {
                        return { label: k, value: counts[k] + '×   ' + (counts[k] / total * 100).toFixed(2) + '%' };
                    });
            }

            var results = [];
            var lengths = o.phraseLength === 'all' ? [1, 2, 3] : [parseInt(o.phraseLength, 10)];
            var LABELS = { 1: 'Single words', 2: 'Two-word phrases', 3: 'Three-word phrases' };

            if (o.focusKeyword.trim()) {
                var focus = o.focusKeyword.trim().toLowerCase();
                var focusWords = focus.split(/\s+/).length;
                var haystack = words.join(' ');
                var matches = 0;
                var idx = haystack.indexOf(focus);
                while (idx !== -1) { matches++; idx = haystack.indexOf(focus, idx + 1); }

                var density = matches / Math.max(1, words.length - focusWords + 1) * 100;
                var verdict = density === 0 ? 'Not found in the copy at all'
                    : density < 0.5 ? 'Very low — consider using it a little more'
                    : density <= 2.5 ? 'Healthy range'
                    : 'High — this reads as keyword stuffing to search engines';

                results.push(ZT.dataResult([
                    { label: 'Focus keyword', value: o.focusKeyword },
                    { label: 'Occurrences', value: String(matches) },
                    { label: 'Density', value: density.toFixed(2) + '%' },
                    { label: 'Assessment', value: verdict },
                    { label: 'In the first 100 words', value: words.slice(0, 100).join(' ').indexOf(focus) !== -1 ? 'Yes — good' : 'No — try to mention it early' }
                ], { title: 'Focus keyword', columns: 2 }));
            }

            results.push(ZT.dataResult([
                { label: 'Total words', value: ZT.formatNumber(words.length) },
                { label: 'Unique words', value: ZT.formatNumber(Object.keys(words.reduce(function (a, w) { a[w] = 1; return a; }, {})).length) },
                { label: 'Reading time', value: Math.max(1, Math.round(words.length / 220)) + ' min' }
            ], { title: 'Overview', columns: 3 }));

            lengths.forEach(function (n) {
                var rows = analyse(n);
                if (rows.length) results.push(ZT.dataResult(rows, { title: LABELS[n], columns: 2 }));
            });

            return results;
        }
    });

    /* ============================================================
       UTM builder
       ============================================================ */
    define({
        id: 'utm-builder',
        name: 'UTM Campaign Builder',
        category: 'seo',
        icon: 'link',
        description: 'Build tagged campaign URLs that analytics tools can attribute.',
        tags: ['utm', 'campaign', 'analytics', 'tracking', 'ga4', 'marketing'],
        input: 'none',
        options: [
            { id: 'url', type: 'text', label: 'Destination URL', value: '', placeholder: 'https://example.com/landing' },
            { id: 'source', type: 'text', label: 'Campaign source', value: '', placeholder: 'newsletter, google, twitter', help: 'utm_source — where the traffic comes from.' },
            { id: 'medium', type: 'text', label: 'Campaign medium', value: '', placeholder: 'email, cpc, social', help: 'utm_medium — the marketing channel.' },
            { id: 'campaign', type: 'text', label: 'Campaign name', value: '', placeholder: 'spring-sale-2026' },
            { id: 'term', type: 'text', label: 'Campaign term', value: '', placeholder: 'paid keywords (optional)' },
            { id: 'content', type: 'text', label: 'Campaign content', value: '', placeholder: 'to tell two ads apart (optional)' },
            { id: 'id', type: 'text', label: 'Campaign ID', value: '', placeholder: 'optional' },
            { id: 'lowercase', type: 'checkbox', label: 'Force parameters to lowercase', value: true, help: 'Analytics treats Email and email as different sources, so this avoids split reporting.' },
            { id: 'replace-spaces', type: 'checkbox', label: 'Replace spaces with hyphens', value: true }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            if (!o.url.trim() && !o.source.trim() && !o.medium.trim()) {
                return ZT.dataResult([
                    { label: 'Waiting for input', value: 'Fill in the destination URL, source and medium above.' },
                    { label: 'Why those three', value: 'Analytics tools need utm_source and utm_medium to attribute a visit to a campaign. Without them the traffic lands in "direct".' }
                ], { title: 'Campaign URL', columns: 1 });
            }
            if (!o.url.trim()) ZT.fail('Enter the destination URL.');
            if (!o.source.trim() || !o.medium.trim()) ZT.fail('Campaign source and medium are both required for attribution to work.');

            var base = o.url.trim();
            if (!/^https?:\/\//i.test(base)) base = 'https://' + base;

            var parsed;
            try {
                parsed = new URL(base);
            } catch (e) {
                ZT.fail('That destination URL is not valid.');
            }

            function clean(value) {
                var v = String(value || '').trim();
                if (!v) return '';
                if (o.lowercase) v = v.toLowerCase();
                if (o.replaceSpaces) v = v.replace(/\s+/g, '-');
                return v;
            }

            var params = [
                ['utm_source', clean(o.source)],
                ['utm_medium', clean(o.medium)],
                ['utm_campaign', clean(o.campaign)],
                ['utm_term', clean(o.term)],
                ['utm_content', clean(o.content)],
                ['utm_id', clean(o.id)]
            ].filter(function (pair) { return pair[1]; });

            params.forEach(function (pair) { parsed.searchParams.set(pair[0], pair[1]); });
            var finalUrl = parsed.toString();

            return [
                ZT.textResult(finalUrl, { mono: true, title: 'Tagged URL' }),
                ZT.dataResult(params.map(function (pair) {
                    return { label: pair[0], value: pair[1] };
                }).concat([
                    { label: 'Length', value: finalUrl.length + ' characters' }
                ]), { title: 'Parameters', columns: 2, mono: true })
            ];
        }
    });

    /* ============================================================
       Heading / content structure
       ============================================================ */
    define({
        id: 'html-heading-analyzer',
        name: 'HTML Heading Analyser',
        category: 'seo',
        icon: 'heading',
        description: 'Check heading hierarchy, link counts and image alt text in HTML.',
        tags: ['headings', 'h1', 'outline', 'structure', 'accessibility', 'audit'],
        input: 'text',
        live: true,
        inputLabel: 'Page HTML',
        placeholder: '<h1>Title</h1>\n<p>…</p>\n<h2>Section</h2>',
        options: [
            { id: 'check-images', type: 'checkbox', label: 'Check image alt text', value: true },
            { id: 'check-links', type: 'checkbox', label: 'Check links', value: true },
            { id: 'show-outline', type: 'checkbox', label: 'Show the heading outline', value: true }
        ],
        run: function (ctx) {
            var html = String(ctx.text || '').trim();
            if (!html) return ZT.dataResult([{ label: 'Status', value: 'Paste some HTML to analyse.' }], { title: 'Analysis' });

            var doc = new DOMParser().parseFromString(html, 'text/html');
            var headings = Array.prototype.slice.call(doc.querySelectorAll('h1,h2,h3,h4,h5,h6'));

            var issues = [];
            var counts = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
            headings.forEach(function (h) { counts[h.tagName.toLowerCase()]++; });

            if (counts.h1 === 0) issues.push({ label: 'H1', value: 'Missing — every page should have exactly one H1' });
            else if (counts.h1 > 1) issues.push({ label: 'H1', value: counts.h1 + ' found — use only one per page' });

            var previousLevel = 0;
            headings.forEach(function (h, i) {
                var level = parseInt(h.tagName.charAt(1), 10);
                if (previousLevel && level > previousLevel + 1) {
                    issues.push({
                        label: 'Skipped level',
                        value: 'H' + previousLevel + ' is followed by H' + level + ' ("' + truncate(h.textContent.trim(), 40) + '")'
                    });
                }
                if (!h.textContent.trim()) issues.push({ label: 'Empty heading', value: h.tagName + ' at position ' + (i + 1) + ' has no text' });
                previousLevel = level;
            });

            var results = [
                ZT.dataResult([
                    { label: 'H1', value: String(counts.h1) }, { label: 'H2', value: String(counts.h2) },
                    { label: 'H3', value: String(counts.h3) }, { label: 'H4', value: String(counts.h4) },
                    { label: 'H5', value: String(counts.h5) }, { label: 'H6', value: String(counts.h6) }
                ], { title: 'Heading counts', columns: 3 })
            ];

            if (ctx.opt.showOutline && headings.length) {
                var outline = headings.map(function (h) {
                    var level = parseInt(h.tagName.charAt(1), 10);
                    return '  '.repeat(level - 1) + h.tagName + '  ' + h.textContent.trim().replace(/\s+/g, ' ');
                }).join('\n');
                results.push(ZT.textResult(outline, { mono: true, title: 'Outline' }));
            }

            if (ctx.opt.checkImages) {
                var images = Array.prototype.slice.call(doc.querySelectorAll('img'));
                var missingAlt = images.filter(function (img) { return !img.getAttribute('alt'); });
                var emptyAlt = images.filter(function (img) { return img.getAttribute('alt') === ''; });
                results.push(ZT.dataResult([
                    { label: 'Images', value: String(images.length) },
                    { label: 'Missing alt attribute', value: missingAlt.length + (missingAlt.length ? ' — add alt text or alt="" for decorative images' : '') },
                    { label: 'Decorative (alt="")', value: String(emptyAlt.length) }
                ], { title: 'Images', columns: 2 }));
            }

            if (ctx.opt.checkLinks) {
                var links = Array.prototype.slice.call(doc.querySelectorAll('a'));
                var noText = links.filter(function (a) { return !a.textContent.trim() && !a.querySelector('img'); });
                var generic = links.filter(function (a) {
                    return /^(click here|here|read more|more|link|this)$/i.test(a.textContent.trim());
                });
                var external = links.filter(function (a) { return /^https?:\/\//i.test(a.getAttribute('href') || ''); });
                results.push(ZT.dataResult([
                    { label: 'Links', value: String(links.length) },
                    { label: 'External links', value: String(external.length) },
                    { label: 'Empty link text', value: String(noText.length) },
                    { label: 'Generic link text', value: generic.length + (generic.length ? ' — "click here" tells users and crawlers nothing' : '') }
                ], { title: 'Links', columns: 2 }));
            }

            results.push(ZT.dataResult(
                issues.length ? issues : [{ label: 'Result', value: 'No structural problems found.' }],
                { title: issues.length ? 'Issues (' + issues.length + ')' : 'Issues', columns: 2 }
            ));

            return results;
        }
    });

    /* ============================================================
       hreflang
       ============================================================ */
    define({
        id: 'hreflang-generator',
        name: 'Hreflang Tag Generator',
        category: 'seo',
        icon: 'languages',
        description: 'Generate hreflang tags so search engines serve the right language.',
        tags: ['hreflang', 'international', 'i18n', 'language', 'seo', 'multilingual'],
        input: 'text',
        inputLabel: 'Language and URL pairs',
        placeholder: 'en-us | https://example.com/\nes-es | https://example.com/es/\nfr-fr | https://example.com/fr/',
        options: [
            { id: 'default-lang', type: 'text', label: 'x-default URL', value: '', placeholder: 'https://example.com/ — shown when no language matches' },
            {
                id: 'format', type: 'select', label: 'Output as', value: 'html',
                options: [
                    { value: 'html', label: 'HTML link tags' },
                    { value: 'sitemap', label: 'XML sitemap entries' },
                    { value: 'header', label: 'HTTP Link headers' }
                ]
            },
            { id: 'self-referencing', type: 'checkbox', label: 'Remind me that each page must reference itself', value: true }
        ],
        run: function (ctx) {
            var pairs = splitLines(ctx.text).map(function (line) {
                var parts = line.split('|');
                return { lang: (parts[0] || '').trim().toLowerCase(), url: (parts[1] || '').trim() };
            }).filter(function (p) { return p.lang && p.url; });

            if (!pairs.length) ZT.fail('Add at least one "language | URL" line.');

            var invalid = pairs.filter(function (p) { return !/^[a-z]{2}(-[a-z0-9]{2,4})?$/i.test(p.lang); });
            if (invalid.length) {
                ZT.fail('"' + invalid[0].lang + '" is not a valid language code. Use forms like en, en-us or zh-hant.');
            }

            var out;
            if (ctx.opt.format === 'sitemap') {
                out = ['<url>'];
                out.push('  <loc>' + esc(pairs[0].url) + '</loc>');
                pairs.forEach(function (p) {
                    out.push('  <xhtml:link rel="alternate" hreflang="' + esc(p.lang) + '" href="' + esc(p.url) + '"/>');
                });
                if (ctx.opt.defaultLang) {
                    out.push('  <xhtml:link rel="alternate" hreflang="x-default" href="' + esc(ctx.opt.defaultLang) + '"/>');
                }
                out.push('</url>');
                out = out.join('\n');
            } else if (ctx.opt.format === 'header') {
                out = pairs.map(function (p) {
                    return 'Link: <' + p.url + '>; rel="alternate"; hreflang="' + p.lang + '"';
                }).join('\n');
                if (ctx.opt.defaultLang) {
                    out += '\nLink: <' + ctx.opt.defaultLang + '>; rel="alternate"; hreflang="x-default"';
                }
            } else {
                out = pairs.map(function (p) {
                    return '<link rel="alternate" hreflang="' + esc(p.lang) + '" href="' + esc(p.url) + '">';
                }).join('\n');
                if (ctx.opt.defaultLang) {
                    out += '\n<link rel="alternate" hreflang="x-default" href="' + esc(ctx.opt.defaultLang) + '">';
                }
            }

            var results = [ZT.textResult(out, { lang: ctx.opt.format === 'html' ? 'html' : 'xml', title: 'Hreflang tags' })];

            if (ctx.opt.selfReferencing) {
                results.push(ZT.dataResult([
                    { label: 'Important', value: 'Put this complete set on every one of the listed pages, including the page itself. Hreflang is only valid when the references are reciprocal.' },
                    { label: 'Languages', value: pairs.length + ' variants' + (ctx.opt.defaultLang ? ' plus x-default' : '') }
                ], { title: 'Implementation notes', columns: 2 }));
            }

            return results;
        }
    });

})();
