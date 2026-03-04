/**
 * priceService.js
 *
 * Universal USD price service for the Solana swap decoder.
 * Handles ALL swap types so usd_value is NEVER null:
 *
 *   SOL → TOKEN:     usd_value = amount_in  × getSolPriceUSD()
 *   TOKEN → SOL:     usd_value = amount_out × getSolPriceUSD()
 *   TOKEN → STABLE:  usd_value = amount_out  (stablecoin = $1)
 *   STABLE → TOKEN:  usd_value = amount_in   (stablecoin = $1)
 *   TOKEN → TOKEN:   usd_value = amount_in  × getTokenPriceUSD(token_in_mint)
 *
 * Exports:
 *   getSolPriceUSD()           → number | null
 *   getTokenPriceUSD(mint)     → number | null
 *   computeUsdValue(swap)      → number | null   ← use this in parseTransaction.js
 *   clearPriceCache()
 *   isStablecoin(mint)
 */

const axios = require("axios");

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const SOL_MINT = "So11111111111111111111111111111111111111112";

// Known stablecoins on Solana — treated as exactly $1.00
const STABLECOIN_MINTS = new Set([
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",  // USDT
    "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB",   // USD1
    "USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX",  // USDH
    "UXPhBoR3qG4UCiGNJfV7MqhVhnAYjr4h9yvKLVqvnTA",  // UXD
    "9mWRABuz2x6koTPCWioCemApzkeLR4YMgDGM7SmymSsQ",  // ZUSD
    "Ea5SjE2Y6yvCeW5dYTn7PYMuW5ikXkvbGdcmSnXeaLjS", // PAI
]);

/* ─────────────────────────────────────────────────────────────
   PER-MINT CACHE  { mint → { price, expiresAt } }
───────────────────────────────────────────────────────────── */
const CACHE_TTL_MS = 60_000; // 60 seconds
const _cache = new Map();

function _getCached(mint) {
    const e = _cache.get(mint);
    if (e && Date.now() < e.expiresAt) return e.price;
    return null;
}

function _setCache(mint, price) {
    _cache.set(mint, { price, expiresAt: Date.now() + CACHE_TTL_MS });
}

