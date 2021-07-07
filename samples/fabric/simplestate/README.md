# Simple State Fabric Chaincode

This chaincode contains very simple key-value recording logic, and can be used for basic integration testing in Weaver.

## Prerequisites

Run the following to import dependencies:
```
make mocks
go mod tidy
```

## Build the Chaincode

Run:
```
go build
```

## Run Unit Tests

Run:
```
make test
```

## Deploy and Run in Weaver Integration Tests

Follow the [Getting Started](https://labs.hyperledger.org/weaver-dlt-interoperability/docs/external/getting-started) instructions.
