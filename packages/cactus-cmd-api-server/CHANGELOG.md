# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
