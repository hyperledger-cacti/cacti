# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
