# `@hyperledger/cacti-test-plugin-ledger-connector-solana`

## Usage

``` sh
# In root project dir
yarn jest cacti-test-plugin-ledger-connector-solana
```


## FAQ

### **What is a dedicated test package for?**

This is a dedicated test package meaning that it verifies the integration between two packages that are somehow dependent on each other and therefore these tests cannot be added properly in the child package due to circular dependency issues and it would not be fitting to add it in the parent because the child package's tests should not be held by the parent as a matter of principle.

Concretely, it verifies that `@hyperledger/cacti-plugin-ledger-connector-solana` works when:

- mounted on a full `@hyperledger/cactus-cmd-api-server` API server, and
- driven through the generic `Verifier` / `VerifierFactory` abstraction from
  `@hyperledger/cactus-verifier-client` (validator type `SOLANA_2X`).

These dependencies (`cmd-api-server`, `verifier-client`) would create circular
dependencies if the tests lived inside the connector package itself.
