/**
 * Load the browser tool registry inside Node.
 *
 * The registry and tool modules are written for the browser, so they run
 * here in a sandbox with just enough of a DOM to let them register. None of
 * them touch the document at load time — only inside run() — so a handful of
 * stubs is sufficient, and the build reads exactly what the site reads.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const TOOL_MODULES = [
    'image', 'pdf', 'media', 'text', 'code', 'convert',
    'design', 'security', 'generate', 'seo', 'datetime', 'math'
];

function loadRegistry(root) {
    const noop = () => {};
    const stubElement = () => ({
        style: {},
        dataset: {},
        classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
        appendChild: noop,
        setAttribute: noop,
        addEventListener: noop,
        getContext: () => null
    });

    const sandbox = {
        console,
        setTimeout, clearTimeout, setInterval, clearInterval,
        crypto: require('crypto').webcrypto,
        TextEncoder, TextDecoder,
        Intl, URL, URLSearchParams,
        Blob: class {},
        File: class {},
        FileReader: class {},
        DOMParser: class { parseFromString() { return { documentElement: {}, querySelector: () => null }; } },
        XMLSerializer: class { serializeToString() { return ''; } },
        document: {
            createElement: stubElement,
            createElementNS: stubElement,
            createTextNode: () => ({}),
            getElementsByTagName: () => [],
            querySelector: () => null,
            querySelectorAll: () => [],
            addEventListener: noop,
            readyState: 'complete',
            head: stubElement(),
            body: stubElement()
        },
        navigator: { clipboard: {} },
        location: { search: '', origin: '', pathname: '/', href: '/' },
        addEventListener: noop,
        matchMedia: () => ({ matches: false, addEventListener: noop }),
        requestAnimationFrame: noop
    };
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;

    const context = vm.createContext(sandbox);

    const files = [
        'assets/js/zt-core.js',
        'assets/js/zt-icons.js',
        'assets/js/zt-registry.js',
        ...TOOL_MODULES.map((m) => `assets/js/tools/${m}.js`)
    ];

    for (const file of files) {
        const source = fs.readFileSync(path.join(root, file), 'utf8');
        try {
            vm.runInContext(source, context, { filename: file });
        } catch (err) {
            throw new Error(`Could not load ${file}: ${err.message}`);
        }
    }

    if (!sandbox.ZT || !sandbox.ZT.registry) {
        throw new Error('The registry did not initialise.');
    }
    return sandbox.ZT.registry;
}

module.exports = { loadRegistry, TOOL_MODULES };
