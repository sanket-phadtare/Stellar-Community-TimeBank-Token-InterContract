import * as StellarSdk from "@stellar/stellar-sdk";
import { cacheGet, cacheSet, cacheDelete } from "./cache";

export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID;
const TOKEN_CONTRACT_ID = import.meta.env.VITE_TOKEN_CONTRACT_ID; // NEW — TIME token SAC
export const RPC_URL    = import.meta.env.VITE_RPC_URL || "https://soroban-testnet.stellar.org"; // exported for useEventStream
const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";

// Support stellar-sdk v11 and v12+
const RpcServer =
  StellarSdk?.rpc?.Server ||
  StellarSdk?.SorobanRpc?.Server;

const assembleTransaction =
  StellarSdk?.rpc?.assembleTransaction ||
  StellarSdk?.SorobanRpc?.assembleTransaction;

const isSimulationError =
  StellarSdk?.rpc?.Api?.isSimulationError ||
  StellarSdk?.SorobanRpc?.Api?.isSimulationError ||
  ((sim) => !!sim.error);

const server = new RpcServer(RPC_URL, { allowHttp: false });

const ledgerSettle = () => new Promise(r => setTimeout(r, 2000));

// ─── Read-only call ───────────────────────────────────────────────────────────
async function readContract(method, args = [], callerKey, contractId = CONTRACT_ID) {
  if (!callerKey) throw new Error("Wallet not connected");
  if (!contractId) throw new Error("Contract ID missing from .env");

  const contract = new StellarSdk.Contract(contractId);
  const account  = await server.getAccount(callerKey);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (isSimulationError(sim)) {
    throw new Error("Simulation error: " + JSON.stringify(sim.error));
  }
  return sim.result?.retval;
}

