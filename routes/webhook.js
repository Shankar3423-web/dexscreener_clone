const express = require("express");
const router = express.Router();
const { decodeAndStore } = require("../services/transactionDecoder");

/*
============================================================
POST /api/webhook/helius

Helius sends Enhanced transaction payload here.
Payload = Array of transaction objects.
============================================================
*/

router.post("/helius", async (req, res) => {
    try {
        console.log("🔥 Webhook received");

        const payload = req.body;

        if (!payload || !Array.isArray(payload)) {
            return res.status(400).json({ error: "Invalid payload format" });
        }

        // IMPORTANT:
        // Always respond fast to Helius
        // Do NOT block webhook for too long
        res.status(200).json({ status: "ok" });

        // Process transactions asynchronously
        for (const tx of payload) {
            try {
                const signature = tx.signature;

                if (!signature) continue;

                console.log("🔎 Decoding signature:", signature);

                await decodeAndStore(signature);

                console.log("✅ Stored:", signature);

            } catch (err) {
                console.error("❌ Decode failed:", err.message);
                // Do NOT throw — continue processing next tx
            }
        }

    } catch (err) {
        console.error("🔥 Webhook Fatal Error:", err.message);
    }
});

module.exports = router;