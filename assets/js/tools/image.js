/**
 * ZyncTools — Image tools
 * Canvas-based processing: compression, conversion, geometry, filters and analysis.
 */
(function () {
    'use strict';

    var ZT = window.ZT;
    var define = ZT.registry.define;

    var IMAGE_ACCEPT = 'image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.svg';

    var FORMAT_OPTION = {
        id: 'format', type: 'select', label: 'Output format', value: 'png',
        options: [
            { value: 'png', label: 'PNG — lossless, keeps transparency' },
            { value: 'jpeg', label: 'JPEG — smallest for photos' },
            { value: 'webp', label: 'WebP — small and modern' },
            { value: 'avif', label: 'AVIF — smallest, newer browsers' }
        ]
    };

    var QUALITY_OPTION = {
        id: 'quality', type: 'range', label: 'Quality', value: 85, min: 10, max: 100, step: 1, suffix: '%',
        when: function (o) { return o.format !== 'png'; }
    };

    var BACKGROUND_OPTION = {
        id: 'background', type: 'color', label: 'Background for transparent areas', value: '#FFFFFF',
        when: function (o) { return o.format === 'jpeg'; },
        help: 'JPEG cannot store transparency, so transparent pixels are filled with this colour.'
    };

    /**
     * Run `fn(bitmap, file, index)` over every uploaded file, reporting
     * progress and packaging more than a handful of outputs as a ZIP.
     */
    async function processEach(ctx, fn, opts) {
        opts = opts || {};
        var files = ctx.files;
        var out = [];

        for (var i = 0; i < files.length; i++) {
            if (ctx.signal && ctx.signal.aborted) throw ZT.ToolError('Cancelled.');
            ctx.progress(i / files.length, 'Processing ' + files[i].name);

            var bitmap;
            try {
                bitmap = await decodeAny(files[i]);
            } catch (err) {
                if (files.length === 1) throw err;
                ZT.toast('Skipped "' + files[i].name + '" — ' + err.message, 'error');
                continue;
            }

            var produced = await fn(bitmap, files[i], i);
            if (bitmap.close) bitmap.close();
            (Array.isArray(produced) ? produced : [produced]).forEach(function (p) { if (p) out.push(p); });
        }

        ctx.progress(1);
        if (!out.length) ZT.fail('None of those files could be processed.');

        // Beyond a few files a ZIP is far friendlier than a wall of downloads.
        if (out.length > (opts.zipAfter || 4)) {
            var zip = await ZT.zipFiles(out.map(function (r) { return { name: r.name, blob: r.blob }; }),
                (opts.zipName || 'zynctools-images') + '.zip');
            return [ZT.fileResult(zip.blob, zip.name, { note: out.length + ' images' })].concat(out);
        }
        return out;
    }

    /** Decode an image, transparently handling HEIC and SVG. */
    async function decodeAny(file) {
        var ext = ZT.extOf(file.name);
        if (ext === 'heic' || ext === 'heif' || /heic|heif/.test(file.type)) {
            var heic2any = await ZT.libs.heic2any();
            var converted = await heic2any({ blob: file, toType: 'image/png' });
            return ZT.loadImage(Array.isArray(converted) ? converted[0] : converted);
        }
        if (ext === 'svg' || file.type === 'image/svg+xml') {
            return decodeSvg(file);
        }
        return ZT.loadImage(file);
    }

    /**
     * SVG has no intrinsic pixel size, so rasterise at a sensible default
     * when the markup lacks width/height.
     */
    async function decodeSvg(file, targetWidth) {
        var text = await ZT.readAsText(file);
        var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        var svg = doc.documentElement;
        if (!svg || svg.nodeName === 'parsererror') ZT.fail('That SVG file could not be parsed.');

        var width = parseFloat(svg.getAttribute('width')) || 0;
        var height = parseFloat(svg.getAttribute('height')) || 0;
        if (!width || !height) {
            var vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
            if (vb.length === 4 && vb[2] && vb[3]) { width = vb[2]; height = vb[3]; }
        }
        if (!width || !height) { width = 512; height = 512; }
        if (targetWidth) { height = height * (targetWidth / width); width = targetWidth; }

        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        var serialised = new XMLSerializer().serializeToString(svg);
        var blob = new Blob([serialised], { type: 'image/svg+xml;charset=utf-8' });
        return ZT.loadImage(blob);
    }

    /* ============================================================
       Compressor
       ============================================================ */
    define({
        id: 'image-compressor',
        name: 'Image Compressor',
        category: 'image',
        icon: 'minimize-2',
        description: 'Shrink image file size with a quality slider or a target file size.',
        tags: ['compress', 'optimise', 'shrink', 'reduce', 'file size'],
        input: 'files',
        accept: IMAGE_ACCEPT,
        popular: true,
        options: [
            {
                id: 'strategy', type: 'radio', label: 'Compress by', value: 'quality',
                options: [
                    { value: 'quality', label: 'Quality setting' },
                    { value: 'target-size', label: 'Target file size' }
                ]
            },
            Object.assign({}, QUALITY_OPTION, { value: 75, when: function (o) { return o.strategy === 'quality'; } }),
            { id: 'target-kb', type: 'number', label: 'Target size', suffix: 'KB', value: 200, min: 5, max: 20000, when: function (o) { return o.strategy === 'target-size'; }, help: 'Quality is searched automatically to land just under this size.' },
            {
                id: 'format', type: 'select', label: 'Output format', value: 'jpeg',
                options: [
                    { value: 'jpeg', label: 'JPEG — best for photos' },
                    { value: 'webp', label: 'WebP — smaller than JPEG' },
                    { value: 'avif', label: 'AVIF — smallest' },
                    { value: 'png', label: 'PNG — lossless' },
                    { value: 'keep', label: 'Keep original format' }
                ]
            },
            { id: 'max-width', type: 'number', label: 'Also limit width to', suffix: 'px', value: 0, min: 0, max: 12000, help: '0 keeps the original width. Resizing usually saves far more than quality alone.' },
            BACKGROUND_OPTION
        ],
        run: function (ctx) {
            return processEach(ctx, async function (bitmap, file) {
                var format = ctx.opt.format === 'keep'
                    ? (ZT.extOf(file.name) === 'png' ? 'png' : 'jpeg')
                    : ctx.opt.format;

                var size = ZT.imageSize(bitmap);
                var canvas = ctx.opt.maxWidth > 0 && size.width > ctx.opt.maxWidth
                    ? ZT.smoothResize(bitmap, ctx.opt.maxWidth, Math.round(size.height * ctx.opt.maxWidth / size.width))
                    : ZT.drawToCanvas(bitmap);

                if (format === 'jpeg') canvas = ZT.flattenAlpha(canvas, ctx.opt.background);

                var blob;
                if (ctx.opt.strategy === 'target-size' && format !== 'png') {
                    blob = await encodeToTargetSize(canvas, format, ctx.opt.targetKb * 1024);
                } else {
                    blob = await ZT.encodeCanvas(canvas, format, format === 'png' ? undefined : ctx.opt.quality / 100);
                }

                var saved = file.size - blob.size;
                return ZT.fileResult(blob, ZT.outName(file.name, 'compressed', format === 'jpeg' ? 'jpg' : format), {
                    note: ZT.formatBytes(file.size) + ' → ' + ZT.formatBytes(blob.size) +
                        (saved > 0 ? '  (' + Math.round(saved / file.size * 100) + '% smaller)' : '  (no reduction — try a lower quality)'),
                    previewBlob: blob
                });
            }, { zipName: 'compressed-images' });
        }
    });

    /** Binary-search the quality setting that lands just under `targetBytes`. */
    async function encodeToTargetSize(canvas, format, targetBytes) {
        var low = 0.05, high = 0.98, best = null;
        for (var i = 0; i < 8; i++) {
            var mid = (low + high) / 2;
            var blob = await ZT.encodeCanvas(canvas, format, mid);
            if (blob.size <= targetBytes) { best = blob; low = mid; }
            else high = mid;
        }
        // Even the lowest quality may overshoot; return the smallest we found.
        return best || ZT.encodeCanvas(canvas, format, 0.05);
    }

    /* ============================================================
       Resizer
       ============================================================ */
    define({
        id: 'image-resizer',
        name: 'Image Resizer',
        category: 'image',
        icon: 'maximize-2',
        description: 'Resize images by pixels, percentage or to fit inside a box.',
        tags: ['resize', 'scale', 'dimensions', 'width', 'height'],
        input: 'files',
        accept: IMAGE_ACCEPT,
        popular: true,
        options: [
            {
                id: 'mode', type: 'select', label: 'Resize mode', value: 'fit',
                options: [
                    { value: 'fit', label: 'Fit inside a box (keeps aspect ratio)' },
                    { value: 'exact', label: 'Exact dimensions (may distort)' },
                    { value: 'cover', label: 'Fill a box and crop the overflow' },
                    { value: 'percent', label: 'Percentage of the original' },
                    { value: 'width', label: 'Set width, height follows' },
                    { value: 'height', label: 'Set height, width follows' }
                ]
            },
            { id: 'width', type: 'number', label: 'Width', suffix: 'px', value: 1280, min: 1, max: 20000, when: function (o) { return ['fit', 'exact', 'cover', 'width'].indexOf(o.mode) !== -1; } },
            { id: 'height', type: 'number', label: 'Height', suffix: 'px', value: 720, min: 1, max: 20000, when: function (o) { return ['fit', 'exact', 'cover', 'height'].indexOf(o.mode) !== -1; } },
            { id: 'percent', type: 'range', label: 'Scale', value: 50, min: 1, max: 400, step: 1, suffix: '%', when: function (o) { return o.mode === 'percent'; } },
            { id: 'no-upscale', type: 'checkbox', label: 'Never enlarge images beyond their original size', value: true },
            FORMAT_OPTION, QUALITY_OPTION, BACKGROUND_OPTION
        ],
        run: function (ctx) {
            var o = ctx.opt;
            return processEach(ctx, async function (bitmap, file) {
                var size = ZT.imageSize(bitmap);
                var targetW, targetH, cropCanvas = null;

                switch (o.mode) {
                    case 'percent':
                        targetW = Math.max(1, Math.round(size.width * o.percent / 100));
                        targetH = Math.max(1, Math.round(size.height * o.percent / 100));
                        break;
                    case 'width':
                        targetW = o.width;
                        targetH = Math.max(1, Math.round(size.height * o.width / size.width));
                        break;
                    case 'height':
                        targetH = o.height;
                        targetW = Math.max(1, Math.round(size.width * o.height / size.height));
                        break;
                    case 'exact':
                        targetW = o.width; targetH = o.height;
                        break;
                    case 'cover': {
                        // Scale so the image covers the box, then centre-crop.
                        var scale = Math.max(o.width / size.width, o.height / size.height);
                        var scaledW = Math.round(size.width * scale);
                        var scaledH = Math.round(size.height * scale);
                        var scaled = ZT.smoothResize(bitmap, scaledW, scaledH);
                        cropCanvas = ZT.makeCanvas(o.width, o.height);
                        cropCanvas.getContext('2d').drawImage(
                            scaled,
                            Math.round((scaledW - o.width) / 2), Math.round((scaledH - o.height) / 2),
                            o.width, o.height, 0, 0, o.width, o.height
                        );
                        targetW = o.width; targetH = o.height;
                        break;
                    }
                    default: {
                        var fit = ZT.fitInside(size.width, size.height, o.width, o.height);
                        targetW = fit.width; targetH = fit.height;
                    }
                }

                if (o.noUpscale && !cropCanvas && (targetW > size.width || targetH > size.height)) {
                    var limited = ZT.fitInside(targetW, targetH, size.width, size.height);
                    targetW = limited.width; targetH = limited.height;
                }

                var canvas = cropCanvas || ZT.smoothResize(bitmap, targetW, targetH);
                if (o.format === 'jpeg') canvas = ZT.flattenAlpha(canvas, o.background);

                var blob = await ZT.encodeCanvas(canvas, o.format, o.format === 'png' ? undefined : o.quality / 100);
                return ZT.fileResult(blob, ZT.outName(file.name, targetW + 'x' + targetH, o.format === 'jpeg' ? 'jpg' : o.format), {
                    note: size.width + '×' + size.height + ' → ' + targetW + '×' + targetH + '  ·  ' + ZT.formatBytes(blob.size),
                    previewBlob: blob
                });
            }, { zipName: 'resized-images' });
        }
    });

    /* ============================================================
       Converter
       ============================================================ */
    define({
        id: 'image-converter',
        name: 'Image Format Converter',
        category: 'image',
        icon: 'refresh-cw',
        description: 'Convert between PNG, JPEG, WebP, AVIF, BMP, HEIC and SVG raster output.',
        tags: ['convert', 'png', 'jpg', 'webp', 'avif', 'heic', 'format'],
        input: 'files',
        accept: IMAGE_ACCEPT + ',.heic,.heif',
        popular: true,
        options: [
            Object.assign({}, FORMAT_OPTION, {
                options: FORMAT_OPTION.options.concat([{ value: 'bmp', label: 'BMP — uncompressed' }])
            }),
            QUALITY_OPTION,
            BACKGROUND_OPTION,
            { id: 'svg-width', type: 'number', label: 'Rasterise SVG at width', suffix: 'px', value: 1024, min: 16, max: 8000, help: 'Only applies to SVG inputs, which have no fixed pixel size.' }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            if (!(await ZT.supportsFormat(o.format))) {
                ZT.fail('This browser cannot save ' + o.format.toUpperCase() + ' images. Try PNG, JPEG or WebP.');
            }

            var out = [];
            for (var i = 0; i < ctx.files.length; i++) {
                var file = ctx.files[i];
                ctx.progress(i / ctx.files.length, 'Converting ' + file.name);

                var bitmap = (ZT.extOf(file.name) === 'svg' || file.type === 'image/svg+xml')
                    ? await decodeSvg(file, o.svgWidth)
                    : await decodeAny(file);

                var canvas = ZT.drawToCanvas(bitmap);
                if (o.format === 'jpeg') canvas = ZT.flattenAlpha(canvas, o.background);

                var blob = await ZT.encodeCanvas(canvas, o.format, o.format === 'png' || o.format === 'bmp' ? undefined : o.quality / 100);
                out.push(ZT.fileResult(blob, ZT.outName(file.name, '', o.format === 'jpeg' ? 'jpg' : o.format), {
                    note: (ZT.extOf(file.name) || 'image').toUpperCase() + ' → ' + o.format.toUpperCase() +
                        '  ·  ' + ZT.formatBytes(file.size) + ' → ' + ZT.formatBytes(blob.size),
                    previewBlob: blob
                }));
                if (bitmap.close) bitmap.close();
            }
            ctx.progress(1);

            if (out.length > 4) {
                var zip = await ZT.zipFiles(out.map(function (r) { return { name: r.name, blob: r.blob }; }), 'converted-images.zip');
                return [ZT.fileResult(zip.blob, zip.name, { note: out.length + ' images' })].concat(out);
            }
            return out;
        }
    });

    /* ============================================================
       Crop
       ============================================================ */
    define({
        id: 'image-cropper',
        name: 'Image Cropper',
        category: 'image',
        icon: 'crop',
        description: 'Crop to an aspect ratio, exact pixels, or a centred square.',
        tags: ['crop', 'trim', 'cut', 'aspect ratio', 'square'],
        input: 'files',
        accept: IMAGE_ACCEPT,
        options: [
            {
                id: 'mode', type: 'select', label: 'Crop mode', value: 'ratio',
                options: [
                    { value: 'ratio', label: 'To an aspect ratio' },
                    { value: 'pixels', label: 'Exact pixel region' },
                    { value: 'margins', label: 'Trim edges by amount' },
                    { value: 'circle', label: 'Circular crop (PNG)' }
                ]
            },
            {
                id: 'ratio', type: 'select', label: 'Aspect ratio', value: '1:1',
                options: [
                    { value: '1:1', label: '1:1 — Square' }, { value: '4:3', label: '4:3 — Classic' },
                    { value: '3:2', label: '3:2 — Photo' }, { value: '16:9', label: '16:9 — Widescreen' },
                    { value: '9:16', label: '9:16 — Story / Reel' }, { value: '3:4', label: '3:4 — Portrait' },
                    { value: '2:3', label: '2:3 — Portrait photo' }, { value: '21:9', label: '21:9 — Ultrawide' }
                ],
                when: function (o) { return o.mode === 'ratio'; }
            },
            {
                id: 'anchor', type: 'select', label: 'Keep which part', value: 'center',
                options: [
                    { value: 'center', label: 'Centre' }, { value: 'top', label: 'Top' }, { value: 'bottom', label: 'Bottom' },
                    { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' },
                    { value: 'top-left', label: 'Top left' }, { value: 'top-right', label: 'Top right' },
                    { value: 'bottom-left', label: 'Bottom left' }, { value: 'bottom-right', label: 'Bottom right' }
                ],
                when: function (o) { return o.mode === 'ratio'; }
            },
            { id: 'x', type: 'number', label: 'X offset', suffix: 'px', value: 0, min: 0, when: function (o) { return o.mode === 'pixels'; } },
            { id: 'y', type: 'number', label: 'Y offset', suffix: 'px', value: 0, min: 0, when: function (o) { return o.mode === 'pixels'; } },
            { id: 'width', type: 'number', label: 'Width', suffix: 'px', value: 800, min: 1, when: function (o) { return o.mode === 'pixels'; } },
            { id: 'height', type: 'number', label: 'Height', suffix: 'px', value: 600, min: 1, when: function (o) { return o.mode === 'pixels'; } },
            { id: 'top', type: 'number', label: 'Trim from top', suffix: 'px', value: 0, min: 0, when: function (o) { return o.mode === 'margins'; } },
            { id: 'right', type: 'number', label: 'Trim from right', suffix: 'px', value: 0, min: 0, when: function (o) { return o.mode === 'margins'; } },
            { id: 'bottom', type: 'number', label: 'Trim from bottom', suffix: 'px', value: 0, min: 0, when: function (o) { return o.mode === 'margins'; } },
            { id: 'left', type: 'number', label: 'Trim from left', suffix: 'px', value: 0, min: 0, when: function (o) { return o.mode === 'margins'; } },
            Object.assign({}, FORMAT_OPTION, { when: function (o) { return o.mode !== 'circle'; } }),
            Object.assign({}, QUALITY_OPTION, { when: function (o) { return o.mode !== 'circle' && o.format !== 'png'; } })
        ],
        run: function (ctx) {
            var o = ctx.opt;
            return processEach(ctx, async function (bitmap, file) {
                var size = ZT.imageSize(bitmap);
                var sx = 0, sy = 0, sw = size.width, sh = size.height;

                if (o.mode === 'ratio' || o.mode === 'circle') {
                    var parts = o.mode === 'circle' ? [1, 1] : o.ratio.split(':').map(Number);
                    var wanted = parts[0] / parts[1];
                    var actual = size.width / size.height;
                    if (actual > wanted) { sw = Math.round(size.height * wanted); sh = size.height; }
                    else { sw = size.width; sh = Math.round(size.width / wanted); }

                    var anchor = o.mode === 'circle' ? 'center' : o.anchor;
                    sx = anchor.indexOf('left') !== -1 ? 0
                        : anchor.indexOf('right') !== -1 ? size.width - sw
                        : Math.round((size.width - sw) / 2);
                    sy = anchor.indexOf('top') !== -1 ? 0
                        : anchor.indexOf('bottom') !== -1 ? size.height - sh
                        : Math.round((size.height - sh) / 2);
                } else if (o.mode === 'pixels') {
                    sx = Math.min(o.x, size.width - 1);
                    sy = Math.min(o.y, size.height - 1);
                    sw = Math.min(o.width, size.width - sx);
                    sh = Math.min(o.height, size.height - sy);
                } else {
                    sx = o.left; sy = o.top;
                    sw = size.width - o.left - o.right;
                    sh = size.height - o.top - o.bottom;
                    if (sw <= 0 || sh <= 0) ZT.fail('Those trim amounts remove the whole image.');
                }

                var canvas = ZT.makeCanvas(sw, sh);
                var cctx = canvas.getContext('2d');

                if (o.mode === 'circle') {
                    cctx.save();
                    cctx.beginPath();
                    cctx.arc(sw / 2, sh / 2, Math.min(sw, sh) / 2, 0, Math.PI * 2);
                    cctx.closePath();
                    cctx.clip();
                }
                cctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
                if (o.mode === 'circle') cctx.restore();

                var format = o.mode === 'circle' ? 'png' : o.format;
                if (format === 'jpeg') canvas = ZT.flattenAlpha(canvas, '#ffffff');

                var blob = await ZT.encodeCanvas(canvas, format, format === 'png' ? undefined : o.quality / 100);
                return ZT.fileResult(blob, ZT.outName(file.name, 'cropped', format === 'jpeg' ? 'jpg' : format), {
                    note: size.width + '×' + size.height + ' → ' + sw + '×' + sh,
                    previewBlob: blob
                });
            }, { zipName: 'cropped-images' });
        }
    });

    /* ============================================================
       Rotate & flip
       ============================================================ */
    define({
        id: 'image-rotate-flip',
        name: 'Rotate & Flip Image',
        category: 'image',
        icon: 'rotate-cw',
        description: 'Rotate by any angle and mirror images horizontally or vertically.',
        tags: ['rotate', 'flip', 'mirror', 'turn', 'straighten'],
        input: 'files',
        accept: IMAGE_ACCEPT,
        options: [
            {
                id: 'angle', type: 'select', label: 'Rotation', value: '90',
                options: [
                    { value: '0', label: 'None' }, { value: '90', label: '90° clockwise' },
                    { value: '180', label: '180°' }, { value: '270', label: '90° anticlockwise' },
                    { value: 'custom', label: 'Custom angle…' }
                ]
            },
            { id: 'custom-angle', type: 'range', label: 'Angle', value: 15, min: -180, max: 180, step: 1, suffix: '°', when: function (o) { return o.angle === 'custom'; } },
            { id: 'flip-h', type: 'checkbox', label: 'Mirror horizontally', value: false },
            { id: 'flip-v', type: 'checkbox', label: 'Mirror vertically', value: false },
            { id: 'expand', type: 'checkbox', label: 'Grow the canvas so nothing is cut off', value: true, when: function (o) { return o.angle === 'custom'; } },
            { id: 'background', type: 'color', label: 'Fill colour for empty corners', value: '#FFFFFF', when: function (o) { return o.angle === 'custom'; } },
            { id: 'transparent-bg', type: 'checkbox', label: 'Use a transparent background instead', value: true, when: function (o) { return o.angle === 'custom'; } },
            FORMAT_OPTION, QUALITY_OPTION
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var degrees = o.angle === 'custom' ? o.customAngle : parseInt(o.angle, 10);

            return processEach(ctx, async function (bitmap, file) {
                var size = ZT.imageSize(bitmap);
                var rad = degrees * Math.PI / 180;
                var w = size.width, h = size.height;
                var outW = w, outH = h;

                if (degrees === 90 || degrees === 270) { outW = h; outH = w; }
                else if (o.angle === 'custom' && o.expand && degrees % 180 !== 0) {
                    var cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
                    outW = Math.round(w * cos + h * sin);
                    outH = Math.round(w * sin + h * cos);
                }

                var canvas = ZT.makeCanvas(outW, outH);
                var cctx = canvas.getContext('2d');

                if (o.angle === 'custom' && !o.transparentBg) {
                    cctx.fillStyle = o.background;
                    cctx.fillRect(0, 0, outW, outH);
                }

                cctx.translate(outW / 2, outH / 2);
                if (degrees) cctx.rotate(rad);
                cctx.scale(o.flipH ? -1 : 1, o.flipV ? -1 : 1);
                cctx.imageSmoothingQuality = 'high';
                cctx.drawImage(bitmap, -w / 2, -h / 2, w, h);

                var format = o.format;
                if (format === 'jpeg') canvas = ZT.flattenAlpha(canvas, o.background);

                var blob = await ZT.encodeCanvas(canvas, format, format === 'png' ? undefined : o.quality / 100);
                return ZT.fileResult(blob, ZT.outName(file.name, 'rotated', format === 'jpeg' ? 'jpg' : format), {
                    note: outW + '×' + outH + '  ·  ' + ZT.formatBytes(blob.size),
                    previewBlob: blob
                });
            }, { zipName: 'rotated-images' });
        }
    });

    /* ============================================================
       Filters
       ============================================================ */
    var FILTER_PRESETS = {
        none: {},
        grayscale: { grayscale: 100 },
        sepia: { sepia: 100 },
        invert: { invert: 100 },
        vintage: { sepia: 45, contrast: 110, saturate: 130, brightness: 105 },
        cool: { hueRotate: 190, saturate: 120, brightness: 103 },
        warm: { hueRotate: -18, saturate: 125, brightness: 105 },
        dramatic: { contrast: 155, saturate: 85, brightness: 92 },
        fade: { contrast: 82, saturate: 70, brightness: 112 },
        noir: { grayscale: 100, contrast: 145, brightness: 95 },
        vivid: { saturate: 165, contrast: 115 }
    };

    define({
        id: 'image-filters',
        name: 'Image Filters & Adjustments',
        category: 'image',
        icon: 'sliders-horizontal',
        description: 'Adjust brightness, contrast, saturation, blur and apply photo presets.',
        tags: ['filter', 'brightness', 'contrast', 'saturation', 'grayscale', 'sepia', 'blur', 'effects'],
        input: 'files',
        accept: IMAGE_ACCEPT,
        popular: true,
        options: [
            {
                id: 'preset', type: 'select', label: 'Preset', value: 'none',
                options: [
                    { value: 'none', label: 'None — use sliders below' },
                    { value: 'grayscale', label: 'Black & white' }, { value: 'sepia', label: 'Sepia' },
                    { value: 'invert', label: 'Invert' }, { value: 'vintage', label: 'Vintage' },
                    { value: 'cool', label: 'Cool tone' }, { value: 'warm', label: 'Warm tone' },
                    { value: 'dramatic', label: 'Dramatic' }, { value: 'fade', label: 'Faded' },
                    { value: 'noir', label: 'Noir' }, { value: 'vivid', label: 'Vivid' }
                ]
            },
            { id: 'brightness', type: 'range', label: 'Brightness', value: 100, min: 0, max: 200, step: 1, suffix: '%', when: presetIsNone },
            { id: 'contrast', type: 'range', label: 'Contrast', value: 100, min: 0, max: 200, step: 1, suffix: '%', when: presetIsNone },
            { id: 'saturate', type: 'range', label: 'Saturation', value: 100, min: 0, max: 300, step: 1, suffix: '%', when: presetIsNone },
            { id: 'grayscale', type: 'range', label: 'Black & white', value: 0, min: 0, max: 100, step: 1, suffix: '%', when: presetIsNone },
            { id: 'sepia', type: 'range', label: 'Sepia', value: 0, min: 0, max: 100, step: 1, suffix: '%', when: presetIsNone },
            { id: 'hue-rotate', type: 'range', label: 'Hue shift', value: 0, min: -180, max: 180, step: 1, suffix: '°', when: presetIsNone },
            { id: 'invert', type: 'range', label: 'Invert', value: 0, min: 0, max: 100, step: 1, suffix: '%', when: presetIsNone },
            { id: 'blur', type: 'range', label: 'Blur', value: 0, min: 0, max: 40, step: 0.5, suffix: 'px' },
            { id: 'opacity', type: 'range', label: 'Opacity', value: 100, min: 0, max: 100, step: 1, suffix: '%' },
            FORMAT_OPTION, QUALITY_OPTION, BACKGROUND_OPTION
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var preset = FILTER_PRESETS[o.preset] || {};
            var settings = o.preset === 'none' ? o : Object.assign({
                brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, hueRotate: 0, invert: 0
            }, preset);

            var filter = [
                'brightness(' + (settings.brightness || 100) + '%)',
                'contrast(' + (settings.contrast || 100) + '%)',
                'saturate(' + (settings.saturate || 100) + '%)',
                'grayscale(' + (settings.grayscale || 0) + '%)',
                'sepia(' + (settings.sepia || 0) + '%)',
                'hue-rotate(' + (settings.hueRotate || 0) + 'deg)',
                'invert(' + (settings.invert || 0) + '%)',
                'blur(' + (o.blur || 0) + 'px)',
                'opacity(' + (o.opacity === undefined ? 100 : o.opacity) + '%)'
            ].join(' ');

            return processEach(ctx, async function (bitmap, file) {
                var size = ZT.imageSize(bitmap);
                var canvas = ZT.makeCanvas(size.width, size.height);
                var cctx = canvas.getContext('2d');
                cctx.filter = filter;
                cctx.drawImage(bitmap, 0, 0);

                if (o.format === 'jpeg') canvas = ZT.flattenAlpha(canvas, o.background);
                var blob = await ZT.encodeCanvas(canvas, o.format, o.format === 'png' ? undefined : o.quality / 100);
                return ZT.fileResult(blob, ZT.outName(file.name, o.preset === 'none' ? 'filtered' : o.preset, o.format === 'jpeg' ? 'jpg' : o.format), {
                    note: ZT.formatBytes(blob.size),
                    previewBlob: blob
                });
            }, { zipName: 'filtered-images' });
        }
    });

    function presetIsNone(o) { return o.preset === 'none'; }

    /* ============================================================
       Watermark
       ============================================================ */
    define({
        id: 'image-watermark',
        name: 'Image Watermark',
        category: 'image',
        icon: 'stamp',
        description: 'Stamp text or a logo onto images, once or tiled across the frame.',
        tags: ['watermark', 'logo', 'copyright', 'branding', 'stamp'],
        input: 'files',
        accept: IMAGE_ACCEPT,
        options: [
            {
                id: 'type', type: 'radio', label: 'Watermark type', value: 'text',
                options: [{ value: 'text', label: 'Text' }, { value: 'image', label: 'Image / logo' }]
            },
            { id: 'text', type: 'text', label: 'Watermark text', value: '© ZyncTools', when: function (o) { return o.type === 'text'; } },
            { id: 'logo', type: 'file', label: 'Logo file', accept: 'image/*', when: function (o) { return o.type === 'image'; } },
            { id: 'font-size', type: 'range', label: 'Text size', value: 5, min: 1, max: 20, step: 0.5, suffix: '% of width', when: function (o) { return o.type === 'text'; } },
            {
                id: 'font-family', type: 'select', label: 'Font', value: 'sans-serif',
                options: [
                    { value: 'sans-serif', label: 'Sans-serif' }, { value: 'serif', label: 'Serif' },
                    { value: 'monospace', label: 'Monospace' }, { value: 'cursive', label: 'Cursive' }
                ],
                when: function (o) { return o.type === 'text'; }
            },
            { id: 'bold', type: 'checkbox', label: 'Bold', value: true, when: function (o) { return o.type === 'text'; } },
            { id: 'color', type: 'color', label: 'Text colour', value: '#FFFFFF', when: function (o) { return o.type === 'text'; } },
            { id: 'stroke', type: 'checkbox', label: 'Add a dark outline for legibility', value: true, when: function (o) { return o.type === 'text'; } },
            { id: 'logo-scale', type: 'range', label: 'Logo size', value: 20, min: 2, max: 100, step: 1, suffix: '% of width', when: function (o) { return o.type === 'image'; } },
            { id: 'opacity', type: 'range', label: 'Opacity', value: 55, min: 5, max: 100, step: 1, suffix: '%' },
            {
                id: 'position', type: 'select', label: 'Position', value: 'bottom-right',
                options: [
                    { value: 'top-left', label: 'Top left' }, { value: 'top-center', label: 'Top centre' }, { value: 'top-right', label: 'Top right' },
                    { value: 'middle-left', label: 'Middle left' }, { value: 'center', label: 'Centre' }, { value: 'middle-right', label: 'Middle right' },
                    { value: 'bottom-left', label: 'Bottom left' }, { value: 'bottom-center', label: 'Bottom centre' }, { value: 'bottom-right', label: 'Bottom right' },
                    { value: 'tile', label: 'Tiled across the whole image' }
                ]
            },
            { id: 'rotation', type: 'range', label: 'Rotation', value: 0, min: -90, max: 90, step: 1, suffix: '°' },
            { id: 'margin', type: 'range', label: 'Edge margin', value: 3, min: 0, max: 20, step: 0.5, suffix: '% of width', when: function (o) { return o.position !== 'tile'; } },
            { id: 'tile-gap', type: 'range', label: 'Spacing between tiles', value: 40, min: 5, max: 150, step: 5, suffix: '%', when: function (o) { return o.position === 'tile'; } },
            FORMAT_OPTION, QUALITY_OPTION
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            if (o.type === 'text' && !String(o.text).trim()) ZT.fail('Enter some watermark text.');
            if (o.type === 'image' && !o.logo) ZT.fail('Choose a logo image to stamp on.');

            var logoBitmap = o.type === 'image' ? await ZT.loadImage(o.logo) : null;

            return processEach(ctx, async function (bitmap, file) {
                var size = ZT.imageSize(bitmap);
                var canvas = ZT.drawToCanvas(bitmap);
                var cctx = canvas.getContext('2d');
                var margin = size.width * o.margin / 100;

                cctx.globalAlpha = o.opacity / 100;

                var markW, markH, draw;
                if (o.type === 'text') {
                    var fontPx = Math.max(8, size.width * o.fontSize / 100);
                    cctx.font = (o.bold ? 'bold ' : '') + fontPx + 'px ' + o.fontFamily;
                    cctx.textBaseline = 'middle';
                    cctx.textAlign = 'center';
                    var metrics = cctx.measureText(o.text);
                    markW = metrics.width;
                    markH = fontPx;
                    draw = function () {
                        if (o.stroke) {
                            cctx.lineWidth = Math.max(1, fontPx / 12);
                            cctx.strokeStyle = 'rgba(0,0,0,0.65)';
                            cctx.strokeText(o.text, 0, 0);
                        }
                        cctx.fillStyle = o.color;
                        cctx.fillText(o.text, 0, 0);
                    };
                } else {
                    var logoSize = ZT.imageSize(logoBitmap);
                    markW = size.width * o.logoScale / 100;
                    markH = logoSize.height * (markW / logoSize.width);
                    draw = function () { cctx.drawImage(logoBitmap, -markW / 2, -markH / 2, markW, markH); };
                }

                if (o.position === 'tile') {
                    var stepX = markW * (1 + o.tileGap / 100);
                    var stepY = markH * (1 + o.tileGap / 100) * 2;
                    for (var y = stepY / 2; y < size.height + stepY; y += stepY) {
                        for (var x = stepX / 2; x < size.width + stepX; x += stepX) {
                            cctx.save();
                            cctx.translate(x, y);
                            cctx.rotate(o.rotation * Math.PI / 180);
                            draw();
                            cctx.restore();
                        }
                    }
                } else {
                    var parts = o.position.split('-');
                    var vertical = parts[0], horizontal = parts[1] || 'center';
                    var px = horizontal === 'left' ? margin + markW / 2
                        : horizontal === 'right' ? size.width - margin - markW / 2
                        : size.width / 2;
                    var py = vertical === 'top' ? margin + markH / 2
                        : vertical === 'bottom' ? size.height - margin - markH / 2
                        : size.height / 2;
                    if (o.position === 'center') { px = size.width / 2; py = size.height / 2; }

                    cctx.save();
                    cctx.translate(px, py);
                    cctx.rotate(o.rotation * Math.PI / 180);
                    draw();
                    cctx.restore();
                }

                cctx.globalAlpha = 1;
                if (o.format === 'jpeg') canvas = ZT.flattenAlpha(canvas, '#ffffff');
                var blob = await ZT.encodeCanvas(canvas, o.format, o.format === 'png' ? undefined : o.quality / 100);
                return ZT.fileResult(blob, ZT.outName(file.name, 'watermarked', o.format === 'jpeg' ? 'jpg' : o.format), {
                    note: ZT.formatBytes(blob.size),
                    previewBlob: blob
                });
            }, { zipName: 'watermarked-images' });
        }
    });

    /* ============================================================
       Meme generator
       ============================================================ */
    define({
        id: 'meme-generator',
        name: 'Meme Generator',
        category: 'image',
        icon: 'smile',
        description: 'Add classic top and bottom caption text to any image.',
        tags: ['meme', 'caption', 'text', 'impact', 'funny'],
        input: 'file',
        accept: IMAGE_ACCEPT,
        options: [
            { id: 'top-text', type: 'text', label: 'Top text', value: 'WHEN THE CODE WORKS' },
            { id: 'bottom-text', type: 'text', label: 'Bottom text', value: 'BUT YOU DO NOT KNOW WHY' },
            { id: 'font-size', type: 'range', label: 'Text size', value: 9, min: 3, max: 20, step: 0.5, suffix: '% of height' },
            { id: 'uppercase', type: 'checkbox', label: 'Force uppercase', value: true },
            { id: 'color', type: 'color', label: 'Text colour', value: '#FFFFFF' },
            { id: 'stroke-color', type: 'color', label: 'Outline colour', value: '#000000' },
            { id: 'stroke-width', type: 'range', label: 'Outline thickness', value: 8, min: 0, max: 25, step: 1, suffix: '%' },
            { id: 'max-width', type: 'number', label: 'Scale image to width', suffix: 'px', value: 0, min: 0, max: 4000, help: '0 keeps the original size.' },
            Object.assign({}, FORMAT_OPTION, { value: 'jpeg' }), QUALITY_OPTION
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var file = ctx.files[0];
            var bitmap = await decodeAny(file);
            var size = ZT.imageSize(bitmap);

            var canvas = (o.maxWidth > 0 && size.width !== o.maxWidth)
                ? ZT.smoothResize(bitmap, o.maxWidth, Math.round(size.height * o.maxWidth / size.width))
                : ZT.drawToCanvas(bitmap);

            var cctx = canvas.getContext('2d');
            var fontPx = canvas.height * o.fontSize / 100;
            cctx.font = 'bold ' + fontPx + 'px Impact, "Arial Black", sans-serif';
            cctx.textAlign = 'center';
            cctx.fillStyle = o.color;
            cctx.strokeStyle = o.strokeColor;
            cctx.lineWidth = fontPx * o.strokeWidth / 100;
            cctx.lineJoin = 'round';

            function drawCaption(text, atTop) {
                if (!text) return;
                var content = o.uppercase ? text.toUpperCase() : text;
                var maxWidth = canvas.width * 0.92;

                // Wrap to as many lines as needed rather than letting text run off.
                var words = content.split(/\s+/);
                var lines = [];
                var current = '';
                words.forEach(function (word) {
                    var candidate = current ? current + ' ' + word : word;
                    if (cctx.measureText(candidate).width > maxWidth && current) {
                        lines.push(current);
                        current = word;
                    } else current = candidate;
                });
                if (current) lines.push(current);

                var lineHeight = fontPx * 1.12;
                lines.forEach(function (line, i) {
                    var y = atTop
                        ? fontPx * 0.95 + i * lineHeight
                        : canvas.height - fontPx * 0.35 - (lines.length - 1 - i) * lineHeight;
                    if (cctx.lineWidth > 0) cctx.strokeText(line, canvas.width / 2, y);
                    cctx.fillText(line, canvas.width / 2, y);
                });
            }

            drawCaption(o.topText, true);
            drawCaption(o.bottomText, false);

            if (o.format === 'jpeg') canvas = ZT.flattenAlpha(canvas, '#000000');
            var blob = await ZT.encodeCanvas(canvas, o.format, o.format === 'png' ? undefined : o.quality / 100);
            return ZT.fileResult(blob, ZT.outName(file.name, 'meme', o.format === 'jpeg' ? 'jpg' : o.format), {
                previewBlob: blob, note: canvas.width + '×' + canvas.height
            });
        }
    });

    /* ============================================================
       Pixelate / blur regions
       ============================================================ */
    define({
        id: 'image-pixelate',
        name: 'Pixelate / Blur Image',
        category: 'image',
        icon: 'grid-3x3',
        description: 'Pixelate or blur a whole image, or just a rectangular region.',
        tags: ['pixelate', 'blur', 'censor', 'redact', 'privacy', 'mosaic'],
        input: 'files',
        accept: IMAGE_ACCEPT,
        options: [
            {
                id: 'effect', type: 'radio', label: 'Effect', value: 'pixelate',
                options: [{ value: 'pixelate', label: 'Pixelate' }, { value: 'blur', label: 'Blur' }]
            },
            { id: 'block-size', type: 'range', label: 'Block size', value: 12, min: 2, max: 80, step: 1, suffix: 'px', when: function (o) { return o.effect === 'pixelate'; } },
            { id: 'blur-radius', type: 'range', label: 'Blur radius', value: 12, min: 1, max: 60, step: 1, suffix: 'px', when: function (o) { return o.effect === 'blur'; } },
            {
                id: 'area', type: 'select', label: 'Apply to', value: 'whole',
                options: [{ value: 'whole', label: 'The whole image' }, { value: 'region', label: 'A rectangular region' }]
            },
            { id: 'x', type: 'number', label: 'Region X', suffix: 'px', value: 0, min: 0, when: regionSelected },
            { id: 'y', type: 'number', label: 'Region Y', suffix: 'px', value: 0, min: 0, when: regionSelected },
            { id: 'width', type: 'number', label: 'Region width', suffix: 'px', value: 300, min: 1, when: regionSelected },
            { id: 'height', type: 'number', label: 'Region height', suffix: 'px', value: 200, min: 1, when: regionSelected },
            FORMAT_OPTION, QUALITY_OPTION
        ],
        run: function (ctx) {
            var o = ctx.opt;
            return processEach(ctx, async function (bitmap, file) {
                var size = ZT.imageSize(bitmap);
                var canvas = ZT.drawToCanvas(bitmap);
                var cctx = canvas.getContext('2d');

                var rx = 0, ry = 0, rw = size.width, rh = size.height;
                if (o.area === 'region') {
                    rx = ZT.clamp(o.x, 0, size.width - 1);
                    ry = ZT.clamp(o.y, 0, size.height - 1);
                    rw = ZT.clamp(o.width, 1, size.width - rx);
                    rh = ZT.clamp(o.height, 1, size.height - ry);
                }

                if (o.effect === 'pixelate') {
                    // Downscale the region then blow it back up with smoothing off.
                    var smallW = Math.max(1, Math.round(rw / o.blockSize));
                    var smallH = Math.max(1, Math.round(rh / o.blockSize));
                    var small = ZT.makeCanvas(smallW, smallH);
                    small.getContext('2d').drawImage(canvas, rx, ry, rw, rh, 0, 0, smallW, smallH);
                    cctx.imageSmoothingEnabled = false;
                    cctx.drawImage(small, 0, 0, smallW, smallH, rx, ry, rw, rh);
                    cctx.imageSmoothingEnabled = true;
                } else {
                    var region = ZT.makeCanvas(rw, rh);
                    var rctx = region.getContext('2d');
                    rctx.filter = 'blur(' + o.blurRadius + 'px)';
                    // Draw with padding so the blur does not sample transparent edges.
                    rctx.drawImage(canvas, rx, ry, rw, rh, 0, 0, rw, rh);
                    cctx.drawImage(region, rx, ry);
                }

                if (o.format === 'jpeg') canvas = ZT.flattenAlpha(canvas, '#ffffff');
                var blob = await ZT.encodeCanvas(canvas, o.format, o.format === 'png' ? undefined : o.quality / 100);
                return ZT.fileResult(blob, ZT.outName(file.name, o.effect, o.format === 'jpeg' ? 'jpg' : o.format), {
                    previewBlob: blob, note: ZT.formatBytes(blob.size)
                });
            }, { zipName: 'censored-images' });
        }
    });

    function regionSelected(o) { return o.area === 'region'; }

    /* ============================================================
       Border / frame
       ============================================================ */
    define({
        id: 'image-border',
        name: 'Add Border to Image',
        category: 'image',
        icon: 'square',
        description: 'Add a coloured border, padding or rounded corners around an image.',
        tags: ['border', 'frame', 'padding', 'margin', 'rounded'],
        input: 'files',
        accept: IMAGE_ACCEPT,
        options: [
            {
                id: 'unit', type: 'radio', label: 'Border size in', value: 'px',
                options: [{ value: 'px', label: 'Pixels' }, { value: 'percent', label: 'Percent of width' }]
            },
            { id: 'size', type: 'number', label: 'Border thickness', value: 24, min: 0, max: 500 },
            { id: 'color', type: 'color', label: 'Border colour', value: '#FFFFFF' },
            { id: 'transparent', type: 'checkbox', label: 'Transparent border (PNG only)', value: false },
            { id: 'radius', type: 'range', label: 'Corner radius', value: 0, min: 0, max: 200, step: 1, suffix: 'px' },
            { id: 'equal-sides', type: 'checkbox', label: 'Same thickness on all sides', value: true },
            { id: 'top', type: 'number', label: 'Top', suffix: 'px', value: 24, min: 0, when: unequalSides },
            { id: 'right', type: 'number', label: 'Right', suffix: 'px', value: 24, min: 0, when: unequalSides },
            { id: 'bottom', type: 'number', label: 'Bottom', suffix: 'px', value: 24, min: 0, when: unequalSides },
            { id: 'left', type: 'number', label: 'Left', suffix: 'px', value: 24, min: 0, when: unequalSides },
            FORMAT_OPTION, QUALITY_OPTION
        ],
        run: function (ctx) {
            var o = ctx.opt;
            return processEach(ctx, async function (bitmap, file) {
                var size = ZT.imageSize(bitmap);
                var base = o.unit === 'percent' ? Math.round(size.width * o.size / 100) : o.size;

                var top = o.equalSides ? base : o.top;
                var right = o.equalSides ? base : o.right;
                var bottom = o.equalSides ? base : o.bottom;
                var left = o.equalSides ? base : o.left;

                var canvas = ZT.makeCanvas(size.width + left + right, size.height + top + bottom);
                var cctx = canvas.getContext('2d');

                if (!o.transparent) {
                    cctx.fillStyle = o.color;
                    cctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                if (o.radius > 0) {
                    cctx.save();
                    roundedRectPath(cctx, left, top, size.width, size.height, o.radius);
                    cctx.clip();
                }
                cctx.drawImage(bitmap, left, top);
                if (o.radius > 0) cctx.restore();

                var format = o.transparent ? 'png' : o.format;
                if (format === 'jpeg') canvas = ZT.flattenAlpha(canvas, o.color);
                var blob = await ZT.encodeCanvas(canvas, format, format === 'png' ? undefined : o.quality / 100);
                return ZT.fileResult(blob, ZT.outName(file.name, 'bordered', format === 'jpeg' ? 'jpg' : format), {
                    previewBlob: blob, note: canvas.width + '×' + canvas.height
                });
            }, { zipName: 'bordered-images' });
        }
    });

    function unequalSides(o) { return !o.equalSides; }

    function roundedRectPath(cctx, x, y, w, h, r) {
        var radius = Math.min(r, w / 2, h / 2);
        cctx.beginPath();
        cctx.moveTo(x + radius, y);
        cctx.arcTo(x + w, y, x + w, y + h, radius);
        cctx.arcTo(x + w, y + h, x, y + h, radius);
        cctx.arcTo(x, y + h, x, y, radius);
        cctx.arcTo(x, y, x + w, y, radius);
        cctx.closePath();
    }

    /* ============================================================
       Join / collage
       ============================================================ */
    define({
        id: 'image-joiner',
        name: 'Merge Images',
        category: 'image',
        icon: 'layout-grid',
        description: 'Combine several images into a strip or grid collage.',
        tags: ['merge', 'combine', 'collage', 'join', 'stitch', 'grid'],
        input: 'files',
        accept: IMAGE_ACCEPT,
        options: [
            {
                id: 'layout', type: 'select', label: 'Layout', value: 'horizontal',
                options: [
                    { value: 'horizontal', label: 'Side by side' },
                    { value: 'vertical', label: 'Stacked vertically' },
                    { value: 'grid', label: 'Grid' }
                ]
            },
            { id: 'columns', type: 'number', label: 'Columns', value: 2, min: 1, max: 12, when: function (o) { return o.layout === 'grid'; } },
            { id: 'gap', type: 'number', label: 'Gap between images', suffix: 'px', value: 8, min: 0, max: 200 },
            { id: 'padding', type: 'number', label: 'Outer padding', suffix: 'px', value: 8, min: 0, max: 200 },
            { id: 'background', type: 'color', label: 'Background colour', value: '#FFFFFF' },
            { id: 'transparent', type: 'checkbox', label: 'Transparent background (PNG)', value: false },
            {
                id: 'sizing', type: 'select', label: 'Handle different sizes by', value: 'match',
                options: [
                    { value: 'match', label: 'Scaling to match the smallest' },
                    { value: 'cell', label: 'Fitting each into an equal cell' },
                    { value: 'none', label: 'Leaving originals as they are' }
                ]
            },
            { id: 'cell-size', type: 'number', label: 'Cell size', suffix: 'px', value: 400, min: 32, max: 4000, when: function (o) { return o.sizing === 'cell'; } },
            FORMAT_OPTION, QUALITY_OPTION
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            if (ctx.files.length < 2) ZT.fail('Add at least two images to merge.');

            var bitmaps = [];
            for (var i = 0; i < ctx.files.length; i++) {
                ctx.progress(i / ctx.files.length / 2, 'Reading ' + ctx.files[i].name);
                bitmaps.push(await decodeAny(ctx.files[i]));
            }

            var sizes = bitmaps.map(ZT.imageSize);
            var drawW = [], drawH = [];

            if (o.sizing === 'cell') {
                bitmaps.forEach(function (_, i) {
                    var fit = ZT.fitInside(sizes[i].width, sizes[i].height, o.cellSize, o.cellSize);
                    drawW[i] = fit.width; drawH[i] = fit.height;
                });
            } else if (o.sizing === 'match') {
                if (o.layout === 'vertical') {
                    var minW = Math.min.apply(null, sizes.map(function (s) { return s.width; }));
                    sizes.forEach(function (s, i) { drawW[i] = minW; drawH[i] = Math.round(s.height * minW / s.width); });
                } else {
                    var minH = Math.min.apply(null, sizes.map(function (s) { return s.height; }));
                    sizes.forEach(function (s, i) { drawH[i] = minH; drawW[i] = Math.round(s.width * minH / s.height); });
                }
            } else {
                sizes.forEach(function (s, i) { drawW[i] = s.width; drawH[i] = s.height; });
            }

            var cols = o.layout === 'grid' ? o.columns : (o.layout === 'horizontal' ? bitmaps.length : 1);
            var rows = Math.ceil(bitmaps.length / cols);

            var colWidths = [], rowHeights = [];
            for (var c = 0; c < cols; c++) {
                colWidths[c] = 0;
                for (var r = 0; r < rows; r++) {
                    var idx = r * cols + c;
                    if (idx < bitmaps.length) colWidths[c] = Math.max(colWidths[c], drawW[idx]);
                }
            }
            for (r = 0; r < rows; r++) {
                rowHeights[r] = 0;
                for (c = 0; c < cols; c++) {
                    idx = r * cols + c;
                    if (idx < bitmaps.length) rowHeights[r] = Math.max(rowHeights[r], drawH[idx]);
                }
            }

            var totalW = colWidths.reduce(function (a, b) { return a + b; }, 0) + o.gap * (cols - 1) + o.padding * 2;
            var totalH = rowHeights.reduce(function (a, b) { return a + b; }, 0) + o.gap * (rows - 1) + o.padding * 2;

            if (totalW * totalH > 80e6) ZT.fail('The combined image would be over 80 megapixels. Reduce the cell size or use fewer images.');

            var canvas = ZT.makeCanvas(totalW, totalH);
            var cctx = canvas.getContext('2d');
            if (!o.transparent) {
                cctx.fillStyle = o.background;
                cctx.fillRect(0, 0, totalW, totalH);
            }

            var y = o.padding;
            for (r = 0; r < rows; r++) {
                var x = o.padding;
                for (c = 0; c < cols; c++) {
                    idx = r * cols + c;
                    if (idx < bitmaps.length) {
                        // Centre each image inside its cell so ragged sizes still look tidy.
                        var offsetX = x + (colWidths[c] - drawW[idx]) / 2;
                        var offsetY = y + (rowHeights[r] - drawH[idx]) / 2;
                        cctx.drawImage(bitmaps[idx], offsetX, offsetY, drawW[idx], drawH[idx]);
                    }
                    x += colWidths[c] + o.gap;
                }
                y += rowHeights[r] + o.gap;
            }
            ctx.progress(0.9);

            bitmaps.forEach(function (b) { if (b.close) b.close(); });

            var format = o.transparent ? 'png' : o.format;
            if (format === 'jpeg') canvas = ZT.flattenAlpha(canvas, o.background);
            var blob = await ZT.encodeCanvas(canvas, format, format === 'png' ? undefined : o.quality / 100);
            ctx.progress(1);

            return ZT.fileResult(blob, 'merged-' + bitmaps.length + '-images.' + (format === 'jpeg' ? 'jpg' : format), {
                previewBlob: blob, note: totalW + '×' + totalH + '  ·  ' + ZT.formatBytes(blob.size)
            });
        }
    });

    /* ============================================================
       Split
       ============================================================ */
    define({
        id: 'image-splitter',
        name: 'Image Splitter',
        category: 'image',
        icon: 'grid-2x2',
        description: 'Slice an image into a grid of tiles — great for Instagram carousels.',
        tags: ['split', 'slice', 'tiles', 'grid', 'cut', 'instagram'],
        input: 'file',
        accept: IMAGE_ACCEPT,
        options: [
            { id: 'columns', type: 'number', label: 'Columns', value: 3, min: 1, max: 20 },
            { id: 'rows', type: 'number', label: 'Rows', value: 3, min: 1, max: 20 },
            {
                id: 'naming', type: 'select', label: 'Name tiles by', value: 'grid',
                options: [
                    { value: 'grid', label: 'Row and column  (r1-c2)' },
                    { value: 'index', label: 'Sequence number  (1, 2, 3…)' }
                ]
            },
            FORMAT_OPTION, QUALITY_OPTION
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var file = ctx.files[0];
            var bitmap = await decodeAny(file);
            var size = ZT.imageSize(bitmap);

            var tileW = Math.floor(size.width / o.columns);
            var tileH = Math.floor(size.height / o.rows);
            if (tileW < 1 || tileH < 1) ZT.fail('That grid is finer than the image has pixels.');

            var tiles = [];
            var n = 0;
            for (var r = 0; r < o.rows; r++) {
                for (var c = 0; c < o.columns; c++) {
                    n++;
                    ctx.progress(n / (o.rows * o.columns));
                    // Give the last row/column any remainder so no pixels are lost.
                    var w = (c === o.columns - 1) ? size.width - tileW * c : tileW;
                    var h = (r === o.rows - 1) ? size.height - tileH * r : tileH;

                    var canvas = ZT.makeCanvas(w, h);
                    canvas.getContext('2d').drawImage(bitmap, tileW * c, tileH * r, w, h, 0, 0, w, h);
                    if (o.format === 'jpeg') canvas = ZT.flattenAlpha(canvas, '#ffffff');

                    var blob = await ZT.encodeCanvas(canvas, o.format, o.format === 'png' ? undefined : o.quality / 100);
                    var suffix = o.naming === 'grid' ? 'r' + (r + 1) + '-c' + (c + 1) : String(n).padStart(2, '0');
                    tiles.push({ name: ZT.outName(file.name, suffix, o.format === 'jpeg' ? 'jpg' : o.format), blob: blob });
                }
            }

            var zip = await ZT.zipFiles(tiles, ZT.stem(file.name) + '-tiles.zip');
            return [ZT.fileResult(zip.blob, zip.name, { note: tiles.length + ' tiles at ' + tileW + '×' + tileH })]
                .concat(tiles.map(function (t) { return ZT.fileResult(t.blob, t.name, { previewBlob: t.blob }); }));
        }
    });

    /* ============================================================
       Favicon
       ============================================================ */
    define({
        id: 'favicon-generator',
        name: 'Favicon Generator',
        category: 'image',
        icon: 'app-window',
        description: 'Build a full favicon set with every size a site needs, plus the HTML.',
        tags: ['favicon', 'icon', 'ico', 'apple touch', 'pwa', 'website'],
        input: 'file',
        accept: IMAGE_ACCEPT,
        popular: true,
        options: [
            { id: 'sizes', type: 'text', label: 'PNG sizes', value: '16,32,48,64,96,128,180,192,256,512', help: 'Comma-separated pixel sizes.' },
            { id: 'include-ico', type: 'checkbox', label: 'Include a multi-size favicon.ico', value: true },
            { id: 'background', type: 'color', label: 'Background colour', value: '#FFFFFF' },
            { id: 'transparent', type: 'checkbox', label: 'Keep transparency', value: true },
            { id: 'padding', type: 'range', label: 'Padding around the icon', value: 0, min: 0, max: 30, step: 1, suffix: '%' },
            { id: 'rounded', type: 'range', label: 'Corner radius', value: 0, min: 0, max: 50, step: 1, suffix: '%' },
            { id: 'include-html', type: 'checkbox', label: 'Include the HTML snippet and web manifest', value: true }
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            var file = ctx.files[0];
            var bitmap = (ZT.extOf(file.name) === 'svg') ? await decodeSvg(file, 1024) : await decodeAny(file);

            var sizes = String(o.sizes).split(',').map(function (s) { return parseInt(s.trim(), 10); })
                .filter(function (n) { return n > 0 && n <= 1024; });
            if (!sizes.length) ZT.fail('Enter at least one valid size, for example 16,32,180.');
            sizes.sort(function (a, b) { return a - b; });

            function renderSize(px) {
                var canvas = ZT.makeCanvas(px, px);
                var cctx = canvas.getContext('2d');

                if (!o.transparent) {
                    cctx.fillStyle = o.background;
                    if (o.rounded > 0) {
                        roundedRectPath(cctx, 0, 0, px, px, px * o.rounded / 100);
                        cctx.fill();
                    } else cctx.fillRect(0, 0, px, px);
                }
                if (o.rounded > 0) {
                    roundedRectPath(cctx, 0, 0, px, px, px * o.rounded / 100);
                    cctx.clip();
                }

                var inset = px * o.padding / 100;
                var box = px - inset * 2;
                var srcSize = ZT.imageSize(bitmap);
                var fit = ZT.fitInside(srcSize.width, srcSize.height, box, box);
                cctx.imageSmoothingQuality = 'high';
                cctx.drawImage(bitmap, (px - fit.width) / 2, (px - fit.height) / 2, fit.width, fit.height);
                return canvas;
            }

            var entries = [];
            for (var i = 0; i < sizes.length; i++) {
                ctx.progress(i / sizes.length, 'Rendering ' + sizes[i] + '×' + sizes[i]);
                var blob = await ZT.encodeCanvas(renderSize(sizes[i]), 'png');
                var name = sizes[i] === 180 ? 'apple-touch-icon.png' : 'favicon-' + sizes[i] + 'x' + sizes[i] + '.png';
                entries.push({ name: name, blob: blob });
            }

            if (o.includeIco) {
                var icoSizes = sizes.filter(function (s) { return s <= 64; }).slice(0, 4);
                if (!icoSizes.length) icoSizes = [32];
                var icoCanvases = icoSizes.map(renderSize);
                entries.push({ name: 'favicon.ico', blob: await buildIco(icoCanvases) });
            }

            if (o.includeHtml) {
                entries.push({ name: 'favicon-snippet.html', blob: new Blob([buildFaviconHtml(sizes)], { type: 'text/html' }) });
                entries.push({ name: 'site.webmanifest', blob: new Blob([buildManifest(sizes, o.background)], { type: 'application/manifest+json' }) });
            }

            ctx.progress(1);
            var zip = await ZT.zipFiles(entries, 'favicons.zip');

            return [
                ZT.fileResult(zip.blob, zip.name, { note: entries.length + ' files' }),
                ZT.textResult(buildFaviconHtml(sizes), { lang: 'html', title: 'Paste this into your <head>' })
            ].concat(entries.filter(function (e) { return /\.png$/.test(e.name); })
                .map(function (e) { return ZT.fileResult(e.blob, e.name, { previewBlob: e.blob }); }));
        }
    });

    function buildFaviconHtml(sizes) {
        var out = ['<link rel="icon" href="/favicon.ico" sizes="any">'];
        if (sizes.indexOf(32) !== -1) out.push('<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">');
        if (sizes.indexOf(16) !== -1) out.push('<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">');
        if (sizes.indexOf(180) !== -1) out.push('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">');
        out.push('<link rel="manifest" href="/site.webmanifest">');
        return out.join('\n');
    }

    function buildManifest(sizes, background) {
        return JSON.stringify({
            name: 'Your site',
            short_name: 'Site',
            icons: sizes.filter(function (s) { return s >= 192; }).map(function (s) {
                return { src: '/favicon-' + s + 'x' + s + '.png', sizes: s + 'x' + s, type: 'image/png' };
            }),
            theme_color: background,
            background_color: background,
            display: 'standalone'
        }, null, 2);
    }

    /**
     * Assemble a multi-image .ico. The format is a small header followed by
     * one directory entry per image; PNG payloads are legal since Vista.
     */
    async function buildIco(canvases) {
        var pngs = [];
        for (var i = 0; i < canvases.length; i++) {
            var blob = await ZT.encodeCanvas(canvases[i], 'png');
            pngs.push({ size: canvases[i].width, bytes: new Uint8Array(await blob.arrayBuffer()) });
        }

        var headerSize = 6 + pngs.length * 16;
        var total = pngs.reduce(function (sum, p) { return sum + p.bytes.length; }, headerSize);
        var buffer = new ArrayBuffer(total);
        var view = new DataView(buffer);
        var bytes = new Uint8Array(buffer);

        view.setUint16(0, 0, true);            // reserved
        view.setUint16(2, 1, true);            // type 1 = icon
        view.setUint16(4, pngs.length, true);  // image count

        var offset = headerSize;
        pngs.forEach(function (png, i) {
            var entry = 6 + i * 16;
            view.setUint8(entry, png.size >= 256 ? 0 : png.size);      // width  (0 means 256)
            view.setUint8(entry + 1, png.size >= 256 ? 0 : png.size);  // height
            view.setUint8(entry + 2, 0);                               // palette size
            view.setUint8(entry + 3, 0);                               // reserved
            view.setUint16(entry + 4, 1, true);                        // colour planes
            view.setUint16(entry + 6, 32, true);                       // bits per pixel
            view.setUint32(entry + 8, png.bytes.length, true);
            view.setUint32(entry + 12, offset, true);
            bytes.set(png.bytes, offset);
            offset += png.bytes.length;
        });

        return new Blob([buffer], { type: 'image/x-icon' });
    }

    /* ============================================================
       Colour palette from image
       ============================================================ */
    define({
        id: 'color-palette-extractor',
        name: 'Image Colour Palette',
        category: 'image',
        icon: 'swatch-book',
        description: 'Pull the dominant colours out of a photo as a usable palette.',
        tags: ['palette', 'colors', 'dominant', 'extract', 'swatch', 'theme'],
        input: 'file',
        accept: IMAGE_ACCEPT,
        options: [
            { id: 'count', type: 'range', label: 'Number of colours', value: 6, min: 2, max: 16, step: 1 },
            {
                id: 'format', type: 'select', label: 'Copyable output', value: 'hex',
                options: [
                    { value: 'hex', label: 'HEX list' }, { value: 'css', label: 'CSS custom properties' },
                    { value: 'json', label: 'JSON array' }, { value: 'scss', label: 'SCSS variables' }
                ]
            },
            { id: 'ignore-near-white', type: 'checkbox', label: 'Ignore near-white and near-black pixels', value: true }
        ],
        run: async function (ctx) {
            var file = ctx.files[0];
            var bitmap = await decodeAny(file);
            var size = ZT.imageSize(bitmap);

            // Sampling a thumbnail is plenty for palette work and far faster.
            var fit = ZT.fitInside(size.width, size.height, 200, 200);
            var canvas = ZT.smoothResize(bitmap, fit.width, fit.height);
            var data = canvas.getContext('2d').getImageData(0, 0, fit.width, fit.height).data;

            var pixels = [];
            for (var i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 125) continue;
                var r = data[i], g = data[i + 1], b = data[i + 2];
                if (ctx.opt.ignoreNearWhite) {
                    var max = Math.max(r, g, b), min = Math.min(r, g, b);
                    if (max > 244 && min > 244) continue;
                    if (max < 14) continue;
                }
                pixels.push([r, g, b]);
            }
            if (!pixels.length) ZT.fail('That image has no colours left to sample after filtering.');

            var palette = kMeans(pixels, ctx.opt.count);
            var hexes = palette.map(function (c) { return ZT.color.toHex(c[0], c[1], c[2]).toUpperCase(); });

            var strip = ZT.el('div', { class: 'zt-swatch-row zt-swatch-row--large' });
            palette.forEach(function (c, idx) {
                var hex = hexes[idx];
                var lum = ZT.color.luminance(c[0], c[1], c[2]);
                strip.appendChild(ZT.el('button', {
                    class: 'zt-swatch zt-swatch--large', type: 'button',
                    style: { background: hex, color: lum > 0.4 ? '#111' : '#fff' },
                    title: 'Click to copy ' + hex, 'data-copy': hex
                }, ZT.el('span', { text: hex })));
            });

            var out;
            switch (ctx.opt.format) {
                case 'css': out = ':root {\n' + hexes.map(function (h, i) { return '  --color-' + (i + 1) + ': ' + h + ';'; }).join('\n') + '\n}'; break;
                case 'scss': out = hexes.map(function (h, i) { return '$color-' + (i + 1) + ': ' + h + ';'; }).join('\n'); break;
                case 'json': out = JSON.stringify(hexes, null, 2); break;
                default: out = hexes.join('\n');
            }

            return [
                ZT.nodeResult(strip, { title: 'Palette — click any swatch to copy' }),
                ZT.textResult(out, { lang: ctx.opt.format === 'json' ? 'json' : 'css', title: 'Copyable palette' })
            ];
        }
    });

    /** Simple k-means clustering in RGB space, seeded deterministically. */
    function kMeans(pixels, k) {
        var centroids = [];
        var step = Math.floor(pixels.length / k) || 1;
        for (var i = 0; i < k; i++) centroids.push(pixels[Math.min(i * step, pixels.length - 1)].slice());

        for (var iter = 0; iter < 12; iter++) {
            var sums = centroids.map(function () { return [0, 0, 0, 0]; });

            for (var p = 0; p < pixels.length; p++) {
                var px = pixels[p];
                var best = 0, bestDist = Infinity;
                for (var c = 0; c < centroids.length; c++) {
                    var dr = px[0] - centroids[c][0], dg = px[1] - centroids[c][1], db = px[2] - centroids[c][2];
                    var dist = dr * dr + dg * dg + db * db;
                    if (dist < bestDist) { bestDist = dist; best = c; }
                }
                sums[best][0] += px[0]; sums[best][1] += px[1]; sums[best][2] += px[2]; sums[best][3]++;
            }

            var moved = false;
            for (c = 0; c < centroids.length; c++) {
                if (!sums[c][3]) continue;
                var nr = Math.round(sums[c][0] / sums[c][3]);
                var ng = Math.round(sums[c][1] / sums[c][3]);
                var nb = Math.round(sums[c][2] / sums[c][3]);
                if (nr !== centroids[c][0] || ng !== centroids[c][1] || nb !== centroids[c][2]) moved = true;
                centroids[c] = [nr, ng, nb];
            }
            if (!moved) break;
        }

        // Order by population so the most representative colour leads.
        var counts = centroids.map(function () { return 0; });
        pixels.forEach(function (px) {
            var best = 0, bestDist = Infinity;
            centroids.forEach(function (cen, ci) {
                var d = Math.pow(px[0] - cen[0], 2) + Math.pow(px[1] - cen[1], 2) + Math.pow(px[2] - cen[2], 2);
                if (d < bestDist) { bestDist = d; best = ci; }
            });
            counts[best]++;
        });
        return centroids
            .map(function (c, i) { return { color: c, count: counts[i] }; })
            .sort(function (a, b) { return b.count - a.count; })
            .map(function (x) { return x.color; });
    }

    /* ============================================================
       Image to ASCII
       ============================================================ */
    define({
        id: 'image-to-ascii',
        name: 'Image to ASCII Art',
        category: 'image',
        icon: 'type',
        description: 'Turn a photo into ASCII art you can paste anywhere.',
        tags: ['ascii', 'art', 'text', 'convert', 'terminal'],
        input: 'file',
        accept: IMAGE_ACCEPT,
        options: [
            { id: 'width', type: 'range', label: 'Output width', value: 100, min: 20, max: 300, step: 5, suffix: 'chars' },
            {
                id: 'charset', type: 'select', label: 'Character ramp', value: 'standard',
                options: [
                    { value: 'standard', label: 'Standard (70 levels)' },
                    { value: 'simple', label: 'Simple (10 levels)' },
                    { value: 'blocks', label: 'Block characters' },
                    { value: 'binary', label: 'Just 0 and 1' }
                ]
            },
            { id: 'invert', type: 'checkbox', label: 'Invert (for light backgrounds)', value: false },
            { id: 'contrast', type: 'range', label: 'Contrast boost', value: 100, min: 50, max: 250, step: 5, suffix: '%' }
        ],
        run: async function (ctx) {
            var RAMPS = {
                standard: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
                simple: '@%#*+=-:. ',
                blocks: '█▓▒░ ',
                binary: '10 '
            };
            var ramp = RAMPS[ctx.opt.charset] || RAMPS.standard;
            if (!ctx.opt.invert) ramp = ramp.split('').reverse().join('');

            var file = ctx.files[0];
            var bitmap = await decodeAny(file);
            var size = ZT.imageSize(bitmap);

            // Characters are roughly twice as tall as wide, so halve the rows.
            var cols = ctx.opt.width;
            var rows = Math.max(1, Math.round(size.height / size.width * cols * 0.5));

            var canvas = ZT.smoothResize(bitmap, cols, rows);
            var data = canvas.getContext('2d').getImageData(0, 0, cols, rows).data;

            var boost = ctx.opt.contrast / 100;
            var out = [];
            for (var y = 0; y < rows; y++) {
                var line = '';
                for (var x = 0; x < cols; x++) {
                    var i = (y * cols + x) * 4;
                    var lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
                    lum = ZT.clamp((lum - 0.5) * boost + 0.5, 0, 1);
                    if (data[i + 3] < 40) lum = ctx.opt.invert ? 0 : 1;
                    line += ramp[Math.min(ramp.length - 1, Math.floor(lum * (ramp.length - 1)))];
                }
                out.push(line.replace(/\s+$/, ''));
            }

            return ZT.textResult(out.join('\n'), { mono: true, note: cols + '×' + rows + ' characters' });
        }
    });

    /* ============================================================
       Metadata / EXIF
       ============================================================ */
    define({
        id: 'image-metadata-viewer',
        name: 'Image Metadata & EXIF Viewer',
        category: 'image',
        icon: 'info',
        description: 'Inspect EXIF, camera settings, GPS and other embedded image metadata.',
        tags: ['exif', 'metadata', 'camera', 'gps', 'iptc', 'inspect'],
        input: 'file',
        accept: IMAGE_ACCEPT,
        options: [
            { id: 'show-all', type: 'checkbox', label: 'Show every raw tag', value: false },
            { id: 'show-gps', type: 'checkbox', label: 'Include GPS location if present', value: true }
        ],
        run: async function (ctx) {
            var file = ctx.files[0];
            var bitmap = await decodeAny(file);
            var size = ZT.imageSize(bitmap);

            var basic = [
                { label: 'File name', value: file.name },
                { label: 'File size', value: ZT.formatBytes(file.size) },
                { label: 'Type', value: file.type || 'unknown' },
                { label: 'Dimensions', value: size.width + ' × ' + size.height + ' px' },
                { label: 'Megapixels', value: (size.width * size.height / 1e6).toFixed(2) + ' MP' },
                { label: 'Aspect ratio', value: aspectRatioLabel(size.width, size.height) },
                { label: 'Last modified', value: file.lastModified ? new Date(file.lastModified).toLocaleString() : 'unknown' }
            ];

            var results = [ZT.dataResult(basic, { title: 'File', columns: 2 })];

            var exifr;
            try {
                exifr = await ZT.libs.exifr();
            } catch (e) {
                results.push(ZT.dataResult([{ label: 'EXIF', value: 'Could not load the metadata reader.' }], { title: 'EXIF' }));
                return results;
            }

            var exif = null;
            try {
                exif = await exifr.parse(file, { gps: ctx.opt.showGps, translateValues: true, reviveValues: true });
            } catch (e) { /* many images simply have no EXIF */ }

            if (!exif || !Object.keys(exif).length) {
                results.push(ZT.dataResult(
                    [{ label: 'Result', value: 'No EXIF metadata found. PNG, WebP and screenshots often carry none, and many platforms strip it on upload.' }],
                    { title: 'EXIF' }
                ));
                return results;
            }

            var CAMERA_KEYS = ['Make', 'Model', 'LensModel', 'FNumber', 'ExposureTime', 'ISO', 'FocalLength',
                'FocalLengthIn35mmFormat', 'Flash', 'WhiteBalance', 'ExposureProgram', 'MeteringMode',
                'DateTimeOriginal', 'CreateDate', 'Orientation', 'Software', 'Artist', 'Copyright', 'ColorSpace'];

            function pretty(key, value) {
                if (value === null || value === undefined) return null;
                if (value instanceof Date) return value.toLocaleString();
                if (key === 'FNumber') return 'f/' + value;
                if (key === 'ExposureTime') return value < 1 ? '1/' + Math.round(1 / value) + ' s' : value + ' s';
                if (key === 'FocalLength') return value + ' mm';
                if (key === 'ISO') return 'ISO ' + value;
                if (Array.isArray(value)) return value.join(', ');
                if (typeof value === 'object') return JSON.stringify(value).slice(0, 120);
                return String(value);
            }

            var camera = [];
            CAMERA_KEYS.forEach(function (k) {
                var v = pretty(k, exif[k]);
                if (v) camera.push({ label: k.replace(/([a-z])([A-Z])/g, '$1 $2'), value: v });
            });
            if (camera.length) results.push(ZT.dataResult(camera, { title: 'Camera & capture', columns: 2 }));

            if (ctx.opt.showGps && exif.latitude && exif.longitude) {
                results.push(ZT.dataResult([
                    { label: 'Latitude', value: exif.latitude.toFixed(6) },
                    { label: 'Longitude', value: exif.longitude.toFixed(6) },
                    { label: 'Altitude', value: exif.GPSAltitude ? exif.GPSAltitude.toFixed(1) + ' m' : 'not recorded' },
                    { label: 'Map link', value: 'https://www.openstreetmap.org/?mlat=' + exif.latitude + '&mlon=' + exif.longitude + '#map=16/' + exif.latitude + '/' + exif.longitude }
                ], { title: 'GPS location — this image reveals where it was taken', columns: 2 }));
            }

            if (ctx.opt.showAll) {
                var all = Object.keys(exif).sort().map(function (k) {
                    return { label: k, value: pretty(k, exif[k]) || '—' };
                });
                results.push(ZT.dataResult(all, { title: 'All tags (' + all.length + ')', columns: 2, mono: true }));
            }

            return results;
        }
    });

    function aspectRatioLabel(w, h) {
        function gcd(a, b) { return b ? gcd(b, a % b) : a; }
        var g = gcd(w, h) || 1;
        var rw = w / g, rh = h / g;
        if (rw > 40 || rh > 40) return (w / h).toFixed(2) + ':1';
        return rw + ':' + rh;
    }

    define({
        id: 'image-metadata-remover',
        name: 'Remove Image Metadata',
        category: 'image',
        icon: 'shield-off',
        description: 'Strip EXIF, GPS and all embedded metadata by re-encoding the pixels.',
        tags: ['exif', 'metadata', 'privacy', 'strip', 'remove', 'gps'],
        input: 'files',
        accept: IMAGE_ACCEPT,
        options: [
            Object.assign({}, FORMAT_OPTION, { value: 'jpeg', help: 'Re-encoding is what removes the metadata, so an output format is required.' }),
            Object.assign({}, QUALITY_OPTION, { value: 92 }),
            BACKGROUND_OPTION
        ],
        run: function (ctx) {
            var o = ctx.opt;
            return processEach(ctx, async function (bitmap, file) {
                // Drawing to a canvas keeps only pixels — every metadata block is dropped.
                var canvas = ZT.drawToCanvas(bitmap);
                if (o.format === 'jpeg') canvas = ZT.flattenAlpha(canvas, o.background);
                var blob = await ZT.encodeCanvas(canvas, o.format, o.format === 'png' ? undefined : o.quality / 100);
                return ZT.fileResult(blob, ZT.outName(file.name, 'clean', o.format === 'jpeg' ? 'jpg' : o.format), {
                    note: 'All metadata removed · ' + ZT.formatBytes(file.size) + ' → ' + ZT.formatBytes(blob.size),
                    previewBlob: blob
                });
            }, { zipName: 'metadata-free-images' });
        }
    });

    /* ============================================================
       Placeholder generator
       ============================================================ */
    define({
        id: 'placeholder-image-generator',
        name: 'Placeholder Image Generator',
        category: 'image',
        icon: 'image-plus',
        description: 'Create solid or gradient placeholder images with size labels.',
        tags: ['placeholder', 'dummy', 'mockup', 'wireframe', 'stub'],
        input: 'none',
        options: [
            { id: 'width', type: 'number', label: 'Width', suffix: 'px', value: 800, min: 1, max: 8000 },
            { id: 'height', type: 'number', label: 'Height', suffix: 'px', value: 600, min: 1, max: 8000 },
            {
                id: 'style', type: 'select', label: 'Style', value: 'solid',
                options: [
                    { value: 'solid', label: 'Solid colour' },
                    { value: 'gradient', label: 'Gradient' },
                    { value: 'checker', label: 'Checkerboard' }
                ]
            },
            { id: 'color', type: 'color', label: 'Background colour', value: '#E5E7EB' },
            { id: 'color2', type: 'color', label: 'Second colour', value: '#9CA3AF', when: function (o) { return o.style !== 'solid'; } },
            { id: 'text-color', type: 'color', label: 'Text colour', value: '#374151' },
            { id: 'label', type: 'text', label: 'Label', value: '', placeholder: 'leave empty to show the dimensions' },
            { id: 'show-label', type: 'checkbox', label: 'Show a label', value: true },
            { id: 'checker-size', type: 'number', label: 'Checker square size', suffix: 'px', value: 20, min: 2, max: 200, when: function (o) { return o.style === 'checker'; } },
            Object.assign({}, FORMAT_OPTION, { value: 'png' }), QUALITY_OPTION
        ],
        run: async function (ctx) {
            var o = ctx.opt;
            if (o.width * o.height > 40e6) ZT.fail('That is over 40 megapixels. Try smaller dimensions.');

            var canvas = ZT.makeCanvas(o.width, o.height);
            var cctx = canvas.getContext('2d');

            if (o.style === 'gradient') {
                var grad = cctx.createLinearGradient(0, 0, o.width, o.height);
                grad.addColorStop(0, o.color);
                grad.addColorStop(1, o.color2);
                cctx.fillStyle = grad;
                cctx.fillRect(0, 0, o.width, o.height);
            } else if (o.style === 'checker') {
                cctx.fillStyle = o.color;
                cctx.fillRect(0, 0, o.width, o.height);
                cctx.fillStyle = o.color2;
                for (var y = 0; y < o.height; y += o.checkerSize) {
                    for (var x = 0; x < o.width; x += o.checkerSize) {
                        if (((x / o.checkerSize) + (y / o.checkerSize)) % 2 === 0) {
                            cctx.fillRect(x, y, o.checkerSize, o.checkerSize);
                        }
                    }
                }
            } else {
                cctx.fillStyle = o.color;
                cctx.fillRect(0, 0, o.width, o.height);
            }

            if (o.showLabel) {
                var text = o.label || (o.width + ' × ' + o.height);
                var fontPx = Math.max(12, Math.min(o.width, o.height) * 0.12);
                cctx.font = 'bold ' + fontPx + 'px system-ui, sans-serif';
                cctx.fillStyle = o.textColor;
                cctx.textAlign = 'center';
                cctx.textBaseline = 'middle';
                cctx.fillText(text, o.width / 2, o.height / 2);
            }

            if (o.format === 'jpeg') canvas = ZT.flattenAlpha(canvas, o.color);
            var blob = await ZT.encodeCanvas(canvas, o.format, o.format === 'png' ? undefined : o.quality / 100);
            return ZT.fileResult(blob, 'placeholder-' + o.width + 'x' + o.height + '.' + (o.format === 'jpeg' ? 'jpg' : o.format), {
                previewBlob: blob, note: ZT.formatBytes(blob.size)
            });
        }
    });

    /* ============================================================
       Compare two images
       ============================================================ */
    define({
        id: 'image-diff',
        name: 'Image Difference Checker',
        category: 'image',
        icon: 'git-compare',
        description: 'Highlight the pixels that differ between two similar images.',
        tags: ['diff', 'compare', 'difference', 'visual', 'regression'],
        input: 'files',
        accept: IMAGE_ACCEPT,
        maxFiles: 2,
        options: [
            { id: 'threshold', type: 'range', label: 'Sensitivity', value: 10, min: 0, max: 100, step: 1, suffix: '%', help: 'Lower values flag smaller differences.' },
            {
                id: 'output', type: 'select', label: 'Show differences as', value: 'highlight',
                options: [
                    { value: 'highlight', label: 'Original with changes highlighted' },
                    { value: 'mask', label: 'Black and white mask' },
                    { value: 'heatmap', label: 'Heatmap of change intensity' }
                ]
            },
            { id: 'highlight-color', type: 'color', label: 'Highlight colour', value: '#FF0055', when: function (o) { return o.output === 'highlight'; } },
            { id: 'dim-unchanged', type: 'checkbox', label: 'Fade the unchanged areas', value: true, when: function (o) { return o.output === 'highlight'; } }
        ],
        run: async function (ctx) {
            if (ctx.files.length !== 2) ZT.fail('Upload exactly two images to compare.');

            var a = await decodeAny(ctx.files[0]);
            var b = await decodeAny(ctx.files[1]);
            var sizeA = ZT.imageSize(a), sizeB = ZT.imageSize(b);

            // Compare at a shared size so differently-sized exports still work.
            var w = Math.min(sizeA.width, sizeB.width);
            var h = Math.min(sizeA.height, sizeB.height);
            var canvasA = ZT.smoothResize(a, w, h);
            var canvasB = ZT.smoothResize(b, w, h);

            var dataA = canvasA.getContext('2d').getImageData(0, 0, w, h);
            var dataB = canvasB.getContext('2d').getImageData(0, 0, w, h);

            var out = ZT.makeCanvas(w, h);
            var outCtx = out.getContext('2d');
            var outData = outCtx.createImageData(w, h);

            var highlight = ZT.color.parse(ctx.opt.highlightColor) || [255, 0, 85, 1];
            var cutoff = ctx.opt.threshold / 100 * 255;
            var changed = 0;

            for (var i = 0; i < dataA.data.length; i += 4) {
                var dr = Math.abs(dataA.data[i] - dataB.data[i]);
                var dg = Math.abs(dataA.data[i + 1] - dataB.data[i + 1]);
                var db = Math.abs(dataA.data[i + 2] - dataB.data[i + 2]);
                var delta = (dr + dg + db) / 3;
                var isDifferent = delta > cutoff;
                if (isDifferent) changed++;

                if (ctx.opt.output === 'mask') {
                    var v = isDifferent ? 255 : 0;
                    outData.data[i] = outData.data[i + 1] = outData.data[i + 2] = v;
                } else if (ctx.opt.output === 'heatmap') {
                    var t = Math.min(1, delta / 128);
                    outData.data[i] = Math.round(255 * t);
                    outData.data[i + 1] = Math.round(80 * (1 - t));
                    outData.data[i + 2] = Math.round(255 * (1 - t));
                } else if (isDifferent) {
                    outData.data[i] = highlight[0];
                    outData.data[i + 1] = highlight[1];
                    outData.data[i + 2] = highlight[2];
                } else {
                    var fade = ctx.opt.dimUnchanged ? 0.35 : 1;
                    outData.data[i] = Math.round(dataA.data[i] * fade + 255 * (1 - fade) * 0.6);
                    outData.data[i + 1] = Math.round(dataA.data[i + 1] * fade + 255 * (1 - fade) * 0.6);
                    outData.data[i + 2] = Math.round(dataA.data[i + 2] * fade + 255 * (1 - fade) * 0.6);
                }
                outData.data[i + 3] = 255;
            }

            outCtx.putImageData(outData, 0, 0);
            var total = w * h;
            var blob = await ZT.encodeCanvas(out, 'png');

            return [
                ZT.dataResult([
                    { label: 'Image A', value: ctx.files[0].name + '  (' + sizeA.width + '×' + sizeA.height + ')' },
                    { label: 'Image B', value: ctx.files[1].name + '  (' + sizeB.width + '×' + sizeB.height + ')' },
                    { label: 'Compared at', value: w + '×' + h },
                    { label: 'Changed pixels', value: ZT.formatNumber(changed) + '  (' + (changed / total * 100).toFixed(2) + '%)' },
                    { label: 'Verdict', value: changed === 0 ? 'Identical within the threshold' : 'Differences found' }
                ], { title: 'Comparison', columns: 2 }),
                ZT.fileResult(blob, 'difference.png', { previewBlob: blob })
            ];
        }
    });


    /* ============================================================
       Background remover (colour-based)
       ============================================================ */
    define({
        id: 'background-remover',
        name: 'Background Remover',
        category: 'image',
        icon: 'eraser',
        description: 'Remove a plain or uniform background and save a transparent PNG.',
        tags: ['background', 'remove background', 'transparent', 'cutout', 'product photo', 'png'],
        input: 'files',
        accept: IMAGE_ACCEPT,
        popular: true,
        options: [
            {
                id: 'mode', type: 'radio', label: 'Pick the background by', value: 'corners',
                options: [
                    { value: 'corners', label: 'Sampling the corners' },
                    { value: 'color', label: 'A colour I choose' }
                ]
            },
            { id: 'target', type: 'color', label: 'Background colour', value: '#FFFFFF', when: function (o) { return o.mode === 'color'; } },
            { id: 'tolerance', type: 'range', label: 'Tolerance', value: 12, min: 1, max: 80, step: 1, suffix: '%', help: 'How different from the background a pixel may be and still be removed. Raise it for photos with shadows or gradients.' },
            { id: 'feather', type: 'range', label: 'Edge softness', value: 2, min: 0, max: 10, step: 1, suffix: 'px', help: 'Softens the cut so edges do not look jagged.' },
            { id: 'contiguous', type: 'checkbox', label: 'Only remove background connected to the edges', value: true, help: 'Keeps matching colours inside the subject — the white of an eye, for example.' },
            { id: 'despeckle', type: 'checkbox', label: 'Clean up stray leftover pixels', value: true },
            { id: 'note', type: 'note', text: 'This works by colour, so it excels at product shots, logos, scanned signatures and anything on a plain backdrop. It is not an AI cut-out and will struggle with a busy background behind hair or fur.' }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            return processEach(ctx, async function (bitmap, file) {
                var size = ZT.imageSize(bitmap);
                var canvas = ZT.drawToCanvas(bitmap);
                var c2d = canvas.getContext('2d');
                var img = c2d.getImageData(0, 0, size.width, size.height);
                var data = img.data;
                var w = size.width, h = size.height;

                // Establish the background colour.
                var bg;
                if (o.mode === 'color') {
                    var parsed = ZT.color.parse(o.target);
                    if (!parsed) ZT.fail('That background colour is not valid.');
                    bg = [parsed[0], parsed[1], parsed[2]];
                } else {
                    bg = averageCorners(data, w, h);
                }

                // Tolerance is a percentage of the maximum possible RGB distance.
                var maxDistance = Math.sqrt(3 * 255 * 255);
                var cutoff = maxDistance * (o.tolerance / 100);

                function isBackground(index) {
                    var dr = data[index] - bg[0];
                    var dg = data[index + 1] - bg[1];
                    var db = data[index + 2] - bg[2];
                    return Math.sqrt(dr * dr + dg * dg + db * db) <= cutoff;
                }

                var remove = new Uint8Array(w * h);

                if (o.contiguous) {
                    // Flood fill inward from every edge pixel, so a matching
                    // colour enclosed by the subject is left alone.
                    var queue = [];
                    for (var x = 0; x < w; x++) { queue.push(x); queue.push((h - 1) * w + x); }
                    for (var y = 0; y < h; y++) { queue.push(y * w); queue.push(y * w + w - 1); }

                    var visited = new Uint8Array(w * h);
                    while (queue.length) {
                        var p = queue.pop();
                        if (visited[p]) continue;
                        visited[p] = 1;
                        if (!isBackground(p * 4)) continue;
                        remove[p] = 1;

                        var px = p % w, py = (p / w) | 0;
                        if (px > 0) queue.push(p - 1);
                        if (px < w - 1) queue.push(p + 1);
                        if (py > 0) queue.push(p - w);
                        if (py < h - 1) queue.push(p + w);
                    }
                } else {
                    for (var i = 0; i < w * h; i++) {
                        if (isBackground(i * 4)) remove[i] = 1;
                    }
                }

                if (o.despeckle) removeSpecks(remove, w, h);

                // Apply, with a soft edge so the cut does not look cut out.
                for (i = 0; i < w * h; i++) {
                    if (!remove[i]) continue;
                    data[i * 4 + 3] = 0;
                }

                if (o.feather > 0) featherAlpha(data, remove, w, h, o.feather);

                c2d.putImageData(img, 0, 0);

                var removed = 0;
                for (i = 0; i < remove.length; i++) if (remove[i]) removed++;

                // Transparency means PNG; JPEG would flatten it straight back.
                var blob = await ZT.encodeCanvas(canvas, 'png');
                return ZT.fileResult(blob, ZT.outName(file.name, 'no-bg', 'png'), {
                    previewBlob: blob,
                    note: Math.round(removed / (w * h) * 100) + '% of the image removed  ·  ' + ZT.formatBytes(blob.size)
                });
            }, { zipName: 'background-removed' });
        }
    });

    /** Average the four corners — on a plain backdrop they are the background. */
    function averageCorners(data, w, h) {
        var patch = Math.max(2, Math.floor(Math.min(w, h) * 0.02));
        var r = 0, g = 0, b = 0, n = 0;

        function sample(x0, y0) {
            for (var y = y0; y < y0 + patch && y < h; y++) {
                for (var x = x0; x < x0 + patch && x < w; x++) {
                    var i = (y * w + x) * 4;
                    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
                }
            }
        }

        sample(0, 0);
        sample(w - patch, 0);
        sample(0, h - patch);
        sample(w - patch, h - patch);

        return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
    }

    /** Drop isolated flags that survive as confetti over the subject. */
    function removeSpecks(mask, w, h) {
        var copy = mask.slice();
        for (var y = 1; y < h - 1; y++) {
            for (var x = 1; x < w - 1; x++) {
                var i = y * w + x;
                var neighbours = copy[i - 1] + copy[i + 1] + copy[i - w] + copy[i + w];
                if (copy[i] && neighbours <= 1) mask[i] = 0;
                else if (!copy[i] && neighbours >= 4) mask[i] = 1;
            }
        }
    }

    /** Ramp alpha near the cut so edges read as soft rather than aliased. */
    function featherAlpha(data, mask, w, h, radius) {
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var i = y * w + x;
                if (mask[i]) continue;

                // Distance to the nearest removed pixel, capped at the radius.
                var nearest = radius + 1;
                for (var dy = -radius; dy <= radius && nearest > 0; dy++) {
                    var yy = y + dy;
                    if (yy < 0 || yy >= h) continue;
                    for (var dx = -radius; dx <= radius; dx++) {
                        var xx = x + dx;
                        if (xx < 0 || xx >= w) continue;
                        if (!mask[yy * w + xx]) continue;
                        var d = Math.sqrt(dx * dx + dy * dy);
                        if (d < nearest) nearest = d;
                    }
                }
                if (nearest <= radius) {
                    data[i * 4 + 3] = Math.round(255 * (nearest / (radius + 1)));
                }
            }
        }
    }

    /* ============================================================
       Upscaler
       ============================================================ */
    define({
        id: 'image-upscaler',
        name: 'Image Upscaler',
        category: 'image',
        icon: 'maximize-2',
        description: 'Enlarge an image with smooth resampling and edge sharpening.',
        tags: ['upscale', 'enlarge', 'resize up', 'bigger', 'resolution', 'sharpen'],
        input: 'files',
        accept: IMAGE_ACCEPT,
        options: [
            {
                id: 'scale', type: 'select', label: 'Enlarge by', value: '2',
                options: [
                    { value: '1.5', label: '1.5×' }, { value: '2', label: '2×' },
                    { value: '3', label: '3×' }, { value: '4', label: '4×' },
                    { value: 'custom', label: 'A specific width…' }
                ]
            },
            { id: 'target-width', type: 'number', label: 'Target width', suffix: 'px', value: 2000, min: 16, max: 12000, when: function (o) { return o.scale === 'custom'; } },
            { id: 'sharpen', type: 'range', label: 'Sharpening', value: 35, min: 0, max: 100, step: 5, suffix: '%', help: 'Enlarging softens detail; this restores apparent crispness at the edges.' },
            { id: 'denoise', type: 'checkbox', label: 'Smooth compression noise first', value: false, help: 'Helps with small JPEGs, which magnify their own artefacts when enlarged.' },
            FORMAT_OPTION, QUALITY_OPTION,
            { id: 'note', type: 'note', text: 'This resamples in careful steps rather than inventing detail — it is not an AI super-resolution model. Expect a clean, smooth enlargement, not new information that was never in the original.' }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            return processEach(ctx, async function (bitmap, file) {
                var size = ZT.imageSize(bitmap);
                var targetW = o.scale === 'custom'
                    ? o.targetWidth
                    : Math.round(size.width * parseFloat(o.scale));
                var targetH = Math.round(size.height * (targetW / size.width));

                if (targetW * targetH > 60e6) {
                    ZT.fail('That would produce a ' + Math.round(targetW * targetH / 1e6) + ' megapixel image. Choose a smaller scale.');
                }

                var source = ZT.drawToCanvas(bitmap);
                if (o.denoise) source = blurCanvas(source, 0.6);

                /* Enlarging in repeated small steps beats one big jump: each
                   pass interpolates from an already-smooth image, so ringing
                   and blockiness do not compound. */
                var canvas = source;
                var currentW = size.width, currentH = size.height;
                while (currentW < targetW) {
                    var nextW = Math.min(targetW, Math.round(currentW * 1.6));
                    var nextH = Math.round(nextW * (size.height / size.width));
                    var step = ZT.makeCanvas(nextW, nextH);
                    var sctx = step.getContext('2d');
                    sctx.imageSmoothingEnabled = true;
                    sctx.imageSmoothingQuality = 'high';
                    sctx.drawImage(canvas, 0, 0, nextW, nextH);
                    canvas = step;
                    currentW = nextW; currentH = nextH;
                }

                if (currentW !== targetW || currentH !== targetH) {
                    var exact = ZT.makeCanvas(targetW, targetH);
                    var ectx = exact.getContext('2d');
                    ectx.imageSmoothingQuality = 'high';
                    ectx.drawImage(canvas, 0, 0, targetW, targetH);
                    canvas = exact;
                }

                if (o.sharpen > 0) canvas = unsharpMask(canvas, o.sharpen / 100);

                if (o.format === 'jpeg') canvas = ZT.flattenAlpha(canvas, '#ffffff');
                var blob = await ZT.encodeCanvas(canvas, o.format, o.format === 'png' ? undefined : o.quality / 100);

                return ZT.fileResult(blob, ZT.outName(file.name, 'upscaled', o.format === 'jpeg' ? 'jpg' : o.format), {
                    previewBlob: blob,
                    note: size.width + '×' + size.height + ' → ' + targetW + '×' + targetH + '  ·  ' + ZT.formatBytes(blob.size)
                });
            }, { zipName: 'upscaled-images' });
        }
    });

    function blurCanvas(canvas, radius) {
        var out = ZT.makeCanvas(canvas.width, canvas.height);
        var c2d = out.getContext('2d');
        c2d.filter = 'blur(' + radius + 'px)';
        c2d.drawImage(canvas, 0, 0);
        return out;
    }

    /**
     * Unsharp mask: subtract a blurred copy from the original to lift edge
     * contrast. The standard way to make a resampled image look crisp again.
     */
    function unsharpMask(canvas, amount) {
        var w = canvas.width, h = canvas.height;
        var sharp = canvas.getContext('2d').getImageData(0, 0, w, h);
        var blurred = blurCanvas(canvas, 1).getContext('2d').getImageData(0, 0, w, h);

        var a = sharp.data, b = blurred.data;
        for (var i = 0; i < a.length; i += 4) {
            for (var c = 0; c < 3; c++) {
                var detail = a[i + c] - b[i + c];
                a[i + c] = ZT.clamp(a[i + c] + detail * amount * 1.6, 0, 255);
            }
        }

        var out = ZT.makeCanvas(w, h);
        out.getContext('2d').putImageData(sharp, 0, 0);
        return out;
    }

})();
