const express = require('express');
const axios = require('axios');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();
app.use(express.json());
app.use('/transaction', transactionRoutes);

const server = app.listen(5001, async () => {
    try {
        console.log("Testing expanded DEX mapping and log-based fallback...");
        const res = await axios.post('http://localhost:5001/transaction', {
            signature: 'NiBCKngdhr52ckkfSnpEA9PTr4Dr1P7boTU1r4MWaNQNf95EuDj23XTEWXbpjYZi7SAi8V1tNm3UDtGiJuXLHar'
        });
        console.log("RESULT:");
        console.log(JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error(err.response.data);
        }
    } finally {
        server.close();
        process.exit(0);
    }
});
