<img src="./logo_hl_new.png" width="700" >

# Hyperledger Cactus<br>白皮书 <!-- omit in toc -->

## Version 0.1 (Early Draft) <!-- omit in toc -->

<img src="./pontus-wellgraf-agCzLSG4_gE-unsplash-cropped-compressed.jpg" width="700">
Photo by Pontus Wellgraf on Unsplash

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

# 贡献者 <!-- omit in toc -->

| Contributors/Reviewers         | Email                                     |
|--------------------------------|-------------------------------------------|
| Hart Montgomery                | hmontgomery@us.fujitsu.com                |
| Hugo Borne-Pons                | hugo.borne-pons@accenture.com             |
| Jonathan Hamilton              | jonathan.m.hamilton@accenture.com         |
| Mic Bowman                     | mic.bowman@intel.com                      |
| Peter Somogyvari               | peter.somogyvari@accenture.com            |
| Shingo Fujimoto                | shingo_fujimoto@fujitsu.com               |
| Takuma Takeuchi                | takeuchi.takuma@fujitsu.com               |
| Tracy Kuhrt                    | tracy.a.kuhrt@accenture.com               |
| Rafael Belchior                | rafael.belchior@tecnico.ulisboa.pt        |

# 历史版本 <!-- omit in toc -->

| Date of Revision      | Description of Changes Made                            |
|-----------------------|--------------------------------------------------------|
| February 2020         | Initial draft                                          |


<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

