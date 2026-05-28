# SATP Changelog

This document tracks SATP version updates.

- 📋 [Project board](https://github.com/orgs/hyperledger-cacti/projects/1/views/1?pane=info)
- 🔥 [Priority board](https://github.com/orgs/hyperledger-cacti/projects/1/views/2)
- 👀 [In review board](https://github.com/orgs/hyperledger-cacti/projects/1/views/5)
- 🗺️ [Roadmap](https://github.com/orgs/hyperledger-cacti/projects/1/views/10)
- 🐛 [Open issues](https://github.com/hyperledger-cacti/cacti/issues?q=is%3Aissue%20state%3Aopen%20label%3AIETF-SATP-Hermes)
- 🏁 [Milestones](https://github.com/hyperledger-cacti/cacti/milestones)

## SATP v0.1.0-alpha

> Previous release: [satp/v0.0.4-beta](https://github.com/hyperledger-cacti/cacti/releases/tag/satp%2Fv0.0.4-beta) (commit [`0c120549`](https://github.com/hyperledger-cacti/cacti/commit/0c120549fd4dc0b8e47e044cdd855d920bdaf1f3))
>
> Full diff: [`satp/v0.0.4-beta...satp/v0.1.0-alpha`](https://github.com/hyperledger-cacti/cacti/compare/satp/v0.0.4-beta...satp/v0.1.0-alpha)


### 🌟 Key highlights

- **Critical DB write safety**: Fix missing `await` on `storeProof()` and `persistLogEntry()` calls across all stage services (Stage 0, 2, and 3), preventing silent proof loss and crash recovery inconsistencies ([`d82dfa520`](https://github.com/hyperledger-cacti/cacti/commit/d82dfa520), [`e6b005251`](https://github.com/hyperledger-cacti/cacti/commit/e6b005251), issues [#4177](https://github.com/hyperledger-cacti/cacti/issues/4177), [#4167](https://github.com/hyperledger-cacti/cacti/issues/4167))
- **Stage 3 body verifier fix**: Restore `commonBodyVerifier` enforcement in Stage 3 server service — all SATP protocol checks (version, sequence number, session id, gateway pubkeys, hash chain integrity, message type) are now correctly applied before critical blockchain operations ([`e6b005251`](https://github.com/hyperledger-cacti/cacti/commit/e6b005251))
- **Audit endpoint improvements**: Enhancements to the audit endpoint API ([`11a6ad1da`](https://github.com/hyperledger-cacti/cacti/commit/11a6ad1da))
- **CI/CD hardening**: CI permissions fixes, test reporter integration, vulnerability fixes in GitHub Actions ([`a70b4ae84`](https://github.com/hyperledger-cacti/cacti/commit/a70b4ae84), [#4150](https://github.com/hyperledger-cacti/cacti/pull/4150))
- **Security**: Remove stale Corda 4.6 test image default ([`d6e85365f`](https://github.com/hyperledger-cacti/cacti/commit/d6e85365f))


## What's Changed

### ✨ Features

- feat(satp-hermes): add audit endpoint improvements by Rodolfo Carapau ([`11a6ad1da`](https://github.com/hyperledger-cacti/cacti/commit/11a6ad1da))

### 🐛 Bug Fixes

- fix(satp-hermes): await async DB writes in Stage 0 and Stage 2 by [@mn-ram](https://github.com/mn-ram) ([`d82dfa520`](https://github.com/hyperledger-cacti/cacti/commit/d82dfa520)) (issue [#4177](https://github.com/hyperledger-cacti/cacti/issues/4177))
- fix(satp-hermes): await Stage 3 DB writes and restore body verifier by [@mn-ram](https://github.com/mn-ram) ([`e6b005251`](https://github.com/hyperledger-cacti/cacti/commit/e6b005251)) (issue [#4167](https://github.com/hyperledger-cacti/cacti/issues/4167))
- fix(api-server): use Promise.allSettled in shutdown by [@mn-ram](https://github.com/mn-ram) ([`3505e735c`](https://github.com/hyperledger-cacti/cacti/commit/3505e735c))
- fix(security): remove stale corda 4.6 test image default by [@malsomesh9](https://github.com/malsomesh9) ([`d6e85365f`](https://github.com/hyperledger-cacti/cacti/commit/d6e85365f))

### 📝 Documentation

- docs: add PULL.md by [@RafaelAPB](https://github.com/RafaelAPB) ([`ceade1864`](https://github.com/hyperledger-cacti/cacti/commit/ceade1864))
- docs: add AI agents and guidelines by [@RafaelAPB](https://github.com/RafaelAPB) ([`ecd393865`](https://github.com/hyperledger-cacti/cacti/commit/ecd393865))
- docs(build): sync published build guide with repo instructions by Rahul Tripathi ([`b530f1943`](https://github.com/hyperledger-cacti/cacti/commit/b530f1943))
- docs(setup): fix developer setup, docker instructions, and local CI steps by Dev10-sys ([`d4832928e`](https://github.com/hyperledger-cacti/cacti/commit/d4832928e))

### 🧪 Tests

- test(satp-hermes): fix tests by [@RafaelAPB](https://github.com/RafaelAPB) ([`eea3bb9f4`](https://github.com/hyperledger-cacti/cacti/commit/eea3bb9f4))

### ⚙️ CI / CD

- ci: fix ci permissions and add test reporter by [@RafaelAPB](https://github.com/RafaelAPB) ([`a70b4ae84`](https://github.com/hyperledger-cacti/cacti/commit/a70b4ae84))
- ci(gh-actions): vulnerability fixes in several actions by [@VRamakrishna](https://github.com/VRamakrishna) in [#4150](https://github.com/hyperledger-cacti/cacti/pull/4150)
- ci: enhance commitlint workflow and increase line length limits by [@sandeepnRES](https://github.com/sandeepnRES) ([`49476abdd`](https://github.com/hyperledger-cacti/cacti/commit/49476abdd))
- fix(ci): update compute-affected-packages.cjs by [@RafaelAPB](https://github.com/RafaelAPB) ([`15ac724d0`](https://github.com/hyperledger-cacti/cacti/commit/15ac724d0))
- ci: fix dependent issues and dev container jobs by [@RafaelAPB](https://github.com/RafaelAPB) ([`ce90509e6`](https://github.com/hyperledger-cacti/cacti/commit/ce90509e6))- ci: fix ci by [@RafaelAPB](https://github.com/RafaelAPB) ([`482e0a33d`](https://github.com/hyperledger-cacti/cacti/commit/482e0a33d))
- ci: delete dependent issues job by [@RafaelAPB](https://github.com/RafaelAPB) ([`5028c87cf`](https://github.com/hyperledger-cacti/cacti/commit/5028c87cf))
### 🧹 Chores / Maintenance

- chore: archive packages by [@RafaelAPB](https://github.com/RafaelAPB) ([`13148f610`](https://github.com/hyperledger-cacti/cacti/commit/13148f610))
- chore: update yarn by [@RafaelAPB](https://github.com/RafaelAPB) ([`1837c1d26`](https://github.com/hyperledger-cacti/cacti/commit/1837c1d26))
- chore(root): fix broken scripts and update documentation year by Dev10-sys ([`090ffef36`](https://github.com/hyperledger-cacti/cacti/commit/090ffef36))
- build(deps): consolidate npm_and_yarn group updates across all dirs by [@sandeepnRES](https://github.com/sandeepnRES) ([`9fd9b6e1a`](https://github.com/hyperledger-cacti/cacti/commit/9fd9b6e1a))

## 📊 Release Summary

| Metric | Value |
|--------|-------|
| 🏷️ **Tag** | `satp/v0.1.0-alpha` |
| ⏮️ **Previous tag** | [`satp/v0.0.4-beta`](https://github.com/hyperledger-cacti/cacti/releases/tag/satp%2Fv0.0.4-beta) |
| 📅 **Date range** | 2026-04-13 (v0.0.4-beta) — 2026-05-28 |
| 🔢 **SATP commits** | 4 |
| 🔢 **Total commits** | 26 |
| 📁 **SATP files changed** | 63 |
| ➕ **SATP lines added** | +4,236 |
| ➖ **SATP lines removed** | −795 |
| 👥 **Contributors** | 9 |

### 📈 Contributions by type

| Category | Count |
|----------|------:|
| ✨ Features | 1 |
| 🐛 Bug Fixes | 4 |
| 📝 Documentation | 4 |
| 🧪 Tests | 1 |
| ⚙️ CI / CD | 7 |
| 🧹 Chores / Maintenance | 4 |

## 👥 Contributors

- [@RafaelAPB](https://github.com/RafaelAPB)
- [@mn-ram](https://github.com/mn-ram)
- Rodolfo Carapau
- [@sandeepnRES](https://github.com/sandeepnRES)
- [@VRamakrishna](https://github.com/VRamakrishna)
- [@malsomesh9](https://github.com/malsomesh9)
- Dev10-sys
- Rahul Tripathi
- Michal Bajer

---

## SATP v0.0.4-beta

> Release tracking issue: [chore(satp-hermes): release 0.0.4-beta #4021](https://github.com/hyperledger-cacti/cacti/issues/4021)
>
> Main feature: [feat(satp-hermes): implement api3 layer #4017](https://github.com/hyperledger-cacti/cacti/issues/4017)
>
> Previous release: [satp/v0.0.3-beta](https://github.com/hyperledger-cacti/cacti/releases/tag/satp%2Fv0.0.3-beta) (commit [`e895a4c9`](https://github.com/hyperledger-cacti/cacti/commit/e895a4c9eebf5a510ad04bd786a34136dd57cfd5))
>
> Full diff: [`satp/v0.0.3-beta...satp/v0.0.4-beta`](https://github.com/hyperledger-cacti/cacti/compare/satp/v0.0.3-beta...satp/v0.0.4-beta)


### 🌟 Key highlights

- **Adapter layer & API3**: foundational adapter architecture for operator hooks ([#4097](https://github.com/hyperledger-cacti/cacti/pull/4097)), per [#4017](https://github.com/hyperledger-cacti/cacti/issues/4017)
- **NFT support**: end-to-end NFT transfer via SATP ([#3965](https://github.com/hyperledger-cacti/cacti/pull/3965))
- **Observability**: Grafana dashboards, alerts, multi-gateway Prometheus metrics, and improved session tracing ([#4023](https://github.com/hyperledger-cacti/cacti/pull/4023), [#4056](https://github.com/hyperledger-cacti/cacti/pull/4056), [#4058](https://github.com/hyperledger-cacti/cacti/pull/4058))
- **Gateway extensions**: plugin system for SATP gateway extensibility ([#4030](https://github.com/hyperledger-cacti/cacti/pull/4030))
- **CI/CD hardening**: Docker push fixes, SDK publishing on GHCR, test annotations ([#4019](https://github.com/hyperledger-cacti/cacti/pull/4019))
- **Documentation**: TypeDoc API docs, starting guide, mkdocs integration ([#4012](https://github.com/hyperledger-cacti/cacti/pull/4012), [#4101](https://github.com/hyperledger-cacti/cacti/pull/4101), [#4125](https://github.com/hyperledger-cacti/cacti/pull/4125))


## What's Changed

### ✨ Features

- feat(satp-hermes): add get ledgers endpoint by [@RafaelAPB](https://github.com/RafaelAPB) in [#4157](https://github.com/hyperledger-cacti/cacti/pull/4157) (issue [#4022](https://github.com/hyperledger-cacti/cacti/issues/4022))
- feat(satp-hermes): persist oracle logs by [@RafaelAPB](https://github.com/RafaelAPB) in [#4156](https://github.com/hyperledger-cacti/cacti/pull/4156) (issue [#3946](https://github.com/hyperledger-cacti/cacti/issues/3946))
- feat(satp-hermes): add adapter layer by [@RafaelAPB](https://github.com/RafaelAPB) in [#4097](https://github.com/hyperledger-cacti/cacti/pull/4097) (issue [#4017](https://github.com/hyperledger-cacti/cacti/issues/4017))
- feat(satp-hermes): improve satp gateway configuration object by Tomás Silva in [#4079](https://github.com/hyperledger-cacti/cacti/pull/4079) (issue [#4013](https://github.com/hyperledger-cacti/cacti/issues/4013))
- feat(satp-hermes): improve session tracing by Jorge Santos in [#4058](https://github.com/hyperledger-cacti/cacti/pull/4058) (issue [#4014](https://github.com/hyperledger-cacti/cacti/issues/4014))
- feat(satp-hermes): add extensions functionality to SATP gateway by [@AndreAugusto11](https://github.com/AndreAugusto11) in [#4030](https://github.com/hyperledger-cacti/cacti/pull/4030) (issue [#4029](https://github.com/hyperledger-cacti/cacti/issues/4029))
- feat(satp): add support for NFTs by Tomás Silva in [#3965](https://github.com/hyperledger-cacti/cacti/pull/3965) (issue [#3869](https://github.com/hyperledger-cacti/cacti/issues/3869))
- feat(satp): multi gateway metrics by Jorge Santos in [#4056](https://github.com/hyperledger-cacti/cacti/pull/4056) (issue [#4011](https://github.com/hyperledger-cacti/cacti/issues/4011))
- feat(satp): added predefined grafana dashboards and alerts by Jorge Santos in [#4023](https://github.com/hyperledger-cacti/cacti/pull/4023) (issues [#3759](https://github.com/hyperledger-cacti/cacti/issues/3759), [#3124](https://github.com/hyperledger-cacti/cacti/issues/3124))

### 🐛 Bug Fixes

- fix(satp-hermes): fix inconsistencies for demo to work by Tomás Silva in [#4092](https://github.com/hyperledger-cacti/cacti/pull/4092) (issue [#3752](https://github.com/hyperledger-cacti/cacti/issues/3752))
- fix(satp-hermes): missing gateway persistence file by [Carlos Amaro](https://github.com/LordKubaya) in [#4082](https://github.com/hyperledger-cacti/cacti/pull/4082)
- fix(satp-hermes): fixed validate bundle names err by Rodolfo Carapau in [#4024](https://github.com/hyperledger-cacti/cacti/pull/4024)
- fix(satp-hermes): update vite dependency by [@RafaelAPB](https://github.com/RafaelAPB) ([`1c2d609c`](https://github.com/hyperledger-cacti/cacti/commit/1c2d609c0))
- fix(satp): fix errors on ontology, leading to test failures by Tomás Silva in [#4062](https://github.com/hyperledger-cacti/cacti/pull/4062) (issue [#3747](https://github.com/hyperledger-cacti/cacti/issues/3747))
- fix(satp): add check in satp to verify smart contract ontology syntax by Tomás Silva in [#3872](https://github.com/hyperledger-cacti/cacti/pull/3872) (issue [#3746](https://github.com/hyperledger-cacti/cacti/issues/3746))
- fix(satp): fix isFabricConfigJSON always printing error by Tomás Silva in [#4004](https://github.com/hyperledger-cacti/cacti/pull/4004)

### 📝 Documentation

- docs: add starting guide by [@RafaelAPB](https://github.com/RafaelAPB) in [#4101](https://github.com/hyperledger-cacti/cacti/pull/4101)
- docs: doc publishing via mkdocs (includes SATP Hermes docs) by [@copilot-swe-agent](https://github.com/apps/copilot-swe-agent) in [#4125](https://github.com/hyperledger-cacti/cacti/pull/4125)
- docs(satp-hermes): add typedoc documentation by [@RafaelAPB](https://github.com/RafaelAPB) in [#4012](https://github.com/hyperledger-cacti/cacti/pull/4012)
- docs(satp-hermes): enhance typedoc documentation by [@RafaelAPB](https://github.com/RafaelAPB) in [#4012](https://github.com/hyperledger-cacti/cacti/pull/4012)
- docs(satp-hermes): add docs to nft feature by [@RafaelAPB](https://github.com/RafaelAPB) in [#4012](https://github.com/hyperledger-cacti/cacti/pull/4012)
- docs(satp-hermes): add network discovery WIP plan by [@RafaelAPB](https://github.com/RafaelAPB) in [#4012](https://github.com/hyperledger-cacti/cacti/pull/4012)
- docs(satp-hermes): document bridge configuration by [@RafaelAPB](https://github.com/RafaelAPB) in [#4066](https://github.com/hyperledger-cacti/cacti/pull/4066) (issue [#4067](https://github.com/hyperledger-cacti/cacti/issues/4067))

### 🧪 Tests

- test(satp-hermes): update besu image version by Guilherme Marcondes in [#4149](https://github.com/hyperledger-cacti/cacti/pull/4149)

### ⚙️ CI / CD

- ci(satp-hermes): satp-hermes ci improvements by [@RafaelAPB](https://github.com/RafaelAPB) in [#4010](https://github.com/hyperledger-cacti/cacti/pull/4010)
- ci(satp-hermes): fix docker push, test annotation, add sdk by [@RafaelAPB](https://github.com/RafaelAPB) in [#4019](https://github.com/hyperledger-cacti/cacti/pull/4019)
- ci(satp-hermes): update release runners by [@RafaelAPB](https://github.com/RafaelAPB) in [#4084](https://github.com/hyperledger-cacti/cacti/pull/4084)
- ci: refactor and fixes by [Carlos Amaro](https://github.com/LordKubaya) in [#4059](https://github.com/hyperledger-cacti/cacti/pull/4059) (issue [#4037](https://github.com/hyperledger-cacti/cacti/issues/4037))

### 🧹 Chores / Maintenance

- chore(satp-hermes): fixed lint by Rodolfo Carapau in [#4078](https://github.com/hyperledger-cacti/cacti/pull/4078) (issue [#3984](https://github.com/hyperledger-cacti/cacti/issues/3984))
- chore(satp-hermes): fix versions, fix doc serve by [@RafaelAPB](https://github.com/RafaelAPB) ([`be4e9076`](https://github.com/hyperledger-cacti/cacti/commit/be4e9076e))
- chore(satp-hermes): use default runners by [@RafaelAPB](https://github.com/RafaelAPB) ([`fb214cb7`](https://github.com/hyperledger-cacti/cacti/commit/fb214cb7f))
- chore(satp-hermes): update grpc tools by [@RafaelAPB](https://github.com/RafaelAPB) in [#4055](https://github.com/hyperledger-cacti/cacti/pull/4055)
- chore(satp-hermes): skip stage 1 recovery test by Rodolfo Carapau in [#4048](https://github.com/hyperledger-cacti/cacti/pull/4048)
- chore(satp-hermes): run SATP tests conditionally by [@RafaelAPB](https://github.com/RafaelAPB) in [#4050](https://github.com/hyperledger-cacti/cacti/pull/4050)

## 📊 Release Summary

| Metric | Value |
|--------|-------|
| 🏷️ **Tag** | `satp/v0.0.4-beta` |
| ⏮️ **Previous tag** | [`satp/v0.0.3-beta`](https://github.com/hyperledger-cacti/cacti/releases/tag/satp%2Fv0.0.3-beta) |
| 🏁 **Milestone** | [SATP-Hermes v0.0.4-beta](https://github.com/hyperledger-cacti/cacti/milestone/48) |
| 📋 **Project board** | [SATP-Hermes](https://github.com/orgs/hyperledger-cacti/projects/1/views/1) |
| 📅 **Date range** | 2025-10-02 (v0.0.3-beta) — 2026-04-13 |
| 🔢 **SATP commits** | 38 |
| 🔀 **Merged PRs** | 28 |
| 📁 **Files changed** | 348 |
| ➕ **Lines added** | +51,683 |
| ➖ **Lines removed** | −4,253 |
| 👥 **Contributors** | 8 |

### 📈 Contributions by type

| Category | Count |
|----------|------:|
| ✨ Features | 9 |
| 🐛 Bug Fixes | 7 |
| 📝 Documentation | 7 |
| 🧪 Tests | 1 |
| ⚙️ CI / CD | 4 |
| 🧹 Chores / Maintenance | 6 |

## 👥 Contributors

- [@RafaelAPB](https://github.com/RafaelAPB)
- [@AndreAugusto11](https://github.com/AndreAugusto11)
- Tomás Silva
- Jorge Santos
- [Carlos Amaro](https://github.com/LordKubaya)
- Rodolfo Carapau
- Guilherme Marcondes
- [@copilot-swe-agent](https://github.com/apps/copilot-swe-agent)
