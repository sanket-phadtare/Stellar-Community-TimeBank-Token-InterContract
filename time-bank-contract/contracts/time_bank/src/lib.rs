#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracterror, contracttype, symbol_short,
    Address, Env, String, Vec,
};

mod events;

// ── Token contract client (inter-contract call interface) ─────────────────────
soroban_sdk::contractimport!(
    file = "../../target/wasm32v1-none/release/time_token.wasm"
);
type TokenClient<'a> = Client<'a>;

// ── Errors ────────────────────────────────────────────────────────────────────
#[contracterror]
#[derive(Copy, Clone)]
pub enum BankError {
    AlreadyInitialized  = 1,
    AlreadyMember       = 2,
    ServiceNotFound     = 3,
    ServiceUnavailable  = 4,
    CannotBookOwn       = 5,
    InsufficientTokens  = 6,
    BookingNotFound     = 7,
    NotRequester        = 8,
    BookingNotPending   = 9,
    InvalidHours        = 10,
    NotInitialized      = 11,
}

// ── Types ─────────────────────────────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum ServiceStatus { Active, Booked, Completed, Cancelled }

#[contracttype]
#[derive(Clone, Debug)]
pub struct Service {
    pub id:          u64,
    pub provider:    Address,
    pub title:       String,
    pub description: String,
    pub hours:       u32,
    pub status:      ServiceStatus,
    pub created_at:  u64,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum BookingStatus { Pending, Confirmed, Completed, Disputed }

#[contracttype]
#[derive(Clone, Debug)]
pub struct Booking {
    pub id:          u64,
    pub service_id:  u64,
    pub provider:    Address,
    pub requester:   Address,
    pub hours:       u32,
    pub status:      BookingStatus,
    pub created_at:  u64,
}

// ── Contract ──────────────────────────────────────────────────────────────────
#[contract]
pub struct TimeBankContract;

#[contractimpl]
impl TimeBankContract {

    /// Call once after deploy — pass the TIME token contract address
    pub fn initialize(env: Env, token_contract: Address) {
        if env.storage().instance().has(&symbol_short!("TOKENID")) {
            return; // already initialized — safe no-op
        }
        env.storage().instance().set(&symbol_short!("TOKENID"), &token_contract);
    }

    fn token(env: &Env) -> TokenClient {
        let token_id: Address = env
            .storage()
            .instance()
            .get(&symbol_short!("TOKENID"))
            .unwrap();
        TokenClient::new(env, &token_id)
    }

    // ── INTER-CONTRACT: mint 5 TIME to new member ─────────────────────────────
    pub fn join(env: Env, member: Address) -> i128 {
        member.require_auth();
        let members_key = (symbol_short!("MBR"), member.clone());
        if env.storage().persistent().has(&members_key) {
            env.panic_with_error(BankError::AlreadyMember);
        }
        env.storage().persistent().set(&members_key, &true);
        // inter-contract call → token contract mint()
        Self::token(&env).mint(&member, &5_i128);
        events::emit_joined(&env, &member, 5);
        5_i128
    }

    // ── INTER-CONTRACT: read balance from token contract ──────────────────────
    pub fn balance(env: Env, member: Address) -> i128 {
        Self::token(&env).balance(&member)
    }

    pub fn list_service(
        env: Env,
        provider: Address,
        title: String,
        description: String,
        hours: u32,
    ) -> u64 {
        provider.require_auth();
        if hours == 0 || hours > 8 {
            env.panic_with_error(BankError::InvalidHours);
        }
        let id: u64 = env
            .storage()
            .persistent()
            .get(&symbol_short!("SVCCTR"))
            .unwrap_or(0_u64)
            + 1;
        let service = Service {
            id,
            provider: provider.clone(),
            title: title.clone(),
            description,
            hours,
            status: ServiceStatus::Active,
            created_at: env.ledger().timestamp(),
        };
        let mut services: Vec<Service> = env
            .storage()
            .persistent()
            .get(&symbol_short!("SVCS"))
            .unwrap_or(Vec::new(&env));
        services.push_back(service);
        env.storage().persistent().set(&symbol_short!("SVCS"), &services);
        env.storage().persistent().set(&symbol_short!("SVCCTR"), &id);
        events::emit_service_listed(&env, id, &provider, &title, hours);
        id
    }

