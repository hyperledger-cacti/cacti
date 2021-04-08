---
id: end-to-end-security
title: End-to-End Security
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

## Relay Security Model

## A Relayer of Cryptographic Proofs

The primary function of the relay is to orchestrate the flow of cyrptographic messages between networks enabling a variety of interoperability modes:

* Transfer of data between networks
* Transfer of assets between networks
* Exchange of value between networks

These cryptographic messages represent valid state in a distributed ledger and are generated using a range of cryptographic approaches, such as attestation by a set of authoritative nodes, a non-interactive proof of PoW, or a zero-knowledge proof (proof of computational integrity). The mechanisms for deriving such proofs rely on the model of trust provided by the underlying network of nodes. The relay thus plays no direct role in the generation of proofs, removing the need for remote agents (decentralized networks, applications or users) to trust the relay for proof veracity.

The relay's message exchange protocol is in a state of development with a view towards supporting multiple interoperability modes. The current implementation however is limited to the transfer of data between networks. Future versions will enable asset and value transfers protocols.

**NOTE:** The security models examined below is limited to the transfer of data where remote queries are initiated by applications.

## Deployment Configurations and Security Implications

The relay acts as a gateway between networks for enabling cross-chain communication and supports flexible deployment configurations. 

The configuration in any deployment must statisfy the goals of the parties involved in the message exchange. These goals inform the security policy and the adversarial assumptions. The mechanisms for threat mitigation is based on these assumptions. 

The configurations described below assume that:

* A small fraction of the parties (e.g. f < n - m, where 'm' is the minimum threshold required for agreement) in a group or network might be byzantine. 
* The threat imposed by a byzantine party with priviledges to construct a valid proof is no worse if the party is also in control of a relay.
* A valid proof is one that satisfies a consumer's proof critieria (policy).

### 1. Confidential Message Exchange Between Groups of Parties

![Confidential Message Exchange](/relayd/confidential-message-exchange.png "Confidential Message Exchange")

**Goals** 

A group of parties sharing confidential data agree to share a view of their data to remote group. The system configuration will provide the following properties:

* Preserve confidentiality of messages exchanged between the groups involved.
* Preserve integrity of messages exchanged across the groups.
* The system must be available for servicing requests.

**Threat Assumptions**

An adversary in this configuration might seek to:

* Gain access to the confidential data.
* Tamper with the integrity of the messages exchanged.
* Censor messages.
* Deny service.

**Mechanisms for Threat Mitigation**

A suitable deployment configuration that addresses these threat assumptions:

* Relays will only be deployed and operated by organizations with access to the confidential data and privileges to construct valid proofs.
* A secure channel (mutual TLS) between the relays prevents external adversaries from evesdropping on the communication.
* The inclusion of a nonce in the proof enables replays of past messages to be detected.
* The deployment of multiple relays ensures availability and resistance to censorship.

In the following configuration, a group in one network maintains confidential data and have similar goals as above. The data in the providing network is private but visible to all organizations. The relay in the providing network can be operated by any organization with access to the data (the implications of this are examined next).

![Confidential Message Exchange](/relayd/confidential-message-exchange2.png "Confidential Message Exchange")

### 2. Private Message Exchange Between Networks

**Goals**

In the following configuration, the data is private to both networks but not confidential to any subset of the members. The system configuration must provide the following properties:

* Preserve confidentiality of messages exchanged between the networks.
* Preserve integrity of messages exchanged across the networks.
* The system must be available for servicing requests.

**Threat Assumptions**

An adversary in this configuration might seek to:

* Gain access to the private data.
* Tamper with the integrity of the messages exchanged.
* Censor messages.
* Deny service.

**Mechanisms for Threat Mitigation**

A suitable deployment configuration that addresses the threat assumptions:

* Relays will be deployed and operated by organizations that are members of the network with access to the shared private data and privileges to construct valid proofs.
* A secure channel (mutual TLS) between the relays prevents external adversaries from evesdropping on the communication.
* The inclusion of a nonce in the proof enables replays of past messages to be detected.
* The deployment of multiple relays ensures availability and resistance to censorship.

![Private Message Exchange](/relayd/private-message-exchange.png "Private Message Exchange")


### 3. Public Message Exchange Between Networks

**Goals**

A private network consumes data from a public permissionless network. The system configuration must provide the following properties:

* Preserve confidentiality of messages exchanged between the networks.
* Preserve integrity of messages exchanged across the networks.
* The system must be available for servicing requests.

**Threat Assumptions**

An adversary in this configuration might seek to:

* Monitor data accessed by the private network.
* Tamper with the integrity of the messages exchanged.
* Censor messages.
* Deny service.

**Mechanisms for Threat Mitigation**

A suitable deployment configuration that addresses the threat assumptions:

* Nodes (clients) of the public ledger will be deployed and operated by multiple organizations in the private network (a sufficient distribution to accomodate 'f' faulty nodes)
  * Nodes modified to sign responses with a valid identity certificate (e.g. Hyperledger Besu as Ethereum mainnet client).
* Relays to private and public nodes will be deployed and operated by organizations within the network.
* The inclusion of a nonce in the proof enables replays of past messages to be detected.
* The deployment of multiple relays ensures availability and resistance to censorship.

![Private Public Data Exchange](/relayd/private-public-message-exchange.png "Private-Public Message Exchange")

The following alternate configuration allows for a public node to be operated by a single organization. The oracle provides trusted meta-data to ensure proofs can be validated correctly (E.g. current validator set used for signing blocks in PoS/BFT sysmtems and block height to verify currency of state. A formal study on mechanisms for proof construction and their short-commings has been deferred).

![Private Public Data Exchange](/relayd/private-public-message-exchange2.png "Private-Public Message Exchange")

In the following configuration an external notary acts as an authoritative source for public ledger data. A secure channel (mutual TLS) between the relays prevents external adversaries from evesdropping on the communication.

![Private Public Data Exchange](/relayd/private-public-message-exchange3.png "Private-Public Message Exchange")


## Nonces and Replay Attacks




