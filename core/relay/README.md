<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Relay

The implementation of this relay conforms to the specifications outlined in the [rfcs](../../rfcs).

Relay is a daemon for enabling cross-DLT interoperability. Relay implements the *Inter-Relay Protocol*, an RFC to-be of a protocol standard for linking distributed ledgers that implement different ledger protocols. 

## Prerequisites

- [rustup](https://www.rust-lang.org/tools/install)

## Development

To run tests:

`cargo test`

To build project and proto files:

`make build`

To run relay server:

`RELAY_NAME=<relay_name> cargo run --bin server`

For example, the Corda relay can be started with:

`RELAY_CONFIG=config/Corda_Relay.toml  cargo run --bin server`

To run relay dummy client test:

`cargo run --bin client <port-number-of-requesting-relay> <address>`

NOTE: Please read through the addressing specification in the [rfcs](../../rfcs/formats/addressing.md). Make sure the network-type has a running supported driver and is specified in the config.

EXAMPLE:

`localhost:9081/Fabric_Network/mychannel:simplestate:read:TestState`

or

`localhost:9081/Dummy_Network/blah`

Corda example:

`localhost:9081/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:H`

### Settings

The `Settings.toml` file is used for storing configurations as well as acting as the remote relay discovery service.

NOTE: The `RELAY_NAME` environment variable will need to match a value in the `[ports]` table in the `Settings.toml`

### Optional: Live-Reload
To use live reloading install the following packages

- [cargo-watch](https://github.com/passcod/cargo-watch) binaries
  - cargo install cargo-watch

Normal live-reload:

`RELAY_NAME=<relay_name> cargo watch -x 'run --bin server'`

## Flows

### data_transfer

Basic data flow between relays.

NOTE: Remote relay name and port arguments need to match valid values in the config file.

To run local relay:

`RELAY_CONFIG=<local_relay_config_path> cargo run --bin server`

To run remote relay:

`RELAY_CONFIG=<remote_relay_config_path> cargo run --bin server`

Run dummy local client:

`cargo run --bin client <port-number-of-requesting-relay> <address>`

For running with the dummy_driver provided by this repo, please refer to the readme in the `/driver` directory


### Running and Building with Docker

For details about the building and running relay components in Docker container please see the [Relay Docker Documentation](relay-docker.md).

## Architecture

For architecture, refer to [the architecture document](./architecture.md)

## Testing Philosophy

[Write tests. Not too many. Mostly Integration](https://kentcdodds.com/blog/write-tests)

We also believe that when developing new functions running tests is prefereable than running the application to verify the code is working as expected.
