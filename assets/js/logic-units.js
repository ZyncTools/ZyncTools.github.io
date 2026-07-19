/**
 * ZyncTools — Unit Conversion Logic
 * =================================
 * Exact, type-safe unit conversions. Fully client-side and offline-capable.
 *
 * Design note (QA/Architecture):
 *   The spec suggested the npm `convert` package. That package ships ESM-only
 *   (no UMD build) and its runtime API varies between majors, which is fragile
 *   for a non-bundled <script> site. To GUARANTEE the tools actually work
 *   ("no more lies"), unit math is implemented here with SI base-factors and
 *   exact temperature formulas — the same model `convert` uses internally.
 *   If `window.convert` is present (loaded elsewhere) it is preferred.
 *
 * Public API:
 *   ZyncUnits.convertUnit(value, from, to)   -> { value, from, to, result, category }
 *   ZyncUnits.getUnits(category)             -> ["m","km",...]
 *   ZyncUnits.getCategories()                -> ["length","mass",...]
 *   ZyncUnits.getModule(toolId)              -> viewer-compatible module (renderUI, reverse swap)
 */
window.ZyncUnits = (function () {
    'use strict';

    // Each unit maps to a factor relative to the category's SI base unit.
    // result = value * factor[from] / factor[to]  (linear categories)
    const LINEAR = {
        length: { base: 'm', units: {
            nm: 1e-9, um: 1e-6, mm: 1e-3, cm: 1e-2, m: 1, km: 1e3,
            in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344, nmi: 1852, ly: 9.4607304725808e15
        }},
        mass: { base: 'kg', units: {
            ug: 1e-9, mg: 1e-6, g: 1e-3, kg: 1, t: 1e3,
            oz: 0.028349523125, lb: 0.45359237, st: 6.35029318, ton: 1016.0469088, uston: 907.18474
        }},
        time: { base: 's', units: {
            ns: 1e-9, us: 1e-6, ms: 1e-3, s: 1, min: 60, h: 3600, day: 86400, week: 604800,
            month: 2629800, year: 31557600
        }},
        data: { base: 'B', units: {
            bit: 0.125, B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, PB: 1e15,
            KiB: 1024, MiB: 1048576, GiB: 1073741824, TiB: 1099511627776
        }},
        speed: { base: 'm/s', units: {
            'm/s': 1, 'km/h': 1000 / 3600, 'mph': 1609.344 / 3600, 'kn': 1852 / 3600, 'ft/s': 0.3048
        }},
        volume: { base: 'L', units: {
            ml: 1e-3, L: 1, m3: 1000, tsp: 0.00492892159375, tbsp: 0.01478676478125,
            floz: 0.0295735295625, cup: 0.2365882365, pt: 0.473176473, qt: 0.946352946,
            gal: 3.785411784, gal_uk: 4.54609
        }},
        area: { base: 'm2', units: {
            mm2: 1e-6, cm2: 1e-4, m2: 1, ha: 1e4, km2: 1e6,
            in2: 0.00064516, ft2: 0.09290304, yd2: 0.83612736, ac: 4046.8564224, mi2: 2589988.110336
        }},
        pressure: { base: 'Pa', units: {
            Pa: 1, hPa: 100, kPa: 1000, bar: 1e5, atm: 101325, psi: 6894.757293168, mmHg: 133.322387415, torr: 133.32236842105263
        }},
        energy: { base: 'J', units: {
            J: 1, kJ: 1000, cal: 4.184, kcal: 4184, Wh: 3600, kWh: 3.6e6, eV: 1.602176634e-19, BTU: 1055.05585262
        }},
        angle: { base: 'rad', units: {
            rad: 1, deg: Math.PI / 180, grad: Math.PI / 200, turn: 2 * Math.PI, arcmin: Math.PI / 10800, arcsec: Math.PI / 648000
        }}
    };

    // Temperature is affine, not linear — convert via Celsius.
    const TEMP = {
        toC: {
            C: v => v,
            F: v => (v - 32) * 5 / 9,
            K: v => v - 273.15,
            R: v => (v - 491.67) * 5 / 9 // Rankine
        },
        fromC: {
            C: v => v,
            F: v => v * 9 / 5 + 32,
            K: v => v + 273.15,
            R: v => (v + 273.15) * 9 / 5
        }
    };

    function findCategory(from, to) {
        if (TEMP.toC[from] && TEMP.toC[to]) return 'temperature';
        for (const cat in LINEAR) {
            if (LINEAR[cat].units[from] != null && LINEAR[cat].units[to] != null) return cat;
        }
        return null;
    }

    /**
     * convertUnit(value, from, to)
     */
    function convertUnit(value, from, to) {
        const v = parseFloat(value);
        if (!isFinite(v)) throw new Error('Invalid input: value must be a number.');
        from = String(from).trim();
        to = String(to).trim();

        // Prefer the real `convert` lib if it happens to be loaded.
        if (typeof window.convert === 'function') {
            try {
                const out = window.convert(v, from).to(to);
                if (isFinite(out)) return { value: v, from, to, result: out, category: findCategory(from, to) || 'unknown' };
            } catch (e) { /* fall through to built-in engine */ }
        }

        const cat = findCategory(from, to);
        if (!cat) throw new Error(`Conversion Failed: "${from}" and "${to}" are not compatible units.`);

        let result;
        if (cat === 'temperature') {
            result = TEMP.fromC[to](TEMP.toC[from](v));
        } else {
            const u = LINEAR[cat].units;
            result = v * u[from] / u[to];
        }
        return { value: v, from, to, result, category: cat };
    }

    function getCategories() {
        return ['length', 'mass', 'temperature', 'time', 'data', 'speed', 'volume', 'area', 'pressure', 'energy', 'angle'];
    }

    function getUnits(category) {
        if (category === 'temperature') return ['C', 'F', 'K', 'R'];
        return LINEAR[category] ? Object.keys(LINEAR[category].units) : [];
    }

    function totalConversionCount() {
        // informational: number of ordered convertible pairs
        let n = getUnits('temperature').length * (getUnits('temperature').length - 1);
        for (const cat in LINEAR) { const k = Object.keys(LINEAR[cat].units).length; n += k * (k - 1); }
        return n;
    }

    /* ============================================================
       Viewer-compatible interactive module (with Reverse Swap)
       Tool IDs like "celsius-to-fahrenheit" / "km-to-miles" pre-fill.
       ============================================================ */
    const ID_ALIASES = {
        celsius: 'C', fahrenheit: 'F', kelvin: 'K',
        km: 'km', miles: 'mi', mile: 'mi', meters: 'm', meter: 'm', feet: 'ft', foot: 'ft',
        gb: 'GB', mb: 'MB', kb: 'KB', tb: 'TB', bytes: 'B',
        seconds: 's', second: 's', minutes: 'min', minute: 'min', hours: 'h', hour: 'h',
        kg: 'kg', pounds: 'lb', pound: 'lb', lbs: 'lb', grams: 'g', gram: 'g', ounces: 'oz', ounce: 'oz'
    };

    function parseIdPair(toolId) {
        const m = /^([a-z0-9]+)-to-([a-z0-9]+)/i.exec(toolId || '');
        if (!m) return null;
        const a = ID_ALIASES[m[1].toLowerCase()] || m[1];
        const b = ID_ALIASES[m[2].toLowerCase()] || m[2];
        if (findCategory(a, b)) return { from: a, to: b, category: findCategory(a, b) };
        return null;
    }

    function getModule(toolId) {
        const pre = parseIdPair(toolId) || { from: 'C', to: 'F', category: 'temperature' };
        return {
            type: 'interactive',
            renderUI: function (mount, ctx) {
                ctx = ctx || {};
                const catOpts = getCategories()
                    .map(c => `<option value="${c}">${c[0].toUpperCase() + c.slice(1)}</option>`).join('');

                mount.innerHTML = `
                  <div class="zu-units" style="max-width:520px">
                    <label>Category
                      <select id="zu-cat" style="width:100%;padding:.6rem;border-radius:8px;border:1px solid var(--border-medium,#334);background:var(--bg-input,#111);color:inherit">${catOpts}</select>
                    </label>
                    <div style="display:flex;gap:.5rem;align-items:flex-end;margin-top:.75rem;flex-wrap:wrap">
                      <label style="flex:1;min-width:110px">Value
                        <input id="zu-val" type="number" value="1" step="any" style="width:100%;padding:.6rem;border-radius:8px;border:1px solid var(--border-medium,#334);background:var(--bg-input,#111);color:inherit">
                      </label>
                      <label style="flex:1;min-width:90px">From
                        <select id="zu-from" style="width:100%;padding:.6rem;border-radius:8px;border:1px solid var(--border-medium,#334);background:var(--bg-input,#111);color:inherit"></select>
                      </label>
                      <button id="zu-swap" title="Reverse Swap" aria-label="Reverse swap"
                        style="padding:.6rem .8rem;border-radius:8px;border:1px solid var(--border-medium,#334);background:transparent;color:inherit;cursor:pointer">⇄</button>
                      <label style="flex:1;min-width:90px">To
                        <select id="zu-to" style="width:100%;padding:.6rem;border-radius:8px;border:1px solid var(--border-medium,#334);background:var(--bg-input,#111);color:inherit"></select>
                      </label>
                    </div>
                    <div id="zu-out" style="margin-top:1rem;font-size:1.4rem;font-weight:700;min-height:1.5em"></div>
                    <div id="zu-err" style="margin-top:.35rem;font-size:.8rem;color:#EF4444"></div>
                  </div>`;

                const $ = s => mount.querySelector(s);

                function fillUnits(category, from, to) {
                    const units = getUnits(category);
                    const o = units.map(u => `<option value="${u}">${u}</option>`).join('');
                    $('#zu-from').innerHTML = o;
                    $('#zu-to').innerHTML = o;
                    $('#zu-from').value = from || units[0];
                    $('#zu-to').value = to || units[1] || units[0];
                }

                function run() {
                    const out = $('#zu-out'), err = $('#zu-err');
                    err.textContent = '';
                    try {
                        const r = convertUnit($('#zu-val').value, $('#zu-from').value, $('#zu-to').value);
                        const disp = Math.abs(r.result) < 1e-4 || Math.abs(r.result) > 1e12
                            ? r.result.toExponential(6) : parseFloat(r.result.toFixed(8)).toLocaleString('en-US', { maximumFractionDigits: 8 });
                        out.textContent = `${r.value} ${r.from} = ${disp} ${r.to}`;
                    } catch (e) {
                        out.textContent = '';
                        err.textContent = e.message;
                        if (ctx.showError) ctx.showError(e.message);
                    }
                }

                $('#zu-cat').value = pre.category;
                fillUnits(pre.category, pre.from, pre.to);
                $('#zu-cat').onchange = () => { fillUnits($('#zu-cat').value); run(); };
                $('#zu-from').onchange = run;
                $('#zu-to').onchange = run;
                $('#zu-val').addEventListener('input', run);
                $('#zu-swap').onclick = () => {
                    const f = $('#zu-from').value; $('#zu-from').value = $('#zu-to').value; $('#zu-to').value = f; run();
                };
                run();
            }
        };
    }

    return { convertUnit, getUnits, getCategories, totalConversionCount, findCategory, getModule };
})();
