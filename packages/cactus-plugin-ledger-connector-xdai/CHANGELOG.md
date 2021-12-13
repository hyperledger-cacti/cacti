# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
