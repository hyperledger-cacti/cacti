# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-rc.3](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2021-12-07)


### Bug Fixes

* **cmd-api-server:** cockpit off by default [#1239](https://github.com/hyperledger/cactus/issues/1239) ([10344b5](https://github.com/hyperledger/cactus/commit/10344b574013209f1cb96e37a01d0d79e629be1f))





# [1.0.0-rc.2](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2021-11-01)

**Note:** Version bump only for package @hyperledger/cactus-test-plugin-ledger-connector-quorum





# [1.0.0-rc.1](https://github.com/hyperledger/cactus/compare/v0.10.0...v1.0.0-rc.1) (2021-10-11)


### Bug Fixes

* **plugin-ledger-connector-quorum:** no keychain endpoints ([15cf65c](https://github.com/hyperledger/cactus/commit/15cf65cea6a779d12542b4ccc2e4940e7ac12039))
* **webpack:** prod build chokes on upgraded ssh2 binaries [#1405](https://github.com/hyperledger/cactus/issues/1405) ([18979fb](https://github.com/hyperledger/cactus/commit/18979fb33880d8ca30e2fda01fb3d598deb839f9))





# [0.10.0](https://github.com/hyperledger/cactus/compare/v0.9.0...v0.10.0) (2021-09-28)

**Note:** Version bump only for package @hyperledger/cactus-test-plugin-ledger-connector-quorum





# [0.9.0](https://github.com/hyperledger/cactus/compare/v0.8.0...v0.9.0) (2021-08-31)


### Features

* besu private transaction support ([53b4980](https://github.com/hyperledger/cactus/commit/53b49808615aced96b628bf1498a1b62c5c9ca42))





# [0.8.0](https://github.com/hyperledger/cactus/compare/v0.7.0...v0.8.0) (2021-08-17)

**Note:** Version bump only for package @hyperledger/cactus-test-plugin-ledger-connector-quorum





# [0.7.0](https://github.com/hyperledger/cactus/compare/v0.6.0...v0.7.0) (2021-08-04)

**Note:** Version bump only for package @hyperledger/cactus-test-plugin-ledger-connector-quorum





# [0.6.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.6.0) (2021-07-19)


### Bug Fixes

* **connector-corda:** container image kotlin compilation fails in model ([a8a4531](https://github.com/hyperledger/cactus/commit/a8a4531d379fe16d4c991802525ec573a7e3ede1))
* **deps:** elliptic upgrade to >6.5.3 for CVE-2020-28498 ([d75b9af](https://github.com/hyperledger/cactus/commit/d75b9af764241ab2e10914769412201fb040b1ed))


### Features

* **connector-besu, connector-quorum:** filesystem replaced by keychain ([14d1790](https://github.com/hyperledger/cactus/commit/14d17904442723450790644653ff18dda79dfa5e))
* **connector-besu:** replace invokeContractV2 ([ecd62ea](https://github.com/hyperledger/cactus/commit/ecd62eac5721514dbcfc401d5f28dfdc58ef8873))
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))





# [0.5.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.5.0) (2021-05-19)


### Bug Fixes

* **deps:** elliptic upgrade to >6.5.3 for CVE-2020-28498 ([d75b9af](https://github.com/hyperledger/cactus/commit/d75b9af764241ab2e10914769412201fb040b1ed))


### Features

* **connector-besu:** replace invokeContractV2 ([ecd62ea](https://github.com/hyperledger/cactus/commit/ecd62eac5721514dbcfc401d5f28dfdc58ef8873))
* **connector-besu, connector-quorum:** filesystem replaced by keychain ([14d1790](https://github.com/hyperledger/cactus/commit/14d17904442723450790644653ff18dda79dfa5e))
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))





## [0.4.1](https://github.com/hyperledger/cactus/compare/v0.4.0...v0.4.1) (2021-04-02)

**Note:** Version bump only for package @hyperledger/cactus-test-plugin-ledger-connector-quorum





# [0.4.0](https://github.com/hyperledger/cactus/compare/v0.3.0...v0.4.0) (2021-03-30)


### Bug Fixes

* **ci:** disk full issues on GitHub Action Workflow runner [#698](https://github.com/hyperledger/cactus/issues/698) ([61e3f76](https://github.com/hyperledger/cactus/commit/61e3f76ed910c9b04b36f995456213018cc0e7ba))
* **general:** fixed unused deps and updated them ([b76a970](https://github.com/hyperledger/cactus/commit/b76a9703341c5a4cabe056e743338cbedebbeaad))





# [0.3.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.3.0) (2021-01-06)


### Features

* **api-server:** TLS, mTLS support ([bcda595](https://github.com/hyperledger/cactus/commit/bcda595c84a1a6805c20375a45b318de3e092319))
* **cmd-api-server:** fully dynamic plugin imports via config file/env/CLI ([fe396c9](https://github.com/hyperledger/cactus/commit/fe396c969436f1c1a99b6d03d8b58b160e1a93bb))
* **core-api:** add instanceId getter to ICactusPlugin ([e50d9ce](https://github.com/hyperledger/cactus/commit/e50d9cef081708d7d6b92701f7f941c36ef6f920))
* **quorum:** 🎸 support Cactus Keychain APIs ([0d4769f](https://github.com/hyperledger/cactus/commit/0d4769fa52d1f79c22bdb6f60c2c2b7200b8cf99))





# [0.2.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.2.0) (2020-12-01)


### Features

* **api-server:** TLS, mTLS support ([bcda595](https://github.com/hyperledger/cactus/commit/bcda595c84a1a6805c20375a45b318de3e092319))
* **cmd-api-server:** fully dynamic plugin imports via config file/env/CLI ([fe396c9](https://github.com/hyperledger/cactus/commit/fe396c969436f1c1a99b6d03d8b58b160e1a93bb))
* **core-api:** add instanceId getter to ICactusPlugin ([e50d9ce](https://github.com/hyperledger/cactus/commit/e50d9cef081708d7d6b92701f7f941c36ef6f920))
* **quorum:** 🎸 support Cactus Keychain APIs ([0d4769f](https://github.com/hyperledger/cactus/commit/0d4769fa52d1f79c22bdb6f60c2c2b7200b8cf99))
