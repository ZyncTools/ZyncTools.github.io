/**
 * ZyncTools — UI Components Module
 * Specialized UI components for advanced tools.
 */

window.ZyncUIComponents = (function () {
    'use strict';

    function createColorPicker(options = {}) {
        const container = document.createElement('div');
        container.className = 'zync-color-picker space-y-2';
        container.innerHTML = `
            <label class="text-sm text-gray-400">${options.label || 'Pick a color'}</label>
            <div class="flex items-center gap-3">
                <input type="color" id="${options.id || 'color-picker'}" value="${options.value || '#6366F1'}" class="w-12 h-10 rounded-lg cursor-pointer border border-white/10 bg-transparent" />
                <input type="text" id="${options.id || 'color-picker'}-hex" value="${options.value || '#6366F1'}" class="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200" maxlength="7" />
            </div>
        `;
        const colorInput = container.querySelector(`#${options.id || 'color-picker'}`);
        const hexInput = container.querySelector(`#${options.id || 'color-picker'}-hex`);
        colorInput.addEventListener('input', () => { hexInput.value = colorInput.value; });
        hexInput.addEventListener('input', () => { if (/^#[0-9A-F]{6}$/i.test(hexInput.value)) colorInput.value = hexInput.value; });
        return container;
    }

    function createWaveformDisplay(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return null;
        const canvas = document.createElement('canvas');
        canvas.width = container.clientWidth || 600;
        canvas.height = 120;
        canvas.className = 'w-full rounded-xl bg-slate-900 border border-white/5';
        container.appendChild(canvas);
        return canvas;
    }

    function drawWaveform(canvas, audioBuffer) {
        if (!canvas || !audioBuffer) return;
        const ctx = canvas.getContext('2d');
        const data = audioBuffer.getChannelData(0);
        const step = Math.ceil(data.length / canvas.width);
        const amp = canvas.height / 2;
        ctx.fillStyle = '#6366F1';
        for (let i = 0; i < canvas.width; i++) {
            let min = 1.0, max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }
    }

    function createRangeInput(options = {}) {
        const container = document.createElement('div');
        container.className = 'zync-range-input space-y-2';
        container.innerHTML = `
            <label class="text-sm text-gray-400">${options.label || 'Value'}: <span id="${options.id || 'range'}-value">${options.value || 0}</span></label>
            <input type="range" id="${options.id || 'range'}" min="${options.min || 0}" max="${options.max || 100}" value="${options.value || 0}" step="${options.step || 1}" class="w-full accent-accent" />
        `;
        const input = container.querySelector(`#${options.id || 'range'}`);
        const valueDisplay = container.querySelector(`#${options.id || 'range'}-value`);
        if (input && valueDisplay) {
            input.addEventListener('input', () => { valueDisplay.textContent = input.value; });
        }
        return container;
    }

    function createSelectInput(options = {}) {
        const container = document.createElement('div');
        container.className = 'zync-select-input space-y-2';
        container.innerHTML = `
            <label class="text-sm text-gray-400">${options.label || 'Select'}</label>
            <select id="${options.id || 'select'}" class="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200">
                ${(options.options || []).map(opt => `<option value="${opt.value || opt}" ${opt.value === options.value ? 'selected' : ''}>${opt.label || opt}</option>`).join('')}
            </select>
        `;
        return container;
    }

    function createFileDropZone(options = {}) {
        const container = document.createElement('div');
        container.id = options.id || 'drop-zone';
        container.className = 'drop-zone';
        container.innerHTML = `
            <div class="pointer-events-none">
                <svg class="w-10 h-10 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                <p class="text-white font-medium text-sm">${options.label || 'Drag & drop files here'}</p>
                <p class="text-gray-500 text-xs mt-1">${options.hint || 'or click to browse'}</p>
            </div>
            <input type="file" id="${options.inputId || 'file-input'}" multiple accept="${options.accept || '*'}" class="hidden" />
        `;
        const dropZone = container;
        const fileInput = container.querySelector('input[type="file"]');
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (options.onDrop) options.onDrop(e.dataTransfer.files);
        });
        fileInput.addEventListener('change', (e) => { if (options.onDrop) options.onDrop(e.target.files); });
        return container;
    }

    return {
        createColorPicker,
        createWaveformDisplay,
        drawWaveform,
        createRangeInput,
        createSelectInput,
        createFileDropZone
    };
})();
