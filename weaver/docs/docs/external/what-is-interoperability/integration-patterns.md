---
id: integration-patterns
title: Integration Patterns
--- 

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

Integration patterns are well-known reusable solutions for integrating systems together. A number of patterns exist for addressing various types integration problems. The specific pattern applied in practice depends on the nature of the integration problem, the overall objective of the integration task, trade-offs in alternate approaches, and potential risks.



## Distributed Ledger Integration Patterns

Here we present common patterns for integrating distributed ledgers. Not all problems are equal, some approaches to itegrating ledgers are preferred over others depending on the use case, the purpose of the itegration and the risks involved.

### Consensus-based integration between ledgers

Consensus-based integration aims to communicate the consensus view of one network to another. The consensus view is a representation of state on the ledger that is collectively agreed by the members of the network. This form of integration provides the highest assurance on the validity of state. The Weaver framework is designed to address consensus-based integration between ledgers built on different distributed ledger protocols.

![](/integration-pattern-consensus-driven.jpg)

### Standard API integration between applications

A standard API integration relies on a single party exposing an endpoint for state exchange. The validity of state relies entirely on the trust placed on the party exposing the endpoint.

![](/integration-pattern-single-party-api.jpg)

### Single enterprise participating in multiple neworks

A single enterprise participating in multiple networks can integrate state and contract logic across these networks using off-chain workflows. Unlike the previous pattern, this pattern relies on the enterprise having valid membership credentials on multiple networks. Significant trust must be placed on the organization coordianting the exchange of state across these networks.

![](/integration-pattern-single-enterprise-multiple-networks.jpg)

### Single network deployed on multiple heterogenous infrastructure

Although not an integration pattern, this pattern demonstrates interoperability at the infrastructure layer. The ability to run nodes on multiple cloud providers, as well as on-prem infrastructure, ensures networks are resilient to failures or censorship by infrastructure providers.

![](/integration-pattern-single-network-multiple-cloud.jpg)
