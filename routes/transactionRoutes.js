const express = require("express");
const axios = require("axios");
const RPC_URL = require("../config/rpc");
const pool = require("../config/db");
const { computeUsdValue } = require("../services/priceService");

const router = express.Router();

/* ============================================================
   CONSTANTS
============================================================ */

const SOL_MINT = "So11111111111111111111111111111111111111112";

const STABLECOINS = new Set([
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",  // USDT
    "USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX",  // USDH
    "UXPhBoR3qG4UCiGNJfV7MqhHyFqKN68g45GoYvAeL2m",  // UXD
    "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr", // EURC
]);

// SOL + all stablecoins = "quote assets" for buy/sell classification
const QUOTE_ASSETS = new Set([SOL_MINT, ...STABLECOINS]);

const KNOWN_SYMBOLS = {
    [SOL_MINT]: "SOL",
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
    "USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX": "USDH",
    "UXPhBoR3qG4UCiGNJfV7MqhHyFqKN68g45GoYvAeL2m": "UXD",
    "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr": "EURC",
    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So": "mSOL",
    "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj": "stSOL",
    "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1": "bSOL",
    "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn": "JitoSOL",
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "BONK",
    "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk": "WEN",
    "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": "JUP",
    "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm": "WIF",
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": "RAY",
    "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE": "ORCA",
    "MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey": "MNDE",
    "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof": "RNDR",
    "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3": "PYTH",
    "nosXBVoaCTtYdLvKY6Csb4AC8JCdQKKAaWYtx2ZMoo7": "NOS",
};

// Known DEX programs — values are display names
const DEX_PROGRAMS = {
    // Raydium
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium",
    "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK": "Raydium",
    "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C": "Raydium",
    "5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h": "Raydium",
    "routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS": "Raydium",
    // Meteora
    "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo": "Meteora",
    "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EkdZtung": "Meteora",
    "M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K": "Meteora",
    // Orca
    "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc": "Orca",
    "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP": "Orca",
    // PumpSwap / Pump.fun
    "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA": "PumpSwap",
    "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P": "Pump.fun",
    // Jupiter (aggregator — lowest priority, used only as fallback)
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": "Jupiter",
    "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB": "Jupiter",
    "JUP3c2Uh3WA4Ng34tw6kPd2G4C5BB21Xo84punobum": "Jupiter",
    // Others
    "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX": "OpenBook",
    "opnb2LAfJYbRMAHHvqjCwQxanZn7n17ZGuNpNgYnXVl": "OpenBook",
    "EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S": "Lifinity",
    "AMM55ShdkoioYAbeRyr69EKkblxThdmoqefwAmsoudb": "Aldrin",
    "6MLxLqofvEkLjHLoIUcULB7P7vGQCJMDqHUDLpNiR1g": "Crema",
    "SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr": "Saros",
    "SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ": "Saber",
    "Dooar9JkhdZ7J3LHN3A7YCuoGRUggXhQaG4kijfLGU2j": "StepN",
    "7WduLbRfYhTJktjLw5FDEyrqoEv61aTTCuGAetgLjzN5": "GooseFX",
    "HyaB3W9q6XdA5xwpU4XnSZV94htfmbmqJXZcEbRaJuyz": "Invariant",
    "FLUXubRmkEi2q6K3Y9kBPg9248ggaZVsoSFhtJHSrm1X": "FluxBeam",
};

// Program IDs to exclude when scanning for the real trader wallet (Tier 2)
const EXCLUDED_OWNERS = new Set([
    ...Object.keys(DEX_PROGRAMS),
    "11111111111111111111111111111111",
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    "ComputeBudget111111111111111111111111111111",
    "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
    "pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ",
]);

// Fallback DEX priority (specific AMMs before aggregators)
const DEX_PRIORITY = [
    "Raydium", "Meteora", "Orca", "PumpSwap", "Pump.fun",
    "OpenBook", "Lifinity", "Saber", "Aldrin", "Crema",
    "FluxBeam", "GooseFX", "Invariant", "StepN", "Saros", "Jupiter",
];

