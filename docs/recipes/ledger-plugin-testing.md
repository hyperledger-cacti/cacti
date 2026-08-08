<!-- --8<-- [start:content] -->
# Test a Ledger Connector Plugin

This guide provides instructions and best practices for writing automated test cases for Ledger Connector plugins in Hyperledger Cacti, leveraging `all-in-one` Docker images for reliable integration testing.

## Prerequisites

- Docker installed and running.
- A working Cacti build.
- Familiarity with the `test-tooling` package.

## Steps

### 1. Using All-In-One Docker Images

If you are working on a new ledger connector, you will need an `all-in-one` Docker image to achieve the expected level of test automation. If the ledger's maintainers provide an adequate standalone Docker image, you might not need to develop this yourself, but this is rarely the case.

To see an existing set of examples for `besu` and `quorum` images, review the `tools/docker/besu-all-in-one` and `tools/docker/corda-all-in-one` folders. These produce the `ghcr.io/hyperledger/cactus-besu-all-in-one` and `ghcr.io/hyperledger/cactus-corda-all-in-one` images respectively.

Both of these are used in the test cases written for the specific ledger connector plugins at:
- `packages/cactus-plugin-ledger-connector-besu/src/test/typescript/integration/plugin-ledger-connector-besu/deploy-contract/deploy-contract-from-json.test.ts`

The specific classes that utilize the `all-in-one` images can be found in the `test-tooling` package, for instance:
- `packages/cactus-test-tooling/src/main/typescript/besu/besu-test-ledger.ts`

### 2. Writing Ledger Tests

Ledger plugin tests are written the same way as any other test. The primary difference is that the test case will pull up a Docker container from one of the `all-in-one` images, wait for the ledger network to be ready, and then use that container to verify functionality such as deploying and interacting with a contract.

**Container Isolation Rule:**
As a generic best practice, test cases should never re-use any `all-in-one` ledger container for the execution of multiple test cases. Doing so will almost surely lead to flaky and unstable test suites. It is highly recommended that if you have two test cases, both pull up a newly created container from scratch, execute their respective scenarios, and then tear down and delete the container completely.

### 3. Manual API Server Testing

If you want to perform manual tests against a ledger, you can run the API server with a configuration of your choice:

```bash
chmod +x ./packages/cactus-cmd-api-server/dist/lib/main/typescript/cmd/cactus-api.js
./packages/cactus-cmd-api-server/dist/lib/main/typescript/cmd/cactus-api.js --config-file=.config.json
```

### 4. Executing Tests with Glob Patterns

You can run your ledger tests using standard NPM scripts. Under the hood, these often use glob patterns mapped to test runners.

Examples of glob patterns for test execution in `package.json`:
```json
"test:all": "tap --ts --jobs=1 --timeout=600 \"packages/cactus-*/src/test/typescript/{unit,integration}/\"",
"test:unit": "tap --ts --timeout=600 \"packages/cactus-*/src/test/typescript/unit/\"",
"test:integration": "tap --ts --jobs=1 --timeout=600 \"packages/cactus-*/src/test/typescript/integration/\""
```

To run a specific test suite manually with TAP:
```bash
npx tap --ts --timeout=600 packages/cactus-test-plugin-ledger-connector-quorum/src/test/typescript/integration/...
```

*Note: Be aware that glob patterns need quoting in some operating systems' shell environments.*

## Expected Outcome

You will successfully be able to develop and run highly isolated, reproducible integration tests for ledger connectors by spinning up and tearing down ephemeral `all-in-one` ledger containers.

## Related

- [Build Instructions][build]
- [Write and Run Tests](./testing-guide.md)
- [Create a New Package](./create-new-package.md)
<!-- --8<-- [end:content] -->

[build]: ../../BUILD.md

