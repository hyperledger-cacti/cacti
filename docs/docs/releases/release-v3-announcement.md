Hyperledger Cacti v3 Release Announcement

Cacti v3 is the largest release in the project's history — the culmination of 18 months of sustained development across the entire platform.

After many bug fixes and documentation improvements, we present SATP-Hermes, an extensible cross-chain asset transfer engine built on the IETF Secure Asset Transfer Protocol draft. We also present it ships two brand-new plugins ([BUNGEE-Hermes](#-new-plugin-bungee-hermes-cross-chain-views) and [COPM Corda](#-new-plugin-copm-cross-chain-operations--protocol-management)), real-time event streaming for both Fabric and Ethereum, deep observability, and a significantly expanded Ledger Browser.

---

## 📦 What's Changed

### ✨ Features

#### SATP Hermes — Cross-Chain Transfer Protocol

Package: [`@hyperledger-cacti/cactus-plugin-satp-hermes`](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-satp-hermes)

The SATP Hermes gateway is the core of Cacti's cross-chain interoperability story. v3 brings it to production readiness:

- **Adapter Layer** — A pluggable adapter architecture decouples the protocol engine from any specific blockchain, making it straightforward to onboard new networks without modifying protocol logic ([8a940fdc1](https://github.com/hyperledger-cacti/cacti/commit/8a940fdc1))
- **NFT Support** — Cross-chain transfer of non-fungible tokens is now first-class; the SATP ontology understands NFT semantics, enabling bridge operations for ERC-721-style assets across heterogeneous networks ([7fc9154d2](https://github.com/hyperledger-cacti/cacti/commit/7fc9154d2))
- **Extensions API** — Developers can augment gateway behavior at runtime via a formal extensions interface — custom pre/post-transfer hooks, compliance checks, business logic — without forking the gateway ([944ba9705](https://github.com/hyperledger-cacti/cacti/commit/944ba9705))
- **Audit Endpoint** — A dedicated `KnexAuditRepository`-backed audit endpoint with ISO-8601 timestamp validation, structured HTTP error responses, and 3 new unit test suites for compliance workflows ([11a6ad1da](https://github.com/hyperledger-cacti/cacti/commit/11a6ad1da))
- **Oracle Log Persistence** — Oracle interaction logs are now persisted to the gateway database, enabling post-hoc analysis of data feeds used during transfers ([f35204030](https://github.com/hyperledger-cacti/cacti/commit/f35204030))
- **Get Ledgers Endpoint** — Operators can enumerate connected ledgers and their configurations via a new REST endpoint, simplifying multi-network monitoring ([d57fce30f](https://github.com/hyperledger-cacti/cacti/commit/d57fce30f))
- **Improved Session Tracing** — Distributed trace IDs now propagate through all SATP stages, making it trivial to correlate logs across gateways during a transfer ([e238d88cf](https://github.com/hyperledger-cacti/cacti/commit/e238d88cf))
- **Grafana Dashboards & Alerts** — Pre-built Grafana dashboards and alert rules are bundled out-of-the-box, giving operations teams immediate visibility into gateway health, throughput, and error rates ([62d00d150](https://github.com/hyperledger-cacti/cacti/commit/62d00d150))
- **Multi-Gateway Metrics** — Prometheus metrics now cover multi-gateway scenarios, enabling platform-level SLOs across a mesh of SATP gateways ([1bbc3c34c](https://github.com/hyperledger-cacti/cacti/commit/1bbc3c34c))
- **Improved Gateway Configuration** — The gateway configuration object has been redesigned for clarity and extensibility ([4b614f199](https://github.com/hyperledger-cacti/cacti/commit/4b614f199))

---

#### 🆕 New Plugin: BUNGEE-Hermes — Cross-Chain Views

Package: [`@hyperledger-cacti/cactus-plugin-bungee-hermes`](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-bungee-hermes)

BUNGEE-Hermes is an implementation of a **cross-chain view generator**, enabling consistent, verifiable snapshots of state across multiple ledgers at a point in time. Based on peer-reviewed research ([ACM DL](https://dl.acm.org/doi/10.1145/3643689)), this is foundational infrastructure for cross-chain analytics, auditing, and atomic multi-network queries ([f378f44dc](https://github.com/hyperledger-cacti/cacti/commit/f378f44dc))

---

#### 🆕 New Plugin: COPM — Cross-Chain Operations & Protocol Management

Packages: [`@hyperledger-cacti/cacti-plugin-copm-fabric`](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cacti-plugin-copm-fabric) · [`@hyperledger-cacti/cacti-plugin-copm-corda`](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cacti-plugin-copm-corda) · [`@hyperledger-cacti/cacti-copm-core`](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cacti-copm-core)

The **COPM** plugin family provides a unified, high-level API for cross-chain pledge/claim and lock/unlock operations. v3 adds a **Corda implementation** alongside the existing Fabric one, along with sequence diagrams for all COPM primitives ([6544a95f4](https://github.com/hyperledger-cacti/cacti/commit/6544a95f4))

---

#### Real-Time Event Infrastructure

- **Fabric Chaincode Event Listener** — Subscribe to chaincode events from the Fabric connector via a streaming API, eliminating polling ([89ece5eeb](https://github.com/hyperledger-cacti/cacti/commit/89ece5eeb))
 Package: [`@hyperledger-cacti/cactus-plugin-ledger-connector-fabric`](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-ledger-connector-fabric)

- **Ethereum Smart Contract Event Listener** — Real-time event subscriptions for any deployed smart contract ([694e2e30f](https://github.com/hyperledger-cacti/cacti/commit/694e2e30f))
 Package: [`@hyperledger-cacti/cactus-plugin-ledger-connector-ethereum`](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-ledger-connector-ethereum)

---

#### Ledger Browser — Deep Multi-Chain Visibility

Package: [`@hyperledger-cacti/cacti-ledger-browser`](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cacti-ledger-browser)

- **Fabric Network Discovery Tab** — Dynamically visualizes the full MSP/peer/channel topology of a connected Fabric network, discovered at runtime ([ccf25d111](https://github.com/hyperledger-cacti/cacti/commit/ccf25d111))
- **ERC-721 Metadata & Display** — NFT metadata is fetched and rendered inline, including images, attributes, and ownership history ([9de3e4cad](https://github.com/hyperledger-cacti/cacti/commit/9de3e4cad), [46ed5b9c2](https://github.com/hyperledger-cacti/cacti/commit/46ed5b9c2))
- **ERC-1155 Support** — The Ethereum persistence layer now tracks multi-token standard events and balances
 ([cf20a6aad](https://github.com/hyperledger-cacti/cacti/commit/cf20a6aad))
 Package: [`@hyperledger-cacti/cactus-plugin-persistence-ethereum`](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-persistence-ethereum)
- **Fabric Discovery Persistence** — Fabric network discovery results are now persisted to a database, enabling historical topology analysis ([9b04d5e54](https://github.com/hyperledger-cacti/cacti/commit/9b04d5e54))

---

#### Platform & Infrastructure

- **Node.js 20 LTS** — The full monorepo, including all Weaver SDK apps, is now targeting Node 20 ([bcb5ee344](https://github.com/hyperledger-cacti/cacti/commit/bcb5ee344))
- **Express 5 semantics** — The API server has been updated to match Express 5 routing behavior ([10c576c25](https://github.com/hyperledger-cacti/cacti/commit/10c576c25))
 Package: [`@hyperledger-cacti/cactus-cmd-api-server`](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-cmd-api-server)
- **Configurable OpenAPI Request Validation** — Operators can tune or disable schema validation per-endpoint at the API server level ([5b3834483](https://github.com/hyperledger-cacti/cacti/commit/5b3834483))
- **Configurable gRPC Bind Host** — The API server's gRPC interface can now be bound to a specific host, a key requirement for container and service-mesh deployments ([42a45fe4e](https://github.com/hyperledger-cacti/cacti/commit/42a45fe4e))
- **Azure Key Vault Refresh Token Support** — The keychain plugin now supports refresh-token-based credential renewal, removing the need for long-lived secrets ([157a4e6ad](https://github.com/hyperledger-cacti/cacti/commit/157a4e6ad))
 Package: [`@hyperledger-cacti/cactus-plugin-keychain-azure-kv`](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-keychain-azure-kv)
- **Fabric CA ARM64 Support** — The `fabric-all-in-one` test image now builds and runs on ARM64, unblocking Apple Silicon and AWS Graviton dev environments ([bdea8f5ce](https://github.com/hyperledger-cacti/cacti/commit/bdea8f5ce))
- **Fabric CLI Image Modernization** — Deprecated `fabric-tools` replaced with the new Fabric CLI image ([d16a14f20](https://github.com/hyperledger-cacti/cacti/commit/d16a14f20))
- **BigInt JSON Serialization** — A new `BigInt` JSON replacer in `cactus-common` converts `BigInt` values to strings, preventing silent JSON serialization errors ([52779b09b](https://github.com/hyperledger-cacti/cacti/commit/52779b09b))

---

### 🐛 Notable Bug Fixes

- **SATP DB write safety** — Fixed missing `await` on `storeProof()` and `persistLogEntry()` calls across Stage 0, 2, and 3, preventing silent proof loss ([d82dfa520](https://github.com/hyperledger-cacti/cacti/commit/d82dfa520), [e6b005251](https://github.com/hyperledger-cacti/cacti/commit/e6b005251))
- **API server graceful shutdown** — `Promise.allSettled` used in shutdown to prevent hung teardown when a plugin fails to stop ([3505e735c](https://github.com/hyperledger-cacti/cacti/commit/3505e735c))
- **SATP gateway persistence file** — Fixed a missing persistence file that caused gateway startup failures ([6b757aba4](https://github.com/hyperledger-cacti/cacti/commit/6b757aba4))

---

### 🔒 Security

- Multiple CVEs addressed: `undici` (CVE-2024-30260), `axios` (CVE-2025-27152), `elliptic` (GHSA-vjh7-7g9h-fjfh), and more
- SHA-pinned GitHub Actions across CI pipelines
- Immutable hash-based dependency pinning
- Removed stale Corda 4.6 test image default credentials

---
TODO transform to table?
## 📊 Release Summary

| | |
|---|---|
| 🏷️ Tag | v3.0.0 |
| ⏮️ Previous tag | [v2.1.0](https://github.com/hyperledger-cacti/cacti/releases/tag/v2.1.0) |
| 📅 Date range | 2024-12-01 — 2026-07-06 |
| 🔢 Total commits | 250 |
| ✨ Features | 29 |
| 🐛 Bug fixes | 46 |
| 📁 Files changed | 3,890 |
| ➕ Lines added | +229,109 |
| ➖ Lines removed | −191,501 |
| 👥 Contributors | 42 |

### 📈 Contributions by type

| | |
|---|---|
| ✨ Features | 29 |
| 🐛 Bug Fixes | 46 |
| 🔒 Security | 10+ |
| 📝 Documentation | 15+ |
| 🧪 Tests | 15+ |
| 🧹 Chores / CI | 100+ |

---

Changes since 2.1.0: https://github.com/hyperledger-cacti/cacti/compare/v2.1.0...main

## 👥 Contributors

Thank you to everyone who contributed to this release:

[@RafaelAPB](https://github.com/RafaelAPB) ·
[@Carlos-Amaro](https://github.com/carlos-amaro) ·
[@sandeepnRES](https://github.com/sandeepnRES) ·
[@peter-somogyvari](https://github.com/peter-somogyvari) ·
[@jagpreetsinghsasan](https://github.com/jagpreetsinghsasan) ·
[@Ry-Jones](https://github.com/Ry-Jones) ·
[@ruzell22](https://github.com/ruzell22) ·
[@ParthSinghPS](https://github.com/ParthSinghPS) ·
[@adrianbatuto](https://github.com/adrianbatuto) ·
[@musicboy0322](https://github.com/musicboy0322) ·
[@Michal-Bajer](https://github.com/Michal-Bajer) ·
[@Udhayakumari](https://github.com/Udhayakumari) ·
[@AndreAugusto11](https://github.com/AndreAugusto11) ·
[@JorgeSousa](https://github.com/JorgeSousa) ·
[@RodolfoCaparroz](https://github.com/RodolfoCaparroz) ·
[@VRamakrishna](https://github.com/VRamakrishna) ·
[@mn-ram](https://github.com/mn-ram) ·
[@AbhayrajJaiswal](https://github.com/AbhayrajJaiswal) ·
and [many more](https://github.com/hyperledger-cacti/cacti/graphs/contributors)

---

## 💬 Join the Community

Are you building with Cacti, experimenting with cross-chain transfers, or interested in blockchain interoperability? Come talk to us!

👉 **[Join #cacti on the Hyperledger Discord](https://discord.com/channels/905194001349627914/908379366650703943)**

We'd love to hear what you're building, answer questions, and collaborate on the future of blockchain interoperability.


