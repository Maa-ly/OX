/// ODX - Otaku Data Exchange
/// Shared Data Types Module
/// 
/// This module defines all shared data structures used across the ODX platform
/// including IP tokens, engagement data, pricing, and reward structures.

module odx::datatypes;

use sui::object::{Self, UID, ID};
use sui::tx_context::TxContext;
use std::vector;

/// IP Token Metadata
/// Stores information about an anime/manga/manhwa IP token
public struct IPTokenMetadata has copy, drop, store {
    /// Name of the IP (e.g., "Chainsaw Man", "One Piece")
    name: vector<u8>,
    /// Symbol/ticker for the token (e.g., "CSM", "OP")
    symbol: vector<u8>,
    /// Description of the IP
    description: vector<u8>,
    /// Category: anime, manga, or manhwa
    category: u8, // 0 = anime, 1 = manga, 2 = manhwa
    /// Timestamp when token was created
    created_at: u64,
}

/// IP Token Object
/// Represents a tokenized IP with fixed supply and metadata
public struct IPToken has key {
    id: UID,
    /// Token metadata
    metadata: IPTokenMetadata,
    /// Total supply of tokens (fixed at 200k)
    total_supply: u64,
    /// Amount reserved for contributor rewards
    reserve_pool: u64,
    /// Amount currently in circulation
    circulating_supply: u64,
    /// Admin address that created this token
    admin: address,
}

/// Engagement Data Structure
/// Represents a single engagement event from a user
/// Note: Actual data storage will be on Walrus, this is for on-chain tracking
public struct EngagementData has copy, drop, store {
    /// IP token ID this engagement is for
    ip_token_id: ID,
    /// User wallet address
    user_address: address,
    /// Rating (0-10 scale)
    rating: u8,
    /// Prediction text hash (full text stored on Walrus)
    prediction_hash: vector<u8>,
    /// Timestamp of engagement
    timestamp: u64,
    /// Type of engagement: 0 = rating, 1 = prediction, 2 = vote, 3 = review
    engagement_type: u8,
}

/// Engagement Metrics
/// Aggregated metrics for an IP token based on all engagements
public struct EngagementMetrics has copy, drop, store {
    /// IP token ID
    ip_token_id: ID,
    /// Average rating across all users
    average_rating: u64, // Scaled by 100 for precision (e.g., 850 = 8.50)
    /// Total number of contributors
    total_contributors: u64,
    /// Total number of engagements
    total_engagements: u64,
    /// Prediction accuracy score (0-10000, scaled by 100)
    prediction_accuracy: u64,
    /// Engagement growth rate (percentage, scaled by 100)
    growth_rate: u64,
    /// Last update timestamp
    last_updated: u64,
}

/// Price Data
/// Current price information for an IP token
public struct PriceData has copy, drop, store {
    /// IP token ID
    ip_token_id: ID,
    /// Current price in SUI (scaled by 1e9 for precision)
    price: u64,
    /// Price change percentage (scaled by 100)
    price_change: u64,
    /// Last price update timestamp
    last_updated: u64,
    /// Base price (initial price)
    base_price: u64,
}

/// Contributor Record
/// Tracks a user's contribution to an IP token
public struct ContributorRecord has copy, store {
    /// IP token ID
    ip_token_id: ID,
    /// User address
    user_address: address,
    /// Total engagement count
    engagement_count: u64,
    /// Average rating given
    average_rating: u64,
    /// Prediction accuracy score
    prediction_accuracy: u64,
    /// Total rewards earned
    total_rewards: u64,
    /// Whether this is an early contributor (first 100)
    is_early_contributor: bool,
    /// First engagement timestamp
    first_engagement: u64,
}

/// Reward Distribution Data
/// Information about a reward distribution event
public struct RewardDistribution has copy, drop, store {
    /// IP token ID
    ip_token_id: ID,
    /// Contributor address
    contributor: address,
    /// Amount of tokens rewarded
    amount: u64,
    /// Reason for reward: 0 = early engagement, 1 = prediction accuracy, 2 = viral content, 3 = network effect
    reward_reason: u8,
    /// Distribution timestamp
    timestamp: u64,
}

