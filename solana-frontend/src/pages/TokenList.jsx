import { useEffect, useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getTokensByDex } from "../api";
import {
    formatUsd,
    formatPrice,
    timeAgo,
    shortenAddress,
} from "../utils/format";

export default function TokenList() {
    const { dex } = useParams();
    const navigate = useNavigate();
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        setLoading(true);
        getTokensByDex(dex)
            .then(setTokens)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [dex]);

    const filtered = useMemo(() => {
        if (!search.trim()) return tokens;
        const q = search.toLowerCase();
        return tokens.filter(
            (t) =>
                (t.token_symbol && t.token_symbol.toLowerCase().includes(q)) ||
                (t.token_mint && t.token_mint.toLowerCase().includes(q))
        );
    }, [tokens, search]);

    const isPump = dex === "PumpSwap";

    return (
        <div className="page">
            {/* ── Header ── */}
            <div className="tokenlist__header">
                <div className="tokenlist__info">
                    <div className="tokenlist__breadcrumb">
                        <Link to="/">Home</Link> / <Link to="/solana">Solana</Link> /{" "}
                        <span>{dex}</span>
                    </div>
                    <h1 className="tokenlist__title">{dex} Tokens</h1>
                </div>
                <div className="tokenlist__search-wrap">
                    <span className="tokenlist__search-icon">⌕</span>
                    <input
                        className="tokenlist__search"
                        placeholder="Search symbol or mint…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        id="token-search"
                    />
                </div>
            </div>

            {/* ── Table ── */}
            <div className="table-wrap">
                <table className="data-table" id="token-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Token</th>
                            <th>Price</th>
                            <th>Volume</th>
                            <th>Txns</th>
                            <th>Buys</th>
                            <th>Sells</th>
                            <th>Last Trade</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading
                            ? Array.from({ length: 10 }).map((_, i) => (
                                <tr key={i} className="skeleton-row">
                                    <td><div className="skel-bar skel-bar--w40" /></td>
                                    <td><div className="skel-bar skel-bar--w120" /></td>
                                    <td><div className="skel-bar skel-bar--w80" /></td>
                                    <td><div className="skel-bar skel-bar--w80" /></td>
                                    <td><div className="skel-bar skel-bar--w60" /></td>
                                    <td><div className="skel-bar skel-bar--w60" /></td>
                                    <td><div className="skel-bar skel-bar--w60" /></td>
                                    <td><div className="skel-bar skel-bar--w100" /></td>
                                </tr>
                            ))
                            : filtered.length === 0
                                ? (
                                    <tr>
                                        <td colSpan={8}>
                                            <div className="empty-state">
                                                <div className="empty-state__icon">🔍</div>
                                                <div className="empty-state__text">
                                                    {search ? "No tokens match your search" : "No tokens found for this DEX"}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )
                                : filtered.map((t, i) => (
                                    <tr
                                        key={t.token_mint}
                                        onClick={() =>
                                            navigate(`/solana/${dex}/${t.token_mint}`, {
                                                state: { tokenData: t },
                                            })
                                        }
                                        className="fade-up"
                                        style={{ animationDelay: `${i * 30}ms` }}
                                    >
                                        <td className="text-muted">{i + 1}</td>
                                        <td>
                                            <div className="token-info">
                                                <span className="token-info__symbol">{t.token_symbol || "???"}</span>
                                                <span className="token-info__mint">
                                                    {shortenAddress(t.token_mint)}
                                                </span>
                                            </div>
                                        </td>
                                        <td>{formatPrice(t.price_latest)}</td>
                                        <td>{formatUsd(t.volume_usd)}</td>
                                        <td>{(t.txn_count ?? 0).toLocaleString()}</td>
                                        <td className="text-green">{(t.buys ?? 0).toLocaleString()}</td>
                                        <td className="text-red">{(t.sells ?? 0).toLocaleString()}</td>
                                        <td className="text-secondary">{timeAgo(t.last_trade)}</td>
                                    </tr>
                                ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