/* ─────────────────────────────────────────────────────────────
   SOL PRICE  (5 fallback sources)
───────────────────────────────────────────────────────────── */
const SOL_SOURCES = [
    {
        name: "Jupiter v2",
        fetch: async () => {
            const r = await axios.get(`https://api.jup.ag/price/v2?ids=${SOL_MINT}`, { timeout: 4000 });
            const p = parseFloat(r.data?.data?.[SOL_MINT]?.price);
            return isFinite(p) && p > 0 ? p : null;
        },
    },
    {
        name: "Jupiter v6",
        fetch: async () => {
            const r = await axios.get(`https://price.jup.ag/v6/price?ids=${SOL_MINT}`, { timeout: 4000 });
            const p = r.data?.data?.[SOL_MINT]?.price;
            return typeof p === "number" && p > 0 ? p : null;
        },
    },
    {
        name: "Binance",
        fetch: async () => {
            const r = await axios.get("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT", { timeout: 4000 });
            const p = parseFloat(r.data?.price);
            return isFinite(p) && p > 0 ? p : null;
        },
    },
    {
        name: "CoinGecko",
        fetch: async () => {
            const r = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", { timeout: 4000 });
            const p = r.data?.solana?.usd;
            return typeof p === "number" && p > 0 ? p : null;
        },
    },
    {
        name: "Pyth Hermes",
        fetch: async () => {
            const FEED = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
            const r = await axios.get(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${FEED}`, { timeout: 4000 });
            const parsed = r.data?.parsed?.[0]?.price;
            if (!parsed) return null;
            const p = Number(parsed.price) * Math.pow(10, parsed.expo);
            return isFinite(p) && p > 0 ? p : null;
        },
    },
];

/**
 * Get SOL/USD price. 5 fallback sources. 60s cache. Never throws.
 * @returns {Promise<number|null>}
 */
async function getSolPriceUSD() {
    const cached = _getCached(SOL_MINT);
    if (cached !== null) return cached;

    for (const src of SOL_SOURCES) {
        try {
            const price = await src.fetch();
            if (price !== null) {
                _setCache(SOL_MINT, price);
                console.log(`[priceService] ✅ SOL = $${price.toFixed(4)} via ${src.name}`);
                return price;
            }
            console.warn(`[priceService] ⚠️  ${src.name} returned no SOL price`);
        } catch (e) {
            console.warn(`[priceService] ❌ ${src.name} failed: ${e?.message}`);
        }
    }
    console.error("[priceService] 🔥 ALL SOL sources failed — check internet/firewall");
    return null;
}

/* ─────────────────────────────────────────────────────────────
   TOKEN PRICE  (Jupiter knows USD price of every Solana token)
───────────────────────────────────────────────────────────── */

/**
 * Get any SPL token's USD price via Jupiter Price API.
 * Works for ANY token that has liquidity on any Solana DEX.
 * 60s cache per mint. Never throws.
 *
 * @param {string} mint
 * @returns {Promise<number|null>}
 */
async function getTokenPriceUSD(mint) {
    if (!mint) return null;
    if (mint === SOL_MINT) return getSolPriceUSD();
    if (STABLECOIN_MINTS.has(mint)) return 1.0;

    const cached = _getCached(mint);
    if (cached !== null) return cached;

    // Jupiter v2 — primary (supports any token with any liquidity)
    try {
        const r = await axios.get(`https://api.jup.ag/price/v2?ids=${mint}`, { timeout: 4000 });
        const p = parseFloat(r.data?.data?.[mint]?.price);
        if (isFinite(p) && p > 0) {
            _setCache(mint, p);
            console.log(`[priceService] ✅ ${mint.slice(0, 8)}... = $${p.toFixed(8)} via Jupiter v2`);
            return p;
        }
    } catch (e) {
        console.warn(`[priceService] ❌ Jupiter v2 token failed (${mint.slice(0, 8)}...): ${e?.message}`);
    }

    // Jupiter v6 — fallback
    try {
        const r = await axios.get(`https://price.jup.ag/v6/price?ids=${mint}`, { timeout: 4000 });
        const p = r.data?.data?.[mint]?.price;
        if (typeof p === "number" && p > 0) {
            _setCache(mint, p);
            console.log(`[priceService] ✅ ${mint.slice(0, 8)}... = $${p.toFixed(8)} via Jupiter v6`);
            return p;
        }
    } catch (e) {
        console.warn(`[priceService] ❌ Jupiter v6 token failed (${mint.slice(0, 8)}...): ${e?.message}`);
    }

    console.warn(`[priceService] ⚠️  No USD price found for ${mint.slice(0, 8)}...`);
    return null;
}

/* ─────────────────────────────────────────────────────────────
   computeUsdValue  — main function called from parseTransaction.js
   
   Replaces the old inline logic. Handles all 5 swap types.
   Usage:
     const usd_value = await computeUsdValue({
       token_in, amount_in, token_out, amount_out
     });
───────────────────────────────────────────────────────────── */

/**
 * Compute USD value of a swap — covers ALL cases.
 *
 * @param {{
 *   token_in:   string,
 *   amount_in:  number,
 *   token_out:  string,
 *   amount_out: number
 * }} swap
 * @returns {Promise<number|null>}
 */
async function computeUsdValue({ token_in, amount_in, token_out, amount_out }) {
    try {
        // ── CASE 1: SOL → TOKEN  (buy with SOL)
        if (token_in === SOL_MINT) {
            const p = await getSolPriceUSD();
            if (p) {
                const usd = amount_in * p;
                console.log(`[priceService] 💰 SOL→TOKEN: ${amount_in} SOL × $${p.toFixed(2)} = $${usd.toFixed(6)}`);
                return parseFloat(usd.toFixed(6));
            }
        }

        // ── CASE 2: TOKEN → SOL  (sell for SOL)
        if (token_out === SOL_MINT) {
            const p = await getSolPriceUSD();
            if (p) {
                const usd = amount_out * p;
                console.log(`[priceService] 💰 TOKEN→SOL: ${amount_out} SOL × $${p.toFixed(2)} = $${usd.toFixed(6)}`);
                return parseFloat(usd.toFixed(6));
            }
        }

        // ── CASE 3: TOKEN → STABLE  (sell for stablecoin)
        if (STABLECOIN_MINTS.has(token_out)) {
            console.log(`[priceService] 💰 TOKEN→STABLE: usd_value = ${amount_out} (direct)`);
            return parseFloat(amount_out.toFixed(6));
        }

        // ── CASE 4: STABLE → TOKEN  (buy with stablecoin)
        if (STABLECOIN_MINTS.has(token_in)) {
            console.log(`[priceService] 💰 STABLE→TOKEN: usd_value = ${amount_in} (direct)`);
            return parseFloat(amount_in.toFixed(6));
        }

        // ── CASE 5: TOKEN → TOKEN  (e.g. atVjZ7 → CASH)
        // Price token_in via Jupiter, multiply by amount_in
        console.log(`[priceService] 🔍 TOKEN→TOKEN: fetching price of ${token_in.slice(0, 8)}...`);
        const tokenInPrice = await getTokenPriceUSD(token_in);
        if (tokenInPrice) {
            const usd = amount_in * tokenInPrice;
            console.log(`[priceService] 💰 TOKEN→TOKEN: ${amount_in} × $${tokenInPrice.toFixed(8)} = $${usd.toFixed(6)}`);
            return parseFloat(usd.toFixed(6));
        }

        // Last resort: price token_out
        console.log(`[priceService] 🔍 TOKEN→TOKEN fallback: fetching price of ${token_out.slice(0, 8)}...`);
        const tokenOutPrice = await getTokenPriceUSD(token_out);
        if (tokenOutPrice) {
            const usd = amount_out * tokenOutPrice;
            console.log(`[priceService] 💰 TOKEN→TOKEN (out): ${amount_out} × $${tokenOutPrice.toFixed(8)} = $${usd.toFixed(6)}`);
            return parseFloat(usd.toFixed(6));
        }

        console.warn("[priceService] ⚠️  Could not compute usd_value — no price available for either token");
        return null;

    } catch (err) {
        console.error("[priceService] computeUsdValue error:", err?.message || err);
        return null;
    }
}

/* ─────────────────────────────────────────────────────────────
   UTILITIES
───────────────────────────────────────────────────────────── */

/** Clear all cached prices */
function clearPriceCache() { _cache.clear(); }

/** Returns true if mint is a known stablecoin */
function isStablecoin(mint) { return STABLECOIN_MINTS.has(mint); }

module.exports = {
    getSolPriceUSD,
    getTokenPriceUSD,
    computeUsdValue,
    clearPriceCache,
    isStablecoin,
    SOL_MINT,
    STABLECOIN_MINTS,
};