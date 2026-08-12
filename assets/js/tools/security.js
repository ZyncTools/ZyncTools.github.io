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

})();
