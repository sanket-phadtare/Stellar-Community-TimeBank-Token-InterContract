#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracterror, symbol_short,
    Address, Env, String,
};

#[contracterror]
#[derive(Copy, Clone)]
pub enum TokenError {
    AlreadyInitialized    = 1,
    AmountNegative        = 2,
    InsufficientBalance   = 3,
    InsufficientAllowance = 4,
    NotInitialized        = 5,
}

#[contract]
pub struct TimeToken;

#[contractimpl]
impl TimeToken {

    /// One-time setup: store admin + metadata
    pub fn initialize(env: Env, admin: Address, decimal: u32, name: String, symbol: String) {
        if env.storage().instance().has(&symbol_short!("INIT")) {
            env.panic_with_error(TokenError::AlreadyInitialized);
        }
        env.storage().instance().set(&symbol_short!("INIT"),  &true);
        env.storage().instance().set(&symbol_short!("ADMIN"), &admin);
        env.storage().instance().set(&symbol_short!("DEC"),   &decimal);
        env.storage().instance().set(&symbol_short!("NAME"),  &name);
        env.storage().instance().set(&symbol_short!("SYM"),   &symbol);
    }

    // ── Admin helpers ─────────────────────────────────────────────────────────

    fn admin(env: &Env) -> Address {
        env.storage().instance().get(&symbol_short!("ADMIN")).unwrap()
    }

    fn require_admin(env: &Env) {
        Self::admin(env).require_auth();
    }

    pub fn set_admin(env: Env, new_admin: Address) {
        Self::require_admin(&env);
        env.storage().instance().set(&symbol_short!("ADMIN"), &new_admin);
    }

    // ── Storage helpers ───────────────────────────────────────────────────────

    fn get_balance(env: &Env, account: &Address) -> i128 {
        env.storage()
            .persistent()
            .get(&(symbol_short!("BAL"), account.clone()))
            .unwrap_or(0)
    }

    fn set_balance(env: &Env, account: &Address, amount: i128) {
        env.storage()
            .persistent()
            .set(&(symbol_short!("BAL"), account.clone()), &amount);
    }

    fn get_allowance(env: &Env, from: &Address, spender: &Address) -> i128 {
        env.storage()
            .persistent()
            .get(&(symbol_short!("ALLOW"), from.clone(), spender.clone()))
            .unwrap_or(0)
    }

    fn set_allowance(env: &Env, from: &Address, spender: &Address, amount: i128) {
        env.storage()
            .persistent()
            .set(&(symbol_short!("ALLOW"), from.clone(), spender.clone()), &amount);
    }

    // ── SEP-41 token interface ────────────────────────────────────────────────

    pub fn balance(env: Env, id: Address) -> i128 {
        Self::get_balance(&env, &id)
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        Self::get_allowance(&env, &from, &spender)
    }

    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, _expiration_ledger: u32) {
        from.require_auth();
        if amount < 0 {
            env.panic_with_error(TokenError::AmountNegative);
        }
        Self::set_allowance(&env, &from, &spender, amount);
    }

    /// Standard transfer — requires from.require_auth()
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        if amount < 0 {
            env.panic_with_error(TokenError::AmountNegative);
        }
        let from_bal = Self::get_balance(&env, &from);
        if from_bal < amount {
            env.panic_with_error(TokenError::InsufficientBalance);
        }
        Self::set_balance(&env, &from, from_bal - amount);
        let to_bal = Self::get_balance(&env, &to);
        Self::set_balance(&env, &to, to_bal + amount);
    }

    /// Escrow transfer — no auth required, used by Time Bank contract
    /// to release escrowed tokens to provider after completion
    pub fn transfer_escrow(env: Env, from: Address, to: Address, amount: i128) {
        if amount < 0 {
            env.panic_with_error(TokenError::AmountNegative);
        }
        let from_bal = Self::get_balance(&env, &from);
        if from_bal < amount {
            env.panic_with_error(TokenError::InsufficientBalance);
        }
        Self::set_balance(&env, &from, from_bal - amount);
        let to_bal = Self::get_balance(&env, &to);
        Self::set_balance(&env, &to, to_bal + amount);
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        let allow = Self::get_allowance(&env, &from, &spender);
        if allow < amount {
            env.panic_with_error(TokenError::InsufficientAllowance);
        }
        Self::set_allowance(&env, &from, &spender, allow - amount);
        let from_bal = Self::get_balance(&env, &from);
        if from_bal < amount {
            env.panic_with_error(TokenError::InsufficientBalance);
        }
        Self::set_balance(&env, &from, from_bal - amount);
        let to_bal = Self::get_balance(&env, &to);
        Self::set_balance(&env, &to, to_bal + amount);
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();
        let bal = Self::get_balance(&env, &from);
        if bal < amount {
            env.panic_with_error(TokenError::InsufficientBalance);
        }
        Self::set_balance(&env, &from, bal - amount);
    }

    pub fn burn_from(env: Env, spender: Address, from: Address, amount: i128) {
        spender.require_auth();
        let allow = Self::get_allowance(&env, &from, &spender);
        if allow < amount {
            env.panic_with_error(TokenError::InsufficientAllowance);
        }
        Self::set_allowance(&env, &from, &spender, allow - amount);
        let bal = Self::get_balance(&env, &from);
        if bal < amount {
            env.panic_with_error(TokenError::InsufficientBalance);
        }
        Self::set_balance(&env, &from, bal - amount);
    }

    /// Mint — no admin required, Time Bank contract controls who gets minted
    pub fn mint(env: Env, to: Address, amount: i128) {
        if amount < 0 {
            env.panic_with_error(TokenError::AmountNegative);
        }
        let bal = Self::get_balance(&env, &to);
        Self::set_balance(&env, &to, bal + amount);
    }

    // ── Metadata ──────────────────────────────────────────────────────────────

    pub fn decimals(env: Env) -> u32 {
        env.storage().instance().get(&symbol_short!("DEC")).unwrap()
    }

    pub fn name(env: Env) -> String {
        env.storage().instance().get(&symbol_short!("NAME")).unwrap()
    }

    pub fn symbol(env: Env) -> String {
        env.storage().instance().get(&symbol_short!("SYM")).unwrap()
    }
}