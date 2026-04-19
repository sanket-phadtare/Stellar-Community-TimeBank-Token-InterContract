import { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";

export default function WalletConnect() {
  const { publicKey, loading, error, connect, disconnect } = useWallet();
  const [showModal, setShowModal] = useState(false);

  // Auto-open modal when wallet is not connected
  useEffect(() => {
    if (!publicKey) setShowModal(true);
  }, [publicKey]);

  const short = (key) => `${key.slice(0, 6)}...${key.slice(-4)}`;

  const handleConnect = async () => {
    await connect();
    setShowModal(false);
  };

  return (
    <>
      {/* No trigger button — just show connected address + disconnect if connected */}
      <div className="wallet-bar">
        {publicKey && (
          <div className="wallet-connected">
            <span className="wallet-address">{short(publicKey)}</span>
            <button className="btn btn-ghost" onClick={disconnect}>Disconnect</button>
          </div>
        )}
        {error && !showModal && <p className="error-msg">{error}</p>}
      </div>

      {showModal && (
        <div className="modal-overlay">
          {/* No onClick on overlay — user must connect or it stays open */}
          <div className="modal-box">

            <div className="modal-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 3H8L2 7h20z" />
              </svg>
            </div>

            <h2 className="modal-title">Connect Wallet</h2>
            <p className="modal-subtitle">
              Connect your Freighter wallet to access the Community Time Bank
            </p>

            {error && <p className="modal-error">{error}</p>}

            <button
              className="modal-connect-btn"
              onClick={handleConnect}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : "Connect Freighter"}
            </button>

          </div>
        </div>
      )}
    </>
  );
}