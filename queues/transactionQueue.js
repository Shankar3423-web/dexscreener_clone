const { Queue } = require("bullmq");
const connection = require("../config/redis");

const transactionQueue = new Queue("transactionQueue", {
    connection,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
    },
});

module.exports = transactionQueue;