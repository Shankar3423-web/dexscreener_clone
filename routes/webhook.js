const express = require("express");
const router = express.Router();
const transactionQueue = require("../queues/transactionQueue");

/*
============================================================
POST /api/webhook/helius

Normal Helius webhook payload:
[
  {
    signature: "...",
    ...
  }
]

We:
1. Respond immediately (important for Helius)
2. Push signatures into Redis queue
3. Worker processes at 2/sec (rate limited)
============================================================
*/

router.post("/helius", async (req, res) => {
    try {
        console.log("🔥 Webhook received");

        const payload = req.body;

        if (!payload || !Array.isArray(payload)) {
            return res.status(400).json({
                error: "Invalid payload format",
            });
        }

        // 🔥 Respond immediately (DO NOT WAIT FOR PROCESSING)
        res.status(200).json({ status: "ok" });

        let addedCount = 0;

        for (const tx of payload) {
            try {
                const signature = tx?.signature;
                if (!signature) continue;

                // Push job to Redis queue
                await transactionQueue.add("decode", {
                    signature,
                }, {
                    attempts: 3, // retry 3 times if fails
                    backoff: {
                        type: "exponential",
                        delay: 2000, // retry after 2s
                    },
                });

                addedCount++;

            } catch (err) {
                console.error("❌ Failed to queue job:", err.message);
            }
        }

        console.log(`📦 Added ${addedCount} jobs to Redis queue`);

    } catch (err) {
        console.error("🔥 Webhook Fatal Error:", err.message);
    }
});

module.exports = router;