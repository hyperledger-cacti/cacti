# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.6.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.6.0) (2021-07-19)


### Bug Fixes

* **connector-corda:** container image kotlin compilation fails in model ([a8a4531](https://github.com/hyperledger/cactus/commit/a8a4531d379fe16d4c991802525ec573a7e3ede1))


### Features

* add SocketIoConnectionPathV1 constant to OpenAPI specs ([405865d](https://github.com/hyperledger/cactus/commit/405865d02e57031c1531431a4a46b96a1b9aff03))
* **core-api:** add plugin object store interface definition ([4bf8038](https://github.com/hyperledger/cactus/commit/4bf8038ea4c0c341cef3a63b59f77c12cec65a46))
* **core-api:** decouple web service install & registration [#771](https://github.com/hyperledger/cactus/issues/771) ([b50e148](https://github.com/hyperledger/cactus/commit/b50e148f43c0b27138471c972aab391486e761e6))
* **core-api:** hasTransactionFinality() on connector API [#354](https://github.com/hyperledger/cactus/issues/354) ([a2d0582](https://github.com/hyperledger/cactus/commit/a2d058218780e5e4c81e5f847cc875879a946e3f))
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))
* **core-api:** plugin async initializer method ([9678c2e](https://github.com/hyperledger/cactus/commit/9678c2e9288a73589e84f9fd254c26aed6a93297))


### Performance Improvements

* leverage import type syntax to save on bundle size ([11f93a0](https://github.com/hyperledger/cactus/commit/11f93a03116d26b64b516dba3c05d97a59afeabc))





# [0.5.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.5.0) (2021-05-19)


### Features

* **core-api:** decouple web service install & registration [#771](https://github.com/hyperledger/cactus/issues/771) ([b50e148](https://github.com/hyperledger/cactus/commit/b50e148f43c0b27138471c972aab391486e761e6))
* **core-api:** hasTransactionFinality() on connector API [#354](https://github.com/hyperledger/cactus/issues/354) ([a2d0582](https://github.com/hyperledger/cactus/commit/a2d058218780e5e4c81e5f847cc875879a946e3f))
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))





## [0.4.1](https://github.com/hyperledger/cactus/compare/v0.4.0...v0.4.1) (2021-04-02)


### Bug Fixes

* **release:** package.json publish config non-public [#753](https://github.com/hyperledger/cactus/issues/753) ([5a1b7a6](https://github.com/hyperledger/cactus/commit/5a1b7a6eba9a18d4f7474a3c44d4a4035fc99e84))





# [0.4.0](https://github.com/hyperledger/cactus/compare/v0.3.0...v0.4.0) (2021-03-30)


### Bug Fixes

* **general:** fixed unused deps and updated them ([b76a970](https://github.com/hyperledger/cactus/commit/b76a9703341c5a4cabe056e743338cbedebbeaad))


### Features

* **core-api:** common consortium interface ([aa070ad](https://github.com/hyperledger/cactus/commit/aa070ade45c82cd067cbea09c04fe7b94f76368e))
* **core-api:** plugin import types: LOCAL & REMOTE ([f4d51da](https://github.com/hyperledger/cactus/commit/f4d51dae5b28367e714a2b9aa35dd84a2cb4cb37))
* **keychain:** implement OpenAPI endpoints ([3a0acf4](https://github.com/hyperledger/cactus/commit/3a0acf4cb350a286500aa80ed4ac5d15f9501ea4))





# [0.3.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.3.0) (2021-01-06)


### Bug Fixes

* open API generator config - protected keyword ([57e52f4](https://github.com/hyperledger/cactus/commit/57e52f42c3aaab653acb8838ba93518a5a097af8)), closes [#436](https://github.com/hyperledger/cactus/issues/436)


### Features

* **core-api:** 🎸 add IKeychainPlugin#getKeychainId() ([34656b0](https://github.com/hyperledger/cactus/commit/34656b0730f886619efbbddb512c094029cbbebd))
* **core-api:** add consensus algorithms OpenAPI enum ([7206b85](https://github.com/hyperledger/cactus/commit/7206b85d77d44707baea67a267318a0bea610a66)), closes [#359](https://github.com/hyperledger/cactus/issues/359)
* **core-api:** add instanceId getter to ICactusPlugin ([e50d9ce](https://github.com/hyperledger/cactus/commit/e50d9cef081708d7d6b92701f7f941c36ef6f920))
* **core-api:** getConsensusAlgorithmFamily() on connector API ([477dc7e](https://github.com/hyperledger/cactus/commit/477dc7ed5dfba9ae56060772d478aae349919f10)), closes [#355](https://github.com/hyperledger/cactus/issues/355)
* **plugin-consortium-manual:** JSON Web Signatures for Nodes, Consortium ([caf60b3](https://github.com/hyperledger/cactus/commit/caf60b3f69c81617787afe73ca12165baa2dce50))
* **plugin-registry:** get keychain by keychainId ([4d93c72](https://github.com/hyperledger/cactus/commit/4d93c72ca4c533697a47782946ba2a3549cc742a)), closes [#381](https://github.com/hyperledger/cactus/issues/381)
* **plugin-validator-besu:** generate signature of simple asset ([4c5c253](https://github.com/hyperledger/cactus/commit/4c5c2534b551cd972f0536e12d930ef995265ab4))





# [0.2.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.2.0) (2020-12-01)


### Features

* **core-api:** 🎸 add IKeychainPlugin#getKeychainId() ([34656b0](https://github.com/hyperledger/cactus/commit/34656b0730f886619efbbddb512c094029cbbebd))
* **core-api:** add instanceId getter to ICactusPlugin ([e50d9ce](https://github.com/hyperledger/cactus/commit/e50d9cef081708d7d6b92701f7f941c36ef6f920))
* **plugin-consortium-manual:** JSON Web Signatures for Nodes, Consortium ([caf60b3](https://github.com/hyperledger/cactus/commit/caf60b3f69c81617787afe73ca12165baa2dce50))
* **plugin-validator-besu:** generate signature of simple asset ([4c5c253](https://github.com/hyperledger/cactus/commit/4c5c2534b551cd972f0536e12d930ef995265ab4))
