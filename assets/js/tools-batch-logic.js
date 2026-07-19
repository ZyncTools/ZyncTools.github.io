/**
 * ZyncTools — tools-batch-logic.js
 * ================================
 * Aggregates the batch-implemented logic modules and exposes a single
 * resolver. Registers with ZyncToolBridge so the existing main.js
 * loadToolModule() chain (bridge -> seo -> tools/<id>.js) picks these up
 * automatically — no changes needed to main.js.
 *
 * Modules aggregated:
 *   ZyncBatchText     - text / data / generators
 *   ZyncBatchUnit     - unit + math calculators
 *   ZyncBatchSeo      - meta/schema/hreflang/canonical/robots
 *   ZyncBatchImage    - lightweight image ops (canvas/compressorjs)
 *   ZyncBatchImageFx  - image effects (vignette, sharpen, etc.)
 *   ZyncBatchSeoText  - SEO text checkers (plagiarism, readability, etc.)
 *   ZyncBatchSecurity - exif / hash / encrypt / password strength
 *   ZyncBatchPdf      - pdf-lib watermark / page numbers / merge / split / rotate
 *   ZyncBatchMedia    - ffmpeg.wasm audio + video
 *   ZyncBatchGen      - QR, barcode, generators
 *   ZyncBatchExtra    - extra text, security, dev-utils
 *
 * Public API:
 *   window.ZyncBatch.getModule(toolId)  -> module | null
 *   window.ZyncBatch.implementedIds     -> Set of all tool ids now backed by logic
 *   window.ZyncBatch.activateInBridge() -> patches ZyncToolBridge.getModule to fall through to ZyncBatch
 */
(function () {
    'use strict';

    const MODULES = ['ZyncBatchText', 'ZyncBatchUnit', 'ZyncBatchSeo', 'ZyncBatchImage', 'ZyncBatchImageFx', 'ZyncBatchSeoText', 'ZyncBatchSecurity', 'ZyncBatchPdf', 'ZyncBatchMedia', 'ZyncBatchGen', 'ZyncBatchExtra'];

    function getModule(toolId) {
        for (const name of MODULES) {
            const m = window[name];
            if (m && typeof m.getModule === 'function') {
                const mod = m.getModule(toolId);
                if (mod) return mod;
            }
        }
        return null;
    }

    function collectIds() {
        const ids = new Set();
        for (const name of MODULES) {
            const m = window[name];
            if (m && m.getModule) {
                // ids are the keys of the FNS/H maps
                ['FNS', 'H'].forEach(k => { if (m[k]) Object.keys(m[k]).forEach(id => ids.add(id)); });
            }
        }
        return ids;
    }

    function activateInBridge() {
        if (!window.ZyncToolBridge || typeof window.ZyncToolBridge.getModule !== 'function') return false;
        const original = window.ZyncToolBridge.getModule.bind(window.ZyncToolBridge);
        window.ZyncToolBridge.getModule = function (toolId) {
            const fromBatch = getModule(toolId);
            if (fromBatch) return fromBatch;
            return original(toolId);
        };
        return true;
    }

    window.ZyncBatch = { getModule, collectIds, implementedIds: collectIds(), activateInBridge, MODULES };
})();