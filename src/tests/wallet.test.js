import { describe, it, expect, vi } from "vitest";

// Simulates the wallet state machine from useWallet.js
function createWalletState() {
  let publicKey = null;
  return {
    connect(key) { publicKey = key; },
    disconnect() { publicKey = null; },
    getPublicKey() { return publicKey; },
    isConnected() { return publicKey !== null; },
  };
}

describe("wallet state", () => {
  it("starts disconnected", () => {
    const wallet = createWalletState();
    expect(wallet.isConnected()).toBe(false);
    expect(wallet.getPublicKey()).toBeNull();
  });

  it("updates to connected when a key is set", () => {
    const wallet = createWalletState();
    wallet.connect("GABC123");
    expect(wallet.isConnected()).toBe(true);
    expect(wallet.getPublicKey()).toBe("GABC123");
  });

  it("clears publicKey on disconnect", () => {
    const wallet = createWalletState();
    wallet.connect("GABC123");
    wallet.disconnect();
    expect(wallet.isConnected()).toBe(false);
    expect(wallet.getPublicKey()).toBeNull();
  });
});