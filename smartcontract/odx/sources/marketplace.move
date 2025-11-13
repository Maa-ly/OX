/// ODX - Marketplace Module
/// 
/// This module handles trading of IP tokens.
/// Supports buy and sell orders with order matching logic.
/// Uses a simple order book model for price discovery.

module odx::marketplace;

use sui::object::{Self, UID, ID};
use sui::tx_context::{Self, TxContext};
use sui::transfer;
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use std::vector;
use odx::datatypes::{Self, MarketOrder, IPToken};

/// Marketplace
/// Main marketplace object that tracks all orders
public struct Marketplace has key {
    id: UID,
    /// All active buy orders (ordered by price, highest first)
    buy_orders: vector<ID>,
    /// All active sell orders (ordered by price, lowest first)
    sell_orders: vector<ID>,
    /// Trading fee percentage (scaled by 100, e.g., 100 = 1%)
    trading_fee_bps: u64, // basis points (1/100 of 1%)
}

/// Order Execution Result
/// Returned after order execution
public struct OrderExecutionResult has copy, drop {
    filled_quantity: u64,
    total_price: u64,
    fee: u64,
}

/// Error codes
const E_INVALID_ORDER_TYPE: u64 = 0;
const E_INVALID_PRICE: u64 = 1;
const E_INVALID_QUANTITY: u64 = 2;
const E_ORDER_NOT_FOUND: u64 = 3;
const E_INSUFFICIENT_BALANCE: u64 = 4;
const E_ORDER_ALREADY_FILLED: u64 = 5;
const E_ORDER_NOT_ACTIVE: u64 = 6;
const E_INSUFFICIENT_PAYMENT: u64 = 7;

/// Initialize marketplace
/// Creates the marketplace with default trading fee (1%)
fun init(ctx: &mut TxContext) {
    let marketplace = Marketplace {
        id: object::new(ctx),
        buy_orders: vector::empty(),
        sell_orders: vector::empty(),
        trading_fee_bps: 100, // 1% default fee
    };
    
    transfer::share_object(marketplace);
}

/// Create a buy order
/// User wants to buy IP tokens at a specific price
/// 
/// # Arguments:
/// - `marketplace`: The marketplace object
/// - `ip_token_id`: ID of the IP token to buy
/// - `price`: Price per token in SUI (scaled by 1e9)
/// - `quantity`: Number of tokens to buy
/// - `payment`: Payment coin in SUI
/// - `ctx`: Transaction context
/// 
/// # Returns:
/// - `MarketOrder`: The created buy order
/// - `Coin<SUI>`: Remaining payment (if any)
public fun create_buy_order(
    marketplace: &mut Marketplace,
    ip_token_id: ID,
    price: u64,
    quantity: u64,
    payment: Coin<SUI>,
    ctx: &mut TxContext,
): (MarketOrder, Coin<SUI>) {
    assert!(price > 0, E_INVALID_PRICE);
    assert!(quantity > 0, E_INVALID_QUANTITY);
    
    let total_cost = price * quantity;
    let fee = (total_cost * marketplace.trading_fee_bps) / 10000;
    let total_required = total_cost + fee;
    
    let payment_value = coin::value(&payment);
    assert!(payment_value >= total_required, E_INSUFFICIENT_PAYMENT);
    
    // Create order
    let order = MarketOrder {
        id: object::new(ctx),
        ip_token_id,
        creator: tx_context::sender(ctx),
        order_type: odx::datatypes::order_type_buy(),
        price,
        quantity,
        filled_quantity: 0,
        status: odx::datatypes::order_status_active(),
        created_at: tx_context::epoch_timestamp_ms(ctx),
    };
    
    // Add to buy orders
    let order_id = object::id(&order);
    vector::push_back(&mut marketplace.buy_orders, order_id);
    
    // Return remaining payment
    let remaining = payment_value - total_required;
    let remaining_coin = if (remaining > 0) {
        coin::split(&mut payment, remaining, ctx)
    } else {
        payment
    };
    
    (order, remaining_coin)
}

/// Create a sell order
/// User wants to sell IP tokens at a specific price
/// 
/// # Arguments:
/// - `marketplace`: The marketplace object
/// - `ip_token_id`: ID of the IP token to sell
/// - `price`: Price per token in SUI (scaled by 1e9)
/// - `quantity`: Number of tokens to sell
/// - `ctx`: Transaction context
/// 
/// # Returns:
/// - `MarketOrder`: The created sell order
public fun create_sell_order(
    marketplace: &mut Marketplace,
    ip_token_id: ID,
    price: u64,
    quantity: u64,
    ctx: &mut TxContext,
): MarketOrder {
    assert!(price > 0, E_INVALID_PRICE);
    assert!(quantity > 0, E_INVALID_QUANTITY);
    
    // Create order
    let order = MarketOrder {
        id: object::new(ctx),
        ip_token_id,
        creator: tx_context::sender(ctx),
        order_type: odx::datatypes::order_type_sell(),
        price,
        quantity,
        filled_quantity: 0,
        status: odx::datatypes::order_status_active(),
        created_at: tx_context::epoch_timestamp_ms(ctx),
    };
    
    // Add to sell orders
    let order_id = object::id(&order);
    vector::push_back(&mut marketplace.sell_orders, order_id);
    
    order
}

