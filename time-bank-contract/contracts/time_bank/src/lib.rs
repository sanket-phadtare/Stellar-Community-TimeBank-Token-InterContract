#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, Env, String, Vec, Map, Symbol,
};

#[contracterror]
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Error {
    AlreadyRegistered  = 1,
    NotRegistered      = 2,
    InsufficientCredits = 3,
    OfferNotFound      = 4,
}

#[contracttype]
#[derive(Clone)]
pub struct ServiceOffer {
    pub id: u32,
    pub provider: Address,
    pub description: String,
    pub hours: u32,
}

#[contract]
pub struct TimeBankContract;

#[contractimpl]
impl TimeBankContract {
    pub fn register_user(env: Env, user: Address) {
        user.require_auth();
        let key = Symbol::new(&env, "BALS");
        let mut balances: Map<Address, u32> = env
            .storage().persistent()
            .get(&key)
            .unwrap_or(Map::new(&env));

        if balances.contains_key(user.clone()) {
            env.panic_with_error(Error::AlreadyRegistered);
        }
        balances.set(user, 5u32);
        env.storage().persistent().set(&key, &balances);
    }

    pub fn offer_service(env: Env, provider: Address, description: String, hours: u32) -> u32 {
        provider.require_auth();
        let offers_key = Symbol::new(&env, "OFRS");
        let count_key  = Symbol::new(&env, "CNT");

        let mut offers: Vec<ServiceOffer> = env
            .storage().persistent()
            .get(&offers_key)
            .unwrap_or(Vec::new(&env));

        let count: u32 = env
            .storage().persistent()
            .get(&count_key)
            .unwrap_or(0u32);

        let id = count + 1;
        offers.push_back(ServiceOffer { id, provider, description, hours });
        env.storage().persistent().set(&offers_key, &offers);
        env.storage().persistent().set(&count_key, &id);
        id
    }

    pub fn request_service(env: Env, requester: Address, offer_id: u32) {
        requester.require_auth();
        let bals_key   = Symbol::new(&env, "BALS");
        let offers_key = Symbol::new(&env, "OFRS");

        let mut balances: Map<Address, u32> = env
            .storage().persistent()
            .get(&bals_key)
            .unwrap_or(Map::new(&env));

        let offers: Vec<ServiceOffer> = env
            .storage().persistent()
            .get(&offers_key)
            .unwrap_or(Vec::new(&env));

        let mut found: Option<ServiceOffer> = None;
        for i in 0..offers.len() {
            let o = offers.get(i).unwrap();
            if o.id == offer_id {
                found = Some(o);
                break;
            }
        }

        let offer = match found {
            Some(o) => o,
            None    => { env.panic_with_error(Error::OfferNotFound); }
        };

        let requester_bal = match balances.get(requester.clone()) {
            Some(b) => b,
            None    => { env.panic_with_error(Error::NotRegistered); }
        };

        if requester_bal < offer.hours {
            env.panic_with_error(Error::InsufficientCredits);
        }

        balances.set(requester.clone(), requester_bal - offer.hours);
        let provider_bal = balances.get(offer.provider.clone()).unwrap_or(0u32);
        balances.set(offer.provider.clone(), provider_bal + offer.hours);
        env.storage().persistent().set(&bals_key, &balances);
    }

    pub fn get_balance(env: Env, user: Address) -> u32 {
        let key = Symbol::new(&env, "BALS");
        let balances: Map<Address, u32> = env
            .storage().persistent()
            .get(&key)
            .unwrap_or(Map::new(&env));
        balances.get(user).unwrap_or(0u32)
    }

    pub fn get_offers(env: Env) -> Vec<ServiceOffer> {
        let key = Symbol::new(&env, "OFRS");
        env.storage().persistent()
            .get(&key)
            .unwrap_or(Vec::new(&env))
    }
}