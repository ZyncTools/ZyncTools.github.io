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

})();
