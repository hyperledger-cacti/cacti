# Simple State Fabric Chaincode

This chaincode contains very simple key-value recording logic, and can be used for basic integration testing in Weaver.

## Build the Chaincode

Run:
```
go build
```

## Run Unit Tests
Using library code from this clone of Weaver:
```
make test-local
```
Using library code from Github packages:
```
make test
```

## Deploy and Run in Weaver Integration Tests

Follow the [Getting Started](https://labs.hyperledger.org/weaver-dlt-interoperability/docs/external/getting-started) instructions.
