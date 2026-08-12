/**
 * ZyncTools — Service worker
 *
 * Gives the site offline support. Tools run client-side anyway, so once
 * the shell and scripts are cached most of the catalogue works with no
 * connection at all.
 *
 * Bump CACHE_VERSION on every deploy — the activate handler deletes any
 * cache that does not match, which is what evicts a stale build.
 */

const CACHE_VERSION = 'zynctools-v6';
const SHELL_CACHE = CACHE_VERSION + '-shell';
const RUNTIME_CACHE = CACHE_VERSION + '-runtime';

/* Everything the app needs to boot. Paths are relative so the site
   works from a subdirectory as well as from a domain root. */
const SHELL_ASSETS = [
    './',
    './index.html',
    './tool.html',
    './assets/css/zynctools.css',
    './assets/js/zt-core.js',
    './assets/js/zt-icons.js',
    './assets/js/zt-registry.js',
    './assets/js/zt-catalog.js',
    './assets/js/zt-theme.js',
    './assets/js/zt-home.js',
    './assets/js/zt-tool-page.js',
    './assets/js/zt-tool-search.js',
    './assets/js/zt-assistant.js',
    './assets/js/zt-analytics.js',
    './assets/js/tools/image.js',
    './assets/js/tools/pdf.js',
    './assets/js/tools/media.js',
    './assets/js/tools/text.js',
    './assets/js/tools/code.js',
    './assets/js/tools/convert.js',
    './assets/js/tools/design.js',
    './assets/js/tools/security.js',
    './assets/js/tools/generate.js',
    './assets/js/tools/seo.js',
    './assets/js/tools/datetime.js',
    './assets/js/tools/math.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            // addAll is all-or-nothing, so one 404 would discard the lot.
            // Caching individually keeps the rest usable offline.
            .then((cache) => Promise.all(
                SHELL_ASSETS.map((asset) => cache.add(asset).catch(() => null))
            ))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((names) => Promise.all(
                names
                    .filter((name) => name !== SHELL_CACHE && name !== RUNTIME_CACHE)
                    .map((name) => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;

    if (request.method !== 'GET') return;

    let url;
    try {
        url = new URL(request.url);
    } catch (e) {
        return;
    }

    // Never intercept CDN libraries or the PDF.js worker. The browser's
    // own HTTP cache handles those, and proxying them here breaks the
    // worker's same-origin expectations.
    if (url.origin !== self.location.origin) return;
    if (url.pathname.includes('pdf.worker')) return;

    // HTML is network-first so a new deploy is picked up immediately.
    const isDocument = request.mode === 'navigate' ||
        request.destination === 'document' ||
        url.pathname.endsWith('.html');

    event.respondWith(isDocument ? networkFirst(request) : staleWhileRevalidate(request));
});

async function networkFirst(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
    } catch (e) {
        const cached = await cache.match(request) || await caches.match(request);
        if (cached) return cached;

        // Offline with nothing cached — fall back to the app shell so a
        // deep link still lands somewhere useful rather than a browser error.
        const shell = await caches.match('./index.html');
        if (shell) return shell;

        return new Response('You are offline and this page has not been cached yet.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request) || await caches.match(request);

    const network = fetch(request).then((response) => {
        if (response && response.ok) cache.put(request, response.clone());
        return response;
    }).catch(() => null);

    // Serve the cached copy straight away; the network call above keeps
    // refreshing it in the background and its failure is already swallowed.
    if (cached) return cached;

    const response = await network;
    return response || new Response('', { status: 503 });
}

/* Lets the page trigger an immediate update after a deploy. */
self.addEventListener('message', (event) => {
    if (event.data === 'skip-waiting') self.skipWaiting();
});
