#![cfg(test)]


use super::*;
use soroban_sdk::{ testutils::Address, Env};
use token::StellarAssetClient;

#[test]
fn test() {
    // Create a new environment
    let env = Env::default();

    // Register the contract with the environment
    let contract_id = env.register_contract(None, HelloContract);

    // Instantiate a new client for the contract
    let client = HelloContractClient::new(&env, &contract_id);

    // Mock all authorizations for the subsequent calls
    // This ensures we don't have to individually mock each authorization
    env.mock_all_auths();

    // ==============================
    // Test the say_hello function
    // ============================

    // Use the client to call the say_hello function and store the result in the variable words
    let output_say_hello = client.say_hello();

    // Assert that the result is equal to the Symbol "HelloWorld"
    assert_eq!(output_say_hello, Symbol::new(&env, "HelloWorld"));


    // ==============================
    // Test the say_hello_to function
    // ===============================

    // Use the client to call the say_hello_to function with the argument "Alice" and store the result in the variable words
    let output_say_hello_to = client.say_hello_to(&Symbol::new(&env, "Alice"));

    // Assert that the result is equal to the Vec<Symbol> ["Hello", "Alice"]
    assert_eq!(output_say_hello_to, vec![&env, symbol_short!("Hello"), Symbol::new(&env, "Alice")]);

    // ==============================
    // Test the get_name function
    // ===============================

    // Use the client to call the get_name function and store the result in the variable name
    let output_get_name = client.get_name();

    // Assert that the result is equal to the Symbol "CaptainCacti"
    assert_eq!(output_get_name, Symbol::new(&env, "CaptainCacti"));


    // ==============================
    // Test the set_name and get_name_by_index functions
    // ===============================

    // Use the client to call the set_name function with the argument "Bob"
    client.set_name(&Symbol::new(&env, "Bob"));

    // Use the client to call the get_name_by_index function with the argument 0 and store the result in the variable name
    let output_get_name_by_index = client.get_name_by_index(&0);

    // Assert that the result is equal to the Symbol "Bob"
    assert_eq!(output_get_name_by_index, Symbol::new(&env, "Bob"));

    // Use the client to call the set_name function with the argument "Charlie"
    client.set_name(&Symbol::new(&env, "Charlie"));

    // Use the client to call the get_name_by_index function with the argument 1 and store the result in the variable name
    let output_get_name_by_index = client.get_name_by_index(&1);

    // Assert that the result is equal to the Symbol "Charlie"
    assert_eq!(output_get_name_by_index, Symbol::new(&env, "Charlie"));

    // Attempts to read a non-existent name at index 2
    // This should return an 'NotFound' Symbol
    let output_get_name_by_index = client.get_name_by_index(&2);

    // Assert that the result is equal to the Symbol "NotFound"
    assert_eq!(output_get_name_by_index, Symbol::new(&env, "NotFound"));


    // ==============================
    // Test the deposit function
    // ===============================

    // Create a new account for the token contract admin
    let admin = <soroban_sdk::Address as Address>::generate(&env);

    // instantiate a new token contract
    let token_contract_id = env.register_stellar_asset_contract(admin);

    // instantiate a new token contract admin client for the token contract
    // This client will be used to mint tokens for Alice
    let admin_token_contract = StellarAssetClient::new(&env, &token_contract_id);

    // instantiate a new token contract client for the token contract
    // This client will be used to check the balance of accounts
    let token_contract = token::TokenClient::new(&env, &token_contract_id);

    // Create a new account for Alice
    let alice = <soroban_sdk::Address as Address>::generate(&env);

    // Mint 1000 tokens for Alice
    admin_token_contract.mint(&alice, &1000);

    // Use the client to call the deposit function with the 
    // arguments alice, token_contract_id, and 100.
    // This will deposit 100 tokens from Alice to the contract.
    client.deposit(&alice, &token_contract_id, &100);

    // Assert that the balance of the contract is 100
    assert_eq!(token_contract.balance(&contract_id), 100);

    // Assert that the balance of Alice is 900
    assert_eq!(token_contract.balance(&alice), 900);

}
