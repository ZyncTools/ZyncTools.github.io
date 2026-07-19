/**
 * ZyncTools — Dev Utilities Module
 * CSS generators, data converters, and developer tools.
 */

window.ZyncDevUtils = (function () {
    'use strict';

    /* ============================================
       CSS GENERATORS
       ============================================ */

    function generateBoxShadow({ x, y, blur, spread, color, alpha, inset = false }) {
        const c = color || '0';
        const a = alpha || 0.5;
        const shadow = `${x || 0}px ${y || 0}px ${blur || 10}px ${spread || 0}px rgba(${c}, ${a})`;
        return inset ? `box-shadow: inset ${shadow};` : `box-shadow: ${shadow};`;
    }

    function generateGradient({ type = 'linear', direction, colors, angle }) {
        const stops = (colors || []).map((c, i) => `${c} ${(i / Math.max(1, colors.length - 1)) * 100}%`).join(', ');
        
        if (type === 'radial') {
            return `background: radial-gradient(circle, ${stops});`;
        } else if (type === 'conic') {
            return `background: conic-gradient(from ${angle || 0}deg, ${stops});`;
        } else {
            return `background: linear-gradient(${angle || 180}deg, ${stops});`;
        }
    }

    function generateBorderRadius({ topLeft, topRight, bottomRight, bottomLeft }) {
        const tl = topLeft || 0;
        const tr = topRight || 0;
        const br = bottomRight || 0;
        const bl = bottomLeft || 0;
        
        if (tl === tr && tr === br && br === bl) {
            return `border-radius: ${tl}px;`;
        }
        return `border-radius: ${tl}px ${tr}px ${br}px ${bl}px;`;
    }

    function generateFlexbox({ direction, justify, align, gap }) {
        return `.flex-container {
  display: flex;
  flex-direction: ${direction || 'row'};
  justify-content: ${justify || 'flex-start'};
  align-items: ${align || 'stretch'};
  gap: ${gap || '0'};
}`;
    }

    function generateCssGrid({ columns, rows, gap }) {
        const cols = columns || 'repeat(3, 1fr)';
        return `.grid-container {
  display: grid;
  grid-template-columns: ${cols};
  grid-template-rows: ${rows || 'auto'};
  gap: ${gap || '1rem'};}`;
    }

    function generateClipPath({ type, values }) {
        const clipValues = values || '50% 0%, 100% 50%, 50% 100%, 0% 50%';
        
        switch (type) {
            case 'circle':
                return `clip-path: circle(${values || '50%'});`;
            case 'polygon':
                return `clip-path: polygon(${clipValues});`;
            case 'ellipse':
                return `clip-path: ellipse(${values || '50% 50%'});`;
            case 'inset':
                return `clip-path: inset(${values || '0%'});`;
            default:
                return `clip-path: polygon(${clipValues});`;
        }
    }

    function generateGlassmorphism({ blur, opacity, border, saturation }) {
        return `.glass {
  background: rgba(255, 255, 255, ${opacity || 0.1});
  backdrop-filter: blur(${blur || 10}px) saturate(${saturation || 180}%);
  -webkit-backdrop-filter: blur(${blur || 10}px) saturate(${saturation || 180}%);
  border: ${border || '1px'} solid rgba(255, 255, 255, ${(opacity || 0.1) * 1.5});
  border-radius: 16px;
}`;
    }

    /* ============================================
       DATA CONVERTERS
       ============================================ */

    function csvToJson(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const results = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const obj = {};
            headers.forEach((h, idx) => {
                obj[h] = values[idx] || '';
            });
            results.push(obj);
        }
        
        return results;
    }

    function jsonToCsv(jsonData) {
        if (!Array.isArray(jsonData) || !jsonData.length) return '';
        
        const headers = Object.keys(jsonData[0]);
        const rows = [headers.join(',')];
        
        jsonData.forEach(item => {
            const row = headers.map(h => {
                const val = item[h] || '';
                return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
            });
            rows.push(row.join(','));
        });
        
        return rows.join('\n');
    }

    function xmlToJson(xmlText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'text/xml');
        const errors = doc.querySelectorAll('parsererror');
        
        if (errors.length) {
            throw new Error('Invalid XML');
        }
        
        function nodeToJson(node) {
            if (node.nodeType === 3) return node.textContent.trim();
            
            const obj = {};
            node.childNodes.forEach(child => {
                if (child.nodeType === 1) {
                    const key = child.tagName;
                    const value = nodeToJson(child);
                    if (obj[key]) {
                        if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
                        obj[key].push(value);
                    } else {
                        obj[key] = value;
                    }
                }
            });
            return obj;
        }
        
        return nodeToJson(doc.documentElement);
    }

    function jsonToXml(obj, rootName = 'root') {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n`;
        
        function buildXml(data, indent = 2) {
            let result = '';
            if (Array.isArray(data)) {
                data.forEach(item => {
                    result += ' '.repeat(indent) + `<item>\n`;
                    result += buildXml(item, indent + 2);
                    result += ' '.repeat(indent) + `</item>\n`;
                });
            } else if (typeof data === 'object' && data !== null) {
                Object.entries(data).forEach(([key, value]) => {
                    result += ' '.repeat(indent) + `<${key}>`;
                    if (typeof value === 'object') {
                        result += '\n' + buildXml(value, indent + 2) + ' '.repeat(indent);
                    } else {
                        result += escapeHtml(String(value));
                    }
                    result += `</${key}>\n`;
                });
            } else {
                result += escapeHtml(String(data));
            }
            return result;
        }
        
        xml += buildXml(obj);
        xml += `</${rootName}>`;
        return xml;
    }

    function sqlToJson(sqlText) {
        // Basic SQL result simulation
        const lines = sqlText.trim().split('\n');
        if (lines.length < 2) return [];
        
        const headers = lines[0].split('|').map(h => h.trim());
        const results = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split('|').map(v => v.trim());
            const obj = {};
            headers.forEach((h, idx) => {
                obj[h] = values[idx] || '';
            });
            results.push(obj);
        }
        
        return results;
    }

    function yamlToJson(yamlText) {
        // Simplified YAML parser
        const lines = yamlText.split('\n');
        const result = {};
        let current = result;
        const stack = [{ obj: result, indent: -1 }];
        
        lines.forEach(line => {
            if (!line.trim() || line.trim().startsWith('#')) return;
            
            const indent = line.search(/\S|$/);
            const content = line.trim();
            
            while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
                stack.pop();
            }
            
            current = stack[stack.length - 1].obj;
            
            if (content.includes(':')) {
                const [key, value] = content.split(':').map(s => s.trim());
                if (value) {
                    current[key] = isNaN(value) ? value : Number(value);
                } else {
                    current[key] = {};
                    stack.push({ obj: current[key], indent });
                }
            }
        });
        
        return result;
    }

    /* ============================================
       SECURITY UTILITIES
       ============================================ */

    function decodeJwt(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) throw new Error('Invalid JWT');
            
            const header = JSON.parse(atob(parts[0]));
            const payload = JSON.parse(atob(parts[1]));
            
            return { header, payload };
        } catch (e) {
            throw new Error('Invalid JWT token');
        }
    }

    function generateUuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    function generateBcrypt(rounds = 10) {
        // Simulated bcrypt generator
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let hash = '$2a$' + String(rounds).padStart(2, '0') + '$';
        for (let i = 0; i < 22; i++) {
            hash += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return hash;
    }

    /* ============================================
       NETWORK UTILITIES
       ============================================ */

    function parseUserAgent(ua) {
        const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)?.[1] || 'Unknown';
        const os = ua.match(/(Windows|Mac|Linux|Android|iOS) [\d._]+/)?.[0] || 'Unknown';
        const device = ua.match(/(Mobile|Tablet|Desktop)/)?.[0] || 'Desktop';
        
        return { browser, os, device, full: ua };
    }

    async function lookupIp(ip) {
        try {
            const res = await fetch(`https://ipapi.co/${ip}/json/`);
            const data = await res.json();
            return {
                ip: data.ip,
                city: data.city,
                region: data.region,
                country: data.country_name,
                org: data.org,
                timezone: data.timezone
            };
        } catch (e) {
            return { error: 'Lookup failed' };
        }
    }

    function simulateDnsLookup(domain) {
        const records = {
            'A': `93.184.216.34`,
            'AAAA': `2606:2800:220:1:248:1893:25c8:1946`,
            'MX': `10 mail.${domain}`,
            'NS': `ns1.${domain}, ns2.${domain}`,
            'TXT': `v=spf1 include:_spf.google.com ~all`
        };
        
        return Object.entries(records).map(([type, value]) => ({
            type,
            value,
            ttl: 3600
        }));
    }

    function getHttpStatusInfo(code) {
        const statuses = {
            200: 'OK',
            301: 'Moved Permanently',
            302: 'Found',
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable'
        };
        
        return {
            code: parseInt(code),
            message: statuses[code] || 'Unknown Status',
            description: `HTTP ${code} - ${statuses[code] || 'Unknown'}`
        };
    }

    /* ============================================
       UTILITIES
       ============================================ */

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function copyToClipboard(text) {
        if (navigator.clipboard) {
            return navigator.clipboard.writeText(text);
        }
        return Promise.reject(new Error('Clipboard not available'));
    }

    /* ============================================
       PUBLIC API
       ============================================ */

    return {
        // CSS Generators
        generateBoxShadow,
        generateGradient,
        generateBorderRadius,
        generateFlexbox,
        generateCssGrid,
        generateClipPath,
        generateGlassmorphism,
        
        // Data Converters
        csvToJson,
        jsonToCsv,
        xmlToJson,
        jsonToXml,
        sqlToJson,
        yamlToJson,
        
        // Security
        decodeJwt,
        generateUuid,
        generateBcrypt,
        
        // Network
        parseUserAgent,
        lookupIp,
        simulateDnsLookup,
        getHttpStatusInfo,
        
        // Utilities
        escapeHtml,
        downloadFile,
        copyToClipboard
    };
})();
