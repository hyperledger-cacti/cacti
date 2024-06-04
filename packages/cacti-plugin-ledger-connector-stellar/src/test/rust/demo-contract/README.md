# Hello World Soroban Project

A demo project containing the source cofr for an implementation of a soroban smart contract and tests.

## Requirements

- Rust 1.74.0 or newer
- Soroban CLI 21.0.0-rc.1 or newer

See the full setup at [Soroban's official documentation](https://developers.stellar.org/docs/smart-contracts/getting-started/setup).

## Project initialization

This project was initialized using the soroban-cli on version 21.0.0-rc.1 with the command below:

```bash
soroban contract init demo-contract
```

For further details on how to start a new soroban smart contract projects, refer to the [official documentation](https://developers.stellar.org/docs/smart-contracts/getting-started).

## Project Structure

This repository uses the recommended structure for a Soroban project:

```text
.
├── contracts
│   └── hello_world
│       ├── src
│       │   ├── lib.rs
│       │   └── test.rs
│       └── Cargo.toml
├── Cargo.toml
└── README.md
```

- New Soroban contracts can be put in `contracts`, each in their own directory. There is already a `hello_world` contract in there to get you started.
- If you initialized this project with any other example contracts via `--with-example`, those contracts will be in the `contracts` directory as well.
- Contracts should have their own `Cargo.toml` files that rely on the top-level `Cargo.toml` workspace for their dependencies.
- Frontend libraries can be added to the top-level directory as well. If you initialized this project with a frontend template via `--frontend-template` you will have those files already included.

## Building the Contract

To build the contract, run the following command:

```bash
soroban contract build
```

The compiled file will be saved to `target/wasm32-unknown-unknown/release/hello_world.wasm`.

## Testing

The tests are present in the `src/test.rs` file and can be executed by running the following command:

```bash
cargo test
```

## Ready-to-use assets

Within this project's root directory one may find the following assets:

- **hello_world.wasm** : A compiled WASM file of the code, ready to be uploaded to a Stellar network.
- **spec.ts** : A typescript file exporting useful objects for clients to interact with this contract.
  - `spec`: spec array containing the contract specification encoded in XDR format. This spec can be extracted from compiled WASM contracts or by generating the contract bindings using the `soroban-cli`.
  - `methods`: enum object containing the method names for the functions in the contract as they should be invoked.
  - `<method>Args`: Multiple types for the 'args' object to be structured to invoke that method.
  - `<method>Response`: Multiple types for the responses received from the contract invocations to that method.
