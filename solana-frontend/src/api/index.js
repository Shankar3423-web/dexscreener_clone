import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "https://dexscreener-clone.onrender.com",
});

export async function getDexes() {
    const { data } = await api.get("/api/dexes");
    return data;
}

export async function getTokensByDex(dex) {
    const { data } = await api.get("/api/tokens", { params: { dex } });
    return data;
}

export async function getTokenTxns(tokenMint, dex, limit = 50) {
    const { data } = await api.get("/api/txns", {
        params: { token: tokenMint, dex, limit },
    });
    return data;
}