/// Market Order
/// Represents a buy or sell order in the marketplace
public struct MarketOrder has key {
    id: UID,
    /// IP token ID
    ip_token_id: ID,
    /// Order creator address
    creator: address,
    /// Order type: 0 = buy, 1 = sell
    order_type: u8,
    /// Price per token (in SUI, scaled by 1e9)
    price: u64,
    /// Quantity of tokens
    quantity: u64,
    /// Filled quantity
    filled_quantity: u64,
    /// Order status: 0 = active, 1 = partially filled, 2 = filled, 3 = cancelled
    status: u8,
    /// Creation timestamp
    created_at: u64,
}

/// Constants for engagement types
const ENGAGEMENT_TYPE_RATING: u8 = 0;
const ENGAGEMENT_TYPE_PREDICTION: u8 = 1;
const ENGAGEMENT_TYPE_VOTE: u8 = 2;
const ENGAGEMENT_TYPE_REVIEW: u8 = 3;

/// Constants for reward reasons
const REWARD_EARLY_ENGAGEMENT: u8 = 0;
const REWARD_PREDICTION_ACCURACY: u8 = 1;
const REWARD_VIRAL_CONTENT: u8 = 2;
const REWARD_NETWORK_EFFECT: u8 = 3;

/// Constants for order types
const ORDER_TYPE_BUY: u8 = 0;
const ORDER_TYPE_SELL: u8 = 1;

/// Constants for order status
const ORDER_STATUS_ACTIVE: u8 = 0;
const ORDER_STATUS_PARTIALLY_FILLED: u8 = 1;
const ORDER_STATUS_FILLED: u8 = 2;
const ORDER_STATUS_CANCELLED: u8 = 3;

/// Constants for IP categories
const CATEGORY_ANIME: u8 = 0;
const CATEGORY_MANGA: u8 = 1;
const CATEGORY_MANHWA: u8 = 2;

/// Fixed supply for all IP tokens (200k tokens)
const FIXED_TOKEN_SUPPLY: u64 = 200000;

/// Early contributor threshold (first N contributors get bonus)
const EARLY_CONTRIBUTOR_THRESHOLD: u64 = 100;

/// Price precision scale (1e9)
const PRICE_SCALE: u64 = 1000000000;

/// Rating precision scale (1e2)
const RATING_SCALE: u64 = 100;

/// Maximum rating value
const MAX_RATING: u8 = 10;

/// Minimum rating value
const MIN_RATING: u8 = 0;

// Public getter functions for constants
public fun fixed_token_supply(): u64 { FIXED_TOKEN_SUPPLY }
public fun early_contributor_threshold(): u64 { EARLY_CONTRIBUTOR_THRESHOLD }
public fun price_scale(): u64 { PRICE_SCALE }
public fun rating_scale(): u64 { RATING_SCALE }
public fun max_rating(): u8 { MAX_RATING }
public fun min_rating(): u8 { MIN_RATING }

// Public getter functions for engagement types
public fun engagement_type_rating(): u8 { ENGAGEMENT_TYPE_RATING }
public fun engagement_type_prediction(): u8 { ENGAGEMENT_TYPE_PREDICTION }
public fun engagement_type_vote(): u8 { ENGAGEMENT_TYPE_VOTE }
public fun engagement_type_review(): u8 { ENGAGEMENT_TYPE_REVIEW }

// Public getter functions for reward reasons
public fun reward_early_engagement(): u8 { REWARD_EARLY_ENGAGEMENT }
public fun reward_prediction_accuracy(): u8 { REWARD_PREDICTION_ACCURACY }
public fun reward_viral_content(): u8 { REWARD_VIRAL_CONTENT }
public fun reward_network_effect(): u8 { REWARD_NETWORK_EFFECT }

// Public getter functions for order types
public fun order_type_buy(): u8 { ORDER_TYPE_BUY }
public fun order_type_sell(): u8 { ORDER_TYPE_SELL }

