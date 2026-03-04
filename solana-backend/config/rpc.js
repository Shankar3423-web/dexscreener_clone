require("dotenv").config();

const RPC_URL =
    process.env.HELIUS_BASE_URL + process.env.HELIUS_API_KEY;

module.exports = RPC_URL;