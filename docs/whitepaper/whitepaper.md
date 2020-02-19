# Hyperledger Blockchain Integration Framework Whitepaper <!-- omit in toc -->

- [1. Abstract](#1-abstract)
- [2. Example Use Cases](#2-example-use-cases)
  - [2.1 Fabric to Quorum Asset Transfer](#21-fabric-to-quorum-asset-transfer)
  - [2.2 Escrowed Sale of Data for Coins](#22-escrowed-sale-of-data-for-coins)
  - [2.3 Money Exchanges](#23-money-exchanges)
  - [2.4 Stable Coin Pegged to Other Currency](#24-stable-coin-pegged-to-other-currency)
    - [2.4.1 With Permissionless Ledgers (BTC)](#241-with-permissionless-ledgers-btc)
      - [2.4.1.1 Proof of Burn](#2411-proof-of-burn)
    - [2.4.2 With Fiat Money (USD)](#242-with-fiat-money-usd)
  - [2.5 Healthcare: Cross-Provider Data Sharing with Access Control Lists](#25-healthcare-cross-provider-data-sharing-with-access-control-lists)
  - [2.6 Integrate Existing Food Traceability Solutions](#26-integrate-existing-food-traceability-solutions)
  - [2.7 End User to Wallet Authentication/Authorization](#27-end-user-to-wallet-authenticationauthorization)
- [3. Software Design](#3-software-design)
  - [3.1. Principles](#31-principles)
    - [3.1.1. Wide support](#311-wide-support)
    - [3.1.2. Plugin Architecture from all possible aspects](#312-plugin-architecture-from-all-possible-aspects)
    - [3.1.3. Prevent Double spending Where Possible](#313-prevent-double-spending-where-possible)
    - [3.1.4 DLT Feature Inclusivity](#314-dlt-feature-inclusivity)
    - [3.1.5 Low impact](#315-low-impact)
    - [3.1.6 Transparency](#316-transparency)
    - [3.1.7 Automated workflows](#317-automated-workflows)
    - [3.1.8 Default to Highest Security](#318-default-to-highest-security)
    - [3.1.9 Transaction Protocol Negotiation](#319-transaction-protocol-negotiation)
    - [3.1.10 Avoid modifying the total amount of digital assets on any blockchain whenever possible](#3110-avoid-modifying-the-total-amount-of-digital-assets-on-any-blockchain-whenever-possible)
    - [3.1.11 Provide abstraction for common operations](#3111-provide-abstraction-for-common-operations)
    - [3.1.12 Integration with Identity Frameworks (Moonshot)](#3112-integration-with-identity-frameworks-moonshot)
  - [3.2 Feature Requirements](#32-feature-requirements)
    - [3.2.1 New Protocol Integration](#321-new-protocol-integration)
    - [3.2.2 Proxy/Firewall/NAT Compatibility](#322-proxyfirewallnat-compatibility)
    - [3.2.3 Bi-directional Communications Layer](#323-bi-directional-communications-layer)
    - [3.2.4 Consortium Management](#324-consortium-management)
  - [3.3 Working Policies](#33-working-policies)
- [4. Architecture](#4-architecture)
  - [4.1 Technical Architecture](#41-technical-architecture)
    - [4.1.1 Monorepo Packages](#411-monorepo-packages)
      - [4.1.1.1 core](#4111-core)
        - [4.1.1.1.1 Runtime Configuration Parsing and Validation](#41111-runtime-configuration-parsing-and-validation)
        - [4.1.1.1.2 Configuration Schema - Validator](#41112-configuration-schema---validator)
        - [4.1.1.1.3 Configuration Schema - API Server](#41113-configuration-schema---api-server)
        - [4.1.1.1.4 Plugin Loading/Validation](#41114-plugin-loadingvalidation)
      - [4.1.1.2 cmd-api-server](#4112-cmd-api-server)
      - [4.1.1.3 cmd-validator](#4113-cmd-validator)
      - [4.1.1.4 sdk-javascript](#4114-sdk-javascript)
      - [4.1.1.5 keychain](#4115-keychain)
      - [4.1.1.7 tracing](#4117-tracing)
      - [4.1.1.8 audit](#4118-audit)
      - [4.1.1.9 document-storage](#4119-document-storage)
      - [4.1.1.10 relational-storage](#41110-relational-storage)
      - [4.1.1.11 immutable-storage](#41111-immutable-storage)
    - [4.1.2 Deployment Diagram](#412-deployment-diagram)
    - [4.1.3 Component Diagram](#413-component-diagram)
    - [4.1.4 Class Diagram](#414-class-diagram)
    - [4.1.5 Sequence Diagram - Transactions](#415-sequence-diagram---transactions)
  - [4.2 Transaction Protocol Specification](#42-transaction-protocol-specification)
    - [4.2.1 Handshake Mechanism](#421-handshake-mechanism)
    - [4.1.9 Transaction Protocol Negotiation](#419-transaction-protocol-negotiation)
  - [4.3 Plugin Architecture](#43-plugin-architecture)
    - [4.3.1 Ledger Connector Plugins](#431-ledger-connector-plugins)
    - [4.3.2 Identity Federation Plugins](#432-identity-federation-plugins)
      - [4.3.1.1 X.509 Certificate Plugin](#4311-x509-certificate-plugin)
    - [4.3.3 Storage Plugins](#433-storage-plugins)
- [5. Identities, Authentication, Authorization](#5-identities-authentication-authorization)
  - [5.1 Transaction Signing Modes, Key Ownership](#51-transaction-signing-modes-key-ownership)
    - [5.1.1 Client-side Transaction Signing](#511-client-side-transaction-signing)
    - [5.1.2 Server-side Transaction Signing](#512-server-side-transaction-signing)
  - [5.2 Open ID Connect Provider, Identity Provider](#52-open-id-connect-provider-identity-provider)
  - [5.3 Server-side Keychain for Web Applications](#53-server-side-keychain-for-web-applications)
- [6. Terminology](#6-terminology)
- [7. References](#7-references)


# 1. Abstract

Blockchain technologies are growing in usage, but fragmentation is a big problem that may hinder reaching critical levels of adoption in the future.

We propose a protocol and it's implementation to connect as many of them as possible in an attempt to solve the fragmentation problem by creating a heterogeneous system architecture <sup>[1](#7-references)</sup>.

# 2. Example Use Cases

Specific use cases that we intend to support.
The core idea is to support as many use-cases as possible by enabling interoperability
between a large variety of ledgers specific to certain main stream or exotic use cases.

## 2.1 Fabric to Quorum Asset Transfer

Export an asset from one network to the other.
Details TBD

## 2.2 Escrowed Sale of Data for Coins

Organization A is looking to buy some data. Organization B has some data it's looking to monetize.

Data in this context is any series of bits stored on a computer:
* Machine learning model
* ad-tech database
* digital/digitized art
* proprietary source code or binaries of software
* etc.

Organization A and B trade the data and the funds through a BIF transaction in an
atomic swap with escrow securing both parties from fraud or unintended failures.

Through the transaction protocol's handshake mechanism, A and B can agree (in
advance) upon
* The delivery addresses (which ledger, which wallet)
* the provider of escrow that they both trust
* the price and currency

Establishing trust (e.g. Is that art original or is that machine learnig model has the advertized accuracy) can be facilitated through the participating DLTs if they support it.

## 2.3 Money Exchanges

Enabling the trading of fiat and virtual currencies in any permutation of possible pairs.

## 2.4 Stable Coin Pegged to Other Currency

Someone launches a highly scalable ledger with their own coin called ExampleCoin that can consistently sustain throughput levels of a million transactions per second reliably, but they struggle with adoption because nobody wants to buy into their coin fearing that it will lose its value. They choose to put in place a two-way peg with Bitcoin which guarantees to holders of their coin that it can always be redeemed for a fixed number of Bitcoins/USDs.

### 2.4.1 With Permissionless Ledgers (BTC)

A BTC holder can exchange their BTC for ExampleCoins by sending their BTC to `ExampleCoin Reserve Wallet` and the equivalent amount of coins get minted for them
onto their ExampleCoin wallet on the other network.

An ExampleCoin holder can redeem their funds to BTC by receiving a Proof of Burn on the ExampleCoin ledger and getting sent the matching amount of BTC from the `ExampleCoin Reserve Wallet` to their BTC wallet.

![ExampleCoin Pegged to Bitcoin](https://www.plantuml.com/plantuml/png/0/XP9FIyH03CNlyoc2dhmiui6JY5ln7tWG4KJmaft6TkWqgJFfrbNyxgPBLzP5yLQQlFpoNkOiAoRjsmWNRzXsaSubCDnHLL49Ab04zVR7EGqQ2QvN7QL8PKK9YYY-yJLQ_mqhLGar2CDbmfO6ISqp_pCoDu4xj7R8zDeJUvgd9CD37Np3b3CSRRKawRdqajZ8HuTRXHRVMcl6Yd9u9pW-_6NkdNaCFdJ82ZR6B0Gcvrx6LM7lGHH_-h_X9R5AMkq1Pb3o0VPlGrNhLS8LV3W0bjAKyuCViaUCaJIlHUI7RmqHhqMVxdC7EcMn2rpynOiHHEin_4cuZKHPR9XF5ACC4tIZBWvsZmptb2ajAKzpfisxzCVkewcJsMnskcbQrnsB4jZfBTN6pG6vX08iUZDed2N6dc117ljChe2GOO7URbI1MPdAyW9po09Hk79Z15OPrZj1BT4kDieGDFLPxHbPM45NCqU66kdEdTcdFUCl "ExampleCoin Pegged to Bitcoin")

#### 2.4.1.1 Proof of Burn

Cryptographic proof that a certain instance of a coin has been decommissioned and will not be possible to participate in any further transactions.
Interesting possibilities to consider:
* Could offline trades (private key exchanges) make sense for burnt funds?
* Could a hard fork revive burnt assets?

### 2.4.2 With Fiat Money (USD)

Very similar idea as with pegging against BTC, but the BTC wallet used for reserves
gets replaced by a traditional bank account holding USD.

## 2.5 Healthcare: Cross-Provider Data Sharing with Access Control Lists

Let's say that two healthcare providers have both implemented their own blockchain based patient data management systems and are looking to integrate with each other
to provide patients with a seamless experience when being directed from one to another
for certain treatments. The user is in control over their data on both platforms separately and with a BIF backed integration they could also define fine grained access control lists consenting to the two healthcare providers to access each others' data that they collected about the patient.

## 2.6 Integrate Existing Food Traceability Solutions

Both `Organization A` and `Organization B` have separate products/services for solving the problem of verifying the source of food products sold by retailers.
A retailer has purchased the food tracability solution from `Organization A` while a food manufacturer (whom the retailer is a customer of) has purchased their food tracability solution from `Organization B`.
The retailer wants to provide end to end food tracability to their customers, but this is not possible since the chain of tracability breaks down at the manufacturer who uses a different service or solution. `BIF` is used as an architectural component to build an integration for the retailer which ensures that consumers have access to food tracing data regardless of the originating system for it being the product/service of `Organization A` or `Organization B`.

![Food Tracability Integration](https://www.plantuml.com/plantuml/png/0/fLNHQjj047pNLopk1xIqzCKa9b6eKqCBflPB8I-dqvvyzUbMtJlLLKh-lIl5IjHOTXC20e6OdPsTcrjTXAWurgM3EL4EQrPQPTRPsC32HonOHKi-IQAD3k5pKo4xp0jaI1tfhTuewuT8cBCgSKUylV6d6SFM-ae96WB-hD5hl6IctNfZzTPZ2F1-066gVQw9lJJ-EFXUgj-bO5M1mTuYV7WtGhkK0QssbV8HX4K6i1vb8geW4cGK8vMGMqPzBqpfI0oJRnYLTTBlgWw2G9w02i0wIKmx8aokg1JE1Yvl_DaPSQ6ylUrccyqwg5RmveijDl6QLGD_4W1FkTGTsB8YLtVUTKo1JDmfnZsBYQ7d-OxEqQvZkalk3dIantHaBzMHZkl8Jkle-7hNZcXXV9KMoB5or9JeuzjGPq6phGRiRY3ocX7zNcFVPPXJ8sVyoUTj1DhNKm4lw6eDHZHnttUrRL9NuxWxNvMlZUIhvgCEcV9LgNc6Gsh4eKUTgoP4B1-kghYqpzSHlS7gSS5FYAIYPLYivLxoBwlxN8LW3pGCrioHhXittlJ_I-aWs9ar_-Pw8AU4y_DPTv4xiwQmh5dO0yA9uqZa5DeoKqxbgnIWX4tGXgbTM8y9w87j1Nq-VzgNYVE3WaExOSdqGvPQmhh3xtCwxMWnt8iYjeNr8McFiGLjt1JIshfSSZsWagVTbsGWNSoJv09zBl-Clm00 "Food Tracability Integration")

## 2.7 End User to Wallet Authentication/Authorization

End user facing applications can provide a seamless experience connecting multiple permissioned (or permissionless) networks for an end user who has a set of different identity proofs for wallets on different chains.

![Authentication, Authorization for Permissioned Chains](https://www.plantuml.com/plantuml/png/0/fPPBRnen483l-oj6oRMYXQIN24KXXBIeBqHegqgvp7fd5ul5Tcrl2Qduxntl0sW2IMWlI1xFVFFmp2mNpgFrnJo7Nk6dfBmKwALMhygpjlA-F4AgBOp8pgLpVAG4-bEKoaMHbpudUByqP7DACh9mcMin4-4QXifJPYl2jSKvBRITtQf_T9LJwi5hi3ARUaYa9H4CeiZDf3B8V73qio0bg6UjNaocKimKEGUTBHMh2vK8RHM7-dPBFiUxEUjYHaxU4voysO4TSQsaa0QL1wPmob9H5AKXDJWQg0I-EiRsZCdhv8u07L01loC059vJE-fsPHAozqlG2uxY_BnKaffLb4uOD6pkHrRh5DgtgjiTt_JW0x48PMDXpCoquNY4ENsJEYS_vc85Hwjzf4uW3VfNkrcTWrWdWJL2v_XDauPI7my2dGRGb-5L7oPwHgf68VU43-VTh5MqBdjVp_b1bj0B76qpL7KdrII1SFmnjCmxYylIl0hZ-JxjTfrE_G8jGK8cryiv1rvJOvdMs1-KvtfHWXlqU70pWTve610BYhb_x2yfQ6DgYUVEo7LWn7bMW5NvwtL6F2Es5ZRSp-H3P5MgwouoUP59jO7Bf9AeIXjtU6dyF0HV7WAE3m2N4GlDfkKGF2IlR_ulyaCTF9N1gkcpkit-oiHixwTgxzM-r9vk-uuvDp2qWJk-MHI1X4d2pU1gwmKL-BYjTeLn-KmOyPDXT9uD8zuJXjJGQfrlzV0PZCDsTBoQBIg7vKvsaTAUWCU9D-ICRTcFuoEBBCmr3nJxvmRdcqstXMtWolLFAAPyPHlm53rS3gzPz8iizo6vrs7LC19phR8WbnXuW8OnnafaxzLJExwDAGq--U1jmG6gh7PkceLUogeA1WF-oj0TYO8fsrcTyLMx1OCxeor_WT0Z2pejc0ITbCTLwChXIGi-eU9l2MoUACXFMq1Uj2BYqeSAHLkxe5lNTSyil5mrtgNwS2cyGAVax9lCOABmZ6lnk4pH4mDNsiLxxA8BBWp_6Va3 "Authentication, Authorization for Permissioned Chains")

# 3. Software Design

## 3.1. Principles

### 3.1.1. Wide support

Interconnect as many ecosystems as possible regardless of technology limitations

### 3.1.2. Plugin Architecture from all possible aspects

Identities, DLTs, service discovery. Minimize how opinionated we are to really embrace interoperability rather than silos and lock-in. Closely monitor community feedback/PRs to determine points of contention where core BIF code could be lifted into plugins.  Limit friction to adding future use cases and protocols.

### 3.1.3. Prevent Double spending Where Possible

Two representations of the same asset do not exist across the ecosystems at the same time unless clearly labelled as such [As of Oct 30 limited to specific combinations of DLTs; e.g. not yet possible with Fabric + Bitcoin]

### 3.1.4 DLT Feature Inclusivity

Each DLT has certain unique features that are partially or completely missing from other DLTs.
BIF - where possible - should be designed in a way so that these unique features are accessible even when interacting with a DLT through BIF. A good example of this principle in practice would be Kubernetes CRDs and operators that allow the community to extend the Kubernetes core APIs in a reusable way.

### 3.1.5 Low impact

Interoperability does not redefine ecosystems but adapts to them. Governance, trust model and workflows are preserved in each ecosystem
Trust model and consensus must be a mandatory part of the protocol handshake so that any possible incompatibilities are revealed up front and in a transparent way and both parties can “walk away” without unintended loss of assets/data.
The idea comes from how the traditional online payment processing APIs allow merchants to specify the acceptable level of guarantees before the transaction can be finalized (e.g. need pin, signed receipt, etc).
Following the same logic, we shall allow transacting parties to specify what sort of consensus, transaction finality, they require.
Consensus requirements must support predicates, e.g. “I am on Fabric, but will accept Bitcoin so long X number of blocks were confirmed post-transaction”
Requiring KYC (Know Your Customer) compliance could also be added to help foster adoption as much as possible.

### 3.1.6 Transparency

Cross-ecosystem transfer participants are made aware of the local and global implications of the transfer. Rejection and errors are communicated in a timely fashion to all participants.
Such transparency should be visible as trustworthy evidence.

### 3.1.7 Automated workflows

Logic exists in each ecosystem to enable complex interoperability use-cases. Cross-ecosystem transfers can be automatically triggered in response to a previous one.
Automated procedure which is regarding error recovery and exception handling, should be executed without any interruption.

### 3.1.8 Default to Highest Security

Support less secure options, but strictly as opt-in, never opt-out.

### 3.1.9 Transaction Protocol Negotiation

Participants in the transaction must have a handshake mechanism where they agree on one of the supported protocols to use to execute the transaction. The algorithm looks an intersection in the list of supported algorithms by the participants.

### 3.1.10 Avoid modifying the total amount of digital assets on any blockchain whenever possible

We believe that increasing or decreasing the total amount of digital assets might weaken the security of blockchain, since adding or deleting assets will be complicated. Instead, intermediate entities (e.g. exchanger) can pool and/or send the transfer.

### 3.1.11 Provide abstraction for common operations

Our communal modularity should extend to common mechanisms to operate and/or observe transactions on blockchains.

### 3.1.12 Integration with Identity Frameworks (Moonshot)

Do not expend opinions on identity frameworks just allow users of `BIF` to leverage the most common ones and allow for future expansion of the list of supported identity frameworks through the plugin architecture.
Allow consumers of `BIF` to perform authentication, authorization and reading/writing of credentials.

Identity Frameworks to support/consider initially:

* [Hyperledger Indy (Sovrin)](https://www.hyperledger.org/projects/hyperledger-indy)
* [DIF](https://identity.foundation/)
* [DID](https://www.w3.org/TR/did-core/)

## 3.2 Feature Requirements

### 3.2.1 New Protocol Integration

Adding new protocols must be possible as part of the plugin architecture allowing the community to propose, develop, test and release their own implementations at will.

### 3.2.2 Proxy/Firewall/NAT Compatibility

Means for establishing bi directional communication channels through proxies/firewalls/NAT wherever possible

### 3.2.3 Bi-directional Communications Layer

Using a blockchain agnostic bi directional communication channel for controlling and monitoring transactions on blockchains through proxies/firewalls/NAT wherever possible.
   * Blockchains vary on their P2P communication protocols. It is better to build a modular method for sending/receiving generic transactions between trustworthy entities on blockchains.

### 3.2.4 Consortium Management

Consortiums can be formed by cooperating entities (person, organization, etc) who wish to all contribute hardware/network resources to the operation of a `BIF` cluster (set of validator nodes, API servers, etc).

After the forming of the consortium with it's initial set of members (one or more) it is possible to enroll or remove certain new or existing members.

`BIF` does not prescribe any specific consensus algorithm for the addition or removel of consortium members, but rather focuses on the technical side of making it possible to operate a cluster of nodes under the ownership of separate entities without downtime while also keeping it possible to add/remove members.

A newly joined consortium member does not have to participate in every component of `BIF`: Running a validator node is the only required action to participate, etcd, API server can remain the same as prior to the new member joining.

## 3.3 Working Policies

1. Participants can insist on a specific protocol by pretending that they only support said protocol only.
2. Protocols can be versioned as the specifications mature
3. The two initially supported protocols shall be the ones that can satisfy the requirements for Fujitsu's and Accenture's implementations respectively

# 4. Architecture

## 4.1 Technical Architecture

### 4.1.1 Monorepo Packages

The Blockchain Integration Framework is divided into a set of npm packages that can be compiled separately or all at once.

Naming conventions for packages:
* cmd-* for packages that ship their own executable
* sdk-* for packages designed to be used directly by application developers
* All other packages should be named preferably as a single English word suggesting the most important feature/responsibility of the package itself.

#### 4.1.1.1 core

Contains the kernel of the Blockchain Integration Framework.
Code that is strongly opinionated lives here, the rest is pushed to other packages that implement plugins or define their interfaces.

**The main responsibilities of the `core` package are:**

##### 4.1.1.1.1 Runtime Configuration Parsing and Validation

The core package is responsible for parsing runtime configuration from the usual sources (shown in order of precedence):
* Explicit instructions via code (`config.setHttpPort(3000);`)
* Command line arguments (`--http-port=3000`)
* Operating system environment variables (`HTTP_PORT=3000`)
* Static configuration files (config.json: `{ "httpPort": 3000 }`)

The Apache 2.0 licenced node-convict library to be leveraged for the mechanical parts of the configuration parsing and validation: https://github.com/mozilla/node-convict

##### 4.1.1.1.2 Configuration Schema - Validator

|   | Parameter   | Type            | Config Key: CLI        | Config Key: Env      | Config Key: JSON    | Description                                                                                          |
|---|-------------|-----------------|-----------------|---------------|--------------|------------------------------------------------------------------------------------------------------|
|   | Etcd Hosts  | `Array<string>` | `--etcd-hosts`  | `ETCD_HOSTS`  | `etcdHosts`  | The hosts of Etcd nodes the validator node should connect to for the purpose of leadership election. |
|   | Private Key | `string`        | `--private-key` | `PRIVATE_KEY` | `privateKey` | The private key of the validator node to be used when signing validated messages.                    |
|   | Public Key  | `string`        | `--public-key`  | `PUBLIC_KEY`  | `publicKey`  | The public key of the validator node that pairs with the `Private Key` of the same node.             |

##### 4.1.1.1.3 Configuration Schema - API Server

|   | Parameter                 | Type            | Key: CLI, Env, JSON                                                                                | Description                                                                                                                                                                                                                                                                                                                                                                                                             |
|---|---------------------------|-----------------|----------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|   | Validator Hosts           | `Array<string>` | `--validator-hosts`<br><br>`VALIDATOR_HOSTS`<br><br>`validatorHosts`                               | <br>List of hosts to connect to when requesting validation related tasks from the validator nodes.                                                                                                                                                                                                                                                                                                                      |
|   | HTTPS_PORT                | `number`        | `--https-port`<br><br>`HTTPS_PORT`<br><br>`httpsPort`                                              | The TCP port to listen on for HTTPS connections.                                                                                                                                                                                                                                                                                                                                                                        |
|   | CORS Domains              | `Array<string>` | `--cors-domains`<br><br>`CORS_DOMAINS`<br><br>`corsDomains`                                        | Optional. Zero or more domain patterns (wildcards are allowed).                                                                                                                                                                                                                                                                                                                                                         |
|   | Virtual Hosts             | `Array<string>` | `--virtual-hosts`<br><br>`VIRTUAL_HOSTS`<br><br>`virtualHosts`                                     | <br>Optional. When specified, constrains the acceptable incoming requests to ones that specify their host HTTP header in a way that matches at least one of the patterns specified in this configuration parameter.                                                                                                                                                                                                     |
|   | Authentication Strategies | `Array<string>` | `--authentication-strategies`<br><br>`AUTHENTICATION_STRATEGIES`<br><br>`authenticationStrategies` | Optional. Specifies the fully qualified name, version and exported module of one or more npm packages that are to be loaded and used as the providers for the authentication strategies. For example to use PassportJS's OpenID Connect strategy one with specify the value `["passport-oidc-strategy@0.1.1###Strategy"]` which will get parsed as a JSON string containing an array of strings.                        |
|   | Authentication Options    | `Array<string>` | `--authentication-options`<br><br>`AUTHENTICATION_OPTIONS`<br><br>`authenticationOptions`          | Used to provide arguments to the constructors (or factory functions) exported by the modules specified by `AUTHENTICATION_STRATEGIES`. For example, in this configuration parameter you can specify the callback URL for an Open ID Connect provider of your choice, the client ID, client secret, etc. Important: The order in which the items appear have to match the order of items in `AUTHENTICATION_STRATEGIES`. |
|   | Package Registries        | `Array<string>` | `--package-registries`<br><br>`PACKAGE_REGISTRIES`<br><br>`packageRegistries`                      | Optional. Defaults to the public npm registry at `https://registry.npmjs.org/`. Can be used to specify private registries in the event of closed source plugins. If multiple registry URLs are provided they all will be tried in-order at bootstrap time.                                                                                                                                                              |

##### 4.1.1.1.4 Plugin Loading/Validation

Plugin loading happens through NodeJS's built-in module loader and the validation is performed by the Node Package Manager tool (npm) which verifies the byte level integrity of all installed modules.

#### 4.1.1.2 cmd-api-server

A command line application for running the API server that provides a unified REST based HTTP API for calling code.

By design this is stateless and horizontally scalable.

Comes with Swagger API definitions.

#### 4.1.1.3 cmd-validator

Command line application to run a single `BIF` validator node.

#### 4.1.1.4 sdk-javascript

Javascript SDK (bindings) for the RESTful HTTP API provided by `cmd-api-server`.
Compatible with both NodeJS and Web Browser (HTML 5 DOM + ES6) environments.

#### 4.1.1.5 keychain

Responsible for persistently storing highly sensitive data (e.g. private keys) in an encrypted format.

#### 4.1.1.7 tracing

Contains components for tracing, logging and application performance management (APM) of code written for the rest of the Blockchain Integration Framework packages.

#### 4.1.1.8 audit

Components useful for writing and reading audit records that must be archived longer term and immutable.
The latter properties are what differentiates audit logs from tracing/logging messages which are designed to be ephemereal and to support technical issues not regulatory/compliance/governance related issues.

#### 4.1.1.9 document-storage

Provides structured or unstructured document storage and analytics capabilities for other packages such as `audit` and `tracing`.
Comes with its own API surface that serves as an adapter for different storage backends via plugins.
By default, `Open Distro for ElasticSearch` is used as the storage backend: https://aws.amazon.com/blogs/aws/new-open-distro-for-elasticsearch/

![Document Storage Deployment Diagram](https://www.plantuml.com/plantuml/png/0/ZLLHRzem47xthxZHXsrIWQ5gRmWL1jsgLHegQ4-L9cDVWaLYPxPJngR-zrsSX990QP5uyDtd-xwxyrskdUVMvsa2KoFo5BM7XJUMnmXJp1Ap2wQfuh7bAMDU-GJXsov3cw2CqS8aCM8ZrbnfkDKU2UQLqN13SDmQktdGRmhy7jn6wOpJ0UwKHayKOAnV6_RiSFWxHormRAtPBjTAR3Gw1rS746joBOMncgHzFh2d_4zAMA9twY_2rQSJOUTK2ILKnaaOHQ4KIGXxfxH8Seamz7d6fRtg2vEcHezEU2AZVPTlqPaK-v9xlk8EHun5HJMWyrgjEZ0SEXFvBRS8Sb-bqGWkxbIyzbzsNCC_nW0oBZP5AJlP9kwAL7PvfheExIFQ3d07P2Oh6KjRTV-hHIm20FqeYSpeeWUTFk7wZuE-adHKVjVdKdQ5nN3aoOCU3kzdYoMCvxSmqp8pgj0KU0Zv3CJAzr9yMJs4hYiVGbzfQeS_5xz470H-Eig-LbtdNP_FvtnReHPK7oMmq20IxbpDMxbTwJv9lC5Tw6LDN9_F4t-lK2yGrq5QnDx4wDVKo39UGuUtN52TQXdLyOIAXew9YfQ4HDjMi5AH3uvm9x2t27akbQ_fmk4DPEC2TsVY-2HZY984RqLR_XkyxVTJIwZjbVcLneSNLLN_v-2eyS5TLVznqBxz8qCzLSvRCrlCapnMkXt044861Bei848gJ_ibSBGE9vGZtNbv-2cgTAlc3W3GXZPF40Ib8eWCbNP6McYBBP1RiIuLoGZTlYXyLzNaPlnhEbwE9-F5x8DS3IuxdSjwOrrkryhZHxYuDpkUJ98SwnoqyGWhuxr9mKH7rIeckDeukKF7wi45QgqIZ6uqUeW508gOZ3Kd7NfvrXiTnM-TeIVDLXFkHD6FJNiq5PEnavjh3pdO8wor2munzRIorjX2xm0KtlPPH3MoZErdhv7_Njr1FvepyogSNPELllB_0G00 "Document Storage Deployment Diagram")

> The API surface provided by this package is kept intentionally simple and feature-poor so that different underlying storage backends remain an option long term through the plugin architecture of `BIF`.

#### 4.1.1.10 relational-storage

Contains components responsible for providing access to standard SQL compliant persistent storage.

> The API surface provided by this package is kept intentionally simple and feature-poor so that different underlying storage backends remain an option long term through the plugin architecture of `BIF`.

#### 4.1.1.11 immutable-storage

Contains components responsible for providing access to immutable storage such as a distributed ledger with append-only semantics such as a blockchain network (e.g. Hyperledger Fabric).

> The API surface provided by this package is kept intentionally simple and feature-poor so that different underlying storage backends remain an option long term through the plugin architecture of `BIF`.

### 4.1.2 Deployment Diagram

Source file: `./docs/architecture/deployment-diagram.puml`

![Deployment Diagram HL BIF](https://www.plantuml.com/plantuml/png/0/ZLNHRjem57tFLzpnqasYJF3SeYQ43ZGAQ6LxgXGvpWKi73jo73eqzTzt7GA4aj4X8N1yphat9ySt3xbbnXQfX10pgNSfAWkXO2l3KXXD81W_UfxtIIWkYmJXBcKMZM3oAzTfgbNVku651f5csbYmQuGyCy8YB8L4sEa2mjdqPW4ACG6h8PEC8p3832x5xq-DmYXbjjOA-qsxacLMPn5V6vrYhFMc4PKmosAMauHdXQLEBc_kHOrs6Hg9oGeD15Bp3LypeM2iB1B02gtWaO3ugis6F5Yw_ywFg2R6SeZ5Ce4_dWTWa5kcLbIkzMorOIk4kT5RaQ1fEMIUTGa8z7doez1V-87_FFpypR1T6xhjKYXkdrJQq0eOtmYrWf3k1vmcjhvK4c-U-vvN_SMae5lN1gQQ_1Z88hTLxQtY5R4HFz4iWO19flY18EDZfN_pkftEjDAlq6V0WLQALjgyA0Wd2-XMs2YHjXln8-NjOsglHkrTK9lSyETZU4QpfSTRTu9b8c_meeQ-DCDnp3L7QkoZ9NkIEdjUnEHI5mcqvaKi1I_JPXJQaa6_X7uxPAqrJYXZmWhCosrnN9QQjV8BmrJEk7LPgKWxy4kI5QpgW3atOQYIw6UE9lBTBXRi4CZ1S3APZsRJMYAFH_4ybKyw5kMPsWf-FP2DVGLLNt5pNy6-h_ZGryIVBsRpQ33wCNiQ1hFPzrD_-s5mtbo8-SPDYC3eLv9xrzx9sr3areYui3IO9kKGs9jCyRfgxod6reNuse6c_IJklclleYof_Q-5ftFWQlS-hDtxi7RlqX_FZQcxJgVJtnyLpusEvZKX2UzIUtT_Vz-l1RHsqHbQMxefvtcKExYzxPyIHbVYyih-cPBi0wg4taj_0G00 "Deployment Diagram HL BIF")

### 4.1.3 Component Diagram

Source file: `./docs/architecture/component-diagram.puml`

![Component DiagramHyperledger Blockchain Integration Framework](https://www.plantuml.com/plantuml/png/0/ZLN1Rjim3BthAmXVrWQhiVGO546pPaK7x32i1NOPCCWownYH9LTKbdX9_tsKx2JsihRBIT9xV7mYAUUQl7H-LMaXVEarmesjQclGU9YNid2o-c7kcXgTnhn01n-rLKkraAM1pyOZ4tnf3Tmo4TVMBONWqD8taDnOGsXeHJDTM5VwHPM0951I5x0L02Cm73C1ZniVjzv9Gr85lTlIICqg4yYirIYDU1P2PiGKvI6PVtc8MhdsFQcue5LTM-SnFqrF4vWv9vkhKsZQnbPS2WPZbWFxld_Q4jTIQpmoliTj2sMXFWSaLciQpE-hmjP_ph7MjgduQ7-BlBl6Yg9nDNGtWLF7VSqsVzHQTq8opnqITTNjSGUtYI6aNeefkS7kKIg4v1CfPzTVdVrLvkXY7DOSDsJTU-jaWGCQdT8OzrPPVITDJWkvn6_uj49gxVZDWXm-HKzIAQozp3GEyn_gEpoUlfs7wb39NYAAYGWrAXwQeTu4XliWhxGaWkJXEAkTM7lB3evzZq2S1yO2ACAysekBsF49N5t9ed1OI8_JQOS-CxpRnaSYte6n7eE86VC6O0OyFOoP_PJ36Ao3oZfc7QOyRRdcU1H3CZo-3SWQaAQ9HBEgCdxNzX7EVgEpu2rKZ9s7N54BJHwDyFACBRwFviuXJOCj4OVtUSUN-jlpvT5pR-B3YFFiRBXskc7_1vClsmwFudyTzpAzPVwoCpzYxwH2ErJuz54PcieDEO3hLx3OtbTmgaz1qSv4CavWjqjJk-LbceuI7YB-26_ONBf_1SCjXMto8KqvahN3YgEm5litq-cC_W7oK8uX_aBM0K5SSvNu7-0F "Component DiagramHyperledger Blockchain Integration Framework")

### 4.1.4 Class Diagram

### 4.1.5 Sequence Diagram - Transactions

TBD

## 4.2 Transaction Protocol Specification

### 4.2.1 Handshake Mechanism

TBD

### 4.1.9 Transaction Protocol Negotiation

Participants in the transaction must have a handshake mechanism where they agree on one of the supported protocols to use to execute the transaction. The algorithm looks an intersection in the list of supported algorithms by the participants.

Participants can insist on a specific protocol by pretending that they only support said protocol only.
Protocols can be versioned as the specifications mature.
Adding new protocols must be possible as part of the plugin architecture allowing the community to propose, develop, test and release their own implementations at will.
The two initially supported protocols shall be the ones that can satisfy the requirements for Fujitsu’s and Accenture’s implementations respectively.
Means for establishing bi-directional communication channels through proxies/firewalls/NAT wherever possible

## 4.3 Plugin Architecture

Since our goal is integration, it is critical that `BIF` has the flexibility of supporting most ledgers, even those that don't exist today.

> A plugin is a self contained piece of code that implements a predefined interface pertaining to a specific functionality of `BIF` such as transaction execution.

Plugins are an abstraction layer on top of the core components that allows operators of `BIF` to swap out implementations at will.

> Backward compatibility is important, but versioning of the plugins still follows the semantic versioning convention meaning that major upgrades can have breaking changes.

Plugins are implemented as ES6 modules (source code) that can be loaded at runtime from the persistent data store. The core package is responsible for validating code signatures to guarantee source code integrity.

---

![Plugin Architecture](https://www.plantuml.com/plantuml/png/0/dLHDRzD043tZNp6O0wr4LQ3YKaLHdP90fBH4RRWXLPlrn5bblMjcn_dWrpEsK-mYIq5S8ddcpPjvRsPp4rWHbxc5kIqpuo0XlJQCcal2A7fjdBPbYZ3Wib0fNLrgd-VU3NioA-_uGkqm-1mlSxyq5a_2KiLggS9fu0OF9p41QOiqZ28sR16-7WeaYsc612FhzKQlbGYSEiQC51llO48gnvsdpG_NA_yjM5mni0SosPeXDIGfgPICijRlddApDowBmiQuGWaRVCQLAYqlSC-9DPdBqJ5e-K7ge6R68Sjyu8dNlfC8-BD4fp4Xyhl5skYDmn3WOmT2ldIfzkH4rwTEF5VxNB0gms1-8Lozxw6ToxADDeMIeOH5_951AfrAioU8awAmHZVcV1S_Or2XoNs0mS2aeiFm0VnEcW-7KZT9dkw-ZQQpyLcpyHItHkEx-Ax-4ZUgp_WyYfP-3_7OfJLjYE7Dh79qP4kCNZNDHtuPeG04UOIFfXDXAAm_L2u-rtmXF4G0sblRB2F8tFCfFDRhXtkVubauhoTF2jD41Lzqf4_Kaeo-zSvXrRhP_L_DPytbjFt_3Fseh3m1eNo-NeWRGhX7hgwfxjs4Zf6MMrJ2nR2T3AxXeLfEO5YGSa7Lac2yHrtMbrO5jegn8wOj5gPUBTTmA_VPptXywIrnlnkzqRRXKTW_J__I3a9vOEv5pGC6UJVXFrFHZJWiVsE_0G00 "Plugin Architecture")

---

### 4.3.1 Ledger Connector Plugins

Success is defined as:
1. Adding support in `BIF` for a ledger invented in the future requires no `core` code changes, but instead can be implemented by simply adding a corresponding connector plugin to deal with said newly invented ledger.
2. Client applications using the REST API and leveraging the feature checks can remain 100% functional regardless of the number and nature of deployed connector plugins in `BIF`. For example: a generic money sending application does not have to hardcode the supported ledgers it supports because the unified REST API interface (fed by the ledger connector plugins) guarantees that supported features will be operational.

Because the features of different ledgers can be very diverse, the plugin interface has feature checks built into allowing callers/client applications to **determine programmatically, at runtime** if a certain feature is supported or not on a given ledger.

```typescript
export interface LedgerConnector {
  // method to verify a signature coming from a given ledger that this connector is responsible for connecting to.
  verifySignature(message, signature): Promise<boolean>;

  // used to call methods on smart contracts or to move assets between wallets
  transact(transactions: Transaction[]);

  getPermissionScheme(): Promise<PermissionScheme>;

  getTransactionFinality(): Promise<TransactionFinality>;

  addForeignValidator(): Promise<void>;
}

export enum TransactionFinality {
  GUARANTEED = "GUARANTEED",
  NOT_GUARANTEED = "NOT_GUARANTEED
}

export enum PermissionScheme {
  PERMISSIONED = "PERMISSIONED",
  PERMISSIONLESS = "PERMISSIONLESS"
}

```

### 4.3.2 Identity Federation Plugins

Identity federation plugins operate inside the API Server and need to implement the interface of a common PassportJS Strategy:
https://github.com/jaredhanson/passport-strategy#implement-authentication

```typescript
abstract class IdentityFederationPlugin {
  constructor(options: any): IdentityFederationPlugin;
  abstract authenticate(req: ExpressRequest, options: any);
  abstract success(user, info);
  abstract fail(challenge, status);
  abstract redirect(url, status);
  abstract pass();
  abstract error(err);
}
```

#### 4.3.1.1 X.509 Certificate Plugin

The X.509 Certificate plugin facilitates clients authentication by allowing them to present a certificate instead of operating with authentication tokens.
This technically allows calling clients to assume the identities of the validator nodes through the REST API without having to have access to the signing private key of said validator node.

PassportJS already has plugins written for client certificate validation, but we go one step further with this plugin by providing the option to obtain CA certificates from the validator nodes themselves at runtime.

### 4.3.3 Storage Plugins

Storage plugins allow the higher level packages to store and retrieve configuration metadata for a `BIF` cluster such as:
* Who are the active validators and what are the hosts where said validators are accessible over a network
* What public keys belong to which validator nodes
* What transactions have been scheduled, started, completed

```typescript
interface StoragePlugin {
  async get<T>(key: string): Promise<T>;
  async set<T>(key: string, value: T): Promise<void>;
}
```

# 5. Identities, Authentication, Authorization

`BIF` aims to provide a unified API surface for managing identities of an identity owner.
Developers using the `BIF` REST API for their applications can support one or both of the below requirements:
1. Applications with a focus on access control and business process efficiency (usually in the enterprise)
2. Applications with a focus on individual privacy (usually consumer-based applications)

The following sections outline the high-level features of `BIF` that make the above vision reality.

An end user (through a user interface) can issue API requests to
* register a username+password account (with optinal 2FA) **within** `BIF`.
* associate their wallets to their `BIF` account and execute transactions involving those registered wallet (transaction signatures performed either locally or remotely as explained above).

## 5.1 Transaction Signing Modes, Key Ownership

An application developer using `BIF` can choose to enable users to sign their transactions locally on their user agent device without disclosing their private keys to `BIF` or remotely where `BIF` stores private keys server-side, encrypted at rest, made decryptable through authenticating with their `BIF` account.
Each mode comes with its own pros and cons that need to be carefully considered at design time.

### 5.1.1 Client-side Transaction Signing

Usually a better fit for consumer-based applications where end users have higher expectation of individual privacy.

**Pros**
* Keys are not compromised when a `BIF` deployment is compromised
* Operator of `BIF` deployment is not liable for breach of keys (same as above)
* Reduced server-side complexity (no need to manage keys centrally)

**Cons**
* User experience is sub-optimal compared to sever side transaction signing
* Users can lose access permanently if they lose the key (not acceptable in most enterprise/professional use cases)

---

![Client-side Transaction Signing](https://www.plantuml.com/plantuml/png/0/XLHXQnf14Fs-ls9geKt1n3JIBt8SEHkb0KD3jFqKaBtTKGVtTktiNjJI7z-vCr0j0Ry8i_FcxNjlvxoDINEgAmTV7Q5FC2MBC6FjepQ9WfU3fIU_LEeTUUDgwMQftcZB_Pu9LHLy_aPd4Nowr5kCeS9U5KfoU1PcTTAbZkU1QzoVnKJa5-IpCFABC3V4fj6d4YM7y6s_GNPebyWmTC6ipKgJXtkVSCcwpMJCki9juFMpFnkRmqM2581fkKfWYR45g8-WdGlRUKMx1XVNv3TQUE4E5xfsQOQxL3XXgHf-8p_8HwW9UKoY50AdLJXgHFnLepTOC8VjR4LcxJ56k3c2SAYzDO6zEFnoT5xfNILOlSH8ln7wrs_GFigwaA6D5b728ac94AN4TM3e59kD8tC8wOUyGGTqXBRt6R9CClAIyHx2LgxE9V5nCN_uFhoVZ2uEIsBnXGnsEmzj9L4qvRFF6Zs3_dMUVMWUF-irTTxvf7n826L8ALGG5d1C0kydJUBJzNxeQbG01vAR_qYoCeT7fXSjH78CBDujHX03vl2qhtH2NukZh5Vc2hs5vkhMm7Jqz7FqT57Iuh1qpNotCxmVmxIjszqGhGtshfWLms8wkh0kTJjt51DJMIUqC6aNhe6zndLrzIS_CJIGE4ohJRO9TsXa3jA_bLCdxjln4qq3qIEwjMFKTWzHLalkFIA0vWjK9pC76X4xW77WhMRxrfoEbnILkXLw-IVv2m00 "Client-side Transaction Signing")

---

### 5.1.2 Server-side Transaction Signing

Usually a better fit for enterprise applications where end users have most likely lowered their expectations of individual privacy due to the hard requirements of compliance, governance, internal or external policy enforcement.

**Pros**
* Frees end users from the burden of managing keys themselves (better user experience)
  * Improved compliance, governance

**Cons**
* Server-side breach can expose encrypted keys stored in the keychain

---

![Server-side Transaction Signing](https://www.plantuml.com/plantuml/png/0/XLHTQzj047pNhzYgqBhWncbCNu8GaR5D3GuDiTkdG3YTrlAXqvrxj_97w8_ldXIeN5ByOhZTsTdPsPNlF0b7JQrXXMwF3bQgG5WxORoGfApXG6cKAQFedJ9IDvnDgDc9mer7qjQrDUaRcOqrz5aSqDiQHxNDbSQBi4AGo8M_3ApmT17ZssdIA2956k7RQOTEOr7oX1DjPIMtGXbO6CBIYNREkHCr7gohdin5ApHk2CY2K-MMe50EMq3q4OJMzl1SgsF0-KgPdM1UcE96D9hMUAHCCqkDXa3o3xeUQgaC4Yi5wsXhUmcFlneq4ZFdx66zLR8ow3tSz23EDgQGrXaM_hKNhyMnPgmeqQiNXF7r6xGFV09AgfrWKSp2Jh6GAEAfhOCus-sqafr9FzZN68I7DlS5aeGzCkpn2Uo1MwVi-3nxlly-MIndWsxn1UwLn65ytxxOYl2CFxN0rUpnv-nnaAjDjp3FTCDuifZtp_79947xxVWwJJw4vIUZy4wPmrX2o2sHhS5ku8m7tY_3UbRLQQ8RZ00wbfj_M239qmUdzeAPE1ne6YO1Xu740qyTz7Iy46B9A4yZD0M4xkqOqsoTJRBLR51e6iPJvScfl24iODdUN9ZsrR6hgzyfz8svPKTasuaF2eyekGxexzL5VN1NVZRcBLl5MXhZ-QwuOwyKmYSLdPlI4h3CrxB_5KLtdEM_XJy0 "Server-side Transaction Signing")

---

## 5.2 Open ID Connect Provider, Identity Provider

`BIF` can authenticate users against *third party Identity Providers* or serve as an *Identity Provider* itself.
Everything follows the well-established industry standards of Open ID Connect to maximize information security and reduce the probability of data breaches.

## 5.3 Server-side Keychain for Web Applications

There is a gap between traditional web/mobile applications and blockchain applications (web 2.0 and 3.0 if you will) authentication protocols in the sense that blockchain networks rely on private keys belonging to a Public Key Infrastructure (PKI) to authenticate users while traditional web/mobile applications mostly rely on a centralized authority storing hashed passwords and the issuance of ephemeral tokens upon successful authentication (e.g. successful login with a password).
Traditional (Web 2.0) applications (that adhering security best practices) use server-side sessions (web) or secure keychains provided by the operating system (iOS, Android, etc.)
The current industry standard and state of the art authentication protocol in the enterprise application development industry is Open ID Connect (OIDC).

To successfully close the gap between the two worlds, `BIF` comes equipped with an OIDC identity provider and a server-side key chain that can be leveraged by end user applications to authenticate once against BIF and manage identities on other blockchains through that single BIF identity.
This feature is important for web applications which do not have secure offline storage APIs (HTML localStorage is not secure).

Example: A user can register for a BIF account, import their private keys from their Fabric/Ethereum wallets and then have access to all of those identities by authenticating once only against `BIF` which will result in a server-side session (HTTP cookie) containing a JSON Web Token (JWT).

> Native mobile applications may not need to use the server-side keychain since they usually come equipped with an OS provided one (Android, iOS does).

![Unified Identity Management](https://www.plantuml.com/plantuml/png/0/bLLDRnen4BtlhnZHGqz0eUgbGYYaJLhKjAfASaEg77i0TxrZnpOXjCf_x-ooNqeMqXwGy7ZcpRmtuzcp48MFsyp03UcLHWLpXHHrtCDNGMAD6PyIFXk4ptk7tg1QeuTpOsKgDq8Jp2dYsekeBS6b5ndkh4-NT0elUGq6Ln6Y1Q_NcmXAUvGvGduLKarEC19SQSB8MS7wkB59Sn7mReiaSUQztLrlj4m9Gu1noyNRBIbfFN6rxrhsJ3naxCkb1FqRuUsR3jZlh8cMsWcAm2ZCcWj94c6CtVtCz8EcTP8u8LD6WTxv_B9csGCHu9QPLwnVNUK4FtcnXpy9WBtznKIXz_7gkb5cL4Gf4_K89XFfiRWGPZez5Z6k8yR_6F6jZg2d4O_CJ4RheJTppcXvQELDG5_457TvOJKdksDHEJ1PvUrc0LuOXXu71xkAE-4H53fZz_aOJAUbEX_sWbWTBhtMrANhld2EVxhFXToNjR2PhMmys6fr4QcG5q3Qp5bYTEWDsMzuFnfMTG_5DcxolymGbpIP_BXONCFi-nmkI3chyueEZ5j-M5wz3AvKlv7r9BnIZMCB__6P0hezLMnuDbMTlAkUBrWZBGkcqeWGolGLI3XSToOETwOVkErig7ApgRISphwuCuk3tv7y3T2f2bBS5nDLfQ_EfvD_ARsEfAv0sechwH_1GF5W3mxliCCsxh1H4rmiii7qI7V9HjvY1Bn8qlSm2y5ApTC5_4QNL3zIteUyJ9PKjOZHkz1Wm7bQu_04FPSVwpP34nzuQRM6g4IfHFaFb9DLDVtjH6I2mtmprSWUJR4lmaOxnZvZFFuU_GK0 "Unified Identity Management")

In web 2.0 applications the prevalent authentication/authorization solution is Open ID Connect which bases authentication on passwords and tokens which are derived from the passwords.
Web 3.0 applications (decentraized apps or DApps) which interact with blockchain networks rely on private keys instead of passwords.

# 6. Terminology

**End User**: A person (private citizen or a corporate employee) who interacts with BIF and other ledger-related systems to achieve a specific goal or complete a task such as to send/receive/exchange money or data.

**Business Organization**: A for-profit or non-profit entity formed by one or more people to achieve financial gain or achieve a specific (non-financial) goal. For brevity, *business organization* may be shortened to *organization* throughout the document.

**Identity Owner**: A person or organization who is in control of one or more identities. For example, owning two separate email accounts by one person means that said person is the identity owner of two separate identities (the email accounts). Owning cryptcurrency wallets (their private keys) also makes one an identity owner.

**Identity Secret**: A private key or a password that - by design - is only ever known by the identity owner (unless stolen).

**Credentials**: Could mean user authentication credentials/identity proofs in an IT application or any other credentials in the traditional sense of the word such as a proof that a person obtained a masters or PhD.

**Ledger/Network/Chain**: Synonomous words meaning referring largely to the same thing in this paper.

**OIDC**: Open ID Connect authentication protocol

**PKI**: Public Key Infrastructure


# 7. References

1: [Heterogeneous System Architecture](https://en.wikipedia.org/wiki/Heterogeneous_System_Architecture) - Wikipedia, Retrieved at: 11th of December 2019
