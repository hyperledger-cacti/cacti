<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
 
## Summary

-   The Besu interoperability contracts support asset exchange for a generic asset.
-   The `asset-exchange` interface is required to be implemented by the application contract if you want to enable asset exchange in your application using Weaver.

## Installation

- Copy the core contract `contracts/interop/manageAssetAny.sol` and interface `interface/asset-exchange/transferInterface.sol`, to `contracts` folder of your truffle project.
- Run `truffle migrate` to install all the contracts together.