#[test_only]
#[allow(duplicate_alias)]
module odx::oracle_tests;

use sui::test_scenario;
use odx::oracle::{Self, PriceOracle, OracleAdminCap};
use odx::token::{Self, AdminCap, TokenRegistry};
use odx::datatypes::IPToken;

const ADMIN: address = @0x1;

#[test]
fun test_init() {
    let scenario = test_scenario::begin(ADMIN);
    {
        // init is called automatically
    };
    test_scenario::end(scenario);
}

#[test]
fun test_initialize_token_price() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        // Initialize objects explicitly for testing
        test_scenario::next_tx(&mut scenario, ADMIN);
        token::init_for_testing(test_scenario::ctx(&mut scenario));
        oracle::init_for_testing(test_scenario::ctx(&mut scenario));
        
        // Move to next tx to access objects
        test_scenario::next_tx(&mut scenario, ADMIN);
        let token_admin_cap = test_scenario::take_from_sender<AdminCap>(&scenario);
        let mut token_registry = test_scenario::take_shared<TokenRegistry>(&scenario);
        let mut oracle = test_scenario::take_shared<PriceOracle>(&scenario);
        
        // Create a token first
        test_scenario::next_tx(&mut scenario, ADMIN);
        let ip_token_id = token::create_ip_token(
            &token_admin_cap,
            &mut token_registry,
            b"Test IP", b"TIP", b"Description", 0, 50000, test_scenario::ctx(&mut scenario)
        );
        
        // Move to next tx to access the created token
        test_scenario::next_tx(&mut scenario, ADMIN);
        let _token = test_scenario::take_from_sender_by_id<IPToken>(&scenario, ip_token_id);
        
        let base_price = 1000000000; // 1 SUI
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        oracle::initialize_token_price(
            &mut oracle,
            ip_token_id,
            base_price,
            test_scenario::ctx(&mut scenario),
        );
        
        // Verify price was initialized
        let price_opt = oracle::get_price(&oracle, ip_token_id);
        assert!(std::option::contains(&price_opt, &base_price), 0);
        
        test_scenario::return_to_sender(&scenario, _token);
        test_scenario::return_to_sender(&scenario, token_admin_cap);
        test_scenario::return_shared(token_registry);
        test_scenario::return_shared(oracle);
    };
    test_scenario::end(scenario);
}

#[test]
fun test_update_engagement_metrics() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        // Initialize objects explicitly for testing
        test_scenario::next_tx(&mut scenario, ADMIN);
        token::init_for_testing(test_scenario::ctx(&mut scenario));
        oracle::init_for_testing(test_scenario::ctx(&mut scenario));
        
        // Move to next tx to access objects
        test_scenario::next_tx(&mut scenario, ADMIN);
        let token_admin_cap = test_scenario::take_from_sender<AdminCap>(&scenario);
        let mut token_registry = test_scenario::take_shared<TokenRegistry>(&scenario);
        let oracle_admin_cap = test_scenario::take_from_sender<OracleAdminCap>(&scenario);
        let mut oracle = test_scenario::take_shared<PriceOracle>(&scenario);
        
        // Create a token first
        test_scenario::next_tx(&mut scenario, ADMIN);
        let ip_token_id = token::create_ip_token(
            &token_admin_cap,
            &mut token_registry,
            b"Test IP", b"TIP", b"Description", 0, 50000, test_scenario::ctx(&mut scenario)
        );
        
        // Move to next tx to access the created token
        test_scenario::next_tx(&mut scenario, ADMIN);
        let _token = test_scenario::take_from_sender_by_id<IPToken>(&scenario, ip_token_id);
        
        let base_price = 1000000000;
        
        // Initialize price first
        test_scenario::next_tx(&mut scenario, ADMIN);
        oracle::initialize_token_price(
            &mut oracle,
            ip_token_id,
            base_price,
            test_scenario::ctx(&mut scenario),
        );
        
        // Update metrics
        oracle::update_engagement_metrics(
            &mut oracle,
            &oracle_admin_cap,
            ip_token_id,
            850, // average_rating (8.5/10 scaled by 100)
            1200, // total_contributors
            5200, // total_engagements
            7500, // prediction_accuracy (75% scaled by 100)
            2500, // growth_rate (25% scaled by 100)
            test_scenario::ctx(&mut scenario),
        );
        
        // Verify metrics were updated
        let metrics_opt = oracle::get_engagement_metrics(&oracle, ip_token_id);
        assert!(std::option::is_some(&metrics_opt), 0);
        
        test_scenario::return_to_sender(&scenario, _token);
        test_scenario::return_to_sender(&scenario, token_admin_cap);
        test_scenario::return_to_sender(&scenario, oracle_admin_cap);
        test_scenario::return_shared(token_registry);
        test_scenario::return_shared(oracle);
    };
    test_scenario::end(scenario);
}

#[test]
fun test_recalculate_price() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        // Initialize objects explicitly for testing
        test_scenario::next_tx(&mut scenario, ADMIN);
        token::init_for_testing(test_scenario::ctx(&mut scenario));
        oracle::init_for_testing(test_scenario::ctx(&mut scenario));
        
        // Move to next tx to access objects
        test_scenario::next_tx(&mut scenario, ADMIN);
        let token_admin_cap = test_scenario::take_from_sender<AdminCap>(&scenario);
        let mut token_registry = test_scenario::take_shared<TokenRegistry>(&scenario);
        let admin_cap = test_scenario::take_from_sender<OracleAdminCap>(&scenario);
        let mut oracle = test_scenario::take_shared<PriceOracle>(&scenario);
        
        // Create a token first
        test_scenario::next_tx(&mut scenario, ADMIN);
        let ip_token_id = token::create_ip_token(
            &token_admin_cap,
            &mut token_registry,
            b"Test IP", b"TIP", b"Description", 0, 50000, test_scenario::ctx(&mut scenario)
        );
        
        // Move to next tx to access the created token
        test_scenario::next_tx(&mut scenario, ADMIN);
        let _token = test_scenario::take_from_sender_by_id<IPToken>(&scenario, ip_token_id);
        
        let base_price = 1000000000;
        
        // Initialize price
        test_scenario::next_tx(&mut scenario, ADMIN);
        oracle::initialize_token_price(
            &mut oracle,
            ip_token_id,
            base_price,
            test_scenario::ctx(&mut scenario),
        );
        
        // Update metrics with growth
        oracle::update_engagement_metrics(
            &mut oracle,
            &admin_cap,
            ip_token_id,
            850,
            1200,
            5200,
            7500,
            2500, // 25% growth
            test_scenario::ctx(&mut scenario),
        );
        
        // Price should be recalculated automatically
        let price_opt = oracle::get_price(&oracle, ip_token_id);
        assert!(std::option::is_some(&price_opt), 0);
        
        let new_price = *std::option::borrow(&price_opt);
        // Price should be higher than base due to growth
        assert!(new_price >= base_price, 1);
        
        test_scenario::return_to_sender(&scenario, _token);
        test_scenario::return_to_sender(&scenario, token_admin_cap);
        test_scenario::return_to_sender(&scenario, admin_cap);
        test_scenario::return_shared(token_registry);
        test_scenario::return_shared(oracle);
    };
    test_scenario::end(scenario);
}
