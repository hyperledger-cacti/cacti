<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# IIN Agent Server and Extensions

The IIN agent module is built as a gRPC server exposing the following services:
- `syncExternalState`
- `requestIdentityConfiguration`
- `sendIdentityConfiguration`
- `flowAndRecordAttestations`
- `requestAttestation`
- `sendAttestation`

To read or write to the shared ledger, the agent must exercise DLT-specific logic. Since [platform-specific drivers](../../../drivers) already exist to carry out similar tasks (for the relay), we will augment those drivers to support the basic mechanisms needed by IIN agents. The following DLT drivers are currently implemented in Weaver and will be augmented to fulfil the above protcols:
- [Hyperledger Fabric](../../../drivers/fabric-driver)
- [Corda](../../../drivers/corda-driver)