/* ============================================================
   HELPERS
============================================================ */

function uiAmount(rawStr, decimals) {
    if (!rawStr || rawStr === "0") return 0;
    return Number(BigInt(rawStr)) / Math.pow(10, decimals);
}

function absBigInt(n) {
    return n < 0n ? -n : n;
}

function resolveSymbol(mint) {
    return KNOWN_SYMBOLS[mint] || mint.slice(0, 6).toUpperCase();
}

/* ============================================================
   DEX DETECTION

   Primary method — Transfer-based:
   Walks inner instructions to find the DEX program whose instruction
   DIRECTLY contains the TransferChecked for token_in or token_out.

   This is the only correct method for multi-hop routes:
     Jupiter → Raydium → Meteora
   If user bought TOKEN via Meteora (the final leg), the TransferChecked
   that moved TOKEN into the user's ATA was a child of the Meteora
   instruction, NOT Jupiter. So we return Meteora.

   Implementation detail — "stackHeight parent" rule:
   Each inner instruction has a stackHeight. The DEX that "owns" a
   transfer at stackHeight N is the most recent DEX instruction seen
   at stackHeight N-1 within the same group (same top-level instruction).

   We prefer the DEX of the token_out transfer (the leg that produced
   the token the user received) because DexScreener labels trades by
   the pool where the output was generated.

   Fallback method — program scan:
   If no TransferChecked involves our mints (e.g. native SOL swaps),
   scan all instruction programIds and return the most specific DEX
   found (AMMs ranked above aggregators like Jupiter).
============================================================ */

function detectDexFromTransfers(innerInstructions, tokenInMint, tokenOutMint) {
    let dexForTokenIn = null;
    let dexForTokenOut = null;

    for (const group of (innerInstructions || [])) {
        // dexStack: stackHeight → { dex, pid }
        // Updated whenever we encounter a DEX program instruction
        const dexStack = new Map();

        for (const ix of (group.instructions || [])) {
            const sh = ix.stackHeight || 1;
            const pid = ix.programId;

            // Record this DEX at its stackHeight so child instructions can reference it
            if (pid && DEX_PROGRAMS[pid]) {
                dexStack.set(sh, { dex: DEX_PROGRAMS[pid], pid });
            }

            // Only process parsed token transfer instructions
            const parsed = ix.parsed;
            if (!parsed) continue;
            const type = parsed.type;
            if (type !== "transfer" && type !== "transferChecked") continue;

            const info = parsed.info;
            const mint = info.mint || null;
            const amt = BigInt(info.tokenAmount?.amount ?? info.amount ?? "0");
            if (amt === 0n || !mint) continue;

            // Find the DEX that is the immediate parent (stackHeight - 1)
            const parentDex = dexStack.get(sh - 1);
            if (!parentDex) continue;

            // Capture the first DEX seen for each mint direction
            if (mint === tokenInMint && !dexForTokenIn) dexForTokenIn = parentDex;
            if (mint === tokenOutMint && !dexForTokenOut) dexForTokenOut = parentDex;
        }
    }

    // Prefer the DEX of the token_out leg — this is what DexScreener reports
    return dexForTokenOut || dexForTokenIn || null;
}

function detectDexFallback(message, innerInstructions) {
    const found = new Map(); // pid → dexName

    const check = (ix) => {
        const pid = ix?.programId;
        if (pid && DEX_PROGRAMS[pid]) found.set(pid, DEX_PROGRAMS[pid]);
    };

    (message?.instructions || []).forEach(check);
    (innerInstructions || []).forEach(g => (g.instructions || []).forEach(check));

    if (!found.size) return null;

    // Return the most-specific DEX (AMM preferred over aggregator)
    for (const name of DEX_PRIORITY) {
        for (const [pid, dexName] of found) {
            if (dexName === name) return { dex: name, pid };
        }
    }

    const [pid, dex] = [...found.entries()][0];
    return { dex, pid };
}

/* ============================================================
   TOKEN BALANCE UTILITIES
============================================================ */

