# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.0.0-alpha.2](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2023-09-27)

### Bug Fixes

* **security:** crash in HeaderParser in dicer ([77fb559](https://github.com/hyperledger/cacti/commit/77fb559532448aae45cfe704da2637119bf93c27))
* use common conventions: tsconfig.json, package.json ([50f5c02](https://github.com/hyperledger/cacti/commit/50f5c02190ba28b77492c09e81f5d5ba6578e862)), closes [#2216](https://github.com/hyperledger/cacti/issues/2216)

### Features

* **openapi:** upgrade to 6.3.0 phase1 ([a094614](https://github.com/hyperledger/cacti/commit/a094614877d6043a6e3e8c0b3e95203eed7d6203)), closes [#2298](https://github.com/hyperledger/cacti/issues/2298)

# [2.0.0-alpha.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha-prerelease...v2.0.0-alpha.1) (2023-05-19)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-corda

# [2.0.0-alpha-prerelease](https://github.com/hyperledger/cacti/compare/v1.2.0...v2.0.0-alpha-prerelease) (2023-05-11)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-corda

# [1.2.0](https://github.com/hyperledger/cactus/compare/v1.1.3...v1.2.0) (2023-03-28)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-corda

## [1.1.3](https://github.com/hyperledger/cactus/compare/v1.1.2...v1.1.3) (2022-12-08)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-corda

## [1.1.2](https://github.com/hyperledger/cactus/compare/v1.1.1...v1.1.2) (2022-11-11)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-corda

## [1.1.1](https://github.com/hyperledger/cactus/compare/v1.1.0...v1.1.1) (2022-11-03)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-corda

# [1.1.0](https://github.com/hyperledger/cactus/compare/v1.0.0...v1.1.0) (2022-10-17)

### Features

* **corda4:** implement monitoring of state changes ([865ec2f](https://github.com/hyperledger/cactus/commit/865ec2f097df73e4907d812b18c2acf25e7896b1)), closes [#1610](https://github.com/hyperledger/cactus/issues/1610)

# [1.0.0](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.3...v1.0.0) (2022-03-16)

### Features

* **connector-corda:** enable Flow Database Access CorDapp ([60dfe1a](https://github.com/hyperledger/cactus/commit/60dfe1a772d06436132f79bf3e89589e181a783e)), closes [#1493](https://github.com/hyperledger/cactus/issues/1493)
* **connector-corda:** read privateKey from filesystem ([e7e39fd](https://github.com/hyperledger/cactus/commit/e7e39fd5f7ef2d6ec49b4ebebde35875bbf1df44)), closes [#789](https://github.com/hyperledger/cactus/issues/789)

# [1.0.0-rc.3](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2021-12-07)

### Bug Fixes

* endpoints implementation in corda plugin ([21a22b5](https://github.com/hyperledger/cactus/commit/21a22b574fb2e08c8c69106a6b3ecf1cb252c654)), closes [#1346](https://github.com/hyperledger/cactus/issues/1346)
* openapi validation for corda server endpoints ([21fc5ba](https://github.com/hyperledger/cactus/commit/21fc5ba874e0d1974a7e9524aff5103bb8af4b53))

# [1.0.0-rc.2](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2021-11-01)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-corda

# [1.0.0-rc.1](https://github.com/hyperledger/cactus/compare/v0.10.0...v1.0.0-rc.1) (2021-10-11)

### Bug Fixes

* **webpack:** prod build chokes on upgraded ssh2 binaries [#1405](https://github.com/hyperledger/cactus/issues/1405) ([18979fb](https://github.com/hyperledger/cactus/commit/18979fb33880d8ca30e2fda01fb3d598deb839f9))

# [0.10.0](https://github.com/hyperledger/cactus/compare/v0.9.0...v0.10.0) (2021-09-28)

### Features

* **corda:** support corda v4.8 [#889](https://github.com/hyperledger/cactus/issues/889) ([5f45813](https://github.com/hyperledger/cactus/commit/5f45813efd98507a59e8f6a84417819bc0c80742))
* **core-api:** discontinue dedicated HTTP listeners for web service plugins ([3fbd2fc](https://github.com/hyperledger/cactus/commit/3fbd2fcb60d49090bf4e986bea74d4e988348659)), closes [#358](https://github.com/hyperledger/cactus/issues/358)
* **core:** add installOpenapiValidationMiddleware ([1f6ea5f](https://github.com/hyperledger/cactus/commit/1f6ea5fe3aa1ba997a655098d632034f13f232a5)), closes [#847](https://github.com/hyperledger/cactus/issues/847)

# [0.9.0](https://github.com/hyperledger/cactus/compare/v0.8.0...v0.9.0) (2021-08-31)

### Features

* **corda:** resolves [#888](https://github.com/hyperledger/cactus/issues/888) ([d4af647](https://github.com/hyperledger/cactus/commit/d4af647f96b9eda592ffe1797679e086e32a039d))

# [0.8.0](https://github.com/hyperledger/cactus/compare/v0.7.0...v0.8.0) (2021-08-17)

### Bug Fixes

* **prometheus:** metrics.ts leaks to global registry [#1202](https://github.com/hyperledger/cactus/issues/1202) ([ce076d7](https://github.com/hyperledger/cactus/commit/ce076d709f8e0cba143f8fe9d71f1de1df8f71dc))

# [0.7.0](https://github.com/hyperledger/cactus/compare/v0.6.0...v0.7.0) (2021-08-04)

### Bug Fixes

* **connector-corda:** fix build broken by operationId rename ([291dd3b](https://github.com/hyperledger/cactus/commit/291dd3bc666939fffbc3780eaefd9059c756878a))

# [0.6.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.6.0) (2021-07-19)

### Bug Fixes

* **connector-corda:** container image kotlin compilation fails in model ([a8a4531](https://github.com/hyperledger/cactus/commit/a8a4531d379fe16d4c991802525ec573a7e3ede1))
* **connector-corda:** kotlin compilation error due to missing method ([403f135](https://github.com/hyperledger/cactus/commit/403f13592734cfdcbbfa3714b76a9557aaa4a8b4))

### Features

* **corda:** prometheus exporter metrics integration ([9f37755](https://github.com/hyperledger/cactus/commit/9f3775580381cbdf314c6a75188114315d1844c6)), closes [#535](https://github.com/hyperledger/cactus/issues/535)
* **core-api:** decouple web service install & registration [#771](https://github.com/hyperledger/cactus/issues/771) ([b50e148](https://github.com/hyperledger/cactus/commit/b50e148f43c0b27138471c972aab391486e761e6))
* **core-api:** hasTransactionFinality() on connector API [#354](https://github.com/hyperledger/cactus/issues/354) ([a2d0582](https://github.com/hyperledger/cactus/commit/a2d058218780e5e4c81e5f847cc875879a946e3f))
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))
* **core-api:** plugin async initializer method ([9678c2e](https://github.com/hyperledger/cactus/commit/9678c2e9288a73589e84f9fd254c26aed6a93297))

# [0.5.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.5.0) (2021-05-19)

### Features

* **corda:** prometheus exporter metrics integration ([9f37755](https://github.com/hyperledger/cactus/commit/9f3775580381cbdf314c6a75188114315d1844c6)), closes [#535](https://github.com/hyperledger/cactus/issues/535)
* **core-api:** decouple web service install & registration [#771](https://github.com/hyperledger/cactus/issues/771) ([b50e148](https://github.com/hyperledger/cactus/commit/b50e148f43c0b27138471c972aab391486e761e6))
* **core-api:** hasTransactionFinality() on connector API [#354](https://github.com/hyperledger/cactus/issues/354) ([a2d0582](https://github.com/hyperledger/cactus/commit/a2d058218780e5e4c81e5f847cc875879a946e3f))
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))

## [0.4.1](https://github.com/hyperledger/cactus/compare/v0.4.0...v0.4.1) (2021-04-02)

### Bug Fixes

* **connector-corda:** regenerate kotlin backend with correct version ([34f8e17](https://github.com/hyperledger/cactus/commit/34f8e17a06a8b58647e8d5e59b9d32d15ef6c8ef))

### Features

* **corda-connector:** dsl to support collections, enums [#622](https://github.com/hyperledger/cactus/issues/622) ([78e6754](https://github.com/hyperledger/cactus/commit/78e675424ebed5bb36e5d076252a05a424e5a170))

# [0.4.0](https://github.com/hyperledger/cactus/compare/v0.3.0...v0.4.0) (2021-03-30)

### Bug Fixes

* **ci:** disk full issues on GitHub Action Workflow runner [#698](https://github.com/hyperledger/cactus/issues/698) ([61e3f76](https://github.com/hyperledger/cactus/commit/61e3f76ed910c9b04b36f995456213018cc0e7ba))
* **general:** fixed unused deps and updated them ([b76a970](https://github.com/hyperledger/cactus/commit/b76a9703341c5a4cabe056e743338cbedebbeaad))

### Features

* **corda:** add Corda ledger support ([5623369](https://github.com/hyperledger/cactus/commit/5623369aa3b5f3b75cbafb58499b24da6efc896d))
* **corda-connector:** list flows endpoint [#624](https://github.com/hyperledger/cactus/issues/624) ([438dcda](https://github.com/hyperledger/cactus/commit/438dcda8ff9c44f8d98515e6ff5aee7daec2179d))
* **corda-connector:** node diagnostics endpoint [#623](https://github.com/hyperledger/cactus/issues/623) ([edb8eac](https://github.com/hyperledger/cactus/commit/edb8eac3f2b6e9dfc62f4278f2ec11b8130e9344))
* **corda-connector:** params factory pattern support [#620](https://github.com/hyperledger/cactus/issues/620) ([0c3e58c](https://github.com/hyperledger/cactus/commit/0c3e58c4d1acd90d480682c7a4dfd77b95980948))
* **corda-connector:** scp jars to nodes [#621](https://github.com/hyperledger/cactus/issues/621) ([c966769](https://github.com/hyperledger/cactus/commit/c966769ec7654596eea36d1fbc56cbf20d4e2233))
* **test-tooling:** add corda AIO emitContainerLogs option ([13fe677](https://github.com/hyperledger/cactus/commit/13fe67782addaccabec1d24bb2032da2d8ea3f94))
