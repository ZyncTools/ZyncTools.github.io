/**
 * ZyncTools — SEO Generators Module
 * 50+ micro-SEO tools for meta tags, schema, and content optimization.
 */

window.ZyncSEOLogic = (function () {
    'use strict';

    /* ============================================
       META TAG GENERATORS
       ============================================ */

    function generateMetaTags({ title, description, keywords, author, robots }) {
        return `<title>${escapeHtml(title || '')}</title>
<meta name="description" content="${escapeHtml(description || '')}">
<meta name="keywords" content="${escapeHtml(keywords || '')}">
<meta name="author" content="${escapeHtml(author || '')}">
<meta name="robots" content="${escapeHtml(robots || 'index, follow')}">
<link rel="canonical" href="">`;
    }

    function generateOgTags({ title, description, image, url, type = 'website', siteName }) {
        return `<meta property="og:title" content="${escapeHtml(title || '')}">
<meta property="og:description" content="${escapeHtml(description || '')}">
<meta property="og:image" content="${escapeHtml(image || '')}">
<meta property="og:url" content="${escapeHtml(url || '')}">
<meta property="og:type" content="${escapeHtml(type)}">
<meta property="og:site_name" content="${escapeHtml(siteName || '')}">`;
    }

    function generateTwitterCard({ title, description, image, card = 'summary_large_image' }) {
        return `<meta name="twitter:card" content="${escapeHtml(card)}">
<meta name="twitter:title" content="${escapeHtml(title || '')}">
<meta name="twitter:description" content="${escapeHtml(description || '')}">
<meta name="twitter:image" content="${escapeHtml(image || '')}">`;
    }

    /* ============================================
       SCHEMA MARKUP GENERATORS
       ============================================ */

    function generateArticleSchema({ headline, description, author, datePublished, dateModified, image, url }) {
        return `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${escapeHtml(headline || '')}",
  "description": "${escapeHtml(description || '')}",
  "author": { "@type": "Person", "name": "${escapeHtml(author || '')}" },
  "datePublished": "${escapeHtml(datePublished || '')}",
  "dateModified": "${escapeHtml(dateModified || '')}",
  "image": "${escapeHtml(image || '')}",
  "url": "${escapeHtml(url || '')}"
}
</script>`;
    }

    function generateProductSchema({ name, description, price, currency, availability, brand, image, url }) {
        return `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "${escapeHtml(name || '')}",
  "description": "${escapeHtml(description || '')}",
  "brand": { "@type": "Brand", "name": "${escapeHtml(brand || '')}" },
  "offers": {
    "@type": "Offer",
    "price": "${escapeHtml(price || '')}",
    "priceCurrency": "${escapeHtml(currency || 'USD')}",
    "availability": "https://schema.org/${escapeHtml(availability || 'InStock')}"
  },
  "image": "${escapeHtml(image || '')}",
  "url": "${escapeHtml(url || '')}"
}
</script>`;
    }

    function generateFaqSchema({ faqs }) {
        const items = (faqs || []).map(faq => `{
          "@type": "Question",
          "name": "${escapeHtml(faq.question || '')}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${escapeHtml(faq.answer || '')}"
          }
        }`).join(',\n');

        return `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [${items}]
}
</script>`;
    }

    function generateBreadcrumbSchema({ items }) {
        const listItems = (items || []).map((item, i) => `{
          "@type": "ListItem",
          "position": ${i + 1},
          "name": "${escapeHtml(item.name || '')}",
          "item": "${escapeHtml(item.url || '')}"
        }`).join(',\n');

        return `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [${listItems}]
}
</script>`;
    }

    function generateLocalBusinessSchema({ name, address, phone, hours, image, url }) {
        return `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "${escapeHtml(name || '')}",
  "address": "${escapeHtml(address || '')}",
  "telephone": "${escapeHtml(phone || '')}",
  "openingHours": "${escapeHtml(hours || '')}",
  "image": "${escapeHtml(image || '')}",
  "url": "${escapeHtml(url || '')}"
}
</script>`;
    }

    /* ============================================
       TECHNICAL SEO TOOLS
       ============================================ */

    function generateRobotsTxt({ userAgent, allow, disallow, sitemap }) {
        return `User-agent: ${escapeHtml(userAgent || '*')}
Allow: ${escapeHtml(allow || '/')}
Disallow: ${escapeHtml(disallow || '')}

${sitemap ? `Sitemap: ${escapeHtml(sitemap)}` : ''}`;
    }

    function generateSitemapXml({ urls, changefreq = 'weekly', priority = '0.5' }) {
        const urlEntries = (urls || []).map(url => `  <url>
    <loc>${escapeHtml(url)}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${escapeHtml(changefreq)}</changefreq>
    <priority>${escapeHtml(priority)}</priority>
  </url>`).join('\n');

        return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
    }

    function generateHreflangTags({ urls, defaultLang = 'en' }) {
        return (urls || []).map(u => `<link rel="alternate" href="${escapeHtml(u.url)}" hreflang="${escapeHtml(u.lang || defaultLang)}" />`).join('\n');
    }

    function generateCanonicalTag({ url }) {
        return `<link rel="canonical" href="${escapeHtml(url || '')}" />`;
    }

    /* ============================================
       CONTENT SEO TOOLS
       ============================================ */

    function extractHeadings(html) {
        const headings = [];
        const regex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
        let match;
        while ((match = regex.exec(html)) !== null) {
            headings.push({
                level: parseInt(match[1]),
                text: match[2].replace(/<[^>]+>/g, '').trim()
            });
        }
        return headings;
    }

    function countWords(text) {
        const words = text.trim().split(/\s+/).filter(Boolean);
        const chars = text.length;
        const charsNoSpaces = text.replace(/\s/g, '').length;
        const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
        const readingTime = Math.max(1, Math.ceil(words.length / 200));
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length;
        
        return {
            words: words.length,
            characters: chars,
            charactersNoSpaces: charsNoSpaces,
            sentences,
            paragraphs,
            readingTime: `${readingTime} min`
        };
    }

    function calculateKeywordDensity(text, keyword) {
        const words = text.toLowerCase().split(/\s+/).filter(Boolean);
        const totalWords = words.length;
        const keywordLower = keyword.toLowerCase();
        const matches = words.filter(w => w === keywordLower).length;
        const density = totalWords > 0 ? ((matches / totalWords) * 100).toFixed(2) : 0;
        
        return {
            keyword: keywordLower,
            occurrences: matches,
            totalWords,
            density: `${density}%`
        };
    }

    function checkPlagiarism(text1, text2) {
        const words1 = text1.toLowerCase().split(/\s+/).filter(Boolean);
        const words2 = text2.toLowerCase().split(/\s+/).filter(Boolean);
        const set2 = new Set(words2);
        const matches = words1.filter(w => set2.has(w));
        const similarity = words1.length > 0 ? ((matches.length / words1.length) * 100).toFixed(2) : 0;
        
        return {
            similarity: `${similarity}%`,
            matches: matches.length,
            totalWords: words1.length,
            verdict: similarity > 80 ? 'High similarity - likely plagiarized' : 
                     similarity > 50 ? 'Moderate similarity - review needed' : 
                     'Low similarity - appears original'
        };
    }

    function generateFaqFromText(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim() && s.trim().length > 10);
        const faqs = sentences.slice(0, 5).map(s => ({
            question: s.trim() + '?',
            answer: s.trim()
        }));
        
        return faqs;
    }

    /* ============================================
       LOCAL SEO TOOLS
       ============================================ */

    function generateGoogleMapsLink({ address, query }) {
        const baseUrl = 'https://www.google.com/maps/search/';
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (address) params.set('address', address);
        return baseUrl + params.toString();
    }

    function generateGmbPost({ businessName, content, offerType = 'offer' }) {
        return `📢 ${escapeHtml(businessName || '')}

${escapeHtml(content || '')}

${offerType === 'offer' ? '🎁 Special Offer!' : '📅 Event!'}

#ZyncTools #LocalSEO #Business`;
    }

    function formatNap({ name, address, phone, email }) {
        return `Name: ${escapeHtml(name || '')}
Address: ${escapeHtml(address || '')}
Phone: ${escapeHtml(phone || '')}
Email: ${escapeHtml(email || '')}

---
NAP Citation Format:
${escapeHtml(name || '')} | ${escapeHtml(address || '')} | ${escapeHtml(phone || '')} | ${escapeHtml(email || '')}`;
    }

    /* ============================================
       UTILITIES
       ============================================ */

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function copyToClipboard(text) {
        if (navigator.clipboard) {
            return navigator.clipboard.writeText(text);
        }
        return Promise.reject(new Error('Clipboard not available'));
    }

    /* ============================================
       PUBLIC API
       ============================================ */

    return {
        generateMetaTags,
        generateOgTags,
        generateTwitterCard,
        generateArticleSchema,
        generateProductSchema,
        generateFaqSchema,
        generateBreadcrumbSchema,
        generateLocalBusinessSchema,
        generateRobotsTxt,
        generateSitemapXml,
        generateHreflangTags,
        generateCanonicalTag,
        extractHeadings,
        countWords,
        calculateKeywordDensity,
        checkPlagiarism,
        generateFaqFromText,
        generateGoogleMapsLink,
        generateGmbPost,
        formatNap,
        escapeHtml,
        downloadFile,
        copyToClipboard
    };
})();
