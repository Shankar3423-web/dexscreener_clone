const { Worker } = require("bullmq");
const connection = require("../config/redis");
const { decodeAndStore } = require("../services/transactionDecoder");

const worker = new Worker(
    "transactionQueue",
    async (job) => {
        const { signature } = job.data;
        await decodeAndStore(signature);
    },
    {
        connection,
        concurrency: 2,
        limiter: {
            max: 2,       // 2 jobs
            duration: 1000 // per 1 second
        }
    }
);

worker.on("completed", (job) => {
    console.log("✅ Completed:", job.data.signature);
});

worker.on("failed", (job, err) => {
    console.error("❌ Failed:", err.message);
});