// ─── Write call ───────────────────────────────────────────────────────────────
async function writeContract(method, args, publicKey, contractId = CONTRACT_ID) {
  if (!publicKey) throw new Error("Wallet not connected");
  if (!contractId) throw new Error("Contract ID missing from .env");

  const freighterApi = await import("@stellar/freighter-api");
  const contract     = new StellarSdk.Contract(contractId);

  let account;
  try {
    account = await server.getAccount(publicKey);
  } catch (e) {
    throw new Error("Account not found on testnet. Fund it at https://friendbot.stellar.org?addr=" + publicKey);
  }

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (isSimulationError(sim)) {
    throw new Error("Simulation error: " + JSON.stringify(sim.error));
  }

  const preparedTx = assembleTransaction(tx, sim).build();
  const txXdr      = preparedTx.toXDR();

  let signedXdr;
  try {
    const result = await freighterApi.signTransaction(txXdr, { networkPassphrase: NETWORK_PASSPHRASE });
    signedXdr = result?.signedTxXdr ?? result;
  } catch {
    const result = await freighterApi.signTransaction(txXdr, "TESTNET");
    signedXdr = result?.signedTxXdr ?? result;
  }

  if (!signedXdr || typeof signedXdr !== "string") {
    throw new Error("Freighter did not return a signed transaction");
  }

  const signedTx   = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const sendResult = await server.sendTransaction(signedTx);

  if (sendResult.status === "ERROR") {
    throw new Error("Send failed: " + JSON.stringify(sendResult.errorResult));
  }

  let attempts = 0;
  while (attempts < 20) {
    const status = await server.getTransaction(sendResult.hash);
    if (status.status === "SUCCESS") return status;
    if (status.status === "FAILED")  throw new Error("Transaction failed on-chain");
    await new Promise(r => setTimeout(r, 1500));
    attempts++;
  }
  throw new Error("Transaction timed out");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function registerUser(publicKey) {
  if (!publicKey) return;
  try {
    const addr = StellarSdk.Address.fromString(publicKey).toScVal();
    await writeContract("register_user", [addr], publicKey);
    cacheDelete(`balance:${publicKey}`);
  } catch (e) {
    const isAlreadyRegistered =
      e.message?.includes("already registered") ||
      e.message?.includes("already a member") ||
      e.message?.includes("Error(Contract, #1)") ||
      e.message?.includes("Error(Contract, #2)");
    if (!isAlreadyRegistered) console.warn("registerUser:", e.message);
    else cacheDelete(`balance:${publicKey}`); // clear cache even if already registered
  }
}

// getBalance — reads from TOKEN_CONTRACT_ID if deployed, falls back to main contract
export async function getBalance(publicKey) {
  if (!publicKey) return 0;
  const cacheKey = `balance:${publicKey}`;
  const cached   = cacheGet(cacheKey);
  if (cached !== null) return cached;

  try {
    const addr = StellarSdk.Address.fromString(publicKey).toScVal();

    // Use token contract if available (Green Belt — inter-contract), else fallback
    const targetId = TOKEN_CONTRACT_ID || CONTRACT_ID;
    const method   = TOKEN_CONTRACT_ID ? "balance" : "get_balance";

    const result  = await readContract(method, [addr], publicKey, targetId);
    const balance = Number(StellarSdk.scValToNative(result));
    cacheSet(cacheKey, balance, 20_000);
    return balance;
  } catch (e) {
    console.warn("getBalance failed:", e.message);
    return 0;
  }
}

export async function getOffers(publicKey) {
  if (!publicKey) return [];
  const cached = cacheGet("offers");
  if (cached !== null) return cached;

  try {
    const result = await readContract("get_offers", [], publicKey);
    const raw    = StellarSdk.scValToNative(result);
    const offers = (Array.isArray(raw) ? raw : []).map(o => ({
      id:          Number(o.id),
      provider:    o.provider?.toString() ?? "",
      description: String(o.description ?? ""),
      hours:       Number(o.hours),
    }));
    cacheSet("offers", offers, 15_000);
    return offers;
  } catch (e) {
    console.warn("getOffers failed:", e.message);
    return [];
  }
}

export async function offerService(publicKey, description, hours) {
  const addr = StellarSdk.Address.fromString(publicKey).toScVal();
  const desc = StellarSdk.nativeToScVal(description, { type: "string" });
  const hrs  = StellarSdk.nativeToScVal(Number(hours), { type: "u32" }); // hours stays u32
  await writeContract("offer_service", [addr, desc, hrs], publicKey);
  cacheDelete("offers");
  cacheDelete(`balance:${publicKey}`);
  await ledgerSettle();
}

export async function requestService(publicKey, offerId, hours) {
  const addr = StellarSdk.Address.fromString(publicKey).toScVal();
  const contractAddr = StellarSdk.Address.fromString(
    import.meta.env.VITE_CONTRACT_ID
  ).toScVal();
  const id  = StellarSdk.nativeToScVal(Number(offerId), { type: "u64" });
  const amt = StellarSdk.nativeToScVal(Number(hours),   { type: "i128" });
  const exp = StellarSdk.nativeToScVal(999999999,        { type: "u32" });

  // Step 1 — approve Time Bank to spend tokens on user's behalf
  const TOKEN_CONTRACT_ID = import.meta.env.VITE_TOKEN_CONTRACT_ID;
  await writeContract("approve", [addr, contractAddr, amt, exp], publicKey, TOKEN_CONTRACT_ID);

  // Step 2 — book the service (calls transfer_from internally)
  const result = await writeContract("request_service", [addr, id], publicKey);
  cacheDelete(`balance:${publicKey}`);
  cacheDelete("offers");
  await ledgerSettle();
  return result;
}

export async function getUserBookings(publicKey) {
  if (!publicKey) return [];
  try {
    const addr = StellarSdk.Address.fromString(publicKey).toScVal();
    const result = await readContract("get_user_bookings", [addr], publicKey);
    const raw = StellarSdk.scValToNative(result);
    return (Array.isArray(raw) ? raw : []).map(b => ({
      id:        Number(b.id),
      service_id: Number(b.service_id),
      provider:  b.provider?.toString() ?? "",
      requester: b.requester?.toString() ?? "",
      hours:     Number(b.hours),
      status:    b.status,  // ← keep as-is, don't convert
    }));
  } catch (e) {
    console.warn("getUserBookings failed:", e.message);
    return [];
  }
}

export async function confirmCompletion(publicKey, bookingId) {
  const addr = StellarSdk.Address.fromString(publicKey).toScVal();
  const id   = StellarSdk.nativeToScVal(Number(bookingId), { type: "u64" });
  const result = await writeContract("confirm_completion", [addr, id], publicKey);
  cacheDelete(`balance:${publicKey}`);
  await ledgerSettle();
  return result;
}