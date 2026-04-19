use soroban_sdk::{symbol_short, Address, Env, String};

// ── Event topics ──────────────────────────────────────────────────────────────
// Every event has two topics: ("timebank", <action>)
// The data payload carries the relevant addresses and values.
// Frontend listens to topic[0] = "timebank" to filter our events only.

pub fn emit_joined(env: &Env, member: &Address, initial_balance: i128) {
    env.events().publish(
        (symbol_short!("timebank"), symbol_short!("joined")),
        (member.clone(), initial_balance),
    );
}

pub fn emit_service_listed(
    env:         &Env,
    service_id:  u64,
    provider:    &Address,
    title:       &String,
    hours:       u32,
) {
    env.events().publish(
        (symbol_short!("timebank"), symbol_short!("listed")),
        (service_id, provider.clone(), title.clone(), hours),
    );
}

pub fn emit_service_booked(
    env:        &Env,
    booking_id: u64,
    service_id: u64,
    requester:  &Address,
    provider:   &Address,
    hours:      u32,
) {
    env.events().publish(
        (symbol_short!("timebank"), symbol_short!("booked")),
        (booking_id, service_id, requester.clone(), provider.clone(), hours),
    );
}

pub fn emit_completed(
    env:        &Env,
    booking_id: u64,
    requester:  &Address,
    provider:   &Address,
    hours:      u32,
) {
    env.events().publish(
        (symbol_short!("timebank"), symbol_short!("completed")),
        (booking_id, requester.clone(), provider.clone(), hours),
    );
}