    // ── INTER-CONTRACT: transfer tokens into escrow ───────────────────────────
    pub fn book_service(env: Env, requester: Address, service_id: u64) -> u64 {
        requester.require_auth();
        let mut services: Vec<Service> = env
            .storage()
            .persistent()
            .get(&symbol_short!("SVCS"))
            .unwrap_or(Vec::new(&env));

        let mut svc_idx_opt: Option<u32> = None;
        for (i, s) in services.iter().enumerate() {
            if s.id == service_id {
                svc_idx_opt = Some(i as u32);
                break;
            }
        }
        let svc_idx = match svc_idx_opt {
            Some(i) => i,
            None => env.panic_with_error(BankError::ServiceNotFound),
        };
        let mut svc = services.get(svc_idx).unwrap();

        if svc.status != ServiceStatus::Active {
            env.panic_with_error(BankError::ServiceUnavailable);
        }
        if svc.provider == requester {
            env.panic_with_error(BankError::CannotBookOwn);
        }

        let token = Self::token(&env);
        if token.balance(&requester) < svc.hours as i128 {
            env.panic_with_error(BankError::InsufficientTokens);
        }

        // inter-contract call → transfer tokens into escrow (this contract)
        token.transfer_from(
            &env.current_contract_address(),
            &requester,
            &env.current_contract_address(),
            &(svc.hours as i128),
        );

        svc.status = ServiceStatus::Booked;
        services.set(svc_idx, svc.clone());
        env.storage().persistent().set(&symbol_short!("SVCS"), &services);

        let booking_id: u64 = env
            .storage()
            .persistent()
            .get(&symbol_short!("BKGCTR"))
            .unwrap_or(0_u64)
            + 1;
        let booking = Booking {
            id: booking_id,
            service_id,
            provider: svc.provider.clone(),
            requester: requester.clone(),
            hours: svc.hours,
            status: BookingStatus::Pending,
            created_at: env.ledger().timestamp(),
        };
        let mut bookings: Vec<Booking> = env
            .storage()
            .persistent()
            .get(&symbol_short!("BKGS"))
            .unwrap_or(Vec::new(&env));
        bookings.push_back(booking);
        env.storage().persistent().set(&symbol_short!("BKGS"), &bookings);
        env.storage().persistent().set(&symbol_short!("BKGCTR"), &booking_id);
        events::emit_service_booked(
            &env, booking_id, service_id, &requester, &svc.provider, svc.hours,
        );
        booking_id
    }

    // ── INTER-CONTRACT: release escrow to provider ────────────────────────────
    pub fn confirm_completion(env: Env, requester: Address, booking_id: u64) {
        requester.require_auth();
        let mut bookings: Vec<Booking> = env
            .storage()
            .persistent()
            .get(&symbol_short!("BKGS"))
            .unwrap_or(Vec::new(&env));

        let mut bkg_idx_opt: Option<u32> = None;
        for (i, b) in bookings.iter().enumerate() {
            if b.id == booking_id {
                bkg_idx_opt = Some(i as u32);
                break;
            }
        }
        let bkg_idx = match bkg_idx_opt {
            Some(i) => i,
            None => env.panic_with_error(BankError::BookingNotFound),
        };
        let mut bkg = bookings.get(bkg_idx).unwrap();

        if bkg.requester != requester {
            env.panic_with_error(BankError::NotRequester);
        }
        if bkg.status != BookingStatus::Pending {
            env.panic_with_error(BankError::BookingNotPending);
        }

        // inter-contract call → release escrow to provider
        Self::token(&env).transfer(
            &env.current_contract_address(),
            &bkg.provider,
            &(bkg.hours as i128),
        );

        bkg.status = BookingStatus::Completed;
        bookings.set(bkg_idx, bkg.clone());
        env.storage().persistent().set(&symbol_short!("BKGS"), &bookings);

        let mut services: Vec<Service> = env
            .storage()
            .persistent()
            .get(&symbol_short!("SVCS"))
            .unwrap_or(Vec::new(&env));
        for (i, s) in services.iter().enumerate() {
            if s.id == bkg.service_id {
                let mut svc = services.get(i as u32).unwrap();
                svc.status = ServiceStatus::Completed;
                services.set(i as u32, svc);
                env.storage().persistent().set(&symbol_short!("SVCS"), &services);
                break;
            }
        }
        events::emit_completed(&env, booking_id, &requester, &bkg.provider, bkg.hours);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    pub fn get_active_services(env: Env) -> Vec<Service> {
        let services: Vec<Service> = env
            .storage()
            .persistent()
            .get(&symbol_short!("SVCS"))
            .unwrap_or(Vec::new(&env));
        let mut active = Vec::new(&env);
        for s in services.iter() {
            if s.status == ServiceStatus::Active {
                active.push_back(s);
            }
        }
        active
    }

    pub fn get_user_bookings(env: Env, user: Address) -> Vec<Booking> {
        let bookings: Vec<Booking> = env
            .storage()
            .persistent()
            .get(&symbol_short!("BKGS"))
            .unwrap_or(Vec::new(&env));
        let mut result = Vec::new(&env);
        for b in bookings.iter() {
            if b.requester == user || b.provider == user {
                result.push_back(b);
            }
        }
        result
    }

    pub fn get_token_address(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&symbol_short!("TOKENID"))
            .unwrap()
    }

    // ── Legacy helpers (Orange Belt compatibility) ────────────────────────────

    /// Alias for join() — keeps old frontend working
    pub fn register_user(env: Env, member: Address) {
        let members_key = (symbol_short!("MBR"), member.clone());
        if env.storage().persistent().has(&members_key) {
            return;
        }
        member.require_auth();
        env.storage().persistent().set(&members_key, &true);
        Self::token(&env).mint(&member, &5_i128);
        events::emit_joined(&env, &member, 5);
    }

    /// Alias for get_active_services() — keeps old frontend working
    pub fn get_offers(env: Env) -> Vec<Service> {
        Self::get_active_services(env)
    }

    /// Alias for list_service() — keeps old frontend working
    pub fn offer_service(env: Env, provider: Address, description: String, hours: u32) -> u64 {
        Self::list_service(env, provider, description.clone(), description, hours)
    }

    /// Alias for book_service() — keeps old frontend working
    pub fn request_service(env: Env, requester: Address, service_id: u64) -> u64 {
        Self::book_service(env, requester, service_id)
    }

    /// Alias for balance() — keeps old frontend working
    pub fn get_balance(env: Env, member: Address) -> i128 {
        Self::balance(env, member)
    }
}