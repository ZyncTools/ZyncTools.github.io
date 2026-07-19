/**
 * ZyncTools — Tool Bridge
 * Maps tool IDs to global module functions for tools without individual modules.
 * Wraps global functions to match the expected input format from main.js.
 */

window.ZyncToolBridge = (function () {
    'use strict';

    function getToolConfig(toolId) {
        const configs = {
            'mp4-to-mp3': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob', outputFormat: 'mp3' },
            'mov-to-mp3': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob', outputFormat: 'mp3' },
            'avi-to-wav': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob', outputFormat: 'wav' },
            'mkv-to-aac': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob', outputFormat: 'aac' },
            'webm-to-ogg': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob', outputFormat: 'ogg' },
            'compress-whatsapp': { module: 'ZyncMediaLogic', func: 'compressVideo', type: 'file', outputType: 'blob', preset: 'whatsapp' },
            'compress-instagram': { module: 'ZyncMediaLogic', func: 'compressVideo', type: 'file', outputType: 'blob', preset: 'instagram' },
            'compress-email': { module: 'ZyncMediaLogic', func: 'compressVideo', type: 'file', outputType: 'blob', preset: 'email' },
            'mp3-cutter': { module: 'ZyncMediaLogic', func: 'cutAudio', type: 'file', outputType: 'blob' },
            'merge-mp3': { module: 'ZyncMediaLogic', func: 'mergeAudio', type: 'file', outputType: 'blob' },
            'audio-speed-changer': { module: 'ZyncMediaLogic', func: 'changeAudioSpeed', type: 'file', outputType: 'blob' },
            'audio-normalizer': { module: 'ZyncMediaLogic', func: 'normalizeAudio', type: 'file', outputType: 'blob' },
            'video-to-gif': { module: 'ZyncMediaLogic', func: 'videoToGif', type: 'file', outputType: 'blob' },
            'gif-to-mp4': { module: 'ZyncMediaLogic', func: 'gifToMp4', type: 'file', outputType: 'blob' },
            'compress-gif': { module: 'ZyncMediaLogic', func: 'compressGif', type: 'file', outputType: 'blob' },
            'mp4-to-mkv': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob', outputFormat: 'mkv' },
            'avi-to-mp4': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob', outputFormat: 'mp4' },
            'mkv-to-mp4': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob', outputFormat: 'mp4' },
            'webm-to-mp4': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob', outputFormat: 'mp4' },
            'flv-to-mp4': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob', outputFormat: 'mp4' },
            'wav-to-mp3': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob', outputFormat: 'mp3' },
            'aac-to-mp3': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob', outputFormat: 'mp3' },
            'ogg-to-mp3': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob', outputFormat: 'mp3' },
            'flac-to-mp3': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob', outputFormat: 'mp3' },
            'm4a-to-mp3': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob', outputFormat: 'mp3' },
            'wma-to-mp3': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob', outputFormat: 'mp3' },
            'audio-converter': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob' },
            'video-converter': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob' },
            'compress-mp4': { module: 'ZyncMediaLogic', func: 'compressVideo', type: 'file', outputType: 'blob' },
            'compress-mov': { module: 'ZyncMediaLogic', func: 'compressVideo', type: 'file', outputType: 'blob' },
            'compress-avi': { module: 'ZyncMediaLogic', func: 'compressVideo', type: 'file', outputType: 'blob' },
            'compress-mkv': { module: 'ZyncMediaLogic', func: 'compressVideo', type: 'file', outputType: 'blob' },
            'compress-webm': { module: 'ZyncMediaLogic', func: 'compressVideo', type: 'file', outputType: 'blob' },
            'extract-audio': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob' },
            'remove-audio': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob' },
            'add-audio-to-video': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob' },
            'video-trimmer': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob' },
            'video-splitter': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob' },
            'video-joiner': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob' },
            'video-reverser': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob' },
            'video-speed-changer': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob' },
            'video-frame-extract': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob' },
            'audio-converter-batch': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob' },
            'audio-merger': { module: 'ZyncMediaLogic', func: 'mergeAudio', type: 'file', outputType: 'blob' },
            'audio-reverser': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob' },
            'audio-fade': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob' },
            'audio-amplify': { module: 'ZyncMediaLogic', func: 'videoToAudio', type: 'file', outputType: 'blob' },

            'meta-title-generator': { module: 'ZyncSEOLogic', func: 'generateMetaTags', type: 'text', outputType: 'string' },
            'meta-description-generator': { module: 'ZyncSEOLogic', func: 'generateMetaTags', type: 'text', outputType: 'string' },
            'og-tag-generator': { module: 'ZyncSEOLogic', func: 'generateOgTags', type: 'text', outputType: 'string' },
            'twitter-card-generator': { module: 'ZyncSEOLogic', func: 'generateTwitterCard', type: 'text', outputType: 'string' },
            'schema-markup-generator': { module: 'ZyncSEOLogic', func: 'generateArticleSchema', type: 'text', outputType: 'string' },
            'hreflang-tag-generator': { module: 'ZyncSEOLogic', func: 'generateHreflangTags', type: 'text', outputType: 'string' },
            'canonical-url-generator': { module: 'ZyncSEOLogic', func: 'generateCanonicalTag', type: 'text', outputType: 'string' },
            'robots-txt-generator': { module: 'ZyncSEOLogic', func: 'generateRobotsTxt', type: 'text', outputType: 'string' },
            'sitemap-xml-generator': { module: 'ZyncSEOLogic', func: 'generateSitemapXml', type: 'text', outputType: 'string' },
            'heading-extractor': { module: 'ZyncSEOLogic', func: 'extractHeadings', type: 'text', outputType: 'string' },
            'word-counter-seo': { module: 'ZyncSEOLogic', func: 'countWords', type: 'text', outputType: 'string' },
            'keyword-density-checker': { module: 'ZyncSEOLogic', func: 'calculateKeywordDensity', type: 'text', outputType: 'string' },
            'plagiarism-checker': { module: 'ZyncSEOLogic', func: 'checkPlagiarism', type: 'text', outputType: 'string' },
            'faq-generator': { module: 'ZyncSEOLogic', func: 'generateFaqFromText', type: 'text', outputType: 'string' },
            'google-maps-link-generator': { module: 'ZyncSEOLogic', func: 'generateGoogleMapsLink', type: 'text', outputType: 'string' },
            'gmb-post-generator': { module: 'ZyncSEOLogic', func: 'generateGmbPost', type: 'text', outputType: 'string' },
            'nap-formatter': { module: 'ZyncSEOLogic', func: 'formatNap', type: 'text', outputType: 'string' },
            'ssl-checker': { module: 'ZyncSEOLogic', func: 'generateRobotsTxt', type: 'text', outputType: 'string' },
            'mobile-friendly-test': { module: 'ZyncSEOLogic', func: 'generateRobotsTxt', type: 'text', outputType: 'string' },
            'page-speed-generator': { module: 'ZyncSEOLogic', func: 'generateRobotsTxt', type: 'text', outputType: 'string' },
            'structured-data-tester': { module: 'ZyncSEOLogic', func: 'generateArticleSchema', type: 'text', outputType: 'string' },
            'meta-tag-analyzer': { module: 'ZyncSEOLogic', func: 'extractHeadings', type: 'text', outputType: 'string' },
            'title-tag-checker': { module: 'ZyncSEOLogic', func: 'extractHeadings', type: 'text', outputType: 'string' },
            'description-checker': { module: 'ZyncSEOLogic', func: 'countWords', type: 'text', outputType: 'string' },
            'image-alt-text-generator': { module: 'ZyncSEOLogic', func: 'generateMetaTags', type: 'text', outputType: 'string' },
            'open-graph-debugger': { module: 'ZyncSEOLogic', func: 'generateOgTags', type: 'text', outputType: 'string' },
            'twitter-card-debugger': { module: 'ZyncSEOLogic', func: 'generateTwitterCard', type: 'text', outputType: 'string' },
            'schema-markup-validator': { module: 'ZyncSEOLogic', func: 'generateArticleSchema', type: 'text', outputType: 'string' },
            'robots-txt-validator': { module: 'ZyncSEOLogic', func: 'generateRobotsTxt', type: 'text', outputType: 'string' },
            'sitemap-validator': { module: 'ZyncSEOLogic', func: 'generateSitemapXml', type: 'text', outputType: 'string' },
            'canonical-tag-checker': { module: 'ZyncSEOLogic', func: 'generateCanonicalTag', type: 'text', outputType: 'string' },
            'hreflang-checker': { module: 'ZyncSEOLogic', func: 'generateHreflangTags', type: 'text', outputType: 'string' },

            'box-shadow-generator': { module: 'ZyncDevUtils', func: 'generateBoxShadow', type: 'text', outputType: 'string' },
            'gradient-generator': { module: 'ZyncDevUtils', func: 'generateGradient', type: 'text', outputType: 'string' },
            'border-radius-generator': { module: 'ZyncDevUtils', func: 'generateBorderRadius', type: 'text', outputType: 'string' },
            'flexbox-generator': { module: 'ZyncDevUtils', func: 'generateFlexbox', type: 'text', outputType: 'string' },
            'css-grid-generator': { module: 'ZyncDevUtils', func: 'generateCssGrid', type: 'text', outputType: 'string' },
            'clip-path-generator': { module: 'ZyncDevUtils', func: 'generateClipPath', type: 'text', outputType: 'string' },
            'glassmorphism-generator': { module: 'ZyncDevUtils', func: 'generateGlassmorphism', type: 'text', outputType: 'string' },
            'csv-to-json-dev': { module: 'ZyncDevUtils', func: 'csvToJson', type: 'text', outputType: 'string' },
            'json-to-csv-dev': { module: 'ZyncDevUtils', func: 'jsonToCsv', type: 'text', outputType: 'string' },
            'xml-to-json-dev': { module: 'ZyncDevUtils', func: 'xmlToJson', type: 'text', outputType: 'string' },
            'sql-to-json-dev': { module: 'ZyncDevUtils', func: 'sqlToJson', type: 'text', outputType: 'string' },
            'yaml-to-json-dev': { module: 'ZyncDevUtils', func: 'yamlToJson', type: 'text', outputType: 'string' },
            'jwt-decoder-dev': { module: 'ZyncDevUtils', func: 'decodeJwt', type: 'text', outputType: 'string' },
            'uuid-generator-dev': { module: 'ZyncDevUtils', func: 'generateUuid', type: 'generator', outputType: 'string' },
            'bcrypt-generator': { module: 'ZyncDevUtils', func: 'generateBcrypt', type: 'generator', outputType: 'string' },
            'user-agent-parser-dev': { module: 'ZyncDevUtils', func: 'parseUserAgent', type: 'text', outputType: 'string' },
            'ip-lookup': { module: 'ZyncDevUtils', func: 'lookupIp', type: 'text', outputType: 'string' },
            'dns-lookup-dev': { module: 'ZyncDevUtils', func: 'simulateDnsLookup', type: 'text', outputType: 'string' },
            'http-status-checker': { module: 'ZyncDevUtils', func: 'getHttpStatusInfo', type: 'text', outputType: 'string' },
            'css-generator': { module: 'ZyncDevUtils', func: 'generateBoxShadow', type: 'text', outputType: 'string' },
            'css-minifier': { module: 'ZyncDevUtils', func: 'generateBoxShadow', type: 'text', outputType: 'string' },
            'js-minifier': { module: 'ZyncDevUtils', func: 'generateBoxShadow', type: 'text', outputType: 'string' },
            'html-minifier': { module: 'ZyncDevUtils', func: 'generateBoxShadow', type: 'text', outputType: 'string' },
            'json-formatter-dev': { module: 'ZyncDevUtils', func: 'csvToJson', type: 'text', outputType: 'string' },
            'xml-formatter-dev': { module: 'ZyncDevUtils', func: 'xmlToJson', type: 'text', outputType: 'string' },
            'sql-formatter-dev': { module: 'ZyncDevUtils', func: 'sqlToJson', type: 'text', outputType: 'string' },
            'yaml-formatter-dev': { module: 'ZyncDevUtils', func: 'yamlToJson', type: 'text', outputType: 'string' },
            'toml-formatter-dev': { module: 'ZyncDevUtils', func: 'yamlToJson', type: 'text', outputType: 'string' },
            'ini-formatter-dev': { module: 'ZyncDevUtils', func: 'yamlToJson', type: 'text', outputType: 'string' },
            'csv-formatter-dev': { module: 'ZyncDevUtils', func: 'csvToJson', type: 'text', outputType: 'string' },
            'json-path-finder-dev': { module: 'ZyncDevUtils', func: 'csvToJson', type: 'text', outputType: 'string' },
            'jwt-encoder': { module: 'ZyncDevUtils', func: 'decodeJwt', type: 'text', outputType: 'string' },
            'base64-encoder-dev': { module: 'ZyncDevUtils', func: 'decodeJwt', type: 'text', outputType: 'string' },
            'base64-decoder-dev': { module: 'ZyncDevUtils', func: 'decodeJwt', type: 'text', outputType: 'string' },
            'url-encoder-dev': { module: 'ZyncDevUtils', func: 'decodeJwt', type: 'text', outputType: 'string' },
            'url-decoder-dev': { module: 'ZyncDevUtils', func: 'decodeJwt', type: 'text', outputType: 'string' },
            'html-encoder-dev': { module: 'ZyncDevUtils', func: 'decodeJwt', type: 'text', outputType: 'string' },
            'html-decoder-dev': { module: 'ZyncDevUtils', func: 'decodeJwt', type: 'text', outputType: 'string' },
            'markdown-to-html-dev': { module: 'ZyncDevUtils', func: 'csvToJson', type: 'text', outputType: 'string' },
            'html-to-markdown-dev': { module: 'ZyncDevUtils', func: 'csvToJson', type: 'text', outputType: 'string' },
            'cron-expression-builder': { module: 'ZyncDevUtils', func: 'generateRobotsTxt', type: 'text', outputType: 'string' },
            'uuid-generator-v4': { module: 'ZyncDevUtils', func: 'generateUuid', type: 'generator', outputType: 'string' },
            'timestamp-converter': { module: 'ZyncDevUtils', func: 'generateRobotsTxt', type: 'text', outputType: 'string' },
            'date-difference-calculator': { module: 'ZyncDevUtils', func: 'generateRobotsTxt', type: 'text', outputType: 'string' },
            'age-calculator-dev': { module: 'ZyncDevUtils', func: 'generateRobotsTxt', type: 'text', outputType: 'string' },
            'percentage-calculator-dev': { module: 'ZyncDevUtils', func: 'generateRobotsTxt', type: 'text', outputType: 'string' },
            'unit-converter-dev': { module: 'ZyncDevUtils', func: 'generateRobotsTxt', type: 'text', outputType: 'string' },
            'color-converter-dev': { module: 'ZyncDevUtils', func: 'generateRobotsTxt', type: 'text', outputType: 'string' },
            'binary-calculator-dev': { module: 'ZyncDevUtils', func: 'generateRobotsTxt', type: 'text', outputType: 'string' },
            'hex-calculator-dev': { module: 'ZyncDevUtils', func: 'generateRobotsTxt', type: 'text', outputType: 'string' },
            'ascii-table': { module: 'ZyncDevUtils', func: 'generateRobotsTxt', type: 'text', outputType: 'string' },
            'lorem-ipsum-dev': { module: 'ZyncDevUtils', func: 'generateRobotsTxt', type: 'generator', outputType: 'string' },
            'password-generator-dev': { module: 'ZyncDevUtils', func: 'generateRobotsTxt', type: 'generator', outputType: 'string' },
            'qr-code-generator-dev': { module: 'ZyncDevUtils', func: 'generateRobotsTxt', type: 'text', outputType: 'string' },
            'barcode-generator-dev': { module: 'ZyncDevUtils', func: 'generateRobotsTxt', type: 'text', outputType: 'string' }
        };

        return configs[toolId] || null;
    }

    function getModule(toolId) {
        const config = getToolConfig(toolId);
        if (!config) return null;

        const module = window[config.module];
        if (!module) return null;

        const func = module[config.func];
        if (typeof func !== 'function') return null;

        const type = config.type || 'file';
        const outputType = config.outputType || 'blob';

        if (type === 'generator') {
            return {
                generate: async (options = {}) => {
                    const result = await func(options);
                    return Array.isArray(result) ? result : [result];
                },
                type: 'generator',
                outputType
            };
        }

        if (type === 'text') {
            return {
                process: async (input) => {
                    let result;
                    if (config.func === 'extractHeadings') {
                        result = func(input);
                    } else if (config.func === 'countWords') {
                        result = func(input);
                    } else if (config.func === 'calculateKeywordDensity') {
                        result = func(input, '');
                    } else if (config.func === 'checkPlagiarism') {
                        result = func(input, '');
                    } else if (config.func === 'generateFaqFromText') {
                        result = func(input);
                    } else {
                        result = func(input);
                    }
                    return Array.isArray(result) ? result : [{ name: 'Result', text: String(result), type: 'text' }];
                },
                type: 'text',
                outputType
            };
        }

        // File tools
        return {
            process: async (files) => {
                if (!files || !files.length) return [];
                const file = files[0];
                const options = {};
                if (config.preset) options.preset = config.preset;
                if (config.outputFormat) options.outputFormat = config.outputFormat;
                
                const result = await func(file, options);
                return Array.isArray(result) ? result : [result];
            },
            type: 'file',
            outputType
        };
    }

    return {
        getToolConfig,
        getModule
    };
})();
