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


    /* ============================================================
       CSS unit converter
       ============================================================ */
    define({
        id: 'css-unit-converter',
        name: 'CSS Unit Converter',
        category: 'design',
        icon: 'ruler',
        description: 'Convert between px, rem, em, pt, %, vw and vh.',
        tags: ['css', 'px', 'rem', 'em', 'pt', 'unit', 'convert', 'responsive'],
        input: 'none',
        popular: true,
        options: [
            { id: 'value', type: 'number', label: 'Value', value: 16, step: 'any' },
            {
                id: 'from', type: 'select', label: 'From', value: 'px',
                options: [
                    { value: 'px', label: 'px — pixels' }, { value: 'rem', label: 'rem — root em' },
                    { value: 'em', label: 'em — parent-relative' }, { value: 'pt', label: 'pt — points' },
                    { value: 'percent', label: '% — percent' }, { value: 'vw', label: 'vw — viewport width' },
                    { value: 'vh', label: 'vh — viewport height' }
                ]
            },
            { id: 'root-size', type: 'number', label: 'Root font size', suffix: 'px', value: 16, min: 1, max: 100, help: 'The browser default is 16px. rem is measured against this.' },
            { id: 'parent-size', type: 'number', label: 'Parent font size', suffix: 'px', value: 16, min: 1, max: 200, help: 'Only affects em and %.' },
            { id: 'viewport-width', type: 'number', label: 'Viewport width', suffix: 'px', value: 1440, min: 200, max: 5000 },
            { id: 'viewport-height', type: 'number', label: 'Viewport height', suffix: 'px', value: 900, min: 200, max: 5000 },
            { id: 'precision', type: 'number', label: 'Decimal places', value: 4, min: 0, max: 8 }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var value = Number(o.value);
            if (!isFinite(value)) ZT.fail('Enter a number to convert.');

            // Normalise everything through pixels.
            var px;
            switch (o.from) {
                case 'rem': px = value * o.rootSize; break;
                case 'em': px = value * o.parentSize; break;
                case 'pt': px = value * 96 / 72; break;
                case 'percent': px = value / 100 * o.parentSize; break;
                case 'vw': px = value / 100 * o.viewportWidth; break;
                case 'vh': px = value / 100 * o.viewportHeight; break;
                default: px = value;
            }

            function fmt(n) {
                var fixed = n.toFixed(o.precision);
                return fixed.indexOf('.') !== -1 ? fixed.replace(/\.?0+$/, '') : fixed;
            }

            return [
                ZT.dataResult([
                    { label: 'px', value: fmt(px) + 'px' },
                    { label: 'rem', value: fmt(px / o.rootSize) + 'rem' },
                    { label: 'em', value: fmt(px / o.parentSize) + 'em' },
                    { label: 'pt', value: fmt(px * 72 / 96) + 'pt' },
                    { label: '%', value: fmt(px / o.parentSize * 100) + '%' },
                    { label: 'vw', value: fmt(px / o.viewportWidth * 100) + 'vw' },
                    { label: 'vh', value: fmt(px / o.viewportHeight * 100) + 'vh' }
                ], { title: value + (o.from === 'percent' ? '%' : o.from) + ' equals', columns: 2, mono: true }),
                ZT.dataResult([
                    { label: 'Which should I use?', value: 'rem for font sizes and spacing — it scales when a reader changes their browser font size, which px does not. Use px for borders and anything that should stay hairline-thin.' }
                ], { title: 'Guidance', columns: 1 })
            ];
        }
    });

    /* ============================================================
       Content-Security-Policy builder
       ============================================================ */
    define({
        id: 'csp-generator',
        name: 'Content Security Policy Generator',
        category: 'design',
        icon: 'shield',
        description: 'Build a Content-Security-Policy header with sensible defaults.',
        tags: ['csp', 'content security policy', 'header', 'security', 'xss', 'nginx', 'apache'],
        input: 'none',
        options: [
            {
                id: 'preset', type: 'select', label: 'Start from', value: 'strict',
                options: [
                    { value: 'strict', label: 'Strict — same origin only' },
                    { value: 'moderate', label: 'Moderate — allow common CDNs' },
                    { value: 'report-only', label: 'Report only — observe without blocking' },
                    { value: 'custom', label: 'Custom' }
                ]
            },
            { id: 'self-only', type: 'checkbox', label: "Default to 'self'", value: true, when: presetIsCustom2 },
            { id: 'script-src', type: 'text', label: 'Extra script sources', value: '', placeholder: 'https://cdn.jsdelivr.net' },
            { id: 'style-src', type: 'text', label: 'Extra style sources', value: '', placeholder: 'https://fonts.googleapis.com' },
            { id: 'font-src', type: 'text', label: 'Extra font sources', value: '', placeholder: 'https://fonts.gstatic.com' },
            { id: 'img-src', type: 'text', label: 'Extra image sources', value: '', placeholder: 'data: https:' },
            { id: 'connect-src', type: 'text', label: 'Extra connect sources', value: '', placeholder: 'https://api.example.com' },
            { id: 'allow-inline-style', type: 'checkbox', label: "Allow inline styles ('unsafe-inline')", value: false, help: 'Often needed in practice, but it weakens the policy against injected CSS.' },
            { id: 'allow-inline-script', type: 'checkbox', label: "Allow inline scripts ('unsafe-inline')", value: false, help: 'This defeats most of the XSS protection CSP provides. Prefer a nonce or a hash.' },
            { id: 'frame-ancestors', type: 'checkbox', label: "Block framing (clickjacking protection)", value: true },
            { id: 'upgrade-insecure', type: 'checkbox', label: 'Upgrade insecure requests to HTTPS', value: true },
            { id: 'report-uri', type: 'text', label: 'Report violations to', value: '', placeholder: 'https://example.com/csp-report' },
            {
                id: 'format', type: 'select', label: 'Output as', value: 'header',
                options: [
                    { value: 'header', label: 'Raw header value' },
                    { value: 'meta', label: 'HTML meta tag' },
                    { value: 'nginx', label: 'nginx config' },
                    { value: 'apache', label: 'Apache config' },
                    { value: 'netlify', label: 'Netlify _headers' }
                ]
            }
        ],
        run: function (ctx) {
            var o = ctx.opt;

            function sources(base, extra) {
                var list = base.slice();
                String(extra || '').split(/\s+/).filter(Boolean).forEach(function (s) { list.push(s); });
                return list;
            }

            var directives = [];
            var cdnDefaults = o.preset === 'moderate'
                ? ['https://cdn.jsdelivr.net', 'https://unpkg.com']
                : [];

            directives.push(['default-src', ["'self'"]]);

            var script = sources(["'self'"].concat(cdnDefaults), o.scriptSrc);
            if (o.allowInlineScript) script.push("'unsafe-inline'");
            directives.push(['script-src', script]);

            var style = sources(["'self'"].concat(o.preset === 'moderate' ? ['https://fonts.googleapis.com'] : []), o.styleSrc);
            if (o.allowInlineStyle) style.push("'unsafe-inline'");
            directives.push(['style-src', style]);

            directives.push(['img-src', sources(["'self'", 'data:'], o.imgSrc)]);
            directives.push(['font-src', sources(["'self'"].concat(o.preset === 'moderate' ? ['https://fonts.gstatic.com'] : []), o.fontSrc)]);
            directives.push(['connect-src', sources(["'self'"], o.connectSrc)]);
            directives.push(['object-src', ["'none'"]]);
            directives.push(['base-uri', ["'self'"]]);
            directives.push(['form-action', ["'self'"]]);

            if (o.frameAncestors) directives.push(['frame-ancestors', ["'none'"]]);
            if (o.upgradeInsecure) directives.push(['upgrade-insecure-requests', []]);
            if (o.reportUri) directives.push(['report-uri', [o.reportUri]]);

            var policy = directives.map(function (d) {
                return d[1].length ? d[0] + ' ' + d[1].join(' ') : d[0];
            }).join('; ');

            var headerName = o.preset === 'report-only'
                ? 'Content-Security-Policy-Report-Only'
                : 'Content-Security-Policy';

            var output;
            switch (o.format) {
                case 'meta':
                    output = '<meta http-equiv="' + headerName + '" content="' + policy + '">';
                    break;
                case 'nginx':
                    output = 'add_header ' + headerName + ' "' + policy.replace(/"/g, '\\"') + '" always;';
                    break;
                case 'apache':
                    output = 'Header always set ' + headerName + ' "' + policy.replace(/"/g, '\\"') + '"';
                    break;
                case 'netlify':
                    output = '/*\n  ' + headerName + ': ' + policy;
                    break;
                default:
                    output = headerName + ': ' + policy;
            }

            var warnings = [];
            if (o.allowInlineScript) {
                warnings.push({ label: 'Warning', value: "'unsafe-inline' on script-src removes most of what CSP protects against. If you can, move inline scripts to files or use a nonce." });
            }
            if (o.preset === 'report-only') {
                warnings.push({ label: 'Report-only mode', value: 'Nothing is blocked — violations are only reported. Run this way first to find what would break, then switch to the enforcing header.' });
            }

            return [
                ZT.textResult(output, { mono: true, lang: o.format === 'meta' ? 'html' : 'text', title: 'Policy' }),
                ZT.dataResult(directives.map(function (d) {
                    return { label: d[0], value: d[1].join(' ') || '(enabled)' };
                }).concat(warnings), { title: 'Directives', columns: 1, mono: true })
            ];
        }
    });

    function presetIsCustom2(o) { return o.preset === 'custom'; }

    /* ============================================================
       Media query generator
       ============================================================ */
    define({
        id: 'media-query-generator',
        name: 'Media Query Generator',
        category: 'design',
        icon: 'monitor',
        description: 'Generate responsive breakpoints for common device sizes and frameworks.',
        tags: ['media query', 'responsive', 'breakpoint', 'css', 'mobile', 'tailwind', 'bootstrap'],
        input: 'none',
        options: [
            {
                id: 'framework', type: 'select', label: 'Breakpoint set', value: 'tailwind',
                options: [
                    { value: 'tailwind', label: 'Tailwind CSS' },
                    { value: 'bootstrap', label: 'Bootstrap 5' },
                    { value: 'material', label: 'Material Design' },
                    { value: 'devices', label: 'Common devices' },
                    { value: 'custom', label: 'Custom breakpoints' }
                ]
            },
            { id: 'custom-breakpoints', type: 'text', label: 'Custom breakpoints', value: '480, 768, 1024, 1280', when: function (o) { return o.framework === 'custom'; }, help: 'Comma-separated widths in pixels.' },
            {
                id: 'approach', type: 'radio', label: 'Approach', value: 'mobile-first',
                options: [
                    { value: 'mobile-first', label: 'Mobile first (min-width)' },
                    { value: 'desktop-first', label: 'Desktop first (max-width)' }
                ]
            },
            { id: 'use-rem', type: 'checkbox', label: 'Express breakpoints in rem', value: false, help: 'Breakpoints in rem respond to the reader\'s browser font size, which px ignores.' },
            { id: 'include-orientation', type: 'checkbox', label: 'Include orientation queries', value: false },
            { id: 'include-motion', type: 'checkbox', label: 'Include prefers-reduced-motion', value: true },
            { id: 'include-scheme', type: 'checkbox', label: 'Include prefers-color-scheme', value: true },
            {
                id: 'syntax', type: 'select', label: 'Output', value: 'css',
                options: [
                    { value: 'css', label: 'Plain CSS' },
                    { value: 'scss', label: 'SCSS mixins' },
                    { value: 'variables', label: 'CSS custom properties' }
                ]
            }
        ],
        run: function (ctx) {
            var o = ctx.opt;

            var SETS = {
                tailwind: [['sm', 640], ['md', 768], ['lg', 1024], ['xl', 1280], ['2xl', 1536]],
                bootstrap: [['sm', 576], ['md', 768], ['lg', 992], ['xl', 1200], ['xxl', 1400]],
                material: [['small', 600], ['medium', 905], ['expanded', 1240], ['large', 1440]],
                devices: [['phone', 480], ['tablet', 768], ['laptop', 1024], ['desktop', 1440], ['wide', 1920]]
            };

            var breakpoints = o.framework === 'custom'
                ? String(o.customBreakpoints).split(',').map(function (v, i) {
                    return ['bp' + (i + 1), parseInt(v.trim(), 10)];
                }).filter(function (b) { return b[1] > 0; })
                : SETS[o.framework];

            if (!breakpoints || !breakpoints.length) ZT.fail('Enter at least one valid breakpoint.');

            function size(px) {
                return o.useRem ? (px / 16) + 'rem' : px + 'px';
            }

            var lines = [];

            if (o.syntax === 'variables') {
                lines.push(':root {');
                breakpoints.forEach(function (b) { lines.push('  --breakpoint-' + b[0] + ': ' + size(b[1]) + ';'); });
                lines.push('}');
                lines.push('');
                lines.push('/* Custom properties cannot be used inside a media query condition,');
                lines.push('   so these are for reading in JavaScript, not for @media itself. */');
            } else if (o.syntax === 'scss') {
                breakpoints.forEach(function (b) {
                    var condition = o.approach === 'mobile-first'
                        ? '(min-width: ' + size(b[1]) + ')'
                        : '(max-width: ' + size(b[1] - 0.02) + ')';
                    lines.push('@mixin ' + b[0] + ' {');
                    lines.push('  @media ' + condition + ' {');
                    lines.push('    @content;');
                    lines.push('  }');
                    lines.push('}');
                    lines.push('');
                });
                lines.push('// Usage:');
                lines.push('// .card { padding: 1rem; @include ' + breakpoints[0][0] + ' { padding: 2rem; } }');
            } else {
                if (o.approach === 'mobile-first') {
                    lines.push('/* Mobile first: base styles apply everywhere, then widen. */');
                    lines.push('');
                }
                var ordered = o.approach === 'mobile-first' ? breakpoints : breakpoints.slice().reverse();
                ordered.forEach(function (b) {
                    var condition = o.approach === 'mobile-first'
                        ? '(min-width: ' + size(b[1]) + ')'
                        : '(max-width: ' + size(b[1] - 0.02) + ')';
                    lines.push('/* ' + b[0] + ' — ' + b[1] + 'px and ' + (o.approach === 'mobile-first' ? 'up' : 'down') + ' */');
                    lines.push('@media ' + condition + ' {');
                    lines.push('  ');
                    lines.push('}');
                    lines.push('');
                });
            }

            if (o.includeOrientation) {
                lines.push('@media (orientation: landscape) {', '  ', '}', '');
                lines.push('@media (orientation: portrait) {', '  ', '}', '');
            }
            if (o.includeMotion) {
                lines.push('/* Respect a reader who has asked for less movement. */');
                lines.push('@media (prefers-reduced-motion: reduce) {');
                lines.push('  *, *::before, *::after {');
                lines.push('    animation-duration: 0.01ms !important;');
                lines.push('    transition-duration: 0.01ms !important;');
                lines.push('  }');
                lines.push('}', '');
            }
            if (o.includeScheme) {
                lines.push('@media (prefers-color-scheme: dark) {', '  ', '}', '');
            }

            return [
                ZT.textResult(lines.join('\n').trim(), { lang: 'css' }),
                ZT.dataResult(breakpoints.map(function (b) {
                    return { label: b[0], value: b[1] + 'px' + (o.useRem ? '  (' + (b[1] / 16) + 'rem)' : '') };
                }), { title: 'Breakpoints', columns: 2, mono: true })
            ];
        }
    });

    /* ============================================================
       CSS specificity
       ============================================================ */
    define({
        id: 'css-specificity-calculator',
        name: 'CSS Specificity Calculator',
        category: 'design',
        icon: 'layers',
        description: 'Score CSS selectors and see which one wins a conflict.',
        tags: ['css', 'specificity', 'selector', 'cascade', 'override', 'important'],
        input: 'text',
        live: true,
        inputLabel: 'Selectors — one per line',
        placeholder: '#header .nav a:hover\n.nav a\na\nbody .nav a.active',
        options: [
            { id: 'explain', type: 'checkbox', label: 'Explain how each score is made up', value: true },
            { id: 'sort', type: 'checkbox', label: 'Sort by specificity, strongest first', value: true }
        ],
        run: function (ctx) {
            var selectors = String(ctx.text || '').split(/\r?\n/)
                .map(function (s) { return s.trim(); })
                .filter(Boolean);

            if (!selectors.length) {
                return ZT.dataResult([{ label: 'Waiting for input', value: 'Enter one or more CSS selectors, one per line.' }], { title: 'Specificity' });
            }

            var scored = selectors.map(function (selector) {
                return Object.assign({ selector: selector }, specificity(selector));
            });

            var display = ctx.opt.sort
                ? scored.slice().sort(function (a, b) { return b.score - a.score; })
                : scored;

            var rows = display.map(function (s) {
                var value = s.a + ', ' + s.b + ', ' + s.c;
                if (ctx.opt.explain) {
                    var parts = [];
                    if (s.a) parts.push(s.a + ' ID' + (s.a > 1 ? 's' : ''));
                    if (s.b) parts.push(s.b + ' class/attribute/pseudo-class' + (s.b > 1 ? 'es' : ''));
                    if (s.c) parts.push(s.c + ' element' + (s.c > 1 ? 's' : ''));
                    if (s.important) parts.push('!important');
                    value += '   —   ' + (parts.join(', ') || 'nothing that counts');
                }
                return { label: s.selector, value: value };
            });

            var winner = scored.slice().sort(function (a, b) {
                if (a.important !== b.important) return a.important ? -1 : 1;
                return b.score - a.score;
            })[0];

            var results = [ZT.dataResult(rows, { title: 'Specificity (IDs, classes, elements)', columns: 1, mono: true })];

            if (scored.length > 1) {
                var tied = scored.filter(function (s) { return s.score === winner.score && s.important === winner.important; });
                results.push(ZT.dataResult([
                    { label: 'Wins', value: winner.selector },
                    {
                        label: 'Why',
                        value: tied.length > 1
                            ? 'Several selectors tie at ' + winner.a + ',' + winner.b + ',' + winner.c + '. When specificity ties, whichever appears last in the stylesheet wins.'
                            : (winner.important ? 'It uses !important, which beats specificity entirely.' : 'It has the highest specificity.')
                    }
                ], { title: 'Result', columns: 1 }));
            }

            return results;
        }
    });

    /**
     * Count a selector's specificity as (IDs, classes, elements).
     * Strings and comments are stripped first so their contents cannot
     * be mistaken for selector syntax.
     */
    function specificity(selector) {
        var important = /!important/i.test(selector);
        var s = selector
            .replace(/!important/gi, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/"[^"]*"|'[^']*'/g, '""');

        // :not(), :is() and :has() take their specificity from their argument.
        var inner = '';
        s = s.replace(/:(?:not|is|has|matches)\(([^)]*)\)/gi, function (_, arg) {
            inner += ' ' + arg;
            return ' ';
        });
        // :where() contributes nothing, by design.
        s = s.replace(/:where\([^)]*\)/gi, ' ');

        var combined = s + ' ' + inner;

        var ids = (combined.match(/#[\w-]+/g) || []).length;
        var classes = (combined.match(/\.[\w-]+/g) || []).length
            + (combined.match(/\[[^\]]+\]/g) || []).length
            + (combined.match(/(?<!:):(?!:)(?!not|is|has|where|matches)[\w-]+/gi) || []).length;
        var elements = (combined.match(/(?:^|[\s>+~(])([a-z][\w-]*)/gi) || []).length
            + (combined.match(/::[\w-]+/g) || []).length;

        return {
            a: ids, b: classes, c: elements,
            important: important,
            score: ids * 10000 + classes * 100 + elements + (important ? 1000000 : 0)
        };
    }

    /* ============================================================
       SVG to CSS
       ============================================================ */
    define({
        id: 'svg-to-css',
        name: 'SVG to CSS Background',
        category: 'design',
        icon: 'file-code',
        description: 'Turn an SVG into an inline data URI for CSS, HTML or a mask.',
        tags: ['svg', 'css', 'data uri', 'background', 'inline', 'base64', 'icon'],
        input: 'text',
        live: true,
        placeholder: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>',
        options: [
            {
                id: 'encoding', type: 'select', label: 'Encoding', value: 'url',
                options: [
                    { value: 'url', label: 'URL-encoded — smaller and readable' },
                    { value: 'base64', label: 'Base64 — bulletproof but ~30% bigger' }
                ]
            },
            {
                id: 'output', type: 'select', label: 'Output as', value: 'background',
                options: [
                    { value: 'background', label: 'CSS background-image' },
                    { value: 'mask', label: 'CSS mask-image (recolourable)' },
                    { value: 'content', label: 'CSS content property' },
                    { value: 'img', label: 'HTML img tag' },
                    { value: 'raw', label: 'Raw data URI' }
                ]
            },
            { id: 'minify', type: 'checkbox', label: 'Minify the SVG first', value: true },
            { id: 'fill', type: 'color', label: 'Force a fill colour', value: '#000000' },
            { id: 'apply-fill', type: 'checkbox', label: 'Apply that fill colour', value: false }
        ],
        run: function (ctx) {
            var svg = String(ctx.text || '').trim();
            if (!svg) return ZT.textResult('');
            if (!/<svg[\s>]/i.test(svg)) ZT.fail('That does not look like SVG markup — it should start with an <svg> tag.');

            var original = svg.length;

            if (ctx.opt.minify) {
                svg = svg
                    .replace(/<!--[\s\S]*?-->/g, '')
                    .replace(/<\?xml[^>]*\?>/g, '')
                    .replace(/<!DOCTYPE[^>]*>/gi, '')
                    .replace(/\s+/g, ' ')
                    .replace(/>\s+</g, '><')
                    .trim();
            }

            // A data URI needs the namespace even if the source omitted it.
            if (!/xmlns=/.test(svg)) {
                svg = svg.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
            }

            if (ctx.opt.applyFill) {
                svg = svg.replace(/fill="[^"]*"/g, '').replace(/<svg/i, '<svg fill="' + ctx.opt.fill + '"');
            }

            var uri;
            if (ctx.opt.encoding === 'base64') {
                uri = 'data:image/svg+xml;base64,' + ZT.utf8ToBase64(svg);
            } else {
                // Encode only what actually breaks inside a CSS url().
                uri = 'data:image/svg+xml,' + svg
                    .replace(/%/g, '%25')
                    .replace(/</g, '%3C').replace(/>/g, '%3E')
                    .replace(/#/g, '%23')
                    .replace(/"/g, "'")
                    .replace(/\{/g, '%7B').replace(/\}/g, '%7D')
                    .replace(/\|/g, '%7C')
                    .replace(/\^/g, '%5E')
                    .replace(/\[/g, '%5B').replace(/\]/g, '%5D')
                    .replace(/`/g, '%60');
            }

            var output;
            switch (ctx.opt.output) {
                case 'mask':
                    output = '-webkit-mask-image: url("' + uri + '");\n' +
                             'mask-image: url("' + uri + '");\n' +
                             '-webkit-mask-repeat: no-repeat;\nmask-repeat: no-repeat;\n' +
                             'background-color: currentColor;  /* the mask takes its colour from here */';
                    break;
                case 'content':
                    output = 'content: url("' + uri + '");';
                    break;
                case 'img':
                    output = '<img src="' + uri + '" alt="">';
                    break;
                case 'raw':
                    output = uri;
                    break;
                default:
                    output = 'background-image: url("' + uri + '");\n' +
                             'background-repeat: no-repeat;\nbackground-size: contain;';
            }

            return [
                ZT.textResult(output, { lang: ctx.opt.output === 'img' ? 'html' : 'css' }),
                ZT.dataResult([
                    { label: 'Original SVG', value: ZT.formatBytes(original) },
                    { label: 'Data URI', value: ZT.formatBytes(uri.length) },
                    { label: 'Encoding', value: ctx.opt.encoding === 'base64' ? 'Base64' : 'URL-encoded' },
                    { label: 'Tip', value: ctx.opt.output === 'mask' ? 'A mask takes its colour from background-color, so one file can be recoloured with CSS.' : 'URL encoding stays readable and is usually smaller than Base64 for SVG.' }
                ], { title: 'Details', columns: 2 })
            ];
        }
    });

    /* ============================================================
       Neumorphism
       ============================================================ */
    define({
        id: 'neumorphism-generator',
        name: 'Neumorphism Generator',
        category: 'design',
        icon: 'squircle',
        description: 'Create soft extruded and inset shadow effects.',
        tags: ['neumorphism', 'soft ui', 'css', 'shadow', 'skeuomorphic', 'inset'],
        input: 'none',
        options: [
            { id: 'background', type: 'color', label: 'Background colour', value: '#E0E5EC', help: 'Neumorphism needs the element and its background to be the same colour — that is what makes it look moulded.' },
            { id: 'size', type: 'range', label: 'Element size', value: 200, min: 80, max: 400, step: 10, suffix: 'px' },
            { id: 'radius', type: 'range', label: 'Corner radius', value: 32, min: 0, max: 200, step: 1, suffix: 'px' },
            { id: 'distance', type: 'range', label: 'Shadow distance', value: 12, min: 1, max: 60, step: 1, suffix: 'px' },
            { id: 'blur', type: 'range', label: 'Blur', value: 24, min: 0, max: 120, step: 1, suffix: 'px' },
            { id: 'intensity', type: 'range', label: 'Intensity', value: 15, min: 1, max: 50, step: 1, suffix: '%' },
            {
                id: 'style', type: 'radio', label: 'Style', value: 'raised',
                options: [
                    { value: 'raised', label: 'Raised' },
                    { value: 'pressed', label: 'Pressed (inset)' },
                    { value: 'flat', label: 'Flat' }
                ]
            },
            {
                id: 'light-source', type: 'select', label: 'Light comes from', value: 'top-left',
                options: [
                    { value: 'top-left', label: 'Top left' }, { value: 'top-right', label: 'Top right' },
                    { value: 'bottom-left', label: 'Bottom left' }, { value: 'bottom-right', label: 'Bottom right' }
                ]
            }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var rgb = ZT.color.parse(o.background) || [224, 229, 236];

            // Light and dark are the same hue shifted by the intensity.
            var factor = o.intensity / 100;
            var light = rgb.slice(0, 3).map(function (c) { return Math.min(255, Math.round(c + c * factor)); });
            var dark = rgb.slice(0, 3).map(function (c) { return Math.max(0, Math.round(c - c * factor)); });

            var signX = /left/.test(o.lightSource) ? 1 : -1;
            var signY = /top/.test(o.lightSource) ? 1 : -1;
            var dx = o.distance * signX;
            var dy = o.distance * signY;

            var lightRgb = 'rgb(' + light.join(', ') + ')';
            var darkRgb = 'rgb(' + dark.join(', ') + ')';

            var shadow;
            if (o.style === 'flat') {
                shadow = 'none';
            } else if (o.style === 'pressed') {
                shadow = 'inset ' + dx + 'px ' + dy + 'px ' + o.blur + 'px ' + darkRgb + ',\n              inset ' +
                    (-dx) + 'px ' + (-dy) + 'px ' + o.blur + 'px ' + lightRgb;
            } else {
                shadow = dx + 'px ' + dy + 'px ' + o.blur + 'px ' + darkRgb + ',\n              ' +
                    (-dx) + 'px ' + (-dy) + 'px ' + o.blur + 'px ' + lightRgb;
            }

            var css = '.neumorphic {\n' +
                '  border-radius: ' + o.radius + 'px;\n' +
                '  background: ' + o.background + ';\n' +
                '  box-shadow: ' + shadow + ';\n' +
                '}';

            var stage = ZT.el('div', { class: 'zt-css-preview zt-css-preview--center' });
            stage.style.background = o.background;
            var box = ZT.el('div', {});
            Object.assign(box.style, {
                width: o.size + 'px',
                height: o.size + 'px',
                borderRadius: o.radius + 'px',
                background: o.background,
                boxShadow: shadow.replace(/\n\s+/g, ' ')
            });
            stage.appendChild(box);

            return [
                ZT.nodeResult(stage, { title: 'Preview' }),
                ZT.textResult(css, { lang: 'css', title: 'CSS' }),
                ZT.dataResult([
                    { label: 'Accessibility note', value: 'Neumorphic controls have very low contrast against their background, which makes them hard to see for many people and can fail WCAG. Use it decoratively, and keep a clear focus style on anything interactive.' }
                ], { title: 'Worth knowing', columns: 1 })
            ];
        }
    });

    /* ============================================================
       CSS filter playground
       ============================================================ */
    define({
        id: 'css-filter-generator',
        name: 'CSS Filter Generator',
        category: 'design',
        icon: 'sliders-horizontal',
        description: 'Build CSS filter and backdrop-filter chains with a live preview.',
        tags: ['css', 'filter', 'blur', 'brightness', 'contrast', 'grayscale', 'backdrop'],
        input: 'none',
        options: [
            { id: 'blur', type: 'range', label: 'Blur', value: 0, min: 0, max: 20, step: 0.5, suffix: 'px' },
            { id: 'brightness', type: 'range', label: 'Brightness', value: 100, min: 0, max: 200, step: 1, suffix: '%' },
            { id: 'contrast', type: 'range', label: 'Contrast', value: 100, min: 0, max: 200, step: 1, suffix: '%' },
            { id: 'saturate', type: 'range', label: 'Saturation', value: 100, min: 0, max: 300, step: 1, suffix: '%' },
            { id: 'grayscale', type: 'range', label: 'Greyscale', value: 0, min: 0, max: 100, step: 1, suffix: '%' },
            { id: 'sepia', type: 'range', label: 'Sepia', value: 0, min: 0, max: 100, step: 1, suffix: '%' },
            { id: 'hue-rotate', type: 'range', label: 'Hue rotate', value: 0, min: 0, max: 360, step: 1, suffix: 'deg' },
            { id: 'invert', type: 'range', label: 'Invert', value: 0, min: 0, max: 100, step: 1, suffix: '%' },
            { id: 'opacity', type: 'range', label: 'Opacity', value: 100, min: 0, max: 100, step: 1, suffix: '%' },
            { id: 'drop-shadow', type: 'checkbox', label: 'Add a drop shadow', value: false },
            { id: 'shadow-color', type: 'color', label: 'Shadow colour', value: '#000000', when: function (o) { return o.dropShadow; } },
            { id: 'backdrop', type: 'checkbox', label: 'Use backdrop-filter instead', value: false, help: 'Filters what is behind the element rather than the element itself.' }
        ],
        run: function (ctx) {
            var o = ctx.opt;
            var parts = [];

            if (o.blur) parts.push('blur(' + o.blur + 'px)');
            if (o.brightness !== 100) parts.push('brightness(' + o.brightness + '%)');
            if (o.contrast !== 100) parts.push('contrast(' + o.contrast + '%)');
            if (o.saturate !== 100) parts.push('saturate(' + o.saturate + '%)');
            if (o.grayscale) parts.push('grayscale(' + o.grayscale + '%)');
            if (o.sepia) parts.push('sepia(' + o.sepia + '%)');
            if (o.hueRotate) parts.push('hue-rotate(' + o.hueRotate + 'deg)');
            if (o.invert) parts.push('invert(' + o.invert + '%)');
            if (o.opacity !== 100) parts.push('opacity(' + o.opacity + '%)');
            if (o.dropShadow) parts.push('drop-shadow(0 4px 8px ' + o.shadowColor + ')');

            var value = parts.length ? parts.join(' ') : 'none';
            var property = o.backdrop ? 'backdrop-filter' : 'filter';

            var css = (o.backdrop ? '-webkit-backdrop-filter: ' + value + ';\n' : '') +
                property + ': ' + value + ';';

            var stage = ZT.el('div', { class: 'zt-glass-stage' });
            stage.style.background =
                'radial-gradient(circle at 25% 30%, #4F8DF7 0%, transparent 45%),' +
                'radial-gradient(circle at 75% 65%, #EC4899 0%, transparent 42%),' +
                'radial-gradient(circle at 55% 20%, #F59E0B 0%, transparent 38%), #1E293B';

            var target = ZT.el('div', { class: 'zt-glass-card', text: o.backdrop ? 'Backdrop filtered' : 'Filtered' });
            if (o.backdrop) {
                target.style.backdropFilter = value;
                target.style.webkitBackdropFilter = value;
                target.style.background = 'rgba(255,255,255,0.08)';
            } else {
                target.style.filter = value;
                target.style.background = 'linear-gradient(135deg, #4F8DF7, #EC4899)';
            }
            stage.appendChild(target);

            return [
                ZT.nodeResult(stage, { title: 'Preview' }),
                ZT.textResult(css, { lang: 'css', title: 'CSS' })
            ];
        }
    });

})();
