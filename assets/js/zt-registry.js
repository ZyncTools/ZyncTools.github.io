/**
 * ZyncTools — Tool registry
 *
 * One declarative record per tool. This is the single source of truth:
 * the homepage grid, the tool page, search and the assistant all read
 * from here, so a tool cannot appear in the catalogue without a real
 * implementation behind it.
 *
 * A tool definition looks like:
 *
 *   ZT.registry.define({
 *     id:          'image-resizer',          // unique, kebab-case, used in the URL
 *     name:        'Image Resizer',
 *     category:    'image',                  // must exist in CATEGORIES
 *     description: 'Resize images to exact dimensions.',
 *     tags:        ['resize', 'scale'],
 *     icon:        'maximize',               // Lucide icon name
 *     input:       'files',                  // see INPUT_KINDS below
 *     accept:      'image/*',
 *     maxFiles:    50,
 *     options:     [ ...option schema... ],
 *     run:         async (ctx) => [ ...results... ]
 *   });
 *
 * `run` receives:
 *   ctx.files      — File[]        (input: 'file' | 'files')
 *   ctx.text       — string        (input: 'text')
 *   ctx.opt        — resolved options object, camelCased by option id
 *   ctx.progress   — (fraction 0..1, label?) => void
 *   ctx.signal     — AbortSignal; long tools should check signal.aborted
 *
 * `run` returns one result or an array of results built with
 * ZT.fileResult / ZT.textResult / ZT.dataResult / ZT.nodeResult.
 */
