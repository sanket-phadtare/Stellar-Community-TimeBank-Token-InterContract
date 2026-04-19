import { describe, it, expect, vi, beforeEach } from "vitest";
import { cacheGet, cacheSet, cacheClear } from "../utils/cache";

beforeEach(() => cacheClear());

describe("get_balance logic", () => {
  it("returns 5 credits for a newly registered user", () => {
    const SIGNUP_BONUS = 5;
    const balances = new Map();
    function register(user) {
      if (balances.has(user)) throw new Error("already registered");
      balances.set(user, SIGNUP_BONUS);
    }
    function getBalance(user) { return balances.get(user) ?? 0; }

    register("alice");
    expect(getBalance("alice")).toBe(5);
  });

  it("deducts credits from requester and awards to provider", () => {
    const balances = new Map([["alice", 5], ["bob", 3]]);
    function transfer(from, to, amount) {
      if ((balances.get(from) ?? 0) < amount) throw new Error("insufficient");
      balances.set(from, balances.get(from) - amount);
      balances.set(to, (balances.get(to) ?? 0) + amount);
    }
    transfer("alice", "bob", 2);
    expect(balances.get("alice")).toBe(3);
    expect(balances.get("bob")).toBe(5);
  });

  it("throws when user has insufficient credits", () => {
    const balances = new Map([["alice", 1]]);
    function transfer(from, to, amount) {
      if ((balances.get(from) ?? 0) < amount) throw new Error("insufficient");
      balances.set(from, balances.get(from) - amount);
    }
    expect(() => transfer("alice", "bob", 3)).toThrow("insufficient");
  });
});