/**
 * ZyncTools — Icon Mapping Logic (Lucide)
 * =========================================
 * Auto-assigns a valid Lucide icon to any tool based on keyword analysis of its
 * name / tags / category. Acts as a SAFETY NET so ZERO tools ever render without
 * a relevant icon.
 *
 * Usage (build-time, Node):   const { resolveIcon } = require('./icon-mapping-logic.js')
 * Usage (browser, runtime):   window.ZyncIconMap.resolveIcon(tool)
 *
 * All returned names are verified Lucide icon slugs (https://lucide.dev/icons).
 */
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof window !== 'undefined') window.ZyncIconMap = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /* --------------------------------------------------------------------
     * 1. KEYWORD → LUCIDE ICON  (ordered: most specific first)
     * ------------------------------------------------------------------ */
    const KEYWORD_RULES = [
        // --- Action verbs (highest priority per spec) ---
        [/\b(compress|minify|shrink|reduce|optimi[sz]e)\b/, 'minimize-2'],
        [/\b(convert|converter|change|transform|to-)\b/, 'arrow-right-left'],
        [/\b(merge|join|joiner|combine|concat)\b/, 'combine'],
        [/\b(split|splitter|cut|cutter|trim|trimmer|slice|divide)\b/, 'scissors'],
        [/\b(rotate|flip|mirror)\b/, 'rotate-cw'],
        [/\b(resize|scale|crop|cropper|aspect)\b/, 'crop'],
        [/\b(remove|delete|eraser|clean|strip)\b/, 'eraser'],
        [/\b(extract|export|download)\b/, 'download'],
        [/\b(upscale|enhance|enlarge)\b/, 'sparkles'],
        [/\b(watermark|stamp|sign|signature)\b/, 'stamp'],
        [/\b(encrypt|decrypt|lock|protect|secure|password|shield)\b/, 'shield-check'],
        [/\b(unlock|unprotect)\b/, 'lock-open'],
        [/\b(hash|md5|sha|checksum|fingerprint|bcrypt)\b/, 'fingerprint'],
        [/\b(encode|decode|base64|encoder|decoder)\b/, 'binary'],

        // --- Domains / nouns ---
        [/\b(pdf|document|doc|docx|word)\b/, 'file-text'],
        [/\b(image|photo|picture|jpg|jpeg|png|webp|gif|svg|ico|heic|graphic|pixel)\b/, 'image'],
        [/\b(video|mp4|mov|avi|mkv|webm|flv|film|movie|clip)\b/, 'video'],
        [/\b(audio|mp3|wav|ogg|aac|flac|m4a|sound|music|voice|ringtone|volume)\b/, 'music'],
        [/\b(code|json|xml|yaml|toml|html|css|js|javascript|sql|dev|developer|regex)\b/, 'code-2'],
        [/\b(seo|meta|sitemap|robots|canonical|hreflang|schema|keyword|search|serp)\b/, 'search'],
        [/\b(calculator|calculate|math|percentage|percent|number|unit|binary|hex)\b/, 'calculator'],
        [/\b(qr|qr-code)\b/, 'qr-code'],
        [/\b(barcode)\b/, 'barcode'],
        [/\b(color|colour|palette|gradient|swatch|rgb|hsl|hex-color)\b/, 'palette'],
        [/\b(chart|graph|histogram|visuali[sz]e|analytics)\b/, 'bar-chart-3'],
        [/\b(csv|table|spreadsheet|excel)\b/, 'table'],
        [/\b(clock|time|timestamp|timer|stopwatch|cron|date|age|timezone)\b/, 'clock'],
        [/\b(network|dns|ip|ipv4|ipv6|ping|http|url|domain|whois)\b/, 'globe'],
        [/\b(text|font|word|character|case|lorem|slug|markdown|typography)\b/, 'type'],
        [/\b(ai|smart|magic|neural|deep|generate|generator|dream)\b/, 'wand-sparkles'],
        [/\b(qr|share|social|twitter|open-graph|og-)\b/, 'share-2'],
        [/\b(shadow|border|radius|flexbox|grid|clip-path|glassmorphism|layout)\b/, 'layout'],
        [/\b(uuid|guid|jwt|token|key)\b/, 'key'],
        [/\b(diff|compare|comparison)\b/, 'git-compare'],
        [/\b(record|recorder|screen|camera|capture)\b/, 'monitor'],
        [/\b(ocr|scan|scanner|read)\b/, 'scan-text'],
        [/\b(edit|editor|annotate|highlight|form)\b/, 'pen-tool']
    ];

    /* --------------------------------------------------------------------
     * 2. CATEGORY → LUCIDE ICON  (fallback when no keyword matches)
     * ------------------------------------------------------------------ */
    const CATEGORY_ICONS = {
        images: 'image',
        pdf: 'file-text',
        video: 'video',
        audio: 'music',
        text: 'type',
        code: 'code-2',
        math: 'calculator',
        security: 'shield-check',
        ai: 'wand-sparkles',
        media: 'film',
        seo: 'search',
        'dev-utils': 'terminal',
        dev: 'terminal',
        generator: 'wand-sparkles'
    };

    /* --------------------------------------------------------------------
     * 3. FontAwesome → Lucide  (migrate legacy fa-* icon fields)
     * ------------------------------------------------------------------ */
    const FA_TO_LUCIDE = {
        'fa-image': 'image', 'fa-images': 'images', 'fa-file-pdf': 'file-text',
        'fa-file-video': 'video', 'fa-video': 'video', 'fa-film': 'film',
        'fa-music': 'music', 'fa-volume-up': 'volume-2', 'fa-volume-high': 'volume-2',
        'fa-volume-down': 'volume-1', 'fa-volume-mute': 'volume-x', 'fa-volume-xmark': 'volume-x',
        'fa-font': 'type', 'fa-code': 'code-2', 'fa-css3-alt': 'code-2', 'fa-html5': 'code-2',
        'fa-js-square': 'code-2', 'fa-js': 'code-2', 'fa-database': 'database',
        'fa-calculator': 'calculator', 'fa-shield-halved': 'shield-check', 'fa-shield': 'shield-check',
        'fa-lock': 'lock', 'fa-unlock': 'lock-open', 'fa-key': 'key', 'fa-fingerprint': 'fingerprint',
        'fa-wand-magic-sparkles': 'wand-sparkles', 'fa-magic': 'wand-sparkles',
        'fa-search': 'search', 'fa-magnifying-glass': 'search', 'fa-compress-arrows-alt': 'minimize-2',
        'fa-compress': 'minimize-2', 'fa-expand-arrows-alt': 'expand', 'fa-crop-alt': 'crop',
        'fa-crop': 'crop', 'fa-cut': 'scissors', 'fa-scissors': 'scissors', 'fa-exchange-alt': 'arrow-right-left',
        'fa-arrows-alt-h': 'arrow-left-right', 'fa-copy': 'copy', 'fa-eraser': 'eraser',
        'fa-eye-dropper': 'pipette', 'fa-adjust': 'contrast', 'fa-palette': 'palette',
        'fa-qrcode': 'qr-code', 'fa-barcode': 'barcode', 'fa-clock': 'clock', 'fa-history': 'history',
        'fa-calendar': 'calendar', 'fa-terminal': 'terminal', 'fa-tool': 'wrench', 'fab fa-markdown': 'file-text',
        'fa-markdown': 'file-text', 'fa-chart-bar': 'bar-chart-3', 'fa-circle-info': 'info',
        'fa-asterisk': 'asterisk', 'fa-bezier-curve': 'spline', 'fa-brackets-curly': 'braces',
        'fa-i-cursor': 'text-cursor-input', 'fa-face-laugh-squint': 'smile', 'fa-globe': 'globe',
        'fa-network-wired': 'network'
    };

    const DEFAULT_ICON = 'wrench';

    function norm(s) { return (s || '').toString().toLowerCase(); }

    function iconFromFontAwesome(icon) {
        if (!icon) return null;
        const key = icon.trim();
        if (FA_TO_LUCIDE[key]) return FA_TO_LUCIDE[key];
        // strip a leading "fab "/"fas " prefix and retry
        const bare = key.replace(/^fa[bsrl]?\s+/, '');
        if (FA_TO_LUCIDE[bare]) return FA_TO_LUCIDE[bare];
        return null;
    }

    function iconFromKeywords(haystack) {
        for (let i = 0; i < KEYWORD_RULES.length; i++) {
            if (KEYWORD_RULES[i][0].test(haystack)) return KEYWORD_RULES[i][1];
        }
        return null;
    }

    /**
     * resolveIcon(tool)
     * Returns a guaranteed-valid Lucide icon name.
     * Strategy: keyword match on name+id+tags → category fallback → FA migration → default.
     */
    function resolveIcon(tool) {
        if (!tool) return DEFAULT_ICON;

        const name = norm(tool.name);
        const id = norm(tool.id);
        const tags = Array.isArray(tool.tags) ? tool.tags.map(norm).join(' ') : '';
        const haystack = `${name} ${id} ${tags}`;

        // 1. Keyword-driven (most relevant / descriptive)
        const byKeyword = iconFromKeywords(haystack);
        if (byKeyword) return byKeyword;

        // 2. Migrate an existing FontAwesome icon field
        const byFa = iconFromFontAwesome(tool.icon);
        if (byFa) return byFa;

        // 3. Category fallback
        if (tool.category && CATEGORY_ICONS[tool.category]) return CATEGORY_ICONS[tool.category];

        // 4. Absolute last resort
        return DEFAULT_ICON;
    }

    /** Returns true if the value looks like a legacy / invalid (non-Lucide) icon. */
    function isLegacyIcon(icon) {
        return !icon || /^fa[bsrl]?[\s-]/.test(icon.toString());
    }

    return {
        resolveIcon,
        isLegacyIcon,
        KEYWORD_RULES,
        CATEGORY_ICONS,
        FA_TO_LUCIDE,
        DEFAULT_ICON
    };
});
