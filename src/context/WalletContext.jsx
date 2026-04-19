import { createContext, useContext, useState, useCallback } from "react";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [publicKey, setPublicKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const freighterApi = await import("@stellar/freighter-api");
      let key = null;

      if (freighterApi.requestAccess) {
        await freighterApi.requestAccess();
        const res = await freighterApi.getAddress();
        key = res?.address ?? res;
      } else if (freighterApi.getPublicKey) {
        await freighterApi.setAllowed?.();
        key = await freighterApi.getPublicKey();
      }

      if (!key) throw new Error("Could not retrieve public key.");
      setPublicKey(key);
    } catch (err) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => setPublicKey(null), []);

  return (
    <WalletContext.Provider value={{ publicKey, loading, error, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}