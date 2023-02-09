<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
---
slug: emergence-enterprise-interoperability
title: Emergence of Enterprise DLT Interoperability
author: Venkatraman Ramakrishna
author_title: Maintainer of Weaver
author_url: https://github.com/VRamakrishna
author_image_url: https://avatars2.githubusercontent.com/u/14888211?s=400&v=4
tags: [enterprise, interoperability]
---

It is instructive to know the course taken by blockchain technology and its applications over the past few years, as this will allow us to understand where we are, where are headed, and thereby motivate the necessity of interoperability.

## The Grand Vision
The original vision of blockchain technology called for a global decentralized network of peers and clients that could conduct transactions at scale without requiring intermediation by trusted third parties. The Bitcoin network was the first example of this, and it was purposely left open for anyone to join precisely because its initiators hoped for a single global network somewhat akin to the internet.

But the limitations of Bitcoin as a transaction processing system soon became apparent, and the Ethereum network emerged to fill this gap, retaining the openness and scalability of Bitcoin while supporting arbitrary smart contracts over a shared ledger. But Ethereum too was not destined to be the single canonical global blockchain network that everyone would use.

Sub-groups within the Bitcoin and Ethereum communities dissented from the rest, thereby creating _forks_, or separate networks with separate chains of blocks. Others found limitations in the usability of the existing networks or their consensus mechanisms (Proof of Work) and decided to build their own networks to which like-minded people could subscribe and in which they could conduct their transactions.

Therefore, the original Bitcoin (or even Ethereum) vision of a single global network was not to be, and networks with different clientele and different consensus protocols proliferated.

And then came private (or permissioned) networks......

## Evolution of Private Networks
Sometime in the first half of the previous decade, it was recognized that networks like Bitcoin and Ethereum were not suitable for much of the business that involves private enterprises, governmental institutions, and ordinary clients. Private networks then emerged as a means to retain the trustworthiness and consensus-based decision-making properties of blockchains (and distributed ledgers in general) while ensuring that:
- Transactions and ledger state are privy only to a selected set of entities,
- Transactions can be audited by trusted authorities when required for dispute resolutions, and
- Higher performance and assurance can be gained using consensus protocols other than _proof-of-work_.

Since companies and consortia were wary of this new and unproven technology, the trend in industry these past few years has been to build _minimum viable ecosystems_, i.e., networks of limited operational scope and participation. The goal being to evaluate the potential of blockchain, these networks were created to manage selected few assets and records. Needless to say, interoperation with other networks was not high on the priority list when such networks were designed and launched.

Many of these networks have been successfully validated and put into production. But a consequence of the decision to build limited-scope networks is that the processes they run (through smart contracts) and the assets and records they maintain on their ledgers are stuck in siloes, inaccessible to external entitites and networks. Yet, as we are discovering, processes and assets in such networks are inextricably linked in the real enterprise world. With all of the investment (in time and money) made in existing networks, reeingeneering or merging them will generally be hardsells. Also, some networks may wish to restrict operational control and ledger visibility to its current set of administrators and clientele. The only viable solution is to allow networks to interoperate, thereby breaking up the siloes, while retaining operational control.

## Diverse Platforms
Our present blockchain landscape (or ecosystem) is characterized not just by a plethora of networks, a mix of open and private, but also by the existence of several distinct blockchain technologies, each with a different storage technology, a different model for contracts and client applications, a different consensus protocol, and a different way of managing identity. Examples include Fabric, Iroha, Sawtooth, and Besu, all in the Hyperledger family, and Ethereum, Multichain, Cardano, and Komodo, outside it. There are also smart contract distributed ledger platforms that serve a similar set of business applications that are not blockchains at all, like R3's Corda.

Since there is no single blockchain, or distributed ledger, technology, the world agrees on, and because each offers a different set of advantages and disadvantages, the networks that exist today are built on a diverse set of such platforms.

## Blockchain Landscape
Our present is, and our near future will be, characterized by the existence of independent networks, some of which offer open membership whereas others are restricted, built on diverse platforms that are mutually incompatible. Asking everyone to converge to a single global network running on a single canonical platform is almost impossible. So unless we wish entities and assets to remain trapped within siloes, it should be evident that interoperability amoong different networks and platforms is crucial to the success of blockchain.

## Challenges

Interlinking processes distributed across different networks or transferring or sharing assets and data may sound like a straightforward task, but the traditional method of service and API integration will not work in scenarios that involve permissioned networks.

This is because, as you will see in the [user stories](/docs/external/user-stories/overview), entities that are interested in the asset or data record being shared may not be members of both networks. And even if a particular entity happens to be a member of both networks, it may be in its interest to present a false view of one network's ledger state to another.

Therefore, interoperation cannot be allowed to hinge on the trustworthiness of a particular network member, or by extension, a third party. In the stories we will encounter, it will be apparent how such situations may occur. This will make the unreliability of API integration across private networks clear and also motivate the need for consensus-based interoperation protocols.
