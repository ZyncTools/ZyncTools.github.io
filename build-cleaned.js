const fs = require('fs');
const path = require('path');
const { resolveIcon } = require('./assets/js/icon-mapping-logic.js');

const data = JSON.parse(fs.readFileSync('tools-database.json', 'utf-8'));
const tools = data.tools || [];
const state = JSON.parse(fs.readFileSync(process.env.TEMP + '\\kilo\\audit_state.json', 'utf-8'));
const implemented = new Set(state.implemented);

// ---- fake detection (mirror of master_audit.py) ----
const numericId = /^[a-z]+-\d+$/;
const toolNnn = /-tool-\d+$/;
const numberedName = /\s\d+$/;
const genericName = /^(tool|test tool|new tool|untitled|sample|placeholder|demo tool|example|[a-z]+ tool)\s*\d*$/i;
const nameSafe = /(v\d|mp\d|h\d|ipv\d|base\d|sha\d|md\d|utf\d|x\d)/;

function isFake(t) {
    const id = t.id, name = (t.name || '').trim();
    if (!name) return 'empty name';
    if (numericId.test(id)) return 'numeric placeholder id';
    if (toolNnn.test(id)) return 'generic *-tool-N id';
    if (numberedName.test(name) && !nameSafe.test(name.toLowerCase())) return 'numbered duplicate name';
    if (genericName.test(name)) return 'generic name';
    return null;
}

// ---- category name lookup ----
const catNames = {};
(data.categories || []).forEach(c => { catNames[c.id] = c.name; });

// ---- title-case helper for polished names ----
function cleanName(n) { return n.replace(/\s+/g, ' ').trim(); }

// ---- description generator (client-side, deterministic) ----
function makeDescription(t) {
    if (t.description && t.description.trim()) return t.description.trim();
    const name = t.name;
    const cat = catNames[t.category] || t.category;
    const verbMap = [
        [/compress|minify/i, `Reduce file size with ${name} — fast, private, and 100% in your browser.`],
        [/convert|to /i, `${name}: convert your files instantly in the browser. No uploads, no signup.`],
        [/merge|join|combine/i, `Combine multiple files into one with ${name}. Runs entirely client-side.`],
        [/split|cut|trim/i, `Split and extract exactly what you need using ${name}. Private and instant.`],
        [/generat/i, `Generate ready-to-use output with ${name}. Free, fast, and fully client-side.`],
        [/remove|clean|strip/i, `${name} cleans your files locally in the browser — nothing is uploaded.`],
        [/resize|crop|rotate|flip/i, `${name}: adjust your images in seconds, right in your browser.`],
        [/encode|decode|hash|encrypt/i, `${name} processes data securely on your device. Nothing leaves your browser.`]
    ];
    for (const [re, txt] of verbMap) if (re.test(name)) return txt;
    return `${name} — a free, privacy-first ${cat} utility that runs 100% in your browser. No uploads, no tracking.`;
}

// ---- tag enrichment ----
function enrichTags(t) {
    const set = new Set((t.tags || []).map(x => String(x).toLowerCase().trim()).filter(Boolean));
    // add name words
    (t.name || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2).forEach(w => set.add(w));
    // add formats
    (t.formats || []).forEach(f => set.add(String(f).toLowerCase()));
    // add category
    if (t.category) set.add(t.category.replace('-utils', ''));
    // drop noise words
    ['the', 'and', 'for', 'with', 'your', 'free', 'online', 'tool'].forEach(w => set.delete(w));
    return Array.from(set).slice(0, 12);
}

function makeSeoTitle(t) {
    return `${t.name} — Free Online ${catNames[t.category] || 'Tool'} | ZyncTools`;
}
function makeSeoDescription(t, desc) {
    const base = desc.length > 150 ? desc.slice(0, 147) + '...' : desc;
    return base;
}

// ---- process ----
const kept = [];
const deleted = [];
const seen = new Set();
let iconsFixed = 0, statusComingSoon = 0, statusActive = 0, deduped = 0, descAdded = 0, seoAdded = 0;

