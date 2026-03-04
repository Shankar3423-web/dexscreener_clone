const express = require("express");
const { decodeAndStore } = require("../services/transactionDecoder");

const router = express.Router();

/*
============================================================
POST /api/parse-transaction

Manual testing endpoint.
Used for:
- Postman testing
- Debugging
- Manual signature decoding
============================================================
*/

router.post("/", async (req, res) => {
    try {
        const { signature } = req.body;

        if (!signature || typeof signature !== "string") {
            return res.status(400).json({
                error: "Signature required",
            });
        }

        const result = await decodeAndStore(signature);

        return res.status(200).json(result);

    } catch (err) {
        console.error("🔥 ROUTE ERROR:", err.message);

        /*
        Error Classification:
        - Known decoding issues → 400
        - Unexpected issues → 500
        */

        const knownErrors = [
            "Signature required",
            "Transaction not found or not yet confirmed",
            "Transaction failed on-chain",
            "Could not parse transaction message",
            "MEV/arbitrage transaction — no net user swap to decode",
            "No balance changes detected",
            "Invalid swap structure — could not identify token_in / token_out",
            "Unsupported DEX — no known DEX program found in transaction",
        ];

        if (knownErrors.includes(err.message)) {
            return res.status(400).json({
                error: err.message,
            });
        }

        return res.status(500).json({
            error: "Processing failed",
            details: err.message || "Unknown error",
        });
    }
});

module.exports = router;