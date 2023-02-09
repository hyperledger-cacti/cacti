<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Cross-Network Identity Management

Enabling two independent networks/ledgers to interoperate requires the establishment of trust on the basis of the identities of the main participants (stakeholders) of each network. The cross-network identity management required for this trust establishment must itself be as decentralized as possible and adhere to blockchain/DLT tenets. In this folder, we implement the cross-network architecture described in the [Weaver identity RFCs](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/rfcs/models/identity/network-identity-management.md).

The fulcra of this architecture that are external to the interoperating networks are the IINs, or Interoperable Identity Networks (an adaptation of a generic distributed identity registry). Though our specifications allow integration with any form of distributed identity registry (with some augmentations), we provide in the [iin](./iin) folder a reference implementation of an ideal IIN.

Also external to the interoperating networks, and often (but not necessarily) affiliated with IINs, are trust anchors who issue credentials to networks and their participants. Though our specifications allow integration with any form of trust anchor that issues DIDs and verifiable credentials, we provide in the [trust-anchor](./trust-anchor) folder a reference implementation of an ideal trust anchor.

Implementations of each network participant's IIN Agent, which actively participate in cross-network identity plane protocols to sync identities and certificates, lie in the [iin-agent](./iin-agent) folder. Collectively, the IIN agents of a given network can be viewed as that network's _identity service_.
