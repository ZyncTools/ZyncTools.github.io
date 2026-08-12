/**
 * ZyncTools — Security tools
 * Hashing, HMAC, AES encryption and password analysis, all via WebCrypto.
 */
(function () {
    'use strict';

    var ZT = window.ZT;
    var define = ZT.registry.define;

    /* ============================================================
       MD5 — WebCrypto deliberately omits it, so it is implemented here.
       Kept for checksum comparison only; it is not collision-resistant.
       ============================================================ */
    function md5(bytes) {
        var S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
                 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
                 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
                 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
        var K = [];
        for (var i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);

        var msgLen = bytes.length;
        var withPadding = new Uint8Array((((msgLen + 8) >> 6) + 1) * 64);
        withPadding.set(bytes);
        withPadding[msgLen] = 0x80;

        var bitLen = msgLen * 8;
        var lengthView = new DataView(withPadding.buffer);
        lengthView.setUint32(withPadding.length - 8, bitLen >>> 0, true);
        lengthView.setUint32(withPadding.length - 4, Math.floor(bitLen / 4294967296), true);

        var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

        function rotl(x, c) { return (x << c) | (x >>> (32 - c)); }

        for (var chunk = 0; chunk < withPadding.length; chunk += 64) {
            var M = [];
            for (var j = 0; j < 16; j++) M[j] = lengthView.getUint32(chunk + j * 4, true);

            var A = a0, B = b0, C = c0, D = d0;
            for (i = 0; i < 64; i++) {
                var F, g;
                if (i < 16) { F = (B & C) | (~B & D); g = i; }
                else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
                else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
                else { F = C ^ (B | ~D); g = (7 * i) % 16; }

                F = (F + A + K[i] + M[g]) | 0;
                A = D; D = C; C = B;
                B = (B + rotl(F, S[i])) | 0;
            }
            a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
        }

        var out = new Uint8Array(16);
        var outView = new DataView(out.buffer);
        outView.setUint32(0, a0 >>> 0, true);
        outView.setUint32(4, b0 >>> 0, true);
        outView.setUint32(8, c0 >>> 0, true);
        outView.setUint32(12, d0 >>> 0, true);
        return out.buffer;
    }

    var WEBCRYPTO_ALGOS = { 'SHA-1': 'SHA-1', 'SHA-256': 'SHA-256', 'SHA-384': 'SHA-384', 'SHA-512': 'SHA-512' };

    async function digest(algorithm, bytes) {
        if (algorithm === 'MD5') return md5(new Uint8Array(bytes));
        return crypto.subtle.digest(WEBCRYPTO_ALGOS[algorithm], bytes);
    }

    var ALGO_OPTIONS = [
        { value: 'MD5', label: 'MD5 — 128-bit (checksums only)' },
        { value: 'SHA-1', label: 'SHA-1 — 160-bit (legacy)' },
        { value: 'SHA-256', label: 'SHA-256 — recommended' },
        { value: 'SHA-384', label: 'SHA-384' },
        { value: 'SHA-512', label: 'SHA-512' }
    ];

    /* ============================================================
       Text hash
       ============================================================ */
    define({
        id: 'hash-generator',
        name: 'Hash Generator',
        category: 'security',
        icon: 'fingerprint',
        description: 'Generate MD5, SHA-1, SHA-256, SHA-384 and SHA-512 hashes of text.',
        tags: ['hash', 'md5', 'sha256', 'sha1', 'checksum', 'digest'],
        input: 'text',
        live: true,
        popular: true,
        placeholder: 'Type anything to hash it…',
        options: [
            { id: 'all-algorithms', type: 'checkbox', label: 'Show every algorithm at once', value: true },
            {
                id: 'algorithm', type: 'select', label: 'Algorithm', value: 'SHA-256',
                options: ALGO_OPTIONS, when: function (o) { return !o.allAlgorithms; }
            },
            { id: 'uppercase', type: 'checkbox', label: 'Uppercase output', value: false },
            {
                id: 'encoding', type: 'select', label: 'Output encoding', value: 'hex',
                options: [{ value: 'hex', label: 'Hexadecimal' }, { value: 'base64', label: 'Base64' }]
            }
        ],
        run: async function (ctx) {
            var text = ctx.text || '';
            var bytes = new TextEncoder().encode(text);
            var algorithms = ctx.opt.allAlgorithms
                ? ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']
                : [ctx.opt.algorithm];

            var rows = [];
            for (var i = 0; i < algorithms.length; i++) {
                var buffer = await digest(algorithms[i], bytes);
                var value;
                if (ctx.opt.encoding === 'base64') {
                    var arr = new Uint8Array(buffer);
                    var bin = '';
                    for (var j = 0; j < arr.length; j++) bin += String.fromCharCode(arr[j]);
                    value = btoa(bin);
                } else {
                    value = ZT.bytesToHex(buffer);
                    if (ctx.opt.uppercase) value = value.toUpperCase();
                }
                rows.push({ label: algorithms[i], value: value });
            }

            return ZT.dataResult(rows, {
                title: 'Hashes of ' + ZT.formatBytes(bytes.length) + ' of input',
                columns: 2, mono: true
            });
        }
    });

    /* ============================================================
       File hash / checksum
       ============================================================ */
    define({
        id: 'file-hash-generator',
        name: 'File Checksum Generator',
        category: 'security',
        icon: 'file-check',
        description: 'Compute file checksums and verify a download against a known hash.',
        tags: ['checksum', 'hash', 'file', 'verify', 'integrity', 'sha256'],
        input: 'files',
        accept: '*/*',
        options: [
            {
                id: 'algorithm', type: 'select', label: 'Algorithm', value: 'SHA-256',
                options: ALGO_OPTIONS
            },
            { id: 'expected', type: 'text', label: 'Expected hash (optional)', value: '', placeholder: 'paste a published checksum to verify against', mono: true },
            { id: 'uppercase', type: 'checkbox', label: 'Uppercase output', value: false }
        ],
        run: async function (ctx) {
            var rows = [];
            var expected = String(ctx.opt.expected || '').trim().toLowerCase().replace(/\s/g, '');

            for (var i = 0; i < ctx.files.length; i++) {
                var file = ctx.files[i];
                ctx.progress(i / ctx.files.length, 'Hashing ' + file.name);

                if (file.size > 512 * 1024 * 1024) {
                    ZT.fail('"' + file.name + '" is ' + ZT.formatBytes(file.size) + '. Files above 512 MB may exhaust browser memory.');
                }

                var bytes = await ZT.readAsArrayBuffer(file);
                var hash = ZT.bytesToHex(await digest(ctx.opt.algorithm, bytes));
                rows.push({
                    label: file.name + '  (' + ZT.formatBytes(file.size) + ')',
                    value: ctx.opt.uppercase ? hash.toUpperCase() : hash
                });

                if (expected) {
                    rows.push({
                        label: '  → verification',
                        value: hash === expected
                            ? 'MATCH — the file is intact'
                            : 'NO MATCH — this file differs from the expected hash'
                    });
                }
            }
            ctx.progress(1);

            return ZT.dataResult(rows, { title: ctx.opt.algorithm + ' checksums', columns: 2, mono: true });
        }
    });

    /* ============================================================
       HMAC
       ============================================================ */
    define({
        id: 'hmac-generator',
        name: 'HMAC Generator',
        category: 'security',
        icon: 'key-round',
        description: 'Sign a message with a secret key using HMAC.',
        tags: ['hmac', 'signature', 'sign', 'api', 'webhook', 'secret'],
        input: 'text',
        live: true,
        placeholder: 'The message to sign…',
        options: [
            { id: 'secret', type: 'text', label: 'Secret key', value: '', placeholder: 'your shared secret' },
            {
                id: 'algorithm', type: 'select', label: 'Hash algorithm', value: 'SHA-256',
                options: [
                    { value: 'SHA-1', label: 'HMAC-SHA1' }, { value: 'SHA-256', label: 'HMAC-SHA256' },
                    { value: 'SHA-384', label: 'HMAC-SHA384' }, { value: 'SHA-512', label: 'HMAC-SHA512' }
                ]
            },
            {
                id: 'encoding', type: 'select', label: 'Output encoding', value: 'hex',
                options: [{ value: 'hex', label: 'Hexadecimal' }, { value: 'base64', label: 'Base64' }]
            }
        ],
        run: async function (ctx) {
            if (!ctx.opt.secret) return ZT.textResult('', { note: 'Enter a secret key to sign with.' });

            var encoder = new TextEncoder();
            var key = await crypto.subtle.importKey(
                'raw', encoder.encode(ctx.opt.secret),
                { name: 'HMAC', hash: ctx.opt.algorithm },
                false, ['sign']
            );
            var signature = await crypto.subtle.sign('HMAC', key, encoder.encode(ctx.text || ''));

            var value;
            if (ctx.opt.encoding === 'base64') {
                var arr = new Uint8Array(signature);
                var bin = '';
                for (var i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
                value = btoa(bin);
            } else {
                value = ZT.bytesToHex(signature);
            }

            return ZT.textResult(value, { mono: true, note: 'HMAC-' + ctx.opt.algorithm.replace('-', '') });
        }
    });

    /* ============================================================
       AES text encryption
       ============================================================ */
    define({
        id: 'text-encryptor',
        name: 'Text Encryptor',
        category: 'security',
        icon: 'lock',
        description: 'Encrypt and decrypt text with AES-256-GCM and a passphrase.',
        tags: ['encrypt', 'decrypt', 'aes', 'password', 'secure', 'cipher'],
        input: 'text',
        popular: true,
        placeholder: 'Text to encrypt, or a ZYNC1: string to decrypt…',
        options: [
            {
                id: 'direction', type: 'radio', label: 'Action', value: 'encrypt',
                options: [{ value: 'encrypt', label: 'Encrypt' }, { value: 'decrypt', label: 'Decrypt' }]
            },
            { id: 'passphrase', type: 'text', label: 'Passphrase', value: '', placeholder: 'use something long and memorable' },
            { id: 'iterations', type: 'select', label: 'Key strengthening', value: '250000',
              options: [
                  { value: '100000', label: '100,000 rounds — faster' },
                  { value: '250000', label: '250,000 rounds — recommended' },
                  { value: '600000', label: '600,000 rounds — strongest, slower' }
              ],
              when: function (o) { return o.direction === 'encrypt'; } },
            { id: 'note', type: 'note', text: 'Uses AES-256-GCM with a PBKDF2-derived key. Everything happens in your browser and nothing is transmitted. If you lose the passphrase the text cannot be recovered.' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var text = ctx.text || '';
            if (!o.passphrase) ZT.fail('Enter a passphrase.');
            if (!text.trim()) ZT.fail('Enter some text.');

            var encoder = new TextEncoder();

            async function deriveKey(salt, iterations) {
                var material = await crypto.subtle.importKey('raw', encoder.encode(o.passphrase), 'PBKDF2', false, ['deriveKey']);
                return crypto.subtle.deriveKey(
                    { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
                    material,
                    { name: 'AES-GCM', length: 256 },
                    false, ['encrypt', 'decrypt']
                );
            }

            if (o.direction === 'encrypt') {
                var iterations = parseInt(o.iterations, 10);
                var salt = crypto.getRandomValues(new Uint8Array(16));
                var iv = crypto.getRandomValues(new Uint8Array(12));
                var key = await deriveKey(salt, iterations);
                var cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, encoder.encode(text)));

                // Layout: salt(16) | iv(12) | iterations(4, big-endian) | ciphertext
                var packed = new Uint8Array(16 + 12 + 4 + cipher.length);
                packed.set(salt, 0);
                packed.set(iv, 16);
                new DataView(packed.buffer).setUint32(28, iterations, false);
                packed.set(cipher, 32);

                var bin = '';
                for (var i = 0; i < packed.length; i++) bin += String.fromCharCode(packed[i]);

                return ZT.textResult('ZYNC1:' + btoa(bin), {
                    mono: true,
                    note: 'Encrypted with AES-256-GCM · ' + iterations.toLocaleString() + ' PBKDF2 rounds. Save this whole string including the ZYNC1: prefix.'
                });
            }

            var payload = text.trim().replace(/^ZYNC1:/, '').replace(/\s+/g, '');
            var raw;
            try {
                var decoded = atob(payload);
                raw = new Uint8Array(decoded.length);
                for (i = 0; i < decoded.length; i++) raw[i] = decoded.charCodeAt(i);
            } catch (e) {
                ZT.fail('That does not look like an encrypted ZyncTools string.');
            }
            if (raw.length < 33) ZT.fail('That encrypted string is truncated or corrupt.');

            var usedSalt = raw.slice(0, 16);
            var usedIv = raw.slice(16, 28);
            var usedIterations = new DataView(raw.buffer, raw.byteOffset).getUint32(28, false);
            var body = raw.slice(32);

            try {
                var decryptKey = await deriveKey(usedSalt, usedIterations);
                var plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: usedIv }, decryptKey, body);
                return ZT.textResult(new TextDecoder().decode(plain), { note: 'Decrypted successfully.' });
            } catch (e) {
                ZT.fail('Decryption failed. The passphrase is wrong, or the encrypted text has been altered.');
            }
        }
    });

    /* ============================================================
       Password strength
       ============================================================ */
    define({
        id: 'password-strength-checker',
        name: 'Password Strength Checker',
        category: 'security',
        icon: 'shield-check',
        description: 'Estimate how long a password would take to crack, entirely offline.',
        tags: ['password', 'strength', 'entropy', 'security', 'crack time'],
        input: 'text',
        live: true,
        placeholder: 'Type a password to analyse it…',
        options: [
            {
                id: 'attack-speed', type: 'select', label: 'Assumed attacker speed', value: '1e10',
                options: [
                    { value: '1e4', label: 'Online attack — 10 thousand guesses/sec' },
                    { value: '1e10', label: 'Offline GPU cracking — 10 billion/sec' },
                    { value: '1e12', label: 'Nation-state cluster — 1 trillion/sec' }
                ]
            },
            { id: 'note', type: 'note', text: 'The password never leaves your browser. Nothing is logged, stored or sent anywhere.' }
        ],
        run: function (ctx) {
            var pw = ctx.text || '';
            if (!pw) return ZT.dataResult([{ label: 'Status', value: 'Type a password above to analyse it.' }], { title: 'Analysis' });

            var poolSize = 0;
            if (/[a-z]/.test(pw)) poolSize += 26;
            if (/[A-Z]/.test(pw)) poolSize += 26;
            if (/[0-9]/.test(pw)) poolSize += 10;
            if (/[^a-zA-Z0-9]/.test(pw)) poolSize += 33;

            var entropy = pw.length * Math.log2(poolSize || 1);

            // Penalise the patterns real crackers exploit first.
            var penalties = [];
            if (/(.)\1{2,}/.test(pw)) { entropy -= 10; penalties.push('Contains a character repeated three or more times'); }
            if (/^(?:012|123|234|345|456|567|678|789|abc|qwe|asd|zxc)/i.test(pw)) { entropy -= 12; penalties.push('Starts with a keyboard or counting sequence'); }
            if (COMMON_PASSWORDS.indexOf(pw.toLowerCase()) !== -1) { entropy = Math.min(entropy, 8); penalties.push('This is one of the most commonly used passwords in the world'); }
            if (/^\d+$/.test(pw)) { entropy -= 8; penalties.push('Digits only'); }
            if (/^[a-z]+$/.test(pw)) { entropy -= 6; penalties.push('Lowercase letters only'); }
            if (/(19|20)\d{2}/.test(pw)) { entropy -= 5; penalties.push('Contains something that looks like a year'); }
            entropy = Math.max(0, entropy);

            var guessesPerSecond = parseFloat(ctx.opt.attackSpeed);
            var seconds = Math.pow(2, entropy) / 2 / guessesPerSecond;

            function humanTime(s) {
                if (s < 1) return 'instantly';
                if (s < 60) return Math.round(s) + ' seconds';
                if (s < 3600) return Math.round(s / 60) + ' minutes';
                if (s < 86400) return Math.round(s / 3600) + ' hours';
                if (s < 31536000) return Math.round(s / 86400) + ' days';
                var years = s / 31536000;
                if (years < 1000) return Math.round(years) + ' years';
                if (years < 1e6) return Math.round(years / 1000) + ' thousand years';
                if (years < 1e9) return Math.round(years / 1e6) + ' million years';
                if (years < 1e15) return Math.round(years / 1e9) + ' billion years';
                return 'longer than the age of the universe';
            }

            var verdict, tone;
            if (entropy < 28) { verdict = 'Very weak'; tone = 'bad'; }
            else if (entropy < 36) { verdict = 'Weak'; tone = 'bad'; }
            else if (entropy < 60) { verdict = 'Reasonable'; tone = 'warn'; }
            else if (entropy < 80) { verdict = 'Strong'; tone = 'good'; }
            else { verdict = 'Very strong'; tone = 'good'; }

            var meter = ZT.el('div', { class: 'zt-meter zt-meter--' + tone }, [
                ZT.el('div', { class: 'zt-meter__bar', style: { width: Math.min(100, entropy / 100 * 100) + '%' } })
            ]);
            var meterWrap = ZT.el('div', { class: 'zt-meter-wrap' }, [
                ZT.el('div', { class: 'zt-meter__label' }, [
                    ZT.el('strong', { text: verdict }),
                    ZT.el('span', { text: Math.round(entropy) + ' bits of entropy' })
                ]),
                meter
            ]);

            var advice = [];
            if (pw.length < 12) advice.push('Make it longer — 16 characters or more beats any amount of complexity.');
            if (!/[A-Z]/.test(pw)) advice.push('Add uppercase letters.');
            if (!/[0-9]/.test(pw)) advice.push('Add digits.');
            if (!/[^a-zA-Z0-9]/.test(pw)) advice.push('Add symbols.');
            if (!advice.length && entropy >= 80) advice.push('This password is in good shape. Store it in a password manager.');

            var rows = [
                { label: 'Length', value: pw.length + ' characters' },
                { label: 'Character pool', value: poolSize + ' possible characters' },
                { label: 'Entropy', value: Math.round(entropy) + ' bits' },
                { label: 'Time to crack', value: humanTime(seconds) },
                { label: 'Verdict', value: verdict }
            ];
            penalties.forEach(function (p) { rows.push({ label: 'Weakness', value: p }); });
            advice.forEach(function (a) { rows.push({ label: 'Suggestion', value: a }); });

            return [
                ZT.nodeResult(meterWrap, { title: 'Strength' }),
                ZT.dataResult(rows, { title: 'Analysis', columns: 2 })
            ];
        }
    });

    var COMMON_PASSWORDS = ('123456 password 123456789 12345678 12345 qwerty abc123 111111 123123 1234567890 letmein monkey ' +
        'dragon baseball iloveyou trustno1 sunshine master welcome shadow ashley football jesus michael ninja mustang ' +
        'password1 admin login princess qwertyuiop solo starwars 1q2w3e4r zaq12wsx qazwsx passw0rd 654321 superman').split(' ');

    /* ============================================================
       Encrypted file
       ============================================================ */
    define({
        id: 'file-encryptor',
        name: 'File Encryptor',
        category: 'security',
        icon: 'file-lock',
        description: 'Encrypt any file with AES-256 and a passphrase, then decrypt it later.',
        tags: ['encrypt', 'decrypt', 'file', 'aes', 'secure', 'password'],
        input: 'file',
        accept: '*/*',
        options: [
            {
                id: 'direction', type: 'radio', label: 'Action', value: 'encrypt',
                options: [{ value: 'encrypt', label: 'Encrypt a file' }, { value: 'decrypt', label: 'Decrypt a .zyncenc file' }]
            },
            { id: 'passphrase', type: 'text', label: 'Passphrase', value: '', placeholder: 'use something long and memorable' },
            { id: 'note', type: 'note', text: 'AES-256-GCM with a PBKDF2-derived key, entirely in your browser. There is no recovery if the passphrase is lost.' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            if (!o.passphrase) ZT.fail('Enter a passphrase.');

            var file = ctx.files[0];
            if (file.size > 256 * 1024 * 1024) ZT.fail('Files above 256 MB may exhaust browser memory.');

            var encoder = new TextEncoder();
            var ITERATIONS = 250000;

            async function deriveKey(salt, iterations) {
                var material = await crypto.subtle.importKey('raw', encoder.encode(o.passphrase), 'PBKDF2', false, ['deriveKey']);
                return crypto.subtle.deriveKey(
                    { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
                    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
                );
            }

            ctx.progress(0.2, 'Reading file');
            var bytes = new Uint8Array(await ZT.readAsArrayBuffer(file));

            if (o.direction === 'encrypt') {
                ctx.progress(0.4, 'Deriving key');
                var salt = crypto.getRandomValues(new Uint8Array(16));
                var iv = crypto.getRandomValues(new Uint8Array(12));
                var key = await deriveKey(salt, ITERATIONS);

                ctx.progress(0.7, 'Encrypting');
                var cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, bytes));

                // Header: magic(8) | version(1) | iterations(4) | salt(16) | iv(12) | nameLen(2) | name | body
                var nameBytes = encoder.encode(file.name);
                var header = new Uint8Array(8 + 1 + 4 + 16 + 12 + 2 + nameBytes.length);
                header.set(encoder.encode('ZYNCENC1'), 0);
                header[8] = 1;
                var dv = new DataView(header.buffer);
                dv.setUint32(9, ITERATIONS, false);
                header.set(salt, 13);
                header.set(iv, 29);
                dv.setUint16(41, nameBytes.length, false);
                header.set(nameBytes, 43);

                var out = new Uint8Array(header.length + cipher.length);
                out.set(header, 0);
                out.set(cipher, header.length);
                ctx.progress(1);

                return ZT.fileResult(new Blob([out], { type: 'application/octet-stream' }), file.name + '.zyncenc', {
                    note: ZT.formatBytes(file.size) + ' encrypted with AES-256-GCM'
                });
            }

            var magic = new TextDecoder().decode(bytes.slice(0, 8));
            if (magic !== 'ZYNCENC1') ZT.fail('This is not a ZyncTools encrypted file (.zyncenc).');

            var view = new DataView(bytes.buffer, bytes.byteOffset);
            var iterations = view.getUint32(9, false);
            var usedSalt = bytes.slice(13, 29);
            var usedIv = bytes.slice(29, 41);
            var nameLength = view.getUint16(41, false);
            var originalName = new TextDecoder().decode(bytes.slice(43, 43 + nameLength));
            var body = bytes.slice(43 + nameLength);

            ctx.progress(0.5, 'Deriving key');
            try {
                var decryptKey = await deriveKey(usedSalt, iterations);
                ctx.progress(0.8, 'Decrypting');
                var plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: usedIv }, decryptKey, body);
                ctx.progress(1);
                return ZT.fileResult(new Blob([plain]), originalName || 'decrypted', {
                    note: 'Decrypted successfully · ' + ZT.formatBytes(plain.byteLength)
                });
            } catch (e) {
                ZT.fail('Decryption failed. The passphrase is wrong, or the file has been modified.');
            }
        }
    });


    /* ============================================================
       Base32 — needed by TOTP, and useful on its own
       ============================================================ */
    var BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    function base32Decode(input) {
        var clean = String(input).toUpperCase().replace(/[=\s-]/g, '');
        if (!/^[A-Z2-7]*$/.test(clean)) {
            ZT.fail('That is not valid Base32 — it may only contain A–Z and 2–7.');
        }

        var bits = 0, value = 0;
        var out = [];
        for (var i = 0; i < clean.length; i++) {
            value = (value << 5) | BASE32_ALPHABET.indexOf(clean[i]);
            bits += 5;
            if (bits >= 8) {
                out.push((value >>> (bits - 8)) & 0xff);
                bits -= 8;
            }
        }
        return new Uint8Array(out);
    }

    function base32Encode(bytes) {
        var out = '';
        var bits = 0, value = 0;
        for (var i = 0; i < bytes.length; i++) {
            value = (value << 8) | bytes[i];
            bits += 8;
            while (bits >= 5) {
                out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
                bits -= 5;
            }
        }
        if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
        while (out.length % 8) out += '=';
        return out;
    }

    define({
        id: 'base32-encoder',
        name: 'Base32 Encoder / Decoder',
        category: 'security',
        icon: 'binary',
        description: 'Encode and decode Base32, the format used by TOTP keys and DNS records.',
        tags: ['base32', 'encode', 'decode', 'rfc4648', 'totp', 'otp'],
        input: 'text',
        live: true,
        placeholder: 'Hello, world!',
        options: [
            {
                id: 'direction', type: 'radio', label: 'Direction', value: 'encode',
                options: [{ value: 'encode', label: 'Text → Base32' }, { value: 'decode', label: 'Base32 → Text' }]
            },
            { id: 'padding', type: 'checkbox', label: 'Include = padding', value: true, when: function (o) { return o.direction === 'encode'; } },
            { id: 'group', type: 'checkbox', label: 'Group in blocks of four', value: false, when: function (o) { return o.direction === 'encode'; }, help: 'How authenticator apps display a secret key.' }
        ],
        run: function (ctx) {
            var text = ctx.text || '';
            if (!text) return ZT.textResult('');

            if (ctx.opt.direction === 'encode') {
                var out = base32Encode(new TextEncoder().encode(text));
                if (!ctx.opt.padding) out = out.replace(/=+$/, '');
                if (ctx.opt.group) out = out.replace(/(.{4})(?=.)/g, '$1 ');
                return ZT.textResult(out, { mono: true });
            }

            try {
                return ZT.textResult(new TextDecoder().decode(base32Decode(text)));
            } catch (e) {
                if (e.userFacing) throw e;
                ZT.fail('That Base32 string could not be decoded.');
            }
        }
    });

    /* ============================================================
       TOTP — two-factor codes
       ============================================================ */
    define({
        id: 'totp-generator',
        name: 'TOTP / 2FA Code Generator',
        category: 'security',
        icon: 'key-round',
        description: 'Generate the current two-factor code from a TOTP secret key.',
        tags: ['totp', '2fa', 'otp', 'authenticator', 'two factor', 'mfa', 'google authenticator'],
        input: 'none',
        popular: true,
        options: [
            { id: 'secret', type: 'text', label: 'Secret key', value: '', placeholder: 'JBSWY3DPEHPK3PXP', mono: true, help: 'The Base32 key an app shows you when you set up 2FA.' },
            { id: 'digits', type: 'select', label: 'Code length', value: '6',
              options: [{ value: '6', label: '6 digits' }, { value: '7', label: '7 digits' }, { value: '8', label: '8 digits' }] },
            { id: 'period', type: 'select', label: 'Refresh interval', value: '30',
              options: [{ value: '30', label: '30 seconds' }, { value: '60', label: '60 seconds' }] },
            { id: 'algorithm', type: 'select', label: 'Algorithm', value: 'SHA-1',
              options: [
                  { value: 'SHA-1', label: 'SHA-1 — the default everywhere' },
                  { value: 'SHA-256', label: 'SHA-256' },
                  { value: 'SHA-512', label: 'SHA-512' }
              ] },
            { id: 'show-next', type: 'checkbox', label: 'Also show the next code', value: true },
            { id: 'note', type: 'note', text: 'Your secret is used in this tab and never sent anywhere. That said, a TOTP secret is a long-lived credential — for an account you care about, keep it in a real authenticator app rather than pasting it into any website, including this one. This tool is best for testing and recovery.' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            if (!String(o.secret).trim()) {
                return ZT.dataResult(
                    [{ label: 'Waiting for input', value: 'Paste a Base32 secret key above.' }],
                    { title: 'TOTP code' }
                );
            }

            var key = base32Decode(o.secret);
            if (!key.length) ZT.fail('That secret decoded to nothing — check you copied all of it.');

            var period = parseInt(o.period, 10);
            var digits = parseInt(o.digits, 10);
            var counter = Math.floor(Date.now() / 1000 / period);

            var current = await hotp(key, counter, digits, o.algorithm);
            var next = await hotp(key, counter + 1, digits, o.algorithm);
            var secondsLeft = period - Math.floor(Date.now() / 1000) % period;

            var rows = [
                { label: 'Current code', value: current },
                { label: 'Valid for', value: secondsLeft + ' more second' + (secondsLeft === 1 ? '' : 's') }
            ];
            if (o.showNext) rows.push({ label: 'Next code', value: next });
            rows.push({ label: 'Algorithm', value: o.algorithm + ' · ' + digits + ' digits · ' + period + 's' });

            return ZT.dataResult(rows, { title: 'Two-factor code', columns: 2, mono: true });
        }
    });

    /** RFC 4226 HMAC-based one-time password. */
    async function hotp(keyBytes, counter, digits, algorithm) {
        var buffer = new ArrayBuffer(8);
        var view = new DataView(buffer);
        // The counter is a 64-bit big-endian integer.
        view.setUint32(0, Math.floor(counter / 4294967296), false);
        view.setUint32(4, counter >>> 0, false);

        var key = await crypto.subtle.importKey(
            'raw', keyBytes, { name: 'HMAC', hash: algorithm }, false, ['sign']
        );
        var mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, buffer));

        // Dynamic truncation: the low nibble of the last byte picks the offset.
        var offset = mac[mac.length - 1] & 0x0f;
        var code = ((mac[offset] & 0x7f) << 24)
                 | ((mac[offset + 1] & 0xff) << 16)
                 | ((mac[offset + 2] & 0xff) << 8)
                 | (mac[offset + 3] & 0xff);

        return String(code % Math.pow(10, digits)).padStart(digits, '0');
    }

    /* ============================================================
       bcrypt
       ============================================================ */
    ZT.CDN.bcrypt = 'https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js';

    define({
        id: 'bcrypt-generator',
        name: 'Bcrypt Hash Generator & Verifier',
        category: 'security',
        icon: 'lock',
        description: 'Hash a password with bcrypt, or check a password against an existing hash.',
        tags: ['bcrypt', 'hash', 'password', 'verify', 'salt', 'laravel', 'php'],
        input: 'none',
        popular: true,
        heavy: true,
        options: [
            {
                id: 'mode', type: 'radio', label: 'Action', value: 'hash',
                options: [{ value: 'hash', label: 'Hash a password' }, { value: 'verify', label: 'Verify against a hash' }]
            },
            { id: 'password', type: 'text', label: 'Password', value: '' },
            { id: 'hash', type: 'text', label: 'Existing hash', value: '', mono: true, placeholder: '$2a$10$...', when: function (o) { return o.mode === 'verify'; } },
            { id: 'rounds', type: 'select', label: 'Cost factor', value: '10',
              options: [
                  { value: '8', label: '8 — fast' },
                  { value: '10', label: '10 — common default' },
                  { value: '12', label: '12 — recommended today' },
                  { value: '14', label: '14 — slow and strong' }
              ],
              when: function (o) { return o.mode === 'hash'; },
              help: 'Each step doubles the work. 12 takes about a quarter of a second, which is the point — it slows an attacker down too.' },
            { id: 'note', type: 'note', text: 'Everything runs in this tab. Never paste a real production password hash into a website you do not control — including this one. Use it for development and for understanding what a hash contains.' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            if (!o.password) {
                return ZT.dataResult([{ label: 'Waiting for input', value: 'Enter a password above.' }], { title: 'Bcrypt' });
            }

            ctx.progress(0.2, 'Loading bcrypt');
            var bcrypt = await ZT.requireLib(
                function () { return window.bcrypt || (window.dcodeIO && window.dcodeIO.bcrypt); },
                ZT.CDN.bcrypt
            );

            if (o.mode === 'verify') {
                if (!o.hash) ZT.fail('Paste the hash you want to check against.');
                ctx.progress(0.6, 'Verifying');
                var matches;
                try {
                    matches = bcrypt.compareSync(o.password, o.hash.trim());
                } catch (e) {
                    ZT.fail('That does not look like a bcrypt hash. It should start with $2a$, $2b$ or $2y$.');
                }
                ctx.progress(1);

                return ZT.dataResult([
                    { label: 'Result', value: matches ? 'MATCH — the password is correct' : 'NO MATCH' },
                    { label: 'Hash', value: o.hash.trim() },
                    { label: 'Cost factor', value: (o.hash.split('$')[2] || 'unknown') }
                ], { title: 'Verification', columns: 1, mono: true });
            }

            var rounds = parseInt(o.rounds, 10);
            ctx.progress(0.4, 'Hashing at cost ' + rounds + ' — this is meant to be slow');

            var started = performance.now();
            var hash = bcrypt.hashSync(o.password, rounds);
            var elapsed = performance.now() - started;
            ctx.progress(1);

            return ZT.dataResult([
                { label: 'Hash', value: hash },
                { label: 'Algorithm', value: hash.slice(0, 4) + '  (bcrypt)' },
                { label: 'Cost factor', value: String(rounds) },
                { label: 'Salt', value: hash.slice(7, 29) },
                { label: 'Time taken', value: Math.round(elapsed) + ' ms' },
                { label: 'Note', value: 'Bcrypt salts automatically, so hashing the same password again gives a different result. That is correct and expected.' }
            ], { title: 'Bcrypt hash', columns: 1, mono: true });
        }
    });

    /* ============================================================
       htpasswd
       ============================================================ */
    define({
        id: 'htpasswd-generator',
        name: 'htpasswd Generator',
        category: 'security',
        icon: 'file-lock',
        description: 'Create Apache or nginx .htpasswd entries for basic authentication.',
        tags: ['htpasswd', 'apache', 'nginx', 'basic auth', 'password', 'server'],
        input: 'none',
        options: [
            { id: 'username', type: 'text', label: 'Username', value: '' },
            { id: 'password', type: 'text', label: 'Password', value: '' },
            {
                id: 'algorithm', type: 'select', label: 'Hash format', value: 'bcrypt',
                options: [
                    { value: 'bcrypt', label: 'bcrypt — recommended' },
                    { value: 'sha1', label: 'SHA-1 — legacy, widely supported' },
                    { value: 'md5-apr1', label: 'MD5 (apr1) — Apache legacy' }
                ]
            },
            { id: 'rounds', type: 'select', label: 'Bcrypt cost', value: '10',
              options: [{ value: '8', label: '8' }, { value: '10', label: '10' }, { value: '12', label: '12' }],
              when: function (o) { return o.algorithm === 'bcrypt'; } },
            { id: 'note', type: 'note', text: 'Generated in this tab and never transmitted. Basic authentication sends credentials on every request, so only use it behind HTTPS.' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            if (!o.username || !o.password) {
                return ZT.dataResult([{ label: 'Waiting for input', value: 'Enter a username and password above.' }], { title: 'htpasswd' });
            }
            if (/:/.test(o.username)) ZT.fail('A username cannot contain a colon — that is the field separator.');

            var line;
            if (o.algorithm === 'bcrypt') {
                var bcrypt = await ZT.requireLib(
                    function () { return window.bcrypt || (window.dcodeIO && window.dcodeIO.bcrypt); },
                    ZT.CDN.bcrypt
                );
                // Apache expects the $2y$ prefix; bcryptjs emits $2a$.
                line = o.username + ':' + bcrypt.hashSync(o.password, parseInt(o.rounds, 10)).replace(/^\$2a\$/, '$2y$');
            } else if (o.algorithm === 'sha1') {
                var digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(o.password));
                var bytes = new Uint8Array(digest);
                var binary = '';
                for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                line = o.username + ':{SHA}' + btoa(binary);
            } else {
                ZT.fail('The Apache MD5 (apr1) format is not implemented — it needs a non-standard MD5 variant. Use bcrypt, which every current Apache and nginx supports.');
            }

            return [
                ZT.textResult(line, { mono: true, title: '.htpasswd line' }),
                ZT.dataResult([
                    { label: 'Apache', value: 'AuthType Basic / AuthUserFile /path/to/.htpasswd / Require valid-user' },
                    { label: 'nginx', value: 'auth_basic "Restricted"; auth_basic_user_file /path/to/.htpasswd;' },
                    { label: 'Adding more users', value: 'Put each user on their own line in the same file.' }
                ], { title: 'Server configuration', columns: 1 })
            ];
        }
    });

    /* ============================================================
       JWT signing
       ============================================================ */
    define({
        id: 'jwt-encoder',
        name: 'JWT Encoder / Signer',
        category: 'security',
        icon: 'key',
        description: 'Build and sign a JSON Web Token with HMAC.',
        tags: ['jwt', 'sign', 'encode', 'token', 'hs256', 'auth', 'bearer'],
        input: 'none',
        options: [
            { id: 'payload', type: 'textarea', label: 'Payload claims', rows: 7, mono: true,
              value: '{\n  "sub": "1234567890",\n  "name": "Ada Lovelace",\n  "admin": true\n}' },
            { id: 'secret', type: 'text', label: 'Signing secret', value: '', placeholder: 'your HMAC secret' },
            {
                id: 'algorithm', type: 'select', label: 'Algorithm', value: 'HS256',
                options: [
                    { value: 'HS256', label: 'HS256 — HMAC SHA-256' },
                    { value: 'HS384', label: 'HS384 — HMAC SHA-384' },
                    { value: 'HS512', label: 'HS512 — HMAC SHA-512' }
                ]
            },
            { id: 'add-iat', type: 'checkbox', label: 'Add issued-at (iat)', value: true },
            { id: 'add-exp', type: 'checkbox', label: 'Add an expiry (exp)', value: true },
            { id: 'expires-in', type: 'number', label: 'Expires in', suffix: 'minutes', value: 60, min: 1, max: 525600, when: function (o) { return o.addExp; } },
            { id: 'note', type: 'note', text: 'Only HMAC algorithms are offered. RS256 and friends need a private key, and pasting a production private key into a web page is not something this tool should encourage.' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            if (!o.secret) {
                return ZT.dataResult([{ label: 'Waiting for input', value: 'Enter a signing secret above.' }], { title: 'JWT' });
            }

            var claims;
            try {
                claims = JSON.parse(o.payload);
            } catch (e) {
                ZT.fail('The payload is not valid JSON: ' + e.message);
            }

            var now = Math.floor(Date.now() / 1000);
            if (o.addIat) claims.iat = now;
            if (o.addExp) claims.exp = now + o.expiresIn * 60;

            var header = { alg: o.algorithm, typ: 'JWT' };
            var hash = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' }[o.algorithm];

            function b64url(text) {
                return ZT.utf8ToBase64(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            }

            var signingInput = b64url(JSON.stringify(header)) + '.' + b64url(JSON.stringify(claims));

            var key = await crypto.subtle.importKey(
                'raw', new TextEncoder().encode(o.secret),
                { name: 'HMAC', hash: hash }, false, ['sign']
            );
            var signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput)));

            var binary = '';
            for (var i = 0; i < signature.length; i++) binary += String.fromCharCode(signature[i]);
            var encodedSignature = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

            var token = signingInput + '.' + encodedSignature;

            return [
                ZT.textResult(token, { mono: true, title: 'Signed token' }),
                ZT.dataResult([
                    { label: 'Algorithm', value: o.algorithm },
                    { label: 'Issued at', value: o.addIat ? new Date(claims.iat * 1000).toLocaleString() : 'not set' },
                    { label: 'Expires', value: o.addExp ? new Date(claims.exp * 1000).toLocaleString() : 'never' },
                    { label: 'Length', value: token.length + ' characters' },
                    { label: 'Authorization header', value: 'Bearer ' + token.slice(0, 32) + '…' }
                ], { title: 'Token details', columns: 2 })
            ];
        }
    });

    /* ============================================================
       Key pairs
       ============================================================ */
    define({
        id: 'keypair-generator',
        name: 'RSA & ECDSA Key Pair Generator',
        category: 'security',
        icon: 'key-round',
        description: 'Generate a public and private key pair in PEM format.',
        tags: ['rsa', 'ecdsa', 'keypair', 'public key', 'private key', 'pem', 'ssl', 'crypto'],
        input: 'none',
        heavy: true,
        options: [
            {
                id: 'type', type: 'select', label: 'Key type', value: 'RSA-2048',
                options: [
                    { value: 'RSA-2048', label: 'RSA 2048 — common default' },
                    { value: 'RSA-4096', label: 'RSA 4096 — stronger, slower' },
                    { value: 'EC-P256', label: 'ECDSA P-256 — small and fast' },
                    { value: 'EC-P384', label: 'ECDSA P-384' }
                ]
            },
            {
                id: 'usage', type: 'select', label: 'Intended use', value: 'sign',
                options: [
                    { value: 'sign', label: 'Signing and verification' },
                    { value: 'encrypt', label: 'Encryption and decryption' }
                ],
                when: function (o) { return /^RSA/.test(o.type); }
            },
            { id: 'note', type: 'note', text: 'Keys are generated by your browser\'s own crypto engine and never leave this tab. Even so: for anything protecting real systems, generate keys on the machine that will use them with ssh-keygen or openssl. A key that has been through a web page is a key you cannot fully vouch for.' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            ctx.progress(0.2, 'Generating — this can take a few seconds for RSA');

            var algorithm, usages;
            if (/^RSA/.test(o.type)) {
                var modulusLength = o.type === 'RSA-4096' ? 4096 : 2048;
                if (o.usage === 'encrypt') {
                    algorithm = { name: 'RSA-OAEP', modulusLength: modulusLength, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };
                    usages = ['encrypt', 'decrypt'];
                } else {
                    algorithm = { name: 'RSASSA-PKCS1-v1_5', modulusLength: modulusLength, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };
                    usages = ['sign', 'verify'];
                }
            } else {
                algorithm = { name: 'ECDSA', namedCurve: o.type === 'EC-P384' ? 'P-384' : 'P-256' };
                usages = ['sign', 'verify'];
            }

            var pair;
            try {
                pair = await crypto.subtle.generateKey(algorithm, true, usages);
            } catch (e) {
                ZT.fail('Your browser could not generate that key type: ' + e.message);
            }

            ctx.progress(0.8, 'Exporting');
            var publicKey = await crypto.subtle.exportKey('spki', pair.publicKey);
            var privateKey = await crypto.subtle.exportKey('pkcs8', pair.privateKey);
            ctx.progress(1);

            var publicPem = toPem(publicKey, 'PUBLIC KEY');
            var privatePem = toPem(privateKey, 'PRIVATE KEY');

            return [
                ZT.textResult(publicPem, { mono: true, title: 'Public key (share this)' }),
                ZT.textResult(privatePem, { mono: true, title: 'Private key (keep this secret)' }),
                ZT.fileResult(new Blob([publicPem], { type: 'application/x-pem-file' }), 'public-key.pem'),
                ZT.fileResult(new Blob([privatePem], { type: 'application/x-pem-file' }), 'private-key.pem'),
                ZT.dataResult([
                    { label: 'Type', value: o.type },
                    { label: 'Usage', value: usages.join(' / ') },
                    { label: 'Public key size', value: ZT.formatBytes(publicKey.byteLength) },
                    { label: 'Private key size', value: ZT.formatBytes(privateKey.byteLength) }
                ], { title: 'Details', columns: 2 })
            ];
        }
    });

    /** Wrap a DER key as PEM: base64 in 64-character lines with a header. */
    function toPem(buffer, label) {
        var bytes = new Uint8Array(buffer);
        var binary = '';
        for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        var body = btoa(binary).replace(/(.{64})/g, '$1\n').trim();
        return '-----BEGIN ' + label + '-----\n' + body + '\n-----END ' + label + '-----';
    }

    /* ============================================================
       Hash identifier
       ============================================================ */
    define({
        id: 'hash-identifier',
        name: 'Hash Identifier',
        category: 'security',
        icon: 'fingerprint',
        description: 'Work out which algorithm produced a hash from its shape.',
        tags: ['hash', 'identify', 'md5', 'sha', 'bcrypt', 'detect', 'what hash'],
        input: 'text',
        live: true,
        placeholder: '5d41402abc4b2a76b9719d911017c592',
        options: [
            { id: 'show-all', type: 'checkbox', label: 'Show every possible match, not just the likely one', value: false }
        ],
        run: function (ctx) {
            var hash = String(ctx.text || '').trim();
            if (!hash) return ZT.dataResult([{ label: 'Waiting for input', value: 'Paste a hash to identify it.' }], { title: 'Hash identifier' });

            /* Prefixed formats are unambiguous, so check them before falling
               back to guessing from length. */
            var PREFIXED = [
                [/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/, 'bcrypt', 'Very likely'],
                [/^\$argon2(id|i|d)\$/, 'Argon2', 'Certain'],
                [/^\$6\$/, 'SHA-512 crypt (Linux shadow)', 'Certain'],
                [/^\$5\$/, 'SHA-256 crypt (Linux shadow)', 'Certain'],
                [/^\$1\$/, 'MD5 crypt', 'Certain'],
                [/^\$apr1\$/, 'Apache MD5 (apr1)', 'Certain'],
                [/^\{SHA\}/, 'SHA-1 (htpasswd / LDAP)', 'Certain'],
                [/^\{SSHA\}/, 'Salted SHA-1 (LDAP)', 'Certain'],
                [/^pbkdf2[_:]/i, 'PBKDF2', 'Certain'],
                [/^[a-f0-9]{32}:[a-f0-9]+$/i, 'MD5 with a salt', 'Likely']
            ];

            for (var i = 0; i < PREFIXED.length; i++) {
                if (PREFIXED[i][0].test(hash)) {
                    var rows = [
                        { label: 'Algorithm', value: PREFIXED[i][1] },
                        { label: 'Confidence', value: PREFIXED[i][2] },
                        { label: 'Length', value: hash.length + ' characters' }
                    ];
                    if (/^\$2[aby]\$/.test(hash)) {
                        rows.push({ label: 'Cost factor', value: hash.split('$')[2] });
                        rows.push({ label: 'Salt', value: hash.slice(7, 29) });
                    }
                    return ZT.dataResult(rows, { title: 'Identified', columns: 2, mono: true });
                }
            }

            var isHex = /^[a-f0-9]+$/i.test(hash);
            var isBase64 = /^[A-Za-z0-9+/]+=*$/.test(hash);

            var BY_LENGTH = {
                8: ['CRC-32', 'Adler-32'],
                16: ['MySQL 3.x', 'DES'],
                32: ['MD5', 'MD4', 'NTLM', 'RIPEMD-128'],
                40: ['SHA-1', 'RIPEMD-160', 'MySQL 4.1+ (without the leading *)'],
                56: ['SHA-224'],
                64: ['SHA-256', 'SHA3-256', 'BLAKE2s', 'RIPEMD-256'],
                96: ['SHA-384'],
                128: ['SHA-512', 'SHA3-512', 'BLAKE2b', 'Whirlpool']
            };

            if (isHex && BY_LENGTH[hash.length]) {
                var candidates = BY_LENGTH[hash.length];
                var out = [
                    { label: 'Most likely', value: candidates[0] },
                    { label: 'Length', value: hash.length + ' hex characters (' + (hash.length * 4) + ' bits)' },
                    { label: 'Confidence', value: candidates.length > 1 ? 'Length matches several algorithms' : 'Length is distinctive' }
                ];
                if (candidates.length > 1) {
                    out.push({ label: 'Also possible', value: candidates.slice(1).join(', ') });
                }
                out.push({
                    label: 'Worth knowing',
                    value: 'Hashes of the same length are indistinguishable by inspection — MD5 and NTLM are both 32 hex characters. Only context tells you which it is.'
                });
                return ZT.dataResult(out, { title: 'Identified by length', columns: 1 });
            }

            if (isBase64) {
                var bytes = Math.floor(hash.replace(/=+$/, '').length * 3 / 4);
                return ZT.dataResult([
                    { label: 'Encoding', value: 'Base64' },
                    { label: 'Decoded size', value: bytes + ' bytes (' + bytes * 8 + ' bits)' },
                    { label: 'Most likely', value: bytes === 16 ? 'MD5' : bytes === 20 ? 'SHA-1' : bytes === 32 ? 'SHA-256' : bytes === 64 ? 'SHA-512' : 'unclear' }
                ], { title: 'Base64-encoded hash', columns: 2 });
            }

            return ZT.dataResult([
                { label: 'Result', value: 'Not recognised as a common hash format.' },
                { label: 'Length', value: hash.length + ' characters' },
                { label: 'Character set', value: isHex ? 'hexadecimal' : 'mixed' }
            ], { title: 'Unidentified', columns: 2 });
        }
    });

    /* ============================================================
       Credit card validation (Luhn)
       ============================================================ */
    define({
        id: 'credit-card-validator',
        name: 'Card Number Validator & Test Numbers',
        category: 'security',
        icon: 'file-check',
        description: 'Check a card number with the Luhn algorithm and generate valid test numbers.',
        tags: ['credit card', 'luhn', 'validate', 'test card', 'checkout', 'stripe', 'payment'],
        input: 'none',
        options: [
            {
                id: 'mode', type: 'radio', label: 'Action', value: 'validate',
                options: [{ value: 'validate', label: 'Validate a number' }, { value: 'generate', label: 'Generate test numbers' }]
            },
            { id: 'number', type: 'text', label: 'Card number', value: '', mono: true, placeholder: '4242 4242 4242 4242', when: function (o) { return o.mode === 'validate'; } },
            {
                id: 'brand', type: 'select', label: 'Card brand', value: 'visa',
                options: [
                    { value: 'visa', label: 'Visa' }, { value: 'mastercard', label: 'Mastercard' },
                    { value: 'amex', label: 'American Express' }, { value: 'discover', label: 'Discover' }
                ],
                when: function (o) { return o.mode === 'generate'; }
            },
            { id: 'count', type: 'number', label: 'How many', value: 5, min: 1, max: 100, when: function (o) { return o.mode === 'generate'; } },
            { id: 'note', type: 'note', text: 'These are structurally valid numbers for testing checkout forms. They are not real accounts, no bank will authorise them, and Luhn validity says nothing about whether a card exists or has funds.' }
        ],
        run: function (ctx) {
            var o = ctx.opt;

            if (o.mode === 'generate') {
                var PREFIXES = {
                    visa: { prefixes: ['4'], length: 16 },
                    mastercard: { prefixes: ['51', '52', '53', '54', '55'], length: 16 },
                    amex: { prefixes: ['34', '37'], length: 15 },
                    discover: { prefixes: ['6011', '65'], length: 16 }
                }[o.brand];

                var numbers = [];
                for (var i = 0; i < o.count; i++) {
                    var prefix = PREFIXES.prefixes[Math.floor(Math.random() * PREFIXES.prefixes.length)];
                    var digits = prefix;
                    while (digits.length < PREFIXES.length - 1) digits += Math.floor(Math.random() * 10);
                    numbers.push(digits + luhnCheckDigit(digits));
                }

                return ZT.textResult(numbers.join('\n'), {
                    mono: true,
                    note: o.count + ' Luhn-valid ' + o.brand + ' test numbers'
                });
            }

            var raw = String(o.number).replace(/[\s-]/g, '');
            if (!raw) {
                return ZT.dataResult([{ label: 'Waiting for input', value: 'Enter a card number above.' }], { title: 'Card validator' });
            }
            if (!/^\d+$/.test(raw)) ZT.fail('A card number should contain digits only.');

            var brand = detectBrand(raw);
            var valid = luhnCheck(raw);

            return ZT.dataResult([
                { label: 'Luhn check', value: valid ? 'PASS — the checksum is valid' : 'FAIL — the checksum does not match' },
                { label: 'Brand', value: brand },
                { label: 'Length', value: raw.length + ' digits' },
                { label: 'Formatted', value: raw.replace(/(\d{4})(?=\d)/g, '$1 ') },
                { label: 'What this means', value: 'The Luhn checksum catches typos. It cannot tell you whether the card exists, is active or has funds — only the issuer knows that.' }
            ], { title: 'Validation', columns: 1, mono: true });
        }
    });

    /** Luhn: double every second digit from the right, sum, check mod 10. */
    function luhnCheck(number) {
        var sum = 0;
        var alternate = false;
        for (var i = number.length - 1; i >= 0; i--) {
            var digit = parseInt(number[i], 10);
            if (alternate) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            alternate = !alternate;
        }
        return sum % 10 === 0;
    }

    function luhnCheckDigit(partial) {
        for (var d = 0; d < 10; d++) {
            if (luhnCheck(partial + d)) return String(d);
        }
        return '0';
    }

    function detectBrand(number) {
        if (/^4/.test(number)) return 'Visa';
        if (/^(5[1-5]|2[2-7])/.test(number)) return 'Mastercard';
        if (/^3[47]/.test(number)) return 'American Express';
        if (/^(6011|65|64[4-9])/.test(number)) return 'Discover';
        if (/^3(0[0-5]|[68])/.test(number)) return 'Diners Club';
        if (/^35/.test(number)) return 'JCB';
        if (/^62/.test(number)) return 'UnionPay';
        return 'Unrecognised';
    }

})();
