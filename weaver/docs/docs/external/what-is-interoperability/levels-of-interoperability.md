---
id: levels-of-interoperability
title: Levels of Interoperability
--- 

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

Established models of information systems interoperability stratify interoperability concerns into multiple levels. This includes technical, syntactic, semantic and application levels as shown below. 

Above the protocol and application levels there are two additional levels that require careful attention when enabling interoperability. These cover governance and policy decisions when communicating state as well as the legal and regulatory implications of networks under different jurisdictions.

![](/levels-of-interoperability.jpg)


* **Technical**: The technical level is a low-level concern that focuses on the underlying wire protocol used for communication. Examples of protocols at this level include gRPC, Apache Thrift, ASN.1 and CBOR. Protocols at this level are point-to-point and addresses additional concerns such as version negotiation and message delivery guarantees.

* **Syntactic**: The syntactic level is concerned with the structure and format of the messages exchanged. This includes protocol elements such as keywords and types. Examples include protocols defined using Google's Protocol Buffers, JSON-RPC and ASN.1.

* **Semantic**: The semantic level provides meaning to the messages exchanged. In the context of cross-chain communication, this includes messages that represent a data transfer or an asset exchange as well as other information such as validity proofs and actors involved.

* **Application**: The application level addresses domain or use-case specific concerns. In this level, interoperability deals with industry standard data models (e.g. supply chain standards such as GS1) and business processes. This level is orthogonal to the technology concerns of interoperability.

* **Governance and Policies**: The governing members of a ledger play a critical role in extending business processes to external systems. Interoperability necessitates that the governing bodies of the respective systems agree on the nature of their collaboration. The policies enforce these decisions and covers aspects such as access control and conditions for determining the validity of state proofs.

* **Legal and Regulation**: Networks residing in different jurisdictions must be comply with existing laws and regulations when communicating state.



