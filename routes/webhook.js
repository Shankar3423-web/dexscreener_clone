const express = require("express");
const router = express.Router();

/*
  Helius will POST transactions here
*/
router.post("/helius", async (req, res) => {
    try {
        console.log("🔥 Webhook received");

        const payload = req.body;

        if (!payload || !Array.isArray(payload)) {
            return res.status(400).json({ error: "Invalid payload" });
        }

        // Helius sends array of transactions
        for (const tx of payload) {
            console.log("Signature:", tx.signature);
            // Later we will decode + store here
        }

        return res.status(200).json({ status: "ok" });

    } catch (err) {
        console.error("Webhook Error:", err.message);
        return res.status(500).json({ error: "Internal error" });
    }
});

module.exports = router;