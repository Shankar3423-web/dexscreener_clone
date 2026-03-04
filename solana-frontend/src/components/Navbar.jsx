import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
    const { pathname } = useLocation();
    const isOnSolana = pathname.startsWith("/solana");

    return (
        <nav className="navbar">
            <Link to="/" className="navbar__logo">
                <span className="navbar__logo-icon">◇</span>
                SolTracker
            </Link>
            <div className="navbar__links">
                <Link
                    to="/solana"
                    className={`navbar__link ${isOnSolana ? "navbar__link--active" : ""}`}
                >
                    Explorer
                </Link>
                <span className="navbar__badge">Live</span>
            </div>
        </nav>
    );
}
