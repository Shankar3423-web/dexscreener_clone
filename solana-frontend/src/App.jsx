import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import DexList from "./pages/DexList";
import TokenList from "./pages/TokenList";
import TokenDetail from "./pages/TokenDetail";

export default function App() {
    return (
        <>
            <Navbar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/solana" element={<DexList />} />
                <Route path="/solana/:dex" element={<TokenList />} />
                <Route path="/solana/:dex/:tokenMint" element={<TokenDetail />} />
            </Routes>
        </>
    );
}
