window.ZyncTool = {
    process(input, ctx) {
        const { addResultItem, showNotification, showError, setStatus } = ctx || {};
        const options = (ctx && ctx.config) || {};
        const type = options.type || 'text';
        const content = options.content || (input || '').trim();
        const size = Math.max(128, Math.min(1024, parseInt(options.size) || 256));
        const color = options.color || '#000000';
        const bgColor = options.bgColor || '#ffffff';
        const ecc = options.ecc || 'M';
        const margin = parseInt(options.margin) || 4;

        if (!content) {
            showError && showError('Empty QR content');
            return [];
        }

        setStatus && setStatus('Generating QR code...');

        const encodedData = this._encode(content, type, ecc);
        const modules = this._buildMatrix(encodedData, ecc);
        const moduleCount = modules.length;
        const cellSize = Math.floor(size / (moduleCount + margin * 2));
        const svgSize = cellSize * (moduleCount + margin * 2);

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}">`;
        svg += `<rect width="${svgSize}" height="${svgSize}" fill="${bgColor}"/>`;
        for (let r = 0; r < moduleCount; r++) {
            for (let c = 0; c < moduleCount; c++) {
                if (modules[r][c]) {
                    const x = (c + margin) * cellSize;
                    const y = (r + margin) * cellSize;
                    svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${color}"/>`;
                }
            }
        }

        if (options.frame) {
            const frameWidth = Math.max(2, Math.floor(cellSize * 0.5));
            svg += `<rect x="0" y="0" width="${svgSize}" height="${svgSize}" fill="none" stroke="${color}" stroke-width="${frameWidth}"/>`;
        }

        if (options.logo) {
            const logoSize = Math.floor(moduleCount * 0.2) * cellSize;
            const logoX = (svgSize - logoSize) / 2;
            const logoY = (svgSize - logoSize) / 2;
            svg += `<rect x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" fill="${bgColor}"/>`;
            svg += `<rect x="${logoX + 2}" y="${logoY + 2}" width="${logoSize - 4}" height="${logoSize - 4}" fill="none" stroke="${color}" stroke-width="1"/>`;
            svg += `<text x="${svgSize/2}" y="${svgSize/2 + logoSize*0.15}" text-anchor="middle" font-size="${logoSize*0.6}" fill="${color}">Z</text>`;
        }

        svg += '</svg>';

        const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));

        const result = { name: 'qrcode.svg', text: svg, size: svg.length, url: dataUrl };
        addResultItem && addResultItem(result);
        showNotification && showNotification('QR code generated', 'success');
        return [result];
    },

    _encode(text, type, ecc) {
        let data = text;
        if (type === 'url') data = text.startsWith('http') ? text : 'https://' + text;
        else if (type === 'email') data = 'mailto:' + text;
        else if (type === 'phone') data = 'tel:' + text.replace(/[^0-9+]/g, '');
        else if (type === 'sms') data = 'sms:' + text;
        else if (type === 'wifi') data = 'WIFI:T:WPA;S:' + text + ';;';
        else if (type === 'vcard') data = 'BEGIN:VCARD\nVERSION:3.0\nFN:' + text + '\nEND:VCARD';
        else if (type === 'location') data = 'geo:' + text;

        const bytes = new TextEncoder().encode(data);
        const bits = [];
        bits.push(0, 1, 0, 0);
        const mode = 0b0100;
        bits.push((mode >> 3) & 1, (mode >> 2) & 1, (mode >> 1) & 1, mode & 1);
        const len = bytes.length;
        for (let i = 13; i >= 0; i--) bits.push((len >> i) & 1);
        for (const b of bytes) {
            for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
        }
        return bits;
    },

    _buildMatrix(data, ecc) {
        const version = 1;
        const size = version * 4 + 17;
        const matrix = Array.from({ length: size }, () => Array(size).fill(false));

        this._addFinderPatterns(matrix, size);
        this._addAlignmentPatterns(matrix, size, version);
        this._addTimingPatterns(matrix, size);
        matrix[8][size - 8] = true;
        const reserved = Array.from({ length: size }, () => Array(size).fill(false));
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (matrix[r][c]) reserved[r][c] = true;
            }
        }
        for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) reserved[r][c] = true;
        for (let r = 0; r < 9; r++) for (let c = size - 8; c < size; c++) reserved[r][c] = true;
        for (let r = size - 8; r < size; r++) for (let c = 0; c < 9; c++) reserved[r][c] = true;

        let bitIdx = 0;
        const dir = 1;
        for (let c = size - 1; c > 0; c -= 2) {
            if (c === 6) c--;
            for (let i = 0; i < size; i++) {
                const r = dir === 1 ? size - 1 - i : i;
                for (let cc = 0; cc < 2; cc++) {
                    const col = c - cc;
                    if (col < 0 || col >= size || reserved[r][col]) continue;
                    if (bitIdx < data.length) {
                        matrix[r][col] = !!data[bitIdx++];
                    } else {
                        matrix[r][col] = false;
                    }
                }
            }
            dir *= -1;
        }

        return matrix;
    },

    _addFinderPatterns(matrix, size) {
        const positions = [[0, 0], [size - 7, 0], [0, size - 7]];
        positions.forEach(([r, c]) => {
            for (let dr = 0; dr < 7; dr++) {
                for (let dc = 0; dc < 7; dc++) {
                    const val = dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
                    matrix[r + dr][c + dc] = val;
                }
            }
            for (let dr = 0; dr < 8; dr++) {
                for (let dc = 0; dc < 8; dc++) {
                    if (dr === 7 || dc === 7) {
                        const rr = r + dr, cc = c + dc;
                        if (rr < size && cc < size) matrix[rr][cc] = false;
                    }
                }
            }
        });
    },

    _addAlignmentPatterns(matrix, size, version) {
        const positions = this._getAlignmentPositions(version);
        positions.forEach(r => positions.forEach(c => {
            if (matrix[r][c]) return;
            for (let dr = -2; dr <= 2; dr++) {
                for (let dc = -2; dc <= 2; dc++) {
                    const val = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
                    if (r + dr >= 0 && r + dr < size && c + dc >= 0 && c + dc < size) {
                        matrix[r + dr][c + dc] = val;
                    }
                }
            }
        }));
    },

    _getAlignmentPositions(version) {
        if (version === 1) return [];
        const size = version * 4 + 17;
        const intervals = version <= 6 ? [6, 18] : version <= 13 ? [6, 22] : version <= 20 ? [6, 26] : version <= 27 ? [6, 30] : version <= 34 ? [6, 34] : [6, 30, 54];
        const positions = [size - 7];
        for (let i = intervals.length - 1; i >= 0; i--) {
            positions.unshift(intervals[i]);
            if (positions[0] === positions[1]) positions.shift();
        }
        return positions;
    },

    _addTimingPatterns(matrix, size) {
        for (let i = 8; i < size - 8; i++) {
            matrix[6][i] = i % 2 === 0;
            matrix[i][6] = i % 2 === 0;
        }
    }
};
