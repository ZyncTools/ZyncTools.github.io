/**
 * ZyncTools — optional page-view counting
 *
 * Disabled until you fill in ANALYTICS below. With it empty this file adds
 * one no-op function call and nothing else — no request, no storage, no
 * global state.
 *
 * What it deliberately never does:
 *   - no cookies and no localStorage, so no consent banner is required
 *   - no cross-site identifier, so visitors cannot be followed anywhere
 *   - nothing about your files: filenames, sizes and contents never leave
 *     the browser, which is the whole point of the site
 *
 * It counts which tool pages get opened. That is the minimum needed to know
 * which of 124 tools are worth investing in, and it is categorically
 * different from touching user data.
 *
 * To enable, pick a privacy-respecting counter and fill in the config:
 *
 *   GoatCounter (free, open source, no cookies)
 *     1. Sign up at https://www.goatcounter.com
 *     2. Set provider: 'goatcounter' and endpoint to your subdomain, e.g.
 *        'https://yoursite.goatcounter.com/count'
 *
 *   Plausible (paid, no cookies)
 *     1. Add your domain at https://plausible.io
 *     2. Set provider: 'plausible' and domain to your site's domain.
 *
 * If you enable this, update the Analytics section of pages/privacy.html to
 * match. That page currently states no analytics is running, and it should
 * never be allowed to drift out of date.
 */
(function () {
    'use strict';

    var ANALYTICS = {
        /* 'goatcounter' | 'plausible' | '' to stay disabled */
        provider: '',

        /* GoatCounter: your counting endpoint. */
        endpoint: '',

        /* Plausible: the domain registered in your dashboard. */
        domain: '',

        /* Skip counting when the visitor asks not to be tracked. Counting is
           anonymous either way, but honouring the signal costs nothing. */
        respectDoNotTrack: true,

        /* Never count while developing. */
        ignoreLocalhost: true
    };

    if (!ANALYTICS.provider) return;

    if (ANALYTICS.respectDoNotTrack) {
        var dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
        if (dnt === '1' || dnt === 'yes') return;
    }

    if (ANALYTICS.ignoreLocalhost && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;

    // A page opened in a background tab or prerendered was never really seen.
    if (document.visibilityState === 'prerender') return;

    function loadScript(src, attrs) {
        var s = document.createElement('script');
        s.async = true;
        s.defer = true;
        s.src = src;
        Object.keys(attrs || {}).forEach(function (k) { s.setAttribute(k, attrs[k]); });
        // Never let a counter that fails to load affect the page.
        s.onerror = function () { /* ignore */ };
        document.head.appendChild(s);
    }

    if (ANALYTICS.provider === 'goatcounter' && ANALYTICS.endpoint) {
        window.goatcounter = { no_onload: false };
        loadScript('https://gc.zgo.at/count.js', { 'data-goatcounter': ANALYTICS.endpoint });
    } else if (ANALYTICS.provider === 'plausible' && ANALYTICS.domain) {
        loadScript('https://plausible.io/js/script.js', { 'data-domain': ANALYTICS.domain });
    }
})();
