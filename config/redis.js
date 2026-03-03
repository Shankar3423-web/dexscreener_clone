const IORedis = require("ioredis");

const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
});

connection.on("connect", () => {
    console.log("✅ Redis Connected");
});

connection.on("error", (err) => {
    console.error("❌ Redis Error:", err);
});

module.exports = connection;