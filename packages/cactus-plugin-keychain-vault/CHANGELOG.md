# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.1.0](https://github.com/hyperledger/cacti/compare/v2.0.0...v2.1.0) (2024-12-01)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-vault

# [2.0.0](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.7...v2.0.0) (2024-10-15)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-vault

# [2.0.0-rc.6](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.5...v2.0.0-rc.6) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-vault

# [2.0.0-rc.5](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.4...v2.0.0-rc.5) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-vault

# [2.0.0-rc.4](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.3...v2.0.0-rc.4) (2024-09-08)

### Bug Fixes

* **security:** address CVE-2024-39338 SSRF in axios >= 1.3.2, <= 1.7.3 ([7e7bb44](https://github.com/hyperledger/cacti/commit/7e7bb44c01a2d19306ecaaaa2ba2e3c574039c87))

# [2.0.0-rc.3](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.2...v2.0.0-rc.3) (2024-07-21)

### Build System

* bump uuid@10.0.0 fs-extra@11.2.0 @bufbuild/protobuf@1.10.0 ([9970352](https://github.com/hyperledger/cacti/commit/997035216694fe335215b8a3586488ac8c12447f))

### BREAKING CHANGES

* Renamed classes to fix typos in their name: `PluginFactoryPersistanceFabric`
This is being done in this pull request because for some reason (that I still don't understand)
the spell checker started failing on these only in the context of this pull request.
The typos were present on the main branch already somehow having passed spellchecking earlier
and every other time since then.

And also
- prom-clien@15.1.3
- del-cli@5.1.0
- cspell@8.10.4
- del-cli@5.1.0

Quality of life improvements and also hoping to get rid of a few of the
vulnerable dependency versions we have in the codebase according to
dependabot.

More similar changes are coming in with further upgrades but I want to
avoid making bigger changes in one go so that it's easier to hunt down
bugs later if something only gets discovered after we've merged a bunch
of these.

Signed-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>

# [2.0.0-rc.2](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.1...v2.0.0-rc.2) (2024-07-03)

### Bug Fixes

* **deps:** fix batch of missing production dependencies v2.0.0-rc.1 ([51d64ee](https://github.com/hyperledger/cacti/commit/51d64eead473d928086eb53adf0850c3b43cbda9)), closes [#3344](https://github.com/hyperledger/cacti/issues/3344)

# [2.0.0-rc.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.2...v2.0.0-rc.1) (2024-06-14)

### Bug Fixes

* **deps:** bulk add missing dependencies - 2023-11-02 ([8addb01](https://github.com/hyperledger/cacti/commit/8addb018b6d124d54d9d948bbaeba6ea33b67153)), closes [#2857](https://github.com/hyperledger/cacti/issues/2857)
* **plugin-keychain-vault:** fix CVE-2024-0553 in vault server image ([1eacf7e](https://github.com/hyperledger/cacti/commit/1eacf7e2a33349de794d486a47cc6bd62d93311a))
* **security:** address CVE-2021-3749 - axios >=0.22.0 ([61fc700](https://github.com/hyperledger/cacti/commit/61fc7001b1dd0849ab1d9bcab08e2475c695adae))
* **security:** remediate qs vulnerability CVE-2022-24999 ([536b6b1](https://github.com/hyperledger/cacti/commit/536b6b1b7ab9014ebcd6b162e1a467e78b52afdd))

# [2.0.0-alpha.2](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2023-09-27)

### Bug Fixes

* **security:** crash in HeaderParser in dicer ([77fb559](https://github.com/hyperledger/cacti/commit/77fb559532448aae45cfe704da2637119bf93c27))
* use common conventions: tsconfig.json, package.json ([50f5c02](https://github.com/hyperledger/cacti/commit/50f5c02190ba28b77492c09e81f5d5ba6578e862)), closes [#2216](https://github.com/hyperledger/cacti/issues/2216)

### Features

* **openapi:** upgrade to 6.3.0 phase1 ([a094614](https://github.com/hyperledger/cacti/commit/a094614877d6043a6e3e8c0b3e95203eed7d6203)), closes [#2298](https://github.com/hyperledger/cacti/issues/2298)

# [2.0.0-alpha.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha-prerelease...v2.0.0-alpha.1) (2023-05-19)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-vault

# [2.0.0-alpha-prerelease](https://github.com/hyperledger/cacti/compare/v1.2.0...v2.0.0-alpha-prerelease) (2023-05-11)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-vault

# [1.2.0](https://github.com/hyperledger/cactus/compare/v1.1.3...v1.2.0) (2023-03-28)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-vault

## [1.1.3](https://github.com/hyperledger/cactus/compare/v1.1.2...v1.1.3) (2022-12-08)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-vault

## [1.1.2](https://github.com/hyperledger/cactus/compare/v1.1.1...v1.1.2) (2022-11-11)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-vault

## [1.1.1](https://github.com/hyperledger/cactus/compare/v1.1.0...v1.1.1) (2022-11-03)

### Bug Fixes

* **plugin-keychain-vault:** hyper upgrade ([3062343](https://github.com/hyperledger/cactus/commit/3062343d47a492d6a15f7189a72e6ab3bb6a52f2)), closes [#2120](https://github.com/hyperledger/cactus/issues/2120)

# [1.1.0](https://github.com/hyperledger/cactus/compare/v1.0.0...v1.1.0) (2022-10-17)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-vault

# [1.0.0](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.3...v1.0.0) (2022-03-16)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-vault

# [1.0.0-rc.3](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2021-12-07)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-vault

# [1.0.0-rc.2](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2021-11-01)

### Bug Fixes

* **lint:** fix issue [#1359](https://github.com/hyperledger/cactus/issues/1359) ([f7eb39b](https://github.com/hyperledger/cactus/commit/f7eb39bb1392b2762adac3a189da071249f4eca3))
* **lint:** fix issue [#1359](https://github.com/hyperledger/cactus/issues/1359) ([d067df2](https://github.com/hyperledger/cactus/commit/d067df29db21325ba9b29b52d244066fce0e3a02))

# [1.0.0-rc.1](https://github.com/hyperledger/cactus/compare/v0.10.0...v1.0.0-rc.1) (2021-10-11)

### Bug Fixes

* **webpack:** prod build chokes on upgraded ssh2 binaries [#1405](https://github.com/hyperledger/cactus/issues/1405) ([18979fb](https://github.com/hyperledger/cactus/commit/18979fb33880d8ca30e2fda01fb3d598deb839f9))

# [0.10.0](https://github.com/hyperledger/cactus/compare/v0.9.0...v0.10.0) (2021-09-28)

### Bug Fixes

* openapi validation test for keychain-vault plugin ([6630ebe](https://github.com/hyperledger/cactus/commit/6630ebed4c2d4c7aa3ddd6c5e306b9bb1613f827)), closes [#1329](https://github.com/hyperledger/cactus/issues/1329) [#847](https://github.com/hyperledger/cactus/issues/847)

### Features

* **core-api:** discontinue dedicated HTTP listeners for web service plugins ([3fbd2fc](https://github.com/hyperledger/cactus/commit/3fbd2fcb60d49090bf4e986bea74d4e988348659)), closes [#358](https://github.com/hyperledger/cactus/issues/358)
* **core:** add installOpenapiValidationMiddleware ([1f6ea5f](https://github.com/hyperledger/cactus/commit/1f6ea5fe3aa1ba997a655098d632034f13f232a5)), closes [#847](https://github.com/hyperledger/cactus/issues/847)

# [0.9.0](https://github.com/hyperledger/cactus/compare/v0.8.0...v0.9.0) (2021-08-31)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-vault

# [0.8.0](https://github.com/hyperledger/cactus/compare/v0.7.0...v0.8.0) (2021-08-17)

### Bug Fixes

* **prometheus:** metrics.ts leaks to global registry [#1202](https://github.com/hyperledger/cactus/issues/1202) ([ce076d7](https://github.com/hyperledger/cactus/commit/ce076d709f8e0cba143f8fe9d71f1de1df8f71dc))

# [0.7.0](https://github.com/hyperledger/cactus/compare/v0.6.0...v0.7.0) (2021-08-04)

### Bug Fixes

* **connector-corda:** fix build broken by operationId rename ([291dd3b](https://github.com/hyperledger/cactus/commit/291dd3bc666939fffbc3780eaefd9059c756878a))

### Features

* **aws-sm:** added keychain plugin for aws secret manager ([ed6db9e](https://github.com/hyperledger/cactus/commit/ed6db9edc2064046308be91b73f620cbb2a6fb58)), closes [#912](https://github.com/hyperledger/cactus/issues/912)

# [0.6.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.6.0) (2021-07-19)

### Bug Fixes

* **connector-corda:** container image kotlin compilation fails in model ([a8a4531](https://github.com/hyperledger/cactus/commit/a8a4531d379fe16d4c991802525ec573a7e3ede1))

### Features

* **core-api:** decouple web service install & registration [#771](https://github.com/hyperledger/cactus/issues/771) ([b50e148](https://github.com/hyperledger/cactus/commit/b50e148f43c0b27138471c972aab391486e761e6))
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))
* **core-api:** plugin async initializer method ([9678c2e](https://github.com/hyperledger/cactus/commit/9678c2e9288a73589e84f9fd254c26aed6a93297))
* **core-api:** plugin interface async initializer ([d40f68b](https://github.com/hyperledger/cactus/commit/d40f68bd9eaff498df8514fe7397986b5a2f865d))
* **keychain-vault:** add the missing endpoint classes [#676](https://github.com/hyperledger/cactus/issues/676) ([341cffc](https://github.com/hyperledger/cactus/commit/341cffcef72286169a4ceced69414618d5059d0e))

# [0.5.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.5.0) (2021-05-19)

### Features

* **core-api:** decouple web service install & registration [#771](https://github.com/hyperledger/cactus/issues/771) ([b50e148](https://github.com/hyperledger/cactus/commit/b50e148f43c0b27138471c972aab391486e761e6))
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))

## [0.4.1](https://github.com/hyperledger/cactus/compare/v0.4.0...v0.4.1) (2021-04-02)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-vault

# [0.4.0](https://github.com/hyperledger/cactus/compare/v0.3.0...v0.4.0) (2021-03-30)

### Bug Fixes

* **keychain-vault:** add missing license to openapi.json ([70dcb7f](https://github.com/hyperledger/cactus/commit/70dcb7fab3ba5bf4a1ecc49c3ee997c3b0ef170f)), closes [#493](https://github.com/hyperledger/cactus/issues/493)

### Features

* **keychain:** add rust keychain plugin vault implementation ([6dcdb8a](https://github.com/hyperledger/cactus/commit/6dcdb8a02db30e4dfe3d912bd56d5979b0cb3bc3))
* **keychain:** implement OpenAPI endpoints ([3a0acf4](https://github.com/hyperledger/cactus/commit/3a0acf4cb350a286500aa80ed4ac5d15f9501ea4))
* **keychain-vault:** add prometheus exporter ([fea547f](https://github.com/hyperledger/cactus/commit/fea547fdf9992ffa444274e7d7f9199a671dd71e)), closes [#536](https://github.com/hyperledger/cactus/issues/536)