/// Execute buy order (match with sell orders)
/// Tries to fill a buy order by matching with available sell orders
/// 
/// # Arguments:
/// - `marketplace`: The marketplace object
/// - `buy_order`: The buy order to execute
/// - `ctx`: Transaction context
/// 
/// # Returns:
/// - `OrderExecutionResult`: Execution details
public fun execute_buy_order(
    marketplace: &mut Marketplace,
    buy_order: &mut MarketOrder,
    ctx: &mut TxContext,
): OrderExecutionResult {
    assert!(odx::datatypes::get_order_status(buy_order) == odx::datatypes::order_status_active(), E_ORDER_NOT_ACTIVE);
    assert!(odx::datatypes::get_order_type(buy_order) == odx::datatypes::order_type_buy(), E_INVALID_ORDER_TYPE);
    
    let mut filled = 0;
    let mut total_paid = 0;
    let remaining_quantity = odx::datatypes::get_order_quantity(buy_order) - odx::datatypes::get_order_filled_quantity(buy_order);
    
    // Try to match with sell orders (simplified - in production, would iterate through sorted orders)
    // For now, this is a placeholder that would need actual order matching logic
    
    let fee = (total_paid * marketplace.trading_fee_bps) / 10000;
    
    // Update order status
    if (filled >= remaining_quantity) {
        odx::datatypes::set_order_status(buy_order, odx::datatypes::order_status_filled());
        odx::datatypes::set_order_filled_quantity(buy_order, odx::datatypes::get_order_quantity(buy_order));
    } else {
        odx::datatypes::set_order_filled_quantity(buy_order, odx::datatypes::get_order_filled_quantity(buy_order) + filled);
    };
    
    OrderExecutionResult {
        filled_quantity: filled,
        total_price: total_paid,
        fee,
    }
}

/// Execute sell order (match with buy orders)
/// Tries to fill a sell order by matching with available buy orders
public fun execute_sell_order(
    marketplace: &mut Marketplace,
    sell_order: &mut MarketOrder,
    ctx: &mut TxContext,
): OrderExecutionResult {
    assert!(odx::datatypes::get_order_status(sell_order) == odx::datatypes::order_status_active(), E_ORDER_NOT_ACTIVE);
    assert!(odx::datatypes::get_order_type(sell_order) == odx::datatypes::order_type_sell(), E_INVALID_ORDER_TYPE);
    
    let mut filled = 0;
    let mut total_received = 0;
    let remaining_quantity = odx::datatypes::get_order_quantity(sell_order) - odx::datatypes::get_order_filled_quantity(sell_order);
    
    // Try to match with buy orders (simplified - in production, would iterate through sorted orders)
    
    let fee = (total_received * marketplace.trading_fee_bps) / 10000;
    
    // Update order status
    if (filled >= remaining_quantity) {
        odx::datatypes::set_order_status(sell_order, odx::datatypes::order_status_filled());
        odx::datatypes::set_order_filled_quantity(sell_order, odx::datatypes::get_order_quantity(sell_order));
    } else {
        odx::datatypes::set_order_filled_quantity(sell_order, odx::datatypes::get_order_filled_quantity(sell_order) + filled);
    };
    
    OrderExecutionResult {
        filled_quantity: filled,
        total_price: total_received,
        fee,
    }
}

/// Cancel an order
/// Only the order creator can cancel their own order
public fun cancel_order(
    marketplace: &mut Marketplace,
    order: &mut MarketOrder,
    sender: address,
) {
    assert!(odx::datatypes::get_order_creator(order) == sender, 1); // E_UNAUTHORIZED
    assert!(odx::datatypes::get_order_status(order) == odx::datatypes::order_status_active(), E_ORDER_NOT_ACTIVE);
    
    odx::datatypes::set_order_status(order, odx::datatypes::order_status_cancelled());
    
    // Remove from marketplace orders (simplified - would need proper removal logic)
}

/// Get marketplace trading fee
public fun get_trading_fee(marketplace: &Marketplace): u64 {
    marketplace.trading_fee_bps
}

/// Update trading fee (admin function - would need admin cap)
public fun update_trading_fee(
    marketplace: &mut Marketplace,
    new_fee_bps: u64,
) {
    assert!(new_fee_bps <= 1000, 2); // Max 10% fee
    marketplace.trading_fee_bps = new_fee_bps;
}

/// Get order details
public fun get_order_info(order: &MarketOrder): (ID, address, u8, u64, u64, u64, u8) {
    (
        odx::datatypes::get_order_ip_token_id(order),
        odx::datatypes::get_order_creator(order),
        odx::datatypes::get_order_type(order),
        odx::datatypes::get_order_price(order),
        odx::datatypes::get_order_quantity(order),
        odx::datatypes::get_order_filled_quantity(order),
        odx::datatypes::get_order_status(order),
    )
}

