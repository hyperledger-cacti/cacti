<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# IIN Agent Server and Extensions

The core IIN agent module is built as a gRPC server exposing the following services:
- `syncExternalState`
- `flowAndRecordAttestations`
- `requestAttestation`
- `sendAttestation`

Extensions for the following platforms are supported:
- [Hyperledger Fabric](./fabric)
- [Corda](./corda)
- [Hyperledger Besu](./besu)