(function (global) {
    'use strict';

    var ZT = global.ZT;

    /* ============================================================
       INPUT KINDS
       ============================================================
       'none'   — generator; no input, runs on demand
       'text'   — a single text area; tools may opt into live preview
       'file'   — exactly one file
       'files'  — one or more files, processed as a batch or as a set
    */
    var INPUT_KINDS = ['none', 'text', 'file', 'files'];

    /* ============================================================
       CATEGORIES
       ============================================================ */
    /* PDF leads. It is the category we intend to be found for, and the order
       here drives the sidebar, the homepage and the generated breadcrumbs. */
    var CATEGORIES = [
        { id: 'pdf',      name: 'PDF',            icon: 'file-text',    blurb: 'Merge, split, sign, protect and convert PDF documents.' },
        { id: 'image',    name: 'Image',          icon: 'image',        blurb: 'Compress, convert, resize, crop and retouch pictures.' },
        { id: 'media',    name: 'Audio & Video',  icon: 'film',         blurb: 'Trim, convert and extract audio and video.' },
        { id: 'text',     name: 'Text',           icon: 'type',         blurb: 'Count, clean, compare and transform writing.' },
        { id: 'code',     name: 'Code & Data',    icon: 'code',         blurb: 'Format, minify and convert JSON, YAML, CSV and XML.' },
        { id: 'convert',  name: 'Converters',     icon: 'arrow-left-right', blurb: 'Encodings, number bases, colours and units.' },
        { id: 'design',   name: 'CSS & Design',   icon: 'palette',      blurb: 'Generate gradients, shadows, layouts and palettes.' },
        { id: 'security', name: 'Security',       icon: 'shield-check', blurb: 'Hash, encrypt and inspect files and secrets.' },
        { id: 'generate', name: 'Generators',     icon: 'sparkles',     blurb: 'QR codes, passwords, UUIDs, placeholder data.' },
        { id: 'seo',      name: 'SEO & Web',      icon: 'search',       blurb: 'Meta tags, schema, sitemaps and content checks.' },
        { id: 'datetime', name: 'Date & Time',    icon: 'clock',        blurb: 'Timestamps, differences, ages and time zones.' },
        { id: 'math',     name: 'Math & Units',   icon: 'calculator',   blurb: 'Convert units and run everyday calculations.' }
    ];

    var byId = Object.create(null);
    var order = [];

    /* ============================================================
       VALIDATION — catches authoring mistakes at load time rather
       than leaving a broken card in the grid for users to find.
       ============================================================ */
    var VALID_OPTION_TYPES = [
        'range', 'number', 'select', 'checkbox', 'text', 'textarea',
        'color', 'radio', 'file', 'date', 'datetime-local', 'time', 'note',
        // A pad the user draws on; its value is a PNG data URL.
        'signature'
    ];

    function validate(def) {
        var where = 'Tool "' + (def && def.id) + '"';
        if (!def || !def.id) throw new Error('A tool was defined without an id.');
        if (byId[def.id]) throw new Error(where + ' is defined twice.');
        if (!def.name) throw new Error(where + ' has no name.');
        if (!def.description) throw new Error(where + ' has no description.');
        if (typeof def.run !== 'function') throw new Error(where + ' has no run() implementation.');
        if (INPUT_KINDS.indexOf(def.input) === -1) {
            throw new Error(where + ' has an unknown input kind "' + def.input + '".');
        }
        if (!CATEGORIES.some(function (c) { return c.id === def.category; })) {
            throw new Error(where + ' has an unknown category "' + def.category + '".');
        }
        (def.options || []).forEach(function (o) {
            if (!o.id) throw new Error(where + ' has an option with no id.');
            if (VALID_OPTION_TYPES.indexOf(o.type) === -1) {
                throw new Error(where + ' option "' + o.id + '" has unknown type "' + o.type + '".');
            }
            if (o.type === 'select' || o.type === 'radio') {
                if (!Array.isArray(o.options) || !o.options.length) {
                    throw new Error(where + ' option "' + o.id + '" needs a non-empty options list.');
                }
            }
        });
    }

    /**
     * Register catalogue metadata without any implementation.
     *
     * The homepage, search and the assistant only ever need a tool's name,
     * description, tags and icon — not its option schema or its run(). Those
     * are 566 KB across twelve modules, so loading them to render a grid of
     * cards was most of the page weight for none of the benefit.
     *
     * `build-pages.js` writes these stubs into assets/js/zt-catalog.js. A page
     * then loads only the module it actually needs, and define() below
     * upgrades the matching stub in place.
     */
    function defineMeta(list) {
        (list || []).forEach(function (meta) {
            if (byId[meta.id]) return; // a full definition already won

            var stub = Object.assign({
                tags: [], icon: 'wrench', options: [], accept: '',
                maxFiles: 1, live: false, popular: false, heavy: false,
                input: 'files'
            }, meta);

            stub.isStub = true;
            stub.searchText = [
                stub.name, stub.description, stub.tags.join(' '), stub.category,
                stub.id.replace(/-/g, ' ')
            ].join(' ').toLowerCase();

            byId[stub.id] = stub;
            order.push(stub.id);
        });
    }

    function define(def) {
        // A stub from the catalogue is expected to be replaced, not a clash.
        var existing = byId[def && def.id];
        if (existing && existing.isStub) delete byId[def.id];

        try {
            validate(def);
        } catch (err) {
            // Never let one bad definition take down the whole catalogue.
            console.error('[ZyncTools registry]', err.message);
            if (existing) byId[def.id] = existing; // keep the stub rather than losing the tool
            return null;
        }

        var tool = Object.assign({
            tags: [],
            icon: 'wrench',
            options: [],
            accept: '',
            maxFiles: def.input === 'files' ? 100 : 1,
            multiple: def.input === 'files',
            live: false,
            popular: false,
            heavy: false,
            blurb: '',
            howto: []
        }, def);

        tool.searchText = [
            tool.name, tool.description, tool.tags.join(' '), tool.category, tool.id.replace(/-/g, ' ')
        ].join(' ').toLowerCase();

        byId[tool.id] = tool;
        // A stub already holds this tool's slot, so keep the catalogue order.
        if (!existing) order.push(tool.id);
        return tool;
    }

    /** Register several tools that share a shape (converters, filters…). */
    function defineEach(list, shape) {
        return list.map(function (item) {
            return define(Object.assign({}, typeof shape === 'function' ? shape(item) : shape, item));
        }).filter(Boolean);
    }

    function get(id) { return byId[id] || null; }
    function all() { return order.map(function (id) { return byId[id]; }); }
    function categories() { return CATEGORIES.slice(); }

    function category(id) {
        return CATEGORIES.filter(function (c) { return c.id === id; })[0] || null;
    }

    function inCategory(catId) {
        return all().filter(function (t) { return t.category === catId; });
    }

    function countByCategory() {
        var counts = {};
        all().forEach(function (t) { counts[t.category] = (counts[t.category] || 0) + 1; });
        return counts;
    }

    /**
     * Resolve an option schema to a plain object of current values,
     * applying defaults and dropping options hidden by `when`.
     */
    function defaults(tool) {
        var out = {};
        (tool.options || []).forEach(function (o) {
            if (o.type === 'note') return;
            out[camel(o.id)] = o.value !== undefined ? o.value : defaultForType(o);
        });
        return out;
    }

    function defaultForType(o) {
        switch (o.type) {
            case 'checkbox': return false;
            case 'number': case 'range': return o.min || 0;
            case 'select': case 'radio': return o.options[0].value;
            case 'color': return '#000000';
            case 'file': return null;
            default: return '';
        }
    }

    function camel(id) {
        return String(id).replace(/-([a-z0-9])/g, function (_, c) { return c.toUpperCase(); });
    }

    /**
     * Keyword search, scored rather than filtered.
     *
     * Every term contributes; nothing is required. Demanding that all terms
     * match made conversational queries ("what is the difference between two
     * texts") return nothing, because filler words appear in no tool's
     * vocabulary. Scoring instead lets the meaningful words carry the query
     * while the filler simply adds nothing.
     */
    /** A term plus its obvious singular/plural forms, longest first. */
    function stemVariants(term) {
        var out = [term];
        if (/ies$/.test(term)) out.push(term.slice(0, -3) + 'y');
        else if (/(ches|shes|sses|xes)$/.test(term)) out.push(term.slice(0, -2));
        else if (/s$/.test(term) && term.length > 3) out.push(term.slice(0, -1));
        else out.push(term + 's');
        return out;
    }

    function search(query, limit) {
        var q = String(query || '').trim().toLowerCase();
        if (!q) return [];

        var terms = q.split(/\s+/).filter(function (t) { return t.length > 1; });
        if (!terms.length) terms = [q];

        var scored = [];

        all().forEach(function (tool) {
            var name = tool.name.toLowerCase();
            var score = 0;
            var matched = 0;

            // Whole-phrase hits are the strongest signal available.
            if (name === q || tool.id === q) score += 200;
            else if (name.indexOf(q) === 0) score += 90;
            else if (name.indexOf(q) !== -1) score += 60;
            else if (tool.searchText.indexOf(q) !== -1) score += 30;

            terms.forEach(function (term) {
                // Match the plural and the singular. Without this, "texts"
                // misses a tool whose description only ever says "text".
                var variants = stemVariants(term);

                var inName = variants.some(function (v) { return name.indexOf(v) !== -1; });
                var inTags = variants.some(function (v) {
                    return tool.tags.some(function (tag) { return tag.indexOf(v) !== -1; });
                });
                var inText = variants.some(function (v) { return tool.searchText.indexOf(v) !== -1; });

                if (inName) { score += 14; matched++; }
                else if (inTags) { score += 9; matched++; }
                else if (inText) { score += 4; matched++; }
            });

            if (!matched) return;

            // Reward breadth: matching three of four words beats one of four.
            score += Math.round((matched / terms.length) * 22);
            if (tool.popular) score += 5;

            scored.push({ tool: tool, score: score });
        });

        scored.sort(function (a, b) { return b.score - a.score || a.tool.name.localeCompare(b.tool.name); });

        // Drop the long tail of one-weak-word matches when strong hits exist.
        if (scored.length > 1) {
            var best = scored[0].score;
            scored = scored.filter(function (s) { return s.score >= Math.max(8, best * 0.28); });
        }

        return scored.slice(0, limit || 20).map(function (s) { return s.tool; });
    }

    /**
     * Same ranking as search(), but keeps the score so callers can judge
     * confidence. The assistant uses this to tell "I found it" apart from
     * "one stray word happened to appear in a tag".
     */
    function searchScored(query, limit) {
        var q = String(query || '').trim().toLowerCase();
        if (!q) return [];

        var ranked = search(q, limit || 20);
        var terms = q.split(/\s+/).filter(function (t) { return t.length > 1; });

        return ranked.map(function (tool) {
            var name = tool.name.toLowerCase();
            var strong = terms.filter(function (term) {
                return stemVariants(term).some(function (v) {
                    return name.indexOf(v) !== -1 ||
                        tool.tags.some(function (tag) { return tag.indexOf(v) !== -1; });
                });
            }).length;
            return {
                tool: tool,
                strongMatches: strong,
                confidence: terms.length ? strong / terms.length : 0
            };
        });
    }

    /**
     * Load the module that implements `id`, if only its metadata is present.
     * Generated pages already include the right module, so this is the path
     * for tool.html — the fallback route, which cannot know in advance which
     * tool it will be asked for.
     */
    function ensureLoaded(id) {
        var tool = byId[id];
        if (!tool) return Promise.resolve(null);
        if (!tool.isStub) return Promise.resolve(tool);

        if (!tool.module) {
            return Promise.reject(new Error('No module recorded for "' + id + '".'));
        }

        return ZT.loadScript(ZT.url('assets/js/tools/' + tool.module + '.js'))
            .then(function () {
                var loaded = byId[id];
                if (!loaded || loaded.isStub) {
                    throw new Error('"' + id + '" was not defined by its module.');
                }
                return loaded;
            });
    }

    ZT.registry = {
        define: define,
        defineMeta: defineMeta,
        defineEach: defineEach,
        ensureLoaded: ensureLoaded,
        get: get,
        all: all,
        categories: categories,
        category: category,
        inCategory: inCategory,
        countByCategory: countByCategory,
        defaults: defaults,
        camel: camel,
        search: search,
        searchScored: searchScored,
        INPUT_KINDS: INPUT_KINDS
    };

})(window);
