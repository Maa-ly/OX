/// ODX - Rewards Distribution Module
/// 
/// This module handles tracking contributors and distributing rewards.
/// Rewards are given for:
/// - Early engagement (first 100 contributors)
/// - Prediction accuracy
/// - Viral content (high engagement)
/// - Network effects (bringing others)

module odx::rewards;

use sui::table::{Self, Table};
use odx::datatypes::{ContributorRecord, RewardDistribution, EngagementData, IPToken};
use odx::token;

/// Contributor Key
/// Wrapper for (ip_token_id, user_address) tuple to use as Table key
public struct ContributorKey has copy, drop, store {
    ip_token_id: ID,
    user_address: address,
}

/// Rewards Registry
/// Tracks all contributors and their rewards
public struct RewardsRegistry has key {
    id: UID,
    /// Map of contributor key -> ContributorRecord
    contributors: Table<ContributorKey, ContributorRecord>,
    /// Map of ip_token_id -> total contributors count
    contributor_counts: Table<ID, u64>,
    /// Reward history
    reward_history: vector<RewardDistribution>,
}

/// Reward Configuration
/// Configurable parameters for reward calculation
public struct RewardConfig has key {
    id: UID,
    /// Early contributor bonus multiplier (scaled by 100, e.g., 200 = 2x)
    early_contributor_multiplier: u64,
    /// Base reward per engagement
    base_reward: u64,
    /// Prediction accuracy reward multiplier
    prediction_multiplier: u64,
    /// Viral content threshold (engagement count)
    viral_threshold: u64,
    /// Viral content bonus multiplier
    viral_multiplier: u64,
}

/// Error codes

/// Initialize rewards system
fun init(ctx: &mut TxContext) {
    let registry = RewardsRegistry {
        id: object::new(ctx),
        contributors: table::new(ctx),
        contributor_counts: table::new(ctx),
        reward_history: std::vector::empty(),
    };
    
    let config = RewardConfig {
        id: object::new(ctx),
        early_contributor_multiplier: 200, // 2x bonus
        base_reward: 100, // Base 100 tokens per engagement
        prediction_multiplier: 150, // 1.5x for accurate predictions
        viral_threshold: 1000, // 1000+ engagements = viral
        viral_multiplier: 300, // 3x bonus for viral content
    };
    
    sui::transfer::share_object(registry);
    sui::transfer::share_object(config);
}

/// Register engagement
/// Called when a user engages with an IP token
/// Creates or updates contributor record
/// 
/// # Arguments:
/// - `registry`: Rewards registry
/// - `engagement`: Engagement data
/// - `ip_token`: IP token object
/// - `ctx`: Transaction context
public fun register_engagement(
    registry: &mut RewardsRegistry,
    engagement: EngagementData,
    ip_token: &IPToken,
    _ctx: &mut TxContext,
) {
    let ip_token_id = object::id(ip_token);
    let user_address = odx::datatypes::get_engagement_user_address(&engagement);
    let key = ContributorKey {
        ip_token_id,
        user_address,
    };
    
    // Check if contributor exists
    let contributor_exists = table::contains(&registry.contributors, key);
    
    if (!contributor_exists) {
        // New contributor - check if early
        let count = if (table::contains(&registry.contributor_counts, ip_token_id)) {
            *table::borrow(&registry.contributor_counts, ip_token_id)
        } else {
            0
        };
        
        let is_early = count < odx::datatypes::early_contributor_threshold();
        
        // Create new contributor record
        let contributor = odx::datatypes::create_contributor_record(
            ip_token_id,
            user_address,
            1,
            (odx::datatypes::get_engagement_rating(&engagement) as u64) * 100, // Scale by 100
            0, // Will be updated later
            0,
            is_early,
            odx::datatypes::get_engagement_timestamp(&engagement),
        );
        
        table::add(&mut registry.contributors, key, contributor);
        
        // Update count
        if (table::contains(&registry.contributor_counts, ip_token_id)) {
            let count_ref = table::borrow_mut(&mut registry.contributor_counts, ip_token_id);
            *count_ref = *count_ref + 1;
        } else {
            table::add(&mut registry.contributor_counts, ip_token_id, 1);
        };
    } else {
        // Update existing contributor
        let contributor = table::borrow_mut(&mut registry.contributors, key);
        let old_count = odx::datatypes::get_contributor_engagement_count(contributor);
        odx::datatypes::set_contributor_engagement_count(contributor, old_count + 1);
        
        // Update average rating
        let old_rating = odx::datatypes::get_contributor_average_rating(contributor);
        let total_rating = old_rating * old_count;
        let new_total = total_rating + ((odx::datatypes::get_engagement_rating(&engagement) as u64) * 100);
        odx::datatypes::set_contributor_average_rating(contributor, new_total / (old_count + 1));
    };
}

