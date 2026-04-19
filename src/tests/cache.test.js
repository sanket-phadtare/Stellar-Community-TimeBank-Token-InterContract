import { describe, it, expect, beforeEach, vi } from "vitest";
import { cacheGet, cacheSet, cacheDelete, cacheClear } from "../utils/cache";

beforeEach(() => cacheClear());

describe("cache", () => {
  it("returns stored value on a cache hit", () => {
    cacheSet("balance:alice", 7);
    expect(cacheGet("balance:alice")).toBe(7);
  });

  it("returns null when key does not exist", () => {
    expect(cacheGet("nonexistent")).toBeNull();
  });

  it("returns null after TTL expires", async () => {
    cacheSet("balance:bob", 3, 50); // 50ms TTL
    await new Promise(r => setTimeout(r, 80));
    expect(cacheGet("balance:bob")).toBeNull();
  });

  it("returns fresh value before TTL expires", async () => {
    cacheSet("balance:carol", 9, 500);
    await new Promise(r => setTimeout(r, 10));
    expect(cacheGet("balance:carol")).toBe(9);
  });

  it("deletes a single key", () => {
    cacheSet("x", 1);
    cacheDelete("x");
    expect(cacheGet("x")).toBeNull();
  });
});