// Public getter functions for order status
public fun order_status_active(): u8 { ORDER_STATUS_ACTIVE }
public fun order_status_partially_filled(): u8 { ORDER_STATUS_PARTIALLY_FILLED }
public fun order_status_filled(): u8 { ORDER_STATUS_FILLED }
public fun order_status_cancelled(): u8 { ORDER_STATUS_CANCELLED }

// Public getter functions for categories
public fun category_anime(): u8 { CATEGORY_ANIME }
public fun category_manga(): u8 { CATEGORY_MANGA }
public fun category_manhwa(): u8 { CATEGORY_MANHWA }

// MarketOrder getter and setter functions
public fun get_order_status(order: &MarketOrder): u8 { order.status }
public fun get_order_type(order: &MarketOrder): u8 { order.order_type }
public fun get_order_quantity(order: &MarketOrder): u64 { order.quantity }
public fun get_order_filled_quantity(order: &MarketOrder): u64 { order.filled_quantity }
public fun get_order_price(order: &MarketOrder): u64 { order.price }
public fun get_order_creator(order: &MarketOrder): address { order.creator }
public fun get_order_ip_token_id(order: &MarketOrder): ID { order.ip_token_id }

public fun set_order_status(order: &mut MarketOrder, status: u8) { order.status = status }
public fun set_order_filled_quantity(order: &mut MarketOrder, filled: u64) { order.filled_quantity = filled }

// MarketOrder constructor (must be in datatypes since MarketOrder has key)
public fun create_market_order(
    ip_token_id: ID,
    creator: address,
    order_type: u8,
    price: u64,
    quantity: u64,
    created_at: u64,
    ctx: &mut TxContext,
): MarketOrder {
    MarketOrder {
        id: object::new(ctx),
        ip_token_id,
        creator,
        order_type,
        price,
        quantity,
        filled_quantity: 0,
        status: ORDER_STATUS_ACTIVE,
        created_at,
    }
}

// PriceData getter and setter functions
public fun get_price_data_price(price_data: &PriceData): u64 { price_data.price }
public fun get_price_data_base_price(price_data: &PriceData): u64 { price_data.base_price }
public fun get_price_data_price_change(price_data: &PriceData): u64 { price_data.price_change }
public fun set_price_data_price(price_data: &mut PriceData, price: u64) { price_data.price = price }
public fun set_price_data_price_change(price_data: &mut PriceData, change: u64) { price_data.price_change = change }
public fun set_price_data_last_updated(price_data: &mut PriceData, timestamp: u64) { price_data.last_updated = timestamp }

// EngagementMetrics getter and setter functions
public fun get_metrics_total_contributors(metrics: &EngagementMetrics): u64 { metrics.total_contributors }
public fun get_metrics_last_updated(metrics: &EngagementMetrics): u64 { metrics.last_updated }
public fun set_metrics_total_contributors(metrics: &mut EngagementMetrics, count: u64) { metrics.total_contributors = count }
public fun set_metrics_last_updated(metrics: &mut EngagementMetrics, timestamp: u64) { metrics.last_updated = timestamp }
public fun get_metrics_growth_rate(metrics: &EngagementMetrics): u64 { metrics.growth_rate }
public fun set_metrics_growth_rate(metrics: &mut EngagementMetrics, rate: u64) { metrics.growth_rate = rate }

// EngagementMetrics constructor
public fun create_engagement_metrics(
    ip_token_id: ID,
    average_rating: u64,
    total_contributors: u64,
    total_engagements: u64,
    prediction_accuracy: u64,
    growth_rate: u64,
    last_updated: u64,
): EngagementMetrics {
    EngagementMetrics {
        ip_token_id,
        average_rating,
        total_contributors,
        total_engagements,
        prediction_accuracy,
        growth_rate,
        last_updated,
    }
}

// PriceData constructor
public fun create_price_data(
    ip_token_id: ID,
    price: u64,
    price_change: u64,
    last_updated: u64,
    base_price: u64,
): PriceData {
    PriceData {
        ip_token_id,
        price,
        price_change,
        last_updated,
        base_price,
    }
}