function computeTokenChanges(owner, preTokenBalances, postTokenBalances) {
    const tokenMap = new Map();

    for (const pre of (preTokenBalances || [])) {
        if (pre.owner !== owner) continue;
        tokenMap.set(pre.accountIndex, {
            mint: pre.mint,
            decimals: pre.uiTokenAmount.decimals,
            before: BigInt(pre.uiTokenAmount.amount || "0"),
            after: 0n,
        });
    }
    for (const post of (postTokenBalances || [])) {
        if (post.owner !== owner) continue;
        if (tokenMap.has(post.accountIndex)) {
            tokenMap.get(post.accountIndex).after = BigInt(post.uiTokenAmount.amount || "0");
        } else {
            tokenMap.set(post.accountIndex, {
                mint: post.mint,
                decimals: post.uiTokenAmount.decimals,
                before: 0n,
                after: BigInt(post.uiTokenAmount.amount || "0"),
            });
        }
    }

    // Aggregate per mint (handles wallets with multiple ATAs of the same token)
    const mintChanges = new Map();
    for (const [, v] of tokenMap) {
        const diff = v.after - v.before;
        if (diff === 0n) continue;
        if (mintChanges.has(v.mint)) {
            mintChanges.get(v.mint).diff += diff;
        } else {
            mintChanges.set(v.mint, { mint: v.mint, decimals: v.decimals, diff });
        }
    }
    return mintChanges;
}

/**
 * Merge net SOL lamport change into the mintChanges map.
 * Restores the network fee so we capture only the swap's SOL delta.
 *
 * WSOL merge: if a WSOL ATA change already exists (from computeTokenChanges),
 * we add the lamport delta to it rather than creating a duplicate SOL entry.
 * This prevents double-counting when a wallet both holds a WSOL ATA and
 * has native lamport changes from wrapping/unwrapping SOL.
 */
function attachSolDiff(owner, mintChanges, accountKeys, preLamports, postLamports, fee) {
    const idx = accountKeys.findIndex(k => k.pubkey === owner);
    if (idx === -1) return;
    const rawDiff = BigInt(postLamports[idx] || 0) - BigInt(preLamports[idx] || 0);
    const swapDiff = rawDiff + BigInt(fee);
    if (swapDiff === 0n) return;

    if (mintChanges.has(SOL_MINT)) {
        mintChanges.get(SOL_MINT).diff += swapDiff;
        if (mintChanges.get(SOL_MINT).diff === 0n) mintChanges.delete(SOL_MINT);
    } else {
        mintChanges.set(SOL_MINT, { mint: SOL_MINT, decimals: 9, diff: swapDiff });
    }
}

/* ============================================================
   TRADER RESOLUTION — 3-Tier

   Tier 1 — Signers with bidirectional balance changes
     Normal user wallets; fee-payer also owns the token ATAs.

   Tier 2 — Non-signer token-balance owners with bidirectional changes
     Covers trading frontends (Photon, Trojan, BullX, Maestro, etc.)
     where the front-end bot signs the tx but the real user wallet is
     a non-signer. The bot's ATAs flash 0→X→0 (net zero). The user's
     ATA shows a clean outflow and inflow. We exclude known DEX/system
     program IDs to avoid picking liquidity pool vault accounts, which
     also have bidirectional changes (they are the AMM counterparty).

   Tier 3 — MEV / arbitrage
     No owner has a net directional swap (all accounts either break even,
     only gain, or only lose). Triangular arb, sandwiches, flash loans.
     Flag isMev = true so the caller can reject the record.
============================================================ */

