/**
 * activate-batch.js — promote newly-implemented coming-soon tools to active.
 *
 * Loads each batch module (text/unit/seo/image/security/pdf/media) in a VM,
 * collects their implemented tool IDs, then rewrites tools-database-cleaned.json
 * setting status:'active' (and removing the coming-soon badge) for any tool
 * whose id is now backed by real logic. Tools that remain unimplemented
 * (mostly heavy AI/ML: background-remover, image-upscaler-M, heic-converter,
 * image-ocr, audio-stem-splitter, etc.) stay coming-soon.
 *
 * Run: node activate-batch.js
 */
const fs = require('fs'), vm = require('vm');
const path = require('path');

const moduleFiles = [
    'assets/js/tools/text-logic.js',
    'assets/js/tools/unit-logic.js',
    'assets/js/tools/seo-logic.js',
    'assets/js/tools/image-light-logic.js',
    'assets/js/tools/image-effects-logic.js',
    'assets/js/tools/security-logic.js',
    'assets/js/tools/pdf-light-logic.js',
    'assets/js/tools/media-batch-logic.js',
    'assets/js/tools/generators-logic.js',
    'assets/js/tools/extra-text-security-logic.js'
];

// Minimal browser-ish context so the modules load without errors.
const ctx = {
    window: {},
    document: { createElement: () => ({ style: {}, appendChild() {}, getContext: () => ({ drawImage() {}, fillRect() {}, fillStyle: '', putImageData() {}, createImageData: () => ({ data: [] }) }), width: 0, height: 0, toBlob: () => {} }), head: { appendChild() {} }, querySelector: () => null, addEventListener() {} },
    Blob: function () { this.size = 0; this.type = ''; },
    URL: { createObjectURL: () => 'blob:x' },
    Math, JSON, Object, Array, String, Number, parseInt, parseFloat, isFinite, Date,
    TextEncoder, Uint8Array, Uint32Array, DataView, FileReader: function () {},
    crypto: { subtle: { digest: () => Promise.resolve(new Uint8Array(32)) }, randomUUID: () => 'uuid', getRandomValues: () => {} },
    btoa: s => Buffer.from(s, 'utf8').toString('base64'),
    atob: s => Buffer.from(s, 'base64').toString('utf8'),
    fetch: () => Promise.reject('x'),
    setTimeout
};
ctx.window.addEventListener = () => {};
vm.createContext(ctx);
for (const f of moduleFiles) {
    const code = fs.readFileSync(path.join(__dirname, f), 'utf8');
    vm.runInContext(code, ctx);
}
// Also load tools-batch-logic.js to derive the authoritative id set
vm.runInContext(fs.readFileSync(path.join(__dirname, 'assets/js/tools-batch-logic.js'), 'utf8'), ctx);

const implemented = ctx.window.ZyncBatch.implementedIds;
console.log('Batch-implemented IDs:', implemented.size);

// Load cleaned DB and promote
const dbPath = path.join(__dirname, 'tools-database-cleaned.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
let promoted = 0;
const categories = {};
for (const t of db.tools) {
    if (t.status === 'coming-soon' && implemented.has(t.id)) {
        t.status = 'active';
        delete t.badge;
        t.logicModule = 'ZyncBatch';
        t.logicFn = 'getModule';
        if (t.category === 'images') t.estimatedSize = true;
        if (t.category === 'pdf') t.showPageCount = true;
        promoted++;
    }
    categories[t.status] = (categories[t.status] || 0) + 1;
}
db.audit = Object.assign({}, db.audit, {
    batchImplemented: implemented.size,
    promotedInThisPass: promoted,
    activationRate: Math.round((categories.active / db.tools.length) * 100)
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('Promoted to active:', promoted);
console.log('New totals:', JSON.stringify(categories));
console.log('Activation rate: ' + db.audit.activationRate + '%');