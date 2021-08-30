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
5. Sawtooth Validator
    * Block monitoring feature
    * (Transaction request feature will be added later)
6. test docker container for Sawtooth
7. VerifierFactory
    * to adapt Verifier to both of socket.io-typed Validator and OpenAPI-typed Validator
8. BLP/electricity-trade
    * BLP application integrating with Ethereum and Sawtooth
9. prototype codes of auto-testing framework using Jest

**Fixes:**

1. Fabric 2.x Contract Deployment
2. car-trade execution procedures

**Security Fixes**

1. Current vulnerable dependencies to be updated or removed (recurring roadmap item)

**Documentation**

1. Extend supply chain app example package with Fabric elements


## 2021 Q2

**Features**

1. Keychain Plugin Implementations:
    * AWS Secret Manager
2. Indy Validator
3. test docker container for Indy
4. test docker container for Iroha

**Fixes:**

`N/A`

**Security Fixes**:

1. Current vulnerable dependencies to be updated or removed (recurring roadmap item)

**Documentation**

1. Climate Action SIG Example Implementation
2. Cactus ReadTheDocs Site

## 2021 Q3

**Checkpoints for releasing V1-RC**

1. **Validator**
    - Validators for Hyperledger ledgers (Fabric, Sawtooth, Besu, Indy, Iroha), Quorum, Go-Ethereum, and Corda

2. **Verifier**
    - All sync/async requests from BLP must communicate with  Validator (toward ledgers) via Verifier
    - transaction signer features for Hyperledger ledgers (Fabric, Sawtooth, Besu, Indy, Iroha), Quorum, Go-Ethereum, and Corda

3. **BLP-attached optional plugins**

4. **BLP applications**
    - BLP applications using each ledger of Hyperledger ledgers (Fabric, Sawtooth, Besu, Indy, Iroha), Quorum, Go-Ethereum, and Corda

5. **Test ledger tools**
    - Ledger tools for Hyperledger ledgers (Fabric, Sawtooth, Besu, Indy, Iroha), Quorum, Go-Ethereum, and Corda

6. **Service API and Admin API**
    - SDK for BLP
    - SDK for LedgerPlugin

7. **Support tools**

8. **Dockernize**
    - Dockernize Cactus Node Server
    - Dockernize Cactus validators for the ledgers of Hyperledger ledgers (Fabric, Sawtooth, Besu, Indy, Iroha), Quorum, Go-Ethereum, and Corda

9. **Error handing**
    - (Error cases will be listed soon)

10. **Satisfying the test items to ensure quality**
    - (TBA)

11. **Others**
    - Method for providing packages
    - refactor config files on /etc/cactus of server directory

**Features**

1. Keychain Plugin Implementations:
    * Azure Key Vault
3. Besu Private Transactions
4. Fabric Private Transactions
6. transaction signer features
    * Hyperledger ledgers (Iroha, Sawtooth, Fabric v2, Indy, Quorum, Corda)
7. SDK for BLP
8. SDK for LedgerPlugin
9.  Dockernize
10. Method for providing packages
11. refactor config files on /etc/cactus of server directory
12. Error Handling

**Fixes:**

**Security Fixes**:

1. Current vulnerable dependencies to be updated or removed (recurring roadmap item)

**Documentation**

## 2021 Q4

**Features**

1. Corda Enterprise Support [#877](https://github.com/hyperledger/cactus/issues/877)
2. Multi-protocol Support in the API Server: [#503](https://github.com/hyperledger/cactus/issues/503)
3. Support WebAssembly Modules as Plugins [#1281](https://github.com/hyperledger/cactus/issues/1281)
4. Indy powered Consortium Plugin Implementation [#675](https://github.com/hyperledger/cactus/issues/675)
    * With at least one of the examples using it as well

**Fixes:**

**Security Fixes**:

1. Current vulnerable dependencies to be updated or removed (recurring roadmap item)
2. CII Best Practices 100% Compliance [#357](https://github.com/hyperledger/cactus/issues/357)
   * Fuzzer security testing
   * Vulnerability disclosures

**Documentation**

1. Atomic Swaps Example
    * CBDC, bonds for cash
2. Green aluminum use-case with BAFT DLPCs
    * In partnership with the Hyperledger Trace Finance SIG
3. Cloud deployment playbook(s)
   * Kubernetes Integration
     * Helm Charts
     * KNative
     * Minikube based end to end testing
4. Public Test Deployment of a Cactus Consortium
    * Multiple nodes/API servers scenarios covered
    * Public domain: https://cactus.stream
5. Reproducible benchmarks
    * Scripts to pull up and tear down cloud provider resources automatically
    * Benchmarks to be published 
    * Emphasize the horizontal scalability of the API server to showcase the stateless design