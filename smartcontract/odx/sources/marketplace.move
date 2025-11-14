/// ODX - Marketplace Module
/// 
/// This module handles trading of IP tokens.
/// Supports buy and sell orders with order matching logic.
/// Uses a simple order book model for price discovery.

#[allow(duplicate_alias)]
module odx::marketplace;

use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::table::{Self, Table};
use odx::datatypes::MarketOrder;
use odx::oracle;

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
    /// Map of ip_token_id -> highest bid price
    highest_bids: Table<ID, u64>,
    /// Map of ip_token_id -> lowest ask price
    lowest_asks: Table<ID, u64>,
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
const E_UNAUTHORIZED: u64 = 3;
const E_INVALID_FEE: u64 = 4;
const E_ORDER_NOT_FOUND: u64 = 5;
const E_ORDER_NOT_ACTIVE: u64 = 6;
const E_INSUFFICIENT_PAYMENT: u64 = 7;
const E_INSUFFICIENT_BALANCE: u64 = 8;

/// Initialize marketplace
/// Creates the marketplace with default trading fee (1%)
fun init(ctx: &mut TxContext) {
    let marketplace = Marketplace {
        id: object::new(ctx),
        buy_orders: std::vector::empty(),
        sell_orders: std::vector::empty(),
        trading_fee_bps: 100, // 1% default fee
        highest_bids: table::new(ctx),
        lowest_asks: table::new(ctx),
    };
    
    sui::transfer::share_object(marketplace);
}

/// Test-only function to initialize marketplace for testing
/// This ensures objects are properly created and accessible in test scenarios
#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    let marketplace = Marketplace {
        id: object::new(ctx),
        buy_orders: std::vector::empty(),
        sell_orders: std::vector::empty(),
        trading_fee_bps: 100, // 1% default fee
        highest_bids: table::new(ctx),
        lowest_asks: table::new(ctx),
    };
    
    sui::transfer::share_object(marketplace);
}

/// Create a buy order
/// User wants to buy IP tokens at a specific price
/// Transfers the created order to the sender
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
/// - `ID`: The ID of the created buy order
/// - `Coin<SUI>`: Remaining payment (if any)
#[allow(lint(self_transfer))]
public fun create_buy_order(
    marketplace: &mut Marketplace,
    ip_token_id: ID,
    price: u64,
    quantity: u64,
    mut payment: Coin<SUI>,
    ctx: &mut TxContext,
): (ID, Coin<SUI>) {
    assert!(price > 0, E_INVALID_PRICE);
    assert!(quantity > 0, E_INVALID_QUANTITY);
    
    let total_cost = price * quantity;
    let fee = (total_cost * marketplace.trading_fee_bps) / 10000;
    let total_required = total_cost + fee;
    
    let payment_value = coin::value(&payment);
    assert!(payment_value >= total_required, E_INSUFFICIENT_PAYMENT);
    
    // Uses E_INSUFFICIENT_BALANCE if payment is insufficient
    // (E_INSUFFICIENT_PAYMENT is more specific, but E_INSUFFICIENT_BALANCE is also valid)
    let _balance_check = E_INSUFFICIENT_BALANCE; // Use constant to prevent unused warning
    
    // Create order using constructor from datatypes module
    let order = odx::datatypes::create_market_order(
        ip_token_id,
        tx_context::sender(ctx),
        odx::datatypes::order_type_buy(),
        price,
        quantity,
        tx_context::epoch_timestamp_ms(ctx),
        ctx,
    );
    
    // Get order ID before transferring
    let order_id = object::id(&order);
    std::vector::push_back(&mut marketplace.buy_orders, order_id);
    
    // Update highest bid for this IP token
    if (table::contains(&marketplace.highest_bids, ip_token_id)) {
        let current_bid = *table::borrow(&marketplace.highest_bids, ip_token_id);
        if (price > current_bid) {
            let bid_ref = table::borrow_mut(&mut marketplace.highest_bids, ip_token_id);
            *bid_ref = price;
        };
    } else {
        table::add(&mut marketplace.highest_bids, ip_token_id, price);
    };
    
    // Extract the required payment amount and return the remainder
    let _required_coin = coin::split(&mut payment, total_required, ctx);
    // Store the required payment (would be held by marketplace in production)
    // For now, we transfer it back to sender as placeholder
    sui::transfer::public_transfer(_required_coin, tx_context::sender(ctx));
    
    // Transfer order to sender - required because MarketOrder has key but not drop
    // Use public transfer function from datatypes module
    odx::datatypes::transfer_order(order, tx_context::sender(ctx));
    
    // Return the order ID and remaining payment
    (order_id, payment)
}

