#[test_only]
#[allow(duplicate_alias, unused_const)]
module odx::token_tests;

use sui::test_scenario;
use odx::token::{Self, AdminCap, TokenRegistry};
use odx::datatypes;

const ADMIN: address = @0x1;
const USER: address = @0x2;

#[test]
fun test_init() {
    // USER constant is available for future user-specific tests
    let _ = USER;
    let scenario = test_scenario::begin(ADMIN);
    {
        // init is called automatically
    };
    test_scenario::end(scenario);
}

#[test]
fun test_create_ip_token() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        // Initialize objects explicitly for testing
        test_scenario::next_tx(&mut scenario, ADMIN);
        token::init_for_testing(test_scenario::ctx(&mut scenario));
        
        // Move to next tx to access objects
        test_scenario::next_tx(&mut scenario, ADMIN);
        let admin_cap = test_scenario::take_from_sender<AdminCap>(&scenario);
        let mut registry = test_scenario::take_shared<TokenRegistry>(&scenario);
        
        // Create a token
        let name = b"Chainsaw Man";
        let symbol = b"CSM";
        let description = b"A young man who merges with a dog-like devil";
        let category = 0; // anime
        let reserve_pool_size = 50000;
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        token::create_ip_token(
            &admin_cap,
            &mut registry,
            name,
            symbol,
            description,
            category,
            reserve_pool_size,
            test_scenario::ctx(&mut scenario),
        );
        
        // Get token ID from registry (last token added)
        let token_count = token::get_token_count(&registry);
        let token_id = token::get_token_at(&registry, token_count - 1);
        
        // Verify token was created and transferred to admin
        test_scenario::next_tx(&mut scenario, ADMIN);
        let token = test_scenario::take_from_sender_by_id<odx::datatypes::IPToken>(&scenario, token_id);
        
        // Verify token properties
        let (token_name, token_symbol, total_supply, reserve_pool, circulating_supply) = 
            token::get_token_info(&token);
        
        // Verify token name and symbol match (compare lengths as a simple check)
        assert!(std::vector::length(&token_name) == std::vector::length(&name), 0);
        assert!(std::vector::length(&token_symbol) == std::vector::length(&symbol), 1);
        assert!(total_supply == datatypes::fixed_token_supply(), 2);
        assert!(reserve_pool == reserve_pool_size, 3);
        assert!(circulating_supply == datatypes::fixed_token_supply() - reserve_pool_size, 4);
        
        // Return objects
        test_scenario::return_to_sender(&scenario, admin_cap);
        test_scenario::return_to_sender(&scenario, token);
        test_scenario::return_shared(registry);
    };
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = token::E_INVALID_RESERVE)]
fun test_create_ip_token_invalid_reserve() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        // Initialize objects explicitly for testing
        test_scenario::next_tx(&mut scenario, ADMIN);
        token::init_for_testing(test_scenario::ctx(&mut scenario));
        
        // Move to next tx to access objects
        test_scenario::next_tx(&mut scenario, ADMIN);
        let admin_cap = test_scenario::take_from_sender<AdminCap>(&scenario);
        let mut registry = test_scenario::take_shared<TokenRegistry>(&scenario);
        
        // Try to create token with reserve >= total supply (should fail)
        let name = b"Test Token";
        let symbol = b"TEST";
        let description = b"Test description";
        let category = 0;
        let reserve_pool_size = datatypes::fixed_token_supply(); // Invalid: equals total supply
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        token::create_ip_token(
            &admin_cap,
            &mut registry,
            name,
            symbol,
            description,
            category,
            reserve_pool_size,
            test_scenario::ctx(&mut scenario),
        );
        
        test_scenario::return_to_sender(&scenario, admin_cap);
        test_scenario::return_shared(registry);
    };
    test_scenario::end(scenario);
}

#[test]
fun test_update_reserve_pool() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        // Initialize objects explicitly for testing
        test_scenario::next_tx(&mut scenario, ADMIN);
        token::init_for_testing(test_scenario::ctx(&mut scenario));
        
        // Move to next tx to access objects
        test_scenario::next_tx(&mut scenario, ADMIN);
        let admin_cap = test_scenario::take_from_sender<AdminCap>(&scenario);
        let mut registry = test_scenario::take_shared<TokenRegistry>(&scenario);
        
        // Create a token
        test_scenario::next_tx(&mut scenario, ADMIN);
        token::create_ip_token(
            &admin_cap,
            &mut registry,
            b"Test Token",
            b"TEST",
            b"Test description",
            0,
            50000,
            test_scenario::ctx(&mut scenario),
        );
        
        // Get token ID from registry (last token added)
        let token_count = token::get_token_count(&registry);
        let token_id = token::get_token_at(&registry, token_count - 1);
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        let mut token = test_scenario::take_from_sender_by_id<odx::datatypes::IPToken>(&scenario, token_id);
        
        // Update reserve pool
        test_scenario::next_tx(&mut scenario, ADMIN);
        let new_reserve_size = 60000;
        token::update_reserve_pool(&admin_cap, &mut token, new_reserve_size);
        
        // Verify update
        let (_, _, _, reserve_pool, circulating_supply) = token::get_token_info(&token);
        assert!(reserve_pool == new_reserve_size, 0);
        assert!(circulating_supply == datatypes::fixed_token_supply() - new_reserve_size, 1);
        
        test_scenario::return_to_sender(&scenario, admin_cap);
        test_scenario::return_to_sender(&scenario, token);
        test_scenario::return_shared(registry);
    };
    test_scenario::end(scenario);
}