// EngagementData getter functions
public fun get_engagement_user_address(engagement: &EngagementData): address { engagement.user_address }
public fun get_engagement_rating(engagement: &EngagementData): u8 { engagement.rating }
public fun get_engagement_timestamp(engagement: &EngagementData): u64 { engagement.timestamp }
public fun get_engagement_ip_token_id(engagement: &EngagementData): ID { engagement.ip_token_id }

// ContributorRecord getter and setter functions
public fun get_contributor_engagement_count(contributor: &ContributorRecord): u64 { contributor.engagement_count }
public fun get_contributor_average_rating(contributor: &ContributorRecord): u64 { contributor.average_rating }
public fun get_contributor_total_rewards(contributor: &ContributorRecord): u64 { contributor.total_rewards }
public fun get_contributor_is_early(contributor: &ContributorRecord): bool { contributor.is_early_contributor }
public fun set_contributor_engagement_count(contributor: &mut ContributorRecord, count: u64) { contributor.engagement_count = count }
public fun set_contributor_average_rating(contributor: &mut ContributorRecord, rating: u64) { contributor.average_rating = rating }
public fun set_contributor_total_rewards(contributor: &mut ContributorRecord, rewards: u64) { contributor.total_rewards = rewards }
public fun get_contributor_prediction_accuracy(contributor: &ContributorRecord): u64 { contributor.prediction_accuracy }
public fun set_contributor_prediction_accuracy(contributor: &mut ContributorRecord, accuracy: u64) { contributor.prediction_accuracy = accuracy }

// ContributorRecord constructor
public fun create_contributor_record(
    ip_token_id: ID,
    user_address: address,
    engagement_count: u64,
    average_rating: u64,
    prediction_accuracy: u64,
    total_rewards: u64,
    is_early_contributor: bool,
    first_engagement: u64,
): ContributorRecord {
    ContributorRecord {
        ip_token_id,
        user_address,
        engagement_count,
        average_rating,
        prediction_accuracy,
        total_rewards,
        is_early_contributor,
        first_engagement,
    }
}

// IPTokenMetadata constructor
public fun create_ip_token_metadata(
    name: vector<u8>,
    symbol: vector<u8>,
    description: vector<u8>,
    category: u8,
    created_at: u64,
): IPTokenMetadata {
    IPTokenMetadata {
        name,
        symbol,
        description,
        category,
        created_at,
    }
}

// IPTokenMetadata getter functions
public fun get_metadata_name(metadata: &IPTokenMetadata): vector<u8> { metadata.name }
public fun get_metadata_symbol(metadata: &IPTokenMetadata): vector<u8> { metadata.symbol }

// IPToken constructor (must be in datatypes since IPToken has key)
public fun create_ip_token(
    metadata: IPTokenMetadata,
    total_supply: u64,
    reserve_pool: u64,
    circulating_supply: u64,
    admin: address,
    ctx: &mut TxContext,
): IPToken {
    IPToken {
        id: object::new(ctx),
        metadata,
        total_supply,
        reserve_pool,
        circulating_supply,
        admin,
    }
}

// IPToken getter functions
public fun get_token_metadata(token: &IPToken): IPTokenMetadata { token.metadata }
public fun get_token_total_supply(token: &IPToken): u64 { token.total_supply }
public fun get_token_reserve_pool(token: &IPToken): u64 { token.reserve_pool }
public fun get_token_circulating_supply(token: &IPToken): u64 { token.circulating_supply }
public fun get_token_admin(token: &IPToken): address { token.admin }

// IPToken setter functions
public fun set_token_reserve_pool(token: &mut IPToken, amount: u64) { token.reserve_pool = amount }
public fun set_token_circulating_supply(token: &mut IPToken, amount: u64) { token.circulating_supply = amount }

// RewardDistribution constructor
public fun create_reward_distribution(
    ip_token_id: ID,
    contributor: address,
    amount: u64,
    reward_reason: u8,
    timestamp: u64,
): RewardDistribution {
    RewardDistribution {
        ip_token_id,
        contributor,
        amount,
        reward_reason,
        timestamp,
    }
}