for (const t of tools) {
    const reason = isFake(t);
    if (reason) { deleted.push({ id: t.id, name: t.name, reason }); continue; }

    // de-duplicate by id (keep first, prefer the implemented one)
    if (seen.has(t.id)) {
        // if this dup is implemented and previous wasn't, we could swap — but simplest: skip dup
        deduped++;
        deleted.push({ id: t.id, name: t.name, reason: 'duplicate id (removed)' });
        continue;
    }
    seen.add(t.id);

    const out = {};
    out.id = t.id;
    out.name = cleanName(t.name);
    out.category = t.category;
    out.type = ['file', 'text', 'generator'].includes(t.type) ? t.type : 'file';

    // ICON — always a valid lucide name
    const oldIcon = t.icon || '';
    out.icon = resolveIcon(t);
    if (oldIcon !== out.icon) iconsFixed++;

    // STATUS
    if (implemented.has(t.id)) { out.status = 'active'; statusActive++; }
    else { out.status = 'coming-soon'; out.badge = 'Coming Soon'; statusComingSoon++; }

    // DESCRIPTION
    const hadDesc = !!(t.description && t.description.trim());
    out.description = makeDescription(t);
    if (!hadDesc) descAdded++;

    // TAGS
    out.tags = enrichTags(t);

    // SEO
    const hadSeo = !!(t.seoTitle && !/Free Online Tool \| ZyncTools$/.test(t.seoTitle) && !/Free Online \| ZyncTools$/.test(t.seoTitle));
    out.seoTitle = makeSeoTitle(out);
    out.seoDescription = makeSeoDescription(out, out.description);
    if (!hadSeo) seoAdded++;

    // preserve functional fields
    if (t.accept) out.accept = t.accept;
    if (t.outputType) out.outputType = t.outputType;
    if (t.formats) out.formats = t.formats;
    if (typeof t.popular === 'boolean') out.popular = t.popular;
    if (Array.isArray(t.libraries) && t.libraries.length) out.libraries = t.libraries;
    if (Array.isArray(t.cdns) && t.cdns.length) out.cdns = t.cdns;
    if (t.library) out.library = t.library;

    kept.push(out);
}

// validation pass — guarantee invariants
let invalid = 0;
for (const t of kept) {
    if (!t.name || !t.category || !t.type || !t.icon) invalid++;
    if (/^fa[bsrl]?[\s-]/.test(t.icon)) invalid++;
}

const cleaned = {
    version: '3.0.0-cleaned',
    generated: new Date().toISOString(),
    audit: {
        source: 'tools-database.json',
        originalCount: tools.length,
        deleted: deleted.length,
        kept: kept.length,
        active: statusActive,
        comingSoon: statusComingSoon
    },
    categories: data.categories || [],
    tools: kept
};

fs.writeFileSync('tools-database-cleaned.json', JSON.stringify(cleaned, null, 2));

// stats for report
const report = {
    originalCount: tools.length,
    deletedCount: deleted.length,
    keptCount: kept.length,
    statusActive, statusComingSoon,
    iconsFixed, deduped, descAdded, seoAdded,
    invalidRemaining: invalid,
    deleteReasonCounts: deleted.reduce((a, d) => { a[d.reason] = (a[d.reason] || 0) + 1; return a; }, {}),
    sampleDeleted: deleted.slice(0, 10),
    sampleKeptActive: kept.filter(t => t.status === 'active').slice(0, 8).map(t => ({ id: t.id, name: t.name, icon: t.icon })),
    sampleKeptComingSoon: kept.filter(t => t.status === 'coming-soon').slice(0, 8).map(t => ({ id: t.id, name: t.name, icon: t.icon }))
};
fs.writeFileSync(process.env.TEMP + '\\kilo\\clean_report.json', JSON.stringify(report, null, 2));

console.log('CLEANED DB WRITTEN');
console.log(JSON.stringify(report, null, 2));