function resolveTraderAndChanges(message, meta) {
    const accountKeys = message?.accountKeys || [];
    const preLamports = meta?.preBalances || [];
    const postLamports = meta?.postBalances || [];
    const preTokenBal = meta?.preTokenBalances || [];
    const postTokenBal = meta?.postTokenBalances || [];
    const fee = meta?.fee || 0;

    const signerSet = new Set(
        accountKeys.filter(k => k.signer === true).map(k => k.pubkey)
    );
    const signers = [...signerSet];

    if (!signers.length) return { trader: null, changes: new Map(), isMev: false };

    /* ── Tier 1: signers ── */
    for (const signer of signers) {
        const changes = computeTokenChanges(signer, preTokenBal, postTokenBal);
        attachSolDiff(signer, changes, accountKeys, preLamports, postLamports, fee);
        const hasNeg = [...changes.values()].some(c => c.diff < 0n);
        const hasPos = [...changes.values()].some(c => c.diff > 0n);
        if (hasNeg && hasPos) return { trader: signer, changes, isMev: false };
    }

    /* ── Tier 2: non-signer token-balance owners ── */
    const allOwners = new Set([
        ...(preTokenBal || []).map(b => b.owner),
        ...(postTokenBal || []).map(b => b.owner),
    ]);
    for (const excl of [...signerSet, ...EXCLUDED_OWNERS]) allOwners.delete(excl);

    for (const owner of allOwners) {
        const changes = computeTokenChanges(owner, preTokenBal, postTokenBal);
        // Non-signers don't pay the network fee — no lamport correction needed
        const hasNeg = [...changes.values()].some(c => c.diff < 0n);
        const hasPos = [...changes.values()].some(c => c.diff > 0n);
        if (hasNeg && hasPos) return { trader: owner, changes, isMev: false };
    }

    /* ── Tier 3: MEV / arbitrage ── */
    const primarySigner = signers[0];
    const changes = computeTokenChanges(primarySigner, preTokenBal, postTokenBal);
    attachSolDiff(primarySigner, changes, accountKeys, preLamports, postLamports, fee);
    return { trader: primarySigner, changes, isMev: true };
}

/* ============================================================
   SWAP SIDE

   Rule (matches DexScreener exactly):
     SELL = user received a quote asset (SOL or stablecoin)
     BUY  = user received a non-quote asset (any other token)

   This covers all cases:
     SOL     → TOKEN   : buy
     USDC    → TOKEN   : buy
     TOKEN   → SOL     : sell
     TOKEN   → USDC    : sell
     TOKEN_A → TOKEN_B : buy  (user acquired a new token)

   "swap" is never returned — every trade is either a buy or a sell.
============================================================ */

function classifySwapSide(tokenOut) {
    return QUOTE_ASSETS.has(tokenOut) ? "sell" : "buy";
}

/* ============================================================
   ROUTE  POST /api/parse-transaction
============================================================ */

