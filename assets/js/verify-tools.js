/**
 * verify-tools.js — "Zero Fake Tools" audit (run in browser console)
 * ==================================================================
 * Usage:  paste this into the console on the ZyncTools site (or import it),
 *         then call  ZyncVerify.run()  — or just let it auto-run.
 *
 * What it does:
 *   1. Requires all logic modules to be loaded (logic-currency, logic-units,
 *      logic-media, logic-pdf, logic-image) plus the registry.
 *   2. Iterates EVERY tool in the registry.
 *   3. For active tools, confirms a real function exists via the
 *      tool.logicModule.logicFn reference (no "Tool Not Implemented").
 *   4. Also calls each module's getModule(toolId) to ensure a runnable
 *      module is returned (process/renderUI). If getModule returns nothing
 *      but the tool claims a logicFn, that's flagged.
 *   5. Reports ✅ / ❌ and a final score.
 *
 * It never touches the network for the core check, so it runs instantly.
 */
window.ZyncVerify = (function () {
    'use strict';

    const MODULE_FILES = [
        'assets/js/logic-currency.js',
        'assets/js/logic-units.js',
        'assets/js/logic-media.js',
        'assets/js/logic-pdf.js',
        'assets/js/logic-image.js',
        'assets/js/logic-core.js'
    ];

    function resolveModule(name) {
        return window[name] || null;
    }

    function loadScripts() {
        return Promise.all(MODULE_FILES.map(src => new Promise((res) => {
            if (document.querySelector(`script[src="${src}"]`)) return res();
            const s = document.createElement('script');
            s.src = src; s.onload = () => res(); s.onerror = () => res();
            document.head.appendChild(s);
        })));
    }

    function getRegistry() {
        if (window.ZyncRegistry && window.ZyncRegistry.getAllTools) return window.ZyncRegistry.getAllTools();
        // Fallback: fetch the real DB
        return fetch('tools-database-real.json').then(r => r.ok ? r.json() : { tools: [] }).then(d => d.tools || []);
    }

    async function run(opts) {
        opts = opts || {};
        if (opts.load !== false) await loadScripts();

        const tools = await getRegistry();
        const report = [];
        let implemented = 0, missing = 0, comingSoon = 0;

        for (const t of tools) {
            const id = t.id;
            const name = t.name || id;

            if (t.status === 'coming-soon') {
                // Coming-soon must still have a real name + icon, never "Tool N"
                const okName = name && !/^tool\s*\d+$/i.test(name) && !/^(test|new tool|tool)$/i.test(name);
                const okIcon = t.icon && !/^fa-/i.test(t.icon);
                if (okName && okIcon) {
                    comingSoon++;
                    report.push({ id, name, status: 'coming-soon', ok: true });
                } else {
                    missing++;
                    report.push({ id, name, status: 'coming-soon', ok: false, reason: !okName ? 'generic/fake name' : 'missing/legacy icon' });
                }
                continue;
            }

            // Active tool — must have a verifiable logic function.
            const modName = t.logicModule;
            const fnName = t.logicFn;
            let fn = null, mod = null;
            if (modName && fnName) {
                mod = resolveModule(modName);
                if (mod && typeof mod[fnName] === 'function') fn = mod[fnName];
            }

            let moduleRunnable = false;
            try {
                if (mod && typeof mod.getModule === 'function') moduleRunnable = !!mod.getModule(id);
            } catch (e) { moduleRunnable = false; }

            const ok = !!fn;
            if (ok) implemented++; else missing++;
            report.push({
                id, name, status: 'active', ok,
                fn: ok ? `${modName}.${fnName}` : null,
                moduleRunnable,
                reason: ok ? null : (mod ? `function ${modName}.${fnName} not found` : `module ${modName} not loaded`)
            });
        }

        const totalActive = implemented + report.filter(r => r.status === 'active' && !r.ok).length;
        const score = totalActive ? Math.round((implemented / totalActive) * 100) : 100;

        // Console output
        console.groupCollapsed(`%cZyncTools Zero-Fake Audit — score ${score}%`, 'font-weight:bold;font-size:13px;');
        report.forEach(r => {
            const tag = r.ok ? '%c✅' : '%c❌';
            const detail = r.ok
                ? `${r.name}  →  ${r.fn}${r.moduleRunnable ? '  (module runnable)' : '  (⚠ no getModule)'}`
                : `${r.name}  →  ${r.reason}`;
            console.log(tag + ' %c' + detail, r.ok ? 'color:#22c55e' : 'color:#ef4444', 'color:inherit');
        });
        console.log(`%cImplemented: ${implemented} | Missing: ${missing} | Coming-soon (validated): ${comingSoon} | Total: ${tools.length}`,
            'font-weight:bold');
        if (missing === 0) console.log('%c🎉 ZERO FAKE TOOLS — 100% implemented.', 'color:#22c55e;font-weight:bold');
        else console.warn(`⚠ ${missing} tool(s) missing real logic.`);
        console.groupEnd();

        return { score, implemented, missing, comingSoon, total: tools.length, report };
    }

    return { run, MODULE_FILES };
})();

// Auto-run when included directly in the browser.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'complete') setTimeout(() => window.ZyncVerify.run(), 300);
    else window.addEventListener('load', () => setTimeout(() => window.ZyncVerify.run(), 300));
}