/// Calculate reward for a contributor
/// Determines reward amount based on various factors
/// 
/// # Arguments:
/// - `config`: Reward configuration
/// - `registry`: Rewards registry
/// - `ip_token_id`: IP token ID
/// - `user_address`: Contributor address
/// 
/// # Returns:
/// - `u64`: Calculated reward amount
public fun calculate_reward(
    config: &RewardConfig,
    registry: &RewardsRegistry,
    ip_token_id: ID,
    user_address: address,
): u64 {
    let key = ContributorKey {
        ip_token_id,
        user_address,
    };
    
    if (!table::contains(&registry.contributors, key)) {
        return 0
    };
    
    let contributor = table::borrow(&registry.contributors, key);
    let mut reward = config.base_reward;
    
    // Early contributor bonus
    if (odx::datatypes::get_contributor_is_early(contributor)) {
        reward = (reward * config.early_contributor_multiplier) / 100;
    };
    
    // Prediction accuracy bonus
    if (odx::datatypes::get_contributor_prediction_accuracy(contributor) > 7000) { // > 70% accuracy
        reward = (reward * config.prediction_multiplier) / 100;
    };
    
    // Viral content bonus
    if (odx::datatypes::get_contributor_engagement_count(contributor) >= config.viral_threshold) {
        reward = (reward * config.viral_multiplier) / 100;
    };
    
    reward
}

/// Distribute reward to contributor
/// Releases tokens from IP token reserve pool and records the distribution
/// 
/// # Arguments:
/// - `registry`: Rewards registry
/// - `config`: Reward configuration
/// - `ip_token`: IP token to distribute from
/// - `user_address`: Contributor address
/// - `reason`: Reason for reward (0-3)
/// - `ctx`: Transaction context
/// 
/// # Returns:
/// - `u64`: Amount of tokens distributed
public fun distribute_reward(
    registry: &mut RewardsRegistry,
    config: &RewardConfig,
    ip_token: &mut IPToken,
    user_address: address,
    reason: u8,
    ctx: &mut TxContext,
): u64 {
    let ip_token_id = object::id(ip_token);
    
    // Calculate reward
    let reward_amount = calculate_reward(config, registry, ip_token_id, user_address);
    
    if (reward_amount == 0) {
        return 0
    };
    
    // Check if reserve has enough
    if (!token::has_reserve(ip_token, reward_amount)) {
        return 0
    };
    
    // Release from reserve
    let released = token::release_from_reserve(ip_token, reward_amount);
    
    if (released > 0) {
        // Update contributor record
        let key = ContributorKey {
            ip_token_id,
            user_address,
        };
        if (table::contains(&registry.contributors, key)) {
            let contributor = table::borrow_mut(&mut registry.contributors, key);
            let old_rewards = odx::datatypes::get_contributor_total_rewards(contributor);
            odx::datatypes::set_contributor_total_rewards(contributor, old_rewards + released);
        };
        
        // Record in history
        let distribution = odx::datatypes::create_reward_distribution(
            ip_token_id,
            user_address,
            released,
            reason,
            tx_context::epoch_timestamp_ms(ctx),
        );
        std::vector::push_back(&mut registry.reward_history, distribution);
    };
    
    released
}

/// Update prediction accuracy for a contributor
/// Called when predictions are evaluated
public fun update_prediction_accuracy(
    registry: &mut RewardsRegistry,
    ip_token_id: ID,
    user_address: address,
    accuracy: u64, // 0-10000 (scaled by 100)
) {
    let key = ContributorKey {
        ip_token_id,
        user_address,
    };
    
    if (table::contains(&registry.contributors, key)) {
        let contributor = table::borrow_mut(&mut registry.contributors, key);
        odx::datatypes::set_contributor_prediction_accuracy(contributor, accuracy);
    };
}

/// Get contributor record
public fun get_contributor(
    registry: &RewardsRegistry,
    ip_token_id: ID,
    user_address: address,
): Option<ContributorRecord> {
    let key = ContributorKey {
        ip_token_id,
        user_address,
    };
    
    if (table::contains(&registry.contributors, key)) {
        std::option::some(*table::borrow(&registry.contributors, key))
    } else {
        std::option::none()
    }
}

/// Get total contributors for an IP token
public fun get_contributor_count(
    registry: &RewardsRegistry,
    ip_token_id: ID,
): u64 {
    if (table::contains(&registry.contributor_counts, ip_token_id)) {
        *table::borrow(&registry.contributor_counts, ip_token_id)
    } else {
        0
    }
}

/// Get reward history length
public fun get_reward_history_length(registry: &RewardsRegistry): u64 {
    std::vector::length(&registry.reward_history)
}

