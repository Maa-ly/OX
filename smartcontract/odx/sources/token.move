/// ODX - Token Management Module
/// 
/// This module handles the creation and management of IP tokens.
/// Each IP (anime/manga/manhwa) gets its own token with fixed supply of 200k.
/// Admin can create tokens, manage reserve pools, and control distribution.

module odx::token;

use sui::object::{Self, UID, ID};
use sui::tx_context::{Self, TxContext};
use sui::transfer;
use std::vector;
use odx::datatypes::{Self, IPToken, IPTokenMetadata};

/// Admin Capability
/// Grants admin privileges to create and manage IP tokens
public struct AdminCap has key {
    id: UID,
}

/// Token Registry
/// Stores all created IP tokens for easy lookup
public struct TokenRegistry has key {
    id: UID,
    /// Map of token symbol to token ID
    tokens: vector<ID>,
    /// Admin address
    admin: address,
}

/// Error codes
const E_NOT_ADMIN: u64 = 0;
const E_TOKEN_EXISTS: u64 = 1;
const E_INVALID_SUPPLY: u64 = 2;
const E_INVALID_RESERVE: u64 = 3;
const E_INSUFFICIENT_RESERVE: u64 = 4;
const E_TOKEN_NOT_FOUND: u64 = 5;

/// Initialize the token module
/// Creates the admin capability and token registry
/// This should be called once during deployment
fun init(ctx: &mut TxContext) {
    let admin_cap = AdminCap {
        id: object::new(ctx),
    };
    
    let registry = TokenRegistry {
        id: object::new(ctx),
        tokens: vector::empty(),
        admin: tx_context::sender(ctx),
    };
    
    // Transfer admin cap to sender (deployer)
    transfer::share_object(admin_cap);
    transfer::share_object(registry);
}

/// Create a new IP token
/// Only admin can call this function
/// 
/// # Arguments:
/// - `name`: Name of the IP (e.g., "Chainsaw Man")
/// - `symbol`: Token symbol (e.g., "CSM")
/// - `description`: Description of the IP
/// - `category`: Category (0 = anime, 1 = manga, 2 = manhwa)
/// - `reserve_pool_size`: Amount of tokens to reserve for rewards (must be < total_supply)
/// - `ctx`: Transaction context
/// 
/// # Returns:
/// - `IPToken`: The newly created IP token object
public fun create_ip_token(
    _admin_cap: &AdminCap,
    registry: &mut TokenRegistry,
    name: vector<u8>,
    symbol: vector<u8>,
    description: vector<u8>,
    category: u8,
    reserve_pool_size: u64,
    ctx: &mut TxContext
): IPToken {
    // Validate reserve pool size
    assert!(reserve_pool_size < odx::datatypes::fixed_token_supply(), E_INVALID_RESERVE);
    
    // Create metadata
    let metadata = odx::datatypes::create_ip_token_metadata(
        name,
        symbol,
        description,
        category,
        tx_context::epoch_timestamp_ms(ctx),
    );
    
    // Create IP token using constructor from datatypes module
    let token = odx::datatypes::create_ip_token(
        metadata,
        odx::datatypes::fixed_token_supply(),
        reserve_pool_size,
        odx::datatypes::fixed_token_supply() - reserve_pool_size,
        tx_context::sender(ctx),
        ctx,
    );
    
    // Add to registry
    let token_id = object::id(&token);
    vector::push_back(&mut registry.tokens, token_id);
    
    token
}

/// Get token information
/// Returns a copy of the token's key information
public fun get_token_info(token: &IPToken): (vector<u8>, vector<u8>, u64, u64, u64) {
    let metadata = odx::datatypes::get_token_metadata(token);
    (
        odx::datatypes::get_metadata_name(&metadata),
        odx::datatypes::get_metadata_symbol(&metadata),
        odx::datatypes::get_token_total_supply(token),
        odx::datatypes::get_token_reserve_pool(token),
        odx::datatypes::get_token_circulating_supply(token),
    )
}

/// Update reserve pool
/// Admin can adjust the reserve pool size (but cannot exceed total supply)
public fun update_reserve_pool(
    _admin_cap: &AdminCap,
    token: &mut IPToken,
    new_reserve_size: u64,
) {
    assert!(new_reserve_size <= odx::datatypes::get_token_total_supply(token), E_INVALID_RESERVE);
    
    let old_reserve = odx::datatypes::get_token_reserve_pool(token);
    odx::datatypes::set_token_reserve_pool(token, new_reserve_size);
    
    // Adjust circulating supply accordingly
    if (new_reserve_size > old_reserve) {
        let diff = new_reserve_size - old_reserve;
        let current_circulating = odx::datatypes::get_token_circulating_supply(token);
        odx::datatypes::set_token_circulating_supply(token, current_circulating - diff);
    } else {
        let diff = old_reserve - new_reserve_size;
        let current_circulating = odx::datatypes::get_token_circulating_supply(token);
        odx::datatypes::set_token_circulating_supply(token, current_circulating + diff);
    };
}

/// Release tokens from reserve pool
/// Called by reward system to distribute tokens to contributors
/// 
/// # Arguments:
/// - `token`: The IP token to release from
/// - `amount`: Amount of tokens to release
/// 
/// # Returns:
/// - `u64`: The amount released (may be less than requested if reserve is insufficient)
public fun release_from_reserve(
    token: &mut IPToken,
    amount: u64,
): u64 {
    let available = odx::datatypes::get_token_reserve_pool(token);
    let release_amount = if (amount > available) available else amount;
    
    let new_reserve = available - release_amount;
    odx::datatypes::set_token_reserve_pool(token, new_reserve);
    
    let current_circulating = odx::datatypes::get_token_circulating_supply(token);
    odx::datatypes::set_token_circulating_supply(token, current_circulating + release_amount);
    
    release_amount
}

/// Check if reserve pool has sufficient tokens
public fun has_reserve(token: &IPToken, amount: u64): bool {
    odx::datatypes::get_token_reserve_pool(token) >= amount
}

/// Get reserve pool balance
public fun get_reserve_balance(token: &IPToken): u64 {
    odx::datatypes::get_token_reserve_pool(token)
}

/// Get circulating supply
public fun get_circulating_supply(token: &IPToken): u64 {
    odx::datatypes::get_token_circulating_supply(token)
}

/// Get total supply
public fun get_total_supply(token: &IPToken): u64 {
    odx::datatypes::get_token_total_supply(token)
}

/// Get token metadata
public fun get_metadata(token: &IPToken): IPTokenMetadata {
    odx::datatypes::get_token_metadata(token)
}

/// Get all token IDs from registry
public fun get_all_tokens(registry: &TokenRegistry): vector<ID> {
    registry.tokens
}

/// Get token count in registry
public fun get_token_count(registry: &TokenRegistry): u64 {
    vector::length(&registry.tokens)
}

