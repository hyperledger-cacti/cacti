# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.0.0-alpha.2](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2023-09-27)

### Bug Fixes

* **cactus-core-api:** address CVE-2021-38192 - GHSA-x4qm-mcjq-v2gf ([ff1afa5](https://github.com/hyperledger/cacti/commit/ff1afa5a6195399753c22f45837bbbf4ea27fe3c)), closes [#2612](https://github.com/hyperledger/cacti/issues/2612)
* **security:** the CVE-2022-2421 - upgrade socket.io-parser to >=4.2.1 ([9172172](https://github.com/hyperledger/cacti/commit/917217227a3fa53a00429f047cd6318862e6ab8d)), closes [#2229](https://github.com/hyperledger/cacti/issues/2229) [#2228](https://github.com/hyperledger/cacti/issues/2228)
* use common conventions: tsconfig.json, package.json ([50f5c02](https://github.com/hyperledger/cacti/commit/50f5c02190ba28b77492c09e81f5d5ba6578e862)), closes [#2216](https://github.com/hyperledger/cacti/issues/2216)

### Features

* **openapi:** upgrade to 6.3.0 phase1 ([a094614](https://github.com/hyperledger/cacti/commit/a094614877d6043a6e3e8c0b3e95203eed7d6203)), closes [#2298](https://github.com/hyperledger/cacti/issues/2298)

# [2.0.0-alpha.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha-prerelease...v2.0.0-alpha.1) (2023-05-19)

**Note:** Version bump only for package @hyperledger/cactus-core-api

# [2.0.0-alpha-prerelease](https://github.com/hyperledger/cacti/compare/v1.2.0...v2.0.0-alpha-prerelease) (2023-05-11)

**Note:** Version bump only for package @hyperledger/cactus-core-api

# [1.2.0](https://github.com/hyperledger/cactus/compare/v1.1.3...v1.2.0) (2023-03-28)

### Features

* **connector-fabric:** add WatchBlocks endpoint ([6c62de4](https://github.com/hyperledger/cactus/commit/6c62de4dfb360536fc67a03cf10602e311c08a9d)), closes [#2118](https://github.com/hyperledger/cactus/issues/2118)

## [1.1.3](https://github.com/hyperledger/cactus/compare/v1.1.2...v1.1.3) (2022-12-08)

### Bug Fixes

* **connector-iroha:** fix review comments and smaller issues ([b2742e8](https://github.com/hyperledger/cactus/commit/b2742e8f6512f9804c6b4a943947b5bbe90785f0)), closes [PR#2048](https://github.com/PR/issues/2048)

### Features

* monitoring, sync and async requests ([47da608](https://github.com/hyperledger/cactus/commit/47da608d378f5d48ca78b3d388b1c67da4c7aaf3)), closes [#1941](https://github.com/hyperledger/cactus/issues/1941)

## [1.1.2](https://github.com/hyperledger/cactus/compare/v1.1.1...v1.1.2) (2022-11-11)

**Note:** Version bump only for package @hyperledger/cactus-core-api

## [1.1.1](https://github.com/hyperledger/cactus/compare/v1.1.0...v1.1.1) (2022-11-03)

**Note:** Version bump only for package @hyperledger/cactus-core-api

# [1.1.0](https://github.com/hyperledger/cactus/compare/v1.0.0...v1.1.0) (2022-10-17)

### Features

* **corda4:** implement monitoring of state changes ([865ec2f](https://github.com/hyperledger/cactus/commit/865ec2f097df73e4907d812b18c2acf25e7896b1)), closes [#1610](https://github.com/hyperledger/cactus/issues/1610)

# [1.0.0](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.3...v1.0.0) (2022-03-16)

### Bug Fixes

* **cmd-api-server:** upgrade socket.io - CVE-2022-21676 ([8e1c69e](https://github.com/hyperledger/cactus/commit/8e1c69e7b8ab5e4ccc31a0ec183a9777ccc22cdc)), closes [#1914](https://github.com/hyperledger/cactus/issues/1914)

### Features

* **cactus-api-client:** add support for plain socketio validators in api-server and api-client ([634b10e](https://github.com/hyperledger/cactus/commit/634b10e5eaf82df08b04c11c3af5b109ede5b942)), closes [#1602](https://github.com/hyperledger/cactus/issues/1602) [#1602](https://github.com/hyperledger/cactus/issues/1602)
* **cactus-api-client:** common verifier-factory ([2f70a64](https://github.com/hyperledger/cactus/commit/2f70a6473f30446859427335f2d3602bddca636d)), closes [#1878](https://github.com/hyperledger/cactus/issues/1878)
* **core-api:** add weaver protobuf codegen  [#1556](https://github.com/hyperledger/cactus/issues/1556) ([b5b68a7](https://github.com/hyperledger/cactus/commit/b5b68a76e256555ef362dceaa834d8bbcdcfff06))

# [1.0.0-rc.3](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2021-12-07)

### Bug Fixes

* **cmd-api-server:** build occasionally broken - protoc-gen-ts [#1563](https://github.com/hyperledger/cactus/issues/1563) ([c2ecba5](https://github.com/hyperledger/cactus/commit/c2ecba54396d5e72b28d9ad538460d3bde2ca6d0))

### Features

* **core-api:** add weaver protocol buffer definitions [#1523](https://github.com/hyperledger/cactus/issues/1523) ([851c071](https://github.com/hyperledger/cactus/commit/851c071e13e2ed3748a9c52ae9d02fb85d235c9a))

# [1.0.0-rc.2](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2021-11-01)

**Note:** Version bump only for package @hyperledger/cactus-core-api

# [1.0.0-rc.1](https://github.com/hyperledger/cactus/compare/v0.10.0...v1.0.0-rc.1) (2021-10-11)

### Bug Fixes

* **core-api:** modifications in openapi specs ([96c8b82](https://github.com/hyperledger/cactus/commit/96c8b82a642fdf106178ecdc47ff1f12fff229d1))
* **webpack:** prod build chokes on upgraded ssh2 binaries [#1405](https://github.com/hyperledger/cactus/issues/1405) ([18979fb](https://github.com/hyperledger/cactus/commit/18979fb33880d8ca30e2fda01fb3d598deb839f9))

# [0.10.0](https://github.com/hyperledger/cactus/compare/v0.9.0...v0.10.0) (2021-09-28)

### Features

* **core-api:** discontinue dedicated HTTP listeners for web service plugins ([3fbd2fc](https://github.com/hyperledger/cactus/commit/3fbd2fcb60d49090bf4e986bea74d4e988348659)), closes [#358](https://github.com/hyperledger/cactus/issues/358)
* **core:** add installOpenapiValidationMiddleware ([1f6ea5f](https://github.com/hyperledger/cactus/commit/1f6ea5fe3aa1ba997a655098d632034f13f232a5)), closes [#847](https://github.com/hyperledger/cactus/issues/847)

# [0.9.0](https://github.com/hyperledger/cactus/compare/v0.8.0...v0.9.0) (2021-08-31)

### Bug Fixes

* check for req function onPluginInit in isCactusPlugin ([f5ffb92](https://github.com/hyperledger/cactus/commit/f5ffb92d5a03ecb14ec6952d8dff0d8ec101df35)), closes [#1277](https://github.com/hyperledger/cactus/issues/1277)

# [0.8.0](https://github.com/hyperledger/cactus/compare/v0.7.0...v0.8.0) (2021-08-17)

**Note:** Version bump only for package @hyperledger/cactus-core-api

# [0.7.0](https://github.com/hyperledger/cactus/compare/v0.6.0...v0.7.0) (2021-08-04)

**Note:** Version bump only for package @hyperledger/cactus-core-api

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
