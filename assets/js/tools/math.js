/**
 * ZyncTools — Math & unit tools
 */
(function () {
    'use strict';

    var ZT = window.ZT;
    var define = ZT.registry.define;

    /* ============================================================
       Unit converter
       ============================================================
       Every unit is expressed as a multiple of a base unit per family,
       so conversion is a single multiply-and-divide. Temperature is the
       exception and gets explicit formulas.
    */
    var UNITS = {
        length: {
            label: 'Length', base: 'metre',
            units: {
                nm: { name: 'Nanometre', factor: 1e-9 }, um: { name: 'Micrometre', factor: 1e-6 },
                mm: { name: 'Millimetre', factor: 0.001 }, cm: { name: 'Centimetre', factor: 0.01 },
                m: { name: 'Metre', factor: 1 }, km: { name: 'Kilometre', factor: 1000 },
                in: { name: 'Inch', factor: 0.0254 }, ft: { name: 'Foot', factor: 0.3048 },
                yd: { name: 'Yard', factor: 0.9144 }, mi: { name: 'Mile', factor: 1609.344 },
                nmi: { name: 'Nautical mile', factor: 1852 },
                ly: { name: 'Light year', factor: 9.4607e15 }
            }
        },
        mass: {
            label: 'Weight & mass', base: 'kilogram',
            units: {
                mg: { name: 'Milligram', factor: 1e-6 }, g: { name: 'Gram', factor: 0.001 },
                kg: { name: 'Kilogram', factor: 1 }, t: { name: 'Tonne', factor: 1000 },
                oz: { name: 'Ounce', factor: 0.028349523125 }, lb: { name: 'Pound', factor: 0.45359237 },
                st: { name: 'Stone', factor: 6.35029318 },
                'ton-us': { name: 'US ton', factor: 907.18474 }, 'ton-uk': { name: 'UK ton', factor: 1016.0469088 }
            }
        },
        temperature: {
            label: 'Temperature', base: 'celsius',
            units: {
                c: { name: 'Celsius' }, f: { name: 'Fahrenheit' },
                k: { name: 'Kelvin' }, r: { name: 'Rankine' }
            }
        },
        area: {
            label: 'Area', base: 'square metre',
            units: {
                'mm2': { name: 'Square millimetre', factor: 1e-6 }, 'cm2': { name: 'Square centimetre', factor: 1e-4 },
                'm2': { name: 'Square metre', factor: 1 }, 'km2': { name: 'Square kilometre', factor: 1e6 },
                'in2': { name: 'Square inch', factor: 0.00064516 }, 'ft2': { name: 'Square foot', factor: 0.09290304 },
                'yd2': { name: 'Square yard', factor: 0.83612736 }, acre: { name: 'Acre', factor: 4046.8564224 },
                ha: { name: 'Hectare', factor: 10000 }, 'mi2': { name: 'Square mile', factor: 2589988.110336 }
            }
        },
        volume: {
            label: 'Volume', base: 'litre',
            units: {
                ml: { name: 'Millilitre', factor: 0.001 }, l: { name: 'Litre', factor: 1 },
                'm3': { name: 'Cubic metre', factor: 1000 }, 'cm3': { name: 'Cubic centimetre', factor: 0.001 },
                tsp: { name: 'Teaspoon (US)', factor: 0.00492892159375 }, tbsp: { name: 'Tablespoon (US)', factor: 0.01478676478125 },
                'floz-us': { name: 'Fluid ounce (US)', factor: 0.0295735295625 }, cup: { name: 'Cup (US)', factor: 0.2365882365 },
                'pt-us': { name: 'Pint (US)', factor: 0.473176473 }, 'qt-us': { name: 'Quart (US)', factor: 0.946352946 },
                'gal-us': { name: 'Gallon (US)', factor: 3.785411784 }, 'gal-uk': { name: 'Gallon (UK)', factor: 4.54609 },
                'pt-uk': { name: 'Pint (UK)', factor: 0.56826125 }
            }
        },
        speed: {
            label: 'Speed', base: 'metre per second',
            units: {
                'm/s': { name: 'Metres per second', factor: 1 }, 'km/h': { name: 'Kilometres per hour', factor: 0.277777778 },
                mph: { name: 'Miles per hour', factor: 0.44704 }, kn: { name: 'Knots', factor: 0.514444444 },
                'ft/s': { name: 'Feet per second', factor: 0.3048 }, mach: { name: 'Mach (at sea level)', factor: 343 }
            }
        },
        data: {
            label: 'Digital storage', base: 'byte',
            units: {
                bit: { name: 'Bit', factor: 0.125 }, B: { name: 'Byte', factor: 1 },
                KB: { name: 'Kilobyte (1000)', factor: 1000 }, KiB: { name: 'Kibibyte (1024)', factor: 1024 },
                MB: { name: 'Megabyte (1000²)', factor: 1e6 }, MiB: { name: 'Mebibyte (1024²)', factor: 1048576 },
                GB: { name: 'Gigabyte (1000³)', factor: 1e9 }, GiB: { name: 'Gibibyte (1024³)', factor: 1073741824 },
                TB: { name: 'Terabyte', factor: 1e12 }, TiB: { name: 'Tebibyte', factor: 1099511627776 },
                PB: { name: 'Petabyte', factor: 1e15 }
            }
        },
        time: {
            label: 'Time', base: 'second',
            units: {
                ms: { name: 'Millisecond', factor: 0.001 }, s: { name: 'Second', factor: 1 },
                min: { name: 'Minute', factor: 60 }, h: { name: 'Hour', factor: 3600 },
                d: { name: 'Day', factor: 86400 }, wk: { name: 'Week', factor: 604800 },
                mo: { name: 'Month (30 days)', factor: 2592000 }, yr: { name: 'Year (365 days)', factor: 31536000 }
            }
        },
        pressure: {
            label: 'Pressure', base: 'pascal',
            units: {
                Pa: { name: 'Pascal', factor: 1 }, kPa: { name: 'Kilopascal', factor: 1000 },
                bar: { name: 'Bar', factor: 100000 }, psi: { name: 'PSI', factor: 6894.757293168 },
                atm: { name: 'Atmosphere', factor: 101325 }, mmHg: { name: 'mmHg / Torr', factor: 133.322387415 }
            }
        },
        energy: {
            label: 'Energy', base: 'joule',
            units: {
                J: { name: 'Joule', factor: 1 }, kJ: { name: 'Kilojoule', factor: 1000 },
                cal: { name: 'Calorie', factor: 4.184 }, kcal: { name: 'Kilocalorie', factor: 4184 },
                Wh: { name: 'Watt hour', factor: 3600 }, kWh: { name: 'Kilowatt hour', factor: 3600000 },
                BTU: { name: 'BTU', factor: 1055.05585262 }
            }
        },
        angle: {
            label: 'Angle', base: 'degree',
            units: {
                deg: { name: 'Degree', factor: 1 }, rad: { name: 'Radian', factor: 57.2957795131 },
                grad: { name: 'Gradian', factor: 0.9 }, turn: { name: 'Turn', factor: 360 },
                arcmin: { name: 'Arcminute', factor: 1 / 60 }, arcsec: { name: 'Arcsecond', factor: 1 / 3600 }
            }
        }
    };

    function unitOptions(family) {
        var units = UNITS[family].units;
        return Object.keys(units).map(function (key) {
            return { value: key, label: units[key].name };
        });
    }

    function convertTemperature(value, from, to) {
        var celsius;
        switch (from) {
            case 'f': celsius = (value - 32) * 5 / 9; break;
            case 'k': celsius = value - 273.15; break;
            case 'r': celsius = (value - 491.67) * 5 / 9; break;
            default: celsius = value;
        }
        switch (to) {
            case 'f': return celsius * 9 / 5 + 32;
            case 'k': return celsius + 273.15;
            case 'r': return (celsius + 273.15) * 9 / 5;
            default: return celsius;
        }
    }

    define({
        id: 'unit-converter',
        name: 'Unit Converter',
        category: 'math',
        icon: 'ruler',
        description: 'Convert length, weight, temperature, volume, data, speed and more.',
        tags: ['unit', 'convert', 'metric', 'imperial', 'length', 'weight', 'temperature'],
        input: 'none',
        popular: true,
        options: [
            {
                id: 'family', type: 'select', label: 'Category', value: 'length',
                options: Object.keys(UNITS).map(function (key) {
                    return { value: key, label: UNITS[key].label };
                })
            },
            { id: 'value', type: 'number', label: 'Value', value: 1, step: 'any' },
            { id: 'from', type: 'select', label: 'From', value: 'm', options: unitOptions('length'), dependsOn: 'family' },
            { id: 'to', type: 'select', label: 'To', value: 'ft', options: unitOptions('length'), dependsOn: 'family' },
            { id: 'precision', type: 'number', label: 'Decimal places', value: 6, min: 0, max: 12 },
            { id: 'show-all', type: 'checkbox', label: 'Show every unit in this category', value: true }
        ],
        // The from/to lists depend on the chosen family, so the tool page
        // asks the tool to refresh those options whenever `family` changes.
        refreshOptions: function (opt, schema) {
            var family = UNITS[opt.family] ? opt.family : 'length';
            var list = unitOptions(family);
            var keys = list.map(function (u) { return u.value; });
            schema.forEach(function (option) {
                if (option.id === 'from' || option.id === 'to') {
                    option.options = list;
                }
            });
            if (keys.indexOf(opt.from) === -1) opt.from = keys[0];
            if (keys.indexOf(opt.to) === -1) opt.to = keys[Math.min(1, keys.length - 1)];
            return opt;
        },
        run: function (ctx) {
            var o = ctx.opt;
            var family = UNITS[o.family] ? o.family : 'length';
            var units = UNITS[family].units;

            var fromKey = units[o.from] ? o.from : Object.keys(units)[0];
            var toKey = units[o.to] ? o.to : Object.keys(units)[1] || fromKey;
            var value = Number(o.value);
            if (!isFinite(value)) ZT.fail('Enter a number to convert.');

            function convert(from, to) {
                if (family === 'temperature') return convertTemperature(value, from, to);
                return value * units[from].factor / units[to].factor;
            }

            function format(n) {
                if (!isFinite(n)) return '—';
                if (n !== 0 && (Math.abs(n) < 1e-6 || Math.abs(n) >= 1e15)) return n.toExponential(Math.min(o.precision, 10));
                var fixed = n.toFixed(o.precision);
                // Trim trailing zeros but keep at least one digit after the point.
                return fixed.indexOf('.') !== -1 ? fixed.replace(/\.?0+$/, '') || '0' : fixed;
            }

            var primary = convert(fromKey, toKey);
            var results = [
                ZT.dataResult([
                    { label: value + ' ' + units[fromKey].name, value: format(primary) + ' ' + units[toKey].name }
                ], { title: 'Result', columns: 1 })
            ];

            if (o.showAll) {
                var rows = Object.keys(units).map(function (key) {
                    return { label: units[key].name, value: format(convert(fromKey, key)) };
                });
                results.push(ZT.dataResult(rows, { title: value + ' ' + units[fromKey].name + ' in every unit', columns: 2, mono: true }));
            }

            return results;
        }
    });

    /* ============================================================
       Percentage calculator
       ============================================================ */
    define({
        id: 'percentage-calculator',
        name: 'Percentage Calculator',
        category: 'math',
        icon: 'percent',
        description: 'Work out percentages, increases, discounts and percentage change.',
        tags: ['percentage', 'percent', 'discount', 'increase', 'change', 'calculator'],
        input: 'none',
        popular: true,
        options: [
            {
                id: 'mode', type: 'select', label: 'What do you want to work out', value: 'of',
                options: [
                    { value: 'of', label: 'What is X% of Y?' },
                    { value: 'is-what-percent', label: 'X is what percent of Y?' },
                    { value: 'change', label: 'Percentage change from X to Y' },
                    { value: 'increase', label: 'Increase X by Y%' },
                    { value: 'decrease', label: 'Decrease X by Y%' },
                    { value: 'discount', label: 'Discounted price' },
                    { value: 'tip', label: 'Tip and bill split' },
                    { value: 'reverse', label: 'Original value before a X% change' }
                ]
            },
            { id: 'a', type: 'number', label: 'First value', value: 25, step: 'any' },
            { id: 'b', type: 'number', label: 'Second value', value: 200, step: 'any' },
            { id: 'people', type: 'number', label: 'Split between', suffix: 'people', value: 2, min: 1, max: 100, when: function (o) { return o.mode === 'tip'; } },
            { id: 'precision', type: 'number', label: 'Decimal places', value: 2, min: 0, max: 8 }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var a = Number(o.a), b = Number(o.b);
            if (!isFinite(a) || !isFinite(b)) ZT.fail('Both values must be numbers.');

            function fmt(n) {
                if (!isFinite(n)) return '—';
                return Number(n.toFixed(o.precision)).toLocaleString('en-US', { maximumFractionDigits: o.precision });
            }

            var rows = [];
            switch (o.mode) {
                case 'of':
                    rows.push({ label: a + '% of ' + b, value: fmt(a / 100 * b) });
                    rows.push({ label: 'Remaining ' + fmt(100 - a) + '%', value: fmt((100 - a) / 100 * b) });
                    break;
                case 'is-what-percent':
                    if (b === 0) ZT.fail('The second value cannot be zero.');
                    rows.push({ label: a + ' is what percent of ' + b, value: fmt(a / b * 100) + '%' });
                    rows.push({ label: 'As a fraction', value: fmt(a / b) });
                    break;
                case 'change': {
                    if (a === 0) ZT.fail('The starting value cannot be zero for a percentage change.');
                    var change = (b - a) / Math.abs(a) * 100;
                    rows.push({ label: 'Change from ' + a + ' to ' + b, value: (change >= 0 ? '+' : '') + fmt(change) + '%' });
                    rows.push({ label: 'Direction', value: change > 0 ? 'Increase' : change < 0 ? 'Decrease' : 'No change' });
                    rows.push({ label: 'Absolute difference', value: fmt(Math.abs(b - a)) });
                    rows.push({ label: 'Multiplier', value: '×' + fmt(b / a) });
                    break;
                }
                case 'increase':
                    rows.push({ label: a + ' increased by ' + b + '%', value: fmt(a * (1 + b / 100)) });
                    rows.push({ label: 'Amount added', value: fmt(a * b / 100) });
                    break;
                case 'decrease':
                    rows.push({ label: a + ' decreased by ' + b + '%', value: fmt(a * (1 - b / 100)) });
                    rows.push({ label: 'Amount removed', value: fmt(a * b / 100) });
                    break;
                case 'discount':
                    rows.push({ label: 'Original price', value: fmt(a) });
                    rows.push({ label: 'Discount of ' + b + '%', value: '−' + fmt(a * b / 100) });
                    rows.push({ label: 'You pay', value: fmt(a * (1 - b / 100)) });
                    rows.push({ label: 'You save', value: fmt(a * b / 100) });
                    break;
                case 'tip': {
                    var tip = a * b / 100;
                    rows.push({ label: 'Bill', value: fmt(a) });
                    rows.push({ label: 'Tip at ' + b + '%', value: fmt(tip) });
                    rows.push({ label: 'Total', value: fmt(a + tip) });
                    rows.push({ label: 'Each person pays', value: fmt((a + tip) / o.people) });
                    break;
                }
                case 'reverse': {
                    if (b === -100) ZT.fail('A change of −100% leaves no original value to recover.');
                    var original = a / (1 + b / 100);
                    rows.push({ label: 'Value after a ' + b + '% change', value: fmt(a) });
                    rows.push({ label: 'Original value', value: fmt(original) });
                    rows.push({ label: 'The change was', value: fmt(a - original) });
                    break;
                }
            }

            return ZT.dataResult(rows, { title: 'Result', columns: 2 });
        }
    });

    /* ============================================================
       Aspect ratio
       ============================================================ */
    define({
        id: 'aspect-ratio-calculator',
        name: 'Aspect Ratio Calculator',
        category: 'math',
        icon: 'proportions',
        description: 'Scale dimensions while keeping the aspect ratio, or identify a ratio.',
        tags: ['aspect ratio', 'resize', 'dimensions', '16:9', 'proportion', 'scale'],
        input: 'none',
        options: [
            {
                id: 'mode', type: 'select', label: 'Mode', value: 'scale',
                options: [
                    { value: 'scale', label: 'Scale to a new width or height' },
                    { value: 'identify', label: 'Identify the ratio of a size' },
                    { value: 'fit', label: 'Fit inside a box' }
                ]
            },
            { id: 'width', type: 'number', label: 'Original width', suffix: 'px', value: 1920, min: 1 },
            { id: 'height', type: 'number', label: 'Original height', suffix: 'px', value: 1080, min: 1 },
            {
                id: 'lock', type: 'radio', label: 'Set the new', value: 'width',
                options: [{ value: 'width', label: 'Width' }, { value: 'height', label: 'Height' }],
                when: modeIsScale
            },
            { id: 'new-width', type: 'number', label: 'New width', suffix: 'px', value: 1280, min: 1, when: function (o) { return o.mode === 'scale' && o.lock === 'width'; } },
            { id: 'new-height', type: 'number', label: 'New height', suffix: 'px', value: 720, min: 1, when: function (o) { return o.mode === 'scale' && o.lock === 'height'; } },
            { id: 'box-width', type: 'number', label: 'Box width', suffix: 'px', value: 800, min: 1, when: function (o) { return o.mode === 'fit'; } },
            { id: 'box-height', type: 'number', label: 'Box height', suffix: 'px', value: 600, min: 1, when: function (o) { return o.mode === 'fit'; } },
            { id: 'round', type: 'checkbox', label: 'Round results to whole pixels', value: true }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var w = Number(o.width), h = Number(o.height);
            if (!(w > 0) || !(h > 0)) ZT.fail('Width and height must both be greater than zero.');

            function gcd(a, b) { return b < 0.0000001 ? a : gcd(b, a % b); }
            var divisor = gcd(w, h) || 1;
            var rw = w / divisor, rh = h / divisor;
            var ratioLabel = (rw > 50 || rh > 50) ? (w / h).toFixed(3) + ' : 1' : Math.round(rw) + ':' + Math.round(rh);

            var COMMON = {
                '1:1': 1, '4:3': 4 / 3, '3:2': 1.5, '16:10': 1.6, '16:9': 16 / 9,
                '21:9': 21 / 9, '2:1': 2, '9:16': 9 / 16, '3:4': 0.75, '2:3': 2 / 3, '5:4': 1.25
            };
            var actual = w / h;
            var closest = Object.keys(COMMON).reduce(function (best, key) {
                var diff = Math.abs(COMMON[key] - actual);
                return diff < best.diff ? { key: key, diff: diff } : best;
            }, { key: '', diff: Infinity });

            function round(n) { return o.round ? Math.round(n) : Number(n.toFixed(2)); }

            var rows = [
                { label: 'Original size', value: w + ' × ' + h },
                { label: 'Aspect ratio', value: ratioLabel },
                { label: 'Decimal ratio', value: actual.toFixed(4) },
                { label: 'Closest standard ratio', value: closest.key + (closest.diff < 0.001 ? '  (exact)' : '  (approximately)') },
                { label: 'Orientation', value: w > h ? 'Landscape' : w < h ? 'Portrait' : 'Square' },
                { label: 'Megapixels', value: (w * h / 1e6).toFixed(2) + ' MP' }
            ];

            if (o.mode === 'scale') {
                if (o.lock === 'width') {
                    rows.unshift({ label: 'Scaled size', value: round(o.newWidth) + ' × ' + round(o.newWidth / actual) });
                } else {
                    rows.unshift({ label: 'Scaled size', value: round(o.newHeight * actual) + ' × ' + round(o.newHeight) });
                }
            } else if (o.mode === 'fit') {
                var fit = ZT.fitInside(w, h, o.boxWidth, o.boxHeight);
                var coverScale = Math.max(o.boxWidth / w, o.boxHeight / h);
                rows.unshift({ label: 'Cover the box (crops)', value: round(w * coverScale) + ' × ' + round(h * coverScale) });
                rows.unshift({ label: 'Fit inside the box', value: fit.width + ' × ' + fit.height });
            }

            return ZT.dataResult(rows, { title: 'Result', columns: 2 });
        }
    });

    function modeIsScale(o) { return o.mode === 'scale'; }

    /* ============================================================
       Statistics
       ============================================================ */
    define({
        id: 'statistics-calculator',
        name: 'Statistics Calculator',
        category: 'math',
        icon: 'chart-bar',
        description: 'Mean, median, mode, standard deviation and quartiles for a set of numbers.',
        tags: ['statistics', 'mean', 'median', 'average', 'standard deviation', 'stats'],
        input: 'text',
        live: true,
        inputLabel: 'Numbers',
        placeholder: '12, 7, 3, 19, 7, 21, 15',
        options: [
            {
                id: 'population', type: 'radio', label: 'Treat the data as', value: 'sample',
                options: [
                    { value: 'sample', label: 'A sample (divide by n−1)' },
                    { value: 'population', label: 'The whole population (divide by n)' }
                ]
            },
            { id: 'precision', type: 'number', label: 'Decimal places', value: 4, min: 0, max: 10 },
            { id: 'show-sorted', type: 'checkbox', label: 'Show the sorted values', value: false }
        ],
        run: function (ctx) {
            var numbers = String(ctx.text || '')
                .split(/[\s,;]+/)
                .filter(Boolean)
                .map(Number)
                .filter(function (n) { return isFinite(n); });

            if (numbers.length < 2) {
                return ZT.dataResult([{ label: 'Status', value: 'Enter at least two numbers, separated by commas, spaces or new lines.' }], { title: 'Statistics' });
            }

            var sorted = numbers.slice().sort(function (a, b) { return a - b; });
            var n = numbers.length;
            var sum = numbers.reduce(function (a, b) { return a + b; }, 0);
            var mean = sum / n;

            function percentile(p) {
                var index = (n - 1) * p;
                var lower = Math.floor(index);
                var upper = Math.ceil(index);
                // Linear interpolation between the two neighbouring values.
                return lower === upper ? sorted[lower] : sorted[lower] + (index - lower) * (sorted[upper] - sorted[lower]);
            }

            var variance = numbers.reduce(function (acc, x) { return acc + Math.pow(x - mean, 2); }, 0) /
                (ctx.opt.population === 'population' ? n : n - 1);
            var stdDev = Math.sqrt(variance);

            var counts = {};
            numbers.forEach(function (x) { counts[x] = (counts[x] || 0) + 1; });
            var maxCount = Math.max.apply(null, Object.keys(counts).map(function (k) { return counts[k]; }));
            var modes = maxCount > 1
                ? Object.keys(counts).filter(function (k) { return counts[k] === maxCount; }).map(Number)
                : [];

            function fmt(x) {
                return Number(x.toFixed(ctx.opt.precision)).toLocaleString('en-US', { maximumFractionDigits: ctx.opt.precision });
            }

            var q1 = percentile(0.25), q3 = percentile(0.75);

            var rows = [
                { label: 'Count', value: String(n) },
                { label: 'Sum', value: fmt(sum) },
                { label: 'Mean', value: fmt(mean) },
                { label: 'Median', value: fmt(percentile(0.5)) },
                { label: 'Mode', value: modes.length ? modes.map(fmt).join(', ') + '  (' + maxCount + '× each)' : 'No value repeats' },
                { label: 'Minimum', value: fmt(sorted[0]) },
                { label: 'Maximum', value: fmt(sorted[n - 1]) },
                { label: 'Range', value: fmt(sorted[n - 1] - sorted[0]) },
                { label: 'Variance', value: fmt(variance) },
                { label: 'Standard deviation', value: fmt(stdDev) },
                { label: 'Coefficient of variation', value: mean !== 0 ? fmt(stdDev / Math.abs(mean) * 100) + '%' : '—' },
                { label: 'Q1 (25th percentile)', value: fmt(q1) },
                { label: 'Q3 (75th percentile)', value: fmt(q3) },
                { label: 'Interquartile range', value: fmt(q3 - q1) },
                { label: 'Geometric mean', value: sorted[0] > 0 ? fmt(Math.exp(numbers.reduce(function (a, x) { return a + Math.log(x); }, 0) / n)) : 'Needs all-positive values' }
            ];

            var results = [ZT.dataResult(rows, { title: 'Statistics', columns: 2, mono: true })];

            var outliers = numbers.filter(function (x) { return x < q1 - 1.5 * (q3 - q1) || x > q3 + 1.5 * (q3 - q1); });
            if (outliers.length) {
                results.push(ZT.dataResult([
                    { label: 'Outliers (1.5 × IQR rule)', value: outliers.map(fmt).join(', ') }
                ], { title: 'Outliers', columns: 1 }));
            }

            if (ctx.opt.showSorted) {
                results.push(ZT.textResult(sorted.join(', '), { mono: true, title: 'Sorted values' }));
            }

            return results;
        }
    });

    /* ============================================================
       Random numbers
       ============================================================ */
    define({
        id: 'random-number-generator',
        name: 'Random Number Generator',
        category: 'math',
        icon: 'dices',
        description: 'Draw random numbers, dice rolls or lottery picks using secure randomness.',
        tags: ['random', 'number', 'dice', 'lottery', 'pick', 'shuffle'],
        input: 'none',
        options: [
            { id: 'min', type: 'number', label: 'Minimum', value: 1, step: 1 },
            { id: 'max', type: 'number', label: 'Maximum', value: 100, step: 1 },
            { id: 'count', type: 'number', label: 'How many numbers', value: 5, min: 1, max: 10000 },
            { id: 'unique', type: 'checkbox', label: 'No repeats', value: false },
            { id: 'sort', type: 'checkbox', label: 'Sort the results', value: false },
            { id: 'decimals', type: 'number', label: 'Decimal places', value: 0, min: 0, max: 10, help: '0 gives whole numbers.' },
            {
                id: 'separator', type: 'select', label: 'Separate with', value: 'newline',
                options: [
                    { value: 'newline', label: 'New line' }, { value: 'comma', label: 'Comma' },
                    { value: 'space', label: 'Space' }
                ]
            }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var min = Number(o.min), max = Number(o.max);
            if (min > max) { var swap = min; min = max; max = swap; }

            var isInteger = o.decimals === 0;
            if (o.unique && isInteger && o.count > (max - min + 1)) {
                ZT.fail('You asked for ' + o.count + ' unique whole numbers but the range ' + min + '–' + max + ' only contains ' + (max - min + 1) + '.');
            }

            function randomFloat() {
                var buf = new Uint32Array(1);
                crypto.getRandomValues(buf);
                return buf[0] / 4294967296;
            }

            var results = [];
            var seen = Object.create(null);
            var guard = 0;

            while (results.length < o.count && guard++ < o.count * 1000) {
                var value = isInteger
                    ? Math.floor(randomFloat() * (max - min + 1)) + min
                    : Number((randomFloat() * (max - min) + min).toFixed(o.decimals));

                if (o.unique) {
                    if (seen[value]) continue;
                    seen[value] = true;
                }
                results.push(value);
            }

            if (o.sort) results.sort(function (a, b) { return a - b; });

            var separators = { newline: '\n', comma: ', ', space: ' ' };
            return ZT.textResult(results.join(separators[o.separator]), {
                mono: true,
                note: results.length + ' numbers between ' + min + ' and ' + max + ', generated with crypto.getRandomValues'
            });
        }
    });

    /* ============================================================
       Roman numerals
       ============================================================ */
    define({
        id: 'roman-numeral-converter',
        name: 'Roman Numeral Converter',
        category: 'math',
        icon: 'columns-3',
        description: 'Convert between Roman numerals and ordinary numbers.',
        tags: ['roman', 'numeral', 'convert', 'number'],
        input: 'text',
        live: true,
        placeholder: '2026   or   MMXXVI',
        options: [
            {
                id: 'direction', type: 'radio', label: 'Direction', value: 'auto',
                options: [
                    { value: 'auto', label: 'Detect automatically' },
                    { value: 'to-roman', label: 'Number → Roman' },
                    { value: 'to-number', label: 'Roman → Number' }
                ]
            },
            { id: 'per-line', type: 'checkbox', label: 'Convert one value per line', value: false }
        ],
        run: function (ctx) {
            var VALUES = [
                [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
                [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
            ];

            function toRoman(n) {
                if (!Number.isInteger(n) || n < 1 || n > 3999) {
                    ZT.fail('Roman numerals only cover whole numbers from 1 to 3999. "' + n + '" is outside that range.');
                }
                var out = '';
                VALUES.forEach(function (pair) {
                    while (n >= pair[0]) { out += pair[1]; n -= pair[0]; }
                });
                return out;
            }

            function toNumber(s) {
                var roman = String(s).toUpperCase().trim();
                if (!/^[MDCLXVI]+$/.test(roman)) ZT.fail('"' + s + '" contains characters that are not Roman numerals.');

                var SINGLE = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
                var total = 0;
                for (var i = 0; i < roman.length; i++) {
                    var current = SINGLE[roman[i]];
                    var next = SINGLE[roman[i + 1]];
                    // A smaller value before a larger one is subtractive (IV, IX…).
                    total += (next && current < next) ? -current : current;
                }
                if (toRoman(total) !== roman) {
                    ZT.fail('"' + roman + '" is not a well-formed Roman numeral. Did you mean ' + toRoman(total) + '?');
                }
                return total;
            }

            function convertOne(raw) {
                var value = String(raw).trim();
                if (!value) return '';
                var isNumber = /^\d+$/.test(value);
                var toRomanNow = ctx.opt.direction === 'to-roman' || (ctx.opt.direction === 'auto' && isNumber);
                return toRomanNow ? toRoman(parseInt(value, 10)) : String(toNumber(value));
            }

            var text = String(ctx.text || '').trim();
            if (!text) return ZT.textResult('', { note: 'Enter a number or a Roman numeral.' });

            if (ctx.opt.perLine) {
                var out = text.split(/\r?\n/).filter(function (l) { return l.trim(); })
                    .map(function (line) { return line.trim() + '  =  ' + convertOne(line); });
                return ZT.textResult(out.join('\n'), { mono: true });
            }

            var result = convertOne(text);
            return ZT.dataResult([
                { label: 'Input', value: text },
                { label: 'Result', value: result }
            ], { title: 'Conversion', columns: 2, mono: true });
        }
    });


    /* ============================================================
       Loan / EMI
       ============================================================ */
    define({
        id: 'loan-calculator',
        name: 'Loan & EMI Calculator',
        category: 'math',
        icon: 'percent',
        description: 'Work out monthly repayments, total interest and an amortisation schedule.',
        tags: ['loan', 'emi', 'mortgage', 'repayment', 'interest', 'amortisation', 'finance', 'car loan'],
        input: 'none',
        popular: true,
        options: [
            { id: 'amount', type: 'number', label: 'Loan amount', value: 250000, min: 1, step: 'any' },
            { id: 'rate', type: 'number', label: 'Annual interest rate', suffix: '%', value: 5.5, min: 0, max: 100, step: 0.01 },
            { id: 'years', type: 'number', label: 'Term', suffix: 'years', value: 25, min: 0, max: 50 },
            { id: 'months', type: 'number', label: 'plus', suffix: 'months', value: 0, min: 0, max: 11 },
            { id: 'extra', type: 'number', label: 'Extra payment each month', value: 0, min: 0, step: 'any', help: 'Overpaying reduces both the term and the total interest, often dramatically.' },
            { id: 'currency', type: 'text', label: 'Currency symbol', value: '£', maxlength: 4 },
            { id: 'show-schedule', type: 'checkbox', label: 'Show a yearly breakdown', value: true }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var principal = Number(o.amount);
            var totalMonths = o.years * 12 + o.months;

            if (!(principal > 0)) ZT.fail('Enter a loan amount greater than zero.');
            if (totalMonths < 1) ZT.fail('The term must be at least one month.');

            var monthlyRate = o.rate / 100 / 12;

            /* Standard amortisation formula. At 0% it degenerates, so that
               case is just the principal split evenly. */
            var payment = monthlyRate === 0
                ? principal / totalMonths
                : principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths) /
                  (Math.pow(1 + monthlyRate, totalMonths) - 1);

            function money(n) {
                return o.currency + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }

            // Walk the schedule so extra payments are reflected properly.
            var balance = principal;
            var totalInterest = 0;
            var month = 0;
            var yearly = [];
            var yearInterest = 0, yearPrincipal = 0;
            var actualPayment = payment + Number(o.extra || 0);

            while (balance > 0.005 && month < 1200) {
                month++;
                var interest = balance * monthlyRate;
                var towardsPrincipal = Math.min(actualPayment - interest, balance);

                if (towardsPrincipal <= 0) {
                    ZT.fail('At this interest rate the monthly payment never covers the interest, so the loan would never be repaid. Increase the payment or lower the rate.');
                }

                balance -= towardsPrincipal;
                totalInterest += interest;
                yearInterest += interest;
                yearPrincipal += towardsPrincipal;

                if (month % 12 === 0 || balance <= 0.005) {
                    yearly.push({
                        year: Math.ceil(month / 12),
                        interest: yearInterest,
                        principal: yearPrincipal,
                        balance: Math.max(0, balance)
                    });
                    yearInterest = 0; yearPrincipal = 0;
                }
            }

            var rows = [
                { label: 'Monthly payment', value: money(payment) },
                { label: 'Total repaid', value: money(principal + totalInterest) },
                { label: 'Total interest', value: money(totalInterest) },
                { label: 'Interest as % of loan', value: (totalInterest / principal * 100).toFixed(1) + '%' },
                { label: 'Term', value: Math.floor(month / 12) + ' years ' + (month % 12) + ' months' }
            ];

            if (o.extra > 0) {
                var baseInterest = payment * totalMonths - principal;
                rows.push({ label: 'With the extra payment you pay', value: money(actualPayment) + ' a month' });
                rows.push({ label: 'Months saved', value: (totalMonths - month) + ' of ' + totalMonths });
                rows.push({ label: 'Interest saved', value: money(baseInterest - totalInterest) });
            }

            var results = [ZT.dataResult(rows, { title: 'Repayment', columns: 2 })];

            if (o.showSchedule) {
                results.push(ZT.dataResult(yearly.map(function (y) {
                    return {
                        label: 'Year ' + y.year,
                        value: 'interest ' + money(y.interest) + '   ·   principal ' + money(y.principal) + '   ·   balance ' + money(y.balance)
                    };
                }), { title: 'Yearly breakdown', columns: 1, mono: true }));
            }

            return results;
        }
    });

    /* ============================================================
       Compound interest
       ============================================================ */
    define({
        id: 'compound-interest-calculator',
        name: 'Compound Interest Calculator',
        category: 'math',
        icon: 'percent',
        description: 'See how savings or investments grow with regular contributions.',
        tags: ['compound interest', 'savings', 'investment', 'growth', 'finance', 'retirement'],
        input: 'none',
        options: [
            { id: 'principal', type: 'number', label: 'Starting amount', value: 10000, min: 0, step: 'any' },
            { id: 'contribution', type: 'number', label: 'Added each period', value: 200, min: 0, step: 'any' },
            {
                id: 'frequency', type: 'select', label: 'Contribution frequency', value: 'monthly',
                options: [
                    { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' },
                    { value: 'yearly', label: 'Yearly' }, { value: 'none', label: 'No regular contributions' }
                ]
            },
            { id: 'rate', type: 'number', label: 'Annual return', suffix: '%', value: 7, min: -50, max: 100, step: 0.01 },
            { id: 'years', type: 'number', label: 'Years', value: 20, min: 1, max: 100 },
            {
                id: 'compounding', type: 'select', label: 'Compounded', value: '12',
                options: [
                    { value: '1', label: 'Yearly' }, { value: '4', label: 'Quarterly' },
                    { value: '12', label: 'Monthly' }, { value: '365', label: 'Daily' }
                ]
            },
            { id: 'inflation', type: 'number', label: 'Adjust for inflation', suffix: '%', value: 0, min: 0, max: 30, step: 0.1, help: 'Shows what the final figure is worth in today\'s money.' },
            { id: 'currency', type: 'text', label: 'Currency symbol', value: '£', maxlength: 4 }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var n = parseInt(o.compounding, 10);
            var rate = o.rate / 100;

            var perYear = { monthly: 12, quarterly: 4, yearly: 1, none: 0 }[o.frequency];
            var contribution = perYear ? Number(o.contribution) : 0;

            function money(v) {
                return o.currency + v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }

            // Step period by period so contributions compound correctly.
            var periodsPerYear = Math.max(n, perYear || 1);
            var totalPeriods = o.years * periodsPerYear;
            var periodRate = Math.pow(1 + rate / n, n / periodsPerYear) - 1;
            var contributionEvery = perYear ? periodsPerYear / perYear : 0;

            var balance = Number(o.principal);
            var contributed = 0;
            var yearly = [];

            for (var p = 1; p <= totalPeriods; p++) {
                balance *= (1 + periodRate);
                if (contributionEvery && p % Math.round(contributionEvery) === 0) {
                    balance += contribution;
                    contributed += contribution;
                }
                if (p % periodsPerYear === 0) {
                    yearly.push({ year: p / periodsPerYear, balance: balance, contributed: contributed });
                }
            }

            var totalIn = Number(o.principal) + contributed;
            var interest = balance - totalIn;
            var real = o.inflation > 0 ? balance / Math.pow(1 + o.inflation / 100, o.years) : null;

            var rows = [
                { label: 'Final balance', value: money(balance) },
                { label: 'You put in', value: money(totalIn) },
                { label: 'Interest earned', value: money(interest) },
                { label: 'Growth', value: totalIn > 0 ? ((balance / totalIn - 1) * 100).toFixed(1) + '%' : '—' },
                { label: 'Interest as share of total', value: (interest / balance * 100).toFixed(1) + '%' }
            ];
            if (real !== null) {
                rows.push({ label: "In today's money", value: money(real) });
                rows.push({ label: 'Lost to inflation', value: money(balance - real) });
            }

            return [
                ZT.dataResult(rows, { title: 'After ' + o.years + ' years', columns: 2 }),
                ZT.dataResult(yearly.filter(function (y, i) {
                    // Keep the list readable on long horizons.
                    return yearly.length <= 20 || y.year % Math.ceil(yearly.length / 20) === 0 || i === yearly.length - 1;
                }).map(function (y) {
                    return { label: 'Year ' + y.year, value: money(y.balance) };
                }), { title: 'Growth over time', columns: 2, mono: true })
            ];
        }
    });

    /* ============================================================
       BMI
       ============================================================ */
    define({
        id: 'bmi-calculator',
        name: 'BMI Calculator',
        category: 'math',
        icon: 'calculator',
        description: 'Calculate body mass index in metric or imperial units.',
        tags: ['bmi', 'body mass index', 'weight', 'health', 'fitness', 'calculator'],
        input: 'none',
        popular: true,
        options: [
            {
                id: 'units', type: 'radio', label: 'Units', value: 'metric',
                options: [
                    { value: 'metric', label: 'Metric (kg, cm)' },
                    { value: 'imperial', label: 'Imperial (lb, ft/in)' }
                ]
            },
            { id: 'weight-kg', type: 'number', label: 'Weight', suffix: 'kg', value: 70, min: 1, max: 500, step: 0.1, when: function (o) { return o.units === 'metric'; } },
            { id: 'height-cm', type: 'number', label: 'Height', suffix: 'cm', value: 175, min: 50, max: 260, step: 0.5, when: function (o) { return o.units === 'metric'; } },
            { id: 'weight-lb', type: 'number', label: 'Weight', suffix: 'lb', value: 154, min: 1, max: 1100, step: 0.1, when: function (o) { return o.units === 'imperial'; } },
            { id: 'height-ft', type: 'number', label: 'Height', suffix: 'ft', value: 5, min: 1, max: 8, when: function (o) { return o.units === 'imperial'; } },
            { id: 'height-in', type: 'number', label: 'and', suffix: 'in', value: 9, min: 0, max: 11, step: 0.5, when: function (o) { return o.units === 'imperial'; } },
            { id: 'age', type: 'number', label: 'Age (optional)', suffix: 'years', value: 0, min: 0, max: 120 },
            { id: 'note', type: 'note', text: 'BMI is a rough population-level screen, not a diagnosis. It takes no account of muscle mass, build or body composition, which is why very athletic people often read as "overweight". Treat it as one number among many, and talk to a clinician about anything that matters.' }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var kg, metres;

            if (o.units === 'imperial') {
                kg = o.weightLb * 0.45359237;
                metres = (o.heightFt * 12 + o.heightIn) * 0.0254;
            } else {
                kg = o.weightKg;
                metres = o.heightCm / 100;
            }

            if (!(metres > 0) || !(kg > 0)) ZT.fail('Enter a height and weight greater than zero.');

            var bmi = kg / (metres * metres);

            var category, guidance;
            if (bmi < 16) { category = 'Severely underweight'; guidance = 'Well below the healthy range — worth discussing with a doctor.'; }
            else if (bmi < 18.5) { category = 'Underweight'; guidance = 'Below the range usually considered healthy for adults.'; }
            else if (bmi < 25) { category = 'Healthy weight'; guidance = 'Within the range usually considered healthy for adults.'; }
            else if (bmi < 30) { category = 'Overweight'; guidance = 'Above the usual healthy range, though build and muscle mass matter.'; }
            else if (bmi < 35) { category = 'Obese (class I)'; guidance = 'Worth discussing with a clinician.'; }
            else if (bmi < 40) { category = 'Obese (class II)'; guidance = 'Worth discussing with a clinician.'; }
            else { category = 'Obese (class III)'; guidance = 'Worth discussing with a clinician.'; }

            // The healthy-weight span for this height, which is more actionable than the index.
            var lowerKg = 18.5 * metres * metres;
            var upperKg = 24.9 * metres * metres;

            function weight(k) {
                return o.units === 'imperial'
                    ? (k / 0.45359237).toFixed(1) + ' lb'
                    : k.toFixed(1) + ' kg';
            }

            var tone = bmi >= 18.5 && bmi < 25 ? 'good' : (bmi < 16 || bmi >= 35 ? 'bad' : 'warn');
            var meter = ZT.el('div', { class: 'zt-meter-wrap' }, [
                ZT.el('div', { class: 'zt-meter__label' }, [
                    ZT.el('strong', { text: bmi.toFixed(1) + '  —  ' + category }),
                    ZT.el('span', { text: 'healthy range is 18.5 to 24.9' })
                ]),
                ZT.el('div', { class: 'zt-meter zt-meter--' + tone },
                    ZT.el('div', { class: 'zt-meter__bar', style: { width: Math.min(100, bmi / 40 * 100) + '%' } }))
            ]);

            var rows = [
                { label: 'BMI', value: bmi.toFixed(1) },
                { label: 'Category', value: category },
                { label: 'Healthy weight for your height', value: weight(lowerKg) + ' to ' + weight(upperKg) },
                { label: 'Guidance', value: guidance }
            ];

            if (bmi >= 25) {
                rows.push({ label: 'To reach the healthy range', value: 'about ' + weight(kg - upperKg) + ' less' });
            } else if (bmi < 18.5) {
                rows.push({ label: 'To reach the healthy range', value: 'about ' + weight(lowerKg - kg) + ' more' });
            }

            if (o.age > 0 && o.age < 20) {
                rows.push({ label: 'Important', value: 'For anyone under 20, adult BMI categories do not apply — growth charts and percentiles are used instead. Ignore the category above.' });
            }

            return [
                ZT.nodeResult(meter, { title: 'Result' }),
                ZT.dataResult(rows, { title: 'Details', columns: 2 })
            ];
        }
    });

    /* ============================================================
       Discount
       ============================================================ */
    define({
        id: 'discount-calculator',
        name: 'Discount & Sale Price Calculator',
        category: 'math',
        icon: 'percent',
        description: 'Work out sale prices, savings, stacked discounts and tax.',
        tags: ['discount', 'sale', 'percent off', 'savings', 'price', 'shopping', 'markdown'],
        input: 'none',
        popular: true,
        options: [
            { id: 'price', type: 'number', label: 'Original price', value: 100, min: 0, step: 'any' },
            {
                id: 'mode', type: 'select', label: 'Work out', value: 'percent-off',
                options: [
                    { value: 'percent-off', label: 'Price after a % discount' },
                    { value: 'amount-off', label: 'Price after a fixed discount' },
                    { value: 'find-percent', label: 'What % discount was applied' },
                    { value: 'reverse', label: 'Original price from the sale price' }
                ]
            },
            { id: 'percent', type: 'number', label: 'Discount', suffix: '%', value: 25, min: 0, max: 100, step: 0.1, when: function (o) { return o.mode === 'percent-off' || o.mode === 'reverse'; } },
            { id: 'amount', type: 'number', label: 'Discount amount', value: 20, min: 0, step: 'any', when: function (o) { return o.mode === 'amount-off'; } },
            { id: 'sale-price', type: 'number', label: 'Sale price', value: 75, min: 0, step: 'any', when: function (o) { return o.mode === 'find-percent' || o.mode === 'reverse'; } },
            { id: 'second-discount', type: 'number', label: 'Second discount applied after', suffix: '%', value: 0, min: 0, max: 100, step: 0.1, when: function (o) { return o.mode === 'percent-off'; }, help: 'Stacked discounts multiply — 20% then 10% is 28% off, not 30%.' },
            { id: 'tax', type: 'number', label: 'Tax added at checkout', suffix: '%', value: 0, min: 0, max: 100, step: 0.1 },
            { id: 'currency', type: 'text', label: 'Currency symbol', value: '£', maxlength: 4 }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            function money(v) {
                return o.currency + v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }

            var rows = [];
            var finalPrice, saved, effectivePercent;

            if (o.mode === 'find-percent') {
                if (!(o.price > 0)) ZT.fail('Enter an original price greater than zero.');
                saved = o.price - o.salePrice;
                effectivePercent = saved / o.price * 100;
                finalPrice = o.salePrice;
                rows.push({ label: 'Discount applied', value: effectivePercent.toFixed(2) + '%' });
                rows.push({ label: 'You save', value: money(saved) });
            } else if (o.mode === 'reverse') {
                if (o.percent >= 100) ZT.fail('A 100% discount leaves no original price to work back to.');
                var original = o.salePrice / (1 - o.percent / 100);
                finalPrice = o.salePrice;
                saved = original - o.salePrice;
                rows.push({ label: 'Original price', value: money(original) });
                rows.push({ label: 'Discount was', value: money(saved) });
            } else if (o.mode === 'amount-off') {
                finalPrice = Math.max(0, o.price - o.amount);
                saved = o.price - finalPrice;
                effectivePercent = o.price > 0 ? saved / o.price * 100 : 0;
                rows.push({ label: 'Sale price', value: money(finalPrice) });
                rows.push({ label: 'Equivalent discount', value: effectivePercent.toFixed(2) + '%' });
            } else {
                var afterFirst = o.price * (1 - o.percent / 100);
                finalPrice = o.secondDiscount > 0 ? afterFirst * (1 - o.secondDiscount / 100) : afterFirst;
                saved = o.price - finalPrice;
                effectivePercent = o.price > 0 ? saved / o.price * 100 : 0;

                rows.push({ label: 'Sale price', value: money(finalPrice) });
                rows.push({ label: 'You save', value: money(saved) });

                if (o.secondDiscount > 0) {
                    rows.push({ label: 'After the first discount', value: money(afterFirst) });
                    rows.push({
                        label: 'Combined discount',
                        value: effectivePercent.toFixed(2) + '%  —  not ' + (o.percent + o.secondDiscount) + '%, because the second is taken off the already-reduced price'
                    });
                }
            }

            if (o.tax > 0) {
                var withTax = finalPrice * (1 + o.tax / 100);
                rows.push({ label: 'Tax at ' + o.tax + '%', value: money(withTax - finalPrice) });
                rows.push({ label: 'Total at checkout', value: money(withTax) });
            }

            return ZT.dataResult(rows, { title: 'Result', columns: 2 });
        }
    });

    /* ============================================================
       GPA
       ============================================================ */
    define({
        id: 'gpa-calculator',
        name: 'GPA Calculator',
        category: 'math',
        icon: 'calculator',
        description: 'Calculate a weighted grade point average from your courses.',
        tags: ['gpa', 'grade', 'average', 'university', 'college', 'school', 'cgpa'],
        input: 'text',
        inputLabel: 'Courses',
        placeholder: 'Mathematics | A | 4\nPhysics | B+ | 3\nHistory | A- | 3\nChemistry | B | 4',
        options: [
            {
                id: 'scale', type: 'select', label: 'Grading scale', value: 'us-4',
                options: [
                    { value: 'us-4', label: 'US 4.0 with +/-' },
                    { value: 'us-4-plain', label: 'US 4.0 without +/-' },
                    { value: 'percent', label: 'Percentages (0–100)' },
                    { value: 'india-10', label: 'India 10-point CGPA' }
                ]
            },
            { id: 'note', type: 'note', text: 'One course per line:  name | grade | credits. Credits are optional — leave them out and every course counts equally.' },
            { id: 'previous-gpa', type: 'number', label: 'Previous GPA', value: 0, min: 0, max: 10, step: 0.01, help: 'Leave at 0 to ignore. Use it to work out a cumulative GPA.' },
            { id: 'previous-credits', type: 'number', label: 'Previous credits', value: 0, min: 0, max: 500, when: function (o) { return o.previousGpa > 0; } }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var lines = String(ctx.text || '').split(/\r?\n/).filter(function (l) { return l.trim(); });
            if (!lines.length) {
                return ZT.dataResult([{ label: 'Waiting for input', value: 'Add your courses, one per line.' }], { title: 'GPA' });
            }

            var US_PLUS_MINUS = {
                'A+': 4.0, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
                'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0.0
            };
            var US_PLAIN = { 'A': 4.0, 'B': 3.0, 'C': 2.0, 'D': 1.0, 'F': 0.0 };

            function toPoints(grade) {
                var g = String(grade).trim().toUpperCase();

                if (o.scale === 'percent' || o.scale === 'india-10') {
                    var n = parseFloat(g);
                    if (isNaN(n)) ZT.fail('"' + grade + '" is not a number — this scale expects numeric grades.');
                    if (o.scale === 'india-10') return Math.min(10, n);
                    // Convert a percentage to the 4.0 scale.
                    if (n >= 93) return 4.0;
                    if (n >= 90) return 3.7;
                    if (n >= 87) return 3.3;
                    if (n >= 83) return 3.0;
                    if (n >= 80) return 2.7;
                    if (n >= 77) return 2.3;
                    if (n >= 73) return 2.0;
                    if (n >= 70) return 1.7;
                    if (n >= 67) return 1.3;
                    if (n >= 63) return 1.0;
                    if (n >= 60) return 0.7;
                    return 0;
                }

                var table = o.scale === 'us-4-plain' ? US_PLAIN : US_PLUS_MINUS;
                if (table[g] === undefined) {
                    ZT.fail('"' + grade + '" is not a grade on this scale. Expected one of: ' + Object.keys(table).join(', '));
                }
                return table[g];
            }

            var courses = lines.map(function (line, i) {
                var parts = line.split('|').map(function (p) { return p.trim(); });
                if (parts.length < 2) ZT.fail('Line ' + (i + 1) + ' needs at least a name and a grade, separated by |');
                var credits = parts[2] ? parseFloat(parts[2]) : 1;
                if (isNaN(credits) || credits <= 0) ZT.fail('Line ' + (i + 1) + ' has invalid credits.');
                return { name: parts[0], grade: parts[1], points: toPoints(parts[1]), credits: credits };
            });

            var totalCredits = courses.reduce(function (s, c) { return s + c.credits; }, 0);
            var weighted = courses.reduce(function (s, c) { return s + c.points * c.credits; }, 0);
            var gpa = weighted / totalCredits;

            var max = o.scale === 'india-10' ? 10 : 4;
            var rows = [
                { label: 'GPA', value: gpa.toFixed(2) + ' / ' + max.toFixed(1) },
                { label: 'Courses', value: String(courses.length) },
                { label: 'Total credits', value: String(totalCredits) },
                { label: 'Quality points', value: weighted.toFixed(2) }
            ];

            if (o.previousGpa > 0 && o.previousCredits > 0) {
                var cumulative = (weighted + o.previousGpa * o.previousCredits) / (totalCredits + o.previousCredits);
                rows.push({ label: 'Cumulative GPA', value: cumulative.toFixed(2) + ' / ' + max.toFixed(1) });
                rows.push({ label: 'Total credits overall', value: String(totalCredits + o.previousCredits) });
            }

            return [
                ZT.dataResult(rows, { title: 'Result', columns: 2 }),
                ZT.dataResult(courses.map(function (c) {
                    return { label: c.name, value: c.grade + '  ·  ' + c.points.toFixed(1) + ' points  ·  ' + c.credits + ' credits' };
                }), { title: 'Courses', columns: 1, mono: true })
            ];
        }
    });

    /* ============================================================
       Fractions
       ============================================================ */
    define({
        id: 'fraction-calculator',
        name: 'Fraction Calculator & Converter',
        category: 'math',
        icon: 'percent',
        description: 'Add, subtract, multiply and divide fractions, or convert to and from decimals.',
        tags: ['fraction', 'decimal', 'convert', 'simplify', 'mixed number', 'ratio'],
        input: 'none',
        options: [
            {
                id: 'mode', type: 'select', label: 'Mode', value: 'arithmetic',
                options: [
                    { value: 'arithmetic', label: 'Calculate with two fractions' },
                    { value: 'to-decimal', label: 'Fraction → decimal' },
                    { value: 'from-decimal', label: 'Decimal → fraction' },
                    { value: 'simplify', label: 'Simplify a fraction' }
                ]
            },
            { id: 'fraction-a', type: 'text', label: 'First fraction', value: '3/4', when: function (o) { return o.mode !== 'from-decimal'; }, help: 'Write it as 3/4, or as a mixed number like 1 1/2.' },
            {
                id: 'operation', type: 'select', label: 'Operation', value: 'add',
                options: [
                    { value: 'add', label: 'Add  +' }, { value: 'subtract', label: 'Subtract  −' },
                    { value: 'multiply', label: 'Multiply  ×' }, { value: 'divide', label: 'Divide  ÷' }
                ],
                when: function (o) { return o.mode === 'arithmetic'; }
            },
            { id: 'fraction-b', type: 'text', label: 'Second fraction', value: '1/6', when: function (o) { return o.mode === 'arithmetic'; } },
            { id: 'decimal', type: 'number', label: 'Decimal', value: 0.375, step: 'any', when: function (o) { return o.mode === 'from-decimal'; } },
            { id: 'max-denominator', type: 'number', label: 'Largest denominator to try', value: 1000, min: 2, max: 1000000, when: function (o) { return o.mode === 'from-decimal'; } },
            { id: 'mixed', type: 'checkbox', label: 'Show improper results as mixed numbers', value: true }
        ],
        run: function (ctx) {
            var o = ctx.opt;

            function gcd(a, b) { return b ? gcd(b, a % b) : Math.abs(a); }

            function parse(text) {
                var s = String(text).trim();
                // Mixed number: "1 1/2"
                var mixed = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
                if (mixed) {
                    var whole = parseInt(mixed[1], 10);
                    var num = parseInt(mixed[2], 10);
                    var den = parseInt(mixed[3], 10);
                    if (!den) ZT.fail('A fraction cannot have a denominator of zero.');
                    var sign = whole < 0 ? -1 : 1;
                    return { n: sign * (Math.abs(whole) * den + num), d: den };
                }
                var simple = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
                if (simple) {
                    if (!parseInt(simple[2], 10)) ZT.fail('A fraction cannot have a denominator of zero.');
                    return { n: parseInt(simple[1], 10), d: parseInt(simple[2], 10) };
                }
                if (/^-?\d+$/.test(s)) return { n: parseInt(s, 10), d: 1 };
                ZT.fail('"' + text + '" is not a fraction. Write it as 3/4, 1 1/2 or a whole number.');
            }

            function simplify(f) {
                var divisor = gcd(f.n, f.d) || 1;
                var n = f.n / divisor;
                var d = f.d / divisor;
                if (d < 0) { n = -n; d = -d; }
                return { n: n, d: d };
            }

            function format(f) {
                var s = simplify(f);
                if (s.d === 1) return String(s.n);
                if (o.mixed && Math.abs(s.n) > s.d) {
                    var whole = Math.trunc(s.n / s.d);
                    var remainder = Math.abs(s.n % s.d);
                    return whole + ' ' + remainder + '/' + s.d;
                }
                return s.n + '/' + s.d;
            }

            if (o.mode === 'from-decimal') {
                var value = Number(o.decimal);
                if (!isFinite(value)) ZT.fail('Enter a number.');

                // Stern-Brocot search for the closest fraction within the limit.
                var bestN = Math.round(value), bestD = 1;
                var bestError = Math.abs(value - bestN);
                for (var d = 1; d <= o.maxDenominator; d++) {
                    var n = Math.round(value * d);
                    var error = Math.abs(value - n / d);
                    if (error < bestError - 1e-12) { bestN = n; bestD = d; bestError = error; }
                    if (bestError < 1e-12) break;
                }
                var f = simplify({ n: bestN, d: bestD });

                return ZT.dataResult([
                    { label: 'Fraction', value: format(f) },
                    { label: 'Exact form', value: f.n + '/' + f.d },
                    { label: 'Decimal value', value: (f.n / f.d).toString() },
                    { label: 'Difference', value: bestError === 0 ? 'exact' : bestError.toExponential(3) },
                    { label: 'Percentage', value: (value * 100).toFixed(4).replace(/\.?0+$/, '') + '%' }
                ], { title: 'Result', columns: 2, mono: true });
            }

            var a = parse(o.fractionA);

            if (o.mode === 'to-decimal' || o.mode === 'simplify') {
                var s = simplify(a);
                var decimal = s.n / s.d;
                return ZT.dataResult([
                    { label: 'Simplified', value: format(s) },
                    { label: 'Improper form', value: s.n + '/' + s.d },
                    { label: 'Decimal', value: String(decimal) },
                    { label: 'Percentage', value: (decimal * 100).toFixed(4).replace(/\.?0+$/, '') + '%' },
                    { label: 'Was already simplified', value: (a.n === s.n && a.d === s.d) ? 'yes' : 'no' }
                ], { title: 'Result', columns: 2, mono: true });
            }

            var b = parse(o.fractionB);
            var result;
            switch (o.operation) {
                case 'subtract': result = { n: a.n * b.d - b.n * a.d, d: a.d * b.d }; break;
                case 'multiply': result = { n: a.n * b.n, d: a.d * b.d }; break;
                case 'divide':
                    if (b.n === 0) ZT.fail('You cannot divide by zero.');
                    result = { n: a.n * b.d, d: a.d * b.n };
                    break;
                default: result = { n: a.n * b.d + b.n * a.d, d: a.d * b.d };
            }

            var SYMBOLS = { add: '+', subtract: '−', multiply: '×', divide: '÷' };
            var simplified = simplify(result);

            return ZT.dataResult([
                { label: 'Expression', value: format(a) + '  ' + SYMBOLS[o.operation] + '  ' + format(b) },
                { label: 'Result', value: format(simplified) },
                { label: 'Improper form', value: simplified.n + '/' + simplified.d },
                { label: 'Decimal', value: String(simplified.n / simplified.d) },
                { label: 'Before simplifying', value: result.n + '/' + result.d }
            ], { title: 'Result', columns: 2, mono: true });
        }
    });

})();
