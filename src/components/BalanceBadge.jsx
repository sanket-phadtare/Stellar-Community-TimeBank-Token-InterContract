import { useEffect, useState } from "react";
import { useWallet } from "../context/WalletContext";
import { getBalance } from "../utils/contract";

export default function BalanceBadge({ refreshKey }) {
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicKey) { setBalance(null); return; }
    setLoading(true);
    getBalance(publicKey)
      .then(setBalance)
      .finally(() => setLoading(false));
  }, [publicKey, refreshKey]);

  if (!publicKey) return null;

  return (
    <div className="balance-badge">
      {loading
        ? <span className="skeleton" style={{ width: 60, height: 16, display: "inline-block" }} />
        : <><span className="balance-number">{balance ?? "—"}</span> time credits</>
      }
    </div>
  );
}