router.post("/", async (req, res) => {
    try {
        const { signature } = req.body;
        if (!signature || typeof signature !== "string")
            return res.status(400).json({ error: "Signature required" });

        /* ── Fetch transaction ── */
        const rpc = await axios.post(RPC_URL, {
            jsonrpc: "2.0",
            id: 1,
            method: "getTransaction",
            params: [signature, {
                encoding: "jsonParsed",
                maxSupportedTransactionVersion: 0,
                commitment: "confirmed",
            }],
        });

        const tx = rpc.data?.result;
        if (!tx)
            return res.status(404).json({ error: "Transaction not found or not yet confirmed" });

        if (tx.meta?.err)
            return res.status(400).json({
                error: "Transaction failed on-chain",
                onChainError: tx.meta.err,
            });

        const slot = tx.slot;
        const blockTime = tx.blockTime;
        const fee = tx.meta?.fee || 0;
        const message = tx.transaction?.message;
        const inner = tx.meta?.innerInstructions || [];

        if (!message)
            return res.status(400).json({ error: "Could not parse transaction message" });

        /* ── Resolve trader ── */
        const { trader, changes, isMev } = resolveTraderAndChanges(message, tx.meta);

        if (isMev) {
            return res.status(400).json({
                error: "MEV/arbitrage transaction — no net user swap to decode",
                hint: "Triangular arbitrage or sandwich attack detected. " +
                    "All signer token accounts net to zero.",
                wallet: trader,
            });
        }

        if (!changes.size)
            return res.status(400).json({ error: "No balance changes detected" });

        /* ── Identify token_in / token_out ── */
        const negatives = [...changes.values()].filter(c => c.diff < 0n);
        const positives = [...changes.values()].filter(c => c.diff > 0n);

        if (!negatives.length || !positives.length)
            return res.status(400).json({
                error: "Invalid swap structure — could not identify token_in / token_out",
            });

        // Largest outflow = token_in   |   Largest inflow = token_out
        const inData = negatives.reduce((a, b) => absBigInt(a.diff) > absBigInt(b.diff) ? a : b);
        const outData = positives.reduce((a, b) => a.diff > b.diff ? a : b);

        const token_in = inData.mint;
        const token_in_decimals = inData.decimals;
        const amount_in = uiAmount(String(absBigInt(inData.diff)), token_in_decimals);
        const token_in_symbol = resolveSymbol(token_in);

        const token_out = outData.mint;
        const token_out_decimals = outData.decimals;
        const amount_out = uiAmount(String(outData.diff), token_out_decimals);
        const token_out_symbol = resolveSymbol(token_out);

        /* ── DEX detection ── */
        // Primary: trace which DEX program's instruction contained the transfer
        // of token_in or token_out. Correctly identifies the actual AMM used
        // even in multi-hop Jupiter routes.
        const dexFromTransfer = detectDexFromTransfers(inner, token_in, token_out);

        // Fallback: scan all programIds (for native SOL swaps or unparsed formats)
        const dexFallback = !dexFromTransfer ? detectDexFallback(message, inner) : null;

        const dexResult = dexFromTransfer || dexFallback;
        if (!dexResult)
            return res.status(400).json({
                error: "Unsupported DEX — no known DEX program found in transaction",
            });

        const dex = dexResult.dex;
        const program_id = dexResult.pid;

        /* ── Swap side ── */
        const swap_side = classifySwapSide(token_out);

        /* ── Price (quote per base) ── */
        //   buy:            SOL/stable paid per unit of token received = amount_in / amount_out
        //   sell:           SOL/stable received per unit of token sold = amount_out / amount_in
        //   token-to-token: amount_in paid per unit of token_out       = amount_in / amount_out
        let price = null;
        if (amount_in > 0 && amount_out > 0) {
            price = swap_side === "sell"
                ? Number((amount_out / amount_in).toFixed(18))
                : Number((amount_in / amount_out).toFixed(18));
        }

        /* ── USD value ── */
        const usd_value = await computeUsdValue({ token_in, amount_in, token_out, amount_out });

        /* ── Persist ── */
        await pool.query(
            `INSERT INTO swaps (
                signature, slot, block_time,
                wallet, dex, program_id, swap_side,
                token_in,  token_in_symbol,  token_in_decimals,  amount_in,
                token_out, token_out_symbol, token_out_decimals, amount_out,
                price, usd_value, fee_lamports
            ) VALUES (
                $1, $2, to_timestamp($3),
                $4, $5, $6, $7,
                $8, $9, $10, $11,
                $12, $13, $14, $15,
                $16, $17, $18
            ) ON CONFLICT (signature) DO NOTHING`,
            [
                signature, slot, blockTime,
                trader, dex, program_id, swap_side,
                token_in, token_in_symbol, token_in_decimals, amount_in,
                token_out, token_out_symbol, token_out_decimals, amount_out,
                price, usd_value, fee,
            ]
        );

        /* ── Response ── */
        return res.json({
            signature,
            slot,
            block_time: blockTime,
            wallet: trader,
            dex,
            program_id,
            swap_side,
            token_in,
            token_in_symbol,
            token_in_decimals,
            amount_in,
            token_out,
            token_out_symbol,
            token_out_decimals,
            amount_out,
            price,
            usd_value,
            fee_lamports: fee,
        });

    } catch (err) {
        console.error("🔥 PROCESSING ERROR:", err);
        return res.status(500).json({
            error: "Processing failed",
            details: err?.message || "Unknown error",
        });
    }
});

module.exports = router;