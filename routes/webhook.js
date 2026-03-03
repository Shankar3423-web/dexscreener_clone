const express = require("express");
const router = express.Router();
const transactionQueue = require("../queues/transactionQueue");

router.post("/helius", async (req, res) => {
    try {
        console.log("🔥 Webhook received");

        let payload = req.body;

        if (!payload) {
            return res.status(400).json({
                error: "Empty payload",
            });
        }

        // Handle both formats:
        // 1. Direct array
        // 2. { data: [...] }
        if (!Array.isArray(payload)) {
            if (Array.isArray(payload.data)) {
                payload = payload.data;
            } else {
                return res.status(400).json({
                    error: "Invalid payload format",
                });
            }
        }

        // Respond immediately
        res.status(200).json({ status: "ok" });

        let addedCount = 0;

        for (const tx of payload) {
            try {
                const signature = tx?.signature;
                if (!signature) continue;

                await transactionQueue.add(
                    "decode",
                    { signature },
                    {
                        attempts: 3,
                        backoff: {
                            type: "exponential",
                            delay: 2000,
                        },
                        removeOnComplete: true,
                        removeOnFail: true,
                    }
                );

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