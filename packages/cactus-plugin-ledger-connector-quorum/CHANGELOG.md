# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.7.0](https://github.com/hyperledger/cactus/compare/v0.6.0...v0.7.0) (2021-08-04)


### Bug Fixes

* **connector-corda:** fix build broken by operationId rename ([291dd3b](https://github.com/hyperledger/cactus/commit/291dd3bc666939fffbc3780eaefd9059c756878a))





# [0.6.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.6.0) (2021-07-19)


### Bug Fixes

* **connector-corda:** container image kotlin compilation fails in model ([a8a4531](https://github.com/hyperledger/cactus/commit/a8a4531d379fe16d4c991802525ec573a7e3ede1))
* **connector-quorum:** web3 Contract type usage ([80c8253](https://github.com/hyperledger/cactus/commit/80c82536f6446896a07aab9276f93598266ea5c3))
* **deps:** elliptic upgrade to >6.5.3 for CVE-2020-28498 ([d75b9af](https://github.com/hyperledger/cactus/commit/d75b9af764241ab2e10914769412201fb040b1ed))


### Features

* **connector-besu, connector-quorum:** filesystem replaced by keychain ([14d1790](https://github.com/hyperledger/cactus/commit/14d17904442723450790644653ff18dda79dfa5e))
* **connector-besu,connector-quorum:** updated ([985f12f](https://github.com/hyperledger/cactus/commit/985f12f69c52a139a72aecc9b050e71545a90df8))
* **connector-besu:** replace invokeContractV2 ([ecd62ea](https://github.com/hyperledger/cactus/commit/ecd62eac5721514dbcfc401d5f28dfdc58ef8873))
* **connector-quorum:** contractAbi optional parameter ([c79d763](https://github.com/hyperledger/cactus/commit/c79d763e0cb093647209417cfed7a2645283f302))
* **connector-quorum:** support v21.4.1 and Tessera 21.1.1 [#901](https://github.com/hyperledger/cactus/issues/901) ([33fdd50](https://github.com/hyperledger/cactus/commit/33fdd50e6a9cdeff433a9614c6498fa1c370f50a))
* **core-api:** decouple web service install & registration [#771](https://github.com/hyperledger/cactus/issues/771) ([b50e148](https://github.com/hyperledger/cactus/commit/b50e148f43c0b27138471c972aab391486e761e6))
* **core-api:** hasTransactionFinality() on connector API [#354](https://github.com/hyperledger/cactus/issues/354) ([a2d0582](https://github.com/hyperledger/cactus/commit/a2d058218780e5e4c81e5f847cc875879a946e3f))
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))
* **core-api:** plugin async initializer method ([9678c2e](https://github.com/hyperledger/cactus/commit/9678c2e9288a73589e84f9fd254c26aed6a93297))





# [0.5.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.5.0) (2021-05-19)


### Bug Fixes

* **connector-quorum:** web3 Contract type usage ([80c8253](https://github.com/hyperledger/cactus/commit/80c82536f6446896a07aab9276f93598266ea5c3))
* **deps:** elliptic upgrade to >6.5.3 for CVE-2020-28498 ([d75b9af](https://github.com/hyperledger/cactus/commit/d75b9af764241ab2e10914769412201fb040b1ed))


### Features

* **connector-besu:** replace invokeContractV2 ([ecd62ea](https://github.com/hyperledger/cactus/commit/ecd62eac5721514dbcfc401d5f28dfdc58ef8873))
* **connector-besu, connector-quorum:** filesystem replaced by keychain ([14d1790](https://github.com/hyperledger/cactus/commit/14d17904442723450790644653ff18dda79dfa5e))
* **connector-besu,connector-quorum:** updated ([985f12f](https://github.com/hyperledger/cactus/commit/985f12f69c52a139a72aecc9b050e71545a90df8))
* **connector-quorum:** contractAbi optional parameter ([c79d763](https://github.com/hyperledger/cactus/commit/c79d763e0cb093647209417cfed7a2645283f302))
* **core-api:** decouple web service install & registration [#771](https://github.com/hyperledger/cactus/issues/771) ([b50e148](https://github.com/hyperledger/cactus/commit/b50e148f43c0b27138471c972aab391486e761e6))
* **core-api:** hasTransactionFinality() on connector API [#354](https://github.com/hyperledger/cactus/issues/354) ([a2d0582](https://github.com/hyperledger/cactus/commit/a2d058218780e5e4c81e5f847cc875879a946e3f))
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))





## [0.4.1](https://github.com/hyperledger/cactus/compare/v0.4.0...v0.4.1) (2021-04-02)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-quorum





# [0.4.0](https://github.com/hyperledger/cactus/compare/v0.3.0...v0.4.0) (2021-03-30)


### Bug Fixes

* **ci:** disk full issues on GitHub Action Workflow runner [#698](https://github.com/hyperledger/cactus/issues/698) ([61e3f76](https://github.com/hyperledger/cactus/commit/61e3f76ed910c9b04b36f995456213018cc0e7ba))
* **connector-quorum:** ether value and query params added ([0275451](https://github.com/hyperledger/cactus/commit/02754513c032cc65db96a77ba3b936aef29f34be))
* **general:** fixed unused deps and updated them ([b76a970](https://github.com/hyperledger/cactus/commit/b76a9703341c5a4cabe056e743338cbedebbeaad))


### Features

* **connector-besu:** customizable nonce and gas ([89c0060](https://github.com/hyperledger/cactus/commit/89c00604084a80cdd2c1f42a918f5028660703db))
* **connector-besu:** implemented contract instance map ([17fdd94](https://github.com/hyperledger/cactus/commit/17fdd94bb4063fd8eaa1bd53d25d87f343ab9ba4))
* **core-api:** plugin import types: LOCAL & REMOTE ([f4d51da](https://github.com/hyperledger/cactus/commit/f4d51dae5b28367e714a2b9aa35dd84a2cb4cb37))
* **quorum:** add prometheus exporter ([bcc574d](https://github.com/hyperledger/cactus/commit/bcc574d3077d2086afee4e7ece054285777c527f)), closes [#534](https://github.com/hyperledger/cactus/issues/534)
* **refactor:** openapi endpoint paths ([261c17b](https://github.com/hyperledger/cactus/commit/261c17b08124070c7be0890d6bc3da380255893b))





# [0.3.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.3.0) (2021-01-06)


### Bug Fixes

* open API generator config - protected keyword ([57e52f4](https://github.com/hyperledger/cactus/commit/57e52f42c3aaab653acb8838ba93518a5a097af8)), closes [#436](https://github.com/hyperledger/cactus/issues/436)


### Features

* **cmd-api-server:** fully dynamic plugin imports via config file/env/CLI ([fe396c9](https://github.com/hyperledger/cactus/commit/fe396c969436f1c1a99b6d03d8b58b160e1a93bb))
* **core-api:** add instanceId getter to ICactusPlugin ([e50d9ce](https://github.com/hyperledger/cactus/commit/e50d9cef081708d7d6b92701f7f941c36ef6f920))
* **core-api:** getConsensusAlgorithmFamily() on connector API ([477dc7e](https://github.com/hyperledger/cactus/commit/477dc7ed5dfba9ae56060772d478aae349919f10)), closes [#355](https://github.com/hyperledger/cactus/issues/355)
* **quorum:** 🎸 export model-type-guards to public API surface ([49ec2d5](https://github.com/hyperledger/cactus/commit/49ec2d5cea181bb37ca610d810350f433ba383d2))
* **quorum:** 🎸 support Cactus Keychain APIs ([0d4769f](https://github.com/hyperledger/cactus/commit/0d4769fa52d1f79c22bdb6f60c2c2b7200b8cf99))





# [0.2.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.2.0) (2020-12-01)


### Features

* **cmd-api-server:** fully dynamic plugin imports via config file/env/CLI ([fe396c9](https://github.com/hyperledger/cactus/commit/fe396c969436f1c1a99b6d03d8b58b160e1a93bb))
* **core-api:** add instanceId getter to ICactusPlugin ([e50d9ce](https://github.com/hyperledger/cactus/commit/e50d9cef081708d7d6b92701f7f941c36ef6f920))
* **quorum:** 🎸 export model-type-guards to public API surface ([49ec2d5](https://github.com/hyperledger/cactus/commit/49ec2d5cea181bb37ca610d810350f433ba383d2))
* **quorum:** 🎸 support Cactus Keychain APIs ([0d4769f](https://github.com/hyperledger/cactus/commit/0d4769fa52d1f79c22bdb6f60c2c2b7200b8cf99))
