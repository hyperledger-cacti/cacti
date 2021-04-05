# Hyperledger Cactus Roadmap

A living document with the maintainers' plans regarding the general direction of the project:

![](https://media.giphy.com/media/llmrnMkLqcssM6sYG7/giphy-downsized.gif)

## Can I Add Things to the Roadmap?

If you take on the burden of implementing a feature yourself no one should stop you from adding it here as well, as long as the majority of the maintainers also agree that it is something that has a place in the framework.

For example: 
* Support being added for new ledgers by implementing new connector plugins is always welcome.
* On the other hand, if you want to repurpose Cactus to be the operating system for a driverless ice-cream truck you are developing that that **may** not get accepted by the maintainers even if you are happy to do all the work yourself. 

# Quarterly Breakdown

## Terminology

Quarters are defined as:

- **Q1**: January, February, March
- **Q2**: April, May, June
- **Q3**: July, August, September
- **Q4**: October, November, December

Halves are defined as:

- **H1**: Q1+Q2
- **H2**: Q3+Q4

## 2021 Q1

**Features:** 

1. Language Agnostic Plugin Development
    * Vault Keychain Plugin written in Rust as a proof of concept
2. HTLC plugin for Besu
    * ETH
    * ERC-20
3. Corda Open Source Ledger Connector Plugin 
    * Flow Invocation
    * CordApp Deployment 
4. Prometheus Monitoring

**Fixes:**

1. Fabric 2.x Contract Deployment

**Security Fixes**

1. Current vulnerable dependencies to be updated or removed (recurring roadmap item)

**Documentation**

1. Extend supply chain app example package with Fabric elements


## 2021 Q2

**Features**

1. Minimum Viable AuthN/AuthZ via OpenID Connect
2. Indy powered Consortium Plugin Implementation
    * With at least one of the examples using it as well
3. Kubernetes Integration
    * Helm Charts
    * KNative
    * Minikube based end to end testing
4. Public Test Deployment of a Cactus Consortium
    * Multiple nodes
    * Public domain: https://cactus.stream
5. Keychain Plugin Implementations:
    * AWS Secret Manager

**Fixes:**

`N/A`

**Security Fixes**:

1. Current vulnerable dependencies to be updated or removed (recurring roadmap item)
2. SSH host key verification for 
    * Fabric contract deployment
    * Corda contract deployment

**Documentation**

1. Climate Action SIG Example Implementation
2. Atomic Swaps Example
    * CBDC, bonds for cash
3. Cloud deployment playbook
4. Cactus ReadTheDocs Site

## 2021 Q3

**Features**

1. Keychain Plugin Implementations:
    * Azure Key Vault
2. Corda Enterprise Support
3. Besu Private Transactions
4. Fabric Private Transactions
5. Federated Authentication: SAML **and/or** LDAP

**Fixes:**

**Security Fixes**:

1. Current vulnerable dependencies to be updated or removed (recurring roadmap item)

**Documentation**

## 2021 Q4

**Features**

**Fixes:**

**Security Fixes**:

1. Current vulnerable dependencies to be updated or removed (recurring roadmap item)

**Documentation**
