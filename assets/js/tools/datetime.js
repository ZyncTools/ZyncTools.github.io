/**
 * ZyncTools — Date & time tools
 */
(function () {
    'use strict';

    var ZT = window.ZT;
    var define = ZT.registry.define;

    function pad(n) { return n < 10 ? '0' + n : String(n); }

    /* ============================================================
       Timestamp converter
       ============================================================ */
    define({
        id: 'timestamp-converter',
        name: 'Unix Timestamp Converter',
        category: 'datetime',
        icon: 'clock',
        description: 'Convert Unix timestamps to readable dates and back, in any time zone.',
        tags: ['timestamp', 'unix', 'epoch', 'date', 'convert', 'iso'],
        input: 'text',
        live: true,
        popular: true,
        placeholder: '1767225600   or   2026-01-01 00:00:00',
        options: [
            {
                id: 'direction', type: 'radio', label: 'Input is', value: 'auto',
                options: [
                    { value: 'auto', label: 'Detect automatically' },
                    { value: 'timestamp', label: 'A Unix timestamp' },
                    { value: 'date', label: 'A date string' }
                ]
            },
            {
                id: 'unit', type: 'select', label: 'Timestamp unit', value: 'auto',
                options: [
                    { value: 'auto', label: 'Detect from length' },
                    { value: 's', label: 'Seconds' },
                    { value: 'ms', label: 'Milliseconds' },
                    { value: 'us', label: 'Microseconds' }
                ],
                when: function (o) { return o.direction !== 'date'; }
            },
            { id: 'use-now', type: 'checkbox', label: 'Use the current time instead of the input', value: false },
            { id: 'timezone', type: 'text', label: 'Time zone', value: '', placeholder: 'e.g. Europe/London — leave empty for your local zone' }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var raw = String(ctx.text || '').trim();

            var date;
            if (o.useNow) {
                date = new Date();
            } else if (!raw) {
                return ZT.dataResult([{ label: 'Status', value: 'Enter a timestamp or a date, or tick "use the current time".' }], { title: 'Converter' });
            } else {
                var numeric = raw.replace(/[\s,_]/g, '');
                var looksNumeric = /^-?\d+(\.\d+)?$/.test(numeric);
                var treatAsTimestamp = o.direction === 'timestamp' || (o.direction === 'auto' && looksNumeric);

                if (treatAsTimestamp) {
                    if (!looksNumeric) ZT.fail('"' + raw + '" is not a number, so it cannot be a Unix timestamp.');
                    var value = parseFloat(numeric);
                    var unit = o.unit;
                    if (unit === 'auto') {
                        var digits = numeric.replace(/^-|\..*$/g, '').length;
                        unit = digits >= 16 ? 'us' : digits >= 12 ? 'ms' : 's';
                    }
                    var ms = unit === 's' ? value * 1000 : unit === 'us' ? value / 1000 : value;
                    date = new Date(ms);
                } else {
                    date = new Date(raw);
                    if (isNaN(date.getTime())) {
                        // Accept "YYYY-MM-DD HH:MM:SS" which older engines reject.
                        date = new Date(raw.replace(' ', 'T'));
                    }
                }
            }

            if (isNaN(date.getTime())) {
                ZT.fail('"' + raw + '" could not be read as a date or timestamp.');
            }

            var timeZone = o.timezone.trim() || undefined;
            function formatIn(options) {
                try {
                    return new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: timeZone }, options)).format(date);
                } catch (e) {
                    ZT.fail('"' + o.timezone + '" is not a time zone I recognise. Use IANA names such as Europe/London or America/New_York.');
                }
            }

            var seconds = Math.floor(date.getTime() / 1000);
            var diffMs = Date.now() - date.getTime();
            var relative = describeRelative(diffMs);

            return ZT.dataResult([
                { label: 'Unix seconds', value: String(seconds) },
                { label: 'Unix milliseconds', value: String(date.getTime()) },
                { label: 'ISO 8601 (UTC)', value: date.toISOString() },
                { label: 'RFC 2822', value: date.toUTCString() },
                { label: 'Local time', value: date.toString().replace(/\s*\(.*\)$/, '') },
                { label: 'Formatted' + (timeZone ? ' in ' + timeZone : ''), value: formatIn({ dateStyle: 'full', timeStyle: 'long' }) },
                { label: 'Date only', value: formatIn({ year: 'numeric', month: '2-digit', day: '2-digit' }) },
                { label: 'Time only', value: formatIn({ hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) },
                { label: 'Relative', value: relative },
                { label: 'Day of week', value: formatIn({ weekday: 'long' }) },
                { label: 'Day of year', value: String(dayOfYear(date)) },
                { label: 'ISO week', value: 'Week ' + isoWeek(date) },
                { label: 'Your time zone', value: Intl.DateTimeFormat().resolvedOptions().timeZone }
            ], { title: 'Conversions', columns: 2, mono: true });
        }
    });

    function describeRelative(diffMs) {
        var future = diffMs < 0;
        var s = Math.abs(diffMs) / 1000;
        var value, unit;
        if (s < 60) { value = Math.round(s); unit = 'second'; }
        else if (s < 3600) { value = Math.round(s / 60); unit = 'minute'; }
        else if (s < 86400) { value = Math.round(s / 3600); unit = 'hour'; }
        else if (s < 2592000) { value = Math.round(s / 86400); unit = 'day'; }
        else if (s < 31536000) { value = Math.round(s / 2592000); unit = 'month'; }
        else { value = Math.round(s / 31536000); unit = 'year'; }
        var plural = value === 1 ? '' : 's';
        return future ? 'in ' + value + ' ' + unit + plural : value + ' ' + unit + plural + ' ago';
    }

    function dayOfYear(date) {
        var start = new Date(date.getFullYear(), 0, 0);
        return Math.floor((date - start) / 86400000);
    }

    function isoWeek(date) {
        var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        // Shift to the Thursday of the same ISO week, then count from 1 January.
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    }

    /* ============================================================
       Date difference
       ============================================================ */
    define({
        id: 'date-difference-calculator',
        name: 'Date Difference Calculator',
        category: 'datetime',
        icon: 'calendar-range',
        description: 'Work out the time between two dates, with or without weekends.',
        tags: ['date', 'difference', 'duration', 'days between', 'business days'],
        input: 'none',
        popular: true,
        options: [
            { id: 'start', type: 'date', label: 'Start date', value: '' },
            { id: 'end', type: 'date', label: 'End date', value: '' },
            { id: 'include-time', type: 'checkbox', label: 'Include times of day', value: false },
            { id: 'start-time', type: 'time', label: 'Start time', value: '09:00', when: function (o) { return o.includeTime; } },
            { id: 'end-time', type: 'time', label: 'End time', value: '17:00', when: function (o) { return o.includeTime; } },
            { id: 'inclusive', type: 'checkbox', label: 'Count both the start and end day', value: false },
            { id: 'exclude-weekends', type: 'checkbox', label: 'Also show working days only', value: true }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var today = new Date().toISOString().slice(0, 10);
            var startStr = o.start || today;
            var endStr = o.end || today;

            var start = new Date(startStr + (o.includeTime ? 'T' + (o.startTime || '00:00') : 'T00:00'));
            var end = new Date(endStr + (o.includeTime ? 'T' + (o.endTime || '00:00') : 'T00:00'));

            if (isNaN(start.getTime()) || isNaN(end.getTime())) ZT.fail('Pick two valid dates.');

            var reversed = end < start;
            if (reversed) { var swap = start; start = end; end = swap; }

            var ms = end - start;
            var totalDays = Math.floor(ms / 86400000) + (o.inclusive ? 1 : 0);

            // Calendar-accurate breakdown, not just days divided by 365.
            var years = end.getFullYear() - start.getFullYear();
            var months = end.getMonth() - start.getMonth();
            var days = end.getDate() - start.getDate();
            if (days < 0) {
                months--;
                days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
            }
            if (months < 0) { years--; months += 12; }

            var workingDays = 0;
            var weekendDays = 0;
            var cursor = new Date(start);
            var limit = o.inclusive ? end.getTime() : end.getTime() - 1;
            var guard = 0;
            while (cursor.getTime() <= limit && guard++ < 400000) {
                var day = cursor.getDay();
                if (day === 0 || day === 6) weekendDays++; else workingDays++;
                cursor.setDate(cursor.getDate() + 1);
            }

            var rows = [
                { label: 'Total days', value: ZT.formatNumber(totalDays) },
                { label: 'In years, months, days', value: years + ' years, ' + months + ' months, ' + days + ' days' },
                { label: 'Total weeks', value: (totalDays / 7).toFixed(2) },
                { label: 'Total hours', value: ZT.formatNumber(Math.round(ms / 3600000)) },
                { label: 'Total minutes', value: ZT.formatNumber(Math.round(ms / 60000)) },
                { label: 'Total seconds', value: ZT.formatNumber(Math.round(ms / 1000)) }
            ];

            if (o.excludeWeekends) {
                rows.push({ label: 'Working days (Mon–Fri)', value: ZT.formatNumber(workingDays) });
                rows.push({ label: 'Weekend days', value: ZT.formatNumber(weekendDays) });
            }

            rows.push({ label: 'From', value: start.toDateString() });
            rows.push({ label: 'To', value: end.toDateString() });
            if (reversed) rows.push({ label: 'Note', value: 'The end date was before the start date, so the dates were swapped.' });

            return ZT.dataResult(rows, { title: 'Difference', columns: 2 });
        }
    });

    /* ============================================================
       Age calculator
       ============================================================ */
    define({
        id: 'age-calculator',
        name: 'Age Calculator',
        category: 'datetime',
        icon: 'cake',
        description: 'Calculate exact age in years, months, days — and the next birthday.',
        tags: ['age', 'birthday', 'birthdate', 'years old', 'calculator'],
        input: 'none',
        options: [
            { id: 'birth-date', type: 'date', label: 'Date of birth', value: '' },
            { id: 'as-of', type: 'date', label: 'Calculate age as of', value: '', help: 'Leave empty to use today.' }
        ],
        run: function (ctx) {
            if (!ctx.opt.birthDate) {
                return ZT.dataResult(
                    [{ label: 'Waiting for input', value: 'Pick a date of birth above and the full breakdown appears here.' }],
                    { title: 'Age' }
                );
            }

            var birth = new Date(ctx.opt.birthDate + 'T00:00');
            var asOf = ctx.opt.asOf ? new Date(ctx.opt.asOf + 'T00:00') : new Date();
            if (isNaN(birth.getTime())) ZT.fail('That date of birth is not valid.');
            if (birth > asOf) ZT.fail('The date of birth is in the future.');

            var years = asOf.getFullYear() - birth.getFullYear();
            var months = asOf.getMonth() - birth.getMonth();
            var days = asOf.getDate() - birth.getDate();
            if (days < 0) {
                months--;
                days += new Date(asOf.getFullYear(), asOf.getMonth(), 0).getDate();
            }
            if (months < 0) { years--; months += 12; }

            var totalDays = Math.floor((asOf - birth) / 86400000);

            var nextBirthday = new Date(asOf.getFullYear(), birth.getMonth(), birth.getDate());
            if (nextBirthday < asOf) nextBirthday.setFullYear(asOf.getFullYear() + 1);
            var daysToBirthday = Math.ceil((nextBirthday - asOf) / 86400000);

            return ZT.dataResult([
                { label: 'Age', value: years + ' years, ' + months + ' months, ' + days + ' days' },
                { label: 'Total years', value: (totalDays / 365.25).toFixed(2) },
                { label: 'Total months', value: ZT.formatNumber(years * 12 + months) },
                { label: 'Total weeks', value: ZT.formatNumber(Math.floor(totalDays / 7)) },
                { label: 'Total days', value: ZT.formatNumber(totalDays) },
                { label: 'Total hours', value: ZT.formatNumber(totalDays * 24) },
                { label: 'Born on a', value: birth.toLocaleDateString('en-GB', { weekday: 'long' }) },
                { label: 'Next birthday', value: nextBirthday.toDateString() + '  (' + (daysToBirthday === 0 ? 'today!' : 'in ' + daysToBirthday + ' days') + ')' },
                { label: 'Turning', value: (years + (daysToBirthday === 0 ? 0 : 1)) + ' years old' }
            ], { title: 'Age', columns: 2 });
        }
    });

    /* ============================================================
       Time zone converter
       ============================================================ */
    define({
        id: 'timezone-converter',
        name: 'Time Zone Converter',
        category: 'datetime',
        icon: 'globe',
        description: 'See what one moment in time looks like across several time zones.',
        tags: ['timezone', 'time zone', 'utc', 'convert', 'meeting', 'world clock'],
        input: 'none',
        options: [
            { id: 'use-now', type: 'checkbox', label: 'Use the current time', value: true },
            { id: 'date', type: 'date', label: 'Date', value: '', when: notNow },
            { id: 'time', type: 'time', label: 'Time', value: '12:00', when: notNow },
            { id: 'source-zone', type: 'text', label: 'That time is in', value: '', placeholder: 'leave empty for your local zone', when: notNow },
            {
                id: 'zones', type: 'textarea', label: 'Show these zones', rows: 6,
                value: 'UTC\nAmerica/New_York\nAmerica/Los_Angeles\nEurope/London\nEurope/Berlin\nAsia/Kolkata\nAsia/Tokyo\nAustralia/Sydney',
                help: 'One IANA time zone per line.'
            },
            { id: 'hour12', type: 'checkbox', label: 'Use 12-hour clock', value: false }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var moment;

            if (o.useNow) {
                moment = new Date();
            } else {
                var dateStr = o.date || new Date().toISOString().slice(0, 10);
                var timeStr = o.time || '12:00';
                var sourceZone = o.sourceZone.trim();

                if (!sourceZone) {
                    moment = new Date(dateStr + 'T' + timeStr);
                } else {
                    // Find the UTC instant whose rendering in sourceZone matches the input.
                    var guess = new Date(dateStr + 'T' + timeStr + 'Z');
                    for (var i = 0; i < 3; i++) {
                        var rendered = renderInZone(guess, sourceZone);
                        var delta = new Date(dateStr + 'T' + timeStr + 'Z') - new Date(rendered + 'Z');
                        guess = new Date(guess.getTime() + delta);
                        if (Math.abs(delta) < 1000) break;
                    }
                    moment = guess;
                }
            }

            if (isNaN(moment.getTime())) ZT.fail('That date and time could not be understood.');

            var zones = String(o.zones || '').split(/\r?\n/).map(function (z) { return z.trim(); }).filter(Boolean);
            var localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (zones.indexOf(localZone) === -1) zones.unshift(localZone);

            var rows = zones.map(function (zone) {
                try {
                    var formatted = new Intl.DateTimeFormat('en-GB', {
                        timeZone: zone,
                        weekday: 'short', day: '2-digit', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                        hour12: o.hour12,
                        timeZoneName: 'short'
                    }).format(moment);
                    return {
                        label: zone.replace(/_/g, ' ') + (zone === localZone ? '  (you)' : ''),
                        value: formatted
                    };
                } catch (e) {
                    return { label: zone, value: 'Unknown time zone — use IANA names like Europe/Paris' };
                }
            });

            return ZT.dataResult(rows, {
                title: 'The same moment worldwide',
                columns: 2,
                note: 'Reference instant: ' + moment.toISOString()
            });
        }
    });

    function notNow(o) { return !o.useNow; }

    /** Render a Date in a zone as "YYYY-MM-DDTHH:MM:SS" for round-tripping. */
    function renderInZone(date, zone) {
        var parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).formatToParts(date).reduce(function (acc, p) { acc[p.type] = p.value; return acc; }, {});
        return parts.year + '-' + parts.month + '-' + parts.day + 'T' +
            (parts.hour === '24' ? '00' : parts.hour) + ':' + parts.minute + ':' + parts.second;
    }

    /* ============================================================
       Countdown / duration
       ============================================================ */
    define({
        id: 'duration-calculator',
        name: 'Duration Calculator',
        category: 'datetime',
        icon: 'timer',
        description: 'Add or subtract time from a date, or convert between duration units.',
        tags: ['duration', 'add days', 'subtract', 'deadline', 'convert time'],
        input: 'none',
        options: [
            {
                id: 'mode', type: 'radio', label: 'Mode', value: 'add',
                options: [
                    { value: 'add', label: 'Add or subtract from a date' },
                    { value: 'convert', label: 'Convert a duration' }
                ]
            },
            { id: 'start-date', type: 'date', label: 'Starting date', value: '', when: modeIsAdd },
            { id: 'start-time', type: 'time', label: 'Starting time', value: '00:00', when: modeIsAdd },
            {
                id: 'operation', type: 'radio', label: 'Operation', value: 'add',
                options: [{ value: 'add', label: 'Add' }, { value: 'subtract', label: 'Subtract' }],
                when: modeIsAdd
            },
            { id: 'years', type: 'number', label: 'Years', value: 0, min: 0, max: 1000, when: modeIsAdd },
            { id: 'months', type: 'number', label: 'Months', value: 0, min: 0, max: 1200, when: modeIsAdd },
            { id: 'weeks', type: 'number', label: 'Weeks', value: 0, min: 0, max: 5000, when: modeIsAdd },
            { id: 'days', type: 'number', label: 'Days', value: 30, min: 0, max: 100000, when: modeIsAdd },
            { id: 'hours', type: 'number', label: 'Hours', value: 0, min: 0, max: 100000, when: modeIsAdd },
            { id: 'minutes', type: 'number', label: 'Minutes', value: 0, min: 0, max: 1000000, when: modeIsAdd },
            { id: 'skip-weekends', type: 'checkbox', label: 'Count working days only', value: false, when: modeIsAdd, help: 'Applies to the days field.' },

            { id: 'amount', type: 'number', label: 'Amount', value: 90, min: 0, when: modeIsConvert },
            {
                id: 'from-unit', type: 'select', label: 'From', value: 'minutes',
                options: durationUnits(), when: modeIsConvert
            }
        ],
        run: function (ctx) {
            var o = ctx.opt;

            if (o.mode === 'convert') {
                var FACTORS = {
                    milliseconds: 1, seconds: 1000, minutes: 60000, hours: 3600000,
                    days: 86400000, weeks: 604800000, months: 2629800000, years: 31557600000
                };
                var ms = o.amount * FACTORS[o.fromUnit];
                return ZT.dataResult(Object.keys(FACTORS).map(function (unit) {
                    var value = ms / FACTORS[unit];
                    return {
                        label: unit.charAt(0).toUpperCase() + unit.slice(1),
                        value: value >= 1000 ? ZT.formatNumber(Math.round(value)) : value.toFixed(value < 1 ? 4 : 2).replace(/\.?0+$/, '')
                    };
                }).concat([
                    { label: 'Human readable', value: humanDuration(ms) }
                ]), { title: o.amount + ' ' + o.fromUnit + ' is', columns: 2 });
            }

            var base = new Date((o.startDate || new Date().toISOString().slice(0, 10)) + 'T' + (o.startTime || '00:00'));
            if (isNaN(base.getTime())) ZT.fail('Pick a valid starting date.');

            var sign = o.operation === 'subtract' ? -1 : 1;
            var result = new Date(base);

            result.setFullYear(result.getFullYear() + sign * o.years);
            result.setMonth(result.getMonth() + sign * o.months);

            if (o.skipWeekends && o.days) {
                var remaining = o.days;
                while (remaining > 0) {
                    result.setDate(result.getDate() + sign);
                    var day = result.getDay();
                    if (day !== 0 && day !== 6) remaining--;
                }
                result.setDate(result.getDate() + sign * o.weeks * 7);
            } else {
                result.setDate(result.getDate() + sign * (o.days + o.weeks * 7));
            }

            result.setHours(result.getHours() + sign * o.hours);
            result.setMinutes(result.getMinutes() + sign * o.minutes);

            var diffMs = Math.abs(result - base);

            return ZT.dataResult([
                { label: 'Result', value: result.toDateString() + (o.hours || o.minutes ? ' at ' + pad(result.getHours()) + ':' + pad(result.getMinutes()) : '') },
                { label: 'Day of week', value: result.toLocaleDateString('en-GB', { weekday: 'long' }) },
                { label: 'ISO format', value: result.toISOString() },
                { label: 'Starting from', value: base.toDateString() },
                { label: 'Total shift', value: humanDuration(diffMs) },
                { label: 'Relative to today', value: describeRelative(Date.now() - result.getTime()) }
            ], { title: 'Result', columns: 2 });
        }
    });

    function modeIsAdd(o) { return o.mode === 'add'; }
    function modeIsConvert(o) { return o.mode === 'convert'; }

    function durationUnits() {
        return ['milliseconds', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years']
            .map(function (u) { return { value: u, label: u.charAt(0).toUpperCase() + u.slice(1) }; });
    }

    function humanDuration(ms) {
        var parts = [];
        var units = [
            ['year', 31557600000], ['month', 2629800000], ['day', 86400000],
            ['hour', 3600000], ['minute', 60000], ['second', 1000]
        ];
        var remaining = ms;
        units.forEach(function (unit) {
            var count = Math.floor(remaining / unit[1]);
            if (count > 0) {
                parts.push(count + ' ' + unit[0] + (count === 1 ? '' : 's'));
                remaining -= count * unit[1];
            }
        });
        return parts.slice(0, 3).join(', ') || '0 seconds';
    }

})();
