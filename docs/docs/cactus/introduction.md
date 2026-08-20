Welcome to Hyperledger Cacti documentation!
=========================================================================================================================

Hyperledger Cacti provides decentralized, secure integration between blockchain networks. It is a pluggable, enterprise-grade framework designed to transact across multiple distributed ledgers without introducing yet another competing blockchain.

**What is Cacti?**

Cacti is a unified interoperability framework that allows different distributed ledger technology (DLT) networks to interact with each other through atomic transactions and state commits. This eliminates information silos, increases network value, and abstracts the application layer from DLT protocol fragmentation.

The framework is composed of active subsystems:
*   **Core Libraries and API Server:** Foundational SDK components (`common`, `core`, `core-api`) and the centralized orchestration server that manages plugins and routes transactions.
*   **Ledger Connectors:** Standardized interfaces for networks like Besu, Fabric, and Stellar.
*   **Weaver:** Relay-based interoperability framework for state proofs and secure data sharing across networks.
*   **COPM:** Cross-chain operations and lifecycle management.
*   **Business Logic Plugins:** Higher-level protocol implementations built on the core framework. SATP Hermes, for example, implements the Secure Asset Transfer Protocol for atomic cross-chain asset transfers.

**Why use Cacti?**

*   **Future-Proof Integration:** Maximize flexibility through a highly modular, plug-in based architecture.
*   **Scalability:** Preserve native ledger features while enabling horizontal scalability across interconnected networks.
