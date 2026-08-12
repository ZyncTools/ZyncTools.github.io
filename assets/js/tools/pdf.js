/**
 * ZyncTools — PDF tools
 * Built on pdf-lib (writing) and PDF.js (rendering and text extraction).
 */
(function () {
    'use strict';

    var ZT = window.ZT;
    var define = ZT.registry.define;

    var PDF_ACCEPT = 'application/pdf,.pdf';

    /* ============================================================
       Shared helpers
       ============================================================ */

    /** Load a File into pdf-lib, with a clear message for encrypted files. */
    async function loadPdf(file, options) {
        var PDFLib = await ZT.libs.pdfLib();
        var bytes = await ZT.readAsArrayBuffer(file);
        try {
            return await PDFLib.PDFDocument.load(bytes, Object.assign({ ignoreEncryption: true }, options || {}));
        } catch (err) {
            if (/encrypt|password/i.test(err.message)) {
                ZT.fail('"' + file.name + '" is password-protected. Remove the password first with the Unlock PDF tool.');
            }
            ZT.fail('"' + file.name + '" could not be read as a PDF. It may be corrupt or not actually a PDF.');
        }
    }

    /** Open a File with PDF.js for rendering or text extraction. */
    async function openWithPdfJs(file, password) {
        var pdfjs = await ZT.libs.pdfJs();
        var bytes = await ZT.readAsArrayBuffer(file);
        try {
            return await pdfjs.getDocument({ data: bytes, password: password || undefined }).promise;
        } catch (err) {
            if (err && err.name === 'PasswordException') {
                ZT.fail('"' + file.name + '" needs a password to open.');
            }
            ZT.fail('"' + file.name + '" could not be opened: ' + (err.message || err));
        }
    }

    /**
     * Parse a page selection like "1-3, 7, 9-" into zero-based indices.
     * Accepts "all", negative-from-end shorthand and open ranges.
     */
    function parsePageRange(spec, pageCount) {
        var text = String(spec || '').trim().toLowerCase();
        if (!text || text === 'all' || text === '*') {
            return Array.from({ length: pageCount }, function (_, i) { return i; });
        }

        var pages = [];
        text.split(',').forEach(function (chunk) {
            chunk = chunk.trim();
            if (!chunk) return;

            if (chunk === 'odd') {
                for (var o = 0; o < pageCount; o += 2) pages.push(o);
                return;
            }
            if (chunk === 'even') {
                for (var e = 1; e < pageCount; e += 2) pages.push(e);
                return;
            }

            var range = chunk.match(/^(\d*)\s*-\s*(\d*)$/);
            if (range) {
                var from = range[1] ? parseInt(range[1], 10) : 1;
                var to = range[2] ? parseInt(range[2], 10) : pageCount;
                if (from > to) { var swap = from; from = to; to = swap; }
                for (var i = from; i <= to; i++) {
                    if (i >= 1 && i <= pageCount) pages.push(i - 1);
                }
                return;
            }

            var single = parseInt(chunk, 10);
            if (isNaN(single)) ZT.fail('"' + chunk + '" is not a valid page reference. Use formats like 1, 3-5, odd, even or all.');
            if (single < 1 || single > pageCount) {
                ZT.fail('Page ' + single + ' does not exist — this document has ' + pageCount + ' page' + (pageCount === 1 ? '' : 's') + '.');
            }
            pages.push(single - 1);
        });

        if (!pages.length) ZT.fail('That page selection matches no pages.');
        return pages;
    }

    var PAGE_RANGE_OPTION = {
        id: 'pages', type: 'text', label: 'Pages', value: 'all',
        help: 'Examples: all · 1-5 · 2,4,7 · 3- · odd · even'
    };

    var PAGE_SIZES = {
        a4: [595.28, 841.89], a3: [841.89, 1190.55], a5: [419.53, 595.28],
        letter: [612, 792], legal: [612, 1008], tabloid: [792, 1224]
    };

    function pdfBlob(bytes) {
        return new Blob([bytes], { type: 'application/pdf' });
    }

    /* ============================================================
       Merge
       ============================================================ */
    define({
        id: 'merge-pdf',
        name: 'Merge PDF',
        category: 'pdf',
        icon: 'combine',
        description: 'Combine several PDFs into one document, in the order you choose.',
        tags: ['merge', 'combine', 'join', 'concatenate', 'pdf'],
        input: 'files',
        accept: PDF_ACCEPT,
        popular: true,
        options: [
            {
                id: 'order', type: 'select', label: 'Page order', value: 'as-listed',
                options: [
                    { value: 'as-listed', label: 'The order files are listed' },
                    { value: 'name-asc', label: 'File name (A → Z)' },
                    { value: 'name-desc', label: 'File name (Z → A)' },
                    { value: 'reverse', label: 'Reverse of the listed order' }
                ]
            },
            { id: 'page-range', type: 'text', label: 'Take only these pages from each file', value: 'all', help: 'Applied to every file. Use "all" to keep everything.' },
            { id: 'add-bookmarks', type: 'checkbox', label: 'Add a bookmark per source file', value: true },
            { id: 'file-name', type: 'text', label: 'Output file name', value: 'merged.pdf' }
        ],
        run: async function (ctx) {
            if (ctx.files.length < 2) ZT.fail('Add at least two PDF files to merge.');

            var PDFLib = await ZT.libs.pdfLib();
            var files = ctx.files.slice();

            if (ctx.opt.order === 'name-asc') files.sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });
            else if (ctx.opt.order === 'name-desc') files.sort(function (a, b) { return b.name.localeCompare(a.name, undefined, { numeric: true }); });
            else if (ctx.opt.order === 'reverse') files.reverse();

            var merged = await PDFLib.PDFDocument.create();
            var bookmarks = [];
            var totalPages = 0;

            for (var i = 0; i < files.length; i++) {
                ctx.progress(i / files.length, 'Merging ' + files[i].name);
                var doc = await loadPdf(files[i]);
                var indices = parsePageRange(ctx.opt.pageRange, doc.getPageCount());
                var copied = await merged.copyPages(doc, indices);

                bookmarks.push({ title: ZT.stem(files[i].name), page: totalPages });
                copied.forEach(function (page) { merged.addPage(page); });
                totalPages += copied.length;
            }

            merged.setProducer('ZyncTools');
            merged.setCreationDate(new Date());
            if (ctx.opt.addBookmarks) attachOutline(merged, bookmarks);

            ctx.progress(1);
            var bytes = await merged.save();
            var name = ctx.opt.fileName.replace(/\.pdf$/i, '') + '.pdf';

            return ZT.fileResult(pdfBlob(bytes), name, {
                note: files.length + ' files · ' + totalPages + ' pages · ' + ZT.formatBytes(bytes.length)
            });
        }
    });

    /**
     * Write a flat PDF outline (bookmark) tree.
     * pdf-lib has no outline API, so the objects are built by hand.
     */
    function attachOutline(pdfDoc, entries) {
        if (!entries || entries.length < 2) return;
        try {
            var context = pdfDoc.context;
            var PDFLib = window.PDFLib;
            var pages = pdfDoc.getPages();

            var outlinesRef = context.nextRef();
            var itemRefs = entries.map(function () { return context.nextRef(); });

            entries.forEach(function (entry, i) {
                var page = pages[Math.min(entry.page, pages.length - 1)];
                var dict = new Map();
                dict.set(PDFLib.PDFName.of('Title'), PDFLib.PDFString.of(entry.title));
                dict.set(PDFLib.PDFName.of('Parent'), outlinesRef);
                dict.set(PDFLib.PDFName.of('Dest'), context.obj([page.ref, PDFLib.PDFName.of('Fit')]));
                if (i > 0) dict.set(PDFLib.PDFName.of('Prev'), itemRefs[i - 1]);
                if (i < entries.length - 1) dict.set(PDFLib.PDFName.of('Next'), itemRefs[i + 1]);
                context.assign(itemRefs[i], PDFLib.PDFDict.fromMapWithContext(dict, context));
            });

            var outlinesDict = new Map();
            outlinesDict.set(PDFLib.PDFName.of('Type'), PDFLib.PDFName.of('Outlines'));
            outlinesDict.set(PDFLib.PDFName.of('First'), itemRefs[0]);
            outlinesDict.set(PDFLib.PDFName.of('Last'), itemRefs[itemRefs.length - 1]);
            outlinesDict.set(PDFLib.PDFName.of('Count'), PDFLib.PDFNumber.of(entries.length));
            context.assign(outlinesRef, PDFLib.PDFDict.fromMapWithContext(outlinesDict, context));

            pdfDoc.catalog.set(PDFLib.PDFName.of('Outlines'), outlinesRef);
        } catch (e) {
            // Bookmarks are a nicety; never fail the merge over them.
            console.warn('[ZyncTools] Could not write bookmarks:', e);
        }
    }

    /* ============================================================
       Split
       ============================================================ */
    define({
        id: 'split-pdf',
        name: 'Split PDF',
        category: 'pdf',
        icon: 'scissors',
        description: 'Split a PDF into single pages, fixed-size chunks or custom ranges.',
        tags: ['split', 'divide', 'separate', 'extract', 'pdf'],
        input: 'file',
        accept: PDF_ACCEPT,
        popular: true,
        options: [
            {
                id: 'mode', type: 'select', label: 'Split into', value: 'every',
                options: [
                    { value: 'every', label: 'One file per page' },
                    { value: 'chunks', label: 'Chunks of N pages' },
                    { value: 'ranges', label: 'Custom ranges' },
                    { value: 'at', label: 'Split at specific pages' }
                ]
            },
            { id: 'chunk-size', type: 'number', label: 'Pages per file', value: 10, min: 1, max: 500, when: function (o) { return o.mode === 'chunks'; } },
            { id: 'ranges', type: 'text', label: 'Ranges', value: '1-3, 4-6', when: function (o) { return o.mode === 'ranges'; }, help: 'Each comma-separated range becomes its own file.' },
            { id: 'split-at', type: 'text', label: 'Start a new file at page', value: '5, 10', when: function (o) { return o.mode === 'at'; } },
            { id: 'name-prefix', type: 'text', label: 'File name prefix', value: '', placeholder: 'defaults to the original name' }
        ],
        run: async function (ctx) {
            var PDFLib = await ZT.libs.pdfLib();
            var file = ctx.files[0];
            var source = await loadPdf(file);
            var pageCount = source.getPageCount();
            if (pageCount < 2) ZT.fail('This PDF has only one page, so there is nothing to split.');

            var prefix = ctx.opt.namePrefix.trim() || ZT.stem(file.name);
            var groups = [];

            if (ctx.opt.mode === 'every') {
                for (var i = 0; i < pageCount; i++) groups.push({ pages: [i], label: String(i + 1) });
            } else if (ctx.opt.mode === 'chunks') {
                for (var start = 0; start < pageCount; start += ctx.opt.chunkSize) {
                    var chunk = [];
                    for (var p = start; p < Math.min(start + ctx.opt.chunkSize, pageCount); p++) chunk.push(p);
                    groups.push({ pages: chunk, label: (start + 1) + '-' + (start + chunk.length) });
                }
            } else if (ctx.opt.mode === 'ranges') {
                String(ctx.opt.ranges).split(',').forEach(function (range) {
                    if (!range.trim()) return;
                    var pages = parsePageRange(range, pageCount);
                    groups.push({ pages: pages, label: range.trim().replace(/\s+/g, '') });
                });
            } else {
                var breaks = String(ctx.opt.splitAt).split(',')
                    .map(function (n) { return parseInt(n.trim(), 10) - 1; })
                    .filter(function (n) { return n > 0 && n < pageCount; })
                    .sort(function (a, b) { return a - b; });
                if (!breaks.length) ZT.fail('Enter at least one page number between 2 and ' + pageCount + '.');

                var bounds = [0].concat(breaks, [pageCount]);
                for (var b = 0; b < bounds.length - 1; b++) {
                    var section = [];
                    for (p = bounds[b]; p < bounds[b + 1]; p++) section.push(p);
                    if (section.length) groups.push({ pages: section, label: (bounds[b] + 1) + '-' + bounds[b + 1] });
                }
            }

            if (!groups.length) ZT.fail('That produced no output files. Check the split settings.');

            var outputs = [];
            for (var g = 0; g < groups.length; g++) {
                ctx.progress(g / groups.length, 'Writing part ' + (g + 1) + ' of ' + groups.length);
                var doc = await PDFLib.PDFDocument.create();
                var copied = await doc.copyPages(source, groups[g].pages);
                copied.forEach(function (page) { doc.addPage(page); });
                doc.setProducer('ZyncTools');
                var bytes = await doc.save();
                outputs.push({
                    name: prefix + '-' + groups[g].label + '.pdf',
                    blob: pdfBlob(bytes),
                    pages: groups[g].pages.length
                });
            }
            ctx.progress(1);

            var results = outputs.map(function (o) {
                return ZT.fileResult(o.blob, o.name, { note: o.pages + ' page' + (o.pages === 1 ? '' : 's') });
            });

            if (outputs.length > 1) {
                var zip = await ZT.zipFiles(outputs, prefix + '-split.zip');
                return [ZT.fileResult(zip.blob, zip.name, { note: outputs.length + ' files' })].concat(results);
            }
            return results;
        }
    });

    /* ============================================================
       Extract / delete / reorder pages
       ============================================================ */
    define({
        id: 'pdf-page-manager',
        name: 'Extract, Delete & Reorder Pages',
        category: 'pdf',
        icon: 'file-stack',
        description: 'Keep, remove, duplicate or reorder pages in a PDF.',
        tags: ['pages', 'extract', 'delete', 'remove', 'reorder', 'rearrange', 'organise'],
        input: 'file',
        accept: PDF_ACCEPT,
        options: [
            {
                id: 'action', type: 'select', label: 'Action', value: 'keep',
                options: [
                    { value: 'keep', label: 'Keep only these pages' },
                    { value: 'delete', label: 'Delete these pages' },
                    { value: 'reorder', label: 'Reorder to this exact sequence' },
                    { value: 'reverse', label: 'Reverse all pages' }
                ]
            },
            Object.assign({}, PAGE_RANGE_OPTION, {
                value: '1-3',
                when: function (o) { return o.action !== 'reverse'; }
            }),
            { id: 'note', type: 'note', text: 'For reordering, list pages in the order you want them — repeats are allowed, so "3,1,1,2" is valid.' }
        ],
        run: async function (ctx) {
            var PDFLib = await ZT.libs.pdfLib();
            var file = ctx.files[0];
            var source = await loadPdf(file);
            var pageCount = source.getPageCount();

            var indices;
            if (ctx.opt.action === 'reverse') {
                indices = Array.from({ length: pageCount }, function (_, i) { return pageCount - 1 - i; });
            } else if (ctx.opt.action === 'delete') {
                var remove = parsePageRange(ctx.opt.pages, pageCount);
                indices = Array.from({ length: pageCount }, function (_, i) { return i; })
                    .filter(function (i) { return remove.indexOf(i) === -1; });
                if (!indices.length) ZT.fail('That would delete every page.');
            } else {
                indices = parsePageRange(ctx.opt.pages, pageCount);
            }

            var doc = await PDFLib.PDFDocument.create();
            var copied = await doc.copyPages(source, indices);
            copied.forEach(function (page) { doc.addPage(page); });
            doc.setProducer('ZyncTools');

            var bytes = await doc.save();
            var suffix = ctx.opt.action === 'keep' ? 'extracted'
                : ctx.opt.action === 'delete' ? 'trimmed'
                : ctx.opt.action === 'reverse' ? 'reversed' : 'reordered';

            return ZT.fileResult(pdfBlob(bytes), ZT.outName(file.name, suffix, 'pdf'), {
                note: pageCount + ' pages → ' + indices.length + ' pages · ' + ZT.formatBytes(bytes.length)
            });
        }
    });

    /* ============================================================
       Rotate
       ============================================================ */
    define({
        id: 'rotate-pdf',
        name: 'Rotate PDF',
        category: 'pdf',
        icon: 'rotate-cw',
        description: 'Rotate every page or just a selection to fix sideways scans.',
        tags: ['rotate', 'turn', 'orientation', 'landscape', 'portrait'],
        input: 'files',
        accept: PDF_ACCEPT,
        options: [
            {
                id: 'angle', type: 'select', label: 'Rotate by', value: '90',
                options: [
                    { value: '90', label: '90° clockwise' },
                    { value: '180', label: '180°' },
                    { value: '270', label: '90° anticlockwise' }
                ]
            },
            Object.assign({}, PAGE_RANGE_OPTION),
            { id: 'absolute', type: 'checkbox', label: 'Set this rotation instead of adding to it', value: false, help: 'Off means the rotation is added to whatever the page already has.' }
        ],
        run: async function (ctx) {
            var PDFLib = await ZT.libs.pdfLib();
            var angle = parseInt(ctx.opt.angle, 10);
            var out = [];

            for (var f = 0; f < ctx.files.length; f++) {
                ctx.progress(f / ctx.files.length, 'Rotating ' + ctx.files[f].name);
                var doc = await loadPdf(ctx.files[f]);
                var pages = doc.getPages();
                var targets = parsePageRange(ctx.opt.pages, pages.length);

                targets.forEach(function (i) {
                    var page = pages[i];
                    var current = ctx.opt.absolute ? 0 : page.getRotation().angle;
                    page.setRotation(PDFLib.degrees((current + angle) % 360));
                });

                doc.setProducer('ZyncTools');
                var bytes = await doc.save();
                out.push(ZT.fileResult(pdfBlob(bytes), ZT.outName(ctx.files[f].name, 'rotated', 'pdf'), {
                    note: targets.length + ' of ' + pages.length + ' pages rotated ' + angle + '°'
                }));
            }
            ctx.progress(1);
            return out;
        }
    });

    /* ============================================================
       Compress
       ============================================================ */
    define({
        id: 'compress-pdf',
        name: 'Compress PDF',
        category: 'pdf',
        icon: 'minimize-2',
        description: 'Reduce PDF size by re-rendering pages at a lower resolution and quality.',
        tags: ['compress', 'reduce', 'shrink', 'optimise', 'size'],
        input: 'files',
        accept: PDF_ACCEPT,
        popular: true,
        heavy: true,
        options: [
            {
                id: 'level', type: 'select', label: 'Compression level', value: 'balanced',
                options: [
                    { value: 'light', label: 'Light — 150 DPI, high quality' },
                    { value: 'balanced', label: 'Balanced — 120 DPI, good quality' },
                    { value: 'strong', label: 'Strong — 96 DPI, smaller' },
                    { value: 'extreme', label: 'Extreme — 72 DPI, smallest' },
                    { value: 'custom', label: 'Custom…' }
                ]
            },
            { id: 'dpi', type: 'range', label: 'Resolution', value: 120, min: 36, max: 300, step: 6, suffix: 'DPI', when: function (o) { return o.level === 'custom'; } },
            { id: 'quality', type: 'range', label: 'Image quality', value: 70, min: 20, max: 95, step: 5, suffix: '%', when: function (o) { return o.level === 'custom'; } },
            { id: 'grayscale', type: 'checkbox', label: 'Convert to greyscale', value: false, help: 'Often halves the size of colour scans.' },
            { id: 'note', type: 'note', text: 'Pages are rasterised, so the result looks identical but text stops being selectable. For text-heavy PDFs the original is often already smaller — the tool tells you if that is the case.' }
        ],
        run: async function (ctx) {
            var PRESETS = {
                light: { dpi: 150, quality: 0.82 },
                balanced: { dpi: 120, quality: 0.7 },
                strong: { dpi: 96, quality: 0.6 },
                extreme: { dpi: 72, quality: 0.45 }
            };
            var settings = ctx.opt.level === 'custom'
                ? { dpi: ctx.opt.dpi, quality: ctx.opt.quality / 100 }
                : PRESETS[ctx.opt.level];

            var PDFLib = await ZT.libs.pdfLib();
            var out = [];

            for (var f = 0; f < ctx.files.length; f++) {
                var file = ctx.files[f];
                var pdf = await openWithPdfJs(file);
                var doc = await PDFLib.PDFDocument.create();

                for (var p = 1; p <= pdf.numPages; p++) {
                    if (ctx.signal && ctx.signal.aborted) ZT.fail('Cancelled.');
                    ctx.progress((f + p / pdf.numPages) / ctx.files.length, 'Page ' + p + ' of ' + pdf.numPages);

                    var page = await pdf.getPage(p);
                    // PDF user-space is 72 units per inch; scale to hit the target DPI.
                    var viewport = page.getViewport({ scale: settings.dpi / 72 });
                    var canvas = ZT.makeCanvas(viewport.width, viewport.height);
                    var canvasCtx = canvas.getContext('2d');
                    canvasCtx.fillStyle = '#ffffff';
                    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
                    await page.render({ canvasContext: canvasCtx, viewport: viewport }).promise;

                    if (ctx.opt.grayscale) {
                        ZT.mapPixels(canvas, function (r, g, b, a, i, data) {
                            var lum = 0.299 * r + 0.587 * g + 0.114 * b;
                            data[i] = data[i + 1] = data[i + 2] = lum;
                        });
                    }

                    var jpegBlob = await ZT.encodeCanvas(canvas, 'jpeg', settings.quality);
                    var embedded = await doc.embedJpg(await jpegBlob.arrayBuffer());

                    // Keep the original page dimensions so print size is unchanged.
                    var original = page.getViewport({ scale: 1 });
                    var newPage = doc.addPage([original.width, original.height]);
                    newPage.drawImage(embedded, { x: 0, y: 0, width: original.width, height: original.height });
                }

                doc.setProducer('ZyncTools');
                var bytes = await doc.save();
                var saved = file.size - bytes.length;

                out.push(ZT.fileResult(pdfBlob(bytes), ZT.outName(file.name, 'compressed', 'pdf'), {
                    note: saved > 0
                        ? ZT.formatBytes(file.size) + ' → ' + ZT.formatBytes(bytes.length) + '  (' + Math.round(saved / file.size * 100) + '% smaller)'
                        : 'This PDF was already well optimised — the compressed version is ' + ZT.formatBytes(bytes.length) + ', larger than the ' + ZT.formatBytes(file.size) + ' original. Keep your original file.'
                }));
            }
            ctx.progress(1);
            return out;
        }
    });

    /* ============================================================
       PDF ⇄ images
       ============================================================ */
    define({
        id: 'pdf-to-image',
        name: 'PDF to Images',
        category: 'pdf',
        icon: 'image',
        description: 'Render PDF pages as PNG, JPEG or WebP images at any resolution.',
        tags: ['pdf to jpg', 'pdf to png', 'convert', 'render', 'export', 'image'],
        input: 'file',
        accept: PDF_ACCEPT,
        options: [
            Object.assign({}, PAGE_RANGE_OPTION),
            {
                id: 'format', type: 'select', label: 'Image format', value: 'png',
                options: [
                    { value: 'png', label: 'PNG — lossless' },
                    { value: 'jpeg', label: 'JPEG — smaller' },
                    { value: 'webp', label: 'WebP — smallest' }
                ]
            },
            { id: 'dpi', type: 'select', label: 'Resolution', value: '150',
              options: [
                  { value: '72', label: '72 DPI — screen' }, { value: '150', label: '150 DPI — good quality' },
                  { value: '300', label: '300 DPI — print' }, { value: '600', label: '600 DPI — very large files' }
              ] },
            { id: 'quality', type: 'range', label: 'Quality', value: 90, min: 30, max: 100, step: 1, suffix: '%', when: function (o) { return o.format !== 'png'; } },
            { id: 'background', type: 'color', label: 'Background colour', value: '#FFFFFF' },
            { id: 'transparent', type: 'checkbox', label: 'Transparent background (PNG only)', value: false, when: function (o) { return o.format === 'png'; } }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var file = ctx.files[0];
            var pdf = await openWithPdfJs(file);
            var targets = parsePageRange(o.pages, pdf.numPages);
            var scale = parseInt(o.dpi, 10) / 72;

            var outputs = [];
            for (var i = 0; i < targets.length; i++) {
                if (ctx.signal && ctx.signal.aborted) ZT.fail('Cancelled.');
                var pageNumber = targets[i] + 1;
                ctx.progress(i / targets.length, 'Rendering page ' + pageNumber);

                var page = await pdf.getPage(pageNumber);
                var viewport = page.getViewport({ scale: scale });
                if (viewport.width * viewport.height > 80e6) {
                    ZT.fail('Page ' + pageNumber + ' would be over 80 megapixels at ' + o.dpi + ' DPI. Choose a lower resolution.');
                }

                var canvas = ZT.makeCanvas(viewport.width, viewport.height);
                var canvasCtx = canvas.getContext('2d');
                if (!(o.format === 'png' && o.transparent)) {
                    canvasCtx.fillStyle = o.background;
                    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
                }
                await page.render({ canvasContext: canvasCtx, viewport: viewport }).promise;

                var blob = await ZT.encodeCanvas(canvas, o.format, o.format === 'png' ? undefined : o.quality / 100);
                outputs.push({
                    name: ZT.stem(file.name) + '-page-' + String(pageNumber).padStart(3, '0') + '.' + (o.format === 'jpeg' ? 'jpg' : o.format),
                    blob: blob,
                    dims: Math.round(viewport.width) + '×' + Math.round(viewport.height)
                });
            }
            ctx.progress(1);

            var results = outputs.map(function (out) {
                return ZT.fileResult(out.blob, out.name, { previewBlob: out.blob, note: out.dims + ' · ' + ZT.formatBytes(out.blob.size) });
            });

            if (outputs.length > 1) {
                var zip = await ZT.zipFiles(outputs, ZT.stem(file.name) + '-pages.zip');
                return [ZT.fileResult(zip.blob, zip.name, { note: outputs.length + ' images' })].concat(results);
            }
            return results;
        }
    });

    define({
        id: 'image-to-pdf',
        name: 'Images to PDF',
        category: 'pdf',
        icon: 'file-plus',
        description: 'Turn photos and scans into a single PDF with control over page size.',
        tags: ['jpg to pdf', 'png to pdf', 'image to pdf', 'convert', 'scan'],
        input: 'files',
        accept: 'image/*',
        popular: true,
        options: [
            {
                id: 'page-size', type: 'select', label: 'Page size', value: 'fit',
                options: [
                    { value: 'fit', label: 'Match each image exactly' },
                    { value: 'a4', label: 'A4' }, { value: 'letter', label: 'US Letter' },
                    { value: 'a3', label: 'A3' }, { value: 'a5', label: 'A5' }, { value: 'legal', label: 'US Legal' }
                ]
            },
            {
                id: 'orientation', type: 'select', label: 'Orientation', value: 'auto',
                options: [
                    { value: 'auto', label: 'Match each image' },
                    { value: 'portrait', label: 'Portrait' },
                    { value: 'landscape', label: 'Landscape' }
                ],
                when: function (o) { return o.pageSize !== 'fit'; }
            },
            { id: 'margin', type: 'number', label: 'Page margin', suffix: 'pt', value: 0, min: 0, max: 200, when: function (o) { return o.pageSize !== 'fit'; } },
            {
                id: 'fit-mode', type: 'select', label: 'Fit images by', value: 'contain',
                options: [
                    { value: 'contain', label: 'Fitting inside the page' },
                    { value: 'cover', label: 'Filling the page and cropping' },
                    { value: 'stretch', label: 'Stretching to fill (may distort)' }
                ],
                when: function (o) { return o.pageSize !== 'fit'; }
            },
            { id: 'background', type: 'color', label: 'Page background', value: '#FFFFFF', when: function (o) { return o.pageSize !== 'fit'; } },
            { id: 'quality', type: 'range', label: 'Image quality', value: 88, min: 30, max: 100, step: 1, suffix: '%' },
            {
                id: 'order', type: 'select', label: 'Page order', value: 'as-listed',
                options: [
                    { value: 'as-listed', label: 'The order files are listed' },
                    { value: 'name-asc', label: 'File name (A → Z)' },
                    { value: 'name-desc', label: 'File name (Z → A)' }
                ]
            },
            { id: 'file-name', type: 'text', label: 'Output file name', value: 'images.pdf' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var PDFLib = await ZT.libs.pdfLib();
            var doc = await PDFLib.PDFDocument.create();

            var files = ctx.files.slice();
            if (o.order === 'name-asc') files.sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });
            else if (o.order === 'name-desc') files.sort(function (a, b) { return b.name.localeCompare(a.name, undefined, { numeric: true }); });

            var bg = ZT.color ? ZT.color.parse(o.background) : [255, 255, 255, 1];

            for (var i = 0; i < files.length; i++) {
                ctx.progress(i / files.length, 'Adding ' + files[i].name);

                var bitmap = await ZT.loadImage(files[i]);
                var size = ZT.imageSize(bitmap);

                // Always re-encode to JPEG so pdf-lib can embed any input format.
                var canvas = ZT.flattenAlpha(ZT.drawToCanvas(bitmap), o.background);
                var jpeg = await ZT.encodeCanvas(canvas, 'jpeg', o.quality / 100);
                var embedded = await doc.embedJpg(await jpeg.arrayBuffer());

                if (o.pageSize === 'fit') {
                    var page = doc.addPage([size.width, size.height]);
                    page.drawImage(embedded, { x: 0, y: 0, width: size.width, height: size.height });
                } else {
                    var dims = PAGE_SIZES[o.pageSize].slice();
                    var wantLandscape = o.orientation === 'landscape' ||
                        (o.orientation === 'auto' && size.width > size.height);
                    if (wantLandscape) dims = [dims[1], dims[0]];

                    var pageRef = doc.addPage(dims);
                    if (bg) {
                        pageRef.drawRectangle({
                            x: 0, y: 0, width: dims[0], height: dims[1],
                            color: PDFLib.rgb(bg[0] / 255, bg[1] / 255, bg[2] / 255)
                        });
                    }

                    var boxW = dims[0] - o.margin * 2;
                    var boxH = dims[1] - o.margin * 2;
                    var drawW, drawH;

                    if (o.fitMode === 'stretch') {
                        drawW = boxW; drawH = boxH;
                    } else if (o.fitMode === 'cover') {
                        var coverScale = Math.max(boxW / size.width, boxH / size.height);
                        drawW = size.width * coverScale;
                        drawH = size.height * coverScale;
                    } else {
                        var fit = ZT.fitInside(size.width, size.height, boxW, boxH);
                        drawW = fit.width; drawH = fit.height;
                    }

                    pageRef.drawImage(embedded, {
                        x: (dims[0] - drawW) / 2,
                        y: (dims[1] - drawH) / 2,
                        width: drawW, height: drawH
                    });
                }
                if (bitmap.close) bitmap.close();
            }

            doc.setProducer('ZyncTools');
            doc.setCreationDate(new Date());
            ctx.progress(1);

            var bytes = await doc.save();
            var name = o.fileName.replace(/\.pdf$/i, '') + '.pdf';
            return ZT.fileResult(pdfBlob(bytes), name, {
                note: files.length + ' images · ' + ZT.formatBytes(bytes.length)
            });
        }
    });

    /* ============================================================
       Text extraction
       ============================================================ */
    define({
        id: 'pdf-to-text',
        name: 'PDF to Text',
        category: 'pdf',
        icon: 'file-text',
        description: 'Extract the text layer from a PDF, with layout or plain output.',
        tags: ['pdf to text', 'extract', 'copy text', 'txt', 'content'],
        input: 'file',
        accept: PDF_ACCEPT,
        options: [
            Object.assign({}, PAGE_RANGE_OPTION),
            {
                id: 'layout', type: 'select', label: 'Layout', value: 'lines',
                options: [
                    { value: 'lines', label: 'Preserve line breaks' },
                    { value: 'paragraphs', label: 'Join lines into paragraphs' },
                    { value: 'raw', label: 'Raw text chunks' }
                ]
            },
            { id: 'page-markers', type: 'checkbox', label: 'Insert a marker between pages', value: true },
            { id: 'download-txt', type: 'checkbox', label: 'Offer a .txt download', value: true }
        ],
        run: async function (ctx) {
            var file = ctx.files[0];
            var pdf = await openWithPdfJs(file);
            var targets = parsePageRange(ctx.opt.pages, pdf.numPages);

            var pageTexts = [];
            for (var i = 0; i < targets.length; i++) {
                ctx.progress(i / targets.length, 'Reading page ' + (targets[i] + 1));
                var page = await pdf.getPage(targets[i] + 1);
                var content = await page.getTextContent();

                var text;
                if (ctx.opt.layout === 'raw') {
                    text = content.items.map(function (item) { return item.str; }).join(' ');
                } else {
                    // Group items into visual lines using their Y transform.
                    var rows = {};
                    content.items.forEach(function (item) {
                        var y = Math.round(item.transform[5]);
                        (rows[y] = rows[y] || []).push(item);
                    });
                    var lines = Object.keys(rows)
                        .sort(function (a, b) { return b - a; })
                        .map(function (y) {
                            return rows[y]
                                .sort(function (a, b) { return a.transform[4] - b.transform[4]; })
                                .map(function (item) { return item.str; })
                                .join('')
                                .replace(/\s+/g, ' ')
                                .trim();
                        })
                        .filter(Boolean);

                    text = ctx.opt.layout === 'paragraphs'
                        ? lines.join(' ').replace(/\s{2,}/g, ' ')
                        : lines.join('\n');
                }
                pageTexts.push({ page: targets[i] + 1, text: text });
            }
            ctx.progress(1);

            var joined = pageTexts.map(function (p) {
                return ctx.opt.pageMarkers ? '--- Page ' + p.page + ' ---\n' + p.text : p.text;
            }).join('\n\n');

            var characters = joined.replace(/--- Page \d+ ---/g, '').trim().length;
            var results = [];

            if (characters < 20) {
                results.push(ZT.dataResult([{
                    label: 'No text found',
                    value: 'This PDF has no text layer — it is most likely a scan. Use the "Scanned PDF to Text (OCR)" tool instead.'
                }], { title: 'Heads up' }));
            }

            results.push(ZT.textResult(joined, {
                note: ZT.formatNumber(characters) + ' characters from ' + targets.length + ' page' + (targets.length === 1 ? '' : 's')
            }));

            if (ctx.opt.downloadTxt && characters) {
                results.push(ZT.fileResult(new Blob([joined], { type: 'text/plain;charset=utf-8' }),
                    ZT.outName(file.name, '', 'txt')));
            }
            return results;
        }
    });

    /* ============================================================
       OCR
       ============================================================ */
    define({
        id: 'pdf-ocr',
        name: 'Scanned PDF to Text (OCR)',
        category: 'pdf',
        icon: 'scan-text',
        description: 'Read text out of scanned PDFs and images using in-browser OCR.',
        tags: ['ocr', 'scan', 'recognise', 'text', 'tesseract', 'image to text'],
        input: 'file',
        accept: PDF_ACCEPT + ',image/*',
        heavy: true,
        options: [
            {
                id: 'language', type: 'select', label: 'Language', value: 'eng',
                options: [
                    { value: 'eng', label: 'English' }, { value: 'spa', label: 'Spanish' },
                    { value: 'fra', label: 'French' }, { value: 'deu', label: 'German' },
                    { value: 'ita', label: 'Italian' }, { value: 'por', label: 'Portuguese' },
                    { value: 'nld', label: 'Dutch' }, { value: 'rus', label: 'Russian' },
                    { value: 'hin', label: 'Hindi' }, { value: 'ara', label: 'Arabic' },
                    { value: 'chi_sim', label: 'Chinese (Simplified)' }, { value: 'jpn', label: 'Japanese' },
                    { value: 'kor', label: 'Korean' }
                ]
            },
            Object.assign({}, PAGE_RANGE_OPTION, { value: '1-5', help: 'OCR is slow — start with a few pages. Examples: 1-5 · 2,4 · all' }),
            { id: 'dpi', type: 'select', label: 'Render resolution', value: '200',
              options: [{ value: '150', label: '150 DPI — faster' }, { value: '200', label: '200 DPI — recommended' }, { value: '300', label: '300 DPI — most accurate, slowest' }] },
            { id: 'preprocess', type: 'checkbox', label: 'Boost contrast before reading', value: true, help: 'Usually improves accuracy on faint or greyish scans.' },
            { id: 'note', type: 'note', text: 'The first run downloads a language model of roughly 10–15 MB. Everything stays in your browser.' }
        ],
        run: async function (ctx) {
            var file = ctx.files[0];
            var Tesseract = await ZT.libs.tesseract();
            var isPdf = ZT.extOf(file.name) === 'pdf' || file.type === 'application/pdf';

            var canvases = [];
            if (isPdf) {
                var pdf = await openWithPdfJs(file);
                var targets = parsePageRange(ctx.opt.pages, pdf.numPages);
                for (var i = 0; i < targets.length; i++) {
                    ctx.progress(0.05 * (i / targets.length), 'Rendering page ' + (targets[i] + 1));
                    var page = await pdf.getPage(targets[i] + 1);
                    var viewport = page.getViewport({ scale: parseInt(ctx.opt.dpi, 10) / 72 });
                    var canvas = ZT.makeCanvas(viewport.width, viewport.height);
                    var cctx = canvas.getContext('2d');
                    cctx.fillStyle = '#ffffff';
                    cctx.fillRect(0, 0, canvas.width, canvas.height);
                    await page.render({ canvasContext: cctx, viewport: viewport }).promise;
                    canvases.push({ label: 'Page ' + (targets[i] + 1), canvas: canvas });
                }
            } else {
                var bitmap = await ZT.loadImage(file);
                canvases.push({ label: file.name, canvas: ZT.drawToCanvas(bitmap) });
            }

            if (ctx.opt.preprocess) {
                canvases.forEach(function (item) {
                    ZT.mapPixels(item.canvas, function (r, g, b, a, idx, data) {
                        var lum = 0.299 * r + 0.587 * g + 0.114 * b;
                        // Push mid greys toward black or white so glyph edges sharpen.
                        var boosted = lum < 128 ? Math.max(0, lum - 40) : Math.min(255, lum + 40);
                        data[idx] = data[idx + 1] = data[idx + 2] = boosted;
                    });
                });
            }

            var worker = await Tesseract.createWorker(ctx.opt.language, 1, {
                logger: function (m) {
                    if (m.status === 'recognizing text') {
                        ctx.progress(0.1 + m.progress * 0.85, 'Reading text…');
                    } else if (m.status) {
                        ctx.progress(0.06, m.status.replace(/^\w/, function (c) { return c.toUpperCase(); }));
                    }
                }
            });

            try {
                var sections = [];
                var totalConfidence = 0;
                for (var c = 0; c < canvases.length; c++) {
                    ctx.progress(0.1 + (c / canvases.length) * 0.85, 'Reading ' + canvases[c].label);
                    var result = await worker.recognize(canvases[c].canvas);
                    totalConfidence += result.data.confidence || 0;
                    sections.push('--- ' + canvases[c].label + ' ---\n' + (result.data.text || '').trim());
                }

                var text = sections.join('\n\n');
                var plain = text.replace(/--- [^\n]+ ---/g, '').trim();
                ctx.progress(1);

                if (!plain) {
                    ZT.fail('No text could be recognised. Try a higher resolution, or check the language setting.');
                }

                return [
                    ZT.dataResult([
                        { label: 'Pages read', value: String(canvases.length) },
                        { label: 'Characters found', value: ZT.formatNumber(plain.length) },
                        { label: 'Average confidence', value: Math.round(totalConfidence / canvases.length) + '%' }
                    ], { title: 'OCR summary', columns: 3 }),
                    ZT.textResult(text),
                    ZT.fileResult(new Blob([text], { type: 'text/plain;charset=utf-8' }), ZT.outName(file.name, 'ocr', 'txt'))
                ];
            } finally {
                await worker.terminate();
            }
        }
    });

    /* ============================================================
       Watermark
       ============================================================ */
    define({
        id: 'watermark-pdf',
        name: 'Watermark PDF',
        category: 'pdf',
        icon: 'stamp',
        description: 'Stamp text across PDF pages — DRAFT, CONFIDENTIAL or your own wording.',
        tags: ['watermark', 'stamp', 'draft', 'confidential', 'copyright'],
        input: 'files',
        accept: PDF_ACCEPT,
        options: [
            { id: 'text', type: 'text', label: 'Watermark text', value: 'CONFIDENTIAL' },
            { id: 'font-size', type: 'range', label: 'Font size', value: 60, min: 8, max: 200, step: 1, suffix: 'pt' },
            { id: 'color', type: 'color', label: 'Colour', value: '#FF0000' },
            { id: 'opacity', type: 'range', label: 'Opacity', value: 15, min: 2, max: 100, step: 1, suffix: '%' },
            { id: 'rotation', type: 'range', label: 'Rotation', value: 45, min: -90, max: 90, step: 5, suffix: '°' },
            {
                id: 'position', type: 'select', label: 'Position', value: 'center',
                options: [
                    { value: 'center', label: 'Centre of the page' },
                    { value: 'top', label: 'Top' }, { value: 'bottom', label: 'Bottom' },
                    { value: 'tile', label: 'Tiled across the page' }
                ]
            },
            { id: 'tile-rows', type: 'number', label: 'Tile rows', value: 4, min: 1, max: 12, when: function (o) { return o.position === 'tile'; } },
            { id: 'tile-cols', type: 'number', label: 'Tile columns', value: 3, min: 1, max: 12, when: function (o) { return o.position === 'tile'; } },
            {
                id: 'font', type: 'select', label: 'Font', value: 'Helvetica',
                options: [
                    { value: 'Helvetica', label: 'Helvetica' }, { value: 'HelveticaBold', label: 'Helvetica Bold' },
                    { value: 'TimesRoman', label: 'Times Roman' }, { value: 'Courier', label: 'Courier' }
                ]
            },
            Object.assign({}, PAGE_RANGE_OPTION),
            { id: 'behind', type: 'checkbox', label: 'Draw behind the page content', value: false, help: 'Only visible where the page background is transparent.' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            if (!String(o.text).trim()) ZT.fail('Enter some watermark text.');

            var PDFLib = await ZT.libs.pdfLib();
            var rgb = ZT.color.parse(o.color) || [255, 0, 0, 1];
            var out = [];

            for (var f = 0; f < ctx.files.length; f++) {
                ctx.progress(f / ctx.files.length, 'Stamping ' + ctx.files[f].name);
                var doc = await loadPdf(ctx.files[f]);
                var font = await doc.embedFont(PDFLib.StandardFonts[o.font] || PDFLib.StandardFonts.Helvetica);
                var pages = doc.getPages();
                var targets = parsePageRange(o.pages, pages.length);

                targets.forEach(function (index) {
                    var page = pages[index];
                    var size = page.getSize();
                    var textWidth = font.widthOfTextAtSize(o.text, o.fontSize);

                    var common = {
                        size: o.fontSize,
                        font: font,
                        color: PDFLib.rgb(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255),
                        opacity: o.opacity / 100,
                        rotate: PDFLib.degrees(o.rotation)
                    };

                    if (o.position === 'tile') {
                        var stepX = size.width / o.tileCols;
                        var stepY = size.height / o.tileRows;
                        for (var r = 0; r < o.tileRows; r++) {
                            for (var c = 0; c < o.tileCols; c++) {
                                page.drawText(o.text, Object.assign({}, common, {
                                    x: stepX * (c + 0.5) - textWidth / 2,
                                    y: stepY * (r + 0.5)
                                }));
                            }
                        }
                    } else {
                        var y = o.position === 'top' ? size.height - o.fontSize * 1.5
                            : o.position === 'bottom' ? o.fontSize
                            : size.height / 2;
                        page.drawText(o.text, Object.assign({}, common, {
                            x: size.width / 2 - textWidth / 2,
                            y: y
                        }));
                    }
                });

                doc.setProducer('ZyncTools');
                var bytes = await doc.save();
                out.push(ZT.fileResult(pdfBlob(bytes), ZT.outName(ctx.files[f].name, 'watermarked', 'pdf'), {
                    note: targets.length + ' page' + (targets.length === 1 ? '' : 's') + ' stamped'
                }));
            }
            ctx.progress(1);
            return out;
        }
    });

    /* ============================================================
       Page numbers / header & footer
       ============================================================ */
    define({
        id: 'pdf-page-numbers',
        name: 'Add Page Numbers & Headers',
        category: 'pdf',
        icon: 'hash',
        description: 'Number PDF pages and add headers or footers with custom text.',
        tags: ['page numbers', 'header', 'footer', 'pagination', 'numbering'],
        input: 'file',
        accept: PDF_ACCEPT,
        options: [
            { id: 'add-numbers', type: 'checkbox', label: 'Add page numbers', value: true },
            {
                id: 'format', type: 'select', label: 'Number format', value: 'n-of-total',
                options: [
                    { value: 'plain', label: '1' },
                    { value: 'n-of-total', label: '1 of 10' },
                    { value: 'page-n', label: 'Page 1' },
                    { value: 'page-n-of-total', label: 'Page 1 of 10' },
                    { value: 'dashes', label: '- 1 -' }
                ],
                when: function (o) { return o.addNumbers; }
            },
            {
                id: 'position', type: 'select', label: 'Number position', value: 'bottom-center',
                options: [
                    { value: 'bottom-center', label: 'Bottom centre' }, { value: 'bottom-right', label: 'Bottom right' },
                    { value: 'bottom-left', label: 'Bottom left' }, { value: 'top-center', label: 'Top centre' },
                    { value: 'top-right', label: 'Top right' }, { value: 'top-left', label: 'Top left' }
                ],
                when: function (o) { return o.addNumbers; }
            },
            { id: 'start-at', type: 'number', label: 'Start numbering at', value: 1, min: 0, max: 10000, when: function (o) { return o.addNumbers; } },
            { id: 'skip-first', type: 'checkbox', label: 'Skip the first page (cover)', value: false, when: function (o) { return o.addNumbers; } },
            { id: 'header-text', type: 'text', label: 'Header text', value: '', placeholder: 'leave empty for no header' },
            { id: 'footer-text', type: 'text', label: 'Footer text', value: '', placeholder: 'leave empty for no footer' },
            { id: 'font-size', type: 'number', label: 'Font size', suffix: 'pt', value: 10, min: 5, max: 48 },
            { id: 'color', type: 'color', label: 'Text colour', value: '#555555' },
            { id: 'margin', type: 'number', label: 'Distance from edge', suffix: 'pt', value: 28, min: 5, max: 150 }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            if (!o.addNumbers && !o.headerText && !o.footerText) {
                ZT.fail('Turn on page numbers, or enter header or footer text.');
            }

            var PDFLib = await ZT.libs.pdfLib();
            var file = ctx.files[0];
            var doc = await loadPdf(file);
            var font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
            var pages = doc.getPages();
            var rgb = ZT.color.parse(o.color) || [85, 85, 85, 1];
            var color = PDFLib.rgb(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);

            var numbered = o.skipFirst ? pages.length - 1 : pages.length;

            pages.forEach(function (page, index) {
                var size = page.getSize();

                function drawCentred(text, y) {
                    if (!text) return;
                    var width = font.widthOfTextAtSize(text, o.fontSize);
                    page.drawText(text, { x: size.width / 2 - width / 2, y: y, size: o.fontSize, font: font, color: color });
                }

                if (o.headerText) drawCentred(o.headerText, size.height - o.margin);
                if (o.footerText) drawCentred(o.footerText, o.margin - (o.addNumbers && /^bottom/.test(o.position) ? 0 : 0) + (o.addNumbers && /^bottom/.test(o.position) ? o.fontSize * 1.4 : 0));

                if (o.addNumbers) {
                    if (o.skipFirst && index === 0) return;
                    var displayed = o.startAt + index - (o.skipFirst ? 1 : 0);

                    var label;
                    switch (o.format) {
                        case 'n-of-total': label = displayed + ' of ' + (o.startAt + numbered - 1); break;
                        case 'page-n': label = 'Page ' + displayed; break;
                        case 'page-n-of-total': label = 'Page ' + displayed + ' of ' + (o.startAt + numbered - 1); break;
                        case 'dashes': label = '- ' + displayed + ' -'; break;
                        default: label = String(displayed);
                    }

                    var width = font.widthOfTextAtSize(label, o.fontSize);
                    var parts = o.position.split('-');
                    var x = parts[1] === 'left' ? o.margin
                        : parts[1] === 'right' ? size.width - o.margin - width
                        : size.width / 2 - width / 2;
                    var y = parts[0] === 'top' ? size.height - o.margin : o.margin;

                    page.drawText(label, { x: x, y: y, size: o.fontSize, font: font, color: color });
                }
            });

            doc.setProducer('ZyncTools');
            var bytes = await doc.save();
            return ZT.fileResult(pdfBlob(bytes), ZT.outName(file.name, 'numbered', 'pdf'), {
                note: pages.length + ' pages · ' + ZT.formatBytes(bytes.length)
            });
        }
    });

    /* ============================================================
       Protect / unlock
       ============================================================ */
    define({
        id: 'protect-pdf',
        name: 'Password Protect PDF',
        category: 'pdf',
        icon: 'lock',
        description: 'Encrypt a PDF with a password and set what readers are allowed to do.',
        tags: ['password', 'protect', 'encrypt', 'secure', 'lock'],
        input: 'file',
        accept: PDF_ACCEPT,
        options: [
            { id: 'password', type: 'text', label: 'Password to open the document', value: '', placeholder: 'choose a strong password' },
            { id: 'owner-password', type: 'text', label: 'Owner password (optional)', value: '', help: 'Controls permissions. Leave empty to reuse the password above.' },
            { id: 'allow-printing', type: 'checkbox', label: 'Allow printing', value: true },
            { id: 'allow-copying', type: 'checkbox', label: 'Allow copying text', value: false },
            { id: 'allow-modifying', type: 'checkbox', label: 'Allow editing', value: false },
            { id: 'allow-annotations', type: 'checkbox', label: 'Allow comments and annotations', value: false },
            { id: 'note', type: 'note', text: 'Encryption happens in your browser and the password is never transmitted. Keep a copy — a lost password cannot be recovered.' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            if (!o.password) ZT.fail('Enter a password.');
            if (o.password.length < 4) ZT.fail('Use a password of at least 4 characters.');

            var file = ctx.files[0];
            ctx.progress(0.2, 'Loading the encryption engine');

            var qpdf = await loadQpdf();
            var bytes = new Uint8Array(await ZT.readAsArrayBuffer(file));

            ctx.progress(0.6, 'Encrypting');
            var result = qpdf.encrypt(bytes, {
                userPassword: o.password,
                ownerPassword: o.ownerPassword || o.password,
                permissions: {
                    print: o.allowPrinting,
                    modify: o.allowModifying,
                    extract: o.allowCopying,
                    annotate: o.allowAnnotations
                }
            });

            return ZT.fileResult(pdfBlob(result), ZT.outName(file.name, 'protected', 'pdf'), {
                note: 'Encrypted with AES-256 · ' + ZT.formatBytes(result.length)
            });
        }
    });

    define({
        id: 'unlock-pdf',
        name: 'Unlock PDF',
        category: 'pdf',
        icon: 'unlock',
        description: 'Remove a known password from a PDF so it opens without prompting.',
        tags: ['unlock', 'remove password', 'decrypt', 'password'],
        input: 'file',
        accept: PDF_ACCEPT,
        options: [
            { id: 'password', type: 'text', label: 'Current password', value: '', placeholder: 'the password the file opens with' },
            { id: 'note', type: 'note', text: 'You must know the password — this tool removes a password you already have, it does not crack unknown ones.' }
        ],
        run: async function (ctx) {
            var file = ctx.files[0];
            var qpdf = await loadQpdf();
            var bytes = new Uint8Array(await ZT.readAsArrayBuffer(file));

            var result;
            try {
                result = qpdf.decrypt(bytes, ctx.opt.password || '');
            } catch (err) {
                if (/password/i.test(String(err && err.message))) {
                    ZT.fail('That password did not work. Check it and try again.');
                }
                ZT.fail('Could not unlock this PDF: ' + (err.message || err));
            }

            return ZT.fileResult(pdfBlob(result), ZT.outName(file.name, 'unlocked', 'pdf'), {
                note: 'Password removed · ' + ZT.formatBytes(result.length)
            });
        }
    });

    /* ============================================================
       PDF metadata
       ============================================================ */
    define({
        id: 'pdf-metadata',
        name: 'PDF Metadata Editor',
        category: 'pdf',
        icon: 'file-cog',
        description: 'View and rewrite the title, author, subject and keywords of a PDF.',
        tags: ['metadata', 'properties', 'author', 'title', 'keywords', 'privacy'],
        input: 'file',
        accept: PDF_ACCEPT,
        options: [
            {
                id: 'action', type: 'radio', label: 'What to do', value: 'view',
                options: [
                    { value: 'view', label: 'Just show the current metadata' },
                    { value: 'edit', label: 'Set new values' },
                    { value: 'strip', label: 'Remove all metadata' }
                ]
            },
            { id: 'title', type: 'text', label: 'Title', value: '', when: actionIsEdit },
            { id: 'author', type: 'text', label: 'Author', value: '', when: actionIsEdit },
            { id: 'subject', type: 'text', label: 'Subject', value: '', when: actionIsEdit },
            { id: 'keywords', type: 'text', label: 'Keywords', value: '', when: actionIsEdit, help: 'Comma-separated.' },
            { id: 'creator', type: 'text', label: 'Creator application', value: '', when: actionIsEdit }
        ],
        run: async function (ctx) {
            var file = ctx.files[0];
            var doc = await loadPdf(file);

            function safe(fn) {
                try { var v = fn(); return v === undefined || v === null || v === '' ? '(not set)' : String(v); }
                catch (e) { return '(not set)'; }
            }

            var current = [
                { label: 'Title', value: safe(function () { return doc.getTitle(); }) },
                { label: 'Author', value: safe(function () { return doc.getAuthor(); }) },
                { label: 'Subject', value: safe(function () { return doc.getSubject(); }) },
                { label: 'Keywords', value: safe(function () { return doc.getKeywords(); }) },
                { label: 'Creator', value: safe(function () { return doc.getCreator(); }) },
                { label: 'Producer', value: safe(function () { return doc.getProducer(); }) },
                { label: 'Created', value: safe(function () { var d = doc.getCreationDate(); return d && d.toLocaleString(); }) },
                { label: 'Modified', value: safe(function () { var d = doc.getModificationDate(); return d && d.toLocaleString(); }) },
                { label: 'Pages', value: String(doc.getPageCount()) },
                { label: 'File size', value: ZT.formatBytes(file.size) }
            ];

            if (ctx.opt.action === 'view') {
                return ZT.dataResult(current, { title: 'Current metadata', columns: 2 });
            }

            if (ctx.opt.action === 'strip') {
                doc.setTitle(''); doc.setAuthor(''); doc.setSubject('');
                doc.setKeywords([]); doc.setCreator(''); doc.setProducer('');
            } else {
                if (ctx.opt.title) doc.setTitle(ctx.opt.title);
                if (ctx.opt.author) doc.setAuthor(ctx.opt.author);
                if (ctx.opt.subject) doc.setSubject(ctx.opt.subject);
                if (ctx.opt.keywords) doc.setKeywords(ctx.opt.keywords.split(',').map(function (k) { return k.trim(); }).filter(Boolean));
                if (ctx.opt.creator) doc.setCreator(ctx.opt.creator);
                doc.setModificationDate(new Date());
            }

            var bytes = await doc.save();
            return [
                ZT.dataResult(current, { title: 'Metadata before the change', columns: 2 }),
                ZT.fileResult(pdfBlob(bytes), ZT.outName(file.name, ctx.opt.action === 'strip' ? 'clean' : 'updated', 'pdf'), {
                    note: ctx.opt.action === 'strip' ? 'All metadata removed' : 'Metadata updated'
                })
            ];
        }
    });

    function actionIsEdit(o) { return o.action === 'edit'; }

    /* ============================================================
       Text / Markdown / HTML to PDF
       ============================================================ */
    define({
        id: 'text-to-pdf',
        name: 'Text & Markdown to PDF',
        category: 'pdf',
        icon: 'file-output',
        description: 'Turn plain text or Markdown into a properly typeset PDF.',
        tags: ['text to pdf', 'markdown to pdf', 'txt', 'convert', 'document'],
        input: 'text',
        placeholder: '# My document\n\nWrite Markdown or plain text here…',
        options: [
            {
                id: 'page-size', type: 'select', label: 'Page size', value: 'a4',
                options: [
                    { value: 'a4', label: 'A4' }, { value: 'letter', label: 'US Letter' },
                    { value: 'a3', label: 'A3' }, { value: 'a5', label: 'A5' }, { value: 'legal', label: 'US Legal' }
                ]
            },
            {
                id: 'orientation', type: 'radio', label: 'Orientation', value: 'portrait',
                options: [{ value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }]
            },
            { id: 'parse-markdown', type: 'checkbox', label: 'Interpret Markdown headings, lists and emphasis', value: true },
            { id: 'font-size', type: 'number', label: 'Body font size', suffix: 'pt', value: 11, min: 6, max: 36 },
            { id: 'line-height', type: 'range', label: 'Line spacing', value: 1.45, min: 1, max: 2.5, step: 0.05 },
            { id: 'margin', type: 'number', label: 'Page margin', suffix: 'pt', value: 56, min: 12, max: 200 },
            {
                id: 'font', type: 'select', label: 'Font', value: 'Helvetica',
                options: [
                    { value: 'Helvetica', label: 'Helvetica — sans-serif' },
                    { value: 'TimesRoman', label: 'Times Roman — serif' },
                    { value: 'Courier', label: 'Courier — monospace' }
                ]
            },
            { id: 'add-page-numbers', type: 'checkbox', label: 'Add page numbers', value: true },
            { id: 'file-name', type: 'text', label: 'Output file name', value: 'document.pdf' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var text = String(ctx.text || '').trim();
            if (!text) ZT.fail('Type or paste some text to convert.');

            var PDFLib = await ZT.libs.pdfLib();
            var doc = await PDFLib.PDFDocument.create();

            var BASE = { Helvetica: 'Helvetica', TimesRoman: 'TimesRoman', Courier: 'Courier' };
            var regular = await doc.embedFont(PDFLib.StandardFonts[BASE[o.font]]);
            var bold = await doc.embedFont(PDFLib.StandardFonts[BASE[o.font] + 'Bold']);
            var italic = await doc.embedFont(PDFLib.StandardFonts[
                o.font === 'TimesRoman' ? 'TimesRomanItalic' : BASE[o.font] + 'Oblique'
            ]);

            var dims = PAGE_SIZES[o.pageSize].slice();
            if (o.orientation === 'landscape') dims = [dims[1], dims[0]];

            var contentWidth = dims[0] - o.margin * 2;
            var page = doc.addPage(dims);
            var cursorY = dims[1] - o.margin;

            function newPage() {
                page = doc.addPage(dims);
                cursorY = dims[1] - o.margin;
            }

            /** Greedy word wrap against the embedded font's real metrics. */
            function wrap(content, font, size) {
                var out = [];
                content.split(/\s+/).forEach(function (word) {
                    if (!out.length) { out.push(word); return; }
                    var candidate = out[out.length - 1] + ' ' + word;
                    if (font.widthOfTextAtSize(candidate, size) <= contentWidth) out[out.length - 1] = candidate;
                    else out.push(word);
                });
                return out.length ? out : [''];
            }

            function writeLines(content, font, size, indent, spaceAfter) {
                var lineHeight = size * o.lineHeight;
                wrap(content, font, size).forEach(function (line) {
                    if (cursorY - lineHeight < o.margin) newPage();
                    cursorY -= lineHeight;
                    page.drawText(line, {
                        x: o.margin + (indent || 0),
                        y: cursorY,
                        size: size,
                        font: font,
                        color: PDFLib.rgb(0.1, 0.1, 0.12)
                    });
                });
                cursorY -= (spaceAfter || 0);
            }

            // pdf-lib's standard fonts are WinAnsi-only; swap what it cannot encode.
            function sanitise(s) {
                return String(s)
                    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
                    .replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...')
                    .replace(/\u00A0/g, ' ')
                    .replace(/[^\x00-\xFF]/g, '?');
            }

            text.split(/\r?\n/).forEach(function (rawLine) {
                var line = sanitise(rawLine);

                if (!line.trim()) { cursorY -= o.fontSize * 0.6; return; }

                if (o.parseMarkdown) {
                    var heading = line.match(/^(#{1,6})\s+(.*)$/);
                    if (heading) {
                        var level = heading[1].length;
                        var size = o.fontSize * (level === 1 ? 1.9 : level === 2 ? 1.55 : level === 3 ? 1.3 : 1.12);
                        cursorY -= size * 0.5;
                        writeLines(heading[2], bold, size, 0, size * 0.35);
                        return;
                    }
                    if (/^([-*_])\1{2,}$/.test(line.trim())) {
                        if (cursorY - 14 < o.margin) newPage();
                        cursorY -= 10;
                        page.drawLine({
                            start: { x: o.margin, y: cursorY },
                            end: { x: dims[0] - o.margin, y: cursorY },
                            thickness: 0.7,
                            color: PDFLib.rgb(0.75, 0.75, 0.78)
                        });
                        cursorY -= 8;
                        return;
                    }
                    var bullet = line.match(/^\s*[-*+]\s+(.*)$/);
                    if (bullet) {
                        writeLines('•  ' + stripInline(bullet[1]), regular, o.fontSize, 14, 2);
                        return;
                    }
                    var ordered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
                    if (ordered) {
                        writeLines(ordered[1] + '.  ' + stripInline(ordered[2]), regular, o.fontSize, 14, 2);
                        return;
                    }
                    var quote = line.match(/^>\s?(.*)$/);
                    if (quote) {
                        writeLines(stripInline(quote[1]), italic, o.fontSize, 18, 2);
                        return;
                    }
                    line = stripInline(line);
                }

                writeLines(line, regular, o.fontSize, 0, 3);
            });

            function stripInline(s) {
                return s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1')
                        .replace(/\*(.+?)\*/g, '$1').replace(/_(.+?)_/g, '$1')
                        .replace(/`(.+?)`/g, '$1')
                        .replace(/\[(.+?)\]\((.+?)\)/g, '$1 ($2)');
            }

            if (o.addPageNumbers) {
                var all = doc.getPages();
                all.forEach(function (p, i) {
                    var label = (i + 1) + ' / ' + all.length;
                    var width = regular.widthOfTextAtSize(label, 9);
                    p.drawText(label, {
                        x: dims[0] / 2 - width / 2, y: o.margin / 2.2,
                        size: 9, font: regular, color: PDFLib.rgb(0.45, 0.45, 0.48)
                    });
                });
            }

            doc.setProducer('ZyncTools');
            doc.setCreationDate(new Date());
            var bytes = await doc.save();

            return ZT.fileResult(pdfBlob(bytes), o.fileName.replace(/\.pdf$/i, '') + '.pdf', {
                note: doc.getPageCount() + ' pages · ' + ZT.formatBytes(bytes.length)
            });
        }
    });


    /* ============================================================
       Sign PDF
       ============================================================ */
    define({
        id: 'sign-pdf',
        name: 'Sign PDF',
        category: 'pdf',
        icon: 'pen-tool',
        description: 'Draw or type a signature and place it on any page of a PDF.',
        tags: ['sign', 'signature', 'esign', 'e-signature', 'initial', 'contract'],
        input: 'file',
        accept: PDF_ACCEPT,
        popular: true,
        options: [
            {
                id: 'source', type: 'radio', label: 'Signature', value: 'draw',
                options: [
                    { value: 'draw', label: 'Draw it' },
                    { value: 'type', label: 'Type it' },
                    { value: 'image', label: 'Upload an image' }
                ]
            },
            { id: 'signature', type: 'signature', label: 'Draw your signature', when: function (o) { return o.source === 'draw'; } },
            { id: 'text', type: 'text', label: 'Your name', value: '', when: function (o) { return o.source === 'type'; } },
            {
                id: 'font', type: 'select', label: 'Style', value: 'cursive',
                options: [
                    { value: 'cursive', label: 'Handwriting' },
                    { value: 'serif', label: 'Serif' },
                    { value: 'sans-serif', label: 'Sans-serif' }
                ],
                when: function (o) { return o.source === 'type'; }
            },
            { id: 'image', type: 'file', label: 'Signature image', accept: 'image/*', when: function (o) { return o.source === 'image'; }, help: 'A PNG with a transparent background works best.' },
            { id: 'page', type: 'text', label: 'Place on page', value: 'last', help: 'A page number, "first", "last", or "all".' },
            {
                id: 'position', type: 'select', label: 'Position', value: 'bottom-right',
                options: [
                    { value: 'bottom-right', label: 'Bottom right' }, { value: 'bottom-left', label: 'Bottom left' },
                    { value: 'bottom-center', label: 'Bottom centre' }, { value: 'top-right', label: 'Top right' },
                    { value: 'top-left', label: 'Top left' }, { value: 'custom', label: 'Exact position…' }
                ]
            },
            { id: 'x', type: 'number', label: 'X from left', suffix: 'pt', value: 400, min: 0, when: function (o) { return o.position === 'custom'; } },
            { id: 'y', type: 'number', label: 'Y from bottom', suffix: 'pt', value: 100, min: 0, when: function (o) { return o.position === 'custom'; } },
            { id: 'width', type: 'range', label: 'Signature width', value: 180, min: 40, max: 420, step: 10, suffix: 'pt' },
            { id: 'margin', type: 'number', label: 'Margin from the edge', suffix: 'pt', value: 48, min: 0, max: 200, when: function (o) { return o.position !== 'custom'; } },
            { id: 'add-date', type: 'checkbox', label: 'Add the date under the signature', value: false },
            { id: 'note', type: 'note', text: 'This places a visible signature image on the page. It is not a cryptographic digital signature, so it does not prove who signed — the same as signing a printed page with a pen.' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var PDFLib = await ZT.libs.pdfLib();
            var file = ctx.files[0];
            var doc = await loadPdf(file);
            var pages = doc.getPages();

            // Build the signature as a transparent PNG, whatever its source.
            var signatureCanvas;

            if (o.source === 'draw') {
                if (!o.signature) ZT.fail('Draw your signature in the box above first.');
                signatureCanvas = await ZT.loadImage(o.signature).then(function (bmp) {
                    return ZT.drawToCanvas(bmp);
                });
            } else if (o.source === 'type') {
                if (!String(o.text).trim()) ZT.fail('Type the name you want to sign with.');
                signatureCanvas = renderTypedSignature(o.text, o.font);
            } else {
                if (!o.image) ZT.fail('Choose a signature image.');
                var bmp = await ZT.loadImage(o.image);
                signatureCanvas = ZT.drawToCanvas(bmp);
            }

            var pngBlob = await ZT.encodeCanvas(signatureCanvas, 'png');
            var embedded = await doc.embedPng(await pngBlob.arrayBuffer());

            var targets = resolveSignaturePages(o.page, pages.length);
            var drawWidth = o.width;
            var drawHeight = drawWidth * (signatureCanvas.height / signatureCanvas.width);

            var font = o.addDate ? await doc.embedFont(PDFLib.StandardFonts.Helvetica) : null;
            var today = new Date().toLocaleDateString();

            targets.forEach(function (index) {
                var page = pages[index];
                var size = page.getSize();

                var x, y;
                if (o.position === 'custom') {
                    x = o.x; y = o.y;
                } else {
                    var parts = o.position.split('-');
                    x = parts[1] === 'left' ? o.margin
                        : parts[1] === 'right' ? size.width - o.margin - drawWidth
                        : (size.width - drawWidth) / 2;
                    y = parts[0] === 'top' ? size.height - o.margin - drawHeight : o.margin;
                }

                page.drawImage(embedded, { x: x, y: y, width: drawWidth, height: drawHeight });

                if (o.addDate && font) {
                    page.drawText(today, {
                        x: x, y: y - 14,
                        size: 9, font: font,
                        color: PDFLib.rgb(0.35, 0.35, 0.38)
                    });
                }
            });

            doc.setProducer('ZyncTools');
            var bytes = await doc.save();

            return ZT.fileResult(pdfBlob(bytes), ZT.outName(file.name, 'signed', 'pdf'), {
                note: 'Signed on ' + targets.length + ' page' + (targets.length === 1 ? '' : 's') + '  ·  ' + ZT.formatBytes(bytes.length)
            });
        }
    });

    function resolveSignaturePages(spec, count) {
        var value = String(spec || 'last').trim().toLowerCase();
        if (value === 'last') return [count - 1];
        if (value === 'first') return [0];
        if (value === 'all') return Array.from({ length: count }, function (_, i) { return i; });
        return parsePageRange(value, count);
    }

    /** Draw typed text onto a transparent canvas so it can be embedded. */
    function renderTypedSignature(text, fontFamily) {
        var FONTS = {
            cursive: '"Segoe Script", "Brush Script MT", "Snell Roundhand", cursive',
            serif: 'Georgia, "Times New Roman", serif',
            'sans-serif': '"Segoe UI", Helvetica, Arial, sans-serif'
        };

        var fontSize = 96;
        var font = (fontFamily === 'cursive' ? 'italic ' : '') + fontSize + 'px ' + (FONTS[fontFamily] || FONTS.cursive);

        // Measure first so the canvas fits the text exactly.
        var measure = ZT.makeCanvas(10, 10).getContext('2d');
        measure.font = font;
        var width = Math.ceil(measure.measureText(text).width) + 40;

        var canvas = ZT.makeCanvas(width, Math.round(fontSize * 1.6));
        var c2d = canvas.getContext('2d');
        c2d.font = font;
        c2d.fillStyle = '#111827';
        c2d.textBaseline = 'middle';
        c2d.fillText(text, 20, canvas.height / 2);
        return canvas;
    }

    /* ============================================================
       Redact PDF
       ============================================================ */
    define({
        id: 'pdf-redact',
        name: 'Redact PDF',
        category: 'pdf',
        icon: 'square',
        description: 'Black out regions of a PDF so the text underneath is genuinely gone.',
        tags: ['redact', 'black out', 'censor', 'hide', 'confidential', 'remove text'],
        input: 'file',
        accept: PDF_ACCEPT,
        heavy: true,
        options: [
            { id: 'regions', type: 'textarea', label: 'Regions to black out', value: '', rows: 5,
              placeholder: '1: 60, 600, 300, 30\n2: 100, 420, 250, 20',
              help: 'One per line as  page: x, y, width, height  in points from the bottom-left of the page. Use the "PDF to Images" tool to find coordinates.' },
            { id: 'whole-pages', type: 'text', label: 'Or black out entire pages', value: '', placeholder: 'e.g. 3, 5-7' },
            { id: 'color', type: 'color', label: 'Redaction colour', value: '#000000' },
            { id: 'dpi', type: 'select', label: 'Output resolution', value: '150',
              options: [
                  { value: '120', label: '120 DPI — smaller file' },
                  { value: '150', label: '150 DPI — recommended' },
                  { value: '200', label: '200 DPI — sharper text' },
                  { value: '300', label: '300 DPI — print quality' }
              ] },
            { id: 'note', type: 'note', text: 'Redaction is only real if the text is removed, not merely covered. Drawing a black box over text leaves it fully selectable and copyable underneath — a mistake that has leaked real documents. This tool re-renders every page as an image after masking, so nothing remains beneath the boxes. The trade-off is that the output text is no longer selectable.' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var file = ctx.files[0];

            var regions = parseRedactionRegions(o.regions);
            var fullPages = o.wholePages.trim() ? o.wholePages : '';

            if (!regions.length && !fullPages) {
                ZT.fail('Add at least one region, or list whole pages to black out.');
            }

            var PDFLib = await ZT.libs.pdfLib();
            var pdf = await openWithPdfJs(file);
            var out = await PDFLib.PDFDocument.create();

            var pageNumbers = fullPages ? parsePageRange(fullPages, pdf.numPages) : [];
            var scale = parseInt(o.dpi, 10) / 72;
            var rgb = ZT.color.parse(o.color) || [0, 0, 0, 1];
            var fill = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';

            for (var p = 1; p <= pdf.numPages; p++) {
                ctx.progress((p - 1) / pdf.numPages, 'Redacting page ' + p + ' of ' + pdf.numPages);

                var page = await pdf.getPage(p);
                var viewport = page.getViewport({ scale: scale });
                var canvas = ZT.makeCanvas(viewport.width, viewport.height);
                var c2d = canvas.getContext('2d');
                c2d.fillStyle = '#ffffff';
                c2d.fillRect(0, 0, canvas.width, canvas.height);
                await page.render({ canvasContext: c2d, viewport: viewport }).promise;

                c2d.fillStyle = fill;

                if (pageNumbers.indexOf(p - 1) !== -1) {
                    c2d.fillRect(0, 0, canvas.width, canvas.height);
                } else {
                    regions.filter(function (r) { return r.page === p; }).forEach(function (r) {
                        // PDF coordinates start bottom-left; canvas starts top-left.
                        var unscaledHeight = viewport.height / scale;
                        c2d.fillRect(
                            r.x * scale,
                            (unscaledHeight - r.y - r.height) * scale,
                            r.width * scale,
                            r.height * scale
                        );
                    });
                }

                var jpeg = await ZT.encodeCanvas(canvas, 'jpeg', 0.85);
                var embedded = await out.embedJpg(await jpeg.arrayBuffer());
                var original = page.getViewport({ scale: 1 });
                var newPage = out.addPage([original.width, original.height]);
                newPage.drawImage(embedded, { x: 0, y: 0, width: original.width, height: original.height });
            }

            out.setProducer('ZyncTools');
            var bytes = await out.save();
            ctx.progress(1);

            return [
                ZT.dataResult([
                    { label: 'Regions blacked out', value: String(regions.length) },
                    { label: 'Whole pages blacked out', value: String(pageNumbers.length) },
                    { label: 'Text underneath', value: 'Removed — pages were re-rendered as images' },
                    { label: 'Selectable text in output', value: 'No' }
                ], { title: 'Redaction summary', columns: 2 }),
                ZT.fileResult(pdfBlob(bytes), ZT.outName(file.name, 'redacted', 'pdf'), {
                    note: pdf.numPages + ' pages · ' + ZT.formatBytes(bytes.length)
                })
            ];
        }
    });

    function parseRedactionRegions(text) {
        var regions = [];
        String(text || '').split(/\r?\n/).forEach(function (line) {
            if (!line.trim()) return;
            var match = line.match(/^\s*(\d+)\s*:\s*(.+)$/);
            if (!match) ZT.fail('"' + line.trim() + '" is not a valid region. Use  page: x, y, width, height');

            var numbers = match[2].split(/[,\s]+/).filter(Boolean).map(Number);
            if (numbers.length !== 4 || numbers.some(isNaN)) {
                ZT.fail('"' + line.trim() + '" needs exactly four numbers: x, y, width, height.');
            }
            regions.push({
                page: parseInt(match[1], 10),
                x: numbers[0], y: numbers[1], width: numbers[2], height: numbers[3]
            });
        });
        return regions;
    }

    /* ============================================================
       Word to PDF
       ============================================================ */
    define({
        id: 'word-to-pdf',
        name: 'Word to PDF',
        category: 'pdf',
        icon: 'file-output',
        description: 'Convert a Word .docx document into a PDF.',
        tags: ['word to pdf', 'docx', 'doc', 'convert', 'document'],
        input: 'file',
        accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        popular: true,
        options: [
            {
                id: 'page-size', type: 'select', label: 'Page size', value: 'a4',
                options: [
                    { value: 'a4', label: 'A4' }, { value: 'letter', label: 'US Letter' },
                    { value: 'a5', label: 'A5' }, { value: 'legal', label: 'US Legal' }
                ]
            },
            { id: 'font-size', type: 'number', label: 'Body font size', suffix: 'pt', value: 11, min: 6, max: 24 },
            { id: 'margin', type: 'number', label: 'Page margin', suffix: 'pt', value: 56, min: 18, max: 150 },
            { id: 'line-height', type: 'range', label: 'Line spacing', value: 1.45, min: 1, max: 2.5, step: 0.05 },
            { id: 'add-page-numbers', type: 'checkbox', label: 'Add page numbers', value: true },
            { id: 'note', type: 'note', text: 'Headings, bold, italic, lists and paragraph structure carry over. Exact page layout, embedded images, tables and fancy styling do not — this rebuilds the document rather than rendering Word itself.' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var file = ctx.files[0];

            if (/\.doc$/i.test(file.name)) {
                ZT.fail('Old .doc files are not supported — only .docx. Open it in Word or Google Docs and save as .docx first.');
            }

            ctx.progress(0.2, 'Reading the document');
            var mammoth = await ZT.libs.mammoth();
            var buffer = await ZT.readAsArrayBuffer(file);

            var result;
            try {
                result = await mammoth.convertToHtml({ arrayBuffer: buffer });
            } catch (err) {
                ZT.fail('That file could not be read as a .docx document.');
            }

            ctx.progress(0.5, 'Laying out the PDF');
            var blocks = htmlToBlocks(result.value);
            if (!blocks.length) ZT.fail('That document appears to be empty.');

            var bytes = await renderBlocksToPdf(blocks, o);
            ctx.progress(1);

            var warnings = (result.messages || []).filter(function (m) { return m.type === 'warning'; });
            var results = [];

            if (warnings.length) {
                results.push(ZT.dataResult([{
                    label: 'Note',
                    value: warnings.length + ' element' + (warnings.length === 1 ? '' : 's') +
                        ' could not be converted exactly — usually images, tables or unusual styling.'
                }], { title: 'Conversion notes' }));
            }

            results.push(ZT.fileResult(pdfBlob(bytes), ZT.outName(file.name, '', 'pdf'), {
                note: blocks.length + ' blocks · ' + ZT.formatBytes(bytes.length)
            }));
            return results;
        }
    });

    /** Flatten converted HTML into a simple ordered list of typed blocks. */
    function htmlToBlocks(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var blocks = [];

        Array.prototype.forEach.call(doc.body.children, function (node) {
            var tag = node.tagName.toLowerCase();
            var text = node.textContent.replace(/\s+/g, ' ').trim();

            if (/^h[1-6]$/.test(tag)) {
                if (text) blocks.push({ type: 'heading', level: parseInt(tag[1], 10), text: text });
            } else if (tag === 'ul' || tag === 'ol') {
                Array.prototype.forEach.call(node.querySelectorAll('li'), function (li, i) {
                    var item = li.textContent.replace(/\s+/g, ' ').trim();
                    if (item) blocks.push({ type: 'list', text: (tag === 'ol' ? (i + 1) + '. ' : '•  ') + item });
                });
            } else if (tag === 'table') {
                Array.prototype.forEach.call(node.querySelectorAll('tr'), function (tr) {
                    var cells = Array.prototype.map.call(tr.children, function (td) {
                        return td.textContent.replace(/\s+/g, ' ').trim();
                    }).filter(Boolean);
                    if (cells.length) blocks.push({ type: 'paragraph', text: cells.join('   |   ') });
                });
            } else if (text) {
                blocks.push({ type: 'paragraph', text: text });
            }
        });

        return blocks;
    }

    /** Shared layout engine for Word-to-PDF and anything else block-shaped. */
    async function renderBlocksToPdf(blocks, o) {
        var PDFLib = await ZT.libs.pdfLib();
        var doc = await PDFLib.PDFDocument.create();

        var regular = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
        var bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);

        var dims = PAGE_SIZES[o.pageSize] || PAGE_SIZES.a4;
        var contentWidth = dims[0] - o.margin * 2;
        var page = doc.addPage(dims.slice());
        var cursorY = dims[1] - o.margin;

        function sanitise(s) {
            return String(s)
                .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
                .replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...')
                .replace(/\u00A0/g, ' ')
                .replace(/[^\x00-\xFF]/g, '?');
        }

        function write(text, font, size, indent, spaceAfter) {
            var lineHeight = size * o.lineHeight;
            var words = sanitise(text).split(/\s+/);
            var lines = [];
            var current = '';

            words.forEach(function (word) {
                var candidate = current ? current + ' ' + word : word;
                if (font.widthOfTextAtSize(candidate, size) <= contentWidth - (indent || 0) && current) {
                    current = candidate;
                } else if (!current) {
                    current = word;
                } else {
                    lines.push(current);
                    current = word;
                }
            });
            if (current) lines.push(current);

            lines.forEach(function (line) {
                if (cursorY - lineHeight < o.margin) {
                    page = doc.addPage(dims.slice());
                    cursorY = dims[1] - o.margin;
                }
                cursorY -= lineHeight;
                page.drawText(line, {
                    x: o.margin + (indent || 0),
                    y: cursorY,
                    size: size,
                    font: font,
                    color: PDFLib.rgb(0.1, 0.1, 0.12)
                });
            });
            cursorY -= (spaceAfter || 0);
        }

        blocks.forEach(function (block) {
            if (block.type === 'heading') {
                var size = o.fontSize * (block.level === 1 ? 1.85 : block.level === 2 ? 1.5 : block.level === 3 ? 1.28 : 1.12);
                cursorY -= size * 0.5;
                write(block.text, bold, size, 0, size * 0.3);
            } else if (block.type === 'list') {
                write(block.text, regular, o.fontSize, 16, 3);
            } else {
                write(block.text, regular, o.fontSize, 0, o.fontSize * 0.55);
            }
        });

        if (o.addPageNumbers) {
            var all = doc.getPages();
            all.forEach(function (p, i) {
                var label = (i + 1) + ' / ' + all.length;
                var width = regular.widthOfTextAtSize(label, 9);
                p.drawText(label, {
                    x: dims[0] / 2 - width / 2, y: o.margin / 2.2,
                    size: 9, font: regular, color: PDFLib.rgb(0.45, 0.45, 0.48)
                });
            });
        }

        doc.setProducer('ZyncTools');
        doc.setCreationDate(new Date());
        return doc.save();
    }

    /* ============================================================
       PDF to Word
       ============================================================ */
    define({
        id: 'pdf-to-word',
        name: 'PDF to Word',
        category: 'pdf',
        icon: 'file-down',
        description: 'Turn a PDF into an editable Word .docx document.',
        tags: ['pdf to word', 'docx', 'convert', 'editable', 'doc'],
        input: 'file',
        accept: PDF_ACCEPT,
        popular: true,
        options: [
            Object.assign({}, PAGE_RANGE_OPTION),
            {
                id: 'layout', type: 'select', label: 'Structure', value: 'paragraphs',
                options: [
                    { value: 'paragraphs', label: 'Join lines into paragraphs' },
                    { value: 'lines', label: 'Keep every line separate' }
                ]
            },
            { id: 'detect-headings', type: 'checkbox', label: 'Detect headings from font size', value: true },
            { id: 'page-breaks', type: 'checkbox', label: 'Start a new page for each PDF page', value: false },
            { id: 'note', type: 'note', text: 'This extracts the text and rebuilds it as an editable document. Columns, images, tables and exact positioning are not reproduced. A scanned PDF has no text to extract — run it through the OCR tool first.' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var file = ctx.files[0];

            ctx.progress(0.1, 'Reading the PDF');
            var pdf = await openWithPdfJs(file);
            var targets = parsePageRange(o.pages, pdf.numPages);

            var pageBlocks = [];
            var sizes = [];

            for (var i = 0; i < targets.length; i++) {
                ctx.progress(0.1 + (i / targets.length) * 0.6, 'Reading page ' + (targets[i] + 1));
                var page = await pdf.getPage(targets[i] + 1);
                var content = await page.getTextContent();

                // Group items into visual lines, keeping the largest glyph
                // height per line so headings can be told from body text.
                var rows = {};
                content.items.forEach(function (item) {
                    var y = Math.round(item.transform[5]);
                    (rows[y] = rows[y] || []).push(item);
                });

                var lines = Object.keys(rows)
                    .sort(function (a, b) { return b - a; })
                    .map(function (y) {
                        var items = rows[y].sort(function (a, b) { return a.transform[4] - b.transform[4]; });
                        var height = Math.max.apply(null, items.map(function (it) { return Math.abs(it.transform[3]) || 0; }));
                        var text = items.map(function (it) { return it.str; }).join('').replace(/\s+/g, ' ').trim();
                        if (text) sizes.push(height);
                        return { text: text, size: height };
                    })
                    .filter(function (l) { return l.text; });

                pageBlocks.push(lines);
            }

            if (!sizes.length) {
                ZT.fail('No text could be extracted. This PDF is most likely a scan — run it through the OCR tool first.');
            }

            // The most common glyph height is the body text; anything clearly
            // larger is a heading.
            var median = sizes.slice().sort(function (a, b) { return a - b; })[Math.floor(sizes.length / 2)];

            ctx.progress(0.75, 'Building the document');
            var docx = await ZT.libs.docx();

            var children = [];
            pageBlocks.forEach(function (lines, pageIndex) {
                if (o.pageBreaks && pageIndex > 0 && children.length) {
                    children[children.length - 1] = new docx.Paragraph({
                        children: children[children.length - 1].options
                            ? children[children.length - 1].options.children
                            : [],
                        pageBreakBefore: false
                    });
                }

                if (o.layout === 'lines') {
                    lines.forEach(function (line) {
                        children.push(makeParagraph(docx, line, median, o.detectHeadings));
                    });
                } else {
                    // Merge consecutive body lines into paragraphs; a heading
                    // or a blank gap ends the current one.
                    var buffer = [];
                    lines.forEach(function (line) {
                        var isHeading = o.detectHeadings && line.size > median * 1.25;
                        var endsSentence = /[.!?:;]$/.test(line.text);

                        if (isHeading) {
                            if (buffer.length) {
                                children.push(makeParagraph(docx, { text: buffer.join(' '), size: median }, median, false));
                                buffer = [];
                            }
                            children.push(makeParagraph(docx, line, median, true));
                        } else {
                            buffer.push(line.text);
                            if (endsSentence && buffer.join(' ').length > 180) {
                                children.push(makeParagraph(docx, { text: buffer.join(' '), size: median }, median, false));
                                buffer = [];
                            }
                        }
                    });
                    if (buffer.length) {
                        children.push(makeParagraph(docx, { text: buffer.join(' '), size: median }, median, false));
                    }
                }

                if (o.pageBreaks && pageIndex < pageBlocks.length - 1) {
                    children.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
                }
            });

            var document = new docx.Document({
                creator: 'ZyncTools',
                title: ZT.stem(file.name),
                sections: [{ properties: {}, children: children }]
            });

            var blob = await docx.Packer.toBlob(document);
            ctx.progress(1);

            return [
                ZT.dataResult([
                    { label: 'Pages read', value: String(targets.length) },
                    { label: 'Paragraphs written', value: String(children.length) },
                    { label: 'Reproduced', value: 'Text, paragraph structure and headings' },
                    { label: 'Not reproduced', value: 'Images, tables, columns and exact layout' }
                ], { title: 'Conversion summary', columns: 2 }),
                ZT.fileResult(blob, ZT.outName(file.name, '', 'docx'), {
                    note: ZT.formatBytes(blob.size) + ' · opens in Word, Google Docs and LibreOffice'
                })
            ];
        }
    });

    function makeParagraph(docx, line, median, detectHeadings) {
        var isHeading = detectHeadings && line.size > median * 1.25;
        var level = line.size > median * 1.8 ? docx.HeadingLevel.HEADING_1
            : line.size > median * 1.45 ? docx.HeadingLevel.HEADING_2
            : docx.HeadingLevel.HEADING_3;

        return new docx.Paragraph({
            heading: isHeading ? level : undefined,
            spacing: { after: isHeading ? 160 : 120 },
            children: [new docx.TextRun({ text: line.text })]
        });
    }

    /* ============================================================
       QPDF (WASM) — encryption support
       ============================================================ */
    var qpdfPromise = null;

    /**
     * pdf-lib cannot read or write encrypted PDFs, so password tools run on a
     * small WASM build of QPDF. Loaded lazily since most tools never need it.
     */
    function loadQpdf() {
        if (qpdfPromise) return qpdfPromise;
        qpdfPromise = (async function () {
            await ZT.loadScript('https://cdn.jsdelivr.net/npm/@jspawn/qpdf-wasm@0.0.2/qpdf.js');
            var factory = window.createQpdfModule || window.QpdfModule || window.Module;
            if (typeof factory !== 'function') {
                ZT.fail('The PDF encryption engine could not be loaded. Check your connection and try again.');
            }
            var mod = await factory({
                locateFile: function (path) {
                    return 'https://cdn.jsdelivr.net/npm/@jspawn/qpdf-wasm@0.0.2/' + path;
                }
            });
            return makeQpdfApi(mod);
        })().catch(function (err) {
            qpdfPromise = null;
            throw err;
        });
        return qpdfPromise;
    }

    function makeQpdfApi(mod) {
        function run(args, inputBytes, inputName, outputName) {
            mod.FS.writeFile('/' + inputName, inputBytes);
            var exitCode = mod.callMain(args);
            if (exitCode !== 0 && exitCode !== 3) { // 3 == warnings only
                throw new Error('QPDF exited with code ' + exitCode);
            }
            var out = mod.FS.readFile('/' + outputName);
            try { mod.FS.unlink('/' + inputName); mod.FS.unlink('/' + outputName); } catch (e) { /* ignore */ }
            return out;
        }

        return {
            encrypt: function (bytes, options) {
                var perms = options.permissions || {};
                var args = [
                    '--encrypt', options.userPassword, options.ownerPassword, '256',
                    '--print=' + (perms.print ? 'full' : 'none'),
                    '--modify=' + (perms.modify ? 'all' : perms.annotate ? 'annotate' : 'none'),
                    '--extract=' + (perms.extract ? 'y' : 'n'),
                    '--', '/in.pdf', '/out.pdf'
                ];
                return run(args, bytes, 'in.pdf', 'out.pdf');
            },
            decrypt: function (bytes, password) {
                var args = ['--password=' + password, '--decrypt', '/in.pdf', '/out.pdf'];
                return run(args, bytes, 'in.pdf', 'out.pdf');
            }
        };
    }

})();
