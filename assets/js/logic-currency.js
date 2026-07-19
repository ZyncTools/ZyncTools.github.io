/**
 * ZyncTools — Currency Conversion Logic
 * =====================================
 * Real-time currency conversion using KEYLESS public APIs:
 *   • Fiat:   Frankfurter API   https://api.frankfurter.dev  (ECB reference rates)
 *   • Crypto: Coinbase API      https://api.coinbase.com/v2/exchange-rates
 *
 * 100% client-side. No API key, no tracking. Rates are cached in-memory
 * (10 min TTL) to avoid hammering the endpoints.
 *
 * Public API:
 *   ZyncCurrency.convertCurrency(amount, from, to)  -> { result, rate, date, source }
 *   ZyncCurrency.getRate(from, to)                  -> { rate, date, source }
 *   ZyncCurrency.getCurrencies()                    -> { CODE: "Name", ... }
 *   ZyncCurrency.refresh()                          -> clears cache
 *   ZyncCurrency.getModule(toolId)                  -> viewer-compatible module (renderUI)
 */
window.ZyncCurrency = (function () {
    'use strict';

    const FIAT_BASE = 'https://api.frankfurter.dev/v1';
    const CRYPTO_BASE = 'https://api.coinbase.com/v2/exchange-rates';
    const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

    const CRYPTO = { BTC: 'Bitcoin', ETH: 'Ethereum', LTC: 'Litecoin', XRP: 'Ripple', DOGE: 'Dogecoin', SOL: 'Solana', ADA: 'Cardano', BCH: 'Bitcoin Cash' };
    const FIAT_FALLBACK = {
        USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', JPY: 'Japanese Yen', INR: 'Indian Rupee',
        AUD: 'Australian Dollar', CAD: 'Canadian Dollar', CHF: 'Swiss Franc', CNY: 'Chinese Yuan',
        SGD: 'Singapore Dollar', HKD: 'Hong Kong Dollar', NZD: 'New Zealand Dollar', SEK: 'Swedish Krona',
        NOK: 'Norwegian Krone', KRW: 'South Korean Won', MXN: 'Mexican Peso', BRL: 'Brazilian Real',
        ZAR: 'South African Rand', TRY: 'Turkish Lira', AED: 'UAE Dirham'
    };

    const cache = { rates: {}, currencies: null, cryptoUsd: null, cryptoAt: 0 };

    function now() { return Date.now(); }

    async function fetchJson(url) {
        let res;
        try {
            res = await fetch(url, { cache: 'no-store' });
        } catch (e) {
            throw new Error('Network Error: unable to reach the exchange-rate service. Check your connection.');
        }
        if (!res.ok) {
            if (res.status === 404) throw new Error('Invalid currency pair or unsupported currency code.');
            throw new Error('Exchange-rate service error (HTTP ' + res.status + '). Please try again.');
        }
        return res.json();
    }

    /* ---------- Currencies list (fiat + crypto) ---------- */
    async function getCurrencies() {
        if (cache.currencies) return cache.currencies;
        let fiat = FIAT_FALLBACK;
        try {
            fiat = await fetchJson(FIAT_BASE + '/currencies');
        } catch (e) { /* fall back to static list */ }
        const all = Object.assign({}, fiat);
        Object.keys(CRYPTO).forEach(k => { all[k] = CRYPTO[k] + ' (crypto)'; });
        cache.currencies = all;
        return all;
    }

    function isCrypto(code) { return Object.prototype.hasOwnProperty.call(CRYPTO, code); }

    /* ---------- Crypto → USD (Coinbase) ---------- */
    async function getCryptoUsd() {
        if (cache.cryptoUsd && (now() - cache.cryptoAt) < CACHE_TTL) return cache.cryptoUsd;
        // Coinbase: base=USD gives rates[SYMBOL] = how many SYMBOL per 1 USD
        const data = await fetchJson(CRYPTO_BASE + '?currency=USD');
        const rates = (data && data.data && data.data.rates) || {};
        const map = {};
        Object.keys(CRYPTO).forEach(sym => {
            const perUsd = parseFloat(rates[sym]);
            if (perUsd > 0) map[sym] = 1 / perUsd; // USD value of 1 unit of crypto
        });
        cache.cryptoUsd = map;
        cache.cryptoAt = now();
        return map;
    }

    /* ---------- Fiat rate (Frankfurter) ---------- */
    async function getFiatRate(from, to) {
        if (from === to) return { rate: 1, date: new Date().toISOString().slice(0, 10) };
        const key = from + '_' + to;
        const cached = cache.rates[key];
        if (cached && (now() - cached.at) < CACHE_TTL) return { rate: cached.rate, date: cached.date };
        const data = await fetchJson(`${FIAT_BASE}/latest?base=${from}&symbols=${to}`);
        const rate = data && data.rates && data.rates[to];
        if (typeof rate !== 'number') throw new Error('Conversion Failed: rate unavailable for ' + from + '→' + to + '.');
        cache.rates[key] = { rate, date: data.date, at: now() };
        return { rate, date: data.date };
    }

    /**
     * getRate(from, to) — supports fiat↔fiat, crypto↔fiat, crypto↔crypto.
     * Returns { rate, date, source }.
     */
    async function getRate(from, to) {
        from = String(from || '').toUpperCase().trim();
        to = String(to || '').toUpperCase().trim();
        if (!from || !to) throw new Error('Invalid input: please select both currencies.');
        if (from === to) return { rate: 1, date: new Date().toISOString().slice(0, 10), source: 'identity' };

        const fromC = isCrypto(from), toC = isCrypto(to);

        if (!fromC && !toC) {
            const r = await getFiatRate(from, to);
            return { rate: r.rate, date: r.date, source: 'Frankfurter (ECB)' };
        }

        // Bridge everything through USD value.
        const cryptoUsd = await getCryptoUsd();
        const date = new Date().toISOString().slice(0, 10);

        // value of 1 `from` in USD
        let fromUsd;
        if (fromC) {
            if (!cryptoUsd[from]) throw new Error('Unsupported crypto currency: ' + from);
            fromUsd = cryptoUsd[from];
        } else {
            fromUsd = from === 'USD' ? 1 : 1 / (await getFiatRate('USD', from)).rate;
        }
        // value of 1 `to` in USD
        let toUsd;
        if (toC) {
            if (!cryptoUsd[to]) throw new Error('Unsupported crypto currency: ' + to);
            toUsd = cryptoUsd[to];
        } else {
            toUsd = to === 'USD' ? 1 : 1 / (await getFiatRate('USD', to)).rate;
        }

        return { rate: fromUsd / toUsd, date, source: 'Coinbase + Frankfurter' };
    }

    /**
     * convertCurrency(amount, from, to) — the primary tool function.
     */
    async function convertCurrency(amount, from, to) {
        const amt = parseFloat(amount);
        if (!isFinite(amt)) throw new Error('Invalid input: amount must be a number.');
        const { rate, date, source } = await getRate(from, to);
        const result = amt * rate;
        return {
            amount: amt,
            from: String(from).toUpperCase(),
            to: String(to).toUpperCase(),
            rate,
            result,
            date,
            source,
            formatted: formatMoney(result, String(to).toUpperCase())
        };
    }

    function formatMoney(value, code) {
        try {
            if (isCrypto(code)) return value.toLocaleString('en-US', { maximumFractionDigits: 8 }) + ' ' + code;
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(value);
        } catch (e) {
            return value.toFixed(2) + ' ' + code;
        }
    }

    function refresh() {
        cache.rates = {}; cache.cryptoUsd = null; cache.cryptoAt = 0;
    }

    /* ============================================================
       Viewer-compatible module (interactive UI)
       Tool IDs like "usd-to-eur" pre-select the pair.
       ============================================================ */
    function parsePair(toolId) {
        const m = /^([a-z]{3,4})-to-([a-z]{3,4})$/i.exec(toolId || '');
        if (m) return { from: m[1].toUpperCase(), to: m[2].toUpperCase() };
        return { from: 'USD', to: 'EUR' };
    }

    function getModule(toolId) {
        const pair = parsePair(toolId);
        return {
            type: 'interactive',
            renderUI: async function (mount, ctx) {
                ctx = ctx || {};
                const currencies = await getCurrencies().catch(() => FIAT_FALLBACK);
                const opts = Object.keys(currencies).sort()
                    .map(c => `<option value="${c}">${c} — ${currencies[c]}</option>`).join('');

                mount.innerHTML = `
                  <div class="zc-currency" style="max-width:520px">
                    <div style="display:flex;gap:.75rem;align-items:flex-end;flex-wrap:wrap">
                      <label style="flex:1;min-width:120px">Amount
                        <input id="zc-amt" type="number" value="1" min="0" step="any"
                          style="width:100%;padding:.6rem;border-radius:8px;border:1px solid var(--border-medium,#334);background:var(--bg-input,#111);color:inherit">
                      </label>
                    </div>
                    <div style="display:flex;gap:.5rem;align-items:flex-end;margin-top:.75rem;flex-wrap:wrap">
                      <label style="flex:1;min-width:120px">From
                        <select id="zc-from" style="width:100%;padding:.6rem;border-radius:8px;border:1px solid var(--border-medium,#334);background:var(--bg-input,#111);color:inherit">${opts}</select>
                      </label>
                      <button id="zc-swap" title="Reverse Swap" aria-label="Swap currencies"
                        style="padding:.6rem .8rem;border-radius:8px;border:1px solid var(--border-medium,#334);background:transparent;color:inherit;cursor:pointer">⇄</button>
                      <label style="flex:1;min-width:120px">To
                        <select id="zc-to" style="width:100%;padding:.6rem;border-radius:8px;border:1px solid var(--border-medium,#334);background:var(--bg-input,#111);color:inherit">${opts}</select>
                      </label>
                    </div>
                    <button id="zc-go" style="margin-top:1rem;width:100%;padding:.7rem;border:none;border-radius:10px;background:var(--accent,#6366F1);color:#fff;font-weight:600;cursor:pointer">Convert</button>
                    <div id="zc-out" style="margin-top:1rem;font-size:1.4rem;font-weight:700;min-height:1.5em"></div>
                    <div id="zc-meta" style="margin-top:.35rem;font-size:.8rem;color:var(--text-muted,#8b93a7);display:flex;gap:.75rem;align-items:center;flex-wrap:wrap"></div>
                  </div>`;

                const $ = s => mount.querySelector(s);
                $('#zc-from').value = pair.from;
                $('#zc-to').value = pair.to;

                async function run() {
                    const out = $('#zc-out'), meta = $('#zc-meta');
                    out.textContent = 'Converting…';
                    meta.textContent = '';
                    try {
                        const r = await convertCurrency($('#zc-amt').value, $('#zc-from').value, $('#zc-to').value);
                        out.textContent = `${r.amount.toLocaleString()} ${r.from} = ${r.formatted}`;
                        meta.innerHTML =
                          `<span>1 ${r.from} = ${r.rate.toLocaleString('en-US',{maximumFractionDigits:8})} ${r.to}</span>` +
                          `<span>Last Updated: ${r.date}</span>` +
                          `<span>Source: ${r.source}</span>` +
                          `<button id="zc-refresh" style="margin-left:auto;padding:.2rem .5rem;border-radius:6px;border:1px solid var(--border-medium,#334);background:transparent;color:inherit;cursor:pointer">↻ Refresh</button>`;
                        const rb = $('#zc-refresh');
                        if (rb) rb.onclick = () => { refresh(); run(); };
                    } catch (err) {
                        out.textContent = '';
                        meta.style.color = '#EF4444';
                        meta.textContent = err.message || 'Conversion Failed.';
                        if (ctx.showError) ctx.showError(err.message);
                    }
                }

                $('#zc-go').onclick = run;
                $('#zc-swap').onclick = () => {
                    const f = $('#zc-from').value; $('#zc-from').value = $('#zc-to').value; $('#zc-to').value = f; run();
                };
                $('#zc-amt').addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
                run();
            }
        };
    }

    return { convertCurrency, getRate, getCurrencies, refresh, isCrypto, formatMoney, getModule, CRYPTO };
})();
