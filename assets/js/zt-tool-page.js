/**
 * ZyncTools — Tool page controller
 *
 * Reads the tool id from the URL, renders the input area and the tool's
 * own option schema, runs it, and renders whatever results come back.
 * Every tool on the site is driven by this one file.
 */
(function () {
    'use strict';

    var ZT = window.ZT;
    var $ = ZT.$, el = ZT.el;

    var state = {
        tool: null,
        files: [],
        text: '',
        opt: {},
        running: false,
        controller: null,
        // Two pools with different lifetimes. Input thumbnails live as long
        // as the file is attached; result previews die when results clear.
        // Sharing one pool revoked the thumbnails the moment results reset.
        inputUrls: [],
        resultUrls: []
    };

    /* ============================================================
       BOOT
       ============================================================ */
    function boot() {
        var params = new URLSearchParams(location.search);
        var id = params.get('id') || params.get('tool') || '';
        var tool = ZT.registry.get(id);

        if (!tool) {
            renderNotFound(id);
            return;
        }

        state.tool = tool;
        state.opt = ZT.registry.defaults(tool);
        // The assistant reads this to answer questions about the open tool.
        window.__ZT_CURRENT_TOOL__ = tool;

        applyMetadata(tool);
        renderHead(tool);
        renderInput(tool);
        renderOptions();
        renderRunBar(tool);
        renderSide(tool);
        bindGlobalCopy();

        // Generators have nothing to wait for, so show output immediately.
        if (tool.input === 'none') run();
    }

    function applyMetadata(tool) {
        var suffix = ' — ZyncTools';
        document.title = tool.name + suffix;

        var description = $('meta[name="description"]');
        if (description) description.setAttribute('content', tool.description);

        var canonical = $('link[rel="canonical"]');
        if (canonical) canonical.setAttribute('href', location.origin + location.pathname + '?id=' + tool.id);

        setMeta('og:title', tool.name + suffix);
        setMeta('og:description', tool.description);
        setMeta('twitter:title', tool.name + suffix);
        setMeta('twitter:description', tool.description);

        // Structured data helps these pages surface for tool-shaped queries.
        var ld = el('script', { type: 'application/ld+json' });
        ld.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: tool.name,
            description: tool.description,
            applicationCategory: 'UtilitiesApplication',
            operatingSystem: 'Any browser',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
        });
        document.head.appendChild(ld);
    }

    function setMeta(property, content) {
        var node = $('meta[property="' + property + '"]') || $('meta[name="' + property + '"]');
        if (node) node.setAttribute('content', content);
    }

    function renderNotFound(id) {
        var main = $('#zt-tool-root');
        if (!main) return;
        main.innerHTML = '';

        var suggestions = id ? ZT.registry.search(id.replace(/-/g, ' '), 5) : [];

        main.appendChild(el('div', { class: 'zt-empty is-visible' }, [
            el('div', { class: 'zt-empty__icon', html: icon('search-x') }),
            el('div', { class: 'zt-empty__title', text: id ? 'No tool called "' + id + '"' : 'No tool selected' }),
            el('div', { class: 'zt-empty__sub', text: 'It may have been renamed or removed.' }),
            el('div', { class: 'zt-row', style: { justifyContent: 'center', marginTop: '20px' } }, [
                el('a', { class: 'zt-btn zt-btn--primary', href: ZT.url('index.html') }, 'Browse all tools')
            ])
        ]));

        if (suggestions.length) {
            var list = el('div', { class: 'zt-side-card', style: { maxWidth: '520px', margin: '24px auto 0' } }, [
                el('div', { class: 'zt-side-card__title', text: 'Did you mean' }),
                el('div', { class: 'zt-related' }, suggestions.map(toolLink))
            ]);
            main.appendChild(list);
        }
    }

    /* ============================================================
       HEADER
       ============================================================ */
    function renderHead(tool) {
        var host = $('#zt-tool-head');
        if (!host) return;

        var category = ZT.registry.category(tool.category);

        host.appendChild(el('nav', { class: 'zt-breadcrumb', 'aria-label': 'Breadcrumb' }, [
            el('a', { href: ZT.url('index.html') }, 'Tools'),
            el('span', { text: '/' }),
            el('a', { href: ZT.url('index.html') + '#' + tool.category }, category ? category.name : tool.category),
            el('span', { text: '/' }),
            el('span', { text: tool.name })
        ]));

        var badges = [];
        if (tool.popular) badges.push(el('span', { class: 'zt-badge zt-badge--popular', text: 'Popular' }));
        if (tool.heavy) badges.push(el('span', { class: 'zt-badge zt-badge--heavy', text: 'Heavy' }));

        host.appendChild(el('div', { class: 'zt-tool-head__row' }, [
            el('div', { class: 'zt-tool-head__icon', html: icon(tool.icon) }),
            el('div', { style: { minWidth: '0' } }, [
                el('div', { class: 'zt-row', style: { gap: '10px' } },
                    [el('h1', { class: 'zt-tool-head__title', text: tool.name })].concat(badges)),
                el('p', { class: 'zt-tool-head__desc', text: tool.description })
            ])
        ]));
    }

    /* ============================================================
       INPUT AREA
       ============================================================ */
    function renderInput(tool) {
        var host = $('#zt-input-step');
        if (!host) return;

        if (tool.input === 'none') {
            host.remove();
            renumberSteps();
            return;
        }

        var body = el('div', { class: 'zt-step__body' });

        if (tool.input === 'text') {
            var textarea = el('textarea', {
                class: 'zt-textarea zt-textarea--mono',
                id: 'zt-text-input',
                rows: 10,
                placeholder: tool.placeholder || 'Paste or type here…',
                spellcheck: 'false',
                'aria-label': tool.inputLabel || 'Input text'
            });

            textarea.addEventListener('input', function () {
                state.text = textarea.value;
                updateCounter();
                if (tool.live) scheduleLiveRun();
            });

            var counter = el('div', {
                class: 'zt-field__help',
                id: 'zt-text-counter',
                style: { display: 'flex', justifyContent: 'space-between', gap: '12px' }
            }, [
                el('span', { id: 'zt-text-stats', text: '0 characters' }),
                el('span', { id: 'zt-live-hint', text: tool.live ? 'Updates as you type' : '' })
            ]);

            var actions = el('div', { class: 'zt-row', style: { marginTop: '12px' } }, [
                el('button', {
                    class: 'zt-btn zt-btn--ghost zt-btn--sm', type: 'button',
                    onclick: async function () {
                        try {
                            var clip = await navigator.clipboard.readText();
                            textarea.value = clip;
                            state.text = clip;
                            updateCounter();
                            if (tool.live) scheduleLiveRun();
                        } catch (e) {
                            ZT.toast('Your browser blocked clipboard access. Paste with Ctrl+V instead.', 'error');
                        }
                    }
                }, [iconNode('clipboard'), 'Paste']),
                el('button', {
                    class: 'zt-btn zt-btn--ghost zt-btn--sm', type: 'button',
                    onclick: function () {
                        textarea.value = '';
                        state.text = '';
                        updateCounter();
                        clearResults();
                        textarea.focus();
                    }
                }, [iconNode('eraser'), 'Clear']),
                el('label', { class: 'zt-btn zt-btn--ghost zt-btn--sm', style: { position: 'relative', overflow: 'hidden' } }, [
                    iconNode('file-up'),
                    'Load a file',
                    el('input', {
                        type: 'file',
                        accept: '.txt,.md,.json,.csv,.xml,.yaml,.yml,.html,.css,.js,.sql,.log,text/*',
                        style: { position: 'absolute', inset: '0', opacity: '0', cursor: 'pointer' },
                        onchange: async function (e) {
                            var file = e.target.files[0];
                            if (!file) return;
                            if (file.size > 12 * 1024 * 1024) {
                                ZT.toast('That file is larger than 12 MB — too big to edit as text.', 'error');
                                return;
                            }
                            textarea.value = await ZT.readAsText(file);
                            state.text = textarea.value;
                            updateCounter();
                            if (tool.live) scheduleLiveRun();
                        }
                    })
                ])
            ]);

            body.appendChild(textarea);
            body.appendChild(counter);
            body.appendChild(actions);

            $('#zt-input-title').textContent = tool.inputLabel || 'Input';
        } else {
            body.appendChild(buildDropzone(tool));
            body.appendChild(el('div', { class: 'zt-files', id: 'zt-file-list' }));
            $('#zt-input-title').textContent = tool.input === 'files' ? 'Upload files' : 'Upload a file';
        }

        host.appendChild(body);
    }

    /** Keep the visible step numbers contiguous when a step is removed. */
    function renumberSteps() {
        ZT.$$('.zt-step:not(.zt-hidden) .zt-step__num').forEach(function (node, index) {
            node.textContent = String(index + 1);
        });
    }

    function buildDropzone(tool) {
        var multiple = tool.input === 'files';

        var input = el('input', {
            type: 'file',
            class: 'zt-dropzone__input',
            id: 'zt-file-input',
            accept: tool.accept || '',
            multiple: multiple || null,
            'aria-label': 'Choose files'
        });

        var zone = el('div', {
            class: 'zt-dropzone',
            role: 'button',
            tabindex: '0'
        }, [
            el('div', { style: { pointerEvents: 'none' } }, [
                el('div', { class: 'zt-dropzone__icon', html: icon('upload-cloud') }),
                el('div', { class: 'zt-dropzone__title', text: multiple ? 'Drop files here' : 'Drop a file here' }),
                el('div', { class: 'zt-dropzone__sub', text: describeAccept(tool) })
            ]),
            input
        ]);

        input.addEventListener('change', function () {
            addFiles(Array.from(input.files));
            // Reset so picking the same file twice still fires a change event.
            input.value = '';
        });

        zone.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                input.click();
            }
        });

        ['dragenter', 'dragover'].forEach(function (type) {
            zone.addEventListener(type, function (e) {
                e.preventDefault();
                zone.classList.add('is-dragover');
            });
        });
        ['dragleave', 'drop'].forEach(function (type) {
            zone.addEventListener(type, function (e) {
                e.preventDefault();
                if (type === 'dragleave' && zone.contains(e.relatedTarget)) return;
                zone.classList.remove('is-dragover');
            });
        });
        zone.addEventListener('drop', function (e) {
            e.preventDefault();
            addFiles(Array.from(e.dataTransfer.files));
        });

        return zone;
    }

    function describeAccept(tool) {
        var limit = tool.input === 'files' ? ' · up to ' + tool.maxFiles + ' files' : '';
        if (!tool.accept) return 'or click to browse' + limit + ' · processed entirely on your device';

        var readable = tool.accept
            .split(',')
            .filter(function (a) { return a.charAt(0) === '.'; })
            .map(function (a) { return a.slice(1).toUpperCase(); });

        if (!readable.length) {
            if (/^image\//.test(tool.accept)) readable = ['JPG', 'PNG', 'WEBP', 'GIF'];
            else if (/^audio\//.test(tool.accept)) readable = ['MP3', 'WAV', 'M4A'];
            else if (/^video\//.test(tool.accept)) readable = ['MP4', 'WEBM', 'MOV'];
        }

        var formats = readable.length ? readable.slice(0, 6).join(', ') : 'any file';
        return 'or click to browse — ' + formats + limit;
    }

    function addFiles(incoming) {
        var tool = state.tool;
        if (!incoming.length) return;

        var accepted = incoming.filter(function (file) { return matchesAccept(file, tool.accept); });
        var rejected = incoming.length - accepted.length;
        if (rejected) {
            ZT.toast(rejected + ' file' + (rejected === 1 ? ' was' : 's were') + ' skipped — wrong file type for this tool.', 'error');
        }
        if (!accepted.length) return;

        if (tool.input === 'file') {
            state.files = [accepted[0]];
        } else {
            state.files = state.files.concat(accepted).slice(0, tool.maxFiles);
            if (state.files.length === tool.maxFiles && accepted.length > tool.maxFiles) {
                ZT.toast('Only the first ' + tool.maxFiles + ' files were kept.', 'error');
            }
        }

        renderFileList();
        updateRunButton();
        clearResults();
    }

    /** Match a File against an accept string of extensions and MIME patterns. */
    function matchesAccept(file, accept) {
        if (!accept || accept === '*/*') return true;

        var name = file.name.toLowerCase();
        var type = (file.type || '').toLowerCase();

        return accept.split(',').some(function (rule) {
            rule = rule.trim().toLowerCase();
            if (!rule) return false;
            if (rule === '*/*') return true;
            if (rule.charAt(0) === '.') return name.endsWith(rule);
            if (rule.endsWith('/*')) return type.indexOf(rule.slice(0, -1)) === 0;
            return type === rule;
        });
    }

    function renderFileList() {
        var host = $('#zt-file-list');
        if (!host) return;
        // The previous thumbnails are about to be discarded with the markup.
        revokeInputUrls();
        host.innerHTML = '';

        state.files.forEach(function (file, index) {
            var thumb;
            if (/^image\//.test(file.type)) {
                var url = URL.createObjectURL(file);
                state.inputUrls.push(url);
                thumb = el('img', { class: 'zt-file__thumb', src: url, alt: '' });
            } else {
                thumb = el('div', { class: 'zt-file__thumb zt-file__thumb--icon', html: icon(fileIconFor(file)) });
            }

            host.appendChild(el('div', { class: 'zt-file' }, [
                thumb,
                el('div', { class: 'zt-file__info' }, [
                    el('div', { class: 'zt-file__name', text: file.name, title: file.name }),
                    el('div', { class: 'zt-file__meta', text: ZT.formatBytes(file.size) + (file.type ? ' · ' + file.type : '') })
                ]),
                el('button', {
                    class: 'zt-file__remove',
                    type: 'button',
                    'aria-label': 'Remove ' + file.name,
                    title: 'Remove',
                    html: icon('x'),
                    onclick: function () {
                        state.files.splice(index, 1);
                        renderFileList();
                        updateRunButton();
                        clearResults();
                    }
                })
            ]));
        });

        if (state.files.length > 1) {
            host.appendChild(el('div', { class: 'zt-row', style: { justifyContent: 'space-between' } }, [
                el('span', {
                    class: 'zt-field__help',
                    text: state.files.length + ' files · ' + ZT.formatBytes(
                        state.files.reduce(function (sum, f) { return sum + f.size; }, 0))
                }),
                el('button', {
                    class: 'zt-btn zt-btn--ghost zt-btn--sm', type: 'button', text: 'Remove all',
                    onclick: function () {
                        state.files = [];
                        renderFileList();
                        updateRunButton();
                        clearResults();
                    }
                })
            ]));
        }
    }

    function fileIconFor(file) {
        var ext = ZT.extOf(file.name);
        if (/^audio\//.test(file.type) || /mp3|wav|ogg|flac|m4a|aac/.test(ext)) return 'file-audio';
        if (/^video\//.test(file.type) || /mp4|webm|mov|mkv|avi/.test(ext)) return 'file-video';
        if (ext === 'pdf') return 'file-text';
        if (/zip|rar|7z|tar|gz/.test(ext)) return 'file-archive';
        return 'file';
    }

    function updateCounter() {
        var stats = $('#zt-text-stats');
        if (!stats) return;
        var text = state.text;
        var words = text.trim() ? text.trim().split(/\s+/).length : 0;
        stats.textContent = ZT.formatNumber(text.length) + ' characters · ' + ZT.formatNumber(words) + ' words';
    }

    /* ============================================================
       OPTIONS
       ============================================================ */
    function renderOptions() {
        var host = $('#zt-options');
        if (!host) return;
        host.innerHTML = '';

        var tool = state.tool;
        var schema = tool.options || [];

        // Tools whose option lists change shape get a chance to rebuild them.
        if (typeof tool.refreshOptions === 'function') {
            state.opt = tool.refreshOptions(state.opt, schema) || state.opt;
        }

        var visible = schema.filter(function (option) {
            return typeof option.when !== 'function' || option.when(state.opt);
        });

        if (!visible.length) {
            host.appendChild(el('p', { class: 'zt-fields--empty', text: 'This tool has no settings — just run it.' }));
            var step = $('#zt-options-step');
            if (step && tool.input === 'none') step.classList.add('zt-hidden');
            return;
        }

        var fields = el('div', { class: 'zt-fields' });
        visible.forEach(function (option) {
            fields.appendChild(buildField(option));
        });
        host.appendChild(fields);
    }

    function buildField(option) {
        var key = ZT.registry.camel(option.id);
        var value = state.opt[key];

        function commit(next, rerender) {
            state.opt[key] = next;
            // Options with a `when` clause may reveal or hide other fields.
            if (rerender !== false) renderOptions();
            if (shouldLiveUpdate()) {
                scheduleLiveRun();
            }
        }

        switch (option.type) {
            case 'note':
                return el('div', { class: 'zt-note' }, [
                    nodeFromHtml(icon('info')),
                    el('span', { text: option.text })
                ]);

            case 'checkbox': {
                var checkbox = el('input', { type: 'checkbox', checked: !!value ? 'checked' : null });
                checkbox.checked = !!value;
                checkbox.addEventListener('change', function () { commit(checkbox.checked); });

                return el('label', { class: 'zt-check' }, [
                    checkbox,
                    el('span', {}, [
                        el('span', { class: 'zt-check__text', text: option.label }),
                        option.help ? el('span', { class: 'zt-check__help', text: option.help }) : null
                    ].filter(Boolean))
                ]);
            }

            case 'radio': {
                var group = el('div', { class: 'zt-radios' + (option.options.length <= 3 ? ' zt-radios--inline' : '') });
                var name = 'zt-radio-' + option.id;

                option.options.forEach(function (choice) {
                    var radio = el('input', { type: 'radio', name: name, value: choice.value });
                    radio.checked = String(value) === String(choice.value);
                    radio.addEventListener('change', function () {
                        if (radio.checked) commit(choice.value);
                    });
                    group.appendChild(el('label', { class: 'zt-radio' }, [radio, el('span', { text: choice.label })]));
                });

                return wrapField(option, group, false);
            }

            case 'select': {
                var select = el('select', { class: 'zt-select', id: fieldId(option) });
                option.options.forEach(function (choice) {
                    var opt = el('option', { value: choice.value, text: choice.label });
                    if (String(choice.value) === String(value)) opt.selected = true;
                    select.appendChild(opt);
                });
                select.addEventListener('change', function () { commit(select.value); });
                return wrapField(option, select);
            }

            case 'range': {
                var range = el('input', {
                    type: 'range', class: 'zt-range', id: fieldId(option),
                    min: option.min, max: option.max, step: option.step || 1, value: value
                });
                var readout = el('span', {
                    class: 'zt-field__value',
                    text: formatRange(value, option)
                });
                range.addEventListener('input', function () {
                    var next = parseFloat(range.value);
                    readout.textContent = formatRange(next, option);
                    // Skip the re-render on drag so the thumb keeps focus.
                    state.opt[key] = next;
                    if (shouldLiveUpdate()) {
                        scheduleLiveRun();
                    }
                });
                range.addEventListener('change', function () { commit(parseFloat(range.value)); });

                return wrapField(option, range, true, readout);
            }

            case 'number': {
                var number = el('input', {
                    type: 'number', class: 'zt-input', id: fieldId(option),
                    min: option.min, max: option.max, step: option.step || 1, value: value
                });
                number.addEventListener('input', function () {
                    var next = number.value === '' ? '' : parseFloat(number.value);
                    state.opt[key] = isNaN(next) ? option.value : next;
                    if (shouldLiveUpdate()) {
                        scheduleLiveRun();
                    }
                });
                number.addEventListener('change', function () {
                    var next = parseFloat(number.value);
                    if (isNaN(next)) next = option.value;
                    if (option.min !== undefined) next = Math.max(option.min, next);
                    if (option.max !== undefined) next = Math.min(option.max, next);
                    number.value = next;
                    commit(next);
                });

                var control = option.suffix
                    ? el('div', { class: 'zt-input-group' }, [number, el('span', { class: 'zt-input-group__suffix', text: option.suffix })])
                    : number;
                return wrapField(option, control);
            }

            case 'color': {
                var picker = el('input', { type: 'color', value: normaliseHex(value), id: fieldId(option) });
                var hex = el('input', { type: 'text', class: 'zt-input', value: normaliseHex(value), maxlength: 9 });

                picker.addEventListener('input', function () {
                    hex.value = picker.value.toUpperCase();
                    state.opt[key] = picker.value;
                    if (shouldLiveUpdate()) scheduleLiveRun();
                });
                picker.addEventListener('change', function () { commit(picker.value, false); });
                hex.addEventListener('change', function () {
                    var parsed = ZT.color && ZT.color.parse ? ZT.color.parse(hex.value) : null;
                    if (parsed) {
                        var normalised = ZT.color.toHex(parsed[0], parsed[1], parsed[2]);
                        picker.value = normalised;
                        hex.value = normalised.toUpperCase();
                        commit(normalised, false);
                    } else {
                        hex.value = picker.value.toUpperCase();
                        ZT.toast('That is not a colour I recognise.', 'error');
                    }
                });

                return wrapField(option, el('div', { class: 'zt-color-row' }, [picker, hex]));
            }

            case 'textarea': {
                var textarea = el('textarea', {
                    class: 'zt-textarea' + (option.mono ? ' zt-textarea--mono' : ''),
                    id: fieldId(option),
                    rows: option.rows || 4,
                    placeholder: option.placeholder || '',
                    spellcheck: 'false'
                });
                textarea.value = value || '';
                textarea.addEventListener('input', function () {
                    state.opt[key] = textarea.value;
                    if (state.tool.live) scheduleLiveRun();
                });
                textarea.addEventListener('change', function () { commit(textarea.value, false); });
                return wrapField(option, textarea);
            }

            case 'file': {
                var fileInput = el('input', {
                    type: 'file', class: 'zt-input', accept: option.accept || '', id: fieldId(option),
                    style: { padding: '6px 10px', height: 'auto' }
                });
                fileInput.addEventListener('change', function () {
                    commit(fileInput.files[0] || null, false);
                });
                return wrapField(option, fileInput);
            }

            default: {
                // text, date, time, datetime-local
                var input = el('input', {
                    type: option.type === 'text' ? 'text' : option.type,
                    class: 'zt-input' + (option.mono ? ' zt-input--mono' : ''),
                    id: fieldId(option),
                    placeholder: option.placeholder || '',
                    maxlength: option.maxlength || null,
                    value: value || ''
                });
                input.addEventListener('input', function () {
                    state.opt[key] = input.value;
                    if (state.tool.live) scheduleLiveRun();
                });
                input.addEventListener('change', function () { commit(input.value, false); });
                return wrapField(option, input);
            }
        }
    }

    function fieldId(option) { return 'zt-opt-' + option.id; }

    function formatRange(value, option) {
        var suffix = option.suffix ? ' ' + option.suffix : '';
        return value + suffix;
    }

    function wrapField(option, control, showValue, readout) {
        var label = el('label', { class: 'zt-field__label', for: fieldId(option) }, [
            el('span', { text: option.label })
        ]);
        if (showValue && readout) label.appendChild(readout);

        return el('div', { class: 'zt-field' }, [
            label,
            control,
            option.help ? el('div', { class: 'zt-field__help', text: option.help }) : null
        ].filter(Boolean));
    }

    function normaliseHex(value) {
        if (/^#[0-9a-f]{6}$/i.test(value)) return value;
        var parsed = ZT.color && ZT.color.parse ? ZT.color.parse(value) : null;
        return parsed ? ZT.color.toHex(parsed[0], parsed[1], parsed[2]) : '#000000';
    }

    /* ============================================================
       RUN BAR
       ============================================================ */
    function renderRunBar(tool) {
        var host = $('#zt-runbar');
        if (!host) return;

        var runButton = el('button', {
            class: 'zt-btn zt-btn--primary zt-btn--lg',
            id: 'zt-run',
            type: 'button',
            onclick: function () { run(); }
        }, [iconNode('play'), el('span', { id: 'zt-run-label', text: runLabel(tool) })]);

        var cancelButton = el('button', {
            class: 'zt-btn zt-btn--outline zt-hidden',
            id: 'zt-cancel',
            type: 'button',
            onclick: function () {
                if (state.controller) state.controller.abort();
            }
        }, [iconNode('x'), 'Cancel']);

        var resetButton = el('button', {
            class: 'zt-btn zt-btn--ghost',
            type: 'button',
            onclick: resetAll
        }, [iconNode('rotate-ccw'), 'Reset']);

        host.appendChild(runButton);
        host.appendChild(cancelButton);
        host.appendChild(resetButton);

        host.appendChild(el('div', { class: 'zt-progress zt-hidden', id: 'zt-progress', style: { width: '100%' } }, [
            el('div', { class: 'zt-progress__track' }, el('div', { class: 'zt-progress__bar', id: 'zt-progress-bar' })),
            el('div', { class: 'zt-progress__label' }, [
                el('span', { id: 'zt-progress-text', text: 'Working…' }),
                el('span', { id: 'zt-progress-pct', text: '' })
            ])
        ]));

        updateRunButton();
    }

    function runLabel(tool) {
        if (tool.input === 'none') return 'Generate';
        if (tool.input === 'text') return 'Run';
        return 'Process';
    }

    function updateRunButton() {
        var button = $('#zt-run');
        if (!button) return;
        var tool = state.tool;

        var ready = tool.input === 'none' || tool.input === 'text' || state.files.length > 0;
        button.disabled = !ready || state.running;

        var label = $('#zt-run-label');
        if (label) {
            if (state.running) label.textContent = 'Working…';
            else if (!ready) label.textContent = 'Add a file first';
            else if (tool.input === 'files' && state.files.length > 1) label.textContent = 'Process ' + state.files.length + ' files';
            else label.textContent = runLabel(tool);
        }
    }

    /* ============================================================
       RUNNING
       ============================================================ */
    var liveTimer = null;

    /**
     * Whether changing an option should re-run immediately.
     * Generators have no input to wait for, so they always update live —
     * dragging a gradient slider and pressing a button to see it is silly.
     * File tools never do: re-encoding an image on every keystroke is not
     * something a laptop should be asked to do.
     */
    function shouldLiveUpdate() {
        var tool = state.tool;
        if (tool.input === 'file' || tool.input === 'files') return false;
        return tool.live || tool.input === 'none';
    }

    function scheduleLiveRun() {
        clearTimeout(liveTimer);
        liveTimer = setTimeout(function () { run({ quiet: true }); }, 260);
    }

    async function run(options) {
        options = options || {};
        var tool = state.tool;

        if (state.running) return;
        if ((tool.input === 'file' || tool.input === 'files') && !state.files.length) {
            if (!options.quiet) ZT.toast('Add a file to get started.', 'error');
            return;
        }
        // A live tool with an empty box should clear, not shout.
        if (tool.input === 'text' && !state.text.trim() && tool.live) {
            clearResults();
            return;
        }

        state.running = true;
        state.controller = new AbortController();
        updateRunButton();
        showProgress(true, options.quiet);
        clearError();

        var ctx = {
            files: state.files.slice(),
            text: state.text,
            opt: Object.assign({}, state.opt),
            signal: state.controller.signal,
            progress: function (fraction, label) {
                setProgress(fraction, label);
            }
        };

        try {
            var results = await tool.run(ctx);
            if (state.controller.signal.aborted) return;
            renderResults(Array.isArray(results) ? results : [results]);
        } catch (err) {
            if (state.controller && state.controller.signal.aborted) {
                showError('Cancelled.');
            } else {
                console.error('[ZyncTools]', err);
                showError(err && err.userFacing
                    ? err.message
                    : 'Something went wrong: ' + ((err && err.message) || 'unknown error') +
                      '. If this keeps happening the file may be unsupported or damaged.');
            }
        } finally {
            state.running = false;
            state.controller = null;
            showProgress(false);
            updateRunButton();
        }
    }

    function showProgress(visible, quiet) {
        var host = $('#zt-progress');
        var cancel = $('#zt-cancel');
        if (!host) return;

        // Live text tools update constantly; a flashing bar is just noise.
        if (visible && quiet) return;

        host.classList.toggle('zt-hidden', !visible);
        if (cancel) cancel.classList.toggle('zt-hidden', !visible);

        if (visible) setProgress(0, 'Starting…');
    }

    function setProgress(fraction, label) {
        var bar = $('#zt-progress-bar');
        var text = $('#zt-progress-text');
        var pct = $('#zt-progress-pct');
        if (!bar) return;

        if (typeof fraction === 'number' && isFinite(fraction)) {
            bar.classList.remove('is-indeterminate');
            bar.style.width = Math.round(ZT.clamp(fraction, 0, 1) * 100) + '%';
            if (pct) pct.textContent = Math.round(ZT.clamp(fraction, 0, 1) * 100) + '%';
        } else {
            bar.classList.add('is-indeterminate');
            if (pct) pct.textContent = '';
        }
        if (label && text) text.textContent = label;
    }

    /* ============================================================
       RESULTS
       ============================================================ */
    function clearResults() {
        var host = $('#zt-results');
        if (host) host.innerHTML = '';
        var placeholder = $('#zt-results-placeholder');
        if (placeholder) placeholder.classList.remove('zt-hidden');
        revokeUrls();
    }

    function revokeUrls() {
        state.resultUrls.forEach(function (url) { URL.revokeObjectURL(url); });
        state.resultUrls = [];
    }

    /** Called when the attached files change, not when results clear. */
    function revokeInputUrls() {
        state.inputUrls.forEach(function (url) { URL.revokeObjectURL(url); });
        state.inputUrls = [];
    }

    function clearError() {
        var host = $('#zt-error');
        if (host) host.innerHTML = '';
    }

    function showError(message) {
        var host = $('#zt-error');
        if (!host) return;
        host.innerHTML = '';
        host.appendChild(el('div', { class: 'zt-alert zt-alert--error' }, [
            nodeFromHtml(icon('alert-triangle')),
            el('span', { text: message })
        ]));
    }

    function renderResults(results) {
        var host = $('#zt-results');
        if (!host) return;

        host.innerHTML = '';
        var placeholder = $('#zt-results-placeholder');
        if (placeholder) placeholder.classList.add('zt-hidden');

        var clean = results.filter(Boolean);
        if (!clean.length) {
            showError('The tool produced no output.');
            return;
        }

        var downloadable = clean.filter(function (r) { return r.kind === 'file'; });

        clean.forEach(function (result) {
            var node = buildResult(result);
            if (node) host.appendChild(node);
        });

        // With several files, a single "download everything" button saves clicking.
        if (downloadable.length > 2) {
            host.insertBefore(el('div', { class: 'zt-row' }, [
                el('button', {
                    class: 'zt-btn zt-btn--primary', type: 'button',
                    onclick: function () {
                        downloadable.forEach(function (r, i) {
                            // Stagger so browsers do not block the burst as a popup.
                            setTimeout(function () { ZT.triggerDownload(r.blob, r.name); }, i * 220);
                        });
                        ZT.toast('Downloading ' + downloadable.length + ' files…');
                    }
                }, [iconNode('download'), 'Download all ' + downloadable.length + ' files'])
            ]), host.firstChild);
        }

        if (!$('#zt-results-step').classList.contains('is-seen')) {
            $('#zt-results-step').classList.add('is-seen');
        }
    }

    function buildResult(result) {
        switch (result.kind) {
            case 'text': return buildTextResult(result);
            case 'data': return buildDataResult(result);
            case 'file': return buildFileResult(result);
            case 'node': return buildNodeResult(result);
            default: return null;
        }
    }

    function resultShell(result, bodyNode, actions, flush) {
        var head = el('div', { class: 'zt-result__head' }, [
            el('span', { class: 'zt-result__title', text: result.title || 'Result' }),
            result.note ? el('span', { class: 'zt-result__note', text: result.note }) : null,
            actions && actions.length ? el('div', { class: 'zt-result__actions' }, actions) : null
        ].filter(Boolean));

        return el('div', { class: 'zt-result' }, [
            head,
            el('div', { class: 'zt-result__body' + (flush ? ' zt-result__body--flush' : '') }, bodyNode)
        ]);
    }

    function buildTextResult(result) {
        var output = el('textarea', {
            class: 'zt-output' + (result.wrap === false ? '' : ' zt-output--wrap'),
            readonly: true,
            spellcheck: 'false',
            'aria-label': result.title || 'Output'
        });
        output.value = result.text;

        var actions = [
            el('button', {
                class: 'zt-btn zt-btn--ghost zt-btn--sm', type: 'button',
                onclick: async function (e) {
                    var ok = await ZT.copyText(result.text);
                    ZT.toast(ok ? 'Copied to clipboard' : 'Could not copy — select the text and copy manually',
                        ok ? 'success' : 'error');
                }
            }, [iconNode('copy'), 'Copy']),
            el('button', {
                class: 'zt-btn zt-btn--ghost zt-btn--sm', type: 'button',
                onclick: function () {
                    var extension = result.lang === 'json' ? 'json' : result.lang === 'html' ? 'html'
                        : result.lang === 'css' ? 'css' : result.lang === 'xml' ? 'xml'
                        : result.lang === 'csv' ? 'csv' : result.lang === 'sql' ? 'sql'
                        : result.lang === 'yaml' ? 'yaml' : result.lang === 'markdown' ? 'md' : 'txt';
                    ZT.downloadText(result.text, ZT.slugify(state.tool.name) + '-output.' + extension);
                }
            }, [iconNode('download'), 'Save'])
        ];

        return resultShell(result, output, actions);
    }

    function buildDataResult(result) {
        var columns = result.columns || 2;
        var grid = el('div', {
            class: 'zt-data zt-data--' + columns + (result.mono ? ' zt-data--mono' : '')
        });

        result.rows.forEach(function (row) {
            grid.appendChild(el('div', { class: 'zt-data__cell' }, [
                el('div', { class: 'zt-data__label', text: row.label }),
                el('div', { class: 'zt-data__value', text: row.value })
            ]));
        });

        var text = result.rows.map(function (r) { return r.label + ': ' + r.value; }).join('\n');
        var actions = [
            el('button', {
                class: 'zt-btn zt-btn--ghost zt-btn--sm', type: 'button',
                onclick: async function () {
                    var ok = await ZT.copyText(text);
                    ZT.toast(ok ? 'Copied' : 'Could not copy', ok ? 'success' : 'error');
                }
            }, [iconNode('copy'), 'Copy'])
        ];

        return resultShell(result, grid, actions);
    }

    function buildFileResult(result) {
        var children = [];

        if (result.previewBlob && /^image\//.test(result.previewBlob.type)) {
            var url = URL.createObjectURL(result.previewBlob);
            state.resultUrls.push(url);
            children.push(el('img', { class: 'zt-download__preview', src: url, alt: result.name, loading: 'lazy' }));
        } else {
            children.push(el('div', {
                class: 'zt-download__preview zt-file__thumb--icon',
                html: icon(/\.pdf$/i.test(result.name) ? 'file-text' : /\.zip$/i.test(result.name) ? 'file-archive' : 'file-down')
            }));
        }

        children.push(el('div', { class: 'zt-download__info' }, [
            el('div', { class: 'zt-download__name', text: result.name }),
            el('div', { class: 'zt-download__meta', text: result.note || ZT.formatBytes(result.blob.size) })
        ]));

        children.push(el('button', {
            class: 'zt-btn zt-btn--primary', type: 'button',
            onclick: function () {
                ZT.triggerDownload(result.blob, result.name);
                ZT.toast('Saved ' + result.name, 'success');
            }
        }, [iconNode('download'), 'Download']));

        var body = el('div', {}, [el('div', { class: 'zt-download' }, children)]);

        // Audio and video results are far more useful with a player attached.
        if (result.previewKind === 'audio' || /^audio\//.test(result.blob.type)) {
            var audioUrl = URL.createObjectURL(result.blob);
            state.resultUrls.push(audioUrl);
            body.appendChild(el('audio', { class: 'zt-preview-media', controls: true, src: audioUrl }));
        } else if (result.previewKind === 'video' || /^video\//.test(result.blob.type)) {
            var videoUrl = URL.createObjectURL(result.blob);
            state.resultUrls.push(videoUrl);
            body.appendChild(el('video', { class: 'zt-preview-media', controls: true, src: videoUrl }));
        }

        return resultShell({ title: result.title || 'File', note: '' }, body, null, true);
    }

    function buildNodeResult(result) {
        var shell = resultShell(result, result.node);
        if (typeof result.onMount === 'function') {
            // Mount callbacks need the node in the document (iframes, animations).
            requestAnimationFrame(function () { result.onMount(); });
        }
        return shell;
    }

    /** Any element with data-copy copies its value — used by colour swatches. */
    function bindGlobalCopy() {
        document.addEventListener('click', async function (e) {
            var target = e.target.closest('[data-copy]');
            if (!target) return;
            var ok = await ZT.copyText(target.getAttribute('data-copy'));
            ZT.toast(ok ? 'Copied ' + target.getAttribute('data-copy') : 'Could not copy', ok ? 'success' : 'error');
        });
    }

    function resetAll() {
        state.files = [];
        state.text = '';
        state.opt = ZT.registry.defaults(state.tool);

        var textarea = $('#zt-text-input');
        if (textarea) textarea.value = '';
        updateCounter();

        renderFileList();
        renderOptions();
        clearResults();
        clearError();
        updateRunButton();

        if (state.tool.input === 'none') run();
    }

    /* ============================================================
       SIDEBAR — about, related, privacy
       ============================================================ */
    function renderSide(tool) {
        var host = $('#zt-side');
        if (!host) return;

        host.appendChild(el('div', { class: 'zt-side-card' }, [
            el('div', { class: 'zt-privacy-badge' }, [
                nodeFromHtml(icon('shield-check')),
                el('div', {}, [
                    el('strong', { text: 'Runs on your device' }),
                    el('p', { text: 'Files are read in your browser and never uploaded. Closing the tab erases everything.' })
                ])
            ])
        ]));

        var related = ZT.registry.inCategory(tool.category)
            .filter(function (t) { return t.id !== tool.id; })
            .slice(0, 6);

        if (related.length) {
            host.appendChild(el('div', { class: 'zt-side-card' }, [
                el('div', { class: 'zt-side-card__title', text: 'Related tools' }),
                el('div', { class: 'zt-related' }, related.map(toolLink))
            ]));
        }

        if (tool.howto && tool.howto.length) {
            host.appendChild(el('div', { class: 'zt-side-card' }, [
                el('div', { class: 'zt-side-card__title', text: 'How to use' }),
                el('ol', { style: { paddingLeft: '18px', fontSize: '13px', color: 'var(--fg-muted)', lineHeight: '1.7' } },
                    tool.howto.map(function (step) { return el('li', { text: step }); }))
            ]));
        }
    }

    function toolLink(tool) {
        return el('a', { href: ZT.url('tool.html') + '?id=' + tool.id }, [
            nodeFromHtml(icon(tool.icon)),
            el('span', { text: tool.name })
        ]);
    }

    /* ============================================================
       ICONS — inline SVG, no icon-font dependency
       ============================================================ */
    function icon(name) {
        return ZT.icons.svg(name);
    }

    function iconNode(name) {
        return nodeFromHtml(icon(name));
    }

    function nodeFromHtml(html) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        return wrapper.firstElementChild || document.createTextNode('');
    }

    /* ============================================================
       START
       ============================================================ */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    window.addEventListener('beforeunload', function () {
        revokeUrls();
        revokeInputUrls();
    });

})();
