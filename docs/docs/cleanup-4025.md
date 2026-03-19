# Cleanup #4025 - Package Archival Decision Report

## Overview

This document summarizes the community decision on package archival/removal as part of the Cacti repository maintenance cleanup initiative.

**Decision Date:** October 2025  
**Issue Reference:** #4025

## Discord References

All voting and decisions were conducted in the **Cacti Contributors** channel:

| Reference | Link |
|-----------|------|
| Governance discussion | https://discord.com/channels/905194001349627914/908379338716631050/1428405972992266343 |
| Vote start | https://discord.com/channels/905194001349627914/908379338716631050/1428413418108358849 |
| Vote end | https://discord.com/channels/905194001349627914/908379338716631050/1428414831022837874 |

Full candidate list: `.github/discord-polls-2025-10-16.md`

## Package Inventory

This finalizes the list of packages reviewed.

| Category | Count |
|----------|-------|
| Extensions | 2 |
| Ledger Connectors | 11 |
| Other Packages | 30 |
| Examples | 16 |
| **Total** | **59 packages** |

## Decision Summary

| Outcome | Count |
|---------|-------|
| **Retain** | 30 |
| **Remove/Archive** | 7 ✅ (completed) |
| **No Vote** | 22 |

---

## Packages Approved for Removal

The following packages have been approved for removal based on community vote:

### Packages (3)

| Package | Path | Status |
|---------|------|--------|
| `cactus-plugin-ccmodel-hephaestus` | `packages/cactus-plugin-ccmodel-hephaestus` | ✅ Removed |
| `cactus-plugin-consortium-manual` | `packages/cactus-plugin-consortium-manual` | ✅ Removed |
| `cactus-plugin-keychain-vault` | `packages/cactus-plugin-keychain-vault` | ✅ Removed |

### Examples (4)

| Package | Path | Status |
|---------|------|--------|
| `cactus-example-discounted-asset-trade` | `examples/cactus-example-discounted-asset-trade` | ✅ Removed |
| `cactus-example-discounted-asset-trade-client` | `examples/cactus-example-discounted-asset-trade-client` | ✅ Removed |
| `cactus-example-electricity-trade` | `examples/cactus-example-electricity-trade` | ✅ Removed |
| `test-run-transaction` | `examples/test-run-transaction` | ✅ Removed |

**Removal Completed:** March 2026  
**Branch:** `chore/cleanup-4025-package-removal`

---

## Review Tables

Note: First column is package name, second column `keep?` shows voting result (✓ = voted keep, ❌ = voted remove, − = no vote). Remaining columns track post-vote actions for retained packages.

### Extensions

| Extension | keep? | Documentation updates | Security review | Automatize onboarding |
| --------- |:-----:| --------------------- | --------------- | --------------------- |
| cactus-plugin-htlc-coordinator-besu | − |  |  |  |
| cactus-plugin-object-store-ipfs | ✓ |  |  |  |

### Packages

