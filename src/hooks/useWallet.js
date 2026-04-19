import { useState, useCallback } from "react";

// Wait for Freighter to inject into the page (up to 2 seconds)
function waitForFreighter(timeout = 2000) {
  return new Promise((resolve, reject) => {
    if (window.freighter) return resolve(window.freighter);
    const interval = setInterval(() => {
      if (window.freighter) {
        clearInterval(interval);
        resolve(window.freighter);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(interval);
      reject(new Error("Freighter not detected. Try refreshing the page."));
    }, timeout);
  });
}

export function useWallet() {
  const [publicKey, setPublicKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Try the npm package first (most reliable)
      let key = null;

      try {
        const freighterApi = await import("@stellar/freighter-api");

        // Freighter API v2+ uses requestAccess + getAddress
        if (freighterApi.requestAccess) {
          await freighterApi.requestAccess();
          const res = await freighterApi.getAddress();
          key = res?.address ?? res;
        }
        // Freighter API v1 uses isConnected + getPublicKey
        else if (freighterApi.getPublicKey) {
          await freighterApi.setAllowed?.();
          key = await freighterApi.getPublicKey();
        }
      } catch {
        // Fall back to window.freighter if npm package fails
        const freighter = await waitForFreighter();
        await freighter.setAllowed?.();
        const res = await (freighter.getAddress?.() ?? freighter.getPublicKey?.());
        key = res?.address ?? res;
      }

      if (!key) throw new Error("Could not retrieve public key from Freighter.");
      setPublicKey(key);
    } catch (err) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
  }, []);

  return { publicKey, loading, error, connect, disconnect };
}