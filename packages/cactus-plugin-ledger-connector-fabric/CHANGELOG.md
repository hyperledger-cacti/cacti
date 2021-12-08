# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-rc.3](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2021-12-07)


### Bug Fixes

* **connector-fabric:** chain code deployment fails >1 scp concurrency ([71c9063](https://github.com/hyperledger/cactus/commit/71c9063a70d3ea77264d631272e792d339ffb1e3)), closes [#1570](https://github.com/hyperledger/cactus/issues/1570)
* **security:** upgrade fabric-common to 2.2.10 or later ([45c4a69](https://github.com/hyperledger/cactus/commit/45c4a69fb86964bc4e7018c31c5914a0063c7638)), closes [#1600](https://github.com/hyperledger/cactus/issues/1600)


### Features

* **odap:** first implemenation for odap plugin and endpoints ([51bf753](https://github.com/hyperledger/cactus/commit/51bf753d421cdd255c178036fe901eb9c1c04130))
* **test-tooling:** embed couch-db image in the faio ([95d956d](https://github.com/hyperledger/cactus/commit/95d956d9bbfb15b15b043a753f07cbf876c33707))
* **test-tooling:** faio features and improvements ([794e8b8](https://github.com/hyperledger/cactus/commit/794e8b89aba5a7bc6144343607893bca64affda1))





# [1.0.0-rc.2](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2021-11-01)


### Features

* **connector-fabric:** support for FabricSigningCredentialType.WsX509 ([50e666f](https://github.com/hyperledger/cactus/commit/50e666fa522c3ae8b2f517e694c581f04c446e13))





# [1.0.0-rc.1](https://github.com/hyperledger/cactus/compare/v0.10.0...v1.0.0-rc.1) (2021-10-11)


### Bug Fixes

* openapi validation test for fabric plugin ([01a5eb4](https://github.com/hyperledger/cactus/commit/01a5eb423abcc54aed8e2b4973251961e7849f76)), closes [#1295](https://github.com/hyperledger/cactus/issues/1295) [#847](https://github.com/hyperledger/cactus/issues/847)
* **webpack:** prod build chokes on upgraded ssh2 binaries [#1405](https://github.com/hyperledger/cactus/issues/1405) ([18979fb](https://github.com/hyperledger/cactus/commit/18979fb33880d8ca30e2fda01fb3d598deb839f9))


### Features

* **fabric-connector:** add transact receipt ([c6d1b7a](https://github.com/hyperledger/cactus/commit/c6d1b7a180025f84f055bf537b5263eb44b2511f))





# [0.10.0](https://github.com/hyperledger/cactus/compare/v0.9.0...v0.10.0) (2021-09-28)


### Bug Fixes

* **test:** flaky fabric AIO container boot [#876](https://github.com/hyperledger/cactus/issues/876) ([beefcef](https://github.com/hyperledger/cactus/commit/beefcefbebbdb9a22d08118b6fb2e667493504cf)), closes [#718](https://github.com/hyperledger/cactus/issues/718) [#320](https://github.com/hyperledger/cactus/issues/320) [#319](https://github.com/hyperledger/cactus/issues/319)


### Features

* **core-api:** discontinue dedicated HTTP listeners for web service plugins ([3fbd2fc](https://github.com/hyperledger/cactus/commit/3fbd2fcb60d49090bf4e986bea74d4e988348659)), closes [#358](https://github.com/hyperledger/cactus/issues/358)
* **core:** add installOpenapiValidationMiddleware ([1f6ea5f](https://github.com/hyperledger/cactus/commit/1f6ea5fe3aa1ba997a655098d632034f13f232a5)), closes [#847](https://github.com/hyperledger/cactus/issues/847)





# [0.9.0](https://github.com/hyperledger/cactus/compare/v0.8.0...v0.9.0) (2021-08-31)


### Features

* **connector-fabric:** add support for vault transit secret engine ([2161e0d](https://github.com/hyperledger/cactus/commit/2161e0d75bac49654f0d38c8a9e2b03234894ed8))





# [0.8.0](https://github.com/hyperledger/cactus/compare/v0.7.0...v0.8.0) (2021-08-17)


### Bug Fixes

* **prometheus:** metrics.ts leaks to global registry [#1202](https://github.com/hyperledger/cactus/issues/1202) ([ce076d7](https://github.com/hyperledger/cactus/commit/ce076d709f8e0cba143f8fe9d71f1de1df8f71dc))





# [0.7.0](https://github.com/hyperledger/cactus/compare/v0.6.0...v0.7.0) (2021-08-04)


### Features

* **connector-fabric:** endorsing peers request arg [#1122](https://github.com/hyperledger/cactus/issues/1122) ([c6057a7](https://github.com/hyperledger/cactus/commit/c6057a7ac508f3bd8da8c9611414a627ff772024)), closes [#1123](https://github.com/hyperledger/cactus/issues/1123) [#1130](https://github.com/hyperledger/cactus/issues/1130)
* **connector-fabric:** identity json signing credentials [#1130](https://github.com/hyperledger/cactus/issues/1130) ([bc262a2](https://github.com/hyperledger/cactus/commit/bc262a24ae654899e8941e7910953c6c561ea778)), closes [#1124](https://github.com/hyperledger/cactus/issues/1124)





# [0.6.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.6.0) (2021-07-19)


### Bug Fixes

* **connector-corda:** container image kotlin compilation fails in model ([a8a4531](https://github.com/hyperledger/cactus/commit/a8a4531d379fe16d4c991802525ec573a7e3ede1))
* **connector-fabric:** export IPluginLedgerConnectorFabricOptions ([ada532e](https://github.com/hyperledger/cactus/commit/ada532ef09603727379b6193b175e2834fa803d3))


### Features

* **cmd-api-server:** add Socket.IO as transport [#297](https://github.com/hyperledger/cactus/issues/297) ([51c586a](https://github.com/hyperledger/cactus/commit/51c586aa01bff3e75f0e87be43f0764b30d8222c))
* **connector-fabric:** containerize-fabric ([b53b3a4](https://github.com/hyperledger/cactus/commit/b53b3a4c1cb36e7a0f14d405cdecb3c8341f956d))
* **connector-fabric:** contract deployment Fabric 2.x ([139a8ed](https://github.com/hyperledger/cactus/commit/139a8ed96d5d547a514839a461abcb7d0e937cb0))
* **connector-fabric:** enrollAdmin() and createCaClient() ([da1cb1b](https://github.com/hyperledger/cactus/commit/da1cb1bc3c3751b5d10f98a457ae0ec62b6bdebf))
* **core-api:** decouple web service install & registration [#771](https://github.com/hyperledger/cactus/issues/771) ([b50e148](https://github.com/hyperledger/cactus/commit/b50e148f43c0b27138471c972aab391486e761e6))
* **core-api:** hasTransactionFinality() on connector API [#354](https://github.com/hyperledger/cactus/issues/354) ([a2d0582](https://github.com/hyperledger/cactus/commit/a2d058218780e5e4c81e5f847cc875879a946e3f))
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))
* **core-api:** plugin async initializer method ([9678c2e](https://github.com/hyperledger/cactus/commit/9678c2e9288a73589e84f9fd254c26aed6a93297))
* **fabric-connector:** add private data support ([3f503f9](https://github.com/hyperledger/cactus/commit/3f503f9a57bcdb14c3a3045fb516491b4f4879b4))
* **fabric:** add sequence diagram of run transaction endpoint ([155cbab](https://github.com/hyperledger/cactus/commit/155cbab3c0358f6c259df8c0f92b788cbdfc6a71)), closes [#756](https://github.com/hyperledger/cactus/issues/756)





# [0.5.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.5.0) (2021-05-19)


### Bug Fixes

* **connector-fabric:** export IPluginLedgerConnectorFabricOptions ([ada532e](https://github.com/hyperledger/cactus/commit/ada532ef09603727379b6193b175e2834fa803d3))


### Features

* **connector-fabric:** containerize-fabric ([b53b3a4](https://github.com/hyperledger/cactus/commit/b53b3a4c1cb36e7a0f14d405cdecb3c8341f956d))
* **connector-fabric:** contract deployment Fabric 2.x ([139a8ed](https://github.com/hyperledger/cactus/commit/139a8ed96d5d547a514839a461abcb7d0e937cb0))
* **connector-fabric:** enrollAdmin() and createCaClient() ([da1cb1b](https://github.com/hyperledger/cactus/commit/da1cb1bc3c3751b5d10f98a457ae0ec62b6bdebf))
* **core-api:** decouple web service install & registration [#771](https://github.com/hyperledger/cactus/issues/771) ([b50e148](https://github.com/hyperledger/cactus/commit/b50e148f43c0b27138471c972aab391486e761e6))
* **core-api:** hasTransactionFinality() on connector API [#354](https://github.com/hyperledger/cactus/issues/354) ([a2d0582](https://github.com/hyperledger/cactus/commit/a2d058218780e5e4c81e5f847cc875879a946e3f))
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))
* **fabric:** add sequence diagram of run transaction endpoint ([155cbab](https://github.com/hyperledger/cactus/commit/155cbab3c0358f6c259df8c0f92b788cbdfc6a71)), closes [#756](https://github.com/hyperledger/cactus/issues/756)





## [0.4.1](https://github.com/hyperledger/cactus/compare/v0.4.0...v0.4.1) (2021-04-02)


### Bug Fixes

* **connector-fabric:** cve-2020-7774 Prototype Pollution high sev. [#745](https://github.com/hyperledger/cactus/issues/745) ([6114cef](https://github.com/hyperledger/cactus/commit/6114ceff5c078674993af319653dc770a2011983))


### Features

* **connector-fabric:** common interface ([c35cfe7](https://github.com/hyperledger/cactus/commit/c35cfe755c75ae860fdf28eb7fc89215557635c5))





# [0.4.0](https://github.com/hyperledger/cactus/compare/v0.3.0...v0.4.0) (2021-03-30)


### Bug Fixes

* **ci:** disallow parallel run for all Fabric AIO int. tests [#656](https://github.com/hyperledger/cactus/issues/656) ([af9f851](https://github.com/hyperledger/cactus/commit/af9f8510da036ba1abf9470d5ade2b542841d279))
* **ci:** disk full issues on GitHub Action Workflow runner [#698](https://github.com/hyperledger/cactus/issues/698) ([61e3f76](https://github.com/hyperledger/cactus/commit/61e3f76ed910c9b04b36f995456213018cc0e7ba))
* **ci:** github action runner disk full error [#641](https://github.com/hyperledger/cactus/issues/641) ([193fe52](https://github.com/hyperledger/cactus/commit/193fe52fe2a5bc317dac7d50163cb00eb57fd628))
* **fabric:** issue with multiple objects of prometheus metrics ([6bb0cf9](https://github.com/hyperledger/cactus/commit/6bb0cf990154237e434e4de2e600517ab592a32b)), closes [#634](https://github.com/hyperledger/cactus/issues/634)
* **fabric:** prometheus exporter metrics naming ([a28edcf](https://github.com/hyperledger/cactus/commit/a28edcf2a02a8d8e8fcc876e3c4eb40931f0fd9a))
* **general:** fixed unused deps and updated them ([b76a970](https://github.com/hyperledger/cactus/commit/b76a9703341c5a4cabe056e743338cbedebbeaad))
* **npm:** clean script was missing folders ([416b82e](https://github.com/hyperledger/cactus/commit/416b82e971607129fbdfa9e1270644d0c2f5c706)), closes [#469](https://github.com/hyperledger/cactus/issues/469)
* **performance:** parallel test execution [#416](https://github.com/hyperledger/cactus/issues/416) ([5abcd1e](https://github.com/hyperledger/cactus/commit/5abcd1e42b0a89382a7c17a2d6b11b32ad00cee3))
* **tools:** prod build fail due to missing dependency ngo [#673](https://github.com/hyperledger/cactus/issues/673) ([c93cd30](https://github.com/hyperledger/cactus/commit/c93cd3021d3fafb6a28e7e6723fe65e2a800219d))


### Features

* **connector-fabric:** signing credentials for fabric ([ebfff9f](https://github.com/hyperledger/cactus/commit/ebfff9f8f5aeb86751801e531a1d8064ce6c6e51))
* **core-api:** plugin import types: LOCAL & REMOTE ([f4d51da](https://github.com/hyperledger/cactus/commit/f4d51dae5b28367e714a2b9aa35dd84a2cb4cb37))
* **fabric:** add prometheus exporter ([b892655](https://github.com/hyperledger/cactus/commit/b892655c1cb8fb1ce20fcd8f061d6f4e998eea6b)), closes [#531](https://github.com/hyperledger/cactus/issues/531)
* **fabric-connector:** contract deployment endpoint [#616](https://github.com/hyperledger/cactus/issues/616) ([c77fc78](https://github.com/hyperledger/cactus/commit/c77fc783a0df4f31af53170073176042559ef432))
* **refactor:** openapi endpoint paths ([261c17b](https://github.com/hyperledger/cactus/commit/261c17b08124070c7be0890d6bc3da380255893b))





# [0.3.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.3.0) (2021-01-06)


### Bug Fixes

* open API generator config - protected keyword ([57e52f4](https://github.com/hyperledger/cactus/commit/57e52f42c3aaab653acb8838ba93518a5a097af8)), closes [#436](https://github.com/hyperledger/cactus/issues/436)


### Features

* **core-api:** add instanceId getter to ICactusPlugin ([e50d9ce](https://github.com/hyperledger/cactus/commit/e50d9cef081708d7d6b92701f7f941c36ef6f920))
* **core-api:** getConsensusAlgorithmFamily() on connector API ([477dc7e](https://github.com/hyperledger/cactus/commit/477dc7ed5dfba9ae56060772d478aae349919f10)), closes [#355](https://github.com/hyperledger/cactus/issues/355)
* **fabric:** add run transaction endpoint ([07ff4f8](https://github.com/hyperledger/cactus/commit/07ff4f862f6d02fec5de887d73186777951b745a))
* **fabric:** user defined fabric samples version ([8a60717](https://github.com/hyperledger/cactus/commit/8a607172f72afbdf2e0519eff3a58679975cd1ee)), closes [#391](https://github.com/hyperledger/cactus/issues/391)
* **ledger-connector-fabric:** golang chaincode deployment ([38e9780](https://github.com/hyperledger/cactus/commit/38e97808c74124bb35f0aa37e4b3d0eb42161920)), closes [#252](https://github.com/hyperledger/cactus/issues/252) [#275](https://github.com/hyperledger/cactus/issues/275) [#276](https://github.com/hyperledger/cactus/issues/276) [#277](https://github.com/hyperledger/cactus/issues/277)





# [0.2.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.2.0) (2020-12-01)


### Features

* **core-api:** add instanceId getter to ICactusPlugin ([e50d9ce](https://github.com/hyperledger/cactus/commit/e50d9cef081708d7d6b92701f7f941c36ef6f920))
* **ledger-connector-fabric:** golang chaincode deployment ([38e9780](https://github.com/hyperledger/cactus/commit/38e97808c74124bb35f0aa37e4b3d0eb42161920)), closes [#252](https://github.com/hyperledger/cactus/issues/252) [#275](https://github.com/hyperledger/cactus/issues/275) [#276](https://github.com/hyperledger/cactus/issues/276) [#277](https://github.com/hyperledger/cactus/issues/277)
