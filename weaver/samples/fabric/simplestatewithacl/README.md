# Simple State Fabric Chaincode

This chaincode contains very simple key-value recording logic, and can be used for basic integration testing in Weaver.

The small addition in this chaincode compared to the [simplestate](../simplestate) chaincode is that it contains an access control check for queries coming from a Weaver relay. This demonstrates how one can adapt and urade chaincode when the relay is untrusted and may try to bypass the Fabric Interop CC access control checks.

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
