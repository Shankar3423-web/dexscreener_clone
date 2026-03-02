const { Pool } = require("pg");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

let poolConfig;

/*
  If DATABASE_URL exists → use it (production standard)
  Else → fallback to individual DB_* variables (local dev)
*/
if (process.env.DATABASE_URL) {
    poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: isProduction
            ? { rejectUnauthorized: false }
            : false,
    };
} else {
    poolConfig = {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT
            ? Number(process.env.DB_PORT)
            : 5433,
        ssl: false,
    };
}

const pool = new Pool({
    ...poolConfig,

    // Production-safe pool settings
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

// Lightweight connection test (non-blocking)
pool.query("SELECT 1")
    .then(() => {
        console.log("✅ PostgreSQL Connected");
    })
    .catch((err) => {
        console.error("❌ DB Connection Error:", err.message);
    });

module.exports = pool;