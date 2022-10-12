<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# IIN Agent Server and Extensions

The IIN agent module is built as a gRPC server exposing the following services:
- `syncExternalState`
- `requestIdentityConfiguration`
- `sendIdentityConfiguration`
- `requestAttestation`
- `sendAttestation`

To read or write to the shared ledger, the agent must exercise DLT-specific logic. The DLT specific logic are abstracted into an abtract class in `common/ledgerBase.ts`. All DLT should extend this. This code goes in different directories depending upon DLT. E.g.:
* Hyperledger Fabric specific logic goes into `fabric-ledger` directory.
* Corda specific logic goes into `corda-ledger` directory.
