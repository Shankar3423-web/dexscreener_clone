require("dotenv").config();
const express = require("express");
const cors = require("cors");

require("./config/db");
require("./workers/transactionWorker");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "Backend running successfully 🚀" });
});

app.use("/transaction", require("./routes/transactionRoutes"));

const webhookRoutes = require("./routes/webhook");
app.use("/api/webhook", webhookRoutes);

app.use("/api", require("./routes/frontendRoutes"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});