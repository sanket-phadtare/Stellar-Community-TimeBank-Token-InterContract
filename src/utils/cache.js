// Simple in-memory TTL cache (no localStorage — avoids stale contract data)
const store = new Map();

export function cacheSet(key, value, ttlMs = 30_000) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheDelete(key) {
  store.delete(key);
}

export function cacheClear() {
  store.clear();
}