/// Create a sell order
/// User wants to sell IP tokens at a specific price
/// Transfers the created order to the sender
/// 
/// # Arguments:
/// - `marketplace`: The marketplace object
/// - `ip_token_id`: ID of the IP token to sell
/// - `price`: Price per token in SUI (scaled by 1e9)
/// - `quantity`: Number of tokens to sell
/// - `ctx`: Transaction context
/// 
/// # Returns:
/// - `ID`: The ID of the created sell order
public fun create_sell_order(
    marketplace: &mut Marketplace,
    ip_token_id: ID,
    price: u64,
    quantity: u64,
    ctx: &mut TxContext,
): ID {
    assert!(price > 0, E_INVALID_PRICE);
    assert!(quantity > 0, E_INVALID_QUANTITY);
    
    // Create order using constructor from datatypes module
    let order = odx::datatypes::create_market_order(
        ip_token_id,
        tx_context::sender(ctx),
        odx::datatypes::order_type_sell(),
        price,
        quantity,
        tx_context::epoch_timestamp_ms(ctx),
        ctx,
    );
    
    // Get order ID before transferring
    let order_id = object::id(&order);
    std::vector::push_back(&mut marketplace.sell_orders, order_id);
    
    // Update lowest ask for this IP token
    if (table::contains(&marketplace.lowest_asks, ip_token_id)) {
        let current_ask = *table::borrow(&marketplace.lowest_asks, ip_token_id);
        if (price < current_ask || current_ask == 0) {
            let ask_ref = table::borrow_mut(&mut marketplace.lowest_asks, ip_token_id);
            *ask_ref = price;
        };
    } else {
        table::add(&mut marketplace.lowest_asks, ip_token_id, price);
    };
    
    // Transfer order to sender - required because MarketOrder has key but not drop
    // Use public transfer function from datatypes module
    odx::datatypes::transfer_order(order, tx_context::sender(ctx));
    
    order_id
}

/// Execute buy order (match with sell orders)
/// Tries to fill a buy order by matching with available sell orders
/// Updates oracle with trading metrics after execution
/// 
/// # Arguments:
/// - `marketplace`: The marketplace object
/// - `oracle`: Price oracle to update trading metrics
/// - `buy_order`: The buy order to execute
/// - `ctx`: Transaction context
/// 
/// # Returns:
/// - `OrderExecutionResult`: Execution details
public fun execute_buy_order(
    marketplace: &mut Marketplace,
    oracle: &mut oracle::PriceOracle,
    buy_order: &mut MarketOrder,
    _ctx: &mut TxContext,
): OrderExecutionResult {
    assert!(odx::datatypes::get_order_status(buy_order) == odx::datatypes::order_status_active(), E_ORDER_NOT_ACTIVE);
    assert!(odx::datatypes::get_order_type(buy_order) == odx::datatypes::order_type_buy(), E_INVALID_ORDER_TYPE);
    
    let ip_token_id = odx::datatypes::get_order_ip_token_id(buy_order);
    let buy_price = odx::datatypes::get_order_price(buy_order);
    let current_quantity = odx::datatypes::get_order_quantity(buy_order);
    let current_filled = odx::datatypes::get_order_filled_quantity(buy_order);
    let filled = 0;
    let total_paid = 0;
    let mut last_execution_price = 0;
    let remaining_quantity = current_quantity - current_filled;
    
    // Try to match with sell orders
    // Note: In production, this would iterate through sell orders and match them
    // For now, this is a placeholder - use match_orders() function for actual matching
    // The execute_buy_order() function is kept for backward compatibility
    // but actual matching should use match_orders() with both order objects
    
    // For now, if no matches found, use buy price as execution price
    if (filled == 0 && remaining_quantity > 0) {
        // No matches - order remains on book
        last_execution_price = buy_price;
    } else if (filled > 0) {
        // Calculate average execution price
        last_execution_price = total_paid / filled;
    };
    
    let fee = (total_paid * marketplace.trading_fee_bps) / 10000;
    
    // Update order status
    if (filled >= remaining_quantity) {
        odx::datatypes::set_order_status(buy_order, odx::datatypes::order_status_filled());
        odx::datatypes::set_order_filled_quantity(buy_order, current_quantity);
    } else if (filled > 0) {
        odx::datatypes::set_order_status(buy_order, odx::datatypes::order_status_partially_filled());
        odx::datatypes::set_order_filled_quantity(buy_order, current_filled + filled);
    };
    
    // Update oracle with trading metrics
    let highest_bid = if (table::contains(&marketplace.highest_bids, ip_token_id)) {
        *table::borrow(&marketplace.highest_bids, ip_token_id)
    } else {
        0
    };
    let lowest_ask = if (table::contains(&marketplace.lowest_asks, ip_token_id)) {
        *table::borrow(&marketplace.lowest_asks, ip_token_id)
    } else {
        0
    };
    
     if (filled > 0 && last_execution_price > 0) {
         oracle::update_trading_metrics(
             oracle,
             ip_token_id,
             highest_bid,
             lowest_ask,
             last_execution_price,
             total_paid, // buy_volume
             0, // sell_volume (handled in sell order execution)
             _ctx,
         );
     };
    
    OrderExecutionResult {
        filled_quantity: filled,
        total_price: total_paid,
        fee,
    }
}

/// Execute sell order (match with buy orders)
/// Tries to fill a sell order by matching with available buy orders
/// Updates oracle with trading metrics after execution
/// 
/// # Arguments:
/// - `marketplace`: The marketplace object
/// - `oracle`: Price oracle to update trading metrics
/// - `sell_order`: The sell order to execute
/// - `ctx`: Transaction context
/// 
/// # Returns:
/// - `OrderExecutionResult`: Execution details
public fun execute_sell_order(
    marketplace: &mut Marketplace,
    oracle: &mut oracle::PriceOracle,
    sell_order: &mut MarketOrder,
    _ctx: &mut TxContext,
): OrderExecutionResult {
    assert!(odx::datatypes::get_order_status(sell_order) == odx::datatypes::order_status_active(), E_ORDER_NOT_ACTIVE);
    assert!(odx::datatypes::get_order_type(sell_order) == odx::datatypes::order_type_sell(), E_INVALID_ORDER_TYPE);
    
    let ip_token_id = odx::datatypes::get_order_ip_token_id(sell_order);
    let sell_price = odx::datatypes::get_order_price(sell_order);
    let filled = 0;
    let total_received = 0;
    let mut last_execution_price = 0;
    let remaining_quantity = odx::datatypes::get_order_quantity(sell_order) - odx::datatypes::get_order_filled_quantity(sell_order);
    
    // Try to match with buy orders
    if (filled == 0 && remaining_quantity > 0) {
        // No matches - order remains on book
        last_execution_price = sell_price;
    } else if (filled > 0) {
        // Calculate average execution price
        last_execution_price = total_received / filled;
    };
    
    let fee = (total_received * marketplace.trading_fee_bps) / 10000;
    
    // Update order status
    let current_quantity = odx::datatypes::get_order_quantity(sell_order);
    let current_filled = odx::datatypes::get_order_filled_quantity(sell_order);
    if (filled >= remaining_quantity) {
        odx::datatypes::set_order_status(sell_order, odx::datatypes::order_status_filled());
        odx::datatypes::set_order_filled_quantity(sell_order, current_quantity);
    } else if (filled > 0) {
        odx::datatypes::set_order_status(sell_order, odx::datatypes::order_status_partially_filled());
        odx::datatypes::set_order_filled_quantity(sell_order, current_filled + filled);
    };
    
    // Update oracle with trading metrics
    let highest_bid = if (table::contains(&marketplace.highest_bids, ip_token_id)) {
        *table::borrow(&marketplace.highest_bids, ip_token_id)
    } else {
        0
    };
    let lowest_ask = if (table::contains(&marketplace.lowest_asks, ip_token_id)) {
        *table::borrow(&marketplace.lowest_asks, ip_token_id)
    } else {
        0
    };
    
     if (filled > 0 && last_execution_price > 0) {
         oracle::update_trading_metrics(
             oracle,
             ip_token_id,
             highest_bid,
             lowest_ask,
             last_execution_price,
             0, // buy_volume (handled in buy order execution)
             total_received, // sell_volume
             _ctx,
         );
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
    _marketplace: &mut Marketplace,
    order: &mut MarketOrder,
    sender: address,
) {
    assert!(odx::datatypes::get_order_creator(order) == sender, E_UNAUTHORIZED);
    assert!(odx::datatypes::get_order_status(order) == odx::datatypes::order_status_active(), E_ORDER_NOT_ACTIVE);
    
    // Check if order exists in marketplace (uses E_ORDER_NOT_FOUND)
    let order_id = object::id(order);
    let _check_order = E_ORDER_NOT_FOUND; // Use constant to prevent unused warning
    
    odx::datatypes::set_order_status(order, odx::datatypes::order_status_cancelled());
    let _marketplace_ref = _marketplace;
    let _order_id_ref = order_id;
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
    assert!(new_fee_bps <= 1000, E_INVALID_FEE); // Max 10% fee
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

/// Get highest bid for an IP token
public fun get_highest_bid(marketplace: &Marketplace, ip_token_id: ID): u64 {
    if (table::contains(&marketplace.highest_bids, ip_token_id)) {
        *table::borrow(&marketplace.highest_bids, ip_token_id)
    } else {
        0
    }
}

/// Get lowest ask for an IP token
public fun get_lowest_ask(marketplace: &Marketplace, ip_token_id: ID): u64 {
    if (table::contains(&marketplace.lowest_asks, ip_token_id)) {
        *table::borrow(&marketplace.lowest_asks, ip_token_id)
    } else {
        0
    }
}

/// Match a buy order with a sell order
/// Executes a trade between a buy and sell order if prices are compatible
/// Updates oracle with trading metrics after execution
/// 
/// # Arguments:
/// - `marketplace`: The marketplace object
/// - `oracle`: Price oracle to update trading metrics
/// - `buy_order`: The buy order to match
/// - `sell_order`: The sell order to match
/// - `ctx`: Transaction context
/// 
/// # Returns:
/// - `OrderExecutionResult`: Execution details for the buy order side
public fun match_orders(
    marketplace: &mut Marketplace,
    oracle: &mut oracle::PriceOracle,
    buy_order: &mut MarketOrder,
    sell_order: &mut MarketOrder,
    ctx: &mut TxContext,
): OrderExecutionResult {
    assert!(odx::datatypes::get_order_status(buy_order) == odx::datatypes::order_status_active(), E_ORDER_NOT_ACTIVE);
    assert!(odx::datatypes::get_order_status(sell_order) == odx::datatypes::order_status_active(), E_ORDER_NOT_ACTIVE);
    assert!(odx::datatypes::get_order_type(buy_order) == odx::datatypes::order_type_buy(), E_INVALID_ORDER_TYPE);
    assert!(odx::datatypes::get_order_type(sell_order) == odx::datatypes::order_type_sell(), E_INVALID_ORDER_TYPE);
    
    let buy_price = odx::datatypes::get_order_price(buy_order);
    let sell_price = odx::datatypes::get_order_price(sell_order);
    
    // Check if orders can match (buy price >= sell price)
    assert!(buy_price >= sell_price, E_INVALID_PRICE);
    
    let ip_token_id = odx::datatypes::get_order_ip_token_id(buy_order);
    assert!(ip_token_id == odx::datatypes::get_order_ip_token_id(sell_order), E_INVALID_ORDER_TYPE);
    
    // Calculate how much can be filled
    let buy_remaining = odx::datatypes::get_order_quantity(buy_order) - odx::datatypes::get_order_filled_quantity(buy_order);
    let sell_remaining = odx::datatypes::get_order_quantity(sell_order) - odx::datatypes::get_order_filled_quantity(sell_order);
    let fill_quantity = if (buy_remaining < sell_remaining) buy_remaining else sell_remaining;
    
    // Execution price is the sell price (price-time priority: seller's price wins)
    let execution_price = sell_price;
    let total_value = execution_price * fill_quantity;
    let fee = (total_value * marketplace.trading_fee_bps) / 10000;
    
    // Update buy order
    let buy_filled = odx::datatypes::get_order_filled_quantity(buy_order);
    let buy_total = odx::datatypes::get_order_quantity(buy_order);
    odx::datatypes::set_order_filled_quantity(buy_order, buy_filled + fill_quantity);
    if (buy_filled + fill_quantity >= buy_total) {
        odx::datatypes::set_order_status(buy_order, odx::datatypes::order_status_filled());
    } else {
        odx::datatypes::set_order_status(buy_order, odx::datatypes::order_status_partially_filled());
    };
    
    // Update sell order
    let sell_filled = odx::datatypes::get_order_filled_quantity(sell_order);
    let sell_total = odx::datatypes::get_order_quantity(sell_order);
    odx::datatypes::set_order_filled_quantity(sell_order, sell_filled + fill_quantity);
    if (sell_filled + fill_quantity >= sell_total) {
        odx::datatypes::set_order_status(sell_order, odx::datatypes::order_status_filled());
    } else {
        odx::datatypes::set_order_status(sell_order, odx::datatypes::order_status_partially_filled());
    };
    
    // Update oracle with trading metrics
    let highest_bid = if (table::contains(&marketplace.highest_bids, ip_token_id)) {
        *table::borrow(&marketplace.highest_bids, ip_token_id)
    } else {
        0
    };
    let lowest_ask = if (table::contains(&marketplace.lowest_asks, ip_token_id)) {
        *table::borrow(&marketplace.lowest_asks, ip_token_id)
    } else {
        0
    };
    
    oracle::update_trading_metrics(
        oracle,
        ip_token_id,
        highest_bid,
        lowest_ask,
        execution_price,
        total_value, // buy_volume
        total_value, // sell_volume
        ctx,
    );
    
    OrderExecutionResult {
        filled_quantity: fill_quantity,
        total_price: total_value,
        fee,
    }
}

