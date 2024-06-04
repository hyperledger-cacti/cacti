#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, token, vec, Address, Env, Symbol, Vec};

//
// Trait that defines the contract interface
//
pub trait HelloContractTrait {
    // Function that returns a Symbol with the string "Hello, World!"
    fn say_hello(env: Env) -> Symbol;
    // Function that returns a Vec<Symbol> with the strings "Hello", and the
    // name of the recipient provided in the argument `to`.
    fn say_hello_to(env: Env, to: Symbol) -> Vec<Symbol>;
    // Function that returns a Symbol with the string "CaptainCacti"
    fn set_name(env: Env, name: Symbol);
    // Function that sets the name provided in the argument `name`
    // in the storage in a Vec<Symbol> with the key DataKey::Names
    fn get_name(env: Env) -> Symbol;
    // Function that returns the name at the index provided in the 
    // argument `index` from the Vec<Symbol> in the storage with the key DataKey::Names
    fn get_name_by_index(env: Env, index: u32) -> Symbol;
    // Function that performs a deposit of the asset_id provided in the argument `asset_id`
    // with the amount provided in the argument `amount` from the address provided in the argument `from`
    // to the contract address. 
    fn deposit(env: Env, from: Address, asset_id: Address, amount: i128);
}


//
// Enum that defines the storage keys
//
#[contracttype]
pub enum DataKey {
    Names,           // Vec<Symbol> of names
    Balance(Address) // u64 balance for an address
}

//
// Contract implementation
//
#[contract]
pub struct HelloContract;

#[contractimpl]
impl HelloContractTrait for HelloContract {

    fn say_hello(env: Env) -> Symbol{
        // Return a new Symbol with the string "Hello, World!"
        return Symbol::new(&env,"HelloWorld");
    }

    fn say_hello_to(env: Env, to: Symbol) -> Vec<Symbol> {
        // Return a new Vec<Symbol> with the strings "Hello", and the 
        // name of the recipient provided in the argument `to`.
        vec![&env, symbol_short!("Hello"), to]
    }


    fn get_name(env: Env) -> Symbol {
        // Return a new Symbol with the string "CaptainCacti"
        return Symbol::new(&env,"CaptainCacti");
    }

    fn set_name(env: Env, name: Symbol) {
        // Attempts to read the current value for the
        // Vec<Symbol> from the storage and unwrap it.
        // If the value does not exist, it will return an empty Vec.
        let mut names = env
            .storage()
            .instance()
            .get::<_,Vec<Symbol>>(&DataKey::Names)
            .unwrap_or(Vec::new(&env));

        // Push the new name to the back of the Vec
        names.push_back(name);

        // Set the new Vec<Symbol> in the storage for the key DataKey::Names
        env.storage().instance().set(&DataKey::Names, &names);
    }

    fn get_name_by_index(env: Env, index: u32) -> Symbol {
        // Attempts to read the current value for the
        // Vec<Symbol> from the storage and unwrap it.
        // If the value does not exist, it will return an empty Vec.
        let names = env
            .storage()
            .instance()
            .get::<_,Vec<Symbol>>(&DataKey::Names)
            .unwrap_or(Vec::new(&env));

        // Attempt to get the name at the index provided in the argument `index`.
        // If the index is out of bounds, it will return None.
        let name = names.try_get(index).unwrap();

        // If the name is None, return a new Symbol with the string "No name found"
        if name.is_none() {
            return Symbol::new(&env,"NotFound");
        }
        // Since we know the name is not None, 
        // we can unwrap it safely and return it.
        name.unwrap()
    }

    fn deposit(env: Env, from: Address, asset_id: Address, amount: i128) {

        // Ensure the address provided in the argument `from`
        // has authorized the contract to perform the deposit.
        from.require_auth();

        // Get the balance for the address provided in the argument `from`
        // from the storage for the key DataKey::Balance
        // If the balance does not exist, it will return 0.
        let balance = env
            .storage()
            .instance()
            .get::<_,i128>(&DataKey::Balance(from.clone()))
            .unwrap_or(0);

        // Add the amount provided in the argument `amount` to the balance
        let new_balance = balance + amount;

        // Set the new balance in the storage for the key DataKey::Balance
        env.storage().instance().set(&DataKey::Balance(from.clone()), &new_balance);

        // Invoke the transfer function of the token contract with the id 
        // provided in the argument `asset_id`. If the transfer fails, it will panic
        // and revert the transaction.
        token::Client::new(&env, &asset_id).transfer( &from, &env.current_contract_address(), &amount)

    }


}

mod test;