- [1. Abstract](#1-abstract)
- [2. Example Use Cases](#2-example-use-cases)
  - [2.1 Ethereum to Quorum Asset Transfer](#21-ethereum-to-quorum-asset-transfer)
  - [2.2 Escrowed Sale of Data for Coins](#22-escrowed-sale-of-data-for-coins)
  - [2.3 Money Exchanges](#23-money-exchanges)
  - [2.4 Stable Coin Pegged to Other Currency](#24-stable-coin-pegged-to-other-currency)
    - [2.4.1 With Permissionless Ledgers (BTC)](#241-with-permissionless-ledgers-btc)
    - [2.4.2 With Fiat Money (USD)](#242-with-fiat-money-usd)
  - [2.5 Healthcare Data Sharing with Access Control Lists](#25-healthcare-data-sharing-with-access-control-lists)
  - [2.6 Integrate Existing Food Traceability Solutions](#26-integrate-existing-food-traceability-solutions)
  - [2.7 End User Wallet Authentication/Authorization](#27-end-user-wallet-authenticationauthorization)
  - [2.8 Blockchain Migration](#28-blockchain-migration)
    - [2.8.1 Blockchain Data Migration](#281-blockchain-data-migration)
    - [2.8.2 Blockchain Smart Contract Migration](#282-blockchain-smart-contract-migration)
    - [2.8.3 Semi-Automatic Blockchain Migration](#283-semi-automatic-blockchain-migration)
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
  - [4.1 Interworking patterns](#41-interworking-patterns)
    - [4.1.1 Interworking patterns list](#411-interworking-patterns-list)
    - [4.2 Interworking architecture](#42-interworking-architecture)
  - [4.3 Technical Architecture](#43-technical-architecture)
    - [4.3.1 Monorepo Packages](#431-monorepo-packages)
      - [4.2.1.1 cmd-api-server](#4211-cmd-api-server)
        - [4.3.1.1.1 Runtime Configuration Parsing and Validation](#43111-runtime-configuration-parsing-and-validation)
        - [4.2.1.1.2 Configuration Schema - API Server](#42112-configuration-schema---api-server)
        - [4.3.1.1.4 Plugin Loading/Validation](#43114-plugin-loadingvalidation)
      - [4.2.1.2 core-api](#4212-core-api)
      - [4.2.1.4 sdk](#4214-sdk)
      - [4.2.1.5 keychain](#4215-keychain)
      - [4.3.1.7 tracing](#4317-tracing)
      - [4.3.1.8 audit](#4318-audit)
      - [4.3.1.9 document-storage](#4319-document-storage)
      - [4.3.1.10 relational-storage](#43110-relational-storage)
      - [4.3.1.11 immutable-storage](#43111-immutable-storage)
    - [4.3.2 Deployment Diagram](#432-deployment-diagram)
    - [4.3.3 Component Diagram](#433-component-diagram)
    - [4.3.4 Class Diagram](#434-class-diagram)
    - [4.3.5 Sequence Diagram - Transactions](#435-sequence-diagram---transactions)
  - [4.4 Transaction Protocol Specification](#44-transaction-protocol-specification)
    - [4.4.1 Handshake Mechanism](#441-handshake-mechanism)
    - [4.4.2 Transaction Protocol Negotiation](#442-transaction-protocol-negotiation)
  - [4.5 Plugin Architecture](#45-plugin-architecture)
    - [4.5.1 Ledger Connector Plugins](#451-ledger-connector-plugins)
    - [4.5.2 Identity Federation Plugins](#452-identity-federation-plugins)
      - [4.5.1.1 X.509 Certificate Plugin](#4511-x509-certificate-plugin)
    - [4.5.3 Key/Value Storage Plugins](#453-keyvalue-storage-plugins)
    - [4.5.4 Serverside Keychain Plugins](#454-serverside-keychain-plugins)
- [5. Identities, Authentication, Authorization](#5-identities-authentication-authorization)
  - [5.1 Transaction Signing Modes, Key Ownership](#51-transaction-signing-modes-key-ownership)
    - [5.1.1 Client-side Transaction Signing](#511-client-side-transaction-signing)
    - [5.1.2 Server-side Transaction Signing](#512-server-side-transaction-signing)
  - [5.2 Open ID Connect Provider, Identity Provider](#52-open-id-connect-provider-identity-provider)
  - [5.3 Server-side Keychain for Web Applications](#53-server-side-keychain-for-web-applications)
- [6. Terminology](#6-terminology)
- [7. References](#7-references)

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

# 1. 概述

Blockchain technologies are growing in usage, but fragmentation is a big problem that may hinder reaching critical levels of adoption in the future.

We propose a protocol and it's implementation to connect as many of them as possible in an attempt to solve the fragmentation problem by creating a heterogeneous system architecture <sup>[1](#7-references)</sup>.

区块链技术的使用正在快速增长，但是碎片化可能是未来阻碍区块链应用的一个大问题。

我们提出了一个协议，并根据一个异构系统架构<sup>[1](#7-references)</sup>进行了实现以便链接尽可能多的区块链系统，以此来解决碎片化的问题。

# 2. 使用案例

Specific use cases that we intend to support.
The core idea is to support as many use-cases as possible by enabling interoperability
between a large variety of ledgers specific to certain mainstream or exotic use cases.

我们的目的是支持特定使用场景。核心思想是通过多种账本的互操作性支持尽可能多的使用场景，特别是一些主流或者其他的用例。

## 2.1 Ethereum to Quorum Asset Transfer

## 2.1 Ethereum 到 Quorum 的资产转移

| Use Case Attribute Name    | Use Case Attribute Value                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Use Case Title             | Ethereum to Quorum Escrowed Asset Transfer                                                                                                                                                                                                                                                                                                                                                                                                                |
| Use Case                   | 1. `User A` owns some assets on a Ethereum ledger<br>2. `User A` asks `Exchanger` to exchange specified amount of assets on Ethereum ledger, and receives exchanged asset at the Quorum ledger.
| Interworking patterns      | Value transfer                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Type of Social Interaction | Escrowed Asset Transfer                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Narrative                  | A person (`User A`) has multiple accounts on different ledgers (Ethereum, Quorum) and he wishes to send some assets from Ethereum ledger to a Quorum ledger with considering conversion rate. The sent asset on Ethereum will be received by Exchanger only when he successfully received converted asset on Quorum ledger. |
| Actors                     | 1. `User A`: The person or entity who has ownership of the assets asscociated with its accounts on ledger.                                                                                                                                                                                                                                                                                                                                                                    |
| Goals of Actors            | `User A` loses ownership of sent assets on Ethereum, but he will get ownnership of exchanged asset value on Quorum.                                                                                                                                                                                                                                                                                                                                                                                   |
| Success Scenario           | Transfer succeeds without issues. Asset is available on both Ethereum and Quorum ledgers.                                                                                                                                                                                                                                                                                                                                                        |
| Success Criteria           | Transfer asset on Quorum was successed.                                                                                                                                                                                                                                                                                                                                                |
| Failure Criteria           | Transfer asset on Quorum was failed.                                                                                                                                                                                                                                                                                                                                                                                                       |
| Prerequisites              | 1. Ledgers are provisioned<br>2. `User A` and `Exchanger` identities established on both ledgers<br>3. `Exchanger` authorized business logic plugin to operate the account on Quorum ledger.<br>4.`User A` has access to Hyperledger Cactus deployment                                                                                                                                                                                                                                                                                                               |
| Comments                   |                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>
<img src="./use-case-ethereum-to-quorum-asset-transfer.png" width="700">

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

## 2.2 Escrowed Sale of Data for Coins

## 2.2 数据托管出售


| W3C Use Case Attribute Name | W3C Use Case Attribute Value |
|-----------------------------|------------------------------------------------|
| Use Case Title 用例名          | Escrowed Sale of Data for Coins |
| Use Case                    | 1. `User A` initiates (proposes) an escrowed transaction with `User B`<br>2. `User A` places funds, `User B` places the data to a digital escrow service.<br>3. They both observe each other's input to the escrow service and decide to proceed.<br>4. Escrow service releases the funds and the data to the parties in the exchange. |
| Type of Social Interaction  | Peer to Peer Exchange |
| Narrative                   | Data in this context is any series of bits stored on a computer:<br> * Machine learning model<br> * ad-tech database<br> * digital/digitized art<br> * proprietary source code or binaries of software<br> * etc.<br><br>`User A` and B trade the data and the funds through a Hyperledger Cactus transaction in an atomic swap with escrow securing both parties from fraud or unintended failures.<br>Through the transaction protocol's handshake mechanism, A and B can agree (in advance) upon<br><br>* The delivery addresses (which ledger, which wallet)<br>* the provider of escrow that they both trust<br>* the price and currency<br><br>Establishing trust (e.g. Is that art original or is that machine learning model has the advertised accuracy) can be facilitated through the participating DLTs if they support it. Note that `User A` has no way of knowing the quality of the dataset, they entirely rely on `User B`'s description of its quality (there are solutions to this problem, but it's not within the scope of our use case to discuss these). |
| Actors                      | 1. `User A`: A person or business organization with the intent to purchase data.<br>2. `User B`: A person or business entity with data to sell. |
| Goals of Actors             | `User A` wants to have access to data for an arbitrary reason such as having a business process that can enhanced by it.<br> `User B`: Is looking to generate income/profits from data they have obtained/created/etc. |
| Success Scenario            | Both parties have signaled to proceed with escrow and the swap happened as specified in advance. |
| Success Criteria            | `User A` has access to the data, `User B` has been provided with the funds. |
| Failure Criteria            | Either party did not hold up their end of the exchange/trace. |
| Prerequisites               | `User A` has the funds to make the purchase<br>`User B` has the data that `User A` wishes to purchase.<br>`User A` and B can agree on a suitable currency to denominate the deal in and there is also consensus on the provider of escrow. |
| Comments                    | Hyperledger Private Data: https://hyperledger-fabric.readthedocs.io/en/release-1.4/private_data_tutorial.html <br> Besu Privacy Groups: https://besu.hyperledger.org/en/stable/Concepts/Privacy/Privacy-Groups/ |

<br>
<img width="700" src="https://www.plantuml.com/plantuml/png/0/jPF1Qi9048Rl-nI3nu07FNee6cseq8FKzYR899dOnNKtdTreVVlEnb1ZeI257ZF_jpCVEvkf3yYXEHXOqqT3jY1OQDmn7c08ZxvWTw8IrcW8N0KB30YLOvWxRRrIVgzjZH6UiP2Pis4TpiBgW4ONIWKTvElfN1CRAdV4a1fNx8jtr1QMDf1C2jfPoAG9dHplD_Ol8bW4-NZpnDiPe0ViLz9OoPNAtIUaoqoH5Qqp36QhvQ25Qosr4YI_G8FdrjKFL2bpSlG46UQiY-qbY8VAqJLCoJVzQ7njXqrmegAF64JSIW663t7Y15RiQYUdNncjZup4JA5Xsozr61gOCqcJijzYhNUtS73TNK7MsD8hY5p4ox7GqQgjNpaXkfdTkNwtkRELveFCl8TH-JrUSNCzhL6drIxqNwnkDr1LgXlTYYR92ncAEwpQUq5HYMjDaerD4l5XAaWVjTs1lFEWoL-I-AvWrkAfCBwcE87CEKc--qz-61rgGt5_NPx_bgkfN8ZyaLy0">
<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

## 2.3 Money Exchanges 货币兑换

Enabling the trading of fiat and virtual currencies in any permutation of possible pairs.

使法定货币和虚拟货币能够以任何可能的组合进行交易。

> On the technical level, this use case is the same as the one above and therefore the specific details were omitted.

> 在技术层面，该用例和上边的用例是一样的，但是我们省略了一些细节。

## 2.4 Stable Coin Pegged to Other Currency 稳定币和其他货币的铆钉


| W3C Use Case Attribute Name | W3C Use Case Attribute Value |
|-----------------------------|------------------------------------------------|
| Use Case Title              | Stable Coin Pegged to Other Currency |
| Use Case                    | 1. `User A` creates their own ledger<br>2. `User A` deploys Hyperledger Cactus in an environment set up by them.<br>3. `User A` implements necessary plugins for Hyperledger Cactus to interface with their ledger for transactions, token minting and burning.|
| Type of Social Interaction  | Software Implementation Project |
| Narrative                   | Someone launches a highly scalable ledger with their own coin called ExampleCoin that can consistently sustain throughput levels of a million transactions per second reliably, but they struggle with adoption because nobody wants to buy into their coin fearing that it will lose its value. They choose to put in place a two-way peg with Bitcoin which guarantees to holders of their coin that it can always be redeemed for a fixed number of Bitcoins/USDs. |
| Actors                      | `User A`: Owner and/or operator of a ledger and currency that they wish to stabilize (peg) to other currencies |
| Goals of Actors             | 1. Achieve credibility for their currency by backing funds.<br>2. Implement necessary software with minimal boilerplate code (most of which should be provided by Hyperldger Cactus) |
| Success Scenario            | `User A` stood up a Hyperledger Cactus deployment with their self-authored plugins and it is possible for end user application development to start by leveraging the Hyperledger Cactus REST APIs which now expose the functionalities provided by the plugin authored by ``User A`` |
| Success Criteria            | Success scenario was achieved without significant extra development effort apart from creating the Hyperledger Cactus plugins. |
| Failure Criteria            | Implementation complexity was high enough that it would've been easier to write something from scratch without the framework |
| Prerequisites               | * Operational ledger and currency<br>*Technical knowledge for plugin implementation (software engineering) |
| Comments                    | |

> Sequence diagram omitted as use case does not pertain to end users of Hyperledger Cactus itself.

### 2.4.1 With Permissionless Ledgers (BTC) 和非授权区块链（BTC）

A BTC holder can exchange their BTC for ExampleCoins by sending their BTC to `ExampleCoin Reserve Wallet` and the equivalent amount of coins get minted for them
onto their ExampleCoin wallet on the other network.

An ExampleCoin holder can redeem their funds to BTC by receiving a Proof of Burn on the ExampleCoin ledger and getting sent the matching amount of BTC from the `ExampleCoin Reserve Wallet` to their BTC wallet.

<img width="700" src="https://www.plantuml.com/plantuml/png/0/XP9FIyH03CNlyoc2dhmiui6JY5ln7tWG4KJmaft6TkWqgJFfrbNyxgPBLzP5yLQQlFpoNkOiAoRjsmWNRzXsaSubCDnHLL49Ab04zVR7EGqQ2QvN7QL8PKK9YYY-yJLQ_mqhLGar2CDbmfO6ISqp_pCoDu4xj7R8zDeJUvgd9CD37Np3b3CSRRKawRdqajZ8HuTRXHRVMcl6Yd9u9pW-_6NkdNaCFdJ82ZR6B0Gcvrx6LM7lGHH_-h_X9R5AMkq1Pb3o0VPlGrNhLS8LV3W0bjAKyuCViaUCaJIlHUI7RmqHhqMVxdC7EcMn2rpynOiHHEin_4cuZKHPR9XF5ACC4tIZBWvsZmptb2ajAKzpfisxzCVkewcJsMnskcbQrnsB4jZfBTN6pG6vX08iUZDed2N6dc117ljChe2GOO7URbI1MPdAyW9po09Hk79Z15OPrZj1BT4kDieGDFLPxHbPM45NCqU66kdEdTcdFUCl">

### 2.4.2 With Fiat Money (USD) 和法定货币

Very similar idea as with pegging against BTC, but the BTC wallet used for reserves
gets replaced by a traditional bank account holding USD.

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

## 2.5 Healthcare Data Sharing with Access Control Lists  带有访问控制的健康数据共享

| W3C Use Case Attribute Name | W3C Use Case Attribute Value |
|-----------------------------|------------------------------------------------|
| Use Case Title              | Healthcare Data Sharing with Access Control Lists |
| Use Case                    | 1. `User A` (patient) engages in business with `User B` (healthcare provider)<br>2. `User B` requests permission to have read access to digitally stored medical history of `User A` and write access to log new entries in said medical history.<br>3.`User A` receives a prompt to grant access and allows it.<br>4. `User B` is granted permission through ledger specific access control/privacy features to the data of `User A`. |
| Type of Social Interaction  | Peer to Peer Data Sharing |
| Narrative                   | Let's say that two healthcare providers have both implemented their own blockchain based patient data management systems and are looking to integrate with each other to provide patients with a seamless experience when being directed from one to another for certain treatments. The user is in control over their data on both platforms separately and with a Hyperledger Cactus backed integration they could also define fine grained access control lists consenting to the two healthcare providers to access each other's data that they collected about the patient. |
| Actors                      | * `User A`: Patient engaging in business with a healthcare provider<br>* `User B`: Healthcare provider offering services to `User A`. Some of said services depend on having access to prior medical history of `User A`. |
| Goals of Actors             | * `User A`: Wants to have fine grained access control in place when it comes to sharing their data to ensure that it does not end up in the hands of hackers or on a grey data market place.<br>`User B` |
| Success Scenario            | `User B` (healthcare provider) has access to exactly as much information as they need to and nothing more. |
| Success Criteria            | There's cryptographic proof for the integrity of the data. Data hasn't been compromised during the sharing process, e.g. other actors did not gain unauthorized access to the data by accident or through malicious actions. |
| Failure Criteria            | `User B` (healthcare provider) either does not have access to the required data or they have access to data that they are not supposed to. |
| Prerequisites               | `User A` and `User B` are registered on a ledger or two separate ledgers that support the concept of individual data ownership, access controls and sharing. |
| Comments                    | It makes most sense for best privacy if `User A` and `User B` are both present with an identity on the same permissioned, privacy-enabled ledger rather than on two separate ones. This gives `User A` an additional layer of security since they can know that their data is still only stored on one ledger instead of two (albeit both being privacy-enabled)|

<img width="700" src="https://www.plantuml.com/plantuml/png/0/hLHDRzf04BtxLupefJtaa1mjX69IaQ16AYfgUeaK3Ui1Zx1ttTd1b7_VMK1WL9NcqAFtVSsyNVa-AefkcXhcz7D3tX5yPbm9Dd03JuIrLWx53b4HvXKA-nLiMIiedACOuI5ubL33CqUDMHRNx5jCya8aR2U6pdLN4x1YpIxBbDM-ddOjIKtbYWJ6TN1hLo5xc7eborOE7YPcGjiWwrV_VqP3fq7WUoHvAm0Z80o7hMMHrz6eZuuJkZ2qEeUq4ZekIOoPBS8l64ydyE57nKhp9gmfCnFM7GoAsNImDs_vTFPYcvTezX_ZfptO6LI2sHoy1i_x8kBWmj4KkC18CC65i7ixa9Ayl3s3OugRFdHtjiQD1jkAErI2u2qBRaPfi1o-fKAZ7gexj9LbaB0z9OUPXAPLM5ebVGw0a6x4mwEWLvYHD1mZ9_EJkhpBuP4KYXX9N_r5YsbiQ_1aSuMJ32yMM2xF6LqEBoIyt5rFSSBA3krjyygZ9LA4_MKO1j2TwXYwK0V9LqBaHxQw8qeKggtWddJgkx-BXSfHiGYYIUZBFyRlLsJZFmYbuwlZ7rFAs_VI-wqU9ILy_VAUI_WdFJkoUy_Xy0gigkpUDhP_o6y0">
<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

## 2.6 Integrate Existing Food Traceability Solutions 整合现有的食物溯源解决方案 

| W3C Use Case Attribute Name | W3C Use Case Attribute Value |
|-----------------------------|------------------------------|
| Use Case Title              | Food Traceability Integration |
| Use Case                    | 1. `Consumer` is evaluating a food item in a physical retail store.<br> 2. `Consumer` queries the designated end user application designed to provide food traces. 3. `Consumer` makes purchasing decision based on food trace.|
| Type of Social Interaction  | Software Implementation Project |
| Narrative                   | Both `Organization A` and `Organization B` have separate products/services for solving the problem of verifying the source of food products sold by retailers.<br>A retailer has purchased the food traceability solution from `Organization A` while a food manufacturer (whom the retailer is a customer of) has purchased their food traceability solution from `Organization B`.<br>The retailer wants to provide end to end food traceability to their customers, but this is not possible since the chain of traceability breaks down at the manufacturer who uses a different service or solution. `Cactus` is used as an architectural component to build an integration for the retailer which ensures that consumers have access to food tracing data regardless of the originating system for it being the product/service of `Organization A` or `Organization B`. |
| Actors                      | `Organization A`, `Organization B` entities whose business has to do with food somewhere along the global chain from growing/manufacturing to the consumer retail shelves.<br> `Consumer`: Private citizen who makes food purchases in a consumer retail goods store and wishes to trace the food end to end before purchasing decisions are finalized. |
| Goals of Actors             | `Organization A`, `Organization B`: Provide `Consumer` with a way to trace food items back to the source.<br>`Consumer`: Consume food that's been ethically sourced, treated and transported. |
| Success Scenario            | `Consumer` satisfaction increases on account of the ability to verify food origins. |
| Success Criteria            | `Consumer` is able to verify food items' origins before making a purchasing decision. |
| Failure Criteria            | `Consumer` is unable to verify food items' origins partially or completely. |
| Prerequisites               | 1. `Organization A` and `Organization B` are both signed up for blockchain enabled software services that provide end to end food traceability solutions on their own but require all participants in the chain to use a single solution in order to work.<br>2. Both solutions of `Organization A` and `B` have terms and conditions such that it is possible technically and legally to integrate the software with each other and `Cactus`. |
| Comments                    | |

<img width="700" src="https://www.plantuml.com/plantuml/png/0/rPRBRjim44Nt_8g1ksaNIM4jWzY8dS1eW0PDcqSt0G9A6jc4QL8bgQJkrtT8oefVifnTkxDy3uSpbyF7XNNSk6eXuGv_LQWoX2l1fuOlu0GcMkTmRtY6F1LIk2LSAuSaEg4LOtOkLCazEZ96lqwqSdTkAH64ur9aZ3dXwElBiaGZCP-YWR7KsJoRSQ7MGy64Wk2hDlCdzVuqUEQqWGUBvda4t0A7y_DCArijq0o7w_BOood9saov4lnFd7q4P49HRBANdirss773ibJ_Xb5PKgLH-l1p9XmoLCwds9iOyWDLtlE1YlgZKSSycw_4DFucBGSA6YEFhoVR4KUtru7dfMZ-UoIdSqvPVxIVWlYo6QRtDHXlUwjW1FEKMmokFaVrkUz7vltzOXB4v2qkhvmcfyGBTmX-1GO3-86PDZbSKG0O36XkE1asLPzvd_pmi9A1YJo3Xl5yRSGX75QGvyc8monun9Dvlmiqw2gZTjHw54Ri2AWJwGHOzezvb_n7tb4htg2PubidIgrBkDLI2ZNzV6_4b7ewpBPjnlSApH9YqqEVRNNF7dKzcpeHEWRMa0wWAuU4RQt27lNW50dh13PpQ9heKY_AojKkNecYs5FMNgsbmsw4jUH_7EDqgyl7uFNqg__WeQHZQxr_TfJt5faSA38vj95QyjvPo6FmpMAIrZBVb712-tOFso1Sc77Tlr7N2sN3Tk2RXqjigK25VPDtd2u7-BPkRe7txAvMigwubhQtlwqffMan9HQk_XuvS3DXeTH2-Py8_dxpDrRKGvocMJWbde2TwKgkfaqHw3L2zvoawpO05CHWeGskIb1BYaUtOE6b1MHSqQXQf8UC4PHlkWotEIsmJfr_-X1Q8ncre4HAk_2vkB1a9XPrMYFUK5yPEyw8Bg9BZmt2pu3UK5ARiwb1LCCRFaTuHIb1A2f_WVcJsW3Aoj2pBdHpZfcmz23Q8lox8fmzeLGTM_AKCNP15T83z2y0">

---

<img width="700" src="https://www.plantuml.com/plantuml/png/0/fLNHQjj047pNLopk1xIqzCKa9b6eKqCBflPB8I-dqvvyzUbMtJlLLKh-lIl5IjHOTXC20e6OdPsTcrjTXAWurgM3EL4EQrPQPTRPsC32HonOHKi-IQAD3k5pKo4xp0jaI1tfhTuewuT8cBCgSKUylV6d6SFM-ae96WB-hD5hl6IctNfZzTPZ2F1-066gVQw9lJJ-EFXUgj-bO5M1mTuYV7WtGhkK0QssbV8HX4K6i1vb8geW4cGK8vMGMqPzBqpfI0oJRnYLTTBlgWw2G9w02i0wIKmx8aokg1JE1Yvl_DaPSQ6ylUrccyqwg5RmveijDl6QLGD_4W1FkTGTsB8YLtVUTKo1JDmfnZsBYQ7d-OxEqQvZkalk3dIantHaBzMHZkl8Jkle-7hNZcXXV9KMoB5or9JeuzjGPq6phGRiRY3ocX7zNcFVPPXJ8sVyoUTj1DhNKm4lw6eDHZHnttUrRL9NuxWxNvMlZUIhvgCEcV9LgNc6Gsh4eKUTgoP4B1-kghYqpzSHlS7gSS5FYAIYPLYivLxoBwlxN8LW3pGCrioHhXittlJ_I-aWs9ar_-Pw8AU4y_DPTv4xiwQmh5dO0yA9uqZa5DeoKqxbgnIWX4tGXgbTM8y9w87j1Nq-VzgNYVE3WaExOSdqGvPQmhh3xtCwxMWnt8iYjeNr8McFiGLjt1JIshfSSZsWagVTbsGWNSoJv09zBl-Clm00">

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

## 2.7 End User Wallet Authentication/Authorization 终端用户钱包身份验证及授权

| W3C Use Case Attribute Name | W3C Use Case Attribute Value |
|-----------------------------|------------------------------|
| Use Case Title              | Wallet Authentication/Authorization |
| Use Case                    | 1. `User A` has separate identities on different permissioned and permissionless ledgers in the form of private/public key pairs (Public Key Infrastructure).<br>2. `User A` wishes to access/manage these identities through a single API or user interface and opts to on-board the identities to a `Cactus` deployment.<br>3. `User A` performs the on-boarding of identities and is now able to interact with wallets attached to said identities through `Cactus` or end user applications that leverage `Cactus` under the hood (e.g. either by directly issuing API requests or using an application that does so.|
| Type of Social Interaction  | Identity Management |
| Narrative                   | End user facing applications can provide a seamless experience connecting multiple permissioned (or permissionless) networks for an end user who has a set of different identity proofs for wallets on different ledgers. |
| Actors                      | `User A`: The person or entity whose identities get consolidated within a single `Cactus` deployment |
| Goals of Actors             | `User A`: Convenient way to manage an array of distinct identities with the trade-off that a `Cactus` deployment must be trusted with the private keys of the identities involved (an educated decision on the user's part). |
| Success Scenario            | `User A` is able to interact with their wallets without having to access each private key individually. |
| Success Criteria            | `User A`'s credentials are safely stored in the `Cactus` keychain component where it is the least likely that they will be compromised (note that it is never impossible, but least unlikely, definitely) |
| Failure Criteria            | `User A` is unable to import identities to `Cactus` for a number of different reasons such as key format incompatibilities. |
| Prerequisites               | 1. `User A` has to have the identities on the various ledgers set up prior to importing them and must have access to the private |
| Comments                    |  |

<img width="700" src="https://www.plantuml.com/plantuml/png/0/nLLBRzf04BxlhnZHIul48Jb68GeeGKLKAYgakI15Ypt1AzkpxkuOulxwZjVc4PH4z7rSpyottsDMllQi7PTv1ZFyLY9523T6hvpEeGUt5CETHmVtEikGOL1oWiGcqcmiXQDrvdiuAULJGuMk9mVEsSt84i-uoX0Cwyn4Ih5XENsi2dGPnYl17MOsIgD46u8nCSgr0NWa8BYnBbtGRxFI4LiN-Xy6e3rekBn4YdkbVBcwKcffds0u7i6x-yGmgXg8A-WCfkDEQ2_CxjjNaH5hWNllFuJYMibHBxL7w4om2a928PMP60IwmUzy2d9zPtlBRgmfV2Qif-Apuy9yOqFXV8-dIxQYoQmr8uZ0-anblaIdLByFNt1bF8iv6yD94DRlon3qhcef5_jwS70GHROaLWwvT0H3r4w-pcsA5D36UM4TmtGoFe9f2ztkJa2t2obMXJPEGTrJjwONC1ExyEM-1KcmhYeOOz0C3ZtBQ4jbQoVS5N6jzCOIRccsbqyQcARqEZVny2Hkp_h-B3TnSkuqUSbD8ckpzKUMtZvXL0hQjbEsTq7I_SmxHLPQd5abhBhT9aDXRIchW538ieL2sChAIlqmJ-bwT3O72RzGvw1bd-hjs9WiWwMitrAU9bjbSdcTtbAjQt-1sh4M5c4NQnvxCzUdqfSHW7Nh_mWvIlQu2vgwPgt5FR2FxQCD8wsx1mq7KF7PYTSlI1vJe-gXLdM0V32tnOhLszMtQZ-HQzYx_vwhiFYrN1lwh-OgvR-QQxZ-7-PwBIR9t_87">

---

<img width="700" src="https://www.plantuml.com/plantuml/png/0/fPPBRnen483l-oj6oRMYXQIN24KXXBIeBqHegqgvp7fd5ul5Tcrl2Qduxntl0sW2IMWlI1xFVFFmp2mNpgFrnJo7Nk6dfBmKwALMhygpjlA-F4AgBOp8pgLpVAG4-bEKoaMHbpudUByqP7DACh9mcMin4-4QXifJPYl2jSKvBRITtQf_T9LJwi5hi3ARUaYa9H4CeiZDf3B8V73qio0bg6UjNaocKimKEGUTBHMh2vK8RHM7-dPBFiUxEUjYHaxU4voysO4TSQsaa0QL1wPmob9H5AKXDJWQg0I-EiRsZCdhv8u07L01loC059vJE-fsPHAozqlG2uxY_BnKaffLb4uOD6pkHrRh5DgtgjiTt_JW0x48PMDXpCoquNY4ENsJEYS_vc85Hwjzf4uW3VfNkrcTWrWdWJL2v_XDauPI7my2dGRGb-5L7oPwHgf68VU43-VTh5MqBdjVp_b1bj0B76qpL7KdrII1SFmnjCmxYylIl0hZ-JxjTfrE_G8jGK8cryiv1rvJOvdMs1-KvtfHWXlqU70pWTve610BYhb_x2yfQ6DgYUVEo7LWn7bMW5NvwtL6F2Es5ZRSp-H3P5MgwouoUP59jO7Bf9AeIXjtU6dyF0HV7WAE3m2N4GlDfkKGF2IlR_ulyaCTF9N1gkcpkit-oiHixwTgxzM-r9vk-uuvDp2qWJk-MHI1X4d2pU1gwmKL-BYjTeLn-KmOyPDXT9uD8zuJXjJGQfrlzV0PZCDsTBoQBIg7vKvsaTAUWCU9D-ICRTcFuoEBBCmr3nJxvmRdcqstXMtWolLFAAPyPHlm53rS3gzPz8iizo6vrs7LC19phR8WbnXuW8OnnafaxzLJExwDAGq--U1jmG6gh7PkceLUogeA1WF-oj0TYO8fsrcTyLMx1OCxeor_WT0Z2pejc0ITbCTLwChXIGi-eU9l2MoUACXFMq1Uj2BYqeSAHLkxe5lNTSyil5mrtgNwS2cyGAVax9lCOABmZ6lnk4pH4mDNsiLxxA8BBWp_6Va3">

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

## 2.8 Blockchain Migration 区块链整合


| Use Case Attribute Name    | Use Case Attribute Value                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Use Case Title 用例标题            | Blockchain Migration                                                                                                                                                                                                                                                                                                                                                                                                               |
| Use Case                   | 1. `Consortium A` operates a set of services/use cases on a source blockchain.<br>2. `Consortium A` decides to use another blockchain infrastructure to support their use case. <br>3. `Consortium A` migrates the existing assets to another blockchain.
| Interworking patterns      | Value transfer                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Type of Social Interaction | Asset Transfer                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Narrative                  | A group of stakeholders (`Consortium A`) operating a source blockchain (e.g., a Hyperledger Fabric instance) would like to migrate the functionality to a target blockchain (e.g., Hyperledger Besu), in order to expand their reach. However, such migration requires lots of resources and technical effort. The `Blockchain Migration feature` from Hyperledger Cactus can provide support for doing so, by connecting to the source and target blockchains, and performing the migration task.
| Actors                     | 1. Stakeholders composing the `Consortium A`: The group of entities operating the source blockchain, who collectively aim at performing a migration to a target blockchain.                                                                                                                                                                                                                                                                                                                                                                    |
| Goals of Actors            | `Consortium A` wishes to be able to operate their use case on the target blockchain. The service is functional after the migration.                                                                                                                                                                                                                                                                                                                                                                                   |
| Success Scenario           | The consortium agrees on the migration, and it succeeds without issues.                                                                                                                                                                                                                                                                                                                                                        |
| Success Criteria           | Assets have been migrated. An identical history for those assets has been reconstructed on the target blockchain.                                                                                                                                                                                                                                                                                                                                                |
| Failure Criteria           | 1. It was not migrate the assets. <br> It was not possible to reconstruct the asset history on the target blockchain.                                                                                                                                                                                                                                                                                                                                                                                                          |
| Prerequisites              | 1. All stakeholders belonging to `Consortium A` want to migrate the blockchain. <br> 2. The `Consortium A` ontrols the source blockchain. <br>2. `Consortium A` has write and execute permissions on the target blockchain<br>
| Comments                   | An asset is defined as data or smart contracts originating from the source blockchain. <br> This use case relates to use cases implying asset portability (e.g., 2.1) <br> This use case provides blockchain portability, thus reducing costs and fostering blockchain adoption.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

---
Motivation: The suitability of a blockchain solution regarding a use case depends on the underlying blockchain properties.
            As blockchain technologies are maturing at a fast pace, in particular private blockchains, its properties might change. Consequently, this creates an unbalance between user expectations' and the applicability of the solution.
            It is, therefore, desirable for an organization to be able to replace the blockchain providing the infrastructure to a certain service.
          
Currently, when a consortium wants to migrate their blockchain (e.g., the source blockchain became obsolete, cryptographic algorithms no longer secure, etc), the solution is to re-implement business logic using a different platform, yielding great effort. Migrating data to another blockchain currently is not feasible in practice. 
This is one of the reasons mass adoption amongst enterprises grows slowly.
Data migrations have been performed by (Frauenthaler et al., 2019) and (Scheid et al., 2019), both recent endeavors to render flexibility to blockchain-based solutions.
In those works, the authors propose simple data migration capabilities for public, permissionless blockchains, in which a user can specify requirements for its blockchain. The developed solutions allow "switchovers," where a blockchain is migrated, in case there is a blockchain that better satisfies the current requirements.
Nonetheless, arguably a more interesting approach would be to consider cross-smart contract execution functionality or another automatic way of migration.

References: <br>
E Scheid and Burkhard Rodrigues, B Stiller. 2019. Toward a policy-based blockchain agnostic framework. 16th IFIP/IEEE International Symposium on Integrated Network Management (IM 2019) (2019)
Philipp Frauenthaler, Michael Borkowski, and Stefan Schulte. 2019. A Framework for Blockchain Interoperability and Runtime Selection.

### 2.8.1 Blockchain Data Migration 区块链数据整合
Data migration corresponds to capture the set or subset of data assets (information, in the form of bytes) on a source blockchain, and construct a representation of those in a target blockchain. Note that the models underlying both blockchains do not need to be the same (e.g., world state model in Hyperledger Fabric vs account model in Ethereum).
To migrate data, it should be possible to capture the necessary information from the source blockchain and to write it on the target blockchain. The history of information should also be migrated (i.e., the updates over the elements considered information).

### 2.8.2 Blockchain Smart Contract Migration 区块链智能合约整合
The task of migrating a smart contract comprises the task of migrating data. In specific, the information should be accessible and writeable on another blockchain. Additionally, the target blockchain's virtual machine should support the computational complexity of the source blockchain (e.g., one cannot migrate all Ethereum smart contracts to Bitcoin, but the other way around is feasible).

Automatic smart contract migration yields risks for enterprise blockchain systems, and thus the solution is non-trivial.

### 2.8.3 Semi-Automatic Blockchain Migration 半自动区块链整合

By expressing my preferences in terms of functional and non-functional requirements, Hyperledger Cactus can recommend a set of suitable blockchains, as the target of the migration.
Firstly, I could know in real-time the characteristics of the target blockchain that would influence my decision.
For instance, the platform can analyze see the cost of writing information to Ethereum, the exchange rate US dollar - Ether, the average time to mine a block, the transaction throughput, and the network hash rate ((Frauenthaler et al., 2019).
Based on that, the framework proposes a migration, with indicators such as predicted cost, predicted time to complete migration and the likelihood of success.
As Ethereum does not show a desirable throughput, I choose Polkadot's platform. As it yields higher throughput, I then safely migrate my solution from Fabric to Polkadot, without compromising the solution in production. 
 This feature is more useful regarding public blockchains.


<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>


# 3. 软件设计

## 3.1. 原则

### 3.1.1. 广泛的支持

连接尽可能多的经济系统，而没有技术限制

### 3.1.2. 尽可能的插件化架构

身份、DLT、服务发现。最小化固执己见，我们拥抱互操作性而不是孤立和锁定。密切关注社区反馈和 PR 以确定 Hyperledger Cactus 核心代码可以提取为插件的功能。限制限定以便添加未来的使用案例和协议。

### 3.1.3. 尽可能避免双花

同一时间内相同资产不能存在的两种形式，除非有明确的标识，比如[截止10月30号限定在特定 DLT 组合中；例如：不适用于 Fabric + Bitcoin]。

### 3.1.4 特性的包容性

每个 DLT 都包含一些和其他 DLT 部分或完全不同过的特性。Hyperledger Cactus 应该设计一种通过 Hyperledger Cactus 和 DLT 交互时使用这些特性的方式。该原则的一个最佳实践示例是 Kubernetes CRD 以及操作员允许社区以可重用方式扩展 Kubernetes 核心 API。

### 3.1.5 低影响

互操作性不是重定义生态系统而是适应它们。治理、信任模型和工作流依旧保留在每个生态系统中。信任模型和一致性必须是协议握手的强制性部分，这样任何可能的不兼容性都会以透明的方式预先显示出来，并且双方都可以“各走各的”，而不会意外地丢失资产或数据。该灵感来自于传统在线交易支付流程 API，它允许商人在交易结束前指定可接受的保障级别（例如，需要锁定、签名的收据等）。按照相同的逻辑，我们应该允许交易参与者指定他们需要的共识、交易最终性的顺序。共识需求必须支持谓词，例如“我在 Fabric 上，但是会接受 Bitcoin 确认 X 个区块后的交易。”还可以添加要求 KYC（了解您的客户）合规性的内容，以帮助尽可能多地促进采用。

### 3.1.6 透明性

跨生态交易参与者会意识到该转移带来的本地和全局的影响。所有参与者会在有限拒绝和错误是及时沟通。这种透明性应该像可信的证据一样可见。

### 3.1.7 自动化的工作流

每个生态系统中的逻辑构成了具有复杂的互操作性的用例。跨生态系统的转移可以在响应前一个转移时自动触发。自动化程序，无论错误恢复或者异常处理，都应该无中断地执行。

### 3.1.8 默认最高的安全性

支持最少的安全选项，并且严格的限制进入，不允许退出。

### 3.1.9 交易协议协商 

交易的参与者必须有一个握手机制，这样他们可以一致同意执行交易使用的支持的协议。该算法在参与者支持的算法列表中找到交叉点。

### 3.1.10 避免任何区块链网络上数字资产总量的变动的可能

我们相信增加或减少苏子资产的总量将会减弱区块链的安全性，因为增加和减少资产是复杂的。相反，中间的实体（例如，交换者）可以公用和/或发送传输。

### 3.1.11 提供通用操作的抽象

我们的公共模块化应该扩展到在区块链上操作和/或发现交易的通用机制。

### 3.1.12 整合身份框架（Moonshot）

不限制身份框架，要允许`Cactus`的用户使用最常用的身份框架并且支持未来通过插件化的架构对扩展身份框架的支持列表。支持`Cactus`的用户实现身份验证、授权和读写证书。

原生支持或考虑的身份框架：

* [Hyperledger Indy (Sovrin)](https://www.hyperledger.org/projects/hyperledger-indy)
* [DIF](https://identity.foundation/)
* [DID](https://www.w3.org/TR/did-core/)

## 3.2 特性需求

### 3.2.1 新协议的整合

增加新的协议必须成为插件架构的一部分，以便社区可以提议、开发、测试和发布他们实现的协议。

### 3.2.2 代理/防火墙/NAT 能力

意思是尽可能通过代理/防火墙/NAT 建立双向通信通道。

### 3.2.3 双向通信层

尽可能通过代理/防火墙/NAT使用一个区块链不可知的双向通信通道来控制和监控区块链上的交易。

   * 区块链的 P2P 通信协议不同。最好构建一个模块的方法来发送、接收区块链中值得信任的实体之间的通用交易。

### 3.2.4 联盟管理

联盟可以由合作和实体组成（人，组织等），他们都希望贡献硬件或者网络资源来操作一个`Cactus`集群（验证者集合，API服务器等）。

在最初的成员（一个或多个）集合构建哇按成一个联盟之后，它也要能够增加或移除新的或退出的成员。

`Cactus`不规定任何增加或者移除联盟成员的共识算法，而是专注于技术层面使它可以在独立实体的所有权下操作节点集群，而不用增加或移除成员的时候停机。

一个新加入联盟的成员不需要参与`Cactus`的所有组件：运行一个验证者节点就可以了，etcd、API 服务器可以保持新成员加入之前的状态。

## 3.3 工作策略

1. 参与者可以假装只支持他们所提出的协议，从而坚持特定的协议。
2. 随着规范的成熟，可以对协议进行版本控制。
3. 最初支持的两个协议应分别满足富士通和埃森哲实现的要求。

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

# 4. Architecture  架构

## 4.1 Integration patterns 整合模式

Hyperledger Cactus has several integration patterns as the following.

Hyperledger Cactus 有如下多种整合模式。

- Note: In the following description, **Value (V)** means numerical assets (e.g. money). **Data (D)** means non-numerical assets (e.g. ownership proof). Ledger 1 is source ledger, Ledger 2 is destination ledger.
- 注意：在下边的描述中，**Value(V)**的意思是数字资产（例如，钱）。**Data(D)**的意思是非数字资产（例如，所有权证明）。账本1是原账本，账本2是目标账本。

| No. | Name                | Pattern | Consistency                                                                                    |
| --- | ------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| 1.  | value transfer      | V -> V  | check if V1 = V2 <br> (as V1 is value on ledger 1, V2 is value on ledger 2)                    |
| 2.  | value-data transfer | V -> D  | check if data transfer is successful when value is transferred                                 |
| 3.  | data-value transfer | D -> V  | check if value transfer is successful when data is transferred                                 |
| 4.  | data transfer       | D -> D  | check if all D1 is copied on ledger 2 <br> (as D1 is data on ledger 1, D2 is data on ledger 2) |
| 5.  | data merge          | D <-> D | check if D1 = D2 as a result <br> (as D1 is data on ledger 1, D2 is data on ledger 2)          |

## 4.2 System architecture and basic flow 系统架构和基本流程

Hyperledger Cactus will provide integrated service(s) by executing ledger operations across multiple blockchain ledgers. The execution of operations are controlled by the module of Hyperledger Cactus which will be provided by vendors as the single Hyperledger Cactus Business Logic plugin.
The supported blockchain platforms by Hyperledger Cactus can be added by implementing new Hyperledger Cactus Ledger plugin.
Once an API call to Hyperledger Cactus framework is requested by a User, Business Logic plugin determines which ledger operations should be executed, and it ensures reliability on the issued integrated service is completed as expected.
Following diagram shows the architecture of Hyperledger Cactus based on the discussion made at Hyperledger Cactus project calls.
The overall architecture is as the following figure.

Hyperledger Cactus 将通过跨多区块链账本执行账本的操作提供整合服务。操作的执行由 Hyperledger Cactus 的模块控制，该模块将以单个 Hyperledger Cactus 业务逻辑插件的方式提供。Hyperledger Cactus 支持的区块链平台可以通过实现新的 Hyperledger Cactus 账本插件来加入。当用户通过 API 调用 Hyperledger Cactus 框架的时候，业务逻辑插件决定由哪个账本执行操作，它确保发布的集成服务的可靠性符合预期。下边的图片展示了在 Hyperledger Cactus 项目会议上讨论 Hyperledger Cactus 的架构。整体架构如下图。

<img src="./architecture-with-plugin-and-routing.png" width="700">

Each entity is as follows:
- **Application user**: The entity submits API calls to "Cactus Routing Interface". 
- **Business Logic Plugin**: The entity executes business logic and provide integration services that are connected with multiple blockchains. The entity is composed by web application or smart contract on a blockchain. The entity is a single plugin and required for executing Hyperledger Cactus applications.
- **Ledger Plugin**: The entity communicates Business Logic Plugin with each ledger.  The entity is composed by a validator and a verifier as follows. The entity(s) is(are) chosen from multiple plugins on configuration.
- **Validator**: The entity monitors transaction records of Ledger operation, and it determines the result(success, failed, timeouted) from the transaction records. 
Validator ensure the determined result with attaching digital signature with "Validator key" which can be verified by "Verifier".
- **Verifier**: The entity accepts only sucussfully verified operation results by verifying the digital signature of the validator. Note that "Validator" is apart from "Verifier" over a bi-directional channel.
- **Cactus Routing Interface**: The entity is a routing service between "Business Logic Plugin" and  "Ledger Plugin(s)". The entity is also a routing service between Business Logic Plugin and API calls from "Application user(s)".
- **Ledger-n**: DLT platforms(e.g. Ethereum, Quorum, Hyperledger Fabric, ...)

The execution steps are described as follows:
- **Step 1**: "Application user(s)" submits an API call to "Cactus routing interface".  
- **Step 2**: The API call is internally routed to "Business Logic Plugin" by "Cactus Routing Interface" for initiating associated business logic. 
Then, "Business Logic Plugin" determines required ledger operation(s) to complete or abort a business logic. 
- **Step 3**" "Business Logic Plugin" submits API calls to request operations on "Ledger(s)" wrapped with "Ledger Plugin(s)". Each API call will be routed to designated "Ledger Plugin" by "Routing Interface". 
- **Step 4**: "Ledger Plugin" sends an event notification to "Business Logic Plugin" via "Cactus Routing Interface", when its sub-component "Verifier" detect an event regarding requested ledger operation to "Ledger".
- **Step 5**: "Business Logic Plugin" receives a message from "Ledger Plugin" and determines completion or continuous of the business logic. When the business logic requires to continuous operations go to "Step 3" ,or end the process.

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

## 4.3 Technical Architecture 技术架构

### 4.3.1 Monorepo Packages  Monorepo包

Hyperledger Cactus is divided into a set of npm packages that can be compiled separately or all at once.

All packages have a prefix of `cactus-*` to avoid potential naming conflicts with npm modules published by other Hyperledger projects. For example if both Cactus and Aries were to publish a package named `common` under the shared `@hyperledger` npm scope then the resulting fully qualified package name would end up being (without the prefix) as `@hyperledger/common` but with prefixes the conflict can be resolved as `@hyperledger/cactus-common` and `@hyperledger/aries-common`. Aries is just as an example here, we do not know if they plan on releasing packages under such names, but it also does not matter for the demonstration of ours.

Naming conventions for packages:
* cmd-* for packages that ship their own executable
* sdk-* for packages designed to be used directly by application developers except for the Javacript SDK which is named just `sdk` for simplicity.
* All other packages should be named preferably as a single English word suggesting the most important feature/responsibility of the package itself.

#### 4.2.1.1 cmd-api-server

A command line application for running the API server that provides a unified REST based HTTP API for calling code.
Contains the kernel of Hyperledger Cactus.
Code that is strongly opinionated lives here, the rest is pushed to other packages that implement plugins or define their interfaces.
Comes with Swagger API definitions, plugin loading built-in.

> By design this is stateless and horizontally scalable.

**The main responsibilities of this package are: 改包的主要职责：**

##### 4.3.1.1.1 Runtime Configuration Parsing and Validation 运行时配置解析和验证

The core package is responsible for parsing runtime configuration from the usual sources (shown in order of precedence):
* Explicit instructions via code (`config.setHttpPort(3000);`)
* Command line arguments (`--http-port=3000`)
* Operating system environment variables (`HTTP_PORT=3000`)
* Static configuration files (config.json: `{ "httpPort": 3000 }`)

The Apache 2.0 licensed node-convict library to be leveraged for the mechanical parts of the configuration parsing and validation: https://github.com/mozilla/node-convict

##### 4.2.1.1.2 Configuration Schema - API Server 配置模式 - API 服务器

To obtain the latest configuration options you can check out the latest source code of Cactus and then run this from the root folder of the project on a machine that has at least NodeJS 10 or newer installed:

```sh
$ date
Mon 18 May 2020 05:09:58 PM PDT

$ npx ts-node -e "import {ConfigService} from './packages/cactus-cmd-api-server/src/main/typescript/config/config-service'; console.log(ConfigService.getHelpText());"

Order of precedent for parameters in descdending order: CLI, Environment variables, Configuration file.
Passing "help" as the first argument prints this message and also dumps the effective configuration.

Configuration Parameters
========================

  plugins:
                Description: A collection of plugins to load at runtime.
                Default:
                Env: PLUGINS
                CLI: --plugins
  configFile:
                Description: The path to a config file that holds the configuration itself which will be parsed and validated.
                Default: Mandatory parameter without a default value.
                Env: CONFIG_FILE
                CLI: --config-file
  cactusNodeId:
                Description: Identifier of this particular Cactus node. Must be unique among the total set of Cactus nodes running in any given Cactus deployment. Can be any string of characters such as a UUID or an Int64
                Default: Mandatory parameter without a default value.
                Env: CACTUS_NODE_ID
                CLI: --cactus-node-id
  logLevel:
                Description: The level at which loggers should be configured. Supported values include the following: error, warn, info, debug, trace
                Default: warn
                Env: LOG_LEVEL
                CLI: --log-level
  cockpitHost:
                Description: The host to bind the Cockpit webserver to. Secure default is: 127.0.0.1. Use 0.0.0.0 to bind for any host.
                Default: 127.0.0.1
                Env: COCKPIT_HOST
                CLI: --cockpit-host
  cockpitPort:
                Description: The HTTP port to bind the Cockpit webserver to.
                Default: 3000
                Env: COCKPIT_PORT
                CLI: --cockpit-port
  cockpitWwwRoot:
                Description: The file-system path pointing to the static files of web application served as the cockpit by the API server.
                Default: packages/cactus-cmd-api-server/node_modules/@hyperledger/cactus-cockpit/www/
                Env: COCKPIT_WWW_ROOT
                CLI: --cockpit-www-root
  apiHost:
                Description: The host to bind the API to. Secure default is: 127.0.0.1. Use 0.0.0.0 to bind for any host.
                Default: 127.0.0.1
                Env: API_HOST
                CLI: --api-host
  apiPort:
                Description: The HTTP port to bind the API server endpoints to.
                Default: 4000
                Env: API_PORT
                CLI: --api-port
  apiCorsDomainCsv:
                Description: The Comma seperated list of domains to allow Cross Origin Resource Sharing from when serving API requests. The wildcard (*) character is supported to allow CORS for any and all domains, however using it is not recommended unless you are developing or demonstrating something with Cactus.
                Default: Mandatory parameter without a default value.
                Env: API_CORS_DOMAIN_CSV
                CLI: --api-cors-domain-csv
  publicKey:
                Description: Public key of this Cactus node (the API server)
                Default: Mandatory parameter without a default value.
                Env: PUBLIC_KEY
                CLI: --public-key
  privateKey:
                Description: Private key of this Cactus node (the API server)
                Default: Mandatory parameter without a default value.
                Env: PRIVATE_KEY
                CLI: --private-key
  keychainSuffixPrivateKey:
                Description: The key under which to store/retrieve the private key from the keychain of this Cactus node (API server)The complete lookup key is constructed from the ${CACTUS_NODE_ID}${KEYCHAIN_SUFFIX_PRIVATE_KEY} template.
                Default: CACTUS_NODE_PRIVATE_KEY
                Env: KEYCHAIN_SUFFIX_PRIVATE_KEY
                CLI: --keychain-suffix-private-key
  keychainSuffixPublicKey:
                Description: The key under which to store/retrieve the public key from the keychain of this Cactus node (API server)The complete lookup key is constructed from the ${CACTUS_NODE_ID}${KEYCHAIN_SUFFIX_PRIVATE_KEY} template.
                Default: CACTUS_NODE_PUBLIC_KEY
                Env: KEYCHAIN_SUFFIX_PUBLIC_KEY
                CLI: --keychain-suffix-public-key


```

##### 4.3.1.1.4 Plugin Loading/Validation 插件加载/验证

Plugin loading happens through NodeJS's built-in module loader and the validation is performed by the Node Package Manager tool (npm) which verifies the byte level integrity of all installed modules.

#### 4.2.1.2 core-api

Contains interface definitions for the plugin architecture and other system level components that are to be shared among many other packages.
`core-api` is intended to be a leaf package meaning that it shouldn't depend on other packages in order to make it safe for any and all packages to depend on `core-api` without having to deal with circular dependency issues.

#### 4.2.1.4 sdk

Javascript SDK (bindings) for the RESTful HTTP API provided by `cmd-api-server`.
Compatible with both NodeJS and Web Browser (HTML 5 DOM + ES6) environments.


#### 4.2.1.5 keychain 主链

Responsible for persistently storing highly sensitive data (e.g. private keys) in an encrypted format.

For further details on the API surface, see the relevant section under `Plugin Architecture`.


#### 4.3.1.7 tracing 追溯

Contains components for tracing, logging and application performance management (APM) of code written for the rest of the Hyperledger Cactus packages.


#### 4.3.1.8 audit 审核

Components useful for writing and reading audit records that must be archived longer term and immutable.
The latter properties are what differentiates audit logs from tracing/logging messages which are designed to be ephemeral and to support technical issues not regulatory/compliance/governance related issues.


#### 4.3.1.9 document-storage 文档存储

Provides structured or unstructured document storage and analytics capabilities for other packages such as `audit` and `tracing`.
Comes with its own API surface that serves as an adapter for different storage backends via plugins.
By default, `Open Distro for ElasticSearch` is used as the storage backend: https://aws.amazon.com/blogs/aws/new-open-distro-for-elasticsearch/

<img width="700" src="https://www.plantuml.com/plantuml/png/0/ZLLHRzem47xthxZHXsrIWQ5gRmWL1jsgLHegQ4-L9cDVWaLYPxPJngR-zrsSX990QP5uyDtd-xwxyrskdUVMvsa2KoFo5BM7XJUMnmXJp1Ap2wQfuh7bAMDU-GJXsov3cw2CqS8aCM8ZrbnfkDKU2UQLqN13SDmQktdGRmhy7jn6wOpJ0UwKHayKOAnV6_RiSFWxHormRAtPBjTAR3Gw1rS746joBOMncgHzFh2d_4zAMA9twY_2rQSJOUTK2ILKnaaOHQ4KIGXxfxH8Seamz7d6fRtg2vEcHezEU2AZVPTlqPaK-v9xlk8EHun5HJMWyrgjEZ0SEXFvBRS8Sb-bqGWkxbIyzbzsNCC_nW0oBZP5AJlP9kwAL7PvfheExIFQ3d07P2Oh6KjRTV-hHIm20FqeYSpeeWUTFk7wZuE-adHKVjVdKdQ5nN3aoOCU3kzdYoMCvxSmqp8pgj0KU0Zv3CJAzr9yMJs4hYiVGbzfQeS_5xz470H-Eig-LbtdNP_FvtnReHPK7oMmq20IxbpDMxbTwJv9lC5Tw6LDN9_F4t-lK2yGrq5QnDx4wDVKo39UGuUtN52TQXdLyOIAXew9YfQ4HDjMi5AH3uvm9x2t27akbQ_fmk4DPEC2TsVY-2HZY984RqLR_XkyxVTJIwZjbVcLneSNLLN_v-2eyS5TLVznqBxz8qCzLSvRCrlCapnMkXt044861Bei848gJ_ibSBGE9vGZtNbv-2cgTAlc3W3GXZPF40Ib8eWCbNP6McYBBP1RiIuLoGZTlYXyLzNaPlnhEbwE9-F5x8DS3IuxdSjwOrrkryhZHxYuDpkUJ98SwnoqyGWhuxr9mKH7rIeckDeukKF7wi45QgqIZ6uqUeW508gOZ3Kd7NfvrXiTnM-TeIVDLXFkHD6FJNiq5PEnavjh3pdO8wor2munzRIorjX2xm0KtlPPH3MoZErdhv7_Njr1FvepyogSNPELllB_0G00">

> The API surface provided by this package is kept intentionally simple and feature-poor so that different underlying storage backends remain an option long term through the plugin architecture of `Cactus`.

#### 4.3.1.10 relational-storage 相关存储

Contains components responsible for providing access to standard SQL compliant persistent storage.

> The API surface provided by this package is kept intentionally simple and feature-poor so that different underlying storage backends remain an option long term through the plugin architecture of `Cactus`.

#### 4.3.1.11 immutable-storage 不可篡改存储

Contains components responsible for providing access to immutable storage such as a distributed ledger with append-only semantics such as a blockchain network (e.g. Hyperledger Fabric).

> The API surface provided by this package is kept intentionally simple and feature-poor so that different underlying storage backends remain an option long term through the plugin architecture of `Cactus`.

### 4.3.2 Deployment Diagram 部署图

Source file: `./docs/architecture/deployment-diagram.puml`

<img width="700" src="https://www.plantuml.com/plantuml/png/0/ZLNHRjem57tFLzpnqasYJF3SeYQ43ZGAQ6LxgXGvpWKi73jo73eqzTzt7GA4aj4X8N1yphat9ySt3xbbnXQfX10pgNSfAWkXO2l3KXXD81W_UfxtIIWkYmJXBcKMZM3oAzTfgbNVku651f5csbYmQuGyCy8YB8L4sEa2mjdqPW4ACG6h8PEC8p3832x5xq-DmYXbjjOA-qsxacLMPn5V6vrYhFMc4PKmosAMauHdXQLEBc_kHOrs6Hg9oGeD15Bp3LypeM2iB1B02gtWaO3ugis6F5Yw_ywFg2R6SeZ5Ce4_dWTWa5kcLbIkzMorOIk4kT5RaQ1fEMIUTGa8z7doez1V-87_FFpypR1T6xhjKYXkdrJQq0eOtmYrWf3k1vmcjhvK4c-U-vvN_SMae5lN1gQQ_1Z88hTLxQtY5R4HFz4iWO19flY18EDZfN_pkftEjDAlq6V0WLQALjgyA0Wd2-XMs2YHjXln8-NjOsglHkrTK9lSyETZU4QpfSTRTu9b8c_meeQ-DCDnp3L7QkoZ9NkIEdjUnEHI5mcqvaKi1I_JPXJQaa6_X7uxPAqrJYXZmWhCosrnN9QQjV8BmrJEk7LPgKWxy4kI5QpgW3atOQYIw6UE9lBTBXRi4CZ1S3APZsRJMYAFH_4ybKyw5kMPsWf-FP2DVGLLNt5pNy6-h_ZGryIVBsRpQ33wCNiQ1hFPzrD_-s5mtbo8-SPDYC3eLv9xrzx9sr3areYui3IO9kKGs9jCyRfgxod6reNuse6c_IJklclleYof_Q-5ftFWQlS-hDtxi7RlqX_FZQcxJgVJtnyLpusEvZKX2UzIUtT_Vz-l1RHsqHbQMxefvtcKExYzxPyIHbVYyih-cPBi0wg4taj_0G00">

### 4.3.3 Component Diagram 组件图

<img width="700" src="https://www.plantuml.com/plantuml/png/0/ZLN1Rjim3BthAmXVrWQhiVGO546pPaK7x32i1NOPCCWownYH9LTKbdX9_tsKx2JsihRBIT9xV7mYAUUQl7H-LMaXVEarmesjQclGU9YNid2o-c7kcXgTnhn01n-rLKkraAM1pyOZ4tnf3Tmo4TVMBONWqD8taDnOGsXeHJDTM5VwHPM0951I5x0L02Cm73C1ZniVjzv9Gr85lTlIICqg4yYirIYDU1P2PiGKvI6PVtc8MhdsFQcue5LTM-SnFqrF4vWv9vkhKsZQnbPS2WPZbWFxld_Q4jTIQpmoliTj2sMXFWSaLciQpE-hmjP_ph7MjgduQ7-BlBl6Yg9nDNGtWLF7VSqsVzHQTq8opnqITTNjSGUtYI6aNeefkS7kKIg4v1CfPzTVdVrLvkXY7DOSDsJTU-jaWGCQdT8OzrPPVITDJWkvn6_uj49gxVZDWXm-HKzIAQozp3GEyn_gEpoUlfs7wb39NYAAYGWrAXwQeTu4XliWhxGaWkJXEAkTM7lB3evzZq2S1yO2ACAysekBsF49N5t9ed1OI8_JQOS-CxpRnaSYte6n7eE86VC6O0OyFOoP_PJ36Ao3oZfc7QOyRRdcU1H3CZo-3SWQaAQ9HBEgCdxNzX7EVgEpu2rKZ9s7N54BJHwDyFACBRwFviuXJOCj4OVtUSUN-jlpvT5pR-B3YFFiRBXskc7_1vClsmwFudyTzpAzPVwoCpzYxwH2ErJuz54PcieDEO3hLx3OtbTmgaz1qSv4CavWjqjJk-LbceuI7YB-26_ONBf_1SCjXMto8KqvahN3YgEm5litq-cC_W7oK8uX_aBM0K5SSvNu7-0F">

### 4.3.4 Class Diagram 类图

### 4.3.5 Sequence Diagram - Transactions 顺序图——交易

TBD

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

## 4.4 Transaction Protocol Specification 交易协议说明

### 4.4.1 Handshake Mechanism 握手机制

TBD

### 4.4.2 Transaction Protocol Negotiation 交易协议协商

Participants in the transaction must have a handshake mechanism where they agree on one of the supported protocols to use to execute the transaction. The algorithm looks an intersection in the list of supported algorithms by the participants.

Participants can insist on a specific protocol by pretending that they only support said protocol only.
Protocols can be versioned as the specifications mature.
Adding new protocols must be possible as part of the plugin architecture allowing the community to propose, develop, test and release their own implementations at will.
The two initially supported protocols shall be the ones that can satisfy the requirements for Fujitsu’s and Accenture’s implementations respectively.
Means for establishing bi-directional communication channels through proxies/firewalls/NAT wherever possible

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

## 4.5 Plugin Architecture 插件架构

Since our goal is integration, it is critical that `Cactus` has the flexibility of supporting most ledgers, even those that don't exist today.

> A plugin is a self contained piece of code that implements a predefined interface pertaining to a specific functionality of `Cactus` such as transaction execution.

Plugins are an abstraction layer on top of the core components that allows operators of `Cactus` to swap out implementations at will.

> Backward compatibility is important, but versioning of the plugins still follows the semantic versioning convention meaning that major upgrades can have breaking changes.

Plugins are implemented as ES6 modules (source code) that can be loaded at runtime from the persistent data store. The core package is responsible for validating code signatures to guarantee source code integrity.

An overarching theme for all aspects that are covered by the plugin architecture is that there should be a dummy implementation for each aspect to allow the simplest possible deployments to happen on a single, consumer grade machine rather than requiring costly hardware and specialized knowledge.

> Ideally, a fully testable/operational (but not production ready) `Cactus` deployment could be spun up on a developer laptop with a single command (an npm script for example).

---

<img src="https://www.plantuml.com/plantuml/png/0/dLHDRzD043tZNp6O0wr4LQ3YKaLHdP90fBH4RRWXLPlrn5bblMjcn_dWrpEsK-mYIq5S8ddcpPjvRsPp4rWHbxc5kIqpuo0XlJQCcal2A7fjdBPbYZ3Wib0fNLrgd-VU3NioA-_uGkqm-1mlSxyq5a_2KiLggS9fu0OF9p41QOiqZ28sR16-7WeaYsc612FhzKQlbGYSEiQC51llO48gnvsdpG_NA_yjM5mni0SosPeXDIGfgPICijRlddApDowBmiQuGWaRVCQLAYqlSC-9DPdBqJ5e-K7ge6R68Sjyu8dNlfC8-BD4fp4Xyhl5skYDmn3WOmT2ldIfzkH4rwTEF5VxNB0gms1-8Lozxw6ToxADDeMIeOH5_951AfrAioU8awAmHZVcV1S_Or2XoNs0mS2aeiFm0VnEcW-7KZT9dkw-ZQQpyLcpyHItHkEx-Ax-4ZUgp_WyYfP-3_7OfJLjYE7Dh79qP4kCNZNDHtuPeG04UOIFfXDXAAm_L2u-rtmXF4G0sblRB2F8tFCfFDRhXtkVubauhoTF2jD41Lzqf4_Kaeo-zSvXrRhP_L_DPytbjFt_3Fseh3m1eNo-NeWRGhX7hgwfxjs4Zf6MMrJ2nR2T3AxXeLfEO5YGSa7Lac2yHrtMbrO5jegn8wOj5gPUBTTmA_VPptXywIrnlnkzqRRXKTW_J__I3a9vOEv5pGC6UJVXFrFHZJWiVsE_0G00" width="700" >

---

### 4.5.1 Ledger Connector Plugins 账本链接器插件

Success is defined as:
1. Adding support in `Cactus` for a ledger invented in the future requires no `core` code changes, but instead can be implemented by simply adding a corresponding connector plugin to deal with said newly invented ledger.
2. Client applications using the REST API and leveraging the feature checks can remain 100% functional regardless of the number and nature of deployed connector plugins in `Cactus`. For example: a generic money sending application does not have to hardcode the supported ledgers it supports because the unified REST API interface (fed by the ledger connector plugins) guarantees that supported features will be operational.

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

### 4.5.2 Identity Federation Plugins 身份联盟插件

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

#### 4.5.1.1 X.509 Certificate Plugin X.509证书插件

The X.509 Certificate plugin facilitates clients authentication by allowing them to present a certificate instead of operating with authentication tokens.
This technically allows calling clients to assume the identities of the validator nodes through the REST API without having to have access to the signing private key of said validator node.

PassportJS already has plugins written for client certificate validation, but we go one step further with this plugin by providing the option to obtain CA certificates from the validator nodes themselves at runtime.

### 4.5.3 Key/Value Storage Plugins Key/Value 存储插件

Key/Value Storage plugins allow the higher-level packages to store and retrieve configuration metadata for a `Cactus` cluster such as:
* Who are the active validators and what are the hosts where said validators are accessible over a network?
* What public keys belong to which validator nodes?
* What transactions have been scheduled, started, completed?

```typescript
interface KeyValueStoragePlugin {
  async get<T>(key: string): Promise<T>;
  async set<T>(key: string, value: T): Promise<void>;
  async delete<T>(key: string): Promise<void>;
}
```

### 4.5.4 Serverside Keychain Plugins 服务端主链插件

The API surface of keychain plugins is roughly the equivalent of the key/value *Storage* plugins, but under the hood these are of course guaranteed to encrypt the stored data at rest by way of leveraging storage backends purpose built for storing and managing secrets.

Possible storage backends include self hosted software [1] and cloud native services [2][3][4] as well. The goal of the keychain plugins (and the plugin architecture at large) is to make `Cactus` deployable in different environments with different backing services such as an on-premise data center or a cloud provider who sells their own secret management services/APIs.
There should be a dummy implementation as well that stores secrets in-memory and unencrypted (strictly for development purposes of course). The latter will decrease the barrier to entry for new users and would be contributors alike.

Direct support for HSM (Hardware Security Modules) is also something the keychain plugins could enable, but this is lower priority since any serious storage backend with secret management in mind will have built-in support for dealing with HSMs transparently.

By design, the keychain plugin can only be used by authenticated users with an active `Cactus` session. Users secrets are isolated from each other on the keychain via namespacing that is internal to the keychain plugin implementations (e.g. users cannot query other users namespaces whatsoever).

```typescript
interface KeychainPlugin extends KeyValueStoragePlugin {
}
```

[1] https://www.vaultproject.io/
[2] https://aws.amazon.com/secrets-manager/
[3] https://aws.amazon.com/kms/
[4] https://azure.microsoft.com/en-us/services/key-vault/

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

# 5. Identities, Authentication, Authorization 身份、认证、授权

`Cactus` aims to provide a unified API surface for managing identities of an identity owner.
Developers using the `Cactus` REST API for their applications can support one or both of the below requirements:
1. Applications with a focus on access control and business process efficiency (usually in the enterprise)
2. Applications with a focus on individual privacy (usually consumer-based applications)

The following sections outline the high-level features of `Cactus` that make the above vision reality.

An end user (through a user interface) can issue API requests to
* register a username+password account (with optional MFA) **within** `Cactus`.
* associate their wallets to their `Cactus` account and execute transactions involving those registered wallet (transaction signatures performed either locally or remotely as explained above).

## 5.1 Transaction Signing Modes, Key Ownership 交易签名模式、键所有权

An application developer using `Cactus` can choose to enable users to sign their transactions locally on their user agent device without disclosing their private keys to `Cactus` or remotely where `Cactus` stores private keys server-side, encrypted at rest, made decryptable through authenticating with their `Cactus` account.
Each mode comes with its own pros and cons that need to be carefully considered at design time.

### 5.1.1 Client-side Transaction Signing 客户端交易签名

Usually a better fit for consumer-based applications where end users have higher expectation of individual privacy.

**Pros**
* Keys are not compromised when a `Cactus` deployment is compromised
* Operator of `Cactus` deployment is not liable for breach of keys (same as above)
* Reduced server-side complexity (no need to manage keys centrally)

**Cons**
* User experience is sub-optimal compared to sever side transaction signing
* Users can lose access permanently if they lose the key (not acceptable in most enterprise/professional use cases)

---

<img src="https://www.plantuml.com/plantuml/png/0/XLHXQnf14Fs-ls9geKt1n3JIBt8SEHkb0KD3jFqKaBtTKGVtTktiNjJI7z-vCr0j0Ry8i_FcxNjlvxoDINEgAmTV7Q5FC2MBC6FjepQ9WfU3fIU_LEeTUUDgwMQftcZB_Pu9LHLy_aPd4Nowr5kCeS9U5KfoU1PcTTAbZkU1QzoVnKJa5-IpCFABC3V4fj6d4YM7y6s_GNPebyWmTC6ipKgJXtkVSCcwpMJCki9juFMpFnkRmqM2581fkKfWYR45g8-WdGlRUKMx1XVNv3TQUE4E5xfsQOQxL3XXgHf-8p_8HwW9UKoY50AdLJXgHFnLepTOC8VjR4LcxJ56k3c2SAYzDO6zEFnoT5xfNILOlSH8ln7wrs_GFigwaA6D5b728ac94AN4TM3e59kD8tC8wOUyGGTqXBRt6R9CClAIyHx2LgxE9V5nCN_uFhoVZ2uEIsBnXGnsEmzj9L4qvRFF6Zs3_dMUVMWUF-irTTxvf7n826L8ALGG5d1C0kydJUBJzNxeQbG01vAR_qYoCeT7fXSjH78CBDujHX03vl2qhtH2NukZh5Vc2hs5vkhMm7Jqz7FqT57Iuh1qpNotCxmVmxIjszqGhGtshfWLms8wkh0kTJjt51DJMIUqC6aNhe6zndLrzIS_CJIGE4ohJRO9TsXa3jA_bLCdxjln4qq3qIEwjMFKTWzHLalkFIA0vWjK9pC76X4xW77WhMRxrfoEbnILkXLw-IVv2m00" width="700" >

---

### 5.1.2 Server-side Transaction Signing 服务端交易签名

Usually a better fit for enterprise applications where end users have most likely lowered their expectations of individual privacy due to the hard requirements of compliance, governance, internal or external policy enforcement.

**Pros**
* Frees end users from the burden of managing keys themselves (better user experience)
  * Improved compliance, governance

**Cons**
* Server-side breach can expose encrypted keys stored in the keychain

---

<img src="https://www.plantuml.com/plantuml/png/0/XLHTQzj047pNhzYgqBhWncbCNu8GaR5D3GuDiTkdG3YTrlAXqvrxj_97w8_ldXIeN5ByOhZTsTdPsPNlF0b7JQrXXMwF3bQgG5WxORoGfApXG6cKAQFedJ9IDvnDgDc9mer7qjQrDUaRcOqrz5aSqDiQHxNDbSQBi4AGo8M_3ApmT17ZssdIA2956k7RQOTEOr7oX1DjPIMtGXbO6CBIYNREkHCr7gohdin5ApHk2CY2K-MMe50EMq3q4OJMzl1SgsF0-KgPdM1UcE96D9hMUAHCCqkDXa3o3xeUQgaC4Yi5wsXhUmcFlneq4ZFdx66zLR8ow3tSz23EDgQGrXaM_hKNhyMnPgmeqQiNXF7r6xGFV09AgfrWKSp2Jh6GAEAfhOCus-sqafr9FzZN68I7DlS5aeGzCkpn2Uo1MwVi-3nxlly-MIndWsxn1UwLn65ytxxOYl2CFxN0rUpnv-nnaAjDjp3FTCDuifZtp_79947xxVWwJJw4vIUZy4wPmrX2o2sHhS5ku8m7tY_3UbRLQQ8RZ00wbfj_M239qmUdzeAPE1ne6YO1Xu740qyTz7Iy46B9A4yZD0M4xkqOqsoTJRBLR51e6iPJvScfl24iODdUN9ZsrR6hgzyfz8svPKTasuaF2eyekGxexzL5VN1NVZRcBLl5MXhZ-QwuOwyKmYSLdPlI4h3CrxB_5KLtdEM_XJy0" width="700" >

---

## 5.2 Open ID Connect Provider, Identity Provider Open ID 链接提供者、身份提供者

`Cactus` can authenticate users against *third party Identity Providers* or serve as an *Identity Provider* itself.
Everything follows the well-established industry standards of Open ID Connect to maximize information security and reduce the probability of data breaches.

## 5.3 Server-side Keychain for Web Applications Web应用的服务端主链

There is a gap between traditional web/mobile applications and blockchain applications (web 2.0 and 3.0 if you will) authentication protocols in the sense that blockchain networks rely on private keys belonging to a Public Key Infrastructure (PKI) to authenticate users while traditional web/mobile applications mostly rely on a centralized authority storing hashed passwords and the issuance of ephemeral tokens upon successful authentication (e.g. successful login with a password).
Traditional (Web 2.0) applications (that adhering security best practices) use server-side sessions (web) or secure keychains provided by the operating system (iOS, Android, etc.)
The current industry standard and state of the art authentication protocol in the enterprise application development industry is Open ID Connect (OIDC).

To successfully close the gap between the two worlds, `Cactus` comes equipped with an OIDC identity provider and a server-side key chain that can be leveraged by end user applications to authenticate once against Hyperledger Cactus and manage identities on other blockchains through that single Hyperledger Cactus identity.
This feature is important for web applications which do not have secure offline storage APIs (HTML localStorage is not secure).

Example: A user can register for a Hyperledger Cactus account, import their private keys from their Fabric/Ethereum wallets and then have access to all of those identities by authenticating once only against `Cactus` which will result in a server-side session (HTTP cookie) containing a JSON Web Token (JWT).

> Native mobile applications may not need to use the server-side keychain since they usually come equipped with an OS provided one (Android, iOS does).

<img width="700" src="https://www.plantuml.com/plantuml/png/0/bLLDRnen4BtlhnZHGqz0eUgbGYYaJLhKjAfASaEg77i0TxrZnpOXjCf_x-ooNqeMqXwGy7ZcpRmtuzcp48MFsyp03UcLHWLpXHHrtCDNGMAD6PyIFXk4ptk7tg1QeuTpOsKgDq8Jp2dYsekeBS6b5ndkh4-NT0elUGq6Ln6Y1Q_NcmXAUvGvGduLKarEC19SQSB8MS7wkB59Sn7mReiaSUQztLrlj4m9Gu1noyNRBIbfFN6rxrhsJ3naxCkb1FqRuUsR3jZlh8cMsWcAm2ZCcWj94c6CtVtCz8EcTP8u8LD6WTxv_B9csGCHu9QPLwnVNUK4FtcnXpy9WBtznKIXz_7gkb5cL4Gf4_K89XFfiRWGPZez5Z6k8yR_6F6jZg2d4O_CJ4RheJTppcXvQELDG5_457TvOJKdksDHEJ1PvUrc0LuOXXu71xkAE-4H53fZz_aOJAUbEX_sWbWTBhtMrANhld2EVxhFXToNjR2PhMmys6fr4QcG5q3Qp5bYTEWDsMzuFnfMTG_5DcxolymGbpIP_BXONCFi-nmkI3chyueEZ5j-M5wz3AvKlv7r9BnIZMCB__6P0hezLMnuDbMTlAkUBrWZBGkcqeWGolGLI3XSToOETwOVkErig7ApgRISphwuCuk3tv7y3T2f2bBS5nDLfQ_EfvD_ARsEfAv0sechwH_1GF5W3mxliCCsxh1H4rmiii7qI7V9HjvY1Bn8qlSm2y5ApTC5_4QNL3zIteUyJ9PKjOZHkz1Wm7bQu_04FPSVwpP34nzuQRM6g4IfHFaFb9DLDVtjH6I2mtmprSWUJR4lmaOxnZvZFFuU_GK0" >

In web 2.0 applications the prevalent authentication/authorization solution is Open ID Connect which bases authentication on passwords and tokens which are derived from the passwords.
Web 3.0 applications (decentralized apps or *DApps*) which interact with blockchain networks rely on private keys instead of passwords.

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

# 6. Terminology 术语 

**Application user**: The user who requests an API call to a Hyperledger Cactus application or smart contract. The API call triggers the sending of the transaction to the remote ledger.

**应用用户**：向 Hyperledger Cactus 应用或智能合约请求 API 调用的用户。API 调用触发向远程账本发送交易。 

**Hyperledger Cactus Web application or Smart contract on a blockchain**: The entity executes business logic and provide integration services that include multiple blockchains.

**Hyperledger Cactus Web 应用或区块链上的智能合约**：执行商业逻辑并提供多个区块链整合服务的实体。

**Tx verifier**: The entity verifies the signature of the transaction data transmitted over the secure bidirectional channel. Validated transactions are processed by the Hyperledger Cactus Web application or Smart Contract to execute the integrated business logic.

**Tx 验证者**： 验证从安全双向通道发送来的交易数据的签名的实体。已验证的交易会被 Hyperledger Cactus Web 应用处理或者由智能合约执行相应的业务逻辑。

**Tx submitter**: The entity submits the remote transaction to the API server plug-in on one of the ledgers.

**Tx 提交者**：提交远程交易到其中一个账本的 API 服务器的实体。

**API Server**: A module of Hyperledger Cactus which provides a unified interface to control/monitor Blockchain ledger behind it.

**API 服务器**：Hyperledger Cactus 的一个模块，提供了统一处理/控制在它后面的区块链账本的接口。

**Validator**: A module of Hyperledger Cactus which verifies validity of transaction to be sent out to the blockchain application.

**验证者**：Hyperledger Cactus 的一个模块，验证发送到区块链应用的交易的有效性。

**Lock asset**: An operation to the asset managed on blockchain ledger, which disable further operation to targeted asset. The target can be whole or partial depends on type of asset.

**锁定资产**：对区块链账本管理的资产的操作，即禁止对目标资产的操作。目标根据资产类型可以是全部或者部分。

**Abort**: A state of Hyperledger Cactus which is determined integrated ledger operation is failed, and Hyperledger Cactus will execute recovery operations.

**终止**：Hyperledger Cactus 的一个状态，表明账本操作失败，Hyperleder Cactus 将执行恢复操作。

**Integrated ledger operation**: A series of blockchain ledger operations which will be triggered by Hyperledger Cactus. Hyperledger Cactus is responsible to execute 'recovery operations' when 'Abort' is occurred.

**整合账本操作**：一系列区块链账本的操作，这些操作由 Hyperledger Cactus 触发。当 "终止" 发生时 Hyperledger Cactus 有责任执行 "恢复操作"。

**Restore operation(s)**: Single or multiple ledger operations which is executed by Hyperledger Cactus to restore the state of integrated service before start of integrated operation.

**恢复操作**：单个或者多个账本操作，由 Hyperledger Cactus 执行在整合操作前来恢复整合服务的状态。

**End User**: A person (private citizen or a corporate employee) who interacts with Hyperledger Cactus and other ledger-related systems to achieve a specific goal or complete a task such as to send/receive/exchange money or data.

**终端用户**：与 Hyperledger Cactus 或者其他账本相关系统交互的人（个人或者公司职员），他们可以完成某些目标，或者完成发送、接收、交换钱或者数据这样的任务。

**Business Organization**: A for-profit or non-profit entity formed by one or more people to achieve financial gain or achieve a specific (non-financial) goal. For brevity, *business organization* may be shortened to *organization* throughout the document.

**商业组织**：有一个或多个人组成的盈利或非盈利组织，来实现经济收益或者特定（非盈利组织）目标。简单来说，本文中*商业组织*可以简写为*组织*。

**Identity Owner**: A person or organization who is in control of one or more identities. For example, owning two separate email accounts by one person means that said person is the identity owner of two separate identities (the email accounts). Owning cryptocurrency wallets (their private keys) also makes one an identity owner.

**身份所有者**：对一个或多个身份拥有控制权的个人或组织。例如，一个拥有两个独立邮箱账户的人意味着这个人是两个独立身份（邮箱账本）的身份所有者。拥有加密货币钱包（钱包私钥）也是一个身份所有者。

**Identity Secret**: A private key or a password that - by design - is only ever known by the identity owner (unless stolen).

**身份密码**：一个只有身份拥有者知道的私钥或者密码（除非被窃取）。

**Credentials**: Could mean `user a`uthentication credentials/identity proofs in an IT application or any other credentials in the traditional sense of the word such as a proof that a person obtained a masters or PhD.

**证书**：可以是 IT 应用中`用户身份认证`证书或身份的证明，也可以是交易场景中的其他证书，比如证明一个人拥有学士或者博士学位。 

**Ledger/Network/Chain**: Synonymous words meaning referring largely to the same thing in this paper.

**账本/网络/链**：同义词，本文中使用他们表示相同的内容。

**OIDC**: Open ID Connect authentication protocol

**OIDC**：Open ID 链接身份验证协议。

**PKI**: Public Key Infrastructure

**PKI**：Public Key Infrastructure，公钥基础设施

**MFA**: Multi Factor Authentication，多因子验证。

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

# 7. References 参考文献

1: [Heterogeneous System Architecture](https://en.wikipedia.org/wiki/Heterogeneous_System_Architecture) - Wikipedia, Retrieved at: 11th of December 2019
