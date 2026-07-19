(function () {
    'use strict';

    /* ============================================
       ZyncTools — SEO & Web Dev Tool Logic
       ============================================ */

    const TOOL_MODULES = {

        /* --- Meta Tag Generator --- */
        'meta-tag-generator': {
            init: function () {
                const container = $('#tool-options');
                if (!container) return;
                container.innerHTML = `
                    <div class="zync-option-group">
                        <label for="meta-title">Page Title</label>
                        <input id="meta-title" type="text" placeholder="My Awesome Page" />
                    </div>
                    <div class="zync-option-group">
                        <label for="meta-description">Meta Description</label>
                        <textarea id="meta-description" rows="3" placeholder="A brief description of your page..."></textarea>
                    </div>
                    <div class="zync-option-group">
                        <label for="meta-keywords">Keywords (comma separated)</label>
                        <input id="meta-keywords" type="text" placeholder="seo, web, tools" />
                    </div>
                    <div class="zync-option-group">
                        <label for="meta-author">Author</label>
                        <input id="meta-author" type="text" placeholder="Site Author" />
                    </div>
                    <div class="zync-option-group">
                        <label for="meta-robots">Robots</label>
                        <select id="meta-robots">
                            <option value="index, follow">index, follow</option>
                            <option value="noindex, follow">noindex, follow</option>
                            <option value="index, nofollow">index, nofollow</option>
                            <option value="noindex, nofollow">noindex, nofollow</option>
                        </select>
                    </div>
                `;
            },
            process: function (files, ctx) {
                const title = $('#meta-title')?.value?.trim() || '';
                const description = $('#meta-description')?.value?.trim() || '';
                const keywords = $('#meta-keywords')?.value?.trim() || '';
                const author = $('#meta-author')?.value?.trim() || '';
                const robots = $('#meta-robots')?.value || 'index, follow';

                if (!title) { ctx.showError('Title is required.'); throw new Error('Missing title'); }

                let html = `<!-- Primary Meta Tags -->\n`;
                html += `<title>${escapeHtml(title)}</title>\n`;
                html += `<meta name="title" content="${escapeHtml(title)}">\n`;
                html += `<meta name="description" content="${escapeHtml(description)}">\n`;
                if (keywords) html += `<meta name="keywords" content="${escapeHtml(keywords)}">\n`;
                if (author) html += `<meta name="author" content="${escapeHtml(author)}">\n`;
                html += `<meta name="robots" content="${escapeHtml(robots)}">\n`;
                html += `\n<!-- Open Graph / Facebook -->\n`;
                html += `<meta property="og:type" content="website">\n`;
                html += `<meta property="og:url" content="https://example.com/">\n`;
                html += `<meta property="og:title" content="${escapeHtml(title)}">\n`;
                if (description) html += `<meta property="og:description" content="${escapeHtml(description)}">\n`;
                html += `<meta property="og:image" content="https://example.com/image.jpg">\n`;
                html += `\n<!-- Twitter -->\n`;
                html += `<meta property="twitter:card" content="summary_large_image">\n`;
                html += `<meta property="twitter:url" content="https://example.com/">\n`;
                html += `<meta property="twitter:title" content="${escapeHtml(title)}">\n`;
                if (description) html += `<meta property="twitter:description" content="${escapeHtml(description)}">\n`;
                html += `<meta property="twitter:image" content="https://example.com/image.jpg">\n`;

                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                return [{ name: 'meta-tags.html', blob, type: 'text/html', size: blob.size, url, previewHtml: `<pre style="background:var(--bg-card);padding:1rem;border-radius:10px;overflow:auto;font-size:0.85rem;line-height:1.6;border:1px solid var(--border-subtle);">${escapeHtml(html)}</pre>` }];
            }
        },

        /* --- OG Tag Generator --- */
        'og-tag-generator': {
            init: function () {
                const container = $('#tool-options');
                if (!container) return;
                container.innerHTML = `
                    <div class="zync-option-group">
                        <label for="og-title">OG Title</label>
                        <input id="og-title" type="text" placeholder="My Page Title" />
                    </div>
                    <div class="zync-option-group">
                        <label for="og-description">OG Description</label>
                        <textarea id="og-description" rows="3" placeholder="Description for social sharing..."></textarea>
                    </div>
                    <div class="zync-option-group">
                        <label for="og-image">OG Image URL</label>
                        <input id="og-image" type="text" placeholder="https://example.com/image.jpg" />
                    </div>
                    <div class="zync-option-group">
                        <label for="og-url">OG URL</label>
                        <input id="og-url" type="text" placeholder="https://example.com/page" />
                    </div>
                    <div class="zync-option-group">
                        <label for="og-type">OG Type</label>
                        <select id="og-type">
                            <option value="website">Website</option>
                            <option value="article">Article</option>
                            <option value="product">Product</option>
                            <option value="video.movie">Video</option>
                        </select>
                    </div>
                `;
            },
            process: function (files, ctx) {
                const title = $('#og-title')?.value?.trim() || '';
                const description = $('#og-description')?.value?.trim() || '';
                const image = $('#og-image')?.value?.trim() || 'https://example.com/image.jpg';
                const url = $('#og-url')?.value?.trim() || 'https://example.com/';
                const type = $('#og-type')?.value || 'website';

                if (!title) { ctx.showError('OG Title is required.'); throw new Error('Missing title'); }

                let html = `<!-- Open Graph Tags -->\n`;
                html += `<meta property="og:title" content="${escapeHtml(title)}">\n`;
                if (description) html += `<meta property="og:description" content="${escapeHtml(description)}">\n`;
                html += `<meta property="og:image" content="${escapeHtml(image)}">\n`;
                html += `<meta property="og:url" content="${escapeHtml(url)}">\n`;
                html += `<meta property="og:type" content="${escapeHtml(type)}">\n`;

                const blob = new Blob([html], { type: 'text/html' });
                const urlObj = URL.createObjectURL(blob);
                return [{ name: 'og-tags.html', blob, type: 'text/html', size: blob.size, url: urlObj, previewHtml: `<pre style="background:var(--bg-card);padding:1rem;border-radius:10px;overflow:auto;font-size:0.85rem;line-height:1.6;border:1px solid var(--border-subtle);">${escapeHtml(html)}</pre>` }];
            }
        },

        /* --- Robots.txt Generator --- */
        'robots-txt-generator': {
            init: function () {
                const container = $('#tool-options');
                if (!container) return;
                container.innerHTML = `
                    <div class="zync-option-group">
                        <label>Default Rule</label>
                        <select id="robots-default">
                            <option value="allow">Allow all</option>
                            <option value="disallow">Disallow all</option>
                        </select>
                    </div>
                    <div class="zync-option-group">
                        <label for="robots-paths">Disallowed Paths (one per line)</label>
                        <textarea id="robots-paths" rows="4" placeholder="/admin/\n/private/\n/api/"></textarea>
                    </div>
                    <div class="zync-option-group">
                        <label for="robots-sitemap">Sitemap URL</label>
                        <input id="robots-sitemap" type="text" placeholder="https://example.com/sitemap.xml" />
                    </div>
                    <div class="zync-option-group">
                        <label for="robots-crawl-delay">Crawl Delay (seconds, optional)</label>
                        <input id="robots-crawl-delay" type="number" min="0" value="0" placeholder="0" />
                    </div>
                `;
            },
            process: function (files, ctx) {
                const defaultRule = $('#robots-default')?.value || 'allow';
                const paths = ($('#robots-paths')?.value || '').split('\n').map(s => s.trim()).filter(Boolean);
                const sitemap = $('#robots-sitemap')?.value?.trim() || '';
                const crawlDelay = parseInt($('#robots-crawl-delay')?.value || '0', 10);

                let txt = `User-agent: *\n`;
                txt += `${defaultRule === 'allow' ? 'Allow: /' : 'Disallow: /'}\n`;
                paths.forEach(p => txt += `Disallow: ${p}\n`);
                if (crawlDelay > 0) txt += `Crawl-delay: ${crawlDelay}\n`;
                if (sitemap) txt += `\nSitemap: ${sitemap}\n`;

                const blob = new Blob([txt], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                return [{ name: 'robots.txt', blob, type: 'text/plain', size: blob.size, url, previewHtml: `<pre style="background:var(--bg-card);padding:1rem;border-radius:10px;overflow:auto;font-size:0.85rem;line-height:1.6;border:1px solid var(--border-subtle);">${escapeHtml(txt)}</pre>` }];
            }
        },

        /* --- Sitemap.xml Generator --- */
        'sitemap-xml-generator': {
            init: function () {
                const container = $('#tool-options');
                if (!container) return;
                container.innerHTML = `
                    <div class="zync-option-group">
                        <label for="sitemap-urls">URLs (one per line)</label>
                        <textarea id="sitemap-urls" rows="6" placeholder="https://example.com/\nhttps://example.com/about\nhttps://example.com/contact"></textarea>
                    </div>
                    <div class="zync-option-group">
                        <label for="sitemap-changefreq">Change Frequency</label>
                        <select id="sitemap-changefreq">
                            <option value="always">Always</option>
                            <option value="hourly">Hourly</option>
                            <option value="daily" selected>Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                            <option value="never">Never</option>
                        </select>
                    </div>
                    <div class="zync-option-group">
                        <label for="sitemap-priority">Priority (0.0 - 1.0)</label>
                        <input id="sitemap-priority" type="number" min="0" max="1" step="0.1" value="0.8" />
                    </div>
                `;
            },
            process: function (files, ctx) {
                const urls = ($('#sitemap-urls')?.value || '').split('\n').map(s => s.trim()).filter(Boolean);
                const changefreq = $('#sitemap-changefreq')?.value || 'daily';
                const priority = parseFloat($('#sitemap-priority')?.value || '0.8');

                if (!urls.length) { ctx.showError('At least one URL is required.'); throw new Error('No URLs'); }

                const today = new Date().toISOString().split('T')[0];
                let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
                xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
                urls.forEach(url => {
                    xml += `  <url>\n`;
                    xml += `    <loc>${escapeHtml(url)}</loc>\n`;
                    xml += `    <lastmod>${today}</lastmod>\n`;
                    xml += `    <changefreq>${changefreq}</changefreq>\n`;
                    xml += `    <priority>${priority.toFixed(1)}</priority>\n`;
                    xml += `  </url>\n`;
                });
                xml += `</urlset>`;

                const blob = new Blob([xml], { type: 'application/xml' });
                const url = URL.createObjectURL(blob);
                return [{ name: 'sitemap.xml', blob, type: 'application/xml', size: blob.size, url, previewHtml: `<pre style="background:var(--bg-card);padding:1rem;border-radius:10px;overflow:auto;font-size:0.85rem;line-height:1.6;border:1px solid var(--border-subtle);">${escapeHtml(xml)}</pre>` }];
            }
        },

        /* --- Schema Markup Generator --- */
        'schema-markup-generator': {
            init: function () {
                const container = $('#tool-options');
                if (!container) return;
                container.innerHTML = `
                    <div class="zync-option-group">
                        <label for="schema-type">Schema Type</label>
                        <select id="schema-type">
                            <option value="Organization">Organization</option>
                            <option value="Person">Person</option>
                            <option value="WebSite">WebSite</option>
                            <option value="Article">Article</option>
                            <option value="Product">Product</option>
                            <option value="LocalBusiness">Local Business</option>
                        </select>
                    </div>
                    <div class="zync-option-group">
                        <label for="schema-name">Name / Title</label>
                        <input id="schema-name" type="text" placeholder="My Business" />
                    </div>
                    <div class="zync-option-group">
                        <label for="schema-url">URL</label>
                        <input id="schema-url" type="text" placeholder="https://example.com" />
                    </div>
                    <div class="zync-option-group">
                        <label for="schema-description">Description</label>
                        <textarea id="schema-description" rows="3" placeholder="Brief description..."></textarea>
                    </div>
                `;
            },
            process: function (files, ctx) {
                const type = $('#schema-type')?.value || 'Organization';
                const name = $('#schema-name')?.value?.trim() || '';
                const url = $('#schema-url')?.value?.trim() || '';
                const description = $('#schema-description')?.value?.trim() || '';

                if (!name) { ctx.showError('Name is required.'); throw new Error('Missing name'); }

                const schema = {
                    "@context": "https://schema.org",
                    "@type": type,
                    "name": name,
                    "url": url || undefined,
                    "description": description || undefined
                };

                const json = JSON.stringify(schema, null, 2);
                const html = `<script type="application/ld+json">\n${json}\n<\/script>`;

                const blob = new Blob([html], { type: 'text/html' });
                const urlObj = URL.createObjectURL(blob);
                return [{ name: 'schema-markup.html', blob, type: 'text/html', size: blob.size, url: urlObj, previewHtml: `<pre style="background:var(--bg-card);padding:1rem;border-radius:10px;overflow:auto;font-size:0.85rem;line-height:1.6;border:1px solid var(--border-subtle);">${escapeHtml(html)}</pre>` }];
            }
        },

        /* --- Canonical Tag Generator --- */
        'canonical-tag-generator': {
            init: function () {
                const container = $('#tool-options');
                if (!container) return;
                container.innerHTML = `
                    <div class="zync-option-group">
                        <label for="canonical-url">Canonical URL</label>
                        <input id="canonical-url" type="text" placeholder="https://example.com/page" />
                    </div>
                `;
            },
            process: function (files, ctx) {
                const url = $('#canonical-url')?.value?.trim();
                if (!url) { ctx.showError('Canonical URL is required.'); throw new Error('Missing URL'); }
                const html = `<link rel="canonical" href="${escapeHtml(url)}" />`;
                const blob = new Blob([html], { type: 'text/html' });
                const urlObj = URL.createObjectURL(blob);
                return [{ name: 'canonical-tag.html', blob, type: 'text/html', size: blob.size, url: urlObj, previewHtml: `<pre style="background:var(--bg-card);padding:1rem;border-radius:10px;overflow:auto;font-size:0.85rem;line-height:1.6;border:1px solid var(--border-subtle);">${escapeHtml(html)}</pre>` }];
            }
        },

        /* --- Hreflang Generator --- */
        'hreflang-generator': {
            init: function () {
                const container = $('#tool-options');
                if (!container) return;
                container.innerHTML = `
                    <div class="zync-option-group">
                        <label for="hreflang-default">Default URL</label>
                        <input id="hreflang-default" type="text" placeholder="https://example.com/page" />
                    </div>
                    <div class="zync-option-group">
                        <label for="hreflang-langs">Language Codes and URLs (lang=url, one per line)</label>
                        <textarea id="hreflang-langs" rows="6" placeholder="en=https://example.com/en/page\nfr=https://example.com/fr/page\nes=https://example.com/es/page"></textarea>
                    </div>
                `;
            },
            process: function (files, ctx) {
                const defaultUrl = $('#hreflang-default')?.value?.trim();
                const lines = ($('#hreflang-langs')?.value || '').split('\n').map(s => s.trim()).filter(Boolean);

                if (!defaultUrl && !lines.length) { ctx.showError('Provide at least one URL.'); throw new Error('Missing URLs'); }

                let html = `<!-- Hreflang Tags -->\n`;
                if (defaultUrl) html += `<link rel="alternate" href="${escapeHtml(defaultUrl)}" hreflang="x-default" />\n`;
                lines.forEach(line => {
                    const [lang, url] = line.split('=');
                    if (lang && url) html += `<link rel="alternate" href="${escapeHtml(url.trim())}" hreflang="${escapeHtml(lang.trim())}" />\n`;
                });

                const blob = new Blob([html], { type: 'text/html' });
                const urlObj = URL.createObjectURL(blob);
                return [{ name: 'hreflang-tags.html', blob, type: 'text/html', size: blob.size, url: urlObj, previewHtml: `<pre style="background:var(--bg-card);padding:1rem;border-radius:10px;overflow:auto;font-size:0.85rem;line-height:1.6;border:1px solid var(--border-subtle);">${escapeHtml(html)}</pre>` }];
            }
        },

        /* --- HTML Minifier --- */
        'html-minifier': {
            init: function () {
                const container = $('#tool-options');
                if (!container) return;
                container.innerHTML = `
                    <div class="zync-option-group">
                        <label for="html-input">HTML Input</label>
                        <textarea id="html-input" rows="10" placeholder="Paste your HTML here..."></textarea>
                    </div>
                    <div class="zync-option-group">
                        <label>
                            <input type="checkbox" id="html-remove-comments" checked /> Remove comments
                        </label>
                    </div>
                    <div class="zync-option-group">
                        <label>
                            <input type="checkbox" id="html-collapse-whitespace" checked /> Collapse whitespace
                        </label>
                    </div>
                `;
            },
            process: function (files, ctx) {
                let html = $('#html-input')?.value || '';
                if (!html.trim()) { ctx.showError('HTML input is required.'); throw new Error('Empty input'); }

                const removeComments = $('#html-remove-comments')?.checked ?? true;
                const collapseWhitespace = $('#html-collapse-whitespace')?.checked ?? true;

                if (removeComments) html = html.replace(/<!--[\s\S]*?-->/g, '');
                if (collapseWhitespace) html = html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();

                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                return [{ name: 'minified.html', blob, type: 'text/html', size: blob.size, url, previewHtml: `<pre style="background:var(--bg-card);padding:1rem;border-radius:10px;overflow:auto;font-size:0.85rem;line-height:1.6;border:1px solid var(--border-subtle);">${escapeHtml(html)}</pre>` }];
            }
        },

        /* --- Contrast Checker --- */
        'contrast-checker': {
            init: function () {
                const container = $('#tool-options');
                if (!container) return;
                container.innerHTML = `
                    <div class="zync-option-group">
                        <label for="contrast-fg">Foreground Color (HEX)</label>
                        <input id="contrast-fg" type="text" value="#FFFFFF" placeholder="#FFFFFF" />
                    </div>
                    <div class="zync-option-group">
                        <label for="contrast-bg">Background Color (HEX)</label>
                        <input id="contrast-bg" type="text" value="#6366F1" placeholder="#6366F1" />
                    </div>
                    <div class="zync-option-group">
                        <label for="contrast-text">Sample Text</label>
                        <input id="contrast-text" type="text" value="The quick brown fox jumps over the lazy dog." />
                    </div>
                `;
            },
            process: function (files, ctx) {
                const fg = $('#contrast-fg')?.value?.trim() || '#FFFFFF';
                const bg = $('#contrast-bg')?.value?.trim() || '#6366F1';
                const sampleText = $('#contrast-text')?.value?.trim() || 'Sample Text';

                const fgRGB = hexToRgb(fg);
                const bgRGB = hexToRgb(bg);
                if (!fgRGB || !bgRGB) { ctx.showError('Invalid HEX color.'); throw new Error('Invalid color'); }

                const ratio = getContrastRatio(fgRGB, bgRGB);
                const aaNormal = ratio >= 4.5;
                const aaLarge = ratio >= 3;
                const aaaNormal = ratio >= 7;
                const aaaLarge = ratio >= 4.5;

                const statusColor = ratio >= 7 ? '#10B981' : ratio >= 4.5 ? '#F59E0B' : '#EF4444';

                let html = `<div style="padding:1.5rem;border-radius:12px;background:${bg};color:${fg};border:1px solid var(--border-subtle);">`;
                html += `<p style="font-size:1.25rem;font-weight:700;margin-bottom:0.5rem;">${escapeHtml(sampleText)}</p>`;
                html += `<p style="font-size:0.9rem;opacity:0.8;">Contrast ratio: <strong>${ratio.toFixed(2)}:1</strong></p>`;
                html += `</div>`;
                html += `<div style="margin-top:1rem;display:grid;gap:0.5rem;font-size:0.85rem;">`;
                html += `<div style="display:flex;align-items:center;gap:0.5rem;"><span style="width:12px;height:12px;border-radius:50%;background:${statusColor};"></span> WCAG AA Normal: <strong>${aaNormal ? 'Pass' : 'Fail'}</strong></div>`;
                html += `<div style="display:flex;align-items:center;gap:0.5rem;"><span style="width:12px;height:12px;border-radius:50%;background:${statusColor};"></span> WCAG AA Large: <strong>${aaLarge ? 'Pass' : 'Fail'}</strong></div>`;
                html += `<div style="display:flex;align-items:center;gap:0.5rem;"><span style="width:12px;height:12px;border-radius:50%;background:${statusColor};"></span> WCAG AAA Normal: <strong>${aaaNormal ? 'Pass' : 'Fail'}</strong></div>`;
                html += `<div style="display:flex;align-items:center;gap:0.5rem;"><span style="width:12px;height:12px;border-radius:50%;background:${statusColor};"></span> WCAG AAA Large: <strong>${aaaLarge ? 'Pass' : 'Fail'}</strong></div>`;
                html += `</div>`;

                const blob = new Blob([html], { type: 'text/html' });
                const urlObj = URL.createObjectURL(blob);
                return [{ name: 'contrast-check.html', blob, type: 'text/html', size: blob.size, url: urlObj, previewHtml: html }];
            }
        },

        /* --- Pixel to REM Converter --- */
        'pixel-to-rem-converter': {
            init: function () {
                const container = $('#tool-options');
                if (!container) return;
                container.innerHTML = `
                    <div class="zync-option-group">
                        <label for="rem-base">Root Font Size (px)</label>
                        <input id="rem-base" type="number" value="16" />
                    </div>
                    <div class="zync-option-group">
                        <label for="pixel-input">Pixel Value</label>
                        <input id="pixel-input" type="number" step="0.01" placeholder="16" />
                    </div>
                `;
            },
            process: function (files, ctx) {
                const base = parseFloat($('#rem-base')?.value || '16');
                const px = parseFloat($('#pixel-input')?.value || '0');
                if (isNaN(base) || base <= 0) { ctx.showError('Invalid base font size.'); throw new Error('Invalid base'); }
                const rem = px / base;
                const css = `/* ${px}px = ${rem.toFixed(4)}rem (base: ${base}px) */\n\n:root {\n  font-size: ${base}px;\n}\n\n.element {\n  font-size: ${rem.toFixed(4)}rem; /* ${px}px */\n}`;
                const blob = new Blob([css], { type: 'text/css' });
                const url = URL.createObjectURL(blob);
                return [{ name: 'pixel-to-rem.css', blob, type: 'text/css', size: blob.size, url, previewHtml: `<pre style="background:var(--bg-card);padding:1rem;border-radius:10px;overflow:auto;font-size:0.85rem;line-height:1.6;border:1px solid var(--border-subtle);">${escapeHtml(css)}</pre>` }];
            }
        },

        /* --- CSS Minifier (SEO) --- */
        'css-minifier': {
            init: function () {
                const container = $('#tool-options');
                if (!container) return;
                container.innerHTML = `
                    <div class="zync-option-group">
                        <label for="css-input">CSS Input</label>
                        <textarea id="css-input" rows="10" placeholder="Paste your CSS here..."></textarea>
                    </div>
                `;
            },
            process: function (files, ctx) {
                let css = $('#css-input')?.value || '';
                if (!css.trim()) { ctx.showError('CSS input is required.'); throw new Error('Empty input'); }
                css = css.replace(/\/\*[\s\S]*?\*\//g, '');
                css = css.replace(/\s+/g, ' ').replace(/\s*([{}:;,>+~])\s*/g, '$1').trim();
                const blob = new Blob([css], { type: 'text/css' });
                const url = URL.createObjectURL(blob);
                return [{ name: 'minified.css', blob, type: 'text/css', size: blob.size, url, previewHtml: `<pre style="background:var(--bg-card);padding:1rem;border-radius:10px;overflow:auto;font-size:0.85rem;line-height:1.6;border:1px solid var(--border-subtle);">${escapeHtml(css)}</pre>` }];
            }
        },

        /* --- JS Minifier (SEO) --- */
        'js-minifier': {
            init: function () {
                const container = $('#tool-options');
                if (!container) return;
                container.innerHTML = `
                    <div class="zync-option-group">
                        <label for="js-input">JavaScript Input</label>
                        <textarea id="js-input" rows="10" placeholder="Paste your JS here..."></textarea>
                    </div>
                `;
            },
            process: function (files, ctx) {
                let js = $('#js-input')?.value || '';
                if (!js.trim()) { ctx.showError('JavaScript input is required.'); throw new Error('Empty input'); }
                js = js.replace(/\/\*[\s\S]*?\*\//g, '');
                js = js.replace(/\/\/.*/g, '');
                js = js.replace(/\s+/g, ' ').trim();
                const blob = new Blob([js], { type: 'text/javascript' });
                const url = URL.createObjectURL(blob);
                return [{ name: 'minified.js', blob, type: 'text/javascript', size: blob.size, url, previewHtml: `<pre style="background:var(--bg-card);padding:1rem;border-radius:10px;overflow:auto;font-size:0.85rem;line-height:1.6;border:1px solid var(--border-subtle);">${escapeHtml(js)}</pre>` }];
            }
        }
    };

    /* --- Helpers --- */
    function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
    }

    function getLuminance(rgb) {
        const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    function getContrastRatio(fg, bg) {
        const l1 = getLuminance(fg);
        const l2 = getLuminance(bg);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    /* --- Global Tool Registry --- */
    window.ZyncSeoTools = {
        getModule: function (toolId) {
            return TOOL_MODULES[toolId] || null;
        },
        getAllTools: function () {
            return Object.keys(TOOL_MODULES).map(id => ({ id, ...TOOL_MODULES[id] }));
        }
    };
})();
