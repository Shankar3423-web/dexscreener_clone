import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDexes } from "../api";
import { formatUsd } from "../utils/format";

const DEX_META = {
    PumpSwap: {
        cls: "pump",
        icon: "P",
        desc: "Solana's meme-token swap protocol. Fast, permissionless token launches with bonding-curve pricing.",
    },
    Meteora: {
        cls: "meteora",
        icon: "M",
        desc: "Dynamic liquidity protocol with concentrated liquidity pools and DLMM for capital-efficient trading.",
    },
};

export default function DexList() {
    const [dexes, setDexes] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        getDexes()
            .then(setDexes)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Make sure we always show both cards even if API has partial data
    const dexNames = ["PumpSwap", "Meteora"];

    return (
        <div className="page">
            <div className="dexlist__header">
                <div className="dexlist__breadcrumb">
                    <Link to="/">Home</Link> / <span>Solana</span>
                </div>
                <h1 className="dexlist__title">Solana DEXes</h1>
            </div>

            <div className="dexlist__grid">
                {dexNames.map((name) => {
                    const data = dexes.find((d) => d.dex === name);
                    const meta = DEX_META[name];
                    return (
                        <div
                            key={name}
                            className={`dex-card dex-card--${meta.cls} ${loading ? "dex-card--skeleton" : ""}`}
                            onClick={() => navigate(`/solana/${name}`)}
                            id={`dex-card-${meta.cls}`}
                        >
                            <div className="dex-card__top">
                                <div className="dex-card__name-group">
                                    <div className="dex-card__icon">{meta.icon}</div>
                                    <div className="dex-card__name">{name}</div>
                                </div>
                                <div className="dex-card__live">
                                    <span className="dex-card__live-dot" />
                                    Live
                                </div>
                            </div>
                            <div className="dex-card__desc">{meta.desc}</div>
                            <div className="dex-card__stats">
                                <div className="dex-stat">
                                    <div className="dex-stat__value">
                                        {loading ? "—" : (data?.txn_count ?? 0).toLocaleString()}
                                    </div>
                                    <div className="dex-stat__label">Transactions</div>
                                </div>
                                <div className="dex-stat">
                                    <div className="dex-stat__value">
                                        {loading ? "—" : (data?.token_count ?? 0).toLocaleString()}
                                    </div>
                                    <div className="dex-stat__label">Tokens</div>
                                </div>
                                <div className="dex-stat">
                                    <div className="dex-stat__value">
                                        {loading ? "—" : formatUsd(data?.volume_usd ?? 0)}
                                    </div>
                                    <div className="dex-stat__label">Volume</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
