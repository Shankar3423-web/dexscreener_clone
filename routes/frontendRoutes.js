const router = require("express").Router();
const pool = require("../config/db");

// ─── GET /api/dexes ─────────────────────────────────────────────────
// Returns aggregated stats for each DEX (PumpSwap, Meteora)
router.get("/dexes", async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT
                dex,
                COUNT(*)::int                                       AS txn_count,
                COUNT(DISTINCT
                    CASE
                        WHEN swap_side = 'buy'  THEN token_out
                        WHEN swap_side = 'sell' THEN token_in
                    END
                )::int                                              AS token_count,
                COALESCE(SUM(usd_value), 0)::float                  AS volume_usd,
                MAX(block_time)                                      AS last_seen
            FROM swaps
            WHERE dex IN ('PumpSwap', 'Meteora')
            GROUP BY dex
            ORDER BY volume_usd DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error("GET /api/dexes error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ─── GET /api/tokens?dex=PumpSwap ───────────────────────────────────
// Returns distinct tokens traded on a given DEX with stats
router.get("/tokens", async (req, res) => {
    const { dex } = req.query;
    if (!dex) return res.status(400).json({ error: "dex query param required" });

    try {
        const { rows } = await pool.query(
            `
            WITH token_swaps AS (
                SELECT
                    CASE
                        WHEN swap_side = 'buy'  THEN token_out
                        WHEN swap_side = 'sell' THEN token_in
                    END AS token_mint,
                    CASE
                        WHEN swap_side = 'buy'  THEN token_out_symbol
                        WHEN swap_side = 'sell' THEN token_in_symbol
                    END AS token_symbol,
                    swap_side,
                    usd_value,
                    price,
                    block_time
                FROM swaps
                WHERE dex = $1
            )
            SELECT
                token_mint,
                MAX(token_symbol)                                       AS token_symbol,
                COUNT(*)::int                                           AS txn_count,
                COUNT(*) FILTER (WHERE swap_side = 'buy')::int          AS buys,
                COUNT(*) FILTER (WHERE swap_side = 'sell')::int         AS sells,
                COALESCE(SUM(usd_value), 0)::float                      AS volume_usd,
                (
                    SELECT price FROM swaps s2
                    WHERE s2.dex = $1
                      AND (
                          (s2.swap_side = 'buy'  AND s2.token_out = token_swaps.token_mint)
                       OR (s2.swap_side = 'sell' AND s2.token_in  = token_swaps.token_mint)
                      )
                    ORDER BY s2.block_time DESC
                    LIMIT 1
                )::float                                                AS price_latest,
                MAX(block_time)                                         AS last_trade
            FROM token_swaps
            WHERE token_mint IS NOT NULL
            GROUP BY token_mint
            ORDER BY volume_usd DESC
            LIMIT 100
            `,
            [dex]
        );
        res.json(rows);
    } catch (err) {
        console.error("GET /api/tokens error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ─── GET /api/txns?token=MINT&dex=PumpSwap&limit=50 ────────────────
// Returns recent transactions for a specific token on a given DEX
router.get("/txns", async (req, res) => {
    const { token, dex, limit } = req.query;
    if (!token) return res.status(400).json({ error: "token query param required" });

    const safeLimit = Math.min(parseInt(limit, 10) || 50, 200);

    try {
        let query = `
            SELECT *
            FROM swaps
            WHERE (token_in = $1 OR token_out = $1)
        `;
        const params = [token];

        if (dex) {
            params.push(dex);
            query += ` AND dex = $${params.length}`;
        }

        query += ` ORDER BY block_time DESC LIMIT $${params.length + 1}`;
        params.push(safeLimit);

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error("GET /api/txns error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
