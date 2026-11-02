# CI Triage Report — PR #4787 (security-review, npm advisories + openapi-generator 7.26.0)

- **Date:** 2026-10-15 (iteration 5, head 4ed342272; iterations 1-4 below)
- **Run:** [38653123555](https://github.com/hyperledger-cacti/cacti/actions/runs/38653123555)
- **Rollup:** 117 success / 3 failure / 29 skipped
- **Fix state:** gradle wrapper fix staged (6 files).

## Summary (iteration 5)

| Failing job | Bucket | PR-caused | Root cause |
|---|---|---|---|
| connector-packages / cpl-connector-corda | PR regression — **FIXED in staging** | YES | Not transient after all (iteration-4 reclassification). The 7.26 kotlin-spring regen replaced the generated Gradle wrapper with **8.1.1**; the workflow's runner-level `./gradlew clean build` step (JDK 17) then fails deterministically in Gradle's jar cache: `Failed to create Jar file .../jars-9/.../spring-core-6.2.2.jar` — reproducible in the `gradle:8.1.1-jdk17-jammy` image with the identical error/hash, while Gradle **8.12.1** builds the same sources green (spring boot 3.4.2's plugin requires Gradle ≥ 8.4). The docker builder stage (`gradle:8.12.1` image) was never affected, which is why the jest-built images passed. Fix: wrapper regenerated at 8.12.1 (`gradle wrapper --gradle-version 8.12.1`), wrapper files ignore-listed (same pattern as kotlin-client), `.openapi-generator/FILES` regenerated via full `yarn codegen`. CI's exact command verified green locally through the new wrapper. |
| connector-packages / cpl-connector-besu | GHA/test flake | NO | `get-record-locator.test.ts` fails with `Returned error: Nonce too low` (14s into the suite) — Besu test-ledger transaction race; all other besu suites passed. Passed on the two previous heads of this PR. Re-run. |
| satp-hermes-workflow / run-satp-tests-integration-gateway | Pre-existing on base | NO | Same 3 e2e suites (Besu→Ethereum transfers), unchanged since base aa389d7d8. |

## Recommended actions

1. Amend the staged wrapper fix into the PR commit and push.
2. Re-run cpl-connector-besu (nonce flake). satp gateway remains pre-existing on base.

---

# Iteration 4 (2026-10-14, head 9b092974a) — historical

| Failing job | Bucket | PR-caused | Root cause |
|---|---|---|---|
| code-quality-checks / yarn_codegen | PR regression — **FIXED in staging** | YES | The full `yarn codegen` pipeline regenerates the kotlin-spring `FILES` manifest, which still listed the deleted generated test `ApiApiTest.kt` (iteration 3 removed the file and ignore-listed it, but the manifest was committed before that). Regenerated the manifest locally via the full `yarn codegen` pipeline (exit 0; every other generated file byte-identical to the committed tree — confirming the protoc-gen-ts runtime outputs are consistent with the pipeline). One-line diff staged. |
| connector-packages / cpl-connector-corda | GHA infra transient | NO | Gradle configuration phase died with `Failed to create Jar file ~/.gradle/caches/jars-9/.../spring-core-6.2.2.jar` — runner-side jar-cache write failure. Versions are deterministic (spring boot 3.4.2 pins in the generator-ignored build.gradle.kts) and the identical `gradle clean build` succeeded locally in the CI builder image. Re-run; no repo change available (workflows off-limits). |
| satp-hermes-workflow / run-satp-tests-integration-gateway | Pre-existing on base | NO | Same 3 e2e suites (Besu→Ethereum transfers) as iteration 3 — unchanged. |

## Recommended actions

1. Amend the staged `FILES` manifest into the PR commit and push.
2. Re-run cpl-connector-corda (transient). The satp gateway job is pre-existing on base.

---

# Iteration 3 (2026-10-14, head 28a19b352) — historical

The amended head `28a19b352` carries the iteration-2 fixes: build-dev, nuclei-scan,
data-sharing and asset-exchange-besu are all **green** now. With build-dev passing,
the packages-workflow matrix ran the copm/corda jobs that the previous head's
build-dev failure had cascaded into `skipped` — exposing two latent Kotlin breaks
from the 7.26 migration that had never actually been compiled by CI:

| Failing job | Bucket | PR-caused | Root cause |
|---|---|---|---|
| cp-copm / pledge-getview-corda-corda, -corda-fabric, -fabric-corda, lock-corda | PR regression (latent, newly compiled) — **FIXED in staging** | YES | `ApiCopmCordaServiceImpl.noopV1` still overrode with return type `Empty`; the regenerated grpc-kotlin stub demands `DefaultServiceOuterClass.NoopV1Response` (oneof wrapper, `empty_200` case). Iteration 1 migrated the asset-op overrides but missed `noopV1`; the build-dev cascade meant CI never compiled it until now. |
| connector-packages / cpl-connector-corda, ghcr-workflow / ghcr-connector-corda-server | PR regression (latent, newly compiled) — **FIXED in staging** | YES | The 7.26 kotlin-spring generator renamed the server service interface `ApiPluginLedgerConnectorCordaService` → `ApiApiService` (the 6.6.0 `apiSuffix` option is gone). The regen replaced the api/ classes but the generator preserves the hand-written `ApiPluginLedgerConnectorCordaServiceImpl`, which still implemented the old name → 17 "overrides nothing"/unresolved-reference errors. Additionally the regen emitted a stock `ApiApiTest.kt` instantiating a nonexistent `ApiApiServiceImpl`. Reproduced locally via `gradle:8.12.1-jdk17-jammy`; `gradle clean build` now **BUILD SUCCESSFUL**. |
| code-quality-checks / yarn_lint | PR regression — **FIXED in staging** | YES | cspell: "oneof" (singular) in a new cmd-api-server test comment; only "oneofs" was in the dictionary. Added "oneof" to `.cspell.json`. |
| other-packages / cp-bungee-hermes | GHA infra flake | NO | `ghcr.io` image pulls timing out (`Get "https://ghcr.io/v2/": context deadline exceeded` ×5 retries) — runner-side network degradation in this run. Re-run. |
| satp-hermes-workflow / run-satp-tests-integration-gateway | Pre-existing on base | NO | 3 e2e transfer suites fail (Besu→Ethereum "should realize a transfer", getTransactionReceipt polling). Same job already failed on base aa389d7d8 in the iteration-1 round; it was skipped (never ran) on the intermediate heads. |

## Fixes applied (iteration 3, staged)

1. `ApiCopmCordaServiceImpl.noopV1` returns
   `NoopV1Response.newBuilder().setEmpty200(Empty.getDefaultInstance()).build()`
   (mirrors the four already-compiling endpoint wrappers; local kotlinc verification
   is blocked by a Docker-VM stack-overflow quirk unrelated to the change — the
   original code also SOEs locally while CI compiles this unit fine).
2. Corda connector server impl: import + supertype moved to `ApiApiService`.
   The stock generated test `ApiApiTest.kt` cannot compile against the hand-written
   impl (references nonexistent `ApiApiServiceImpl`), so it is deleted and added to
   `.openapi-generator-ignore` next to its 6.6.0-era predecessor
   `ApiPluginLedgerConnectorCordaTest.kt` (whose entry is superseded by the rename).
   Verified end-to-end: `gradle clean build` BUILD SUCCESSFUL in the CI builder image.
3. `.cspell.json`: "oneof" added next to the existing "oneofs".

## Recommended actions

1. Amend the staged fixes into the PR's single commit and push.
2. Re-run: cp-copm matrix, cpl-connector-corda, ghcr-connector-corda-server,
   cp-bungee-hermes (flake). `run-satp-tests-integration-gateway` is pre-existing
   on base — out of this PR's scope.

---

# Iteration 2 (2026-10-14, head 59ea5eafb) — historical

| Failing job | Bucket | PR-caused | Root cause |
|---|---|---|---|
| checks-and-build / build-dev | PR regression — **FIXED in staging** | YES | cmd-api-server + besu connector committed **stale protoc-gen-ts runtime outputs**: the regen commit updated the `.proto` sources (oneof wrapper responses, snake_case fields) and the `_pb.d.ts` type-def outputs, but the thesayyn `protoc-gen-ts` runtime `.ts` files were never regenerated. All downstream `Cannot find module '@hyperledger-cacti/cactus-cmd-api-server'` errors (copm-test ×6, satp-hermes ×7) are cascade. |
| nuclei-scan | PR regression — same root as build-dev | YES | The nuclei job builds (`tsc`) before scanning; failed on the identical cmd-api-server errors. No actual nuclei findings in the log. |
| data-sharing / data-sharing-docker-local (+ -success rollup) | Infra rot — **FIXED in staging** | NO (but permanent) | Relay Dockerfiles build on `rust:1.96.0-slim-bullseye`. Debian 11 LTS ended 2026-08-31; deb.debian.org's bullseye-security pool is being decommissioned — `apt-get update` fetches an index that still references .debs that 404 in the pool (verified live: `perl-modules-5.32_5.32.1-4+deb11u5_all.deb` → HTTP 404). Second consecutive failing run; this will never self-heal. Fix: builder stage bumped to `rust:1.96.0-slim-bookworm` (tag verified on Docker Hub) in all 4 relay Dockerfiles. |
| asset-exchange-besu / -local (AliceERC1155) (+ -success rollup) | GHA infra flake | NO | `grpc-tools@1.13.1` prebuilt download failed (`node-precompiled-binaries.grpc.io` TLS fetch error) → yarn build failed. Known recurring flake (see playbook). Re-run. |

Previous iteration's 10 failures (copm Kotlin ×5, ghcr-connector-corda, cmd-api-server tape, cpl-connector-corda) are now **green**.

## Root cause detail (iteration 2)

### 1. Stale protoc-gen-ts runtime outputs — bin-name collision

The package codegen chain is `proto:openapi` (openapi-generator → `.proto`) then
`proto:protoc-gen-ts` (`grpc_tools_node_protoc --plugin=protoc-gen-ts=$(yarn bin protoc-gen-ts)`).

Two packages ship a `protoc-gen-ts` bin:

- `protoc-gen-ts@0.8.7` (thesayyn) — full-runtime `.ts` (the committed `default_service.ts` etc.)
- `grpc_tools_node_protoc_ts@5.3.3` — proto-loader **type definitions** (`*_pb.d.ts`)

`yarn bin protoc-gen-ts` resolves to **5.3.3** in this pnpm-linker workspace, so the
Oct-12 regen updated the `.d.ts` files and protos but silently skipped the runtime
`.ts` files. Evidence: the committed `_pb.d.ts` files match a fresh 5.3.3 run
byte-for-byte against the new protos, while the runtime `.ts` still carried 6.6.0-era
flat responses (no `GetHealthCheckV1Response`, camelCase fields, old field numbers).

Fix applied:

- Regenerated runtime outputs with thesayyn 0.8.7 invoked explicitly
  (cmd-api-server ×3 files, besu connector ×37 files).
- `grpc-server-api-server.ts`: wrapper response types
  (`GetHealthCheckV1Response`, `health_check_response_pb_200 = …`, `string_200 = …`)
  and snake_case constructor keys (`created_at`, `memory_usage`, `heap_total`, …).
- `besu-grpc-svc-open-api.ts`: all 12 method signatures moved from flat
  `XxxResponsePB` to the service-level wrapper responses; `GetBlockV1` now wraps
  its result (`get_block_v1_response_pb_200`).
- `get-block-v1-grpc.ts`: `get_block_v1_request_pb.block_hash_or_block_number`.
- Tests migrated to the wrapper surface: cmd-api-server proto-loader tape test
  (unwrap oneof, keepCase snake_case), protoc-gen-ts jest test, m-tls tape test,
  besu `connector-besu-grpc-services.test.ts` (request keys + response unwrap).

Verified: `yarn tsc` 0 errors; jest healthcheck suite passes; both tape suites pass
(14/14 and 11/11) — including `res1.health_check_response_pb_200.created_at truthy`,
the original iteration-1 failure; besu unit suites 8/8 under jest.

### 2. Enum-model regression in the 7.26 protobuf-schema template — FIXED in staging

Stock 7.26 `enum.mustache` wraps standalone enum models in a container message
(`message WatchBlocksV1PB { enum Enum { … } }`) "to avoid package-scope value-name
collisions". This repo's `model.mustache` emits bare model-name references for
enum-typed properties, so four besu enum models (`ReceiptTypePB`,
`EthContractInvocationTypePB`, `Web3SigningCredentialTypePB`, `WatchBlocksV1PB`)
silently became message names, degrading five fields (`receipt_type`,
`invocation_type`, 3× signing-credential `type`, `event`) from enum to message
fields — wrong wire format, and `WatchBlocksV1RequestPB.event` unusable
(the unsubscribe comparison can never be true). Main (6.6.0) emits these as
top-level enums.

Fix applied: local `enum.mustache` partial (top-level enum, 7.26 variables) added
to all four template copies (besu connector, cmd-api-server, keychain-memory,
copm-core); besu protos + protoc-gen-ts outputs regenerated. Value names are
per-model prefixed (`RECEIPT_TYPE_P_B_*`), so package-scope hoisting is collision-free;
the affected fields return to main's wire-compatible enum encoding.

## Recommended actions

1. Commit the staged fixes (amend into the PR's single commit per Rafael's workflow).
2. Re-run failed workflows: `checks-and-build`, `nuclei-scan`, `data-sharing`,
   `asset-exchange-besu` (the last only for the grpc-tools flake).
3. Watch the besu gRPC integration suite (`connector-besu-grpc-services`) on the
   next CI round — migrated blind (needs a live Besu ledger; not runnable locally here).

## Pre-existing vs PR-caused (iteration 2)

- **PR-caused:** build-dev, nuclei-scan (stale generated outputs + consumer drift).
- **Environment:** data-sharing (bullseye EOL — affects any PR touching these images),
  asset-exchange-besu (grpc-tools prebuilt flake, recurring).

---

# Iteration 1 (2026-10-12) — historical

- **PR head:** 18bb50f59 (base aa389d7d8 = upstream/main)
- **Runs:** [38282628846](https://github.com/hyperledger-cacti/cacti/actions/runs/38282628846) (packages), [38282628197](https://github.com/hyperledger-cacti/cacti/actions/runs/38282628197) (data-sharing)
- **Rollup:** 105 success / 10 failure / 2 in-progress / 32 skipped

| Failing job | Bucket | PR-caused | Root cause |
|---|---|---|---|
| cp-copm / pledge-getview-corda-corda, -corda-fabric, -fabric-corda | PR regression | YES | Kotlin copm-corda sources not migrated: `Unresolved reference: assetPledgeClaimV1PB` etc. — 7.26 regen renamed request proto fields to snake_case, Kotlin validators still use old camel-PB names |
| cp-copm / lock-corda | PR regression | YES | Same Kotlin cascade + `ApiCopmCordaServiceImpl` overrides no longer subtypes: grpc-kotlin stubs now return `XxxV1Response` oneof wrappers, impls return flat `Xxx1200ResponsePB` |
| cp-copm / lock-fabric | PR regression | YES | `copm-fabric` TS `ServiceImpl` still returns flat `Xxx1200ResponsePB`; connect client now wraps responses, copm-test `unwrapResponse()` sees `unexpected empty response wrapper: {}` |
| packages-workflow / cpl-connector-corda | PR regression (verify after Kotlin fix) | YES (likely) | Corda connector build compiles the regenerated Kotlin/proto surface (same casing cascade) |
| packages-workflow / cactus-cmd-api-server | PR regression | YES | tape `grpc-js-proto-loader-client-healthcheck`: `not ok 8 res1.createdAt truthy OK` (actual: undefined) — server returned flat PB against the wrapped proto (fixed in iteration 1, superseded by iteration 2 regen) |
| ghcr-workflow / ghcr-connector-corda-server | PR regression | YES | Docker image gradle build compiles the same Kotlin sources |
| data-sharing / data-sharing-docker-local, -success | GHA infra flake | NO | debian bullseye-security apt 404s (see iteration 2: permanent, fixed) |

Iteration-1 fixes that landed (all green in iteration 2): Kotlin field-casing
migration, Kotlin response-wrapper migration, TS copm-fabric wrapper migration,
cmd-api-server grpc-server wrapper migration.