| Package | keep? | Documentation updates | Security review | Automatize onboarding |
| ------- |:-----:| --------------------- | --------------- | --------------------- |
| cacti-copm-core | ✓ |  |  |  |
| cacti-copm-test | ✓ |  |  |  |
| cacti-ledger-browser | − |  |  |  |
| cacti-plugin-consortium-static | ✓ |  |  |  |
| cacti-plugin-copm-corda | ✓ |  |  |  |
| cacti-plugin-copm-fabric | ✓ |  |  |  |
| cacti-plugin-ledger-connector-stellar | ✓ |  |  |  |
| cacti-plugin-weaver-driver-fabric | − |  |  |  |
| cactus-api-client | ✓ |  |  |  |
| cactus-cmd-api-server | ✓ |  |  |  |
| cactus-cmd-socketio-server | − |  |  |  |
| cactus-common | ✓ |  |  |  |
| cactus-core | ✓ |  |  |  |
| cactus-core-api | ✓ |  |  |  |
| cactus-plugin-bungee-hermes | ✓ |  |  |  |
| cactus-plugin-ccmodel-hephaestus | ❌ | N/A | N/A | N/A |
| cactus-plugin-consortium-manual | ❌ | N/A | N/A | N/A |
| cactus-plugin-htlc-eth-besu | ✓ |  |  |  |
| cactus-plugin-htlc-eth-besu-erc20 | − |  |  |  |
| cactus-plugin-keychain-aws-sm | − |  |  |  |
| cactus-plugin-keychain-azure-kv | − |  |  |  |
| cactus-plugin-keychain-google-sm | − |  |  |  |
| cactus-plugin-keychain-memory | ✓ |  |  |  |
| cactus-plugin-keychain-memory-wasm | − |  |  |  |
| cactus-plugin-keychain-vault | ❌ | N/A | N/A | N/A |
| cactus-plugin-ledger-connector-aries | ✓ |  |  |  |
| cactus-plugin-ledger-connector-besu | ✓ |  |  |  |
| cactus-plugin-ledger-connector-cdl | ✓ |  |  |  |
| cactus-plugin-ledger-connector-corda | ✓ |  |  |  |
| cactus-plugin-ledger-connector-ethereum | ✓ |  |  |  |
| cactus-plugin-ledger-connector-fabric | ✓ |  |  |  |
| cactus-plugin-ledger-connector-iroha2 | ✓ |  |  |  |
| cactus-plugin-ledger-connector-polkadot | ✓ |  |  |  |
| cactus-plugin-ledger-connector-sawtooth | ✓ |  |  |  |
| cactus-plugin-ledger-connector-xdai | ✓ |  |  |  |
| cactus-plugin-persistence-ethereum | − |  |  |  |
| cactus-plugin-persistence-fabric | − |  |  |  |
| cactus-plugin-satp-hermes | ✓ |  |  |  |
| cactus-test-api-client | − |  |  |  |
| cactus-test-cmd-api-server | − |  |  |  |
| cactus-test-geth-ledger | − |  |  |  |
| cactus-test-plugin-consortium-manual | − |  |  |  |
| cactus-test-plugin-htlc-eth-besu | − |  |  |  |
| cactus-test-plugin-htlc-eth-besu-erc20 | − |  |  |  |
| cactus-test-plugin-keychain-memory | − |  |  |  |
| cactus-test-plugin-ledger-connector-besu | − |  |  |  |
| cactus-test-plugin-ledger-connector-ethereum | − |  |  |  |
| cactus-test-tooling | − |  |  |  |
| cactus-test-verifier-client | − |  |  |  |
| cactus-verifier-client | − |  |  |  |

### Examples

| Example | keep? | Documentation updates | Security review | Automatize onboarding |
| ------- |:-----:| --------------------- | --------------- | --------------------- |
| cactus-common-example-server | − |  |  |  |
| cactus-example-carbon-accounting-backend | − |  |  |  |
| cactus-example-carbon-accounting-business-logic-plugin | − |  |  |  |
| cactus-example-carbon-accounting-frontend | − |  |  |  |
| cactus-example-cbdc-bridging | ✓ |  |  |  |
| cactus-example-cbdc-bridging-backend | ✓ |  |  |  |
| cactus-example-cbdc-bridging-frontend | ✓ |  |  |  |
| cactus-example-discounted-asset-trade | ❌ | N/A | N/A | N/A |
| cactus-example-discounted-asset-trade-client | ❌ | N/A | N/A | N/A |
| cactus-example-electricity-trade | ❌ | N/A | N/A | N/A |
| cactus-example-supply-chain-backend | − |  |  |  |
| cactus-example-supply-chain-business-logic-plugin | − |  |  |  |
| cactus-example-supply-chain-frontend | − |  |  |  |
| cactus-workshop-examples-2022-11-14 | ✓ |  |  |  |
| carbon-accounting | − |  |  |  |
| test-run-transaction | ❌ | N/A | N/A | N/A |

