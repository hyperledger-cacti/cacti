# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-rc.3](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2021-12-07)


### Bug Fixes

* fixes 1445 and implementing correct interface types ([9022064](https://github.com/hyperledger/cactus/commit/9022064e245a92f71d2d303d77bfdaf64d1b1678)), closes [#1445](https://github.com/hyperledger/cactus/issues/1445)


### Features

* **odap:** first implemenation for odap plugin and endpoints ([51bf753](https://github.com/hyperledger/cactus/commit/51bf753d421cdd255c178036fe901eb9c1c04130))





# [1.0.0-rc.2](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2021-11-01)


### Bug Fixes

* **lint:** fix issue [#1359](https://github.com/hyperledger/cactus/issues/1359) ([f7eb39b](https://github.com/hyperledger/cactus/commit/f7eb39bb1392b2762adac3a189da071249f4eca3))


### Features

* **htlc-coordinator:** new htlc coordinator ([28c97d3](https://github.com/hyperledger/cactus/commit/28c97d33e97fa180f1b2b65d505f5ae36a9ddc25)), closes [#953](https://github.com/hyperledger/cactus/issues/953)





# [1.0.0-rc.1](https://github.com/hyperledger/cactus/compare/v0.10.0...v1.0.0-rc.1) (2021-10-11)


### Bug Fixes

* openapi tests for besu, htlc-eth-besu and htlc-eth-besu-erc20 ([b9170e9](https://github.com/hyperledger/cactus/commit/b9170e929492f3305a420c75c7d12d06b288e0ab)), closes [#1291](https://github.com/hyperledger/cactus/issues/1291) [#847](https://github.com/hyperledger/cactus/issues/847)
* **webpack:** prod build chokes on upgraded ssh2 binaries [#1405](https://github.com/hyperledger/cactus/issues/1405) ([18979fb](https://github.com/hyperledger/cactus/commit/18979fb33880d8ca30e2fda01fb3d598deb839f9))





# [0.10.0](https://github.com/hyperledger/cactus/compare/v0.9.0...v0.10.0) (2021-09-28)


### Features

* **besu:** support besu v21.1.6 [#982](https://github.com/hyperledger/cactus/issues/982) ([d715c67](https://github.com/hyperledger/cactus/commit/d715c679fee681844f29ed30f09f6d651daf087e))
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


### Features

* **besu:** record locator ([2410d6d](https://github.com/hyperledger/cactus/commit/2410d6d4430f5b1f587befa01824a7674c6e11fa))





# [0.6.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.6.0) (2021-07-19)


### Bug Fixes

* **connector-besu:** network update only if present in keychain ([8ac2444](https://github.com/hyperledger/cactus/commit/8ac2444f86f9a1310f045ff0f7e4e78b91635be0))
* **connector-besu:** remove magic strings ([6d9ae53](https://github.com/hyperledger/cactus/commit/6d9ae53c64bd4e6c3eb33164bfa5d5507582220b)), closes [#1104](https://github.com/hyperledger/cactus/issues/1104)
* **connector-besu:** removed repeated check ([a4cb63b](https://github.com/hyperledger/cactus/commit/a4cb63b483d61578dd0d356fc0c9c20d8a2024e0))
* **connector-corda:** container image kotlin compilation fails in model ([a8a4531](https://github.com/hyperledger/cactus/commit/a8a4531d379fe16d4c991802525ec573a7e3ede1))
* **deps:** elliptic upgrade to >6.5.3 for CVE-2020-28498 ([d75b9af](https://github.com/hyperledger/cactus/commit/d75b9af764241ab2e10914769412201fb040b1ed))


### Features

* besu WatchBlocksV1Endpoint with SocketIO ([d5e1708](https://github.com/hyperledger/cactus/commit/d5e1708e84ab5192d07410d5120e144d477ef6ce))
* **besu:** add sequence diagram of run transaction endpoint ([754a11a](https://github.com/hyperledger/cactus/commit/754a11a449d9a67dd8d6ebecbeb1b65cefa71b7f)), closes [#755](https://github.com/hyperledger/cactus/issues/755)
* **connector-besu, connector-quorum:** filesystem replaced by keychain ([14d1790](https://github.com/hyperledger/cactus/commit/14d17904442723450790644653ff18dda79dfa5e))
* **connector-besu,connector-quorum:** updated ([985f12f](https://github.com/hyperledger/cactus/commit/985f12f69c52a139a72aecc9b050e71545a90df8))
* **connector-besu:** add get balance method ([db71c5c](https://github.com/hyperledger/cactus/commit/db71c5ce1af09bd1c60b9dbc841ca13c3eb75782))
* **connector-besu:** add get past logs method ([e3fcfa7](https://github.com/hyperledger/cactus/commit/e3fcfa7173667b0d3c7a4bd92a6706444e0717b1))
* **connector-besu:** add get past logs method ([c4900e9](https://github.com/hyperledger/cactus/commit/c4900e98f753e733e07170cea7003aefcee0dbdd))
* **connector-besu:** add getBalance web service ([50107f6](https://github.com/hyperledger/cactus/commit/50107f62cda1e3be688576b9074b9408757e9b49)), closes [#1066](https://github.com/hyperledger/cactus/issues/1066)
* **connector-besu:** add getBlock web service [#1065](https://github.com/hyperledger/cactus/issues/1065) ([869c48b](https://github.com/hyperledger/cactus/commit/869c48ba4d8000b50d1d64a8a0897b50dde21d5d))
* **connector-besu:** add getPastLogs web service ([c037ec5](https://github.com/hyperledger/cactus/commit/c037ec55bc07e5314cd2104579b1a882d79f1488)), closes [#1067](https://github.com/hyperledger/cactus/issues/1067)
* **connector-besu:** add getTransaction web service ([0ca0769](https://github.com/hyperledger/cactus/commit/0ca0769ac4d1c3d43afc553813cf31983e5cb1b1)), closes [#1062](https://github.com/hyperledger/cactus/issues/1062) [#1061](https://github.com/hyperledger/cactus/issues/1061)
* **connector-besu:** contract deployment with constructor arguments ([48d67a7](https://github.com/hyperledger/cactus/commit/48d67a7a7af223337777917a01002426a79f8463)), closes [#810](https://github.com/hyperledger/cactus/issues/810)
* **connector-besu:** contractAbi optional parameter ([26cf7c2](https://github.com/hyperledger/cactus/commit/26cf7c23919436ca82107b532309b5197ad2e39d))
* **connector-besu:** dockerfile ([7174004](https://github.com/hyperledger/cactus/commit/71740048eb97e2855febc96a91a5f64215591187))
* **connector-besu:** getTransaction method ([d470540](https://github.com/hyperledger/cactus/commit/d4705403b88023ecd3b7f68223215019053982cd))
* **connector-besu:** replace invokeContractV2 ([ecd62ea](https://github.com/hyperledger/cactus/commit/ecd62eac5721514dbcfc401d5f28dfdc58ef8873))
* **connector-quorum:** contractAbi optional parameter ([c79d763](https://github.com/hyperledger/cactus/commit/c79d763e0cb093647209417cfed7a2645283f302))
* **core-api:** decouple web service install & registration [#771](https://github.com/hyperledger/cactus/issues/771) ([b50e148](https://github.com/hyperledger/cactus/commit/b50e148f43c0b27138471c972aab391486e761e6))
* **core-api:** hasTransactionFinality() on connector API [#354](https://github.com/hyperledger/cactus/issues/354) ([a2d0582](https://github.com/hyperledger/cactus/commit/a2d058218780e5e4c81e5f847cc875879a946e3f))
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))
* **core-api:** plugin async initializer method ([9678c2e](https://github.com/hyperledger/cactus/commit/9678c2e9288a73589e84f9fd254c26aed6a93297))





# [0.5.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.5.0) (2021-05-19)


### Bug Fixes

* **connector-besu:** network update only if present in keychain ([8ac2444](https://github.com/hyperledger/cactus/commit/8ac2444f86f9a1310f045ff0f7e4e78b91635be0))
* **deps:** elliptic upgrade to >6.5.3 for CVE-2020-28498 ([d75b9af](https://github.com/hyperledger/cactus/commit/d75b9af764241ab2e10914769412201fb040b1ed))


### Features

* **besu:** add sequence diagram of run transaction endpoint ([754a11a](https://github.com/hyperledger/cactus/commit/754a11a449d9a67dd8d6ebecbeb1b65cefa71b7f)), closes [#755](https://github.com/hyperledger/cactus/issues/755)
* **connector-besu:** contract deployment with constructor arguments ([48d67a7](https://github.com/hyperledger/cactus/commit/48d67a7a7af223337777917a01002426a79f8463)), closes [#810](https://github.com/hyperledger/cactus/issues/810)
* **connector-besu:** contractAbi optional parameter ([26cf7c2](https://github.com/hyperledger/cactus/commit/26cf7c23919436ca82107b532309b5197ad2e39d))
* **connector-besu:** dockerfile ([7174004](https://github.com/hyperledger/cactus/commit/71740048eb97e2855febc96a91a5f64215591187))
* **connector-besu:** replace invokeContractV2 ([ecd62ea](https://github.com/hyperledger/cactus/commit/ecd62eac5721514dbcfc401d5f28dfdc58ef8873))
* **connector-besu, connector-quorum:** filesystem replaced by keychain ([14d1790](https://github.com/hyperledger/cactus/commit/14d17904442723450790644653ff18dda79dfa5e))
* **connector-besu,connector-quorum:** updated ([985f12f](https://github.com/hyperledger/cactus/commit/985f12f69c52a139a72aecc9b050e71545a90df8))
* **connector-quorum:** contractAbi optional parameter ([c79d763](https://github.com/hyperledger/cactus/commit/c79d763e0cb093647209417cfed7a2645283f302))
* **core-api:** decouple web service install & registration [#771](https://github.com/hyperledger/cactus/issues/771) ([b50e148](https://github.com/hyperledger/cactus/commit/b50e148f43c0b27138471c972aab391486e761e6))
* **core-api:** hasTransactionFinality() on connector API [#354](https://github.com/hyperledger/cactus/issues/354) ([a2d0582](https://github.com/hyperledger/cactus/commit/a2d058218780e5e4c81e5f847cc875879a946e3f))
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))





## [0.4.1](https://github.com/hyperledger/cactus/compare/v0.4.0...v0.4.1) (2021-04-02)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-besu





# [0.4.0](https://github.com/hyperledger/cactus/compare/v0.3.0...v0.4.0) (2021-03-30)


### Bug Fixes

* **ci:** disk full issues on GitHub Action Workflow runner [#698](https://github.com/hyperledger/cactus/issues/698) ([61e3f76](https://github.com/hyperledger/cactus/commit/61e3f76ed910c9b04b36f995456213018cc0e7ba))
* **connector-besu:** added test for call with parameters ([1fa24be](https://github.com/hyperledger/cactus/commit/1fa24bed8f42d39dd7b9ce989b8192774a9c7257))
* **connector-besu:** avoid req.params repetition ([64d6cf1](https://github.com/hyperledger/cactus/commit/64d6cf1f56375c9dd97c7cdf0d11c573fdf26b5a))
* **connector-besu:** fixed transaction value assignment and added test ([48bb129](https://github.com/hyperledger/cactus/commit/48bb1294f03f8b488c6f570b1e248f26aef2ccd1))
* **connector-besu:** revert change in generated code ([075ad90](https://github.com/hyperledger/cactus/commit/075ad90000507b95774065b7fad280b09a49c5f7))
* **general:** fixed unused deps and updated them ([b76a970](https://github.com/hyperledger/cactus/commit/b76a9703341c5a4cabe056e743338cbedebbeaad))
* reverting accidental manual change in generated code ([e67369f](https://github.com/hyperledger/cactus/commit/e67369f6b9bded6f54231cbcb34de534b6a80f5b)), closes [#453](https://github.com/hyperledger/cactus/issues/453)


### Features

* **besu:** add prometheus exporter ([7352203](https://github.com/hyperledger/cactus/commit/7352203842f0aa47f5b474732c09806465814474)), closes [#533](https://github.com/hyperledger/cactus/issues/533)
* **connector-besu:** added ether value in  contract invoke request ([add9cd9](https://github.com/hyperledger/cactus/commit/add9cd94ed7fe4a7facda89749895f7b04de89a8))
* **connector-besu:** common interface invoke-contract ([ee93120](https://github.com/hyperledger/cactus/commit/ee93120abc7551d22eb94ba7e0521feaffa479bb))
* **connector-besu:** customizable nonce and gas ([89c0060](https://github.com/hyperledger/cactus/commit/89c00604084a80cdd2c1f42a918f5028660703db))
* **connector-besu:** implemented contract instance map ([17fdd94](https://github.com/hyperledger/cactus/commit/17fdd94bb4063fd8eaa1bd53d25d87f343ab9ba4))
* **connector-besu:** request param: wait for ledger tx receipt [#685](https://github.com/hyperledger/cactus/issues/685) ([dc8c564](https://github.com/hyperledger/cactus/commit/dc8c564b2819a6f7c2ccc3f6cf37c68900a0c552))
* **core-api:** plugin import types: LOCAL & REMOTE ([f4d51da](https://github.com/hyperledger/cactus/commit/f4d51dae5b28367e714a2b9aa35dd84a2cb4cb37))
* **refactor:** openapi endpoint paths ([261c17b](https://github.com/hyperledger/cactus/commit/261c17b08124070c7be0890d6bc3da380255893b))





# [0.3.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.3.0) (2021-01-06)


### Bug Fixes

* open API generator config - protected keyword ([57e52f4](https://github.com/hyperledger/cactus/commit/57e52f42c3aaab653acb8838ba93518a5a097af8)), closes [#436](https://github.com/hyperledger/cactus/issues/436)


### Features

* **besu:** 🎸 OpenAPI support => arbitrary TX, contract deployments ([6d7e788](https://github.com/hyperledger/cactus/commit/6d7e7882eb0e11102a7e06b508433203c7cd821d))
* **besu:** add keychain reference signing support ([768c4cc](https://github.com/hyperledger/cactus/commit/768c4cc67837699f5e153545cc7350f2807c4460))
* **besu:** remove references to gethkeychainpassword ([2640b52](https://github.com/hyperledger/cactus/commit/2640b521967de51dc84e30f27749256da6369434))
* **cmd-api-server:** fully dynamic plugin imports via config file/env/CLI ([fe396c9](https://github.com/hyperledger/cactus/commit/fe396c969436f1c1a99b6d03d8b58b160e1a93bb))
* **core-api:** add instanceId getter to ICactusPlugin ([e50d9ce](https://github.com/hyperledger/cactus/commit/e50d9cef081708d7d6b92701f7f941c36ef6f920))
* **core-api:** getConsensusAlgorithmFamily() on connector API ([477dc7e](https://github.com/hyperledger/cactus/commit/477dc7ed5dfba9ae56060772d478aae349919f10)), closes [#355](https://github.com/hyperledger/cactus/issues/355)
* **plugin-ledger-connector-besu:** add log level to options ([29402d0](https://github.com/hyperledger/cactus/commit/29402d0814bf9ebc642430cd0acb660eb4d50b97))





# [0.2.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.2.0) (2020-12-01)


### Features

* **besu:** 🎸 OpenAPI support => arbitrary TX, contract deployments ([6d7e788](https://github.com/hyperledger/cactus/commit/6d7e7882eb0e11102a7e06b508433203c7cd821d))
* **besu:** add keychain reference signing support ([768c4cc](https://github.com/hyperledger/cactus/commit/768c4cc67837699f5e153545cc7350f2807c4460))
* **cmd-api-server:** fully dynamic plugin imports via config file/env/CLI ([fe396c9](https://github.com/hyperledger/cactus/commit/fe396c969436f1c1a99b6d03d8b58b160e1a93bb))
* **core-api:** add instanceId getter to ICactusPlugin ([e50d9ce](https://github.com/hyperledger/cactus/commit/e50d9cef081708d7d6b92701f7f941c36ef6f920))
* **plugin-ledger-connector-besu:** add log level to options ([29402d0](https://github.com/hyperledger/cactus/commit/29402d0814bf9ebc642430cd0acb660eb4d50b97))
