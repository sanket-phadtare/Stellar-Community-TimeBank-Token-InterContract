import { useEffect, useState } from "react";
import { useWallet } from "../context/WalletContext";
import { getOffers, getUserBookings, confirmCompletion } from "../utils/contract";

function short(addr) {
  if (!addr) return "";
  return addr.slice(0, 8) + "…";
}

function statusLabel(status) {
  if (status === null || status === undefined) return "Unknown";
  // Handle array — contract returns ["Pending"] style
  if (Array.isArray(status)) {
    const val = status[0];
    if (typeof val === "string") return val.charAt(0).toUpperCase() + val.slice(1);
    return String(val);
  }
  if (typeof status === "number") {
    const map = { 0: "Pending", 1: "Confirmed", 2: "Completed", 3: "Disputed" };
    return map[status] ?? "Unknown";
  }
  if (typeof status === "object") {
    const key = Object.keys(status)[0];
    return key.charAt(0).toUpperCase() + key.slice(1);
  }
  return String(status);
}

export default function ServiceBoard({ onRequest, refreshKey }) {
  const { publicKey } = useWallet();
  const [tab, setTab]           = useState("browse");
  const [offers, setOffers]     = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [confirmMsg, setConfirmMsg] = useState(null);

  useEffect(() => {
    if (!publicKey) return;
    setLoading(true);
    if (tab === "browse") {
      getOffers(publicKey)
        .then(setOffers)
        .finally(() => setLoading(false));
    } else {
      getUserBookings(publicKey)
        .then(setBookings)
        .finally(() => setLoading(false));
    }
  }, [publicKey, refreshKey, tab]);

  async function handleConfirm(booking) {
    setConfirming(booking.id);
    setConfirmMsg(null);
    try {
      await confirmCompletion(publicKey, booking.id);
      setConfirmMsg({ type: "success", text: `✓ Confirmed! ${booking.hours} TIME released to provider.` });
      // refresh bookings
      const updated = await getUserBookings(publicKey);
      setBookings(updated);
    } catch (e) {
      setConfirmMsg({ type: "error", text: "✕ " + (e.message || "Confirm failed").slice(0, 60) });
    } finally {
      setConfirming(null);
      setTimeout(() => setConfirmMsg(null), 5000);
    }
  }

  const Skeleton = () => (
    <div className="service-list">
      {[0, 1, 2].map(i => (
        <div key={i} className="service-item">
          <div className="service-info">
            <div className="skeleton" style={{ height: 14, width: "60%", marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 10, width: "35%" }} />
          </div>
          <div className="skeleton" style={{ height: 26, width: 64 }} />
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

      {/* Sub-tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid #222" }}>
        <button
          onClick={() => setTab("browse")}
          style={{
            flex: 1, padding: "10px 0", fontSize: "11px", letterSpacing: "0.08em",
            textTransform: "uppercase", background: "none", border: "none",
            borderBottom: tab === "browse" ? "2px solid #e05" : "2px solid transparent",
            color: tab === "browse" ? "#fff" : "#666", cursor: "pointer",
          }}
        >
          Browse Services
        </button>
        <button
          onClick={() => setTab("bookings")}
          style={{
            flex: 1, padding: "10px 0", fontSize: "11px", letterSpacing: "0.08em",
            textTransform: "uppercase", background: "none", border: "none",
            borderBottom: tab === "bookings" ? "2px solid #e05" : "2px solid transparent",
            color: tab === "bookings" ? "#fff" : "#666", cursor: "pointer",
          }}
        >
          My Bookings
        </button>
      </div>

      {/* Browse tab */}
      {tab === "browse" && (
        loading ? <Skeleton /> :
        offers.length === 0 ? (
          <div className="empty-state">No services listed yet.</div>
        ) : (
          <div className="service-list" style={{ flex: 1, overflowY: "auto" }}>
            {offers.map(offer => (
              <div className="service-item" key={offer.id}>
                <div className="service-info">
                  <span className="service-desc">{offer.description}</span>
                  <span className="service-provider">{short(offer.provider)}</span>
                </div>
                <div className="service-right">
                  <span className="credit-pill">
                    {offer.hours} credit{offer.hours !== 1 ? "s" : ""}
                  </span>
                  {publicKey && offer.provider !== publicKey && (
                    <button className="btn-request" onClick={() => onRequest(offer)}>
                      Request
                    </button>
                  )}
                  {publicKey && offer.provider === publicKey && (
                    <span style={{ fontSize: "10px", color: "#555" }}>Your offer</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* My Bookings tab */}
      {tab === "bookings" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {confirmMsg && (
            <div style={{
              margin: "8px 16px", padding: "8px 12px", fontSize: "11px", borderRadius: "4px",
              background: confirmMsg.type === "success" ? "#0a2a0a" : "#2a0a0a",
              color: confirmMsg.type === "success" ? "#4ade80" : "#f87171",
              border: `1px solid ${confirmMsg.type === "success" ? "#166534" : "#991b1b"}`,
            }}>
              {confirmMsg.text}
            </div>
          )}

          {loading ? <Skeleton /> :
          bookings.length === 0 ? (
            <div className="empty-state">No bookings yet.</div>
          ) : (
            bookings.map(b => {
              const status = statusLabel(b.status);
              const isPending = status.toLowerCase() === "pending";
              const isRequester = b.requester === publicKey;

              return (
                <div key={b.id} className="service-item" style={{ flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <div className="service-info">
                      <span className="service-desc">Booking #{b.id}</span>
                      <span className="service-provider">
                        {isRequester ? `Provider: ${short(b.provider)}` : `Requester: ${short(b.requester)}`}
                      </span>
                    </div>
                    <div className="service-right">
                      <span className="credit-pill">{b.hours} TIME</span>
                      <span style={{
                        fontSize: "10px", padding: "2px 6px", borderRadius: "3px",
                        background: isPending ? "#1a1a00" : status === "Completed" ? "#0a1a0a" : "#1a0a0a",
                        color: isPending ? "#fbbf24" : status === "Completed" ? "#4ade80" : "#f87171",
                        border: `1px solid ${isPending ? "#92400e" : status === "Completed" ? "#166534" : "#991b1b"}`,
                      }}>
                        {status}
                      </span>
                    </div>
                  </div>

                  {/* Confirm button — only requester can confirm, only when pending */}
                  {isRequester && isPending && (
                    <button
                      onClick={() => handleConfirm(b)}
                      disabled={confirming === b.id}
                      style={{
                        width: "100%", padding: "7px", fontSize: "11px", letterSpacing: "0.08em",
                        textTransform: "uppercase", background: confirming === b.id ? "#222" : "#0a2a0a",
                        border: "1px solid #166534", color: confirming === b.id ? "#555" : "#4ade80",
                        cursor: confirming === b.id ? "not-allowed" : "pointer", borderRadius: "3px",
                      }}
                    >
                      {confirming === b.id ? "Confirming..." : "✓ Confirm Completion — Release Payment"}
                    </button>
                  )}

                  {!isRequester && isPending && (
                    <div style={{ fontSize: "10px", color: "#555", paddingTop: "2px" }}>
                      Waiting for requester to confirm completion...
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}