const { Pool } = require("pg");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5433,

    // Required for Render / Neon / Supabase / Cloud DBs
    ssl: isProduction
        ? { rejectUnauthorized: false }
        : false,

    // Better production defaults
    max: 20, // max clients in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

/*
  Instead of pool.connect(), use a test query.
  This prevents hanging connections in production.
*/
pool.query("SELECT 1")
    .then(() => {
        console.log("✅ PostgreSQL Connected");
    })
    .catch((err) => {
        console.error("❌ DB Connection Error:", err.message);
    });

module.exports = pool;