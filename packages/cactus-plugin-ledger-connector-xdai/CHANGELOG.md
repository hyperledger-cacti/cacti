# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.0.0-rc.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.2...v2.0.0-rc.1) (2024-06-14)

### Bug Fixes

* **deps:** bulk add missing dependencies - 2023-11-02 ([8addb01](https://github.com/hyperledger/cacti/commit/8addb018b6d124d54d9d948bbaeba6ea33b67153)), closes [#2857](https://github.com/hyperledger/cacti/issues/2857)
* **security:** address CVE-2021-3749 - axios >=0.22.0 ([61fc700](https://github.com/hyperledger/cacti/commit/61fc7001b1dd0849ab1d9bcab08e2475c695adae))
* **security:** remediate qs vulnerability CVE-2022-24999 ([536b6b1](https://github.com/hyperledger/cacti/commit/536b6b1b7ab9014ebcd6b162e1a467e78b52afdd))

# [2.0.0-alpha.2](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2023-09-27)

### Bug Fixes

* **security:** crash in HeaderParser in dicer ([77fb559](https://github.com/hyperledger/cacti/commit/77fb559532448aae45cfe704da2637119bf93c27))
* use common conventions: tsconfig.json, package.json ([50f5c02](https://github.com/hyperledger/cacti/commit/50f5c02190ba28b77492c09e81f5d5ba6578e862)), closes [#2216](https://github.com/hyperledger/cacti/issues/2216)

# [2.0.0-alpha.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha-prerelease...v2.0.0-alpha.1) (2023-05-19)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-xdai

# [2.0.0-alpha-prerelease](https://github.com/hyperledger/cacti/compare/v1.2.0...v2.0.0-alpha-prerelease) (2023-05-11)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-xdai

# [1.2.0](https://github.com/hyperledger/cactus/compare/v1.1.3...v1.2.0) (2023-03-28)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-xdai

## [1.1.3](https://github.com/hyperledger/cactus/compare/v1.1.2...v1.1.3) (2022-12-08)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-xdai

## [1.1.2](https://github.com/hyperledger/cactus/compare/v1.1.1...v1.1.2) (2022-11-11)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-xdai

## [1.1.1](https://github.com/hyperledger/cactus/compare/v1.1.0...v1.1.1) (2022-11-03)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-xdai

# [1.1.0](https://github.com/hyperledger/cactus/compare/v1.0.0...v1.1.0) (2022-10-17)

### Bug Fixes

* **security:** close DDoS vulnerability in eth tx consistenty strategy ([64b61a7](https://github.com/hyperledger/cactus/commit/64b61a742a885f0027543bc620b5db08b5444669)), closes [#2001](https://github.com/hyperledger/cactus/issues/2001)

# [1.0.0](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.3...v1.0.0) (2022-03-16)

### Bug Fixes

* **connector-besu/quorum/xdai:** unvalidated dynamic method call ([bdc1aba](https://github.com/hyperledger/cactus/commit/bdc1aba982cc2ec1a74b0458c98ceeacc7acb9e7)), closes [#1911](https://github.com/hyperledger/cactus/issues/1911)

### Features

* **connector-xdai:** remove hard dependency on keychain ([da793c5](https://github.com/hyperledger/cactus/commit/da793c568260fd70b80f855833bc60c116099a65)), closes [#1162](https://github.com/hyperledger/cactus/issues/1162)

# [1.0.0-rc.3](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2021-12-07)

### Bug Fixes

* fixes 1445 and implementing correct interface types ([9022064](https://github.com/hyperledger/cactus/commit/9022064e245a92f71d2d303d77bfdaf64d1b1678)), closes [#1445](https://github.com/hyperledger/cactus/issues/1445)

# [1.0.0-rc.2](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2021-11-01)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-xdai

# [1.0.0-rc.1](https://github.com/hyperledger/cactus/compare/v0.10.0...v1.0.0-rc.1) (2021-10-11)

### Bug Fixes

* **webpack:** prod build chokes on upgraded ssh2 binaries [#1405](https://github.com/hyperledger/cactus/issues/1405) ([18979fb](https://github.com/hyperledger/cactus/commit/18979fb33880d8ca30e2fda01fb3d598deb839f9))

# [0.10.0](https://github.com/hyperledger/cactus/compare/v0.9.0...v0.10.0) (2021-09-28)

### Bug Fixes

* openapi validation test for xdai plugin ([ba8a784](https://github.com/hyperledger/cactus/commit/ba8a784bb01bde2c8daf27f4a09965ea2dbb9f04)), closes [#1288](https://github.com/hyperledger/cactus/issues/1288) [#847](https://github.com/hyperledger/cactus/issues/847)

### Features

* **core-api:** discontinue dedicated HTTP listeners for web service plugins ([3fbd2fc](https://github.com/hyperledger/cactus/commit/3fbd2fcb60d49090bf4e986bea74d4e988348659)), closes [#358](https://github.com/hyperledger/cactus/issues/358)
* **core:** add installOpenapiValidationMiddleware ([1f6ea5f](https://github.com/hyperledger/cactus/commit/1f6ea5fe3aa1ba997a655098d632034f13f232a5)), closes [#847](https://github.com/hyperledger/cactus/issues/847)

# [0.9.0](https://github.com/hyperledger/cactus/compare/v0.8.0...v0.9.0) (2021-08-31)

### Features

* besu private transaction support ([53b4980](https://github.com/hyperledger/cactus/commit/53b49808615aced96b628bf1498a1b62c5c9ca42))

# [0.8.0](https://github.com/hyperledger/cactus/compare/v0.7.0...v0.8.0) (2021-08-17)

### Bug Fixes

* **prometheus:** metrics.ts leaks to global registry [#1202](https://github.com/hyperledger/cactus/issues/1202) ([ce076d7](https://github.com/hyperledger/cactus/commit/ce076d709f8e0cba143f8fe9d71f1de1df8f71dc))

# [0.7.0](https://github.com/hyperledger/cactus/compare/v0.6.0...v0.7.0) (2021-08-04)

### Bug Fixes

* **connector-corda:** fix build broken by operationId rename ([291dd3b](https://github.com/hyperledger/cactus/commit/291dd3bc666939fffbc3780eaefd9059c756878a))

# [0.6.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.6.0) (2021-07-19)

### Bug Fixes

* **connector-corda:** container image kotlin compilation fails in model ([a8a4531](https://github.com/hyperledger/cactus/commit/a8a4531d379fe16d4c991802525ec573a7e3ede1))
* **connector-xdai:** add missing hasTransactionFinality ([cc4f3e1](https://github.com/hyperledger/cactus/commit/cc4f3e141da9292b8db5b0261a3347b3ba9c0689))
* **connector-xdai:** web3.eth.estimateGas, works considering called solidity method do not throw an exception. So, for method having modifier with access control on msg.sender calling estimateGas without from field throws error.to make it work ,transactionConfig.from = web3SigningCredential.ethAccount before calling estimateGas ([63f5ff6](https://github.com/hyperledger/cactus/commit/63f5ff62b20aaf4dfdb5dd48a24dabc3342a0868))

### Features

* **connector-xdai:** add interval to pollForTxReceipt ([40be742](https://github.com/hyperledger/cactus/commit/40be74234f3bbd059fbc41f61890d25eec1d6ff8))
* **connector-xdai:** add ledger connector plugin for xdai [#852](https://github.com/hyperledger/cactus/issues/852) ([99399a3](https://github.com/hyperledger/cactus/commit/99399a3bd5020c66d2899aca500a880777b6523d))
* **core-api:** plugin async initializer method ([9678c2e](https://github.com/hyperledger/cactus/commit/9678c2e9288a73589e84f9fd254c26aed6a93297))

# [0.5.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.5.0) (2021-05-19)

### Bug Fixes

* **connector-xdai:** add missing hasTransactionFinality ([cc4f3e1](https://github.com/hyperledger/cactus/commit/cc4f3e141da9292b8db5b0261a3347b3ba9c0689))

### Features

* **connector-xdai:** add ledger connector plugin for xdai [#852](https://github.com/hyperledger/cactus/issues/852) ([99399a3](https://github.com/hyperledger/cactus/commit/99399a3bd5020c66d2899aca500a880777b6523d))
