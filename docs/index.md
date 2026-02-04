# A Pluggable Interoperability Toolkit for Blockchain and DLT Networks

![Cacti Logo Color](./images/HL_Cacti_Logo_Color.png#gh-light-mode-only){: style="height:70%;width:70%"}
![Cacti Logo Color](./images/HL_Cacti_Logo_Colorreverse.svg#gh-dark-mode-only){: style="height:70%;width:70%"}

Cacti is a multi-faceted pluggable interoperability framework to link networks built on heterogeneous distributed ledger and blockchain technologies and to run transactions spanning multiple networks. It offers a collection of vendor-neutral and DLT-specific modules, libraries, and SDKs for popular DLTs, and templates to help you configure your networks and adapt your DApps to interoperate with other networks and their DApps for the purposes of carrying out atomic asset swaps, asset transfers, sharing ledger state, and other use cases. Cacti does not require deployment of, or dependence on, separate chains, and therefore is uniquely suited to help private (or permissioned) DLT networks be interoperable while keeping control of their governance and maintaining security and privacy.

Cacti is the product of a [merger](https://www.hyperledger.org/blog/2022/11/07/introducing-hyperledger-cacti-a-multi-faceted-pluggable-interoperability-framework) between the pre-existing Cactus and Weaver Lab projects, bringing together two code bases with overlapping as well as complementary feature sets under a common umbrella repository. The core (and shared) design philosophy of Cacti is the enablement of interoperability in a manner that preserves the self-sovereignty of existing networks while providing consensus-driven control over cross-network interactions, does not require modifications to existing DLT stacks, and eschews reliance on third-party chains. Cacti covers the spectrum of generic interoperability modes required to fulfil cross-network transactions, namely asset exchanges, asset transfers, and ledger data sharing.

Cacti is built on a modular architecture and supports extensions through the plugin model. It maintains certain core components that are independent of DLTs, and also packages (called _connectors_ or _drivers_) and libraries for specific DLTs. The following blockchains and DLTs are presently supported to varying extents within the repository:

* Hyperledger Besu
* Hyperledger Fabric
* Hyperledger Indy
* Hyperledger Iroha
* Hyperledger Sawtooth
* R3 Corda
* Go-Ethereum
* Xdai

Client libraries and examples are provided in the following languages: JavaScript/TypeScript, Golang, Java/Kotlin, Solidity.

## Useful links

* [Vision](./vision.md)
* [Architecture](./architecture.md)
* [Cactus whitepaper](https://github.com/hyperledger-cacti/cacti/blob/main/whitepaper/whitepaper.md)
* [Weaver RFCs](https://github.com/hyperledger-cacti/cacti/tree/main/weaver/rfcs)
* [Running pipelines with Cactus packages](./cactus/)
* [Running pipelines with Weaver packages](./weaver/)
* [Open API Specifications](./references/openapi/index.md)

!!! note

    If you have questions not addressed by this documentation, or run into issues with any of the tutorials, please [reach out](./contact-us.md) to the Cacti maintainers (and community).
