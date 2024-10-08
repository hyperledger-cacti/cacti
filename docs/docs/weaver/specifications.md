---
id: specifications
title: Specifications
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

The Weaver specifications ([RFCs](https://github.com/hyperledger-cacti/cacti/tree/main/weaver/rfcs)) capture abstractions, models, protocols and data formats for enabling cross-ledger communication.

For newcomers who wish to find out more details about the Weaver design and wish to contribute to the code base, we recommend starting with the [models](https://github.com/hyperledger-cacti/cacti/tree/main/weaver/rfcs/models). Protocol engineers will find in [RFC: 01-009](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/rfcs/models/infrastructure/relays.md) a useful overview of the relay model, and may then progress on to reading one of the existing protocols' design and implementation; e.g., the data sharing protocol in [RFC: 02-001](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/rfcs/protocols/data-sharing/generic.md). If you are interested in adding support for a new ledger technology, see the [existing driver implementations](https://github.com/hyperledger-cacti/cacti/tree/main/weaver/core/drivers) and [existing interoperability module implementations](https://github.com/hyperledger-cacti/cacti/tree/main/weaver/core/network). Where relevant we use [ABNF](https://tools.ietf.org/html/rfc5234) for formal syntax definitions.
