import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { getTokenTxns } from "../api";
import {
    formatUsd,
    formatPrice,
    formatTokenAmount,
    timeAgo,
    shortenAddress,
} from "../utils/format";

const FILTERS = ["ALL", "BUY", "SELL"];
const REFRESH_INTERVAL = 10_000; // 10 seconds

export default function TokenDetail() {
    const { dex, tokenMint } = useParams();
    const { state } = useLocation();
    const tokenData = state?.tokenData;

    const [txns, setTxns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL");
    const prevSigsRef = useRef(new Set());

    const fetchTxns = useCallback(async () => {
        try {
            const data = await getTokenTxns(tokenMint, dex, 50);
            setTxns(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [tokenMint, dex]);

    // Initial fetch
    useEffect(() => {
        setLoading(true);
        fetchTxns();
    }, [fetchTxns]);

    // Auto-refresh every 10s
    useEffect(() => {
        const id = setInterval(fetchTxns, REFRESH_INTERVAL);
        return () => clearInterval(id);
    }, [fetchTxns]);

    // Track new rows for animation
    useEffect(() => {
        const currentSigs = new Set(txns.map((t) => t.signature));
        prevSigsRef.current = currentSigs;
    }, [txns]);

    // ── Derived stats ──
    const totalTxns = txns.length;
    const buys = txns.filter((t) => t.swap_side === "buy").length;
    const sells = txns.filter((t) => t.swap_side === "sell").length;
    const volume = txns.reduce((s, t) => s + Number(t.usd_value || 0), 0);
    const latestPrice = txns.length > 0 ? txns[0].price : null;

    // ── Filtered list ──
    const filtered =
        filter === "ALL"
            ? txns
            : txns.filter((t) => t.swap_side === filter.toLowerCase());

    const symbol = tokenData?.token_symbol || txns[0]?.token_out_symbol || txns[0]?.token_in_symbol || "Token";

    return (
        <div className="page">
            {/* ── Breadcrumb ── */}
            <div className="detail__header">
                <div className="detail__breadcrumb">
                    <Link to="/">Home</Link> / <Link to="/solana">Solana</Link> /{" "}
                    <Link to={`/solana/${dex}`}>{dex}</Link> / <span>{symbol}</span>
                </div>
                <div className="detail__title-row">
                    <h1 className="detail__title">{symbol}</h1>
                    <span className="detail__mint">{shortenAddress(tokenMint)}</span>
                    <div className="refresh-indicator">
                        <span className="refresh-indicator__dot" />
                        Auto-refresh 10s
                    </div>
                </div>
            </div>

            {/* ── Stats Strip ── */}
            <div className="stats-strip">
                <div className="stat-box">
                    <div className="stat-box__label">Total Txns</div>
                    <div className="stat-box__value">{totalTxns}</div>
                </div>
                <div className="stat-box">
                    <div className="stat-box__label">Buys</div>
                    <div className="stat-box__value text-green">{buys}</div>
                </div>
                <div className="stat-box">
                    <div className="stat-box__label">Sells</div>
                    <div className="stat-box__value text-red">{sells}</div>
                </div>
                <div className="stat-box">
                    <div className="stat-box__label">Volume</div>
                    <div className="stat-box__value">{formatUsd(volume)}</div>
                </div>
                <div className="stat-box">
                    <div className="stat-box__label">Latest Price</div>
                    <div className="stat-box__value">{formatPrice(latestPrice)}</div>
                </div>
            </div>

            {/* ── Filter Tabs ── */}
            <div className="filter-tabs">
                {FILTERS.map((f) => (
                    <button
                        key={f}
                        className={`filter-tab ${f === "BUY" ? "filter-tab--buy" : f === "SELL" ? "filter-tab--sell" : ""
                            } ${filter === f ? "filter-tab--active" : ""}`}
                        onClick={() => setFilter(f)}
                        id={`filter-${f.toLowerCase()}`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* ── Transaction Table ── */}
            <div className="table-wrap">
                <table className="data-table" id="txn-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>USD</th>
                            <th>Token Amt</th>
                            <th>SOL</th>
                            <th>Price</th>
                            <th>Maker</th>
                            <th>Txn</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i} className="skeleton-row">
                                    <td><div className="skel-bar skel-bar--w80" /></td>
                                    <td><div className="skel-bar skel-bar--w60" /></td>
                                    <td><div className="skel-bar skel-bar--w80" /></td>
                                    <td><div className="skel-bar skel-bar--w80" /></td>
                                    <td><div className="skel-bar skel-bar--w80" /></td>
                                    <td><div className="skel-bar skel-bar--w80" /></td>
                                    <td><div className="skel-bar skel-bar--w100" /></td>
                                    <td><div className="skel-bar skel-bar--w40" /></td>
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={8}>
                                    <div className="empty-state">
                                        <div className="empty-state__icon">📭</div>
                                        <div className="empty-state__text">No transactions found</div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((txn, i) => {
                                const isBuy = txn.swap_side === "buy";
                                const isNew = !prevSigsRef.current.has(txn.signature);
                                // Token amount: amount_out for buys, amount_in for sells
                                const tokenAmt = isBuy ? txn.amount_out : txn.amount_in;
                                // SOL (other side): amount_in for buys, amount_out for sells
                                const solAmt = isBuy ? txn.amount_in : txn.amount_out;

                                return (
                                    <tr
                                        key={txn.signature}
                                        className={`txn-row--${isBuy ? "buy" : "sell"} ${isNew ? "fade-up" : ""}`}
                                        style={isNew ? { animationDelay: `${i * 40}ms` } : undefined}
                                    >
                                        <td className="text-secondary">{timeAgo(txn.block_time)}</td>
                                        <td>
                                            <span className={`badge badge--${isBuy ? "buy" : "sell"}`}>
                                                {isBuy ? "Buy" : "Sell"}
                                            </span>
                                        </td>
                                        <td>{formatUsd(txn.usd_value)}</td>
                                        <td>{formatTokenAmount(tokenAmt)}</td>
                                        <td>{formatTokenAmount(solAmt)}</td>
                                        <td>{formatPrice(txn.price)}</td>
                                        <td>
                                            <a
                                                href={`https://solscan.io/account/${txn.wallet}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="txn-link"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {shortenAddress(txn.wallet)}
                                            </a>
                                        </td>
                                        <td>
                                            <a
                                                href={`https://solscan.io/tx/${txn.signature}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="txn-link"
                                                onClick={(e) => e.stopPropagation()}
                                                title="View on Solscan"
                                            >
                                                ↗
                                            </a>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
