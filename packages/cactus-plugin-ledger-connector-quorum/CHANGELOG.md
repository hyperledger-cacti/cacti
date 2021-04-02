# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
