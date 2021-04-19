# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-rc.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v1.0.0-rc.0) (2021-04-19)


### Bug Fixes

* keychain to registry, uuid dep, add back missing gas req parameter ([4635d81](https://github.com/hyperledger/cactus/commit/4635d817a719bcdaa2a3bf1b4aa3b5d8cc1f6961))


### Features

* **core-api:** decouple web service install & registration [#771](https://github.com/hyperledger/cactus/issues/771) ([b50e148](https://github.com/hyperledger/cactus/commit/b50e148f43c0b27138471c972aab391486e761e6))





## [0.4.1](https://github.com/hyperledger/cactus/compare/v0.4.0...v0.4.1) (2021-04-02)


### Features

* **api-server:** add prometheus exporter ([c348aa4](https://github.com/hyperledger/cactus/commit/c348aa4f858536bca350af6abd524a5d345aacc7)), closes [#539](https://github.com/hyperledger/cactus/issues/539)





# [0.4.0](https://github.com/hyperledger/cactus/compare/v0.3.0...v0.4.0) (2021-03-30)


### Bug Fixes

* **deps:** missing uuid from plugins [#529](https://github.com/hyperledger/cactus/issues/529) ([04ea8bb](https://github.com/hyperledger/cactus/commit/04ea8bb8a035382de078d082889c8fdfd48479f8))
* **general:** fixed unused deps and updated them ([b76a970](https://github.com/hyperledger/cactus/commit/b76a9703341c5a4cabe056e743338cbedebbeaad))


### Features

* **core-api:** plugin import types: LOCAL & REMOTE ([f4d51da](https://github.com/hyperledger/cactus/commit/f4d51dae5b28367e714a2b9aa35dd84a2cb4cb37))
* **keychain-memory:** add prometheus exporter ([a5affc5](https://github.com/hyperledger/cactus/commit/a5affc526123769cafa878d6a29312596511688e)), closes [#537](https://github.com/hyperledger/cactus/issues/537)





# [0.3.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.3.0) (2021-01-06)


### Bug Fixes

* bundle name typos: plugin-keychain-memory ([43a127b](https://github.com/hyperledger/cactus/commit/43a127b2d0cfab7cdcf48d75a452d4ab44721551))


### Features

* **cmd-api-server:** fully dynamic plugin imports via config file/env/CLI ([fe396c9](https://github.com/hyperledger/cactus/commit/fe396c969436f1c1a99b6d03d8b58b160e1a93bb))
* **core-api:** 🎸 add IKeychainPlugin#getKeychainId() ([34656b0](https://github.com/hyperledger/cactus/commit/34656b0730f886619efbbddb512c094029cbbebd))
* **core-api:** add instanceId getter to ICactusPlugin ([e50d9ce](https://github.com/hyperledger/cactus/commit/e50d9cef081708d7d6b92701f7f941c36ef6f920))





# [0.2.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.2.0) (2020-12-01)


### Bug Fixes

* bundle name typos: plugin-keychain-memory ([43a127b](https://github.com/hyperledger/cactus/commit/43a127b2d0cfab7cdcf48d75a452d4ab44721551))


### Features

* **cmd-api-server:** fully dynamic plugin imports via config file/env/CLI ([fe396c9](https://github.com/hyperledger/cactus/commit/fe396c969436f1c1a99b6d03d8b58b160e1a93bb))
* **core-api:** 🎸 add IKeychainPlugin#getKeychainId() ([34656b0](https://github.com/hyperledger/cactus/commit/34656b0730f886619efbbddb512c094029cbbebd))
* **core-api:** add instanceId getter to ICactusPlugin ([e50d9ce](https://github.com/hyperledger/cactus/commit/e50d9cef081708d7d6b92701f7f941c36ef6f920))
