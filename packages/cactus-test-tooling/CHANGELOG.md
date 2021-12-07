# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-rc.3](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2021-12-07)


### Bug Fixes

* **connector-fabric:** chain code deployment fails >1 scp concurrency ([71c9063](https://github.com/hyperledger/cactus/commit/71c9063a70d3ea77264d631272e792d339ffb1e3)), closes [#1570](https://github.com/hyperledger/cactus/issues/1570)
* **deps:** sibling package dependencies keychain-memory 0.6.0 [#1532](https://github.com/hyperledger/cactus/issues/1532) ([d01d72d](https://github.com/hyperledger/cactus/commit/d01d72d36200d47acac89f7ab90f6ddc96afba6f))
* **security:** upgrade fabric-common to 2.2.10 or later ([45c4a69](https://github.com/hyperledger/cactus/commit/45c4a69fb86964bc4e7018c31c5914a0063c7638)), closes [#1600](https://github.com/hyperledger/cactus/issues/1600)


### Features

* **test-tooling:** embed couch-db image in the faio ([95d956d](https://github.com/hyperledger/cactus/commit/95d956d9bbfb15b15b043a753f07cbf876c33707))
* **test-tooling:** env injenction for Besu, Fabric, Quorum AIOs ([bb0352d](https://github.com/hyperledger/cactus/commit/bb0352dad85a1acbb4fc4b34026f39f289cfa9c0)), closes [#1580](https://github.com/hyperledger/cactus/issues/1580)
* **test-tooling:** faio features and improvements ([794e8b8](https://github.com/hyperledger/cactus/commit/794e8b89aba5a7bc6144343607893bca64affda1))





# [1.0.0-rc.2](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2021-11-01)


### Features

* **connector-fabric:** support for FabricSigningCredentialType.WsX509 ([50e666f](https://github.com/hyperledger/cactus/commit/50e666fa522c3ae8b2f517e694c581f04c446e13))





# [1.0.0-rc.1](https://github.com/hyperledger/cactus/compare/v0.10.0...v1.0.0-rc.1) (2021-10-11)


### Bug Fixes

* openapi validation test for iroha plugin ([6deed6d](https://github.com/hyperledger/cactus/commit/6deed6d3f070982061e33a11064ffb8d4e752f37)), closes [#1331](https://github.com/hyperledger/cactus/issues/1331) [#847](https://github.com/hyperledger/cactus/issues/847)
* **webpack:** prod build chokes on upgraded ssh2 binaries [#1405](https://github.com/hyperledger/cactus/issues/1405) ([18979fb](https://github.com/hyperledger/cactus/commit/18979fb33880d8ca30e2fda01fb3d598deb839f9))


### Features

* **besu-test-ledger:** added omitPull parameter to besu test ledger ([336a024](https://github.com/hyperledger/cactus/commit/336a0242e20b075736b1b008a478e65b4db3af8b))
* **tools:** substrate test ledger ([1a5edea](https://github.com/hyperledger/cactus/commit/1a5edeae834bc275252e588379f214324977a3ff))





# [0.10.0](https://github.com/hyperledger/cactus/compare/v0.9.0...v0.10.0) (2021-09-28)


### Bug Fixes

* **test:** flaky fabric AIO container boot [#876](https://github.com/hyperledger/cactus/issues/876) ([beefcef](https://github.com/hyperledger/cactus/commit/beefcefbebbdb9a22d08118b6fb2e667493504cf)), closes [#718](https://github.com/hyperledger/cactus/issues/718) [#320](https://github.com/hyperledger/cactus/issues/320) [#319](https://github.com/hyperledger/cactus/issues/319)





# [0.9.0](https://github.com/hyperledger/cactus/compare/v0.8.0...v0.9.0) (2021-08-31)


### Features

* besu private transaction support ([53b4980](https://github.com/hyperledger/cactus/commit/53b49808615aced96b628bf1498a1b62c5c9ca42))
* **connector-fabric:** add support for vault transit secret engine ([2161e0d](https://github.com/hyperledger/cactus/commit/2161e0d75bac49654f0d38c8a9e2b03234894ed8))
* **connector-iroha:** adds connector plugin ([4745df0](https://github.com/hyperledger/cactus/commit/4745df0bee6b9ab5fb9e57bb603ae95d6baeb391))
* **iroha:** add iroha AIO image and iroha test ledger ([1eb811a](https://github.com/hyperledger/cactus/commit/1eb811a3c92f8459298c9f10b9e0d13e36d667b6))





# [0.8.0](https://github.com/hyperledger/cactus/compare/v0.7.0...v0.8.0) (2021-08-17)

**Note:** Version bump only for package @hyperledger/cactus-test-tooling





# [0.7.0](https://github.com/hyperledger/cactus/compare/v0.6.0...v0.7.0) (2021-08-04)


### Features

* **aws-sm:** added keychain plugin for aws secret manager ([ed6db9e](https://github.com/hyperledger/cactus/commit/ed6db9edc2064046308be91b73f620cbb2a6fb58)), closes [#912](https://github.com/hyperledger/cactus/issues/912)





# [0.6.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.6.0) (2021-07-19)


### Bug Fixes

* **deps:** elliptic upgrade to >6.5.3 for CVE-2020-28498 ([d75b9af](https://github.com/hyperledger/cactus/commit/d75b9af764241ab2e10914769412201fb040b1ed))


### Features

* **atomic-swap-erc20:** implemented plugin and test ([0c9423a](https://github.com/hyperledger/cactus/commit/0c9423a2a2cd4675c3c6dec4288190f148cad938))
* expose besu test ledger web socket API port ([e198a99](https://github.com/hyperledger/cactus/commit/e198a99f5fe7c2ac5c7bc1a8be0f0d29259871a8))
* **keychain-vault:** add the missing endpoint classes [#676](https://github.com/hyperledger/cactus/issues/676) ([341cffc](https://github.com/hyperledger/cactus/commit/341cffcef72286169a4ceced69414618d5059d0e))
* **test-tooling:** add besu multi-party test ledger ([89f173e](https://github.com/hyperledger/cactus/commit/89f173eea9deb15f0c2f6bd94ccefeb453fbeb39))
* **test-tooling:** add besu test ledger log level constructor arg ([60ee32f](https://github.com/hyperledger/cactus/commit/60ee32fb0e65e8325194a8798dd8cde093a141d3)), closes [#780](https://github.com/hyperledger/cactus/issues/780)
* **test-tooling:** add keycloak container ([f1abb3e](https://github.com/hyperledger/cactus/commit/f1abb3e8d2e05aa18008da176753b240528e95e6))
* **test-tooling:** add OpenEthereumTestLedger [#851](https://github.com/hyperledger/cactus/issues/851) ([9ca1f68](https://github.com/hyperledger/cactus/commit/9ca1f6839749450b4d8887c5af14a888225d645f))
* **test-tooling:** containers#logDiagnostics() utility method ([ed9e125](https://github.com/hyperledger/cactus/commit/ed9e125723508827a096293c808dbfac1fdba41c))
* **test-tooling:** go-ipfs test container ([e62b1b0](https://github.com/hyperledger/cactus/commit/e62b1b08988463fdccdd88743562081a486285f2))
* **test-tooling:** quorum test ledger omit pull parameter ([73f84f7](https://github.com/hyperledger/cactus/commit/73f84f7399c30f6cf3e1a0c46e4b9b9ec26dbced))
* **test-tooling:** rust compiler container for wasm builds ([ad7cdc0](https://github.com/hyperledger/cactus/commit/ad7cdc07e1f40e2b663577312ed47b1b64e9eafc))





# [0.5.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.5.0) (2021-05-19)


### Bug Fixes

* **deps:** elliptic upgrade to >6.5.3 for CVE-2020-28498 ([d75b9af](https://github.com/hyperledger/cactus/commit/d75b9af764241ab2e10914769412201fb040b1ed))


### Features

* **test-tooling:** add besu test ledger log level constructor arg ([60ee32f](https://github.com/hyperledger/cactus/commit/60ee32fb0e65e8325194a8798dd8cde093a141d3)), closes [#780](https://github.com/hyperledger/cactus/issues/780)
* **test-tooling:** add keycloak container ([f1abb3e](https://github.com/hyperledger/cactus/commit/f1abb3e8d2e05aa18008da176753b240528e95e6))
* **test-tooling:** add OpenEthereumTestLedger [#851](https://github.com/hyperledger/cactus/issues/851) ([9ca1f68](https://github.com/hyperledger/cactus/commit/9ca1f6839749450b4d8887c5af14a888225d645f))





# [0.4.0](https://github.com/hyperledger/cactus/compare/v0.3.0...v0.4.0) (2021-03-30)


### Bug Fixes

* **general:** fixed unused deps and updated them ([b76a970](https://github.com/hyperledger/cactus/commit/b76a9703341c5a4cabe056e743338cbedebbeaad))
* **test-tooling:** removed latest tag ([24d593d](https://github.com/hyperledger/cactus/commit/24d593d6156e8128286e6230dbb867f1afefef7d))
* **test-tooling:** uncomment code that was forgotten ([3d635c0](https://github.com/hyperledger/cactus/commit/3d635c08b43a4001579380e63cab89adba206617))
* **tools:** fabric AIO image log access in CI [#643](https://github.com/hyperledger/cactus/issues/643) ([9d9f805](https://github.com/hyperledger/cactus/commit/9d9f8054dfd064664b296eb4cc7e72bf6678fadf))


### Features

* **common:** add containers.pruneDockerResources utility method ([d075168](https://github.com/hyperledger/cactus/commit/d0751681ec715fc20716fdc71fd0df00a01d0559))
* **corda:** add Corda ledger support ([5623369](https://github.com/hyperledger/cactus/commit/5623369aa3b5f3b75cbafb58499b24da6efc896d))
* **corda-connector:** params factory pattern support [#620](https://github.com/hyperledger/cactus/issues/620) ([0c3e58c](https://github.com/hyperledger/cactus/commit/0c3e58c4d1acd90d480682c7a4dfd77b95980948))
* **corda-connector:** scp jars to nodes [#621](https://github.com/hyperledger/cactus/issues/621) ([c966769](https://github.com/hyperledger/cactus/commit/c966769ec7654596eea36d1fbc56cbf20d4e2233))
* **keychain:** add rust keychain plugin vault implementation ([6dcdb8a](https://github.com/hyperledger/cactus/commit/6dcdb8a02db30e4dfe3d912bd56d5979b0cb3bc3))
* **test-tooling:** add corda AIO emitContainerLogs option ([13fe677](https://github.com/hyperledger/cactus/commit/13fe67782addaccabec1d24bb2032da2d8ea3f94))
* **test-tooling:** containers pull image retries exp. back-off [#656](https://github.com/hyperledger/cactus/issues/656) ([2735ec2](https://github.com/hyperledger/cactus/commit/2735ec27f3139222f2fa9eb2ebcfbb4272b85482))
* **test-tooling:** containers#getById and #waitForHealthCheck ([4a7fbfe](https://github.com/hyperledger/cactus/commit/4a7fbfe19cdc269b3b197c736ecce4395b39e1e3)), closes [#471](https://github.com/hyperledger/cactus/issues/471)
* **test-tooling:** pruneDockerResources() observability [#694](https://github.com/hyperledger/cactus/issues/694) ([d92760f](https://github.com/hyperledger/cactus/commit/d92760f278ec06d26920362dc59999f274b29004))
* **test-tooling:** utility function docker prune in GH action [#696](https://github.com/hyperledger/cactus/issues/696) ([2784ceb](https://github.com/hyperledger/cactus/commit/2784cebbf899946e3638735865dbb7e23c0a114c))





# [0.3.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.3.0) (2021-01-06)


### Bug Fixes

* **test-tooling:** bind test ledgers to port zero for macOS ([6ff1b98](https://github.com/hyperledger/cactus/commit/6ff1b981f353449a15627ec0ec724e6e4a3fbb8d)), closes [#186](https://github.com/hyperledger/cactus/issues/186)
* **test-tooling:** fabric AIO image docker in docker support ([4c2ae34](https://github.com/hyperledger/cactus/commit/4c2ae344aa9aec817e330773fc6f7b0e995ff43f)), closes [#279](https://github.com/hyperledger/cactus/issues/279)
* **test-tooling:** getContainerInfo methods lookup criteria ([7456967](https://github.com/hyperledger/cactus/commit/7456967512b0cf4e0e70f3b656de53c9690ea514)), closes [#265](https://github.com/hyperledger/cactus/issues/265)


### Features

* **fabric:** add run transaction endpoint ([07ff4f8](https://github.com/hyperledger/cactus/commit/07ff4f862f6d02fec5de887d73186777951b745a))
* **fabric:** user defined fabric samples version ([8a60717](https://github.com/hyperledger/cactus/commit/8a607172f72afbdf2e0519eff3a58679975cd1ee)), closes [#391](https://github.com/hyperledger/cactus/issues/391)
* **fabric-all-in-one:** runs-a-Fabric-Network-in-one-docker-container ([703bc61](https://github.com/hyperledger/cactus/commit/703bc61a850b87176d04793545a9030b9bffc617)), closes [#132](https://github.com/hyperledger/cactus/issues/132)
* **ledger-connector-fabric:** golang chaincode deployment ([38e9780](https://github.com/hyperledger/cactus/commit/38e97808c74124bb35f0aa37e4b3d0eb42161920)), closes [#252](https://github.com/hyperledger/cactus/issues/252) [#275](https://github.com/hyperledger/cactus/issues/275) [#276](https://github.com/hyperledger/cactus/issues/276) [#277](https://github.com/hyperledger/cactus/issues/277)
* **test-tooling:** 🎸 createEthTestAccount() to Besu,Quorum test ledger ([2c0d73c](https://github.com/hyperledger/cactus/commit/2c0d73c0aba31e1d51d94d9482caad0e2d862ac9))
* 🎸 add method: QuorumTestLedger#getGenesisAccount() ([ac19e49](https://github.com/hyperledger/cactus/commit/ac19e49b87dad7d23d9eea91e2bbca0e3a0f69e4))
* **test-tooling:** Containers class ls() and exec() methods ([44ad88a](https://github.com/hyperledger/cactus/commit/44ad88a1f8ddc16735ef4533a1d25c9acf690d2e)), closes [#275](https://github.com/hyperledger/cactus/issues/275)





# [0.2.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.2.0) (2020-12-01)


### Bug Fixes

* **test-tooling:** bind test ledgers to port zero for macOS ([6ff1b98](https://github.com/hyperledger/cactus/commit/6ff1b981f353449a15627ec0ec724e6e4a3fbb8d)), closes [#186](https://github.com/hyperledger/cactus/issues/186)
* **test-tooling:** getContainerInfo methods lookup criteria ([7456967](https://github.com/hyperledger/cactus/commit/7456967512b0cf4e0e70f3b656de53c9690ea514)), closes [#265](https://github.com/hyperledger/cactus/issues/265)


### Features

* **test-tooling:** 🎸 createEthTestAccount() to Besu,Quorum test ledger ([2c0d73c](https://github.com/hyperledger/cactus/commit/2c0d73c0aba31e1d51d94d9482caad0e2d862ac9))
* 🎸 add method: QuorumTestLedger#getGenesisAccount() ([ac19e49](https://github.com/hyperledger/cactus/commit/ac19e49b87dad7d23d9eea91e2bbca0e3a0f69e4))
* **fabric-all-in-one:** runs-a-Fabric-Network-in-one-docker-container ([703bc61](https://github.com/hyperledger/cactus/commit/703bc61a850b87176d04793545a9030b9bffc617)), closes [#132](https://github.com/hyperledger/cactus/issues/132)
* **ledger-connector-fabric:** golang chaincode deployment ([38e9780](https://github.com/hyperledger/cactus/commit/38e97808c74124bb35f0aa37e4b3d0eb42161920)), closes [#252](https://github.com/hyperledger/cactus/issues/252) [#275](https://github.com/hyperledger/cactus/issues/275) [#276](https://github.com/hyperledger/cactus/issues/276) [#277](https://github.com/hyperledger/cactus/issues/277)
* **test-tooling:** Containers class ls() and exec() methods ([44ad88a](https://github.com/hyperledger/cactus/commit/44ad88a1f8ddc16735ef4533a1d25c9acf690d2e)), closes [#275](https://github.com/hyperledger/cactus/issues/275)
