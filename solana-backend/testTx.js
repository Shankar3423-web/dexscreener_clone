const axios = require('axios');

async function test() {
    try {
        const res = await axios.post('http://localhost:5000/transaction', {
            signature: 'NiBCKngdhr52ckkfSnpEA9PTr4Dr1P7boTU1r4MWaNQNf95EuDj23XTEWXbpjYZi7SAi8V1tNm3UDtGiJuXLHar'
        });
        console.log(JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error(err.response.data);
        }
    }
}

test();
