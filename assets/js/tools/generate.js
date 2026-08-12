/**
 * ZyncTools — Generators
 * QR codes, barcodes, passwords, UUIDs and placeholder data.
 */
(function () {
    'use strict';

    var ZT = window.ZT;
    var define = ZT.registry.define;

    /* Shared output options. Defined here rather than imported so this module
       stands alone — each page loads only the modules it needs. */
    var FORMAT_OPTION = {
        id: 'format', type: 'select', label: 'Output format', value: 'png',
        options: [
            { value: 'png', label: 'PNG — lossless, keeps transparency' },
            { value: 'jpeg', label: 'JPEG — smaller for photos' },
            { value: 'webp', label: 'WebP — small and modern' }
        ]
    };

    var QUALITY_OPTION = {
        id: 'quality', type: 'range', label: 'Quality', value: 92, min: 10, max: 100, step: 1, suffix: '%',
        when: function (o) { return o.format !== 'png'; }
    };


    /* ============================================================
       QR code
       ============================================================ */
    define({
        id: 'qr-code-generator',
        name: 'QR Code Generator',
        category: 'generate',
        icon: 'qr-code',
        description: 'Create QR codes for links, Wi-Fi, contacts, email and plain text.',
        tags: ['qr', 'qr code', 'barcode', 'scan', 'wifi', 'vcard'],
        input: 'none',
        popular: true,
        options: [
            {
                id: 'type', type: 'select', label: 'QR code contains', value: 'url',
                options: [
                    { value: 'url', label: 'Website link' }, { value: 'text', label: 'Plain text' },
                    { value: 'wifi', label: 'Wi-Fi network' }, { value: 'email', label: 'Email' },
                    { value: 'sms', label: 'SMS message' }, { value: 'phone', label: 'Phone number' },
                    { value: 'vcard', label: 'Contact card' }, { value: 'geo', label: 'Map location' }
                ]
            },
            { id: 'url', type: 'text', label: 'URL', value: 'https://zynctools.com', when: typeIs('url') },
            { id: 'text', type: 'textarea', label: 'Text', value: 'Hello from ZyncTools', rows: 3, when: typeIs('text') },

            { id: 'ssid', type: 'text', label: 'Network name (SSID)', value: '', when: typeIs('wifi') },
            { id: 'wifi-password', type: 'text', label: 'Wi-Fi password', value: '', when: typeIs('wifi') },
            {
                id: 'encryption', type: 'select', label: 'Security', value: 'WPA',
                options: [{ value: 'WPA', label: 'WPA / WPA2 / WPA3' }, { value: 'WEP', label: 'WEP' }, { value: 'nopass', label: 'Open network' }],
                when: typeIs('wifi')
            },
            { id: 'hidden', type: 'checkbox', label: 'Hidden network', value: false, when: typeIs('wifi') },

            { id: 'email', type: 'text', label: 'Email address', value: '', when: typeIs('email') },
            { id: 'subject', type: 'text', label: 'Subject', value: '', when: typeIs('email') },
            { id: 'body', type: 'text', label: 'Message', value: '', when: typeIs('email') },

            { id: 'phone', type: 'text', label: 'Phone number', value: '', when: function (o) { return o.type === 'sms' || o.type === 'phone'; } },
            { id: 'message', type: 'text', label: 'Message', value: '', when: typeIs('sms') },

            { id: 'first-name', type: 'text', label: 'First name', value: '', when: typeIs('vcard') },
            { id: 'last-name', type: 'text', label: 'Last name', value: '', when: typeIs('vcard') },
            { id: 'organization', type: 'text', label: 'Organisation', value: '', when: typeIs('vcard') },
            { id: 'vcard-phone', type: 'text', label: 'Phone', value: '', when: typeIs('vcard') },
            { id: 'vcard-email', type: 'text', label: 'Email', value: '', when: typeIs('vcard') },
            { id: 'website', type: 'text', label: 'Website', value: '', when: typeIs('vcard') },

            { id: 'latitude', type: 'text', label: 'Latitude', value: '', when: typeIs('geo') },
            { id: 'longitude', type: 'text', label: 'Longitude', value: '', when: typeIs('geo') },

            { id: 'size', type: 'range', label: 'Image size', value: 512, min: 128, max: 2048, step: 32, suffix: 'px' },
            { id: 'margin', type: 'range', label: 'Quiet zone', value: 2, min: 0, max: 10, step: 1, suffix: 'modules' },
            {
                id: 'error-correction', type: 'select', label: 'Error correction', value: 'M',
                options: [
                    { value: 'L', label: 'Low — 7% recoverable' }, { value: 'M', label: 'Medium — 15%' },
                    { value: 'Q', label: 'Quartile — 25%' }, { value: 'H', label: 'High — 30% (use with a logo)' }
                ]
            },
            { id: 'dark-color', type: 'color', label: 'Foreground', value: '#000000' },
            { id: 'light-color', type: 'color', label: 'Background', value: '#FFFFFF' },
            {
                id: 'format', type: 'select', label: 'Download as', value: 'png',
                options: [{ value: 'png', label: 'PNG' }, { value: 'svg', label: 'SVG (vector)' }, { value: 'jpeg', label: 'JPEG' }]
            }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var payload = buildQrPayload(o);
            if (!payload) {
                return ZT.dataResult(
                    [{ label: 'Waiting for input', value: 'Fill in the fields above and the QR code appears here.' }],
                    { title: 'QR code' }
                );
            }

            var qrcode = await ZT.libs.qrcode();

            // Type 0 lets the library pick the smallest version that fits.
            var qr = qrcode(0, o.errorCorrection);
            try {
                qr.addData(payload);
                qr.make();
            } catch (err) {
                ZT.fail('That content is too long for a QR code. Shorten it, or lower the error correction level.');
            }

            var modules = qr.getModuleCount();
            var total = modules + o.margin * 2;
            // Snap the module size to whole pixels so edges stay crisp.
            var scale = Math.max(1, Math.floor(o.size / total));
            var pixelSize = total * scale;

            var canvas = ZT.makeCanvas(pixelSize, pixelSize);
            var c2d = canvas.getContext('2d');
            c2d.fillStyle = o.lightColor;
            c2d.fillRect(0, 0, pixelSize, pixelSize);
            c2d.fillStyle = o.darkColor;

            for (var row = 0; row < modules; row++) {
                for (var col = 0; col < modules; col++) {
                    if (qr.isDark(row, col)) {
                        c2d.fillRect((col + o.margin) * scale, (row + o.margin) * scale, scale, scale);
                    }
                }
            }

            var results = [];

            if (o.format === 'svg') {
                var rects = [];
                for (row = 0; row < modules; row++) {
                    for (col = 0; col < modules; col++) {
                        if (qr.isDark(row, col)) {
                            rects.push('<rect x="' + (col + o.margin) + '" y="' + (row + o.margin) + '" width="1" height="1"/>');
                        }
                    }
                }
                var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '" ' +
                    'width="' + o.size + '" height="' + o.size + '" shape-rendering="crispEdges">' +
                    '<rect width="' + total + '" height="' + total + '" fill="' + o.lightColor + '"/>' +
                    '<g fill="' + o.darkColor + '">' + rects.join('') + '</g></svg>';

                results.push(ZT.nodeResult(ZT.el('div', { class: 'zt-qr-preview', html: svg }), { title: 'Preview' }));
                results.push(ZT.fileResult(new Blob([svg], { type: 'image/svg+xml' }), 'qr-code.svg', {
                    note: 'Scalable vector · ' + modules + '×' + modules + ' modules'
                }));
            } else {
                if (o.format === 'jpeg') canvas = ZT.flattenAlpha(canvas, o.lightColor);
                var blob = await ZT.encodeCanvas(canvas, o.format, o.format === 'png' ? undefined : 0.95);
                results.push(ZT.fileResult(blob, 'qr-code.' + (o.format === 'jpeg' ? 'jpg' : o.format), {
                    previewBlob: blob,
                    note: pixelSize + '×' + pixelSize + ' px · ' + modules + '×' + modules + ' modules · ' + ZT.formatBytes(blob.size)
                }));
            }

            results.push(ZT.textResult(payload, { title: 'Encoded content', mono: true }));
            return results;
        }
    });

    function typeIs(value) {
        return function (o) { return o.type === value; };
    }

    /** Escape the reserved characters in the Wi-Fi QR payload format. */
    function escapeWifi(value) {
        return String(value || '').replace(/([\\;,":])/g, '\\$1');
    }

    function buildQrPayload(o) {
        switch (o.type) {
            case 'url':
                if (!o.url.trim()) return '';
                return /^[a-z][a-z0-9+.-]*:/i.test(o.url.trim()) ? o.url.trim() : 'https://' + o.url.trim();
            case 'text':
                return o.text.trim();
            case 'wifi':
                if (!o.ssid.trim()) return '';
                return 'WIFI:T:' + o.encryption + ';S:' + escapeWifi(o.ssid) + ';' +
                    (o.encryption !== 'nopass' ? 'P:' + escapeWifi(o.wifiPassword) + ';' : '') +
                    (o.hidden ? 'H:true;' : '') + ';';
            case 'email':
                if (!o.email.trim()) return '';
                var query = [];
                if (o.subject) query.push('subject=' + encodeURIComponent(o.subject));
                if (o.body) query.push('body=' + encodeURIComponent(o.body));
                return 'mailto:' + o.email.trim() + (query.length ? '?' + query.join('&') : '');
            case 'sms':
                if (!o.phone.trim()) return '';
                return 'SMSTO:' + o.phone.trim() + (o.message ? ':' + o.message : '');
            case 'phone':
                return o.phone.trim() ? 'tel:' + o.phone.trim() : '';
            case 'geo':
                if (!o.latitude || !o.longitude) return '';
                return 'geo:' + o.latitude + ',' + o.longitude;
            case 'vcard':
                if (!o.firstName && !o.lastName && !o.vcardEmail) return '';
                return [
                    'BEGIN:VCARD', 'VERSION:3.0',
                    'N:' + (o.lastName || '') + ';' + (o.firstName || '') + ';;;',
                    'FN:' + [o.firstName, o.lastName].filter(Boolean).join(' '),
                    o.organization ? 'ORG:' + o.organization : '',
                    o.vcardPhone ? 'TEL;TYPE=CELL:' + o.vcardPhone : '',
                    o.vcardEmail ? 'EMAIL:' + o.vcardEmail : '',
                    o.website ? 'URL:' + o.website : '',
                    'END:VCARD'
                ].filter(Boolean).join('\n');
            default:
                return '';
        }
    }

    /* ============================================================
       Barcode
       ============================================================ */
    define({
        id: 'barcode-generator',
        name: 'Barcode Generator',
        category: 'generate',
        icon: 'barcode',
        description: 'Generate EAN, UPC, Code 128, Code 39 and other retail barcodes.',
        tags: ['barcode', 'ean', 'upc', 'code128', 'code39', 'retail', 'isbn'],
        input: 'none',
        options: [
            {
                id: 'format', type: 'select', label: 'Barcode type', value: 'CODE128',
                options: [
                    { value: 'CODE128', label: 'Code 128 — any text' },
                    { value: 'EAN13', label: 'EAN-13 — 12 or 13 digits' },
                    { value: 'EAN8', label: 'EAN-8 — 7 or 8 digits' },
                    { value: 'UPC', label: 'UPC-A — 11 or 12 digits' },
                    { value: 'CODE39', label: 'Code 39 — letters and digits' },
                    { value: 'ITF14', label: 'ITF-14 — 13 or 14 digits' },
                    { value: 'MSI', label: 'MSI — digits' },
                    { value: 'pharmacode', label: 'Pharmacode — 3 to 131070' }
                ]
            },
            { id: 'value', type: 'text', label: 'Value to encode', value: 'ZYNCTOOLS' },
            { id: 'width', type: 'range', label: 'Bar width', value: 2, min: 1, max: 6, step: 0.5, suffix: 'px' },
            { id: 'height', type: 'range', label: 'Bar height', value: 100, min: 20, max: 300, step: 5, suffix: 'px' },
            { id: 'display-value', type: 'checkbox', label: 'Print the value underneath', value: true },
            { id: 'font-size', type: 'number', label: 'Text size', suffix: 'px', value: 20, min: 8, max: 48, when: function (o) { return o.displayValue; } },
            { id: 'line-color', type: 'color', label: 'Bar colour', value: '#000000' },
            { id: 'background', type: 'color', label: 'Background', value: '#FFFFFF' },
            { id: 'margin', type: 'number', label: 'Margin', suffix: 'px', value: 10, min: 0, max: 60 },
            {
                id: 'output', type: 'select', label: 'Download as', value: 'png',
                options: [{ value: 'png', label: 'PNG' }, { value: 'svg', label: 'SVG (vector)' }]
            }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            if (!String(o.value).trim()) ZT.fail('Enter a value to encode.');

            var JsBarcode = await ZT.libs.barcode();
            var settings = {
                format: o.format,
                width: o.width,
                height: o.height,
                displayValue: o.displayValue,
                fontSize: o.fontSize,
                lineColor: o.lineColor,
                background: o.background,
                margin: o.margin,
                valid: function (isValid) {
                    if (!isValid) {
                        ZT.fail('"' + o.value + '" is not valid for ' + o.format + '. Check the length and character set described in the dropdown.');
                    }
                }
            };

            if (o.output === 'svg') {
                var svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                JsBarcode(svgNode, String(o.value), settings);
                var markup = new XMLSerializer().serializeToString(svgNode);
                return [
                    ZT.nodeResult(ZT.el('div', { class: 'zt-qr-preview', html: markup }), { title: 'Preview' }),
                    ZT.fileResult(new Blob([markup], { type: 'image/svg+xml' }), 'barcode.svg')
                ];
            }

            var canvas = document.createElement('canvas');
            JsBarcode(canvas, String(o.value), settings);
            var blob = await ZT.encodeCanvas(canvas, 'png');

            return ZT.fileResult(blob, 'barcode.png', {
                previewBlob: blob,
                note: o.format + ' · ' + canvas.width + '×' + canvas.height
            });
        }
    });

    /* ============================================================
       Password generator
       ============================================================ */
    define({
        id: 'password-generator',
        name: 'Password Generator',
        category: 'generate',
        icon: 'key',
        description: 'Generate strong random passwords or memorable passphrases.',
        tags: ['password', 'random', 'secure', 'passphrase', 'generator'],
        input: 'none',
        options: [
            {
                id: 'style', type: 'radio', label: 'Password style', value: 'random',
                options: [
                    { value: 'random', label: 'Random characters' },
                    { value: 'passphrase', label: 'Memorable passphrase' },
                    { value: 'pin', label: 'Numeric PIN' }
                ]
            },
            { id: 'length', type: 'range', label: 'Length', value: 20, min: 4, max: 128, step: 1, suffix: 'chars', when: styleIs('random') },
            { id: 'uppercase', type: 'checkbox', label: 'Uppercase  A–Z', value: true, when: styleIs('random') },
            { id: 'lowercase', type: 'checkbox', label: 'Lowercase  a–z', value: true, when: styleIs('random') },
            { id: 'numbers', type: 'checkbox', label: 'Digits  0–9', value: true, when: styleIs('random') },
            { id: 'symbols', type: 'checkbox', label: 'Symbols  !@#$…', value: true, when: styleIs('random') },
            { id: 'exclude-ambiguous', type: 'checkbox', label: 'Avoid look-alike characters (0/O, 1/l/I)', value: true, when: styleIs('random') },
            { id: 'custom-exclude', type: 'text', label: 'Also exclude these characters', value: '', when: styleIs('random') },

            { id: 'words', type: 'range', label: 'Number of words', value: 4, min: 3, max: 10, step: 1, when: styleIs('passphrase') },
            {
                id: 'word-separator', type: 'select', label: 'Separator', value: '-',
                options: [
                    { value: '-', label: 'Hyphen' }, { value: '.', label: 'Dot' }, { value: '_', label: 'Underscore' },
                    { value: ' ', label: 'Space' }, { value: '', label: 'None' }
                ],
                when: styleIs('passphrase')
            },
            { id: 'capitalise', type: 'checkbox', label: 'Capitalise each word', value: true, when: styleIs('passphrase') },
            { id: 'append-number', type: 'checkbox', label: 'Append a random number', value: true, when: styleIs('passphrase') },

            { id: 'pin-length', type: 'range', label: 'PIN length', value: 6, min: 3, max: 16, step: 1, suffix: 'digits', when: styleIs('pin') },

            { id: 'count', type: 'number', label: 'How many to generate', value: 5, min: 1, max: 100 }
        ],
        run: function (ctx) {
            var o = ctx.opt;

            /** Rejection sampling keeps every character equally likely. */
            function randomInt(max) {
                var limit = Math.floor(4294967296 / max) * max;
                var buf = new Uint32Array(1);
                do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
                return buf[0] % max;
            }

            function pick(pool) { return pool[randomInt(pool.length)]; }

            function generateRandom() {
                var AMBIGUOUS = '0O1lI|`\'"{}[]()/\\';
                var sets = [];
                if (o.uppercase) sets.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
                if (o.lowercase) sets.push('abcdefghijklmnopqrstuvwxyz');
                if (o.numbers) sets.push('0123456789');
                if (o.symbols) sets.push('!@#$%^&*-_=+?.,;:');

                if (!sets.length) ZT.fail('Enable at least one character type.');

                var excluded = String(o.customExclude || '');
                sets = sets.map(function (set) {
                    return set.split('').filter(function (c) {
                        if (o.excludeAmbiguous && AMBIGUOUS.indexOf(c) !== -1) return false;
                        return excluded.indexOf(c) === -1;
                    }).join('');
                }).filter(function (s) { return s.length; });

                if (!sets.length) ZT.fail('Every character was excluded. Relax the exclusion settings.');

                var all = sets.join('');
                var chars = [];
                // Seed with one character per enabled set so all types really appear.
                sets.forEach(function (set) { if (chars.length < o.length) chars.push(pick(set)); });
                while (chars.length < o.length) chars.push(pick(all));

                // Fisher-Yates so the seeded characters are not stuck at the front.
                for (var i = chars.length - 1; i > 0; i--) {
                    var j = randomInt(i + 1);
                    var tmp = chars[i]; chars[i] = chars[j]; chars[j] = tmp;
                }
                return chars.join('');
            }

            function generatePassphrase() {
                var picked = [];
                for (var i = 0; i < o.words; i++) {
                    var word = pick(WORD_LIST);
                    picked.push(o.capitalise ? word.charAt(0).toUpperCase() + word.slice(1) : word);
                }
                var out = picked.join(o.wordSeparator);
                if (o.appendNumber) out += (o.wordSeparator || '') + randomInt(9000 + 1000);
                return out;
            }

            function generatePin() {
                var digits = '';
                for (var i = 0; i < o.pinLength; i++) digits += randomInt(10);
                return digits;
            }

            var results = [];
            for (var i = 0; i < o.count; i++) {
                results.push(o.style === 'passphrase' ? generatePassphrase()
                    : o.style === 'pin' ? generatePin() : generateRandom());
            }

            // Entropy of the first result, as a rough quality signal.
            var sample = results[0];
            var poolSize = 0;
            if (/[a-z]/.test(sample)) poolSize += 26;
            if (/[A-Z]/.test(sample)) poolSize += 26;
            if (/[0-9]/.test(sample)) poolSize += 10;
            if (/[^a-zA-Z0-9]/.test(sample)) poolSize += 20;
            var entropy = o.style === 'passphrase'
                ? Math.round(o.words * Math.log2(WORD_LIST.length) + (o.appendNumber ? 13 : 0))
                : Math.round(sample.length * Math.log2(poolSize || 1));

            return [
                ZT.textResult(results.join('\n'), {
                    mono: true,
                    note: 'Roughly ' + entropy + ' bits of entropy each. Generated with crypto.getRandomValues — never transmitted.'
                })
            ];
        }
    });

    function styleIs(value) {
        return function (o) { return o.style === value; };
    }

    var WORD_LIST = ('able acid aged also apex arch arid army atom aunt aura auto away axis bake bald ball band bank bare bark barn base ' +
        'bath bead beam bean bear beat beef bell belt bend bent best bike bill bind bird bite blue boat body bold bolt bond bone book ' +
        'boot bore born boss both bowl brew brick bring broad broom brush buck bulk bull bunk burn bush busy cabin cable cage cake calm ' +
        'camp cane cape card care cart case cash cast cave cell chain chair chalk charm chase cheap check chess chief chill chip city ' +
        'civil claim clan clay clean clear clerk cliff climb clock cloth cloud club coal coast coat code coin cold comb cone cook cool ' +
        'copy coral cord core corn cost couch cough count court cover crab craft crane crash crate crawl cream crew crib crop cross crowd ' +
        'crown crush cube curl curve cycle daily dairy dance dark dash data dawn deal dear debt deck deep deer dense desk dial diet dig ' +
        'dine dirt dish dive dock does dome done door dose dove down draft drag drain drama draw dream dress drift drill drink drive drop ' +
        'drum dual duck dust duty each eagle early earth ease east easy edge eight elbow elder elect elite else email ember empty ends ' +
        'enemy enjoy enter entry equal error essay event every exact exam exit extra fable face fact fade fair faith fall false fame farm ' +
        'fast fate favor feast fence fever field fifth fight file fill film final find fine fire firm fish fist five flag flame flash flat ' +
        'fleet flesh float flock flood floor flour flow fluid flush focus fog fold folk font food foot force fork form fort forum found ' +
        'four frame fresh frog front frost fruit fuel full fund fungi funny gain game gap garden gate gear gene gift given glad glass ' +
        'globe glory glove glow goal goat gold golf good grab grace grade grain grand grant grape grass grave gray great green grid grim ' +
        'grin grip group grove grow guard guess guest guide gulf hack hail hair half hall halt hand hang harbor hard harm hat haul have ' +
        'hawk head heal heap heart heat heavy hedge heel help herb herd here hero hide high hill hint hire hive hold hole holy home ' +
        'honey hood hook hope horn horse host hotel hour house hover huge human humor hunt hurry hurt ice icon idea ideal image inch ' +
        'index inner input iron irony issue item ivory jacket jazz jeans jelly jewel join joke judge juice jump juror keen keep kept key ' +
        'kick kind king kiss kite knee knife knock know label labor lace lack lake lamp land lane large laser last late laugh laundry law ' +
        'layer lead leaf lean leap learn lease least leave ledge left legal lemon lend lens level lever light like limb lime limit line ' +
        'link lion list live load loaf loan lobby local lock lodge log logic lone long look loop loose lord lose loss lost lot loud love ' +
        'lower loyal luck lunar lunch lung lure lush luxury lyric magic magnet maid mail main major maker male mall manor maple marble ' +
        'march mark marsh mask mass match math maze meal mean meat medal media melon melt memory mend menu mercy merge merit merry mesh ' +
        'metal meter method mid might mild mile milk mill mind mine mint minor mint mirror miss mist mix moat model moist mold mole ' +
        'money month moon moral more morning most motor mount mouse mouth move much mud music must myth nail name nasty nation native ' +
        'nature naval near neat neck need needle nerve nest net never new next nice night noble node noise none noon norm north nose ' +
        'note novel now nurse oak oasis oat ocean odd offer often oil okay old olive omit once onion only open opera orbit orchard order ' +
        'organ other otter ounce outer oval oven over owl own oxygen ozone pace pack page paint pair palm panel panic paper park part ' +
        'party pass past patch path patio pause pave peace peach peak pearl pedal peer pen penny people pepper perch perfect period pet ' +
        'phase phone photo piano pick piece pier pile pilot pinch pine pink pipe pitch pixel pizza place plain plan plate play plaza ' +
        'pleat plot plug plum plus poem poet point polar pole polish pond pony pool poor porch port pose post pot pouch pound power ' +
        'praise pray press price pride prime print prior prize probe prompt proof proud prove pull pulse pump punch pupil pure purple ' +
        'purse push quart queen quest queue quick quiet quilt quit quote race radar radio rail rain raise rally ranch range rank rapid ' +
        'rare rate ratio raven reach read ready realm reason rebel recall recipe record reef refer reform region regret reign relax relay ' +
        'relief rely remain remedy remind remove renew rent repair repeat reply report rescue reside resist resort rest result retail ' +
        'retire return reveal review reward rhythm rib rice rich ride ridge rifle right rigid ring rinse ripe rise risk rival river road ' +
        'roast robe robin robot rock rocket rod role roll roof room root rope rose rough round route royal rug rule run rural rush rust ' +
        'sail saint salad salmon salon salt same sand satin sauce save scale scan scarf scene scent scheme school science scope score ' +
        'scout scrap screen script scrub sea seal search season seat second secret sector secure seed seek seem seize select sell send ' +
        'sense sepia serve setup seven shade shaft shake shall shape share shark sharp shed sheep sheet shelf shell shield shift shine ' +
        'ship shirt shock shoe shoot shop shore short shot should shout show shrimp shrug side siege sigh sight sign silent silk silver ' +
        'simple since sing sink sir sister site six size skate sketch ski skill skin skirt sky slab slam sleep slice slide slim slope ' +
        'slot slow small smart smile smoke smooth snack snake snap sneak snow soap soar social sock soda sofa soft soil solar sold solid ' +
        'solve some song soon sort soul sound soup source south space spare spark speak spear speed spell spend sphere spice spin spirit ' +
        'split spoke sport spot spray spread spring sprint spy square squeeze stable stack staff stage stair stake stamp stand star ' +
        'start state stay steady steam steel steep stem step stick stiff still sting stir stock stone stool stop store storm story stove ' +
        'strap straw stream street stress strike string strip strong study stuff style subject sugar suit summer sun super supply sure ' +
        'surf surge survey swamp swan swap swarm sweet swift swim swing switch sword symbol table tackle tag tail take tale talk tall ' +
        'tank tape target task taste taught tax teach team tear tech teeth tell temple tenant tender tennis tent term test text than ' +
        'thank theme theory there thick thin thing think third thorn those thread three thrive throw thumb thunder ticket tidal tide ' +
        'tidy tiger tight tile till time tiny tip tire title toast today toe token toll tomato tone tongue tool tooth top topic torch ' +
        'total touch tough tour tower town trace track trade trail train trap trash travel tray treat tree trend trial tribe trick trip ' +
        'troop trophy truck true trunk trust truth try tube tuck tune tunnel turn turtle twice twin twist type ultra uncle under unify ' +
        'union unique unit unity unlock until upon upper upset urban urge usage useful usual valid valley value valve van vapor vast ' +
        'vault vector vehicle velvet vendor venue verb verify verse very vessel veteran video view villa vine vinyl violet viral virtue ' +
        'visa visible vision visit vital vivid vocal voice void volume vote voyage wage wagon waist wait wake walk wall walnut want ward ' +
        'warm warn wash waste watch water wave wax weak wealth weapon wear weave wedge week weigh weird well west whale wheat wheel when ' +
        'where which while whip whisper white whole wide widow width wild will win wind window wine wing wink winter wire wise wish wit ' +
        'witch with wolf woman wonder wood wool word work world worm worry worth wound wrap wrist write wrong yard year yeast yellow ' +
        'yield yoga young youth zebra zero zinc zone zoom').split(' ');

    /* ============================================================
       UUID
       ============================================================ */
    define({
        id: 'uuid-generator',
        name: 'UUID Generator',
        category: 'generate',
        icon: 'fingerprint',
        description: 'Generate cryptographically random UUIDs, ULIDs and nano IDs in bulk.',
        tags: ['uuid', 'guid', 'id', 'random', 'ulid', 'nanoid', 'identifier'],
        input: 'none',
        options: [
            {
                id: 'version', type: 'select', label: 'Identifier type', value: 'v4',
                options: [
                    { value: 'v4', label: 'UUID v4 — random' },
                    { value: 'v7', label: 'UUID v7 — time-ordered' },
                    { value: 'nil', label: 'Nil UUID — all zeros' },
                    { value: 'ulid', label: 'ULID — sortable, 26 chars' },
                    { value: 'nanoid', label: 'Nano ID — short and URL-safe' }
                ]
            },
            { id: 'count', type: 'number', label: 'How many', value: 10, min: 1, max: 1000 },
            { id: 'nanoid-length', type: 'range', label: 'Nano ID length', value: 21, min: 6, max: 64, step: 1, when: function (o) { return o.version === 'nanoid'; } },
            { id: 'uppercase', type: 'checkbox', label: 'Uppercase', value: false },
            { id: 'braces', type: 'checkbox', label: 'Wrap in braces  {…}', value: false, when: function (o) { return /^(v4|v7|nil)$/.test(o.version); } },
            { id: 'no-hyphens', type: 'checkbox', label: 'Remove hyphens', value: false, when: function (o) { return /^(v4|v7|nil)$/.test(o.version); } },
            {
                id: 'format', type: 'select', label: 'Output format', value: 'lines',
                options: [
                    { value: 'lines', label: 'One per line' }, { value: 'csv', label: 'Comma-separated' },
                    { value: 'json', label: 'JSON array' }, { value: 'sql', label: 'SQL insert values' }
                ]
            }
        ],
        run: function (ctx) {
            var o = ctx.opt;

            function uuidV4() {
                if (crypto.randomUUID) return crypto.randomUUID();
                var bytes = crypto.getRandomValues(new Uint8Array(16));
                bytes[6] = (bytes[6] & 0x0f) | 0x40;
                bytes[8] = (bytes[8] & 0x3f) | 0x80;
                var hex = ZT.bytesToHex(bytes.buffer);
                return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
            }

            function uuidV7() {
                // 48-bit millisecond timestamp, then random bits with the v7 markers.
                var bytes = crypto.getRandomValues(new Uint8Array(16));
                var ms = Date.now();
                bytes[0] = (ms / 1099511627776) & 0xff;
                bytes[1] = (ms / 4294967296) & 0xff;
                bytes[2] = (ms / 16777216) & 0xff;
                bytes[3] = (ms / 65536) & 0xff;
                bytes[4] = (ms / 256) & 0xff;
                bytes[5] = ms & 0xff;
                bytes[6] = (bytes[6] & 0x0f) | 0x70;
                bytes[8] = (bytes[8] & 0x3f) | 0x80;
                var hex = ZT.bytesToHex(bytes.buffer);
                return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
            }

            function ulid() {
                var ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
                var time = Date.now();
                var timeChars = '';
                for (var i = 0; i < 10; i++) {
                    timeChars = ALPHABET[time % 32] + timeChars;
                    time = Math.floor(time / 32);
                }
                var random = crypto.getRandomValues(new Uint8Array(16));
                var randomChars = '';
                for (i = 0; i < 16; i++) randomChars += ALPHABET[random[i] % 32];
                return timeChars + randomChars;
            }

            function nanoid(length) {
                var ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
                var bytes = crypto.getRandomValues(new Uint8Array(length));
                var out = '';
                for (var i = 0; i < length; i++) out += ALPHABET[bytes[i] & 63];
                return out;
            }

            var ids = [];
            for (var i = 0; i < o.count; i++) {
                var id;
                switch (o.version) {
                    case 'v7': id = uuidV7(); break;
                    case 'nil': id = '00000000-0000-0000-0000-000000000000'; break;
                    case 'ulid': id = ulid(); break;
                    case 'nanoid': id = nanoid(o.nanoidLength); break;
                    default: id = uuidV4();
                }
                if (o.noHyphens && /^(v4|v7|nil)$/.test(o.version)) id = id.replace(/-/g, '');
                if (o.uppercase) id = id.toUpperCase();
                else if (o.version !== 'ulid' && o.version !== 'nanoid') id = id.toLowerCase();
                if (o.braces && /^(v4|v7|nil)$/.test(o.version)) id = '{' + id + '}';
                ids.push(id);
            }

            var out;
            switch (o.format) {
                case 'csv': out = ids.join(', '); break;
                case 'json': out = JSON.stringify(ids, null, 2); break;
                case 'sql': out = ids.map(function (id) { return "('" + id.replace(/'/g, "''") + "'),"; }).join('\n').replace(/,$/, ';'); break;
                default: out = ids.join('\n');
            }

            return ZT.textResult(out, {
                mono: true,
                lang: o.format === 'json' ? 'json' : o.format === 'sql' ? 'sql' : 'text',
                note: ids.length + ' identifiers generated locally'
            });
        }
    });

    /* ============================================================
       Fake data
       ============================================================ */
    define({
        id: 'fake-data-generator',
        name: 'Test Data Generator',
        category: 'generate',
        icon: 'database',
        description: 'Generate realistic fake records for testing, as JSON, CSV or SQL.',
        tags: ['fake', 'test data', 'mock', 'dummy', 'seed', 'faker'],
        input: 'none',
        options: [
            { id: 'count', type: 'number', label: 'Number of records', value: 25, min: 1, max: 5000 },
            { id: 'field-name', type: 'checkbox', label: 'Full name', value: true },
            { id: 'field-email', type: 'checkbox', label: 'Email address', value: true },
            { id: 'field-phone', type: 'checkbox', label: 'Phone number', value: false },
            { id: 'field-address', type: 'checkbox', label: 'Street address', value: false },
            { id: 'field-city', type: 'checkbox', label: 'City and country', value: false },
            { id: 'field-company', type: 'checkbox', label: 'Company', value: false },
            { id: 'field-job', type: 'checkbox', label: 'Job title', value: false },
            { id: 'field-date', type: 'checkbox', label: 'Date joined', value: false },
            { id: 'field-uuid', type: 'checkbox', label: 'UUID', value: true },
            { id: 'field-number', type: 'checkbox', label: 'Random number', value: false },
            { id: 'field-boolean', type: 'checkbox', label: 'Boolean flag', value: false },
            {
                id: 'format', type: 'select', label: 'Output format', value: 'json',
                options: [
                    { value: 'json', label: 'JSON' }, { value: 'csv', label: 'CSV' },
                    { value: 'sql', label: 'SQL INSERT' }, { value: 'ndjson', label: 'NDJSON (one object per line)' }
                ]
            },
            { id: 'table-name', type: 'text', label: 'Table name', value: 'users', when: function (o) { return o.format === 'sql'; } }
        ],
        run: function (ctx) {
            var o = ctx.opt;

            var FIRST = 'Ada Grace Alan Linus Barbara Katherine Margaret Tim Guido Ken Dennis Bjarne Anita Radia Shafi Hedy Sophie Elena Marcus Priya Chen Omar Yuki Ingrid Diego Fatima Lars Nadia Tomas Aisha'.split(' ');
            var LAST = 'Lovelace Hopper Turing Torvalds Liskov Johnson Hamilton Berners-Lee Rossum Thompson Ritchie Stroustrup Borg Perlman Goldwasser Lamarr Wilson Petrova Aurelius Sharma Wei Hassan Tanaka Larsson Morales Rahman Nilsson Ahmed Novak Bello'.split(' ');
            var CITY = 'London Berlin Toronto Sydney Austin Lisbon Nairobi Mumbai Singapore Oslo Dublin Seattle Barcelona Warsaw Cape-Town Montreal Auckland Helsinki Bogota Seoul'.split(' ');
            var COUNTRY = 'UK Germany Canada Australia USA Portugal Kenya India Singapore Norway Ireland USA Spain Poland South-Africa Canada New-Zealand Finland Colombia South-Korea'.split(' ');
            var COMPANY = 'Northwind Acme Globex Initech Umbrella Stark Wayne Cyberdyne Hooli Vandelay Soylent Tyrell Aperture Wonka Gringotts'.split(' ');
            var JOB = ['Software Engineer', 'Product Manager', 'Designer', 'Data Analyst', 'DevOps Engineer', 'QA Engineer', 'Technical Writer', 'Sales Lead', 'Support Specialist', 'Researcher'];
            var STREET = ['Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Birch', 'Willow', 'Ash', 'Chestnut', 'Juniper'];

            function randomInt(max) { return Math.floor(Math.random() * max); }
            function pick(arr) { return arr[randomInt(arr.length)]; }

            var fields = [];
            if (o.fieldUuid) fields.push('id');
            if (o.fieldName) fields.push('name');
            if (o.fieldEmail) fields.push('email');
            if (o.fieldPhone) fields.push('phone');
            if (o.fieldAddress) fields.push('address');
            if (o.fieldCity) { fields.push('city'); fields.push('country'); }
            if (o.fieldCompany) fields.push('company');
            if (o.fieldJob) fields.push('job_title');
            if (o.fieldDate) fields.push('joined_at');
            if (o.fieldNumber) fields.push('score');
            if (o.fieldBoolean) fields.push('active');

            if (!fields.length) ZT.fail('Select at least one field to generate.');

            var records = [];
            for (var i = 0; i < o.count; i++) {
                var first = pick(FIRST), last = pick(LAST);
                var cityIndex = randomInt(CITY.length);
                var record = {};

                fields.forEach(function (field) {
                    switch (field) {
                        case 'id': record.id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + i; break;
                        case 'name': record.name = first + ' ' + last; break;
                        case 'email': record.email = (first + '.' + last).toLowerCase().replace(/[^a-z.]/g, '') + '@example.com'; break;
                        case 'phone': record.phone = '+1-' + (200 + randomInt(700)) + '-' + (100 + randomInt(900)) + '-' + String(randomInt(10000)).padStart(4, '0'); break;
                        case 'address': record.address = (1 + randomInt(9999)) + ' ' + pick(STREET) + ' Street'; break;
                        case 'city': record.city = CITY[cityIndex].replace(/-/g, ' '); break;
                        case 'country': record.country = COUNTRY[cityIndex].replace(/-/g, ' '); break;
                        case 'company': record.company = pick(COMPANY) + ' ' + pick(['Ltd', 'Inc', 'Group', 'Labs', 'Systems']); break;
                        case 'job_title': record.job_title = pick(JOB); break;
                        case 'joined_at': record.joined_at = new Date(Date.now() - randomInt(1500) * 86400000).toISOString().slice(0, 10); break;
                        case 'score': record.score = randomInt(1000); break;
                        case 'active': record.active = Math.random() > 0.3; break;
                    }
                });
                records.push(record);
            }

            var out;
            if (o.format === 'csv') {
                out = fields.join(',') + '\n' + records.map(function (r) {
                    return fields.map(function (f) {
                        var v = String(r[f]);
                        return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
                    }).join(',');
                }).join('\n');
            } else if (o.format === 'sql') {
                var table = o.tableName.replace(/[^a-zA-Z0-9_]/g, '') || 'users';
                out = records.map(function (r) {
                    var values = fields.map(function (f) {
                        var v = r[f];
                        if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
                        if (typeof v === 'number') return String(v);
                        return "'" + String(v).replace(/'/g, "''") + "'";
                    }).join(', ');
                    return 'INSERT INTO ' + table + ' (' + fields.join(', ') + ') VALUES (' + values + ');';
                }).join('\n');
            } else if (o.format === 'ndjson') {
                out = records.map(function (r) { return JSON.stringify(r); }).join('\n');
            } else {
                out = JSON.stringify(records, null, 2);
            }

            return [
                ZT.textResult(out, {
                    lang: o.format === 'sql' ? 'sql' : o.format === 'csv' ? 'csv' : 'json',
                    note: records.length + ' records · ' + fields.length + ' fields'
                }),
                ZT.fileResult(
                    new Blob([out], { type: 'text/plain;charset=utf-8' }),
                    'test-data.' + (o.format === 'ndjson' ? 'ndjson' : o.format)
                )
            ];
        }
    });


    /* ============================================================
       Avatar / identicon
       ============================================================ */
    define({
        id: 'avatar-generator',
        name: 'Avatar & Identicon Generator',
        category: 'generate',
        icon: 'smile',
        description: 'Generate a unique deterministic avatar from any name or email.',
        tags: ['avatar', 'identicon', 'gravatar', 'profile picture', 'placeholder', 'initials'],
        input: 'none',
        options: [
            { id: 'seed', type: 'text', label: 'Name or email', value: 'ada@example.com', help: 'The same text always produces the same avatar.' },
            {
                id: 'style', type: 'select', label: 'Style', value: 'identicon',
                options: [
                    { value: 'identicon', label: 'Identicon — symmetric blocks' },
                    { value: 'initials', label: 'Initials on a colour' },
                    { value: 'rings', label: 'Concentric rings' },
                    { value: 'bauhaus', label: 'Bauhaus shapes' }
                ]
            },
            { id: 'size', type: 'range', label: 'Size', value: 256, min: 64, max: 1024, step: 32, suffix: 'px' },
            { id: 'grid', type: 'range', label: 'Grid density', value: 5, min: 3, max: 9, step: 2, suffix: '×', when: function (o) { return o.style === 'identicon'; } },
            { id: 'rounded', type: 'checkbox', label: 'Round the corners', value: true },
            { id: 'circle', type: 'checkbox', label: 'Crop to a circle', value: false },
            { id: 'count', type: 'number', label: 'Generate variations', value: 1, min: 1, max: 24, help: 'More than one appends a number to the seed, so you get a related set.' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            if (!String(o.seed).trim()) ZT.fail('Enter a name or email to generate from.');

            var results = [];
            for (var n = 0; n < o.count; n++) {
                var seed = o.count > 1 ? o.seed + '-' + (n + 1) : o.seed;
                var canvas = drawAvatar(seed, o);
                var blob = await ZT.encodeCanvas(canvas, 'png');
                results.push(ZT.fileResult(blob, 'avatar-' + ZT.slugify(seed).slice(0, 40) + '.png', {
                    previewBlob: blob,
                    note: o.size + '×' + o.size + '  ·  seed "' + seed + '"'
                }));
            }
            return results;
        }
    });

    /** A small deterministic hash — same input, same avatar, every time. */
    function seedHash(text) {
        var h = 2166136261;
        for (var i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function drawAvatar(seed, o) {
        var hash = seedHash(seed);
        var size = o.size;
        var canvas = ZT.makeCanvas(size, size);
        var c2d = canvas.getContext('2d');

        // Derive a pleasant colour pair from the hash rather than picking randomly.
        var hue = hash % 360;
        var primary = ZT.color.hslToRgb(hue, 62, 52);
        var secondary = ZT.color.hslToRgb((hue + 40) % 360, 58, 62);
        var primaryHex = ZT.color.toHex(primary[0], primary[1], primary[2]);
        var secondaryHex = ZT.color.toHex(secondary[0], secondary[1], secondary[2]);
        var backdrop = ZT.color.hslToRgb(hue, 30, 94);

        c2d.fillStyle = ZT.color.toHex(backdrop[0], backdrop[1], backdrop[2]);
        c2d.fillRect(0, 0, size, size);

        if (o.style === 'initials') {
            var grad = c2d.createLinearGradient(0, 0, size, size);
            grad.addColorStop(0, primaryHex);
            grad.addColorStop(1, secondaryHex);
            c2d.fillStyle = grad;
            c2d.fillRect(0, 0, size, size);

            var words = String(seed).replace(/@.*$/, '').split(/[\s._-]+/).filter(Boolean);
            var initials = (words.length > 1
                ? words[0][0] + words[1][0]
                : (words[0] || '?').slice(0, 2)).toUpperCase();

            c2d.fillStyle = '#ffffff';
            c2d.font = 'bold ' + Math.round(size * 0.4) + 'px system-ui, sans-serif';
            c2d.textAlign = 'center';
            c2d.textBaseline = 'middle';
            c2d.fillText(initials, size / 2, size / 2 + size * 0.02);
        } else if (o.style === 'rings') {
            var rings = 4 + (hash % 4);
            for (var r = rings; r > 0; r--) {
                c2d.fillStyle = r % 2 === 0 ? primaryHex : secondaryHex;
                c2d.beginPath();
                c2d.arc(size / 2, size / 2, size / 2 * (r / rings), 0, Math.PI * 2);
                c2d.fill();
            }
        } else if (o.style === 'bauhaus') {
            var shapes = 4;
            for (var s = 0; s < shapes; s++) {
                var bits = (hash >> (s * 5)) & 31;
                c2d.fillStyle = s % 2 === 0 ? primaryHex : secondaryHex;
                var cell = size / 2;
                var cx = (s % 2) * cell;
                var cy = Math.floor(s / 2) * cell;

                if (bits % 3 === 0) {
                    c2d.fillRect(cx, cy, cell, cell);
                } else if (bits % 3 === 1) {
                    c2d.beginPath();
                    c2d.arc(cx + cell / 2, cy + cell / 2, cell / 2, 0, Math.PI * 2);
                    c2d.fill();
                } else {
                    c2d.beginPath();
                    c2d.moveTo(cx, cy + cell);
                    c2d.lineTo(cx + cell, cy + cell);
                    c2d.lineTo(cx + (bits % 2 ? 0 : cell), cy);
                    c2d.closePath();
                    c2d.fill();
                }
            }
        } else {
            // Identicon: fill the left half from hash bits and mirror it.
            var grid = o.grid;
            var cellSize = size / grid;
            var half = Math.ceil(grid / 2);

            for (var x = 0; x < half; x++) {
                for (var y = 0; y < grid; y++) {
                    var bit = (hash >> ((x * grid + y) % 31)) & 1;
                    if (!bit) continue;
                    c2d.fillStyle = (x + y) % 3 === 0 ? secondaryHex : primaryHex;
                    c2d.fillRect(x * cellSize, y * cellSize, Math.ceil(cellSize), Math.ceil(cellSize));
                    c2d.fillRect((grid - 1 - x) * cellSize, y * cellSize, Math.ceil(cellSize), Math.ceil(cellSize));
                }
            }
        }

        if (o.circle || o.rounded) {
            var masked = ZT.makeCanvas(size, size);
            var mctx = masked.getContext('2d');
            mctx.save();
            if (o.circle) {
                mctx.beginPath();
                mctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                mctx.clip();
            } else {
                ZT.roundedRect(mctx, 0, 0, size, size, size * 0.18);
                mctx.clip();
            }
            mctx.drawImage(canvas, 0, 0);
            mctx.restore();
            return masked;
        }

        return canvas;
    }

    /* ============================================================
       Open Graph image
       ============================================================ */
    define({
        id: 'og-image-generator',
        name: 'Social Share Image Generator',
        category: 'generate',
        icon: 'image-plus',
        description: 'Create a 1200×630 Open Graph card for links shared on social media.',
        tags: ['og image', 'open graph', 'social', 'twitter card', 'share', 'thumbnail', 'banner'],
        input: 'none',
        options: [
            { id: 'title', type: 'text', label: 'Headline', value: 'How to ship faster' },
            { id: 'subtitle', type: 'textarea', label: 'Supporting line', value: 'A practical guide for small teams', rows: 2 },
            { id: 'badge', type: 'text', label: 'Small label', value: '', placeholder: 'e.g. GUIDE, or your site name' },
            {
                id: 'theme', type: 'select', label: 'Theme', value: 'dark',
                options: [
                    { value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' },
                    { value: 'gradient', label: 'Gradient' }, { value: 'custom', label: 'Custom colours' }
                ]
            },
            { id: 'bg-color', type: 'color', label: 'Background', value: '#0B0D11', when: function (o) { return o.theme === 'custom'; } },
            { id: 'text-color', type: 'color', label: 'Text', value: '#FFFFFF', when: function (o) { return o.theme === 'custom'; } },
            { id: 'accent', type: 'color', label: 'Accent', value: '#4F8DF7' },
            {
                id: 'align', type: 'select', label: 'Alignment', value: 'left',
                options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' }]
            },
            { id: 'logo', type: 'file', label: 'Logo (optional)', accept: 'image/*' },
            {
                id: 'size', type: 'select', label: 'Dimensions', value: '1200x630',
                options: [
                    { value: '1200x630', label: '1200×630 — Open Graph / Twitter' },
                    { value: '1200x628', label: '1200×628 — LinkedIn' },
                    { value: '1080x1080', label: '1080×1080 — Instagram square' },
                    { value: '1920x1080', label: '1920×1080 — presentation' }
                ]
            },
            Object.assign({}, FORMAT_OPTION, { value: 'png' }), QUALITY_OPTION
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var dims = o.size.split('x').map(Number);
            var W = dims[0], H = dims[1];

            var canvas = ZT.makeCanvas(W, H);
            var c2d = canvas.getContext('2d');

            var background, textColour, mutedColour;
            if (o.theme === 'light') {
                background = '#FFFFFF'; textColour = '#0B0D11'; mutedColour = '#5A6478';
            } else if (o.theme === 'custom') {
                background = o.bgColor; textColour = o.textColor;
                var rgbT = ZT.color.parse(o.textColor) || [255, 255, 255];
                mutedColour = 'rgba(' + rgbT[0] + ',' + rgbT[1] + ',' + rgbT[2] + ',0.62)';
            } else {
                background = '#0B0D11'; textColour = '#FFFFFF'; mutedColour = '#A3ACBD';
            }

            c2d.fillStyle = background;
            c2d.fillRect(0, 0, W, H);

            if (o.theme === 'gradient') {
                var grad = c2d.createLinearGradient(0, 0, W, H);
                grad.addColorStop(0, o.accent);
                var second = ZT.color.parse(o.accent) || [79, 141, 247];
                var shifted = ZT.color.rgbToHsl(second[0], second[1], second[2]);
                var pair = ZT.color.hslToRgb((shifted[0] + 55) % 360, shifted[1], shifted[2]);
                grad.addColorStop(1, ZT.color.toHex(pair[0], pair[1], pair[2]));
                c2d.fillStyle = grad;
                c2d.fillRect(0, 0, W, H);
                textColour = '#FFFFFF';
                mutedColour = 'rgba(255,255,255,0.78)';
            } else {
                // A soft glow keeps a flat card from looking empty.
                var glow = c2d.createRadialGradient(W * 0.85, -H * 0.25, 0, W * 0.85, -H * 0.25, W * 0.75);
                var accentRgb = ZT.color.parse(o.accent) || [79, 141, 247];
                glow.addColorStop(0, 'rgba(' + accentRgb.slice(0, 3).join(',') + ',0.30)');
                glow.addColorStop(1, 'rgba(' + accentRgb.slice(0, 3).join(',') + ',0)');
                c2d.fillStyle = glow;
                c2d.fillRect(0, 0, W, H);
            }

            var margin = Math.round(W * 0.075);
            var centred = o.align === 'center';
            c2d.textAlign = centred ? 'center' : 'left';
            var anchorX = centred ? W / 2 : margin;
            var cursorY = margin;

            if (o.logo) {
                var logo = await ZT.loadImage(o.logo);
                var logoSize = ZT.imageSize(logo);
                var logoH = Math.round(H * 0.075);
                var logoW = Math.round(logoSize.width * (logoH / logoSize.height));
                c2d.drawImage(logo, centred ? (W - logoW) / 2 : margin, cursorY, logoW, logoH);
                cursorY += logoH + Math.round(H * 0.04);
            }

            if (String(o.badge).trim()) {
                var badgeSize = Math.round(H * 0.038);
                c2d.font = '600 ' + badgeSize + 'px system-ui, sans-serif';
                c2d.fillStyle = o.accent;
                c2d.fillText(o.badge.toUpperCase(), anchorX, cursorY + badgeSize);
                cursorY += badgeSize + Math.round(H * 0.035);
            }

            // Fit the headline to the card by shrinking until it wraps into 3 lines.
            var titleSize = Math.round(H * 0.115);
            var maxWidth = W - margin * 2;
            var lines;
            do {
                c2d.font = '800 ' + titleSize + 'px system-ui, sans-serif';
                lines = wrapCanvasText(c2d, o.title || '', maxWidth);
                if (lines.length <= 3) break;
                titleSize -= 4;
            } while (titleSize > H * 0.05);

            c2d.fillStyle = textColour;
            var titleLineHeight = titleSize * 1.12;
            var blockHeight = lines.length * titleLineHeight;
            var startY = Math.max(cursorY, (H - blockHeight) / 2 - (o.subtitle ? H * 0.05 : 0));

            lines.forEach(function (line, i) {
                c2d.fillText(line, anchorX, startY + i * titleLineHeight + titleSize * 0.85);
            });

            if (String(o.subtitle).trim()) {
                var subSize = Math.round(H * 0.045);
                c2d.font = '400 ' + subSize + 'px system-ui, sans-serif';
                c2d.fillStyle = mutedColour;
                var subLines = wrapCanvasText(c2d, o.subtitle, maxWidth).slice(0, 2);
                subLines.forEach(function (line, i) {
                    c2d.fillText(line, anchorX, startY + blockHeight + subSize * 1.4 + i * subSize * 1.35);
                });
            }

            // Accent rule along the bottom edge ties the card together.
            c2d.fillStyle = o.accent;
            c2d.fillRect(0, H - Math.round(H * 0.014), W, Math.round(H * 0.014));

            if (o.format === 'jpeg') canvas = ZT.flattenAlpha(canvas, background);
            var blob = await ZT.encodeCanvas(canvas, o.format, o.format === 'png' ? undefined : o.quality / 100);

            return [
                ZT.fileResult(blob, 'social-card.' + (o.format === 'jpeg' ? 'jpg' : o.format), {
                    previewBlob: blob, note: W + '×' + H + '  ·  ' + ZT.formatBytes(blob.size)
                }),
                ZT.textResult(
                    '<meta property="og:image" content="https://your-site.com/social-card.png">\n' +
                    '<meta property="og:image:width" content="' + W + '">\n' +
                    '<meta property="og:image:height" content="' + H + '">\n' +
                    '<meta name="twitter:card" content="summary_large_image">\n' +
                    '<meta name="twitter:image" content="https://your-site.com/social-card.png">',
                    { lang: 'html', title: 'Meta tags to go with it' }
                )
            ];
        }
    });

    /** Greedy word wrap against the canvas context's current font. */
    function wrapCanvasText(c2d, text, maxWidth) {
        var words = String(text).split(/\s+/).filter(Boolean);
        if (!words.length) return [''];

        var lines = [];
        var current = words[0];
        for (var i = 1; i < words.length; i++) {
            var candidate = current + ' ' + words[i];
            if (c2d.measureText(candidate).width <= maxWidth) current = candidate;
            else { lines.push(current); current = words[i]; }
        }
        lines.push(current);
        return lines;
    }

    /* ============================================================
       Signature generator
       ============================================================ */
    define({
        id: 'signature-generator',
        name: 'Signature Generator',
        category: 'generate',
        icon: 'pen-tool',
        description: 'Draw or type a signature and save it as a transparent PNG.',
        tags: ['signature', 'sign', 'handwriting', 'transparent', 'png', 'esign'],
        input: 'none',
        options: [
            {
                id: 'source', type: 'radio', label: 'Create it by', value: 'draw',
                options: [{ value: 'draw', label: 'Drawing' }, { value: 'type', label: 'Typing' }]
            },
            { id: 'signature', type: 'signature', label: 'Draw your signature', when: function (o) { return o.source === 'draw'; } },
            { id: 'text', type: 'text', label: 'Your name', value: 'Ada Lovelace', when: function (o) { return o.source === 'type'; } },
            {
                id: 'font', type: 'select', label: 'Handwriting style', value: 'cursive',
                options: [
                    { value: 'cursive', label: 'Cursive' },
                    { value: 'serif', label: 'Formal serif' },
                    { value: 'sans-serif', label: 'Clean sans-serif' }
                ],
                when: function (o) { return o.source === 'type'; }
            },
            { id: 'color', type: 'color', label: 'Ink colour', value: '#111827' },
            { id: 'size', type: 'range', label: 'Output width', value: 600, min: 200, max: 2000, step: 50, suffix: 'px' },
            { id: 'transparent', type: 'checkbox', label: 'Transparent background', value: true },
            { id: 'background', type: 'color', label: 'Background colour', value: '#FFFFFF', when: function (o) { return !o.transparent; } },
            { id: 'note', type: 'note', text: 'A signature image is a picture, not a cryptographic signature — it proves nothing about who made it, exactly like signing a printed page. For a legally binding e-signature use a service that records identity and intent.' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var source;

            if (o.source === 'draw') {
                if (!o.signature) ZT.fail('Draw your signature in the box above first.');
                var bitmap = await ZT.loadImage(o.signature);
                source = ZT.drawToCanvas(bitmap);
            } else {
                if (!String(o.text).trim()) ZT.fail('Type the name you want to sign with.');
                source = renderSignatureText(o.text, o.font, o.color);
            }

            // Scale to the requested width, keeping the aspect ratio.
            var scale = o.size / source.width;
            var canvas = ZT.makeCanvas(o.size, Math.round(source.height * scale));
            var c2d = canvas.getContext('2d');

            if (!o.transparent) {
                c2d.fillStyle = o.background;
                c2d.fillRect(0, 0, canvas.width, canvas.height);
            }

            c2d.imageSmoothingQuality = 'high';
            c2d.drawImage(source, 0, 0, canvas.width, canvas.height);

            // Recolour drawn ink, which is captured in a fixed dark tone.
            if (o.source === 'draw' && o.color.toLowerCase() !== '#111827') {
                var rgb = ZT.color.parse(o.color) || [17, 24, 39];
                ZT.mapPixels(canvas, function (r, g, b, a, i, data) {
                    if (a < 8) return;
                    data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2];
                });
            }

            var blob = await ZT.encodeCanvas(canvas, 'png');
            return ZT.fileResult(blob, 'signature.png', {
                previewBlob: blob,
                note: canvas.width + '×' + canvas.height + (o.transparent ? '  ·  transparent PNG' : '')
            });
        }
    });

    function renderSignatureText(text, family, colour) {
        var FONTS = {
            cursive: '"Segoe Script", "Brush Script MT", "Snell Roundhand", cursive',
            serif: 'Georgia, "Times New Roman", serif',
            'sans-serif': '"Segoe UI", Helvetica, Arial, sans-serif'
        };

        var fontSize = 140;
        var font = (family === 'cursive' ? 'italic ' : '') + fontSize + 'px ' + (FONTS[family] || FONTS.cursive);

        var measure = ZT.makeCanvas(10, 10).getContext('2d');
        measure.font = font;
        var width = Math.ceil(measure.measureText(text).width) + 60;

        var canvas = ZT.makeCanvas(width, Math.round(fontSize * 1.7));
        var c2d = canvas.getContext('2d');
        c2d.font = font;
        c2d.fillStyle = colour;
        c2d.textBaseline = 'middle';
        c2d.fillText(text, 30, canvas.height / 2);
        return canvas;
    }

    /* ============================================================
       Invoice
       ============================================================ */
    define({
        id: 'invoice-generator',
        name: 'Invoice Generator',
        category: 'generate',
        icon: 'file-text',
        description: 'Fill in a form and download a clean PDF invoice.',
        tags: ['invoice', 'bill', 'receipt', 'pdf', 'freelance', 'accounting', 'template'],
        input: 'none',
        options: [
            { id: 'invoice-number', type: 'text', label: 'Invoice number', value: 'INV-001' },
            { id: 'date', type: 'date', label: 'Invoice date', value: '' },
            { id: 'due-date', type: 'date', label: 'Due date', value: '' },

            { id: 'from', type: 'textarea', label: 'From (you)', rows: 4, value: 'Your Name\n1 Example Street\nLondon, EC1A 1BB\nyou@example.com' },
            { id: 'to', type: 'textarea', label: 'Bill to (client)', rows: 4, value: 'Client Ltd\n2 Sample Road\nManchester, M1 2AB' },

            { id: 'items', type: 'textarea', label: 'Line items', rows: 6,
              value: 'Design work | 10 | 75\nDevelopment | 24 | 85\nHosting setup | 1 | 150',
              help: 'One per line:  description | quantity | unit price' },

            { id: 'currency', type: 'select', label: 'Currency', value: 'GBP',
              options: [
                  { value: 'GBP', label: 'GBP  £' }, { value: 'USD', label: 'USD  $' },
                  { value: 'EUR', label: 'EUR  €' }, { value: 'INR', label: 'INR  ₹' },
                  { value: 'AUD', label: 'AUD  $' }, { value: 'CAD', label: 'CAD  $' }
              ] },
            { id: 'tax-rate', type: 'number', label: 'Tax rate', suffix: '%', value: 20, min: 0, max: 100, step: 0.1 },
            { id: 'tax-label', type: 'text', label: 'Tax name', value: 'VAT' },
            { id: 'discount', type: 'number', label: 'Discount', suffix: '%', value: 0, min: 0, max: 100, step: 0.1 },
            { id: 'notes', type: 'textarea', label: 'Notes / payment terms', rows: 3, value: 'Payment due within 30 days.\nBank: 00-00-00  ·  Account: 12345678' },
            { id: 'accent', type: 'color', label: 'Accent colour', value: '#4F8DF7' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var PDFLib = await ZT.libs.pdfLib();

            var SYMBOLS = { GBP: 'GBP ', USD: '$', EUR: 'EUR ', INR: 'INR ', AUD: 'A$', CAD: 'C$' };
            var symbol = SYMBOLS[o.currency] || '';

            var items = String(o.items).split(/\r?\n/).filter(function (l) { return l.trim(); }).map(function (line, i) {
                var parts = line.split('|').map(function (p) { return p.trim(); });
                var quantity = parseFloat(parts[1]);
                var price = parseFloat(parts[2]);
                if (!parts[0]) ZT.fail('Line ' + (i + 1) + ' has no description.');
                if (isNaN(quantity) || isNaN(price)) {
                    ZT.fail('Line ' + (i + 1) + ' needs a quantity and a price:  description | quantity | price');
                }
                return { description: parts[0], quantity: quantity, price: price, total: quantity * price };
            });

            if (!items.length) ZT.fail('Add at least one line item.');

            var subtotal = items.reduce(function (sum, i) { return sum + i.total; }, 0);
            var discountAmount = subtotal * (o.discount / 100);
            var taxable = subtotal - discountAmount;
            var taxAmount = taxable * (o.taxRate / 100);
            var total = taxable + taxAmount;

            function money(n) {
                return symbol + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }

            var doc = await PDFLib.PDFDocument.create();
            var page = doc.addPage([595.28, 841.89]);
            var regular = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
            var bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);

            var accent = ZT.color.parse(o.accent) || [79, 141, 247];
            var accentColor = PDFLib.rgb(accent[0] / 255, accent[1] / 255, accent[2] / 255);
            var ink = PDFLib.rgb(0.09, 0.11, 0.14);
            var muted = PDFLib.rgb(0.42, 0.45, 0.5);

            var margin = 50;
            var width = 595.28;
            var y = 780;

            function sanitise(s) {
                return String(s).replace(/[^\x00-\xFF]/g, '?');
            }

            page.drawRectangle({ x: 0, y: 818, width: width, height: 24, color: accentColor });

            page.drawText('INVOICE', { x: margin, y: y, size: 30, font: bold, color: ink });
            page.drawText(sanitise(o.invoiceNumber), { x: margin, y: y - 22, size: 11, font: regular, color: muted });

            var today = new Date().toISOString().slice(0, 10);
            var dateText = 'Date: ' + (o.date || today);
            var dueText = o.dueDate ? 'Due: ' + o.dueDate : '';
            page.drawText(dateText, { x: width - margin - regular.widthOfTextAtSize(dateText, 10), y: y + 8, size: 10, font: regular, color: muted });
            if (dueText) {
                page.drawText(dueText, { x: width - margin - regular.widthOfTextAtSize(dueText, 10), y: y - 6, size: 10, font: regular, color: muted });
            }

            y -= 60;

            function block(label, body, x) {
                page.drawText(label, { x: x, y: y, size: 8, font: bold, color: muted });
                var lines = String(body).split(/\r?\n/).filter(Boolean);
                lines.forEach(function (line, i) {
                    page.drawText(sanitise(line), { x: x, y: y - 15 - i * 13, size: 10, font: i === 0 ? bold : regular, color: ink });
                });
                return lines.length;
            }

            var fromLines = block('FROM', o.from, margin);
            var toLines = block('BILL TO', o.to, width / 2 + 10);
            y -= 20 + Math.max(fromLines, toLines) * 13 + 30;

            // Table header
            page.drawRectangle({ x: margin, y: y - 4, width: width - margin * 2, height: 22, color: PDFLib.rgb(0.96, 0.97, 0.98) });
            page.drawText('DESCRIPTION', { x: margin + 8, y: y + 3, size: 8, font: bold, color: muted });
            page.drawText('QTY', { x: 330, y: y + 3, size: 8, font: bold, color: muted });
            page.drawText('PRICE', { x: 390, y: y + 3, size: 8, font: bold, color: muted });
            page.drawText('AMOUNT', { x: width - margin - 60, y: y + 3, size: 8, font: bold, color: muted });
            y -= 26;

            items.forEach(function (item) {
                if (y < 160) {
                    page = doc.addPage([595.28, 841.89]);
                    y = 780;
                }
                page.drawText(sanitise(item.description).slice(0, 48), { x: margin + 8, y: y, size: 10, font: regular, color: ink });
                page.drawText(String(item.quantity), { x: 330, y: y, size: 10, font: regular, color: ink });
                page.drawText(money(item.price), { x: 390, y: y, size: 10, font: regular, color: ink });
                var amount = money(item.total);
                page.drawText(amount, { x: width - margin - regular.widthOfTextAtSize(amount, 10), y: y, size: 10, font: regular, color: ink });
                y -= 18;
            });

            y -= 10;
            page.drawLine({ start: { x: 330, y: y }, end: { x: width - margin, y: y }, thickness: 0.7, color: PDFLib.rgb(0.85, 0.87, 0.9) });
            y -= 18;

            function totalRow(label, amount, emphasis) {
                var font = emphasis ? bold : regular;
                var size = emphasis ? 13 : 10;
                page.drawText(label, { x: 390, y: y, size: size, font: font, color: emphasis ? ink : muted });
                var text = money(amount);
                page.drawText(text, {
                    x: width - margin - font.widthOfTextAtSize(text, size),
                    y: y, size: size, font: font, color: emphasis ? accentColor : ink
                });
                y -= emphasis ? 24 : 16;
            }

            totalRow('Subtotal', subtotal);
            if (o.discount > 0) totalRow('Discount ' + o.discount + '%', -discountAmount);
            if (o.taxRate > 0) totalRow(sanitise(o.taxLabel) + ' ' + o.taxRate + '%', taxAmount);
            y -= 4;
            totalRow('TOTAL', total, true);

            if (String(o.notes).trim()) {
                y -= 20;
                page.drawText('NOTES', { x: margin, y: y, size: 8, font: bold, color: muted });
                y -= 14;
                String(o.notes).split(/\r?\n/).forEach(function (line) {
                    page.drawText(sanitise(line), { x: margin, y: y, size: 9, font: regular, color: muted });
                    y -= 12;
                });
            }

            doc.setTitle('Invoice ' + o.invoiceNumber);
            doc.setProducer('ZyncTools');
            var bytes = await doc.save();

            return [
                ZT.dataResult([
                    { label: 'Subtotal', value: money(subtotal) },
                    { label: 'Discount', value: o.discount > 0 ? '-' + money(discountAmount) : '—' },
                    { label: o.taxLabel + ' ' + o.taxRate + '%', value: money(taxAmount) },
                    { label: 'Total due', value: money(total) },
                    { label: 'Line items', value: String(items.length) }
                ], { title: 'Invoice summary', columns: 2 }),
                ZT.fileResult(new Blob([bytes], { type: 'application/pdf' }),
                    ZT.slugify(o.invoiceNumber || 'invoice') + '.pdf',
                    { note: ZT.formatBytes(bytes.length) })
            ];
        }
    });

})();
