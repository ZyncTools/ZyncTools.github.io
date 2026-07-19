/**
 * ZyncTools — Batch Logic: UNIT & MATH tools
 * ===========================================
 * Length/Mass/Temperature/Data conversions via a self-contained exact engine
 * (SI base factors) with math.js used for the calculator math where loaded.
 *
 * Covers: unit-converter (length/mass/temp/data/speed), percentage-calculator,
 *         age-calculator, date-difference-calculator, timestamp-converter,
 *         binary/hex/ascii calculators, pixel-to-rem.
 */
(function () {
    'use strict';

    const LINEAR = {
        length: { base: 'm', units: { nm: 1e-9, um: 1e-6, mm: 1e-3, cm: 1e-2, m: 1, km: 1e3, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344, nmi: 1852 } },
        mass: { base: 'kg', units: { ug: 1e-9, mg: 1e-6, g: 1e-3, kg: 1, t: 1e3, oz: 0.028349523125, lb: 0.45359237, st: 6.35029318 } },
        data: { base: 'B', units: { bit: 0.125, B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1048576, GiB: 1073741824 } },
        speed: { base: 'm/s', units: { 'm/s': 1, 'km/h': 1000 / 3600, 'mph': 1609.344 / 3600, 'kn': 1852 / 3600, 'ft/s': 0.3048 } }
    };
    const TEMP = {
        toC: { C: v => v, F: v => (v - 32) * 5 / 9, K: v => v - 273.15, R: v => (v - 491.67) * 5 / 9 },
        fromC: { C: v => v, F: v => v * 9 / 5 + 32, K: v => v + 273.15, R: v => (v + 273.15) * 9 / 5 }
    };
    function findCat(from, to) { for (const c in LINEAR) if (LINEAR[c].units[from] != null && LINEAR[c].units[to] != null) return c; return null; }
    function convert(from, to, value) {
        const v = parseFloat(value); if (!isFinite(v)) throw new Error('Invalid Input: value must be a number.');
        if (TEMP.toC[from] && TEMP.toC[to]) return TEMP.fromC[to](TEMP.toC[from](v));
        const cat = findCat(from, to); if (!cat) throw new Error('Conversion Failed: incompatible units.');
        const u = LINEAR[cat].units; return v * u[from] / u[to];
    }

    function mathjs(expr) {
        if (window.math && typeof window.math.evaluate === 'function') {
            try { return window.math.evaluate(expr); } catch (e) { throw new Error('Math Error: ' + e.message); }
        }
        // safe-ish fallback: basic arithmetic only
        if (!/^[\d\s+\-*/().%]+$/.test(expr)) throw new Error('Invalid expression.');
        try { return Function('"use strict";return (' + expr + ')')(); } catch (e) { throw new Error('Math Error: cannot evaluate.'); }
    }
    function percentage(opts) { const v = +opts.value, t = +opts.total; if (!isFinite(v) || !isFinite(t) || t === 0) throw new Error('Invalid Input: enter value and total.'); return (v / t * 100); }
    function ageCalc(dob, ref) { const d = new Date(dob), now = ref ? new Date(ref) : new Date(); if (isNaN(d)) throw new Error('Invalid date of birth.'); let a = now.getFullYear() - d.getFullYear(); const m = now.getMonth() - d.getMonth(); if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--; return a; }
    function dateDiff(a, b) { const d1 = new Date(a), d2 = new Date(b); if (isNaN(d1) || isNaN(d2)) throw new Error('Invalid dates.'); const ms = Math.abs(d2 - d1); return { days: Math.floor(ms / 864e5), hours: Math.floor(ms / 36e5) % 24, minutes: Math.floor(ms / 6e4) % 60 }; }
    function tsConvert(opts) {
        if (opts.mode === 'to-date') { const d = new Date(+opts.timestamp * 1000); if (isNaN(d)) throw new Error('Invalid timestamp.'); return d.toISOString(); }
        if (opts.mode === 'to-ts') { const d = new Date(opts.date); if (isNaN(d)) throw new Error('Invalid date.'); return Math.floor(d.getTime() / 1000); }
        throw new Error('Invalid Input.');
    }
    function pixelToRem(px, base) { const b = parseFloat(base) || 16; return parseFloat(px) / b; }
    function binaryHex(text, op) {
        const t = text || '';
        if (op === 'to-binary') return t.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
        if (op === 'to-hex') return t.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
        if (op === 'binary-to-text') return t.trim().split(/\s+/).filter(Boolean).map(b => String.fromCharCode(parseInt(b, 2))).join('');
        if (op === 'hex-to-text') return t.trim().split(/\s+/).filter(Boolean).map(h => String.fromCharCode(parseInt(h, 16))).join('');
        return t;
    }

    const FNS = {
        'unit-converter-dev': (t, o) => String(convert(o.from, o.to, o.value)),
        'unit-converter': (t, o) => String(convert(o.from, o.to, o.value)),
        'percentage-calculator-dev': (t, o) => percentage(o) + ' %',
        'percentage-calculator': (t, o) => percentage(o) + ' %',
        'age-calculator-dev': (t, o) => 'Age: ' + ageCalc(o.dob, o.ref),
        'date-difference-calculator': (t, o) => JSON.stringify(dateDiff(o.from, o.to)),
        'timestamp-converter': (t, o) => tsConvert(o),
        'date-difference': (t, o) => JSON.stringify(dateDiff(o.from, o.to)),
        'pixel-to-rem-converter': (t, o) => pixelToRem(o.px, o.base) + ' rem',
        'binary-calculator-dev': (t, o) => binaryHex(t, o.op),
        'hex-calculator-dev': (t, o) => binaryHex(t, o.op),
        'math-calculator': (t, o) => String(mathjs(o.expr))
    };

    function blob(s) { return new Blob([s], { type: 'text/plain' }); }

    window.ZyncBatchUnit = { FNS, convert, percentage, ageCalc, dateDiff, tsConvert,
        getModule(toolId) {
            const fn = FNS[toolId];
            if (!fn) return null;
            return {
                type: 'interactive',
                outputType: 'blob',
                process: async (input, options) => {
                    const out = fn(Array.isArray(input) ? input.join('\n') : input, options || {});
                    const b = typeof out === 'string' ? blob(out) : out;
                    return [{ name: toolId + '-result.txt', blob: b, type: b.type, size: b.size, url: URL.createObjectURL(b) }];
                }
            };
        }
    };
})();