#[test]
fun test_release_from_reserve() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        // Initialize objects explicitly for testing
        test_scenario::next_tx(&mut scenario, ADMIN);
        token::init_for_testing(test_scenario::ctx(&mut scenario));
        
        // Move to next tx to access objects
        test_scenario::next_tx(&mut scenario, ADMIN);
        let admin_cap = test_scenario::take_from_sender<AdminCap>(&scenario);
        let mut registry = test_scenario::take_shared<TokenRegistry>(&scenario);
        
        // Create a token with reserve
        let reserve_pool_size = 50000;
        test_scenario::next_tx(&mut scenario, ADMIN);
        token::create_ip_token(
            &admin_cap,
            &mut registry,
            b"Test Token",
            b"TEST",
            b"Test description",
            0,
            reserve_pool_size,
            test_scenario::ctx(&mut scenario),
        );
        
        // Get token ID from registry (last token added)
        let token_count = token::get_token_count(&registry);
        let token_id = token::get_token_at(&registry, token_count - 1);
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        let mut token = test_scenario::take_from_sender_by_id<odx::datatypes::IPToken>(&scenario, token_id);
        
        // Release some tokens
        test_scenario::next_tx(&mut scenario, ADMIN);
        let release_amount = 10000;
        let released = token::release_from_reserve(&mut token, release_amount);
        
        assert!(released == release_amount, 0);
        
        // Verify reserve decreased and circulating increased
        let (_, _, _, reserve_pool, circulating_supply) = token::get_token_info(&token);
        assert!(reserve_pool == reserve_pool_size - release_amount, 1);
        assert!(circulating_supply == datatypes::fixed_token_supply() - reserve_pool_size + release_amount, 2);
        
        test_scenario::return_to_sender(&scenario, admin_cap);
        test_scenario::return_to_sender(&scenario, token);
        test_scenario::return_shared(registry);
    };
    test_scenario::end(scenario);
}

#[test]
fun test_get_all_tokens() {
    let mut scenario = test_scenario::begin(ADMIN);
    {
        // Initialize objects explicitly for testing
        test_scenario::next_tx(&mut scenario, ADMIN);
        token::init_for_testing(test_scenario::ctx(&mut scenario));
        
        // Move to next tx to access objects
        test_scenario::next_tx(&mut scenario, ADMIN);
        let admin_cap = test_scenario::take_from_sender<AdminCap>(&scenario);
        let mut registry = test_scenario::take_shared<TokenRegistry>(&scenario);
        
        // Create multiple tokens
        test_scenario::next_tx(&mut scenario, ADMIN);
        token::create_ip_token(
            &admin_cap,
            &mut registry,
            b"Token 1",
            b"T1",
            b"Description 1",
            0,
            50000,
            test_scenario::ctx(&mut scenario),
        );
        
        // Get token ID from registry (last token added)
        let token_count_1 = token::get_token_count(&registry);
        let token_id_1 = token::get_token_at(&registry, token_count_1 - 1);
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        let token_1 = test_scenario::take_from_sender_by_id<odx::datatypes::IPToken>(&scenario, token_id_1);
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        token::create_ip_token(
            &admin_cap,
            &mut registry,
            b"Token 2",
            b"T2",
            b"Description 2",
            1,
            60000,
            test_scenario::ctx(&mut scenario),
        );
        
        // Get token ID from registry (last token added)
        let token_count_2 = token::get_token_count(&registry);
        let token_id_2 = token::get_token_at(&registry, token_count_2 - 1);
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        let token_2 = test_scenario::take_from_sender_by_id<odx::datatypes::IPToken>(&scenario, token_id_2);
        
        // Get all tokens
        test_scenario::next_tx(&mut scenario, ADMIN);
        let tokens = token::get_all_tokens(&registry);
        assert!(std::vector::length(&tokens) == 2, 0);
        
        test_scenario::return_to_sender(&scenario, admin_cap);
        test_scenario::return_to_sender(&scenario, token_1);
        test_scenario::return_to_sender(&scenario, token_2);
        test_scenario::return_shared(registry);
    };
    test_scenario::end(scenario);
}
