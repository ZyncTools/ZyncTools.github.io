/**
 * ZyncTools — CSS & design generators
 * Each tool renders a live preview alongside copy-ready CSS.
 */
(function () {
    'use strict';

    var ZT = window.ZT;
    var define = ZT.registry.define;

    /** Build a preview box the tool can style however it likes. */
    function previewBox(styles, content, className) {
        var box = ZT.el('div', { class: 'zt-css-preview ' + (className || '') });
        var inner = ZT.el('div', { class: 'zt-css-preview__target' }, content || 'Preview');
        Object.assign(inner.style, styles);
        box.appendChild(inner);
        return box;
    }

    function withAlpha(hex, alphaPercent) {
        var rgb = ZT.color.parse(hex) || [0, 0, 0, 1];
        return 'rgba(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ', ' + (alphaPercent / 100).toFixed(2) + ')';
    }

    /* ============================================================
       Box shadow
       ============================================================ */
    define({
        id: 'box-shadow-generator',
        name: 'Box Shadow Generator',
        category: 'design',
        icon: 'square',
        description: 'Design CSS box shadows visually and copy the rule.',
        tags: ['css', 'shadow', 'box-shadow', 'elevation', 'depth'],
        input: 'none',
        popular: true,
        options: [
            { id: 'offset-x', type: 'range', label: 'Horizontal offset', value: 0, min: -100, max: 100, step: 1, suffix: 'px' },
            { id: 'offset-y', type: 'range', label: 'Vertical offset', value: 8, min: -100, max: 100, step: 1, suffix: 'px' },
            { id: 'blur', type: 'range', label: 'Blur radius', value: 24, min: 0, max: 200, step: 1, suffix: 'px' },
            { id: 'spread', type: 'range', label: 'Spread', value: -4, min: -100, max: 100, step: 1, suffix: 'px' },
            { id: 'color', type: 'color', label: 'Shadow colour', value: '#0F172A' },
            { id: 'opacity', type: 'range', label: 'Shadow opacity', value: 18, min: 0, max: 100, step: 1, suffix: '%' },
            { id: 'inset', type: 'checkbox', label: 'Inset (shadow inside the element)', value: false },
            { id: 'layered', type: 'checkbox', label: 'Add a subtle second layer for realism', value: true },
            { id: 'preview-bg', type: 'color', label: 'Preview background', value: '#F1F5F9' },
            { id: 'preview-color', type: 'color', label: 'Preview element colour', value: '#FFFFFF' },
            { id: 'radius', type: 'range', label: 'Preview corner radius', value: 16, min: 0, max: 100, step: 1, suffix: 'px' }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var main = (o.inset ? 'inset ' : '') + o.offsetX + 'px ' + o.offsetY + 'px ' +
                o.blur + 'px ' + o.spread + 'px ' + withAlpha(o.color, o.opacity);

            var value = main;
            if (o.layered) {
                // A tight second shadow reads as contact shadow and sells the depth.
                var second = (o.inset ? 'inset ' : '') +
                    Math.round(o.offsetX / 2) + 'px ' + Math.round(o.offsetY / 3) + 'px ' +
                    Math.round(o.blur / 3) + 'px ' + Math.round(o.spread / 2) + 'px ' +
                    withAlpha(o.color, Math.max(2, o.opacity * 0.6));
                value = main + ',\n            ' + second;
            }

            var css = 'box-shadow: ' + value + ';';
            var preview = previewBox({
                boxShadow: value.replace(/\n\s+/g, ' '),
                background: o.previewColor,
                borderRadius: o.radius + 'px',
                width: '190px',
                height: '120px'
            });
            preview.style.background = o.previewBg;

            return [
                ZT.nodeResult(preview, { title: 'Preview' }),
                ZT.textResult(css, { lang: 'css', title: 'CSS' })
            ];
        }
    });

    /* ============================================================
       Text shadow
       ============================================================ */
    define({
        id: 'text-shadow-generator',
        name: 'Text Shadow Generator',
        category: 'design',
        icon: 'type',
        description: 'Create CSS text shadows, glows and outlines with a live preview.',
        tags: ['css', 'text-shadow', 'glow', 'outline', 'typography'],
        input: 'none',
        options: [
            { id: 'text', type: 'text', label: 'Preview text', value: 'ZyncTools' },
            {
                id: 'preset', type: 'select', label: 'Preset', value: 'custom',
                options: [
                    { value: 'custom', label: 'Custom (use sliders)' },
                    { value: 'soft', label: 'Soft drop shadow' },
                    { value: 'glow', label: 'Neon glow' },
                    { value: 'outline', label: 'Outline' },
                    { value: 'emboss', label: 'Emboss' },
                    { value: 'retro', label: 'Retro 3D' }
                ]
            },
            { id: 'offset-x', type: 'range', label: 'Horizontal offset', value: 2, min: -40, max: 40, step: 1, suffix: 'px', when: isCustomPreset },
            { id: 'offset-y', type: 'range', label: 'Vertical offset', value: 2, min: -40, max: 40, step: 1, suffix: 'px', when: isCustomPreset },
            { id: 'blur', type: 'range', label: 'Blur', value: 6, min: 0, max: 60, step: 1, suffix: 'px', when: isCustomPreset },
            { id: 'color', type: 'color', label: 'Shadow colour', value: '#000000' },
            { id: 'opacity', type: 'range', label: 'Opacity', value: 45, min: 0, max: 100, step: 1, suffix: '%', when: isCustomPreset },
            { id: 'font-size', type: 'range', label: 'Font size', value: 56, min: 12, max: 160, step: 1, suffix: 'px' },
            { id: 'text-color', type: 'color', label: 'Text colour', value: '#FFFFFF' },
            { id: 'preview-bg', type: 'color', label: 'Background', value: '#111827' }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var c = o.color;
            var value;

            switch (o.preset) {
                case 'soft': value = '0 2px 6px ' + withAlpha(c, 40); break;
                case 'glow': value = '0 0 6px ' + c + ', 0 0 18px ' + c + ', 0 0 42px ' + c; break;
                case 'outline': value = '-1px -1px 0 ' + c + ', 1px -1px 0 ' + c + ', -1px 1px 0 ' + c + ', 1px 1px 0 ' + c; break;
                case 'emboss': value = '1px 1px 0 ' + withAlpha('#ffffff', 55) + ', -1px -1px 0 ' + withAlpha(c, 55); break;
                case 'retro': value = '1px 1px 0 ' + c + ', 2px 2px 0 ' + c + ', 3px 3px 0 ' + c + ', 4px 4px 0 ' + c + ', 5px 5px 0 ' + withAlpha(c, 60); break;
                default: value = o.offsetX + 'px ' + o.offsetY + 'px ' + o.blur + 'px ' + withAlpha(c, o.opacity);
            }

            var preview = previewBox({
                textShadow: value,
                color: o.textColor,
                fontSize: o.fontSize + 'px',
                fontWeight: '800',
                letterSpacing: '-0.02em',
                background: 'transparent',
                padding: '8px 16px'
            }, o.text || 'Preview');
            preview.style.background = o.previewBg;

            return [
                ZT.nodeResult(preview, { title: 'Preview' }),
                ZT.textResult('text-shadow: ' + value + ';', { lang: 'css', title: 'CSS' })
            ];
        }
    });

    function isCustomPreset(o) { return o.preset === 'custom'; }

    /* ============================================================
       Gradient
       ============================================================ */
    define({
        id: 'gradient-generator',
        name: 'CSS Gradient Generator',
        category: 'design',
        icon: 'blend',
        description: 'Build linear, radial and conic gradients with up to five colour stops.',
        tags: ['css', 'gradient', 'linear', 'radial', 'conic', 'background'],
        input: 'none',
        popular: true,
        options: [
            {
                id: 'type', type: 'select', label: 'Gradient type', value: 'linear',
                options: [
                    { value: 'linear', label: 'Linear' },
                    { value: 'radial', label: 'Radial' },
                    { value: 'conic', label: 'Conic' }
                ]
            },
            { id: 'angle', type: 'range', label: 'Angle', value: 135, min: 0, max: 360, step: 1, suffix: '°', when: function (o) { return o.type !== 'radial'; } },
            {
                id: 'shape', type: 'select', label: 'Shape', value: 'circle',
                options: [{ value: 'circle', label: 'Circle' }, { value: 'ellipse', label: 'Ellipse' }],
                when: function (o) { return o.type === 'radial'; }
            },
            {
                id: 'position', type: 'select', label: 'Centre position', value: 'center',
                options: [
                    { value: 'center', label: 'Centre' }, { value: 'top left', label: 'Top left' },
                    { value: 'top', label: 'Top' }, { value: 'top right', label: 'Top right' },
                    { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' },
                    { value: 'bottom left', label: 'Bottom left' }, { value: 'bottom', label: 'Bottom' },
                    { value: 'bottom right', label: 'Bottom right' }
                ],
                when: function (o) { return o.type !== 'linear'; }
            },
            { id: 'stops', type: 'range', label: 'Number of colours', value: 2, min: 2, max: 5, step: 1 },
            { id: 'color1', type: 'color', label: 'Colour 1', value: '#6366F1' },
            { id: 'pos1', type: 'range', label: 'Position 1', value: 0, min: 0, max: 100, step: 1, suffix: '%' },
            { id: 'color2', type: 'color', label: 'Colour 2', value: '#EC4899' },
            { id: 'pos2', type: 'range', label: 'Position 2', value: 100, min: 0, max: 100, step: 1, suffix: '%' },
            { id: 'color3', type: 'color', label: 'Colour 3', value: '#F59E0B', when: function (o) { return o.stops >= 3; } },
            { id: 'pos3', type: 'range', label: 'Position 3', value: 50, min: 0, max: 100, step: 1, suffix: '%', when: function (o) { return o.stops >= 3; } },
            { id: 'color4', type: 'color', label: 'Colour 4', value: '#10B981', when: function (o) { return o.stops >= 4; } },
            { id: 'pos4', type: 'range', label: 'Position 4', value: 75, min: 0, max: 100, step: 1, suffix: '%', when: function (o) { return o.stops >= 4; } },
            { id: 'color5', type: 'color', label: 'Colour 5', value: '#3B82F6', when: function (o) { return o.stops >= 5; } },
            { id: 'pos5', type: 'range', label: 'Position 5', value: 90, min: 0, max: 100, step: 1, suffix: '%', when: function (o) { return o.stops >= 5; } },
            { id: 'include-fallback', type: 'checkbox', label: 'Include a flat-colour fallback', value: false }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var stops = [];
            for (var i = 1; i <= o.stops; i++) {
                stops.push({ color: o['color' + i], pos: o['pos' + i] });
            }
            // Sort by position so out-of-order sliders still produce valid CSS.
            stops.sort(function (a, b) { return a.pos - b.pos; });
            var stopText = stops.map(function (s) { return s.color + ' ' + s.pos + '%'; }).join(', ');

            var value;
            if (o.type === 'linear') value = 'linear-gradient(' + o.angle + 'deg, ' + stopText + ')';
            else if (o.type === 'radial') value = 'radial-gradient(' + o.shape + ' at ' + o.position + ', ' + stopText + ')';
            else value = 'conic-gradient(from ' + o.angle + 'deg at ' + o.position + ', ' + stopText + ')';

            var css = (o.includeFallback ? 'background-color: ' + stops[0].color + ';\n' : '') + 'background: ' + value + ';';

            var preview = previewBox({
                background: value,
                width: '100%',
                height: '190px',
                borderRadius: '12px'
            }, '');
            preview.classList.add('zt-css-preview--full');

            return [
                ZT.nodeResult(preview, { title: 'Preview' }),
                ZT.textResult(css, { lang: 'css', title: 'CSS' })
            ];
        }
    });

    /* ============================================================
       Border radius
       ============================================================ */
    define({
        id: 'border-radius-generator',
        name: 'Border Radius Generator',
        category: 'design',
        icon: 'squircle',
        description: 'Shape corners individually, including organic blob shapes.',
        tags: ['css', 'border-radius', 'rounded', 'corners', 'blob'],
        input: 'none',
        options: [
            { id: 'linked', type: 'checkbox', label: 'Same radius on every corner', value: true },
            { id: 'all', type: 'range', label: 'Radius', value: 16, min: 0, max: 200, step: 1, suffix: 'px', when: function (o) { return o.linked; } },
            { id: 'top-left', type: 'range', label: 'Top left', value: 16, min: 0, max: 200, step: 1, suffix: 'px', when: notLinked },
            { id: 'top-right', type: 'range', label: 'Top right', value: 16, min: 0, max: 200, step: 1, suffix: 'px', when: notLinked },
            { id: 'bottom-right', type: 'range', label: 'Bottom right', value: 16, min: 0, max: 200, step: 1, suffix: 'px', when: notLinked },
            { id: 'bottom-left', type: 'range', label: 'Bottom left', value: 16, min: 0, max: 200, step: 1, suffix: 'px', when: notLinked },
            {
                id: 'unit', type: 'select', label: 'Unit', value: 'px',
                options: [{ value: 'px', label: 'px' }, { value: '%', label: '%' }, { value: 'rem', label: 'rem' }]
            },
            { id: 'color', type: 'color', label: 'Preview colour', value: '#6366F1' }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var unit = o.unit;
            var value = o.linked
                ? o.all + unit
                : [o.topLeft, o.topRight, o.bottomRight, o.bottomLeft].map(function (v) { return v + unit; }).join(' ');

            var preview = previewBox({
                borderRadius: value,
                background: o.color,
                width: '170px',
                height: '170px'
            }, '');

            return [
                ZT.nodeResult(preview, { title: 'Preview' }),
                ZT.textResult('border-radius: ' + value + ';', { lang: 'css', title: 'CSS' })
            ];
        }
    });

    function notLinked(o) { return !o.linked; }

    /* ============================================================
       Flexbox
       ============================================================ */
    define({
        id: 'flexbox-generator',
        name: 'Flexbox Generator',
        category: 'design',
        icon: 'layout-dashboard',
        description: 'Experiment with flex properties and see the layout change instantly.',
        tags: ['css', 'flexbox', 'flex', 'layout', 'align', 'justify'],
        input: 'none',
        options: [
            { id: 'items', type: 'range', label: 'Number of items', value: 4, min: 1, max: 12, step: 1 },
            {
                id: 'direction', type: 'select', label: 'flex-direction', value: 'row',
                options: [
                    { value: 'row', label: 'row' }, { value: 'row-reverse', label: 'row-reverse' },
                    { value: 'column', label: 'column' }, { value: 'column-reverse', label: 'column-reverse' }
                ]
            },
            {
                id: 'justify', type: 'select', label: 'justify-content', value: 'flex-start',
                options: [
                    { value: 'flex-start', label: 'flex-start' }, { value: 'flex-end', label: 'flex-end' },
                    { value: 'center', label: 'center' }, { value: 'space-between', label: 'space-between' },
                    { value: 'space-around', label: 'space-around' }, { value: 'space-evenly', label: 'space-evenly' }
                ]
            },
            {
                id: 'align', type: 'select', label: 'align-items', value: 'stretch',
                options: [
                    { value: 'stretch', label: 'stretch' }, { value: 'flex-start', label: 'flex-start' },
                    { value: 'flex-end', label: 'flex-end' }, { value: 'center', label: 'center' },
                    { value: 'baseline', label: 'baseline' }
                ]
            },
            {
                id: 'wrap', type: 'select', label: 'flex-wrap', value: 'nowrap',
                options: [
                    { value: 'nowrap', label: 'nowrap' }, { value: 'wrap', label: 'wrap' }, { value: 'wrap-reverse', label: 'wrap-reverse' }
                ]
            },
            { id: 'gap', type: 'range', label: 'gap', value: 12, min: 0, max: 60, step: 1, suffix: 'px' },
            { id: 'color', type: 'color', label: 'Item colour', value: '#6366F1' }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var container = ZT.el('div', { class: 'zt-flex-demo' });
            Object.assign(container.style, {
                display: 'flex',
                flexDirection: o.direction,
                justifyContent: o.justify,
                alignItems: o.align,
                flexWrap: o.wrap,
                gap: o.gap + 'px'
            });

            for (var i = 1; i <= o.items; i++) {
                var item = ZT.el('div', { class: 'zt-flex-demo__item', text: String(i) });
                item.style.background = o.color;
                // Varying heights make align-items differences visible.
                item.style.height = (o.align === 'stretch' ? '' : (40 + (i % 3) * 22) + 'px');
                container.appendChild(item);
            }

            var css = '.container {\n' +
                '  display: flex;\n' +
                '  flex-direction: ' + o.direction + ';\n' +
                '  justify-content: ' + o.justify + ';\n' +
                '  align-items: ' + o.align + ';\n' +
                '  flex-wrap: ' + o.wrap + ';\n' +
                '  gap: ' + o.gap + 'px;\n' +
                '}';

            return [
                ZT.nodeResult(container, { title: 'Preview' }),
                ZT.textResult(css, { lang: 'css', title: 'CSS' })
            ];
        }
    });

    /* ============================================================
       Grid
       ============================================================ */
    define({
        id: 'grid-generator',
        name: 'CSS Grid Generator',
        category: 'design',
        icon: 'layout-grid',
        description: 'Lay out CSS Grid templates and copy the generated rules.',
        tags: ['css', 'grid', 'layout', 'template', 'columns', 'rows'],
        input: 'none',
        options: [
            { id: 'columns', type: 'range', label: 'Columns', value: 3, min: 1, max: 12, step: 1 },
            { id: 'rows', type: 'range', label: 'Rows', value: 3, min: 1, max: 12, step: 1 },
            {
                id: 'column-mode', type: 'select', label: 'Column sizing', value: 'fr',
                options: [
                    { value: 'fr', label: 'Equal fractions (1fr)' },
                    { value: 'auto-fit', label: 'Responsive auto-fit' },
                    { value: 'auto', label: 'Size to content (auto)' },
                    { value: 'custom', label: 'Custom template' }
                ]
            },
            { id: 'min-width', type: 'number', label: 'Minimum column width', suffix: 'px', value: 200, min: 40, max: 800, when: function (o) { return o.columnMode === 'auto-fit'; } },
            { id: 'custom-columns', type: 'text', label: 'grid-template-columns', value: '1fr 2fr 1fr', when: function (o) { return o.columnMode === 'custom'; } },
            { id: 'gap', type: 'range', label: 'Gap', value: 12, min: 0, max: 60, step: 1, suffix: 'px' },
            { id: 'row-gap-separate', type: 'checkbox', label: 'Different row gap', value: false },
            { id: 'row-gap', type: 'range', label: 'Row gap', value: 12, min: 0, max: 60, step: 1, suffix: 'px', when: function (o) { return o.rowGapSeparate; } },
            { id: 'color', type: 'color', label: 'Cell colour', value: '#10B981' }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var template;
            switch (o.columnMode) {
                case 'auto-fit': template = 'repeat(auto-fit, minmax(' + o.minWidth + 'px, 1fr))'; break;
                case 'auto': template = 'repeat(' + o.columns + ', auto)'; break;
                case 'custom': template = o.customColumns; break;
                default: template = 'repeat(' + o.columns + ', 1fr)';
            }

            var gapCss = o.rowGapSeparate ? o.rowGap + 'px ' + o.gap + 'px' : o.gap + 'px';

            var container = ZT.el('div', { class: 'zt-grid-demo' });
            Object.assign(container.style, {
                display: 'grid',
                gridTemplateColumns: template,
                gap: gapCss
            });

            var cells = o.columnMode === 'auto-fit' ? o.columns * o.rows : o.columns * o.rows;
            for (var i = 1; i <= Math.min(cells, 60); i++) {
                var cell = ZT.el('div', { class: 'zt-grid-demo__cell', text: String(i) });
                cell.style.background = o.color;
                container.appendChild(cell);
            }

            var css = '.grid {\n' +
                '  display: grid;\n' +
                '  grid-template-columns: ' + template + ';\n' +
                (o.columnMode !== 'auto-fit' ? '  grid-template-rows: repeat(' + o.rows + ', auto);\n' : '') +
                '  gap: ' + gapCss + ';\n' +
                '}';

            return [
                ZT.nodeResult(container, { title: 'Preview' }),
                ZT.textResult(css, { lang: 'css', title: 'CSS' })
            ];
        }
    });

    /* ============================================================
       Glassmorphism
       ============================================================ */
    define({
        id: 'glassmorphism-generator',
        name: 'Glassmorphism Generator',
        category: 'design',
        icon: 'layers',
        description: 'Create frosted-glass card effects with backdrop blur.',
        tags: ['css', 'glass', 'glassmorphism', 'blur', 'frosted', 'backdrop'],
        input: 'none',
        options: [
            { id: 'blur', type: 'range', label: 'Backdrop blur', value: 12, min: 0, max: 40, step: 0.5, suffix: 'px' },
            { id: 'transparency', type: 'range', label: 'Background opacity', value: 18, min: 0, max: 100, step: 1, suffix: '%' },
            { id: 'saturation', type: 'range', label: 'Saturation boost', value: 150, min: 100, max: 300, step: 5, suffix: '%' },
            { id: 'tint', type: 'color', label: 'Glass tint', value: '#FFFFFF' },
            { id: 'border-opacity', type: 'range', label: 'Border opacity', value: 30, min: 0, max: 100, step: 1, suffix: '%' },
            { id: 'radius', type: 'range', label: 'Corner radius', value: 16, min: 0, max: 60, step: 1, suffix: 'px' },
            { id: 'shadow', type: 'checkbox', label: 'Add a drop shadow', value: true },
            { id: 'bg-preview', type: 'color', label: 'Preview backdrop', value: '#6366F1' }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var background = withAlpha(o.tint, o.transparency);
            var border = withAlpha(o.tint, o.borderOpacity);
            var blur = 'blur(' + o.blur + 'px) saturate(' + o.saturation + '%)';

            var css = '.glass {\n' +
                '  background: ' + background + ';\n' +
                '  backdrop-filter: ' + blur + ';\n' +
                '  -webkit-backdrop-filter: ' + blur + ';\n' +
                '  border: 1px solid ' + border + ';\n' +
                '  border-radius: ' + o.radius + 'px;\n' +
                (o.shadow ? '  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);\n' : '') +
                '}';

            // A busy backdrop is the only way to actually see backdrop-filter working.
            var stage = ZT.el('div', { class: 'zt-glass-stage' });
            stage.style.background =
                'radial-gradient(circle at 20% 25%, ' + o.bgPreview + ' 0%, transparent 45%),' +
                'radial-gradient(circle at 78% 70%, #EC4899 0%, transparent 42%),' +
                'radial-gradient(circle at 55% 15%, #F59E0B 0%, transparent 38%), #1E293B';

            var card = ZT.el('div', { class: 'zt-glass-card', text: 'Frosted glass' });
            Object.assign(card.style, {
                background: background,
                backdropFilter: blur,
                webkitBackdropFilter: blur,
                border: '1px solid ' + border,
                borderRadius: o.radius + 'px',
                boxShadow: o.shadow ? '0 8px 32px rgba(0,0,0,0.18)' : 'none'
            });
            stage.appendChild(card);

            return [
                ZT.nodeResult(stage, { title: 'Preview' }),
                ZT.textResult(css, { lang: 'css', title: 'CSS' })
            ];
        }
    });

    /* ============================================================
       Clip path
       ============================================================ */
    define({
        id: 'clip-path-generator',
        name: 'Clip Path Generator',
        category: 'design',
        icon: 'pentagon',
        description: 'Cut elements into polygons, circles and custom shapes with clip-path.',
        tags: ['css', 'clip-path', 'shape', 'polygon', 'mask'],
        input: 'none',
        options: [
            {
                id: 'shape', type: 'select', label: 'Shape', value: 'triangle',
                options: [
                    { value: 'triangle', label: 'Triangle' }, { value: 'trapezoid', label: 'Trapezoid' },
                    { value: 'parallelogram', label: 'Parallelogram' }, { value: 'rhombus', label: 'Rhombus' },
                    { value: 'pentagon', label: 'Pentagon' }, { value: 'hexagon', label: 'Hexagon' },
                    { value: 'octagon', label: 'Octagon' }, { value: 'star', label: 'Star' },
                    { value: 'circle', label: 'Circle' }, { value: 'ellipse', label: 'Ellipse' },
                    { value: 'arrow', label: 'Arrow' }, { value: 'message', label: 'Speech bubble' },
                    { value: 'custom', label: 'Custom polygon' }
                ]
            },
            { id: 'custom-points', type: 'text', label: 'Custom points', value: '50% 0%, 100% 100%, 0% 100%', when: function (o) { return o.shape === 'custom'; }, help: 'Comma-separated x y pairs, each as a percentage.' },
            { id: 'size', type: 'range', label: 'Preview size', value: 200, min: 80, max: 340, step: 10, suffix: 'px' },
            { id: 'color', type: 'color', label: 'Fill colour', value: '#EC4899' },
            { id: 'use-image', type: 'checkbox', label: 'Preview on a gradient instead of flat colour', value: true }
        ],
        run: function (ctx) {
            var SHAPES = {
                triangle: 'polygon(50% 0%, 100% 100%, 0% 100%)',
                trapezoid: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
                parallelogram: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)',
                rhombus: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                pentagon: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
                hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                octagon: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                circle: 'circle(50% at 50% 50%)',
                ellipse: 'ellipse(35% 50% at 50% 50%)',
                arrow: 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)',
                message: 'polygon(0% 0%, 100% 0%, 100% 75%, 75% 75%, 75% 100%, 50% 75%, 0% 75%)'
            };

            var value = ctx.opt.shape === 'custom'
                ? 'polygon(' + ctx.opt.customPoints + ')'
                : SHAPES[ctx.opt.shape];

            var shape = ZT.el('div', { class: 'zt-clip-demo' });
            Object.assign(shape.style, {
                width: ctx.opt.size + 'px',
                height: ctx.opt.size + 'px',
                clipPath: value,
                webkitClipPath: value,
                background: ctx.opt.useImage
                    ? 'linear-gradient(135deg, ' + ctx.opt.color + ', #6366F1 55%, #06B6D4)'
                    : ctx.opt.color
            });

            var stage = ZT.el('div', { class: 'zt-css-preview zt-css-preview--center' }, shape);

            return [
                ZT.nodeResult(stage, { title: 'Preview' }),
                ZT.textResult('clip-path: ' + value + ';\n-webkit-clip-path: ' + value + ';', { lang: 'css', title: 'CSS' })
            ];
        }
    });

    /* ============================================================
       Cubic bezier / easing
       ============================================================ */
    define({
        id: 'easing-generator',
        name: 'CSS Easing & Animation',
        category: 'design',
        icon: 'activity',
        description: 'Pick a timing curve, watch it animate, and copy the transition rule.',
        tags: ['css', 'easing', 'cubic-bezier', 'animation', 'transition', 'timing'],
        input: 'none',
        options: [
            {
                id: 'preset', type: 'select', label: 'Easing preset', value: 'ease-out',
                options: [
                    { value: 'linear', label: 'linear' }, { value: 'ease', label: 'ease' },
                    { value: 'ease-in', label: 'ease-in' }, { value: 'ease-out', label: 'ease-out' },
                    { value: 'ease-in-out', label: 'ease-in-out' },
                    { value: 'back-out', label: 'Back out (overshoots)' },
                    { value: 'anticipate', label: 'Anticipate (pulls back first)' },
                    { value: 'smooth', label: 'Smooth (Material standard)' },
                    { value: 'custom', label: 'Custom cubic-bezier' }
                ]
            },
            { id: 'x1', type: 'range', label: 'P1 x', value: 0.25, min: 0, max: 1, step: 0.01, when: isCustomPreset },
            { id: 'y1', type: 'range', label: 'P1 y', value: 0.1, min: -1, max: 2, step: 0.01, when: isCustomPreset },
            { id: 'x2', type: 'range', label: 'P2 x', value: 0.25, min: 0, max: 1, step: 0.01, when: isCustomPreset },
            { id: 'y2', type: 'range', label: 'P2 y', value: 1, min: -1, max: 2, step: 0.01, when: isCustomPreset },
            { id: 'duration', type: 'range', label: 'Duration', value: 600, min: 100, max: 3000, step: 50, suffix: 'ms' },
            {
                id: 'property', type: 'select', label: 'Animate', value: 'transform',
                options: [
                    { value: 'transform', label: 'Position (transform)' },
                    { value: 'opacity', label: 'Fade (opacity)' },
                    { value: 'scale', label: 'Scale' },
                    { value: 'rotate', label: 'Rotation' }
                ]
            }
        ],
        run: function (ctx) {
            var PRESETS = {
                'back-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                anticipate: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
                smooth: 'cubic-bezier(0.4, 0, 0.2, 1)'
            };
            var o = ctx.opt;
            var easing = o.preset === 'custom'
                ? 'cubic-bezier(' + o.x1 + ', ' + o.y1 + ', ' + o.x2 + ', ' + o.y2 + ')'
                : (PRESETS[o.preset] || o.preset);

            var track = ZT.el('div', { class: 'zt-easing-track' });
            var ball = ZT.el('div', { class: 'zt-easing-ball' });
            track.appendChild(ball);

            var replay = ZT.el('button', {
                class: 'zt-btn zt-btn--ghost zt-btn--sm', type: 'button', text: 'Play again'
            });

            var stage = ZT.el('div', { class: 'zt-easing-stage' }, [track, replay]);

            function animate() {
                ball.style.transition = 'none';
                ball.style.transform = 'translateX(0)';
                ball.style.opacity = '1';
                // Force a reflow so the reset takes effect before the transition.
                void ball.offsetWidth;
                ball.style.transition = 'all ' + o.duration + 'ms ' + easing;
                if (o.property === 'opacity') ball.style.opacity = '0.15';
                else if (o.property === 'scale') ball.style.transform = 'translateX(calc(100% * 0)) scale(2.2)';
                else if (o.property === 'rotate') ball.style.transform = 'rotate(360deg)';
                else ball.style.transform = 'translateX(calc(100cqw - 100%))';
            }

            replay.addEventListener('click', animate);

            var css = '.element {\n' +
                '  transition: ' + (o.property === 'opacity' ? 'opacity' : 'transform') + ' ' + o.duration + 'ms ' + easing + ';\n' +
                '}';

            return [
                ZT.nodeResult(stage, { title: 'Preview', onMount: function () { setTimeout(animate, 120); } }),
                ZT.textResult(css, { lang: 'css', title: 'CSS' }),
                ZT.dataResult([
                    { label: 'Timing function', value: easing },
                    { label: 'Duration', value: o.duration + 'ms' }
                ], { title: 'Values', columns: 2, mono: true })
            ];
        }
    });

    /* ============================================================
       Colour palette builder
       ============================================================ */
    define({
        id: 'color-palette-generator',
        name: 'Colour Palette Generator',
        category: 'design',
        icon: 'swatch-book',
        description: 'Build harmonious palettes and tint scales from one base colour.',
        tags: ['palette', 'colors', 'scheme', 'complementary', 'triadic', 'theme'],
        input: 'none',
        popular: true,
        options: [
            { id: 'base', type: 'color', label: 'Base colour', value: '#6366F1' },
            {
                id: 'scheme', type: 'select', label: 'Harmony', value: 'analogous',
                options: [
                    { value: 'analogous', label: 'Analogous — neighbouring hues' },
                    { value: 'complementary', label: 'Complementary — opposite hue' },
                    { value: 'split', label: 'Split complementary' },
                    { value: 'triadic', label: 'Triadic — three even hues' },
                    { value: 'tetradic', label: 'Tetradic — four hues' },
                    { value: 'monochrome', label: 'Monochrome — one hue' },
                    { value: 'shades', label: 'Tint & shade scale' }
                ]
            },
            { id: 'count', type: 'range', label: 'Number of colours', value: 5, min: 3, max: 12, step: 1 },
            {
                id: 'format', type: 'select', label: 'Copyable output', value: 'css',
                options: [
                    { value: 'css', label: 'CSS custom properties' }, { value: 'hex', label: 'Plain HEX list' },
                    { value: 'scss', label: 'SCSS variables' }, { value: 'json', label: 'JSON' },
                    { value: 'tailwind', label: 'Tailwind config' }
                ]
            }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var rgb = ZT.color.parse(o.base);
            if (!rgb) ZT.fail('Pick a valid base colour.');
            var hsl = ZT.color.rgbToHsl(rgb[0], rgb[1], rgb[2]);
            var h = hsl[0], s = hsl[1], l = hsl[2];

            var colors = [];
            function push(hue, sat, light) {
                var c = ZT.color.hslToRgb(hue, ZT.clamp(sat, 0, 100), ZT.clamp(light, 0, 100));
                colors.push(ZT.color.toHex(c[0], c[1], c[2]).toUpperCase());
            }

            switch (o.scheme) {
                case 'complementary':
                    for (var i = 0; i < o.count; i++) {
                        push(i % 2 === 0 ? h : (h + 180) % 360, s, 30 + (i / Math.max(1, o.count - 1)) * 45);
                    }
                    break;
                case 'split':
                    [h, (h + 150) % 360, (h + 210) % 360].forEach(function (hue, idx) {
                        var per = Math.ceil(o.count / 3);
                        for (var j = 0; j < per && colors.length < o.count; j++) {
                            push(hue, s, 40 + j * 15);
                        }
                    });
                    break;
                case 'triadic':
                    for (i = 0; i < o.count; i++) push((h + (i % 3) * 120) % 360, s, 35 + Math.floor(i / 3) * 18);
                    break;
                case 'tetradic':
                    for (i = 0; i < o.count; i++) push((h + (i % 4) * 90) % 360, s, 38 + Math.floor(i / 4) * 16);
                    break;
                case 'monochrome':
                    for (i = 0; i < o.count; i++) push(h, s, 92 - (i / Math.max(1, o.count - 1)) * 72);
                    break;
                case 'shades':
                    for (i = 0; i < o.count; i++) {
                        var t = i / Math.max(1, o.count - 1);
                        push(h, s * (0.6 + 0.5 * (1 - Math.abs(t - 0.5) * 2)), 95 - t * 82);
                    }
                    break;
                default: {
                    var spread = 60;
                    for (i = 0; i < o.count; i++) {
                        var offset = -spread / 2 + (spread * i / Math.max(1, o.count - 1));
                        push((h + offset + 360) % 360, s, l);
                    }
                }
            }

            var strip = ZT.el('div', { class: 'zt-swatch-row zt-swatch-row--large' });
            colors.forEach(function (hex) {
                var c = ZT.color.parse(hex);
                var lum = ZT.color.luminance(c[0], c[1], c[2]);
                strip.appendChild(ZT.el('button', {
                    class: 'zt-swatch zt-swatch--large', type: 'button',
                    style: { background: hex, color: lum > 0.4 ? '#111' : '#fff' },
                    title: 'Click to copy ' + hex, 'data-copy': hex
                }, ZT.el('span', { text: hex })));
            });

            var out;
            switch (o.format) {
                case 'hex': out = colors.join('\n'); break;
                case 'scss': out = colors.map(function (c, i) { return '$color-' + ((i + 1) * 100) + ': ' + c + ';'; }).join('\n'); break;
                case 'json': out = JSON.stringify(colors, null, 2); break;
                case 'tailwind':
                    out = 'colors: {\n  brand: {\n' +
                        colors.map(function (c, i) { return '    ' + ((i + 1) * 100) + ": '" + c + "',"; }).join('\n') +
                        '\n  }\n}';
                    break;
                default:
                    out = ':root {\n' + colors.map(function (c, i) { return '  --color-' + ((i + 1) * 100) + ': ' + c + ';'; }).join('\n') + '\n}';
            }

            return [
                ZT.nodeResult(strip, { title: 'Palette — click any swatch to copy' }),
                ZT.textResult(out, { lang: o.format === 'json' ? 'json' : 'css', title: 'Copyable palette' })
            ];
        }
    });

})();
