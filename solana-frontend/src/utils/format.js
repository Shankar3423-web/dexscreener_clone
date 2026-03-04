/* ═══════════════════════════════════════════════════════════
   Formatting utilities for SolTracker
   ═══════════════════════════════════════════════════════════ */

/**
 * Format USD value: $1.2M, $45.3K, $0.0042
 */
export function formatUsd(value) {
    if (value == null) return "—";
    const n = Number(value);
    if (isNaN(n)) return "—";
    if (n === 0) return "$0.00";

    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    if (abs >= 1) return `$${n.toFixed(2)}`;
    if (abs >= 0.01) return `$${n.toFixed(4)}`;
    return `$${n.toFixed(6)}`;
}

/**
 * Format token price:
 *  < 0.000001 → exponential
 *  < 0.0001   → 8 decimals
 *  else       → 4-6 decimals
 */
export function formatPrice(price) {
    if (price == null) return "—";
    const n = Number(price);
    if (isNaN(n) || n === 0) return "—";

    const abs = Math.abs(n);
    if (abs < 0.000001) return n.toExponential(2);
    if (abs < 0.0001) return `$${n.toFixed(8)}`;
    if (abs < 1) return `$${n.toFixed(6)}`;
    return `$${n.toFixed(4)}`;
}

/**
 * Format token amounts: abbreviate large, exponential for tiny
 */
export function formatTokenAmount(value) {
    if (value == null) return "—";
    const n = Number(value);
    if (isNaN(n)) return "—";
    if (n === 0) return "0";

    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
    if (abs >= 1) return n.toFixed(2);
    if (abs < 0.000001) return n.toExponential(2);
    return n.toFixed(6);
}

/**
 * Time ago: 5s ago, 3m ago, 2h ago, 1d ago
 */
export function timeAgo(dateStr) {
    if (!dateStr) return "—";
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    if (isNaN(then)) return "—";

    const diff = Math.max(0, now - then);
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

/**
 * Shorten wallet/mint: first 4 + ... + last 4
 */
export function shortenAddress(addr) {
    if (!addr || addr.length < 10) return addr || "—";
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}
