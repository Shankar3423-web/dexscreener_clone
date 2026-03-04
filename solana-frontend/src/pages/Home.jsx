import { useNavigate } from "react-router-dom";

export default function Home() {
    const navigate = useNavigate();

    return (
        <div className="home">
            {/* Grid background */}
            <div className="home__grid-bg" />
            <div className="home__glow" />

            <div className="home__content">
                {/* Tag line */}
                <div className="home__tag">
                    <span className="home__tag-dot" />
                    Powered by Helius RPC
                </div>

                <h1 className="home__title">
                    Track every<br />on-chain swap
                </h1>
                <p className="home__subtitle">
                    Real-time decoded swap data from Solana DEXes.
                    Monitor PumpSwap and Meteora trades as they happen.
                </p>

                {/* Blockchain cards */}
                <div className="home__chains">
                    <div
                        className="chain-card"
                        onClick={() => navigate("/solana")}
                        id="chain-solana"
                    >
                        <div className="chain-card__icon chain-card__icon--sol">◎</div>
                        <div className="chain-card__name">Solana</div>
                        <div className="chain-card__status chain-card__status--live">● Live</div>
                    </div>
                    <div className="chain-card chain-card--disabled" id="chain-ethereum">
                        <div className="chain-card__icon chain-card__icon--eth">Ξ</div>
                        <div className="chain-card__name">Ethereum</div>
                        <div className="chain-card__status">Coming soon</div>
                    </div>
                    <div className="chain-card chain-card--disabled" id="chain-bsc">
                        <div className="chain-card__icon chain-card__icon--bsc">B</div>
                        <div className="chain-card__name">BSC</div>
                        <div className="chain-card__status">Coming soon</div>
                    </div>
                </div>

                {/* Bottom stats */}
                <div className="home__stats">
                    <div className="home__stat">
                        <div className="home__stat-value">2</div>
                        <div className="home__stat-label">DEXes Live</div>
                    </div>
                    <div className="home__stat">
                        <div className="home__stat-value">Real-time</div>
                        <div className="home__stat-label">Data Feed</div>
                    </div>
                    <div className="home__stat">
                        <div className="home__stat-value">Solana</div>
                        <div className="home__stat-label">Blockchain</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
