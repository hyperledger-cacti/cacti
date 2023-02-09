<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Interoperation Modules within Networks

Various functions are implemented at the ends of a protocol that require a network to make a decision as a unit. The natural way to implement these functions is by using that network's native smart contract mechanism and relying on the network's native consensus protocol to manage Byzantine failures.

Implementations of Fabric interoperation modules as contracts (or _chaincode_) lie [here](./fabric-interop-cc).

Implementations of Corda interoperation modules as CorDapps lie [here](./corda-interop-app).
