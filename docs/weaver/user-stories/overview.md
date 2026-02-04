---
id: overview
title: Overview
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

In the [introduction](../interoperability-modes.md), we listed various modes (or patterns) of interoperation like asset transfers, asset exchanges, and data sharing. In IT parlance, we can think of this as a _horizontal_ classification of use cases for interoperability. In this section of the documentation, we will discuss the _verticals_, or application domains, that exemplify the use and necessity of interoperation mechanisms.

## Application Domains

Distributed ledger technology has been applied gainfully to several areas where legacy processes were inefficient, cumbersome, and error-prone. With the enablement of interoperation among these networks, they have the potential to take the next step toward a truly decentralized yet trustworthy internet. We call out two prominent focus areas.

### Global Trade
Trade when seen from a global and international perspective is highly complex. In the absence of central coordinating and law-enforcing authorities at the world level, various ad hoc processes have been created and refined over centuries by merchants, financiers, and regulators, to manage complex supply-chain logistics and cross-border financing that underpin global trade. These processes exist to ensure that parties can hedge their risks, mitigate possibilities for non-compliance, and ship goods from one location to another while complying with regulatory guidelines.

Multiple networks have emerged to handle trade processes limited in scope. There exist networks to handle trade logistics (like TradeLens, built on Hyperledger Fabric), food tracking (IBM Food Trust, built on Hyperledger Fabric), trade finance (like We.Trade, built on Hyperledger Fabric, and Marco Polo, built on R3 Corda), cross-border payments, and _know-your-customer_, or KYC, processes. An end-to-end trade scenario, involving shipment of goods, financing commitments, documentation, shipping, tracking, and payments, will rely on many or all of these networks. Interoperation will help us overcome this fragmentation and lack of visibility of one network into another, and enable trustworthy and efficient trades at global scale using blockchain technology. See [Global Trade](./global-trade.md) for a concrete example.

### Financial Markets
Securities trading is a common and lucrative transaction in financial markets. As with any form of exchange, when a security is sold in exchange for money, the party that gives up its asset first faces a _non-compliance risk_; i.e., the other party may renege on the deal after it receives an asset. With the advent of blockchain-backed digital currencies maintained by countries' central banks, opportunities now exist to carry out security trades safely and efficiently. But this requires interoperation between networks managing digital currency on behalf of central banks (like private versions of Bitcoin networks with faster commitment times) and networks managing tracking securities and their ownerships. See [DvP in Financial Markets](./financial-markets.md) for a concrete example.

### Other Scenarios
There are other domains or _verticals_ we can think of that would benefit from interoperation. Healthcare is one, where different networks may exist: citizens' identity records, employer network, healthcare provider network, insurance companies' network, etc. For efficiency of operation (with privacy preservation guarantees) and to ensure that service and payments occur promptly and accurately, these networks may seek to interoperate. Similarly, interoperation between networks that manage users' academic and professional credentials may help employers and job seekers.
