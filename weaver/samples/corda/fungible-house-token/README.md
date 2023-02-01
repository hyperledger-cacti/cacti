# Fungible House Token

The source is obtained from corda samples-kotlin repo: [FungibleHouseTokens](https://github.com/corda/samples-kotlin/tree/master/Tokens/fungiblehousetoken).

Added few Workflows as an extension to that to support Asset exchange using HTLC from Weaver:

1. RetrieveStateAndRef
2. UpdateOwnerFromPointer
3. GetIssuedTokenType
4. RedeemTokenFlow

## Build

Run:
```
make build
```

This will download the source as well as, add our extension flows, and build the cordapps.

---