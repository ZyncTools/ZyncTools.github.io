window.ZyncTool = {
    process(input, ctx) {
        const { addResultItem, showNotification, showError, setStatus, setProgress } = ctx || {};
        const text = input || '';

        if (!text) {
            showError && showError('Empty input');
            return [];
        }

        setStatus && setStatus('Generating hashes...');

        const algos = [
            { name: 'MD5', fn: () => this._md5(text) },
            { name: 'SHA-1', fn: () => this._sha1(text) },
            { name: 'SHA-224', fn: () => this._sha224(text) },
            { name: 'SHA-256', fn: () => this._sha256(text) },
            { name: 'SHA-384', fn: () => this._sha384(text) },
            { name: 'SHA-512', fn: () => this._sha512(text) },
            { name: 'SHA3-256', fn: () => this._sha3_256(text) },
        ];

        const output = [];
        algos.forEach((algo, idx) => {
            try {
                setProgress && setProgress((idx + 1) / algos.length * 100);
                const hash = algo.fn();
                output.push(`${algo.name.padEnd(10)}: ${hash}`);
            } catch (e) {
                output.push(`${algo.name.padEnd(10)}: Error - ${e.message}`);
            }
        });

        const resultText = output.join('\n');
        const result = { name: 'hashes.txt', text: resultText, size: resultText.length };
        addResultItem && addResultItem(result);
        showNotification && showNotification('Hashes generated', 'success');
        return [result];
    },

    _md5(string) {
        function rotateLeft(lValue, iShiftBits) { return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits)); }
        function addUnsigned(lX, lY) {
            const lX8 = lX & 0x80000000, lY8 = lY & 0x80000000, lX4 = lX & 0x40000000, lY4 = lY & 0x40000000;
            const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
            if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
            if (lX4 | lY4) { if (lResult & 0x40000000) return lResult ^ 0xC0000000 ^ lX8 ^ lY8; return lResult ^ 0x40000000 ^ lX8 ^ lY8; }
            return lResult ^ lX8 ^ lY8;
        }
        function f(x, y, z) { return (x & y) | ((~x) & z); }
        function g(x, y, z) { return (x & z) | (y & (~z)); }
        function h(x, y, z) { return x ^ y ^ z; }
        function i(x, y, z) { return y ^ (x | (~z)); }
        function ff(a, b, c, d, x, s, ac) { a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac)); return addUnsigned(rotateLeft(a, s), b); }
        function gg(a, b, c, d, x, s, ac) { a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac)); return addUnsigned(rotateLeft(a, s), b); }
        function hh(a, b, c, d, x, s, ac) { a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac)); return addUnsigned(rotateLeft(a, s), b); }
        function ii(a, b, c, d, x, s, ac) { a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac)); return addUnsigned(rotateLeft(a, s), b); }
        function convertToWordArray(string) {
            let lWordCount, lMessageLength = string.length;
            const lNumberOfWordsTemp1 = lMessageLength + 8;
            const lNumberOfWordsTemp2 = (lNumberOfWordsTemp1 - (lNumberOfWordsTemp1 % 64)) / 64;
            const lNumberOfWords = (lNumberOfWordsTemp2 + 1) * 16;
            const lWordArray = new Array(lNumberOfWords - 1);
            let lBytePosition = 0, lByteCount = 0;
            while (lByteCount < lMessageLength) {
                lWordCount = (lByteCount - (lByteCount % 4)) / 4;
                lBytePosition = (lByteCount % 4) * 8;
                lWordArray[lWordCount] = lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition);
                lByteCount++;
            }
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
            lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
            lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
            return lWordArray;
        }
        const x = convertToWordArray(string);
        let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;
        for (let k = 0; k < x.length; k += 16) {
            const AA = a, BB = b, CC = c, DD = d;
            a = ff(a, b, c, d, x[k+0], 7, 0xD76AA478); d = ff(d, a, b, c, x[k+1], 12, 0xE8C7B756); c = ff(c, d, a, b, x[k+2], 17, 0x242070DB); b = ff(b, c, d, a, x[k+3], 22, 0xC1BDCEEE);
            a = ff(a, b, c, d, x[k+4], 7, 0xF57C0FAF); d = ff(d, a, b, c, x[k+5], 12, 0x4787C62A); c = ff(c, d, a, b, x[k+6], 17, 0xA8304613); b = ff(b, c, d, a, x[k+7], 22, 0xFD469501);
            a = ff(a, b, c, d, x[k+8], 7, 0x698098D8); d = ff(d, a, b, c, x[k+9], 12, 0x8B44F7AF); c = ff(c, d, a, b, x[k+10], 17, 0xFFFF5BB1); b = ff(b, c, d, a, x[k+11], 22, 0x895CD7BE);
            a = ff(a, b, c, d, x[k+12], 7, 0x6B901122); d = ff(d, a, b, c, x[k+13], 12, 0xFD987193); c = ff(c, d, a, b, x[k+14], 17, 0xA679438E); b = ff(b, c, d, a, x[k+15], 22, 0x49B40821);
            a = gg(a, b, c, d, x[k+1], 5, 0xF61E2562); d = gg(d, a, b, c, x[k+6], 9, 0xC040B340); c = gg(c, d, a, b, x[k+11], 14, 0x265E5A51); b = gg(b, c, d, a, x[k+0], 20, 0xE9B6C7AA);
            a = gg(a, b, c, d, x[k+5], 5, 0xD62F105D); d = gg(d, a, b, c, x[k+10], 9, 0x2441453); c = gg(c, d, a, b, x[k+15], 14, 0xD8A1E681); b = gg(b, c, d, a, x[k+4], 20, 0xE7D3FBC8);
            a = gg(a, b, c, d, x[k+9], 5, 0x21E1CDE6); d = gg(d, a, b, c, x[k+14], 9, 0xC33707D6); c = gg(c, d, a, b, x[k+3], 14, 0xF4D50D87); b = gg(b, c, d, a, x[k+8], 20, 0x455A14ED);
            a = gg(a, b, c, d, x[k+13], 5, 0xA9E3E905); d = gg(d, a, b, c, x[k+2], 9, 0xFCEFA3F8); c = gg(c, d, a, b, x[k+7], 14, 0x676F02D9); b = gg(b, c, d, a, x[k+12], 20, 0x8D2A4C8A);
            a = hh(a, b, c, d, x[k+5], 4, 0xFFFA3942); d = hh(d, a, b, c, x[k+8], 11, 0x8771F681); c = hh(c, d, a, b, x[k+11], 16, 0x6D9D6122); b = hh(b, c, d, a, x[k+14], 23, 0xFDE5380C);
            a = hh(a, b, c, d, x[k+1], 4, 0xA4BEEA44); d = hh(d, a, b, c, x[k+4], 11, 0x4BDECFA9); c = hh(c, d, a, b, x[k+7], 16, 0xF6BB4B60); b = hh(b, c, d, a, x[k+10], 23, 0xBEBFBC70);
            a = hh(a, b, c, d, x[k+13], 4, 0x289B7EC6); d = hh(d, a, b, c, x[k+0], 11, 0xEAA127FA); c = hh(c, d, a, b, x[k+3], 16, 0xD4EF3085); b = hh(b, c, d, a, x[k+6], 23, 0x4881D05);
            a = hh(a, b, c, d, x[k+9], 4, 0xD9D4D039); d = hh(d, a, b, c, x[k+12], 11, 0xE6DB99E5); c = hh(c, d, a, b, x[k+15], 16, 0x1FA27CF8); b = hh(b, c, d, a, x[k+2], 23, 0xC4AC5665);
            a = ii(a, b, c, d, x[k+0], 6, 0xF4292244); d = ii(d, a, b, c, x[k+7], 10, 0x432AFF97); c = ii(c, d, a, b, x[k+14], 15, 0xAB9423A7); b = ii(b, c, d, a, x[k+5], 21, 0xFC93A039);
            a = ii(a, b, c, d, x[k+12], 6, 0x655B59C3); d = ii(d, a, b, c, x[k+3], 10, 0x8F0CCC92); c = ii(c, d, a, b, x[k+10], 15, 0xFFEFF47D); b = ii(b, c, d, a, x[k+1], 21, 0x85845DD1);
            a = ii(a, b, c, d, x[k+8], 6, 0x6FA87E4F); d = ii(d, a, b, c, x[k+15], 10, 0xFE2CE6E0); c = ii(c, d, a, b, x[k+6], 15, 0xA3014314); b = ii(b, c, d, a, x[k+13], 21, 0x4E0811A1);
            a = ii(a, b, c, d, x[k+4], 6, 0xF7537E82); d = ii(d, a, b, c, x[k+11], 10, 0xBD3AF235); c = ii(c, d, a, b, x[k+2], 15, 0x2AD7D2BB); b = ii(b, c, d, a, x[k+9], 21, 0xEB86D391);
            a = addUnsigned(a, AA); b = addUnsigned(b, BB); c = addUnsigned(c, CC); d = addUnsigned(d, DD);
        }
        return this._toHexStr(a) + this._toHexStr(b) + this._toHexStr(c) + this._toHexStr(d);
    },

    _sha1(string) {
        let blockstart, i, j, W = new Array(80), H0 = 0x67452301, H1 = 0xEFCDAB89, H2 = 0x98BADCFE, H3 = 0x10325476, H4 = 0xC3D2E1F0, temp, A, B, C, D, E, M, count = string.length, wordArray = [], c = 0;
        while (c < count) { wordArray[c >>> 2] |= (string.charCodeAt(c) & 0xFF) << (24 - (c % 4) * 8); wordArray[(c + 1) >>> 2] |= ((string.charCodeAt(c) >>> 8) & 0xFF) << (24 - ((c + 1) % 4) * 8); wordArray[(c + 2) >>> 2] |= ((string.charCodeAt(c) >>> 16) & 0xFF) << (24 - ((c + 2) % 4) * 8); wordArray[(c + 3) >>> 2] |= ((string.charCodeAt(c) >>> 24) & 0xFF) << (24 - ((c + 3) % 4) * 8); c += 4; }
        wordArray[count >>> 2] |= 0x80 << (24 - (count % 4) * 8);
        wordArray[((count + 64) >>> 9) << 4] = count << 3;
        for (blockstart = 0; blockstart < wordArray.length; blockstart += 16) {
            for (i = 0; i < 16; i++) W[i] = wordArray[blockstart + i];
            for (i = 16; i <= 79; i++) W[i] = this._rotateLeft(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
            A = H0; B = H1; C = H2; D = H3; E = H4;
            for (i = 0; i <= 19; i++) { temp = (this._rotateLeft(A, 5) + ((B & C) | ((~B) & D)) + E + W[i] + 0x5A827999) & 0xFFFFFFFF; E = D; D = C; C = this._rotateLeft(B, 30); B = A; A = temp; }
            for (i = 20; i <= 39; i++) { temp = (this._rotateLeft(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0xFFFFFFFF; E = D; D = C; C = this._rotateLeft(B, 30); B = A; A = temp; }
            for (i = 40; i <= 59; i++) { temp = (this._rotateLeft(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0xFFFFFFFF; E = D; D = C; C = this._rotateLeft(B, 30); B = A; A = temp; }
            for (i = 60; i <= 79; i++) { temp = (this._rotateLeft(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0xFFFFFFFF; E = D; D = C; C = this._rotateLeft(B, 30); B = A; A = temp; }
            H0 = (H0 + A) & 0xFFFFFFFF; H1 = (H1 + B) & 0xFFFFFFFF; H2 = (H2 + C) & 0xFFFFFFFF; H3 = (H3 + D) & 0xFFFFFFFF; H4 = (H4 + E) & 0xFFFFFFFF;
        }
        return this._toHexStr(H0) + this._toHexStr(H1) + this._toHexStr(H2) + this._toHexStr(H3) + this._toHexStr(H4);
    },

    _rotateLeft(lValue, iShiftBits) { return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits)); },

    _toHexStr(dec) {
        let hex = '';
        for (let j = 0; j <= 3; j++) hex += String.fromCharCode((dec >>> (8 * (3 - j))) & 0xFF);
        let result = '';
        for (let k = 0; k < hex.length; k++) { result += '0123456789abcdef'.charAt((hex.charCodeAt(k) >>> 4) & 0xF) + '0123456789abcdef'.charAt(hex.charCodeAt(k) & 0xF); }
        return result;
    },

    _sha256(string) {
        const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
        const msg = new TextEncoder().encode(string);
        const len = msg.length * 8;
        const padded = new Uint8Array(msg.length + 1 + 8);
        padded.set(msg);
        padded[msg.length] = 0x80;
        const view = new DataView(padded.buffer);
        view.setUint32(padded.length - 4, Math.floor(len / 0x100000000), false);
        view.setUint32(padded.length, len, false);
        let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
        for (let offset = 0; offset < padded.length; offset += 64) {
            const w = new Uint32Array(64);
            for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
            for (let i = 16; i < 64; i++) {
                const s0 = this._rotr(w[i-15],7) ^ this._rotr(w[i-15],18) ^ (w[i-15]>>>3);
                const s1 = this._rotr(w[i-2],17) ^ this._rotr(w[i-2],19) ^ (w[i-2]>>>10);
                w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
            }
            let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
            for (let i=0;i<64;i++) {
                const S1 = this._rotr(e,6)^this._rotr(e,11)^this._rotr(e,25);
                const ch = (e&f)^((~e)&g);
                const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
                const S0 = this._rotr(a,2)^this._rotr(a,13)^this._rotr(a,22);
                const maj = (a&b)^(a&c)^(b&c);
                const temp2 = (S0 + maj) >>> 0;
                h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
            }
            h0=(h0+a)>>>0;h1=(h1+b)>>>0;h2=(h2+c)>>>0;h3=(h3+d)>>>0;h4=(h4+e)>>>0;h5=(h5+f)>>>0;h6=(h6+g)>>>0;h7=(h7+h)>>>0;
        }
        const hash = new Uint8Array(32);
        const hView = new DataView(hash.buffer);
        hView.setUint32(0,h0,false);hView.setUint32(4,h1,false);hView.setUint32(8,h2,false);hView.setUint32(12,h3,false);hView.setUint32(16,h4,false);hView.setUint32(20,h5,false);hView.setUint32(24,h6,false);hView.setUint32(28,h7,false);
        return Array.from(hash).map(b=>b.toString(16).padStart(2,'0')).join('');
    },

    _rotr(x, n) { return (x >>> n) | (x << (32 - n)); },

    _sha224(string) {
        const hash = this._sha256(string);
        return hash.slice(0, 56);
    },

    _sha384(string) {
        const hash = this._sha512(string);
        return hash.slice(0, 96);
    },

    _sha512(string) {
        const K = [0x428a2f98d728ae22,0x7137449123ef65cd,0xb5c0fbcfec4d3b2f,0xe9b5dba58189dbbc,0x3956c25bf348b538,0x59f111f1b605d019,0x923f82a4af194f9b,0xab1c5ed5da6d8118,0xd807aa98a3030242,0x12835b0145706fbe,0x243185be4ee4b28c,0x550c7dc3d5ffb4e2,0x72be5d74f27b896f,0x80deb1fe3b1696b1,0x9bdc06a725c71235,0xc19bf174cf692694,0xe49b69c19ef14ad2,0xefbe4786384f25e3,0x0fc19dc68b8cd5b5,0x240ca1cc77ac9c65,0x2de92c6f592b0275,0x4a7484aa6ea6e483,0x5cb0a9dcbd41fbd4,0x76f988da831153b5,0x983e5152ee66dfab,0xa831c66d2db43210,0xb00327c898fb213f,0xbf597fc7beef0ee4,0xc6e00bf433da5588,0xd5a79147930aa725,0x06ca6351e003826f,0x142929670a0e6e70,0x27b70a8546d22ffc,0x2e1b21385c26c926,0x4d2c6dfc5ac42aed,0x53380d139d95b3df,0x650a73548baf63de,0x766a0abb3c77b2a8,0x81c2c92e47edaee6,0x92722c851482353b,0xa2bfe8a14cf10364,0xa81a664bbc423001,0xc24b8b70d0f89791,0xc76c51a30654be30,0xd192e819d6ef5218,0xd69906245565a910,0xf40e35855771202a,0x106aa07032bbd1b8,0x19a4c116b8d2d0c8,0x1e376c085141ab53,0x2748774cdf8eeb99,0x34b0bcb5e19b48a8,0x391c0cb3c5c95a63,0x4ed8aa4ae3418acb,0x5b9cca4f7763e373,0x682e6ff3d6b2b8a3,0x748f82ee5defb2fc,0x78a5636f43172f60,0x84c87814a1f0ab72,0x8cc702081a6439ec,0x90befffa23631e28,0xa4506cebde82bde9,0xbef9a3f7b2c67915,0xc67178f2e372532b,0xca273eceea26619c,0xd186b8c721c0c207,0xeada7dd6cde0eb1e,0xf57d4f7fee6ed178,0x06f067aa72176fba,0x0a637dc5a2c898a6,0x113f9804bef90dae,0x1b710b35131c471b,0x28db77f523047d84,0x32caab7b40c72493,0x3c9ebe0a15c9bebc,0x431d67c49c100d4c,0x4cc5d4becb3e42b6,0x597f299cfc657e2a,0x5fcb6fab3ad6faec,0x6c44198c4a475817];
        const msg = new TextEncoder().encode(string);
        const len = msg.length * 8;
        const padded = new Uint8Array(msg.length + 1 + 16);
        padded.set(msg);
        padded[msg.length] = 0x80;
        const view = new DataView(padded.buffer);
        view.setUint32(padded.length - 8, Math.floor(len / 0x100000000), false);
        view.setUint32(padded.length, len, false);
        let h0 = 0x6a09e667f3bcc908, h1 = 0xbb67ae8584caa73b, h2 = 0x3c6ef372fe94f82b, h3 = 0xa54ff53a5f1d36f1, h4 = 0x510e527fade682d1, h5 = 0x9b05688c2b3e6c1f, h6 = 0x1f83d9abfb41bd6b, h7 = 0x5be0cd19137e2179;
        for (let offset = 0; offset < padded.length; offset += 128) {
            const w = new Uint32Array(80);
            for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 8, false);
            for (let i = 16; i < 80; i++) {
                const s0 = this._rotr(w[i-15],1)^this._rotr(w[i-15],8)^((w[i-15]>>>7));
                const s1 = this._rotr(w[i-2],19)^this._rotr(w[i-2],61)^((w[i-2]>>>6));
                w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
            }
            let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
            for (let i=0;i<80;i++) {
                const S1=this._rotr(e,14)^this._rotr(e,18)^this._rotr(e,41);
                const ch=(e&f)^((~e)&g);
                const temp1=((((h+S1+ch+K[i]+w[i])>>>0)%0x100000000)>>>0);
                const S0=this._rotr(a,28)^this._rotr(a,34)^this._rotr(a,39);
                const maj=(a&b)^(a&c)^(b&c);
                const temp2=(S0+maj)>>>0;
                h=g; g=f; f=e; e=(d+temp1)>>>0; d=c; c=b; b=a; a=(temp1+temp2)>>>0;
            }
            h0=(h0+a)>>>0;h1=(h1+b)>>>0;h2=(h2+c)>>>0;h3=(h3+d)>>>0;h4=(h4+e)>>>0;h5=(h5+f)>>>0;h6=(h6+g)>>>0;h7=(h7+h)>>>0;
        }
        const hash = new Uint8Array(64);
        const hView = new DataView(hash.buffer);
        hView.setUint32(0,h0,false);hView.setUint32(4,h1,false);hView.setUint32(8,h2,false);hView.setUint32(12,h3,false);hView.setUint32(16,h4,false);hView.setUint32(20,h5,false);hView.setUint32(24,h6,false);hView.setUint32(28,h7,false);
        hView.setUint32(32,0,false);hView.setUint32(36,0,false);hView.setUint32(40,0,false);hView.setUint32(44,0,false);
        hView.setUint32(48,0,false);hView.setUint32(52,0,false);hView.setUint32(56,0,false);hView.setUint32(60,0,false);
        return Array.from(hash).map(b=>b.toString(16).padStart(2,'0')).join('');
    },

    _sha3_256(string) {
        const msg = new TextEncoder().encode(string);
        const rate = 1088, capacity = 512;
        const state = new Uint8Array(200);
        msg.forEach((b, i) => state[i] ^= b);
        state[msg.length] ^= 0x06;
        state[199] ^= 0x80;
        for (let i = 0; i < msg.length + 1; i += (rate / 8)) this._keccakf(state);
        const output = new Uint8Array(32);
        let outIdx = 0;
        for (let i = 0; outIdx < 32; i += (rate / 8)) {
            this._keccakf(state);
            for (let j = 0; j < rate / 8 && outIdx < 32; j++) output[outIdx++] = state[i + j];
        }
        return Array.from(output).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    _keccakf(state) {
        const A = new Array(25);
        for (let i = 0; i < 25; i++) A[i] = 0;
        for (let i = 0; i < 200; i += 8) {
            A[i/8] = (state[i] | (state[i+1]<<8) | (state[i+2]<<16) | (state[i+3]<<24)) | 0;
            A[i/8] |= ((state[i+4] | (state[i+5]<<8) | (state[i+6]<<16) | (state[i+7]<<24)) << 32) | 0;
        }
        for (let r = 0; r < 24; r++) {
            const C = new Array(5), D = new Array(5);
            for (let i = 0; i < 5; i++) C[i] = A[i] ^ A[i+5] ^ A[i+10] ^ A[i+15] ^ A[i+20];
            for (let i = 0; i < 5; i++) D[i] = C[(i+4)%5] ^ this._rotl64(C[(i+1)%5], 1);
            for (let i = 0; i < 25; i++) A[i] ^= D[i % 5];
            const B = new Array(25);
            for (let i = 0; i < 25; i++) B[i] = this._rotl64(A[(i%5) * 5 + Math.floor(i/5)], (i+1)*(i+2)/2%64);
            for (let i = 0; i < 25; i++) A[i] = B[i] ^ (~A[((i%5)*5+Math.floor(i/5)+1)%25] & A[((i%5)*5+Math.floor(i/5)+2)%25]);
            A[0] ^= 0x0000000000000001;
        }
        for (let i = 0; i < 200; i += 8) {
            const v = A[i/8];
            state[i] = v & 0xFF; state[i+1] = (v>>>8) & 0xFF; state[i+2] = (v>>>16) & 0xFF; state[i+3] = (v>>>24) & 0xFF;
            state[i+4] = (v>>>32) & 0xFF; state[i+5] = (v>>>40) & 0xFF; state[i+6] = (v>>>48) & 0xFF; state[i+7] = (v>>>56) & 0xFF;
        }
    },

    _rotl64(x, n) { return ((x << n) | (x >>> (64 - n))) | 0; }
};
