# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-rc.3](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2021-12-07)


### Bug Fixes

* added a dummy package ([e1e8aee](https://github.com/hyperledger/cactus/commit/e1e8aee692dd0055e4f2b772590ad7386008c500)), closes [#1210](https://github.com/hyperledger/cactus/issues/1210)
* **cmd-api-server:** build occasionally broken - protoc-gen-ts [#1563](https://github.com/hyperledger/cactus/issues/1563) ([c2ecba5](https://github.com/hyperledger/cactus/commit/c2ecba54396d5e72b28d9ad538460d3bde2ca6d0))
* **cmd-api-server:** cockpit off by default [#1239](https://github.com/hyperledger/cactus/issues/1239) ([10344b5](https://github.com/hyperledger/cactus/commit/10344b574013209f1cb96e37a01d0d79e629be1f))





# [1.0.0-rc.2](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2021-11-01)


### Bug Fixes

* fixes issue 1444 invoking the onPluginInit ([0b4dc2e](https://github.com/hyperledger/cactus/commit/0b4dc2eb121cb52d6038822efca434b9a0e4abcf)), closes [#1444](https://github.com/hyperledger/cactus/issues/1444)


### Features

* option to enable a graceful shutdown via cli ([c345cb0](https://github.com/hyperledger/cactus/commit/c345cb0aeba4ae46440ba396bcd11ca0fa5a5c96))





# [1.0.0-rc.1](https://github.com/hyperledger/cactus/compare/v0.10.0...v1.0.0-rc.1) (2021-10-11)


### Bug Fixes

* **cmd-api-server:** enable version selection in plugins ([b982777](https://github.com/hyperledger/cactus/commit/b9827772fa6694381716686759f85f96b915662e)), closes [#839](https://github.com/hyperledger/cactus/issues/839) [#840](https://github.com/hyperledger/cactus/issues/840)
* **webpack:** prod build chokes on upgraded ssh2 binaries [#1405](https://github.com/hyperledger/cactus/issues/1405) ([18979fb](https://github.com/hyperledger/cactus/commit/18979fb33880d8ca30e2fda01fb3d598deb839f9))





# [0.10.0](https://github.com/hyperledger/cactus/compare/v0.9.0...v0.10.0) (2021-09-28)


### Features

* **core-api:** discontinue dedicated HTTP listeners for web service plugins ([3fbd2fc](https://github.com/hyperledger/cactus/commit/3fbd2fcb60d49090bf4e986bea74d4e988348659)), closes [#358](https://github.com/hyperledger/cactus/issues/358)
* **core:** add installOpenapiValidationMiddleware ([1f6ea5f](https://github.com/hyperledger/cactus/commit/1f6ea5fe3aa1ba997a655098d632034f13f232a5)), closes [#847](https://github.com/hyperledger/cactus/issues/847)





# [0.9.0](https://github.com/hyperledger/cactus/compare/v0.8.0...v0.9.0) (2021-08-31)


### Bug Fixes

* **cmd-api-server:** add missing deps remove unused ones [#1226](https://github.com/hyperledger/cactus/issues/1226) ([b348e42](https://github.com/hyperledger/cactus/commit/b348e4266369fed502610b4c0769d4d6b19f9115))


### Features

* besu private transaction support ([53b4980](https://github.com/hyperledger/cactus/commit/53b49808615aced96b628bf1498a1b62c5c9ca42))
* **cmd-api-server:** support grpc web services [#1189](https://github.com/hyperledger/cactus/issues/1189) ([4cace1d](https://github.com/hyperledger/cactus/commit/4cace1dca3377e09d2ed37fdadeec6b125d47896))





# [0.8.0](https://github.com/hyperledger/cactus/compare/v0.7.0...v0.8.0) (2021-08-17)


### Bug Fixes

* **cmd-api-server:** plugins interfere with API server deps [#1192](https://github.com/hyperledger/cactus/issues/1192) ([a96ce68](https://github.com/hyperledger/cactus/commit/a96ce689dae74345b41d5bd94dd46dd3e9bc3e71)), closes [#1203](https://github.com/hyperledger/cactus/issues/1203)
* **prometheus:** metrics.ts leaks to global registry [#1202](https://github.com/hyperledger/cactus/issues/1202) ([ce076d7](https://github.com/hyperledger/cactus/commit/ce076d709f8e0cba143f8fe9d71f1de1df8f71dc))





# [0.7.0](https://github.com/hyperledger/cactus/compare/v0.6.0...v0.7.0) (2021-08-04)


### Bug Fixes

* **connector-corda:** fix build broken by operationId rename ([291dd3b](https://github.com/hyperledger/cactus/commit/291dd3bc666939fffbc3780eaefd9059c756878a))





# [0.6.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.6.0) (2021-07-19)


### Bug Fixes

* **cmd-api-server:** config-service example - authorization JSON ([a209fef](https://github.com/hyperledger/cactus/commit/a209feffdea47f0992f17a7c0265535614143dfe))
* **cmd-api-server:** drop URI type alt name from self signed TLS cert ([eb5d1df](https://github.com/hyperledger/cactus/commit/eb5d1dfaf8523690008c1c1c0aaa0b0efedb2cba))
* **cmd-api-server:** no CLI args causes crash [#794](https://github.com/hyperledger/cactus/issues/794) ([a285b96](https://github.com/hyperledger/cactus/commit/a285b96785792cd29f450bfc1cc066067c82f558))
* **connector-corda:** container image kotlin compilation fails in model ([a8a4531](https://github.com/hyperledger/cactus/commit/a8a4531d379fe16d4c991802525ec573a7e3ede1))


### Features

* adding additional info into err logs ([888f85a](https://github.com/hyperledger/cactus/commit/888f85a680a330cfc6be98bab3e8aed5d9e9dde2)), closes [#295](https://github.com/hyperledger/cactus/issues/295)
* **api-server:** ability to install plugins at runtime [#764](https://github.com/hyperledger/cactus/issues/764) ([8dda0f6](https://github.com/hyperledger/cactus/commit/8dda0f61937c6e1a85afee0345af44b1bfa09c0a))
* **api-server:** publish API server docker image ([ad7b221](https://github.com/hyperledger/cactus/commit/ad7b2211305bcefb044701276a56d5ad09d8468c))
* **cmd-api-server:** add Socket.IO as transport [#297](https://github.com/hyperledger/cactus/issues/297) ([51c586a](https://github.com/hyperledger/cactus/commit/51c586aa01bff3e75f0e87be43f0764b30d8222c))
* **cmd-api-server:** container image definition ([eb69fff](https://github.com/hyperledger/cactus/commit/eb69fff36fca805c6b96c6db7caadfbed85e8485))
* **cmd-api-server:** user defined type guard isHealthcheckResponse ([16077d4](https://github.com/hyperledger/cactus/commit/16077d42ec7edce4999d77cfbca5c02177d15fa6))
* **connector-fabric:** contract deployment Fabric 2.x ([139a8ed](https://github.com/hyperledger/cactus/commit/139a8ed96d5d547a514839a461abcb7d0e937cb0))
* **core-api:** decouple web service install & registration [#771](https://github.com/hyperledger/cactus/issues/771) ([b50e148](https://github.com/hyperledger/cactus/commit/b50e148f43c0b27138471c972aab391486e761e6))
* **core-api:** hasTransactionFinality() on connector API [#354](https://github.com/hyperledger/cactus/issues/354) ([a2d0582](https://github.com/hyperledger/cactus/commit/a2d058218780e5e4c81e5f847cc875879a946e3f))
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))
* **core-api:** plugin interface async initializer ([d40f68b](https://github.com/hyperledger/cactus/commit/d40f68bd9eaff498df8514fe7397986b5a2f865d))
* incorporating load testing into our CI pipeline ([7125d10](https://github.com/hyperledger/cactus/commit/7125d1043091e0443edaa7b63021cd0b96404c4b)), closes [#295](https://github.com/hyperledger/cactus/issues/295)
* **keychain-vault:** add the missing endpoint classes [#676](https://github.com/hyperledger/cactus/issues/676) ([341cffc](https://github.com/hyperledger/cactus/commit/341cffcef72286169a4ceced69414618d5059d0e))
* **plugin-object-store-ipfs:** add IPFS plugin implementation ([6d1de27](https://github.com/hyperledger/cactus/commit/6d1de274b45a3fd2cc5120588f9d8594d5d3ace6))


### Performance Improvements

* **cmd-api-server:** shrink API server bundle with type-only imports ([4875fc3](https://github.com/hyperledger/cactus/commit/4875fc346bba70ee87d8fe033435035201d48b3e))


### BREAKING CHANGES

* 🧨 Behaviour in a cloud environment is currently untested and could impact
CI pipeline time.





# [0.5.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.5.0) (2021-05-19)


### Bug Fixes

* **cmd-api-server:** no CLI args causes crash [#794](https://github.com/hyperledger/cactus/issues/794) ([a285b96](https://github.com/hyperledger/cactus/commit/a285b96785792cd29f450bfc1cc066067c82f558))


### Features

* **core-api:** hasTransactionFinality() on connector API [#354](https://github.com/hyperledger/cactus/issues/354) ([a2d0582](https://github.com/hyperledger/cactus/commit/a2d058218780e5e4c81e5f847cc875879a946e3f))
* adding additional info into err logs ([888f85a](https://github.com/hyperledger/cactus/commit/888f85a680a330cfc6be98bab3e8aed5d9e9dde2)), closes [#295](https://github.com/hyperledger/cactus/issues/295)
* incorporating load testing into our CI pipeline ([7125d10](https://github.com/hyperledger/cactus/commit/7125d1043091e0443edaa7b63021cd0b96404c4b)), closes [#295](https://github.com/hyperledger/cactus/issues/295)
* **api-server:** ability to install plugins at runtime [#764](https://github.com/hyperledger/cactus/issues/764) ([8dda0f6](https://github.com/hyperledger/cactus/commit/8dda0f61937c6e1a85afee0345af44b1bfa09c0a))
* **cmd-api-server:** container image definition ([eb69fff](https://github.com/hyperledger/cactus/commit/eb69fff36fca805c6b96c6db7caadfbed85e8485))
* **cmd-api-server:** user defined type guard isHealthcheckResponse ([16077d4](https://github.com/hyperledger/cactus/commit/16077d42ec7edce4999d77cfbca5c02177d15fa6))
* **connector-fabric:** contract deployment Fabric 2.x ([139a8ed](https://github.com/hyperledger/cactus/commit/139a8ed96d5d547a514839a461abcb7d0e937cb0))
* **core-api:** decouple web service install & registration [#771](https://github.com/hyperledger/cactus/issues/771) ([b50e148](https://github.com/hyperledger/cactus/commit/b50e148f43c0b27138471c972aab391486e761e6))
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))


### BREAKING CHANGES

* 🧨 Behaviour in a cloud environment is currently untested and could impact
CI pipeline time.





## [0.4.1](https://github.com/hyperledger/cactus/compare/v0.4.0...v0.4.1) (2021-04-02)


### Bug Fixes

* **release:** package.json publish config non-public [#753](https://github.com/hyperledger/cactus/issues/753) ([5a1b7a6](https://github.com/hyperledger/cactus/commit/5a1b7a6eba9a18d4f7474a3c44d4a4035fc99e84))


### Features

* **api-server:** add prometheus exporter ([c348aa4](https://github.com/hyperledger/cactus/commit/c348aa4f858536bca350af6abd524a5d345aacc7)), closes [#539](https://github.com/hyperledger/cactus/issues/539)





# [0.4.0](https://github.com/hyperledger/cactus/compare/v0.3.0...v0.4.0) (2021-03-30)


### Bug Fixes

* **cmd-api-server:** config generator emits correct type ([ecd63b9](https://github.com/hyperledger/cactus/commit/ecd63b9fac831f198f0f979754a7790f61133f49)), closes [#598](https://github.com/hyperledger/cactus/issues/598)
* **cmd-api-server:** missing pretsc npm script [#500](https://github.com/hyperledger/cactus/issues/500) ([a79b11a](https://github.com/hyperledger/cactus/commit/a79b11a3a0001a9fb9732da295451f1b424e7b35))
* **general:** fixed unused deps and updated them ([b76a970](https://github.com/hyperledger/cactus/commit/b76a9703341c5a4cabe056e743338cbedebbeaad))


### Features

* **core-api:** plugin import types: LOCAL & REMOTE ([f4d51da](https://github.com/hyperledger/cactus/commit/f4d51dae5b28367e714a2b9aa35dd84a2cb4cb37))
* **keychain:** add rust keychain plugin vault implementation ([6dcdb8a](https://github.com/hyperledger/cactus/commit/6dcdb8a02db30e4dfe3d912bd56d5979b0cb3bc3))





# [0.3.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.3.0) (2021-01-06)


### Bug Fixes

* **api-server:** runtime plugin imports ([dcdfcf5](https://github.com/hyperledger/cactus/commit/dcdfcf59e8e5220e24093e3dbeb41f49f1e5ab1b)), closes [#346](https://github.com/hyperledger/cactus/issues/346)
* **cmd-api-server:** add IPluginImport to public API surface of package ([8734642](https://github.com/hyperledger/cactus/commit/8734642e01c916fe2c1fc0b8c0a58ebd1db7391b))
* **cmd-api-server:** bundle name typos ([711ad71](https://github.com/hyperledger/cactus/commit/711ad7168d9ff89dd2ad04ee43efe158200e8fbc)), closes [#376](https://github.com/hyperledger/cactus/issues/376)
* **cmd-api-server:** disallow running on older than Node 12 but provide optional override ([332b306](https://github.com/hyperledger/cactus/commit/332b306c0c1a8cef21e27d116fc92158d3439128)), closes [#150](https://github.com/hyperledger/cactus/issues/150)
* **cmd-api-server:** plugin imports via static config (env,cli,file) ([d7e550e](https://github.com/hyperledger/cactus/commit/d7e550ee9b9483995c95e7a43d175e82bfb1ab6e))


### Features

* **api-server:** TLS, mTLS support ([bcda595](https://github.com/hyperledger/cactus/commit/bcda595c84a1a6805c20375a45b318de3e092319))
* **cmd-api-server:** fully dynamic plugin imports via config file/env/CLI ([fe396c9](https://github.com/hyperledger/cactus/commit/fe396c969436f1c1a99b6d03d8b58b160e1a93bb))
* **common:** Servers utility class ([ad01dee](https://github.com/hyperledger/cactus/commit/ad01dee4def65f47e6292d117eaece2b2ebc1c3c)), closes [#260](https://github.com/hyperledger/cactus/issues/260) [#267](https://github.com/hyperledger/cactus/issues/267)
* **plugin-consortium-manual:** JSON Web Signatures for Nodes, Consortium ([caf60b3](https://github.com/hyperledger/cactus/commit/caf60b3f69c81617787afe73ca12165baa2dce50))





# [0.2.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.2.0) (2020-12-01)


### Bug Fixes

* **api-server:** runtime plugin imports ([dcdfcf5](https://github.com/hyperledger/cactus/commit/dcdfcf59e8e5220e24093e3dbeb41f49f1e5ab1b)), closes [#346](https://github.com/hyperledger/cactus/issues/346)
* **cmd-api-server:** add IPluginImport to public API surface of package ([8734642](https://github.com/hyperledger/cactus/commit/8734642e01c916fe2c1fc0b8c0a58ebd1db7391b))
* **cmd-api-server:** bundle name typos ([711ad71](https://github.com/hyperledger/cactus/commit/711ad7168d9ff89dd2ad04ee43efe158200e8fbc)), closes [#376](https://github.com/hyperledger/cactus/issues/376)
* **cmd-api-server:** disallow running on older than Node 12 but provide optional override ([332b306](https://github.com/hyperledger/cactus/commit/332b306c0c1a8cef21e27d116fc92158d3439128)), closes [#150](https://github.com/hyperledger/cactus/issues/150)
* **cmd-api-server:** plugin imports via static config (env,cli,file) ([d7e550e](https://github.com/hyperledger/cactus/commit/d7e550ee9b9483995c95e7a43d175e82bfb1ab6e))


### Features

* **api-server:** TLS, mTLS support ([bcda595](https://github.com/hyperledger/cactus/commit/bcda595c84a1a6805c20375a45b318de3e092319))
* **cmd-api-server:** fully dynamic plugin imports via config file/env/CLI ([fe396c9](https://github.com/hyperledger/cactus/commit/fe396c969436f1c1a99b6d03d8b58b160e1a93bb))
* **common:** Servers utility class ([ad01dee](https://github.com/hyperledger/cactus/commit/ad01dee4def65f47e6292d117eaece2b2ebc1c3c)), closes [#260](https://github.com/hyperledger/cactus/issues/260) [#267](https://github.com/hyperledger/cactus/issues/267)
* **plugin-consortium-manual:** JSON Web Signatures for Nodes, Consortium ([caf60b3](https://github.com/hyperledger/cactus/commit/caf60b3f69c81617787afe73ca12165baa2dce50))
