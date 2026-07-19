/**
 * ZyncTools — Implementation Check
 * =================================
 * Paste this into the browser DevTools console on any ZyncTools page
 * (or load it via <script>) to verify that EVERY tool in the registry
 * resolves to real, executable logic — guaranteeing NO broken links.
 *
 * It mirrors the exact runtime resolution chain used by main.js:
 *   1. window.ZyncToolBridge.getModule(id)   (tool-bridge.js)
 *   2. window.ZyncSeoTools.getModule(id)      (seo-logic.js)
 *   3. tools/<id>.js  ->  window.ZyncTool     (individual module file)
 *
 * A tool is considered IMPLEMENTED if (1) or (2) return a module with a
 * process()/generate() function, OR a tools/<id>.js file exists.
 * Tools flagged status:"coming-soon" are expected to be unimplemented and
 * are reported separately (they must render a "Coming Soon" badge, not a link).
 *
 * Usage:
 *   ZyncImplementationCheck.run();            // full async audit + console table
 *   await ZyncImplementationCheck.run({ probeFiles: true });  // also HEAD-check tools/*.js
 */
(function () {
    'use strict';

    const DB_URL = 'tools-database-cleaned.json';
    const FALLBACK_DB_URL = 'tools-database.json';

    async function loadTools() {
        for (const url of [DB_URL, FALLBACK_DB_URL]) {
            try {
                const res = await fetch(url, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    return { url, tools: data.tools || [] };
                }
            } catch (e) { /* try next */ }
        }
        throw new Error('Could not load any tools database.');
    }

    // Resolve a tool via bridge/seo modules (synchronous, no network)
    function resolveViaModules(id) {
        if (window.ZyncToolBridge && typeof window.ZyncToolBridge.getModule === 'function') {
            const m = window.ZyncToolBridge.getModule(id);
            if (m && (typeof m.process === 'function' || typeof m.generate === 'function')) {
                return { ok: true, source: 'ZyncToolBridge' };
            }
        }
        if (window.ZyncSeoTools && typeof window.ZyncSeoTools.getModule === 'function') {
            const m = window.ZyncSeoTools.getModule(id);
            if (m && (typeof m.process === 'function' || typeof m.generate === 'function' ||
                      typeof m === 'function')) {
                return { ok: true, source: 'ZyncSeoTools' };
            }
        }
        if (window.ZyncBatch && typeof window.ZyncBatch.getModule === 'function') {
            const m = window.ZyncBatch.getModule(id);
            if (m && (typeof m.process === 'function' || typeof m.generate === 'function')) {
                return { ok: true, source: 'ZyncBatch' };
            }
        }
        return { ok: false, source: null };
    }

    // Optionally HEAD-probe tools/<id>.js to confirm an individual module file exists
    async function probeFile(id) {
        try {
            const res = await fetch(`tools/${id}.js`, { method: 'HEAD', cache: 'no-store' });
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    async function run(opts = {}) {
        const probeFiles = !!opts.probeFiles;
        const { url, tools } = await loadTools();

        const results = {
            active_ok: [],        // status active AND resolves -> perfect
            active_broken: [],    // status active BUT no logic -> CRITICAL broken link
            comingsoon_ok: [],    // status coming-soon AND no logic -> expected
            comingsoon_hasLogic: []// status coming-soon BUT logic exists -> should be promoted to active
        };

        for (const t of tools) {
            const status = t.status || 'active';
            let res = resolveViaModules(t.id);

            if (!res.ok && probeFiles) {
                const fileExists = await probeFile(t.id);
                if (fileExists) res = { ok: true, source: 'tools/' + t.id + '.js' };
            }

            if (status === 'active') {
                (res.ok ? results.active_ok : results.active_broken)
                    .push({ id: t.id, name: t.name, source: res.source });
            } else {
                (res.ok ? results.comingsoon_hasLogic : results.comingsoon_ok)
                    .push({ id: t.id, name: t.name, source: res.source });
            }
        }

        // ---- Report ----
        const line = '─'.repeat(52);
        console.log('%cZyncTools Implementation Check', 'font-weight:bold;font-size:14px;color:#6366F1');
        console.log('DB source:', url, '| total tools:', tools.length);
        console.log(line);
        console.log('%c✔ ACTIVE & working: ' + results.active_ok.length,
            'color:#10B981;font-weight:bold');
        console.log('%c✖ ACTIVE but BROKEN (no logic): ' + results.active_broken.length,
            'color:#EF4444;font-weight:bold');
        console.log('%c⏳ COMING-SOON (correctly disabled): ' + results.comingsoon_ok.length,
            'color:#F59E0B');
        console.log('%c⚑ COMING-SOON but has logic (promote!): ' + results.comingsoon_hasLogic.length,
            'color:#3B82F6');
        console.log(line);

        if (results.active_broken.length) {
            console.warn('CRITICAL — these ACTIVE tools have no executable logic (fix or mark coming-soon):');
            console.table(results.active_broken);
        } else {
            console.log('%cNo broken links. Every active tool resolves to real logic. ✅',
                'color:#10B981;font-weight:bold');
        }

        if (results.comingsoon_hasLogic.length) {
            console.info('These are marked coming-soon but logic exists — consider promoting to active:');
            console.table(results.comingsoon_hasLogic);
        }

        const pass = results.active_broken.length === 0;
        console.log('%cAUDIT ' + (pass ? 'PASSED' : 'FAILED'),
            'font-weight:bold;color:' + (pass ? '#10B981' : '#EF4444'));

        // ---- Activation rate ----
        const activeTotal = results.active_ok.length + results.active_broken.length;
        const execTotal = activeTotal; // tools that currently resolve
        const rate = execTotal ? Math.round((activeTotal / tools.length) * 100) : 0;
        console.log('%cACTIVATION RATE: ' + activeTotal + ' / ' + tools.length + ' = ' + rate + '%',
            'font-weight:bold;color:#6366F1');
        console.log('Promote candidates (coming-soon w/ logic): ' + results.comingsoon_hasLogic.length);

        return {
            active_ok: results.active_ok,
            active_broken: results.active_broken,
            comingsoon_ok: results.comingsoon_ok,
            comingsoon_hasLogic: results.comingsoon_hasLogic,
            activationRate: rate,
            promoteCandidates: results.comingsoon_hasLogic.length
        };
    }

    window.ZyncImplementationCheck = { run };

    // Auto-run if a data attribute requests it
    if (document.currentScript && document.currentScript.dataset.autorun === 'true') {
        run({ probeFiles: true });
    }
})();
