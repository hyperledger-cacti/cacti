# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-rc.3](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2021-12-07)


### Bug Fixes

* added a dummy package ([e1e8aee](https://github.com/hyperledger/cactus/commit/e1e8aee692dd0055e4f2b772590ad7386008c500)), closes [#1210](https://github.com/hyperledger/cactus/issues/1210)
* **cmd-api-server:** build occasionally broken - protoc-gen-ts [#1563](https://github.com/hyperledger/cactus/issues/1563) ([c2ecba5](https://github.com/hyperledger/cactus/commit/c2ecba54396d5e72b28d9ad538460d3bde2ca6d0))
* **cmd-api-server:** cockpit off by default [#1239](https://github.com/hyperledger/cactus/issues/1239) ([10344b5](https://github.com/hyperledger/cactus/commit/10344b574013209f1cb96e37a01d0d79e629be1f))
* **connector-corda:** add script to remove files before generate them ([58d1ce9](https://github.com/hyperledger/cactus/commit/58d1ce9d5fb176c1e3b9a55e1a4e6cd9c673f682)), closes [#1559](https://github.com/hyperledger/cactus/issues/1559)
* **connector-fabric:** chain code deployment fails >1 scp concurrency ([71c9063](https://github.com/hyperledger/cactus/commit/71c9063a70d3ea77264d631272e792d339ffb1e3)), closes [#1570](https://github.com/hyperledger/cactus/issues/1570)
* **connector-quorum:** transaction with different credentials [#1098](https://github.com/hyperledger/cactus/issues/1098) ([af6c240](https://github.com/hyperledger/cactus/commit/af6c24045f3696b3a64d64182afbd610c6409b17))
* **deps:** sibling package dependencies keychain-memory 0.6.0 [#1532](https://github.com/hyperledger/cactus/issues/1532) ([d01d72d](https://github.com/hyperledger/cactus/commit/d01d72d36200d47acac89f7ab90f6ddc96afba6f))
* endpoints implementation in corda plugin ([21a22b5](https://github.com/hyperledger/cactus/commit/21a22b574fb2e08c8c69106a6b3ecf1cb252c654)), closes [#1346](https://github.com/hyperledger/cactus/issues/1346)
* fixes 1445 and implementing correct interface types ([9022064](https://github.com/hyperledger/cactus/commit/9022064e245a92f71d2d303d77bfdaf64d1b1678)), closes [#1445](https://github.com/hyperledger/cactus/issues/1445)
* openapi validation for corda server endpoints ([21fc5ba](https://github.com/hyperledger/cactus/commit/21fc5ba874e0d1974a7e9524aff5103bb8af4b53))
* openapi validation for keychain-aws-sm plugin ([b270d28](https://github.com/hyperledger/cactus/commit/b270d2891d88149caa3de66096e727e82df0233e)), closes [#847](https://github.com/hyperledger/cactus/issues/847)
* **security:** remedy CVE-2021-3749 ([b33aa90](https://github.com/hyperledger/cactus/commit/b33aa904cfa3794357c77b24f464d41a325f1d80)), closes [#1569](https://github.com/hyperledger/cactus/issues/1569)
* **security:** upgrade fabric-common to 2.2.10 or later ([45c4a69](https://github.com/hyperledger/cactus/commit/45c4a69fb86964bc4e7018c31c5914a0063c7638)), closes [#1600](https://github.com/hyperledger/cactus/issues/1600)
* **supply-chain-app:** enable cockpit in supply-chain ([4a65b96](https://github.com/hyperledger/cactus/commit/4a65b96cfd83564343ec548c715946480ce228ea)), closes [#1622](https://github.com/hyperledger/cactus/issues/1622)
* **tools:** fix the names of scripts on README ([93360e1](https://github.com/hyperledger/cactus/commit/93360e12fa0e8af1d8c9fe73a3ebf955bc069201))


### Features

* **core-api:** add weaver protocol buffer definitions [#1523](https://github.com/hyperledger/cactus/issues/1523) ([851c071](https://github.com/hyperledger/cactus/commit/851c071e13e2ed3748a9c52ae9d02fb85d235c9a))
* **docs:** upated maintainers list ([b5c94dc](https://github.com/hyperledger/cactus/commit/b5c94dc744c48040b5cadd49b8903534ba5998d1))
* **example:** make cartrade support more environments ([e7e0402](https://github.com/hyperledger/cactus/commit/e7e04026059b7c1dfd1c5bd8c65f052651464966))
* **odap:** first implemenation for odap plugin and endpoints ([51bf753](https://github.com/hyperledger/cactus/commit/51bf753d421cdd255c178036fe901eb9c1c04130))
* **test-tooling:** embed couch-db image in the faio ([95d956d](https://github.com/hyperledger/cactus/commit/95d956d9bbfb15b15b043a753f07cbf876c33707))
* **test-tooling:** env injenction for Besu, Fabric, Quorum AIOs ([bb0352d](https://github.com/hyperledger/cactus/commit/bb0352dad85a1acbb4fc4b34026f39f289cfa9c0)), closes [#1580](https://github.com/hyperledger/cactus/issues/1580)
* **test-tooling:** faio features and improvements ([794e8b8](https://github.com/hyperledger/cactus/commit/794e8b89aba5a7bc6144343607893bca64affda1))





# [1.0.0-rc.2](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2021-11-01)


### Bug Fixes

* fixes issue 1444 invoking the onPluginInit ([0b4dc2e](https://github.com/hyperledger/cactus/commit/0b4dc2eb121cb52d6038822efca434b9a0e4abcf)), closes [#1444](https://github.com/hyperledger/cactus/issues/1444)
* **lint:** fix issue [#1359](https://github.com/hyperledger/cactus/issues/1359) ([f7eb39b](https://github.com/hyperledger/cactus/commit/f7eb39bb1392b2762adac3a189da071249f4eca3))
* **lint:** fix issue [#1359](https://github.com/hyperledger/cactus/issues/1359) ([d067df2](https://github.com/hyperledger/cactus/commit/d067df29db21325ba9b29b52d244066fce0e3a02))
* openapi validation for keychain-google-sm plugin ([45f8c7c](https://github.com/hyperledger/cactus/commit/45f8c7c007e604b0fe54af6cba888eaaff15519b)), closes [#847](https://github.com/hyperledger/cactus/issues/847)


### Features

* allows for constructor args in quorum contract deploy ([cb3c8d8](https://github.com/hyperledger/cactus/commit/cb3c8d85d7fa275faf94c1e45584a5736fffd562)), closes [#962](https://github.com/hyperledger/cactus/issues/962)
* **common:** add Strings#isNonBlank() ([8d7d247](https://github.com/hyperledger/cactus/commit/8d7d2473d749746e38931e27c8044889b0ce3394))
* **connector-fabric:** support for FabricSigningCredentialType.WsX509 ([50e666f](https://github.com/hyperledger/cactus/commit/50e666fa522c3ae8b2f517e694c581f04c446e13))
* **htlc-coordinator:** new htlc coordinator ([28c97d3](https://github.com/hyperledger/cactus/commit/28c97d33e97fa180f1b2b65d505f5ae36a9ddc25)), closes [#953](https://github.com/hyperledger/cactus/issues/953)
* option to enable a graceful shutdown via cli ([c345cb0](https://github.com/hyperledger/cactus/commit/c345cb0aeba4ae46440ba396bcd11ca0fa5a5c96))
* **plugin-keychain-memory-wasm:** add WebAssmebly PoC ([df94397](https://github.com/hyperledger/cactus/commit/df9439789109715839b28ba4bce89da7bb9dcb00)), closes [#1281](https://github.com/hyperledger/cactus/issues/1281)





# [1.0.0-rc.1](https://github.com/hyperledger/cactus/compare/v0.10.0...v1.0.0-rc.1) (2021-10-11)


### Bug Fixes

* **cmd-api-server:** enable version selection in plugins ([b982777](https://github.com/hyperledger/cactus/commit/b9827772fa6694381716686759f85f96b915662e)), closes [#839](https://github.com/hyperledger/cactus/issues/839) [#840](https://github.com/hyperledger/cactus/issues/840)
* **cmd-socker-server:** delete unnecessary files on cmd-socker-server ([20e15cd](https://github.com/hyperledger/cactus/commit/20e15cd257628fe392818e14728851304a76c7cb))
* **core-api:** modifications in openapi specs ([96c8b82](https://github.com/hyperledger/cactus/commit/96c8b82a642fdf106178ecdc47ff1f12fff229d1))
* openapi tests for besu, htlc-eth-besu and htlc-eth-besu-erc20 ([b9170e9](https://github.com/hyperledger/cactus/commit/b9170e929492f3305a420c75c7d12d06b288e0ab)), closes [#1291](https://github.com/hyperledger/cactus/issues/1291) [#847](https://github.com/hyperledger/cactus/issues/847)
* openapi validation test for fabric plugin ([01a5eb4](https://github.com/hyperledger/cactus/commit/01a5eb423abcc54aed8e2b4973251961e7849f76)), closes [#1295](https://github.com/hyperledger/cactus/issues/1295) [#847](https://github.com/hyperledger/cactus/issues/847)
* openapi validation test for iroha plugin ([6deed6d](https://github.com/hyperledger/cactus/commit/6deed6d3f070982061e33a11064ffb8d4e752f37)), closes [#1331](https://github.com/hyperledger/cactus/issues/1331) [#847](https://github.com/hyperledger/cactus/issues/847)
* **plugin-ledger-connector-quorum:** no keychain endpoints ([15cf65c](https://github.com/hyperledger/cactus/commit/15cf65cea6a779d12542b4ccc2e4940e7ac12039))
* **tools:** add docker network on tools/docker/sawtooth ledger ([8a0d182](https://github.com/hyperledger/cactus/commit/8a0d182e6badb3a6f10e40811390693e92628d1d))
* **tools:** fix the wallet config of fabcar chaincode on tools/docker/fabric ledger ([7ab0c44](https://github.com/hyperledger/cactus/commit/7ab0c44b488f441b31a8ef5dedd9ba9d2358ad78))
* **webpack:** prod build chokes on upgraded ssh2 binaries [#1405](https://github.com/hyperledger/cactus/issues/1405) ([18979fb](https://github.com/hyperledger/cactus/commit/18979fb33880d8ca30e2fda01fb3d598deb839f9))


### Features

* **besu-test-ledger:** added omitPull parameter to besu test ledger ([336a024](https://github.com/hyperledger/cactus/commit/336a0242e20b075736b1b008a478e65b4db3af8b))
* **cmd-server-socket:** add a communication test to open-api validators ([c1fe6a0](https://github.com/hyperledger/cactus/commit/c1fe6a0e0b6b84442adf2641393b8f744e76ab34))
* **cmd-server-socket:** add validator-registry setting ([1d1ce21](https://github.com/hyperledger/cactus/commit/1d1ce21a10244fc1b5a8a267d85a3f2beffc981e))
* **connector-go-ethereum:** add the docker environment ([2583cc7](https://github.com/hyperledger/cactus/commit/2583cc7ff7428a427454e7dd9211a129942e50d4))
* **connector-iroha-socket:** add sendAsyncRequest feature on connector ([6bad29b](https://github.com/hyperledger/cactus/commit/6bad29bddfb2a4ef3b98d7c8c4d41efad974bb56))
* **connector-quorum:** containerize plugin ([d016678](https://github.com/hyperledger/cactus/commit/d0166780215802c2e5bb6e895448ac687de0383c))
* **connector-sawtooth:** add the docker environment of Validator on connector-sawtooth-socketio ([7a57ea4](https://github.com/hyperledger/cactus/commit/7a57ea4adeb84bdf00bf32472ceac68fd43dc52d))
* **fabric-connector:** add transact receipt ([c6d1b7a](https://github.com/hyperledger/cactus/commit/c6d1b7a180025f84f055bf537b5263eb44b2511f))
* **keychain-aws-sm:** complete request handler and endpoint ([e6099b8](https://github.com/hyperledger/cactus/commit/e6099b86152a35ac7a21aecc02824410c05eac88)), closes [#967](https://github.com/hyperledger/cactus/issues/967) [#1349](https://github.com/hyperledger/cactus/issues/1349)
* **keychain-google-sm:** complete request handler and endpoints ([9c7bab5](https://github.com/hyperledger/cactus/commit/9c7bab5b06c7081421bcbfa1ae6aa8a3577a917e)), closes [#1097](https://github.com/hyperledger/cactus/issues/1097) [#1349](https://github.com/hyperledger/cactus/issues/1349)
* **tools:** substrate test ledger ([1a5edea](https://github.com/hyperledger/cactus/commit/1a5edeae834bc275252e588379f214324977a3ff))





# [0.10.0](https://github.com/hyperledger/cactus/compare/v0.9.0...v0.10.0) (2021-09-28)


### Bug Fixes

* **discounted-cartrade:** modify README.md ([9a3d89a](https://github.com/hyperledger/cactus/commit/9a3d89ae2f5d4862d58a69c56b47d7de3ee7ac3d))
* openapi validation test for consortium-manual plugin ([c568ad3](https://github.com/hyperledger/cactus/commit/c568ad3627f2f55a83ad9586b72824c44719e08a)), closes [#1297](https://github.com/hyperledger/cactus/issues/1297) [#847](https://github.com/hyperledger/cactus/issues/847)
* openapi validation test for keychain-vault plugin ([6630ebe](https://github.com/hyperledger/cactus/commit/6630ebed4c2d4c7aa3ddd6c5e306b9bb1613f827)), closes [#1329](https://github.com/hyperledger/cactus/issues/1329) [#847](https://github.com/hyperledger/cactus/issues/847)
* openapi validation test for quorum plugin ([8a4222a](https://github.com/hyperledger/cactus/commit/8a4222aacf3999838573d72fb82099398b955d99)), closes [#1286](https://github.com/hyperledger/cactus/issues/1286) [#847](https://github.com/hyperledger/cactus/issues/847)
* openapi validation test for xdai plugin ([ba8a784](https://github.com/hyperledger/cactus/commit/ba8a784bb01bde2c8daf27f4a09965ea2dbb9f04)), closes [#1288](https://github.com/hyperledger/cactus/issues/1288) [#847](https://github.com/hyperledger/cactus/issues/847)
* **test:** flaky fabric AIO container boot [#876](https://github.com/hyperledger/cactus/issues/876) ([beefcef](https://github.com/hyperledger/cactus/commit/beefcefbebbdb9a22d08118b6fb2e667493504cf)), closes [#718](https://github.com/hyperledger/cactus/issues/718) [#320](https://github.com/hyperledger/cactus/issues/320) [#319](https://github.com/hyperledger/cactus/issues/319)
* **validators:** add some missing parts ([9a8f7db](https://github.com/hyperledger/cactus/commit/9a8f7db746e2a41708e2fe9d5277561d6abac3d4))


### Features

* **besu:** support besu v21.1.6 [#982](https://github.com/hyperledger/cactus/issues/982) ([d715c67](https://github.com/hyperledger/cactus/commit/d715c679fee681844f29ed30f09f6d651daf087e))
* **ci:** skip check when only documentation files [#1014](https://github.com/hyperledger/cactus/issues/1014) ([8937576](https://github.com/hyperledger/cactus/commit/8937576ecc6e551feb3515bdb135cbd953a3ea28))
* **corda:** support corda v4.8 [#889](https://github.com/hyperledger/cactus/issues/889) ([5f45813](https://github.com/hyperledger/cactus/commit/5f45813efd98507a59e8f6a84417819bc0c80742))
* **core-api:** discontinue dedicated HTTP listeners for web service plugins ([3fbd2fc](https://github.com/hyperledger/cactus/commit/3fbd2fcb60d49090bf4e986bea74d4e988348659)), closes [#358](https://github.com/hyperledger/cactus/issues/358)
* **core:** add installOpenapiValidationMiddleware ([1f6ea5f](https://github.com/hyperledger/cactus/commit/1f6ea5fe3aa1ba997a655098d632034f13f232a5)), closes [#847](https://github.com/hyperledger/cactus/issues/847)
* **improve-indy-testnet-docker:** auto-start server on container startup [#1308](https://github.com/hyperledger/cactus/issues/1308) ([35b20ac](https://github.com/hyperledger/cactus/commit/35b20ac25df207c5cf329f60541c69375b408ab1))
* **quorum-connector:** remove hard dependency on keychain ([5bf13e9](https://github.com/hyperledger/cactus/commit/5bf13e9830c00d6cca00042b5dafa22325f50a90))
* **validator:** add a draft of Iroha Validator ([466db28](https://github.com/hyperledger/cactus/commit/466db288548b1b57d986507646e74d58e85979e4))





# [0.9.0](https://github.com/hyperledger/cactus/compare/v0.8.0...v0.9.0) (2021-08-31)


### Bug Fixes

* check for req function onPluginInit in isCactusPlugin ([f5ffb92](https://github.com/hyperledger/cactus/commit/f5ffb92d5a03ecb14ec6952d8dff0d8ec101df35)), closes [#1277](https://github.com/hyperledger/cactus/issues/1277)
* **cmd-api-server:** add missing deps remove unused ones [#1226](https://github.com/hyperledger/cactus/issues/1226) ([b348e42](https://github.com/hyperledger/cactus/commit/b348e4266369fed502610b4c0769d4d6b19f9115))
* **examples:** front-end packages missing browserify polyfills [#1224](https://github.com/hyperledger/cactus/issues/1224) ([4cc6f2c](https://github.com/hyperledger/cactus/commit/4cc6f2c5d3345a7af8cc04b9218c38d7670872a8))
* **indy-validator:** fixing indy validator initialization ([d9f6d5d](https://github.com/hyperledger/cactus/commit/d9f6d5d9cf32eb49a6159d42c717484642a98e61))
* remove no longer working scripts from package.json ([fcf26ed](https://github.com/hyperledger/cactus/commit/fcf26edf6e2d87ae619875e2d38135d5ed11a995)), closes [#1271](https://github.com/hyperledger/cactus/issues/1271)


### Features

* besu private transaction support ([53b4980](https://github.com/hyperledger/cactus/commit/53b49808615aced96b628bf1498a1b62c5c9ca42))
* **cmd-api-server:** support grpc web services [#1189](https://github.com/hyperledger/cactus/issues/1189) ([4cace1d](https://github.com/hyperledger/cactus/commit/4cace1dca3377e09d2ed37fdadeec6b125d47896))
* **connector-fabric:** add support for vault transit secret engine ([2161e0d](https://github.com/hyperledger/cactus/commit/2161e0d75bac49654f0d38c8a9e2b03234894ed8))
* **connector-iroha:** adds connector plugin ([4745df0](https://github.com/hyperledger/cactus/commit/4745df0bee6b9ab5fb9e57bb603ae95d6baeb391))
* **corda:** resolves [#888](https://github.com/hyperledger/cactus/issues/888) ([d4af647](https://github.com/hyperledger/cactus/commit/d4af647f96b9eda592ffe1797679e086e32a039d))
* **iroha:** add iroha AIO image and iroha test ledger ([1eb811a](https://github.com/hyperledger/cactus/commit/1eb811a3c92f8459298c9f10b9e0d13e36d667b6))





# [0.8.0](https://github.com/hyperledger/cactus/compare/v0.7.0...v0.8.0) (2021-08-17)


### Bug Fixes

* **cmd-api-server:** plugins interfere with API server deps [#1192](https://github.com/hyperledger/cactus/issues/1192) ([a96ce68](https://github.com/hyperledger/cactus/commit/a96ce689dae74345b41d5bd94dd46dd3e9bc3e71)), closes [#1203](https://github.com/hyperledger/cactus/issues/1203)
* **example:** send http request to discounted-cartrade ([8f268e8](https://github.com/hyperledger/cactus/commit/8f268e8389a8d3554a0169ef137063c78e2a39f2))
* **plugin-consortium-manual:** drop repo constructor arg [#1199](https://github.com/hyperledger/cactus/issues/1199) ([7b424d4](https://github.com/hyperledger/cactus/commit/7b424d465dd7c11900e0afea5c32514a9b585084))
* **prometheus:** metrics.ts leaks to global registry [#1202](https://github.com/hyperledger/cactus/issues/1202) ([ce076d7](https://github.com/hyperledger/cactus/commit/ce076d709f8e0cba143f8fe9d71f1de1df8f71dc))





# [0.7.0](https://github.com/hyperledger/cactus/compare/v0.6.0...v0.7.0) (2021-08-04)


### Bug Fixes

* **connector-corda:** fix build broken by operationId rename ([291dd3b](https://github.com/hyperledger/cactus/commit/291dd3bc666939fffbc3780eaefd9059c756878a))
* **examples/discounted-cartrade:** update default.json to activate trade process ([dd5c3f1](https://github.com/hyperledger/cactus/commit/dd5c3f12e6c08a5798ef5b7f794114242a1b1e94))


### Features

* **aws-sm:** added keychain plugin for aws secret manager ([ed6db9e](https://github.com/hyperledger/cactus/commit/ed6db9edc2064046308be91b73f620cbb2a6fb58)), closes [#912](https://github.com/hyperledger/cactus/issues/912)
* **azure-kv:** added keychain plugin for azure keyvault ([69e7b50](https://github.com/hyperledger/cactus/commit/69e7b50f127fbf247a43288353388782a4301686)), closes [#971](https://github.com/hyperledger/cactus/issues/971)
* **besu:** record locator ([2410d6d](https://github.com/hyperledger/cactus/commit/2410d6d4430f5b1f587befa01824a7674c6e11fa))
* **connector-fabric:** endorsing peers request arg [#1122](https://github.com/hyperledger/cactus/issues/1122) ([c6057a7](https://github.com/hyperledger/cactus/commit/c6057a7ac508f3bd8da8c9611414a627ff772024)), closes [#1123](https://github.com/hyperledger/cactus/issues/1123) [#1130](https://github.com/hyperledger/cactus/issues/1130)
* **connector-fabric:** identity json signing credentials [#1130](https://github.com/hyperledger/cactus/issues/1130) ([bc262a2](https://github.com/hyperledger/cactus/commit/bc262a24ae654899e8941e7910953c6c561ea778)), closes [#1124](https://github.com/hyperledger/cactus/issues/1124)
* **example:** add README on examples/discounted-cartrade ([2eac8bf](https://github.com/hyperledger/cactus/commit/2eac8bf8c819911ded6cbdf2368398fbd6977a64))
* **examples/discounted_cartrade:** add preferredcustomer-jugdement ([43be168](https://github.com/hyperledger/cactus/commit/43be16828581ebf0fabb4b0e8356e052bbcd8760))
* **google-sm:** added keychain plugin for google secret manager ([1419b2c](https://github.com/hyperledger/cactus/commit/1419b2c8c1b12a08e940ba4f0ff824420d88c233)), closes [#983](https://github.com/hyperledger/cactus/issues/983)
* **validator-indy:** enhance the request feature on Validator-Indy [#1181](https://github.com/hyperledger/cactus/issues/1181





# [0.6.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.6.0) (2021-07-19)


### Bug Fixes

* **carbon-accounting:** deleted incorrect plugin aspect ([e30f48a](https://github.com/hyperledger/cactus/commit/e30f48abcc8dfcd6fb17ec1ba90c4e742222543f))
* **ci:** dependent issues bot workflow has no job id [#848](https://github.com/hyperledger/cactus/issues/848) ([af61202](https://github.com/hyperledger/cactus/commit/af61202f73b72efe6df31e5697eedd94f84d417c))
* **cmd-api-server:** config-service example - authorization JSON ([a209fef](https://github.com/hyperledger/cactus/commit/a209feffdea47f0992f17a7c0265535614143dfe))
* **cmd-api-server:** drop URI type alt name from self signed TLS cert ([eb5d1df](https://github.com/hyperledger/cactus/commit/eb5d1dfaf8523690008c1c1c0aaa0b0efedb2cba))
* **cmd-api-server:** no CLI args causes crash [#794](https://github.com/hyperledger/cactus/issues/794) ([a285b96](https://github.com/hyperledger/cactus/commit/a285b96785792cd29f450bfc1cc066067c82f558))
* **connector-besu:** network update only if present in keychain ([8ac2444](https://github.com/hyperledger/cactus/commit/8ac2444f86f9a1310f045ff0f7e4e78b91635be0))
* **connector-besu:** remove magic strings ([6d9ae53](https://github.com/hyperledger/cactus/commit/6d9ae53c64bd4e6c3eb33164bfa5d5507582220b)), closes [#1104](https://github.com/hyperledger/cactus/issues/1104)
* **connector-besu:** removed repeated check ([a4cb63b](https://github.com/hyperledger/cactus/commit/a4cb63b483d61578dd0d356fc0c9c20d8a2024e0))
* **connector-corda:** container image kotlin compilation fails in model ([a8a4531](https://github.com/hyperledger/cactus/commit/a8a4531d379fe16d4c991802525ec573a7e3ede1))
* **connector-corda:** kotlin compilation error due to missing method ([403f135](https://github.com/hyperledger/cactus/commit/403f13592734cfdcbbfa3714b76a9557aaa4a8b4))
* **connector-fabric:** export IPluginLedgerConnectorFabricOptions ([ada532e](https://github.com/hyperledger/cactus/commit/ada532ef09603727379b6193b175e2834fa803d3))
* **connector-quorum:** web3 Contract type usage ([80c8253](https://github.com/hyperledger/cactus/commit/80c82536f6446896a07aab9276f93598266ea5c3))
* **connector-xdai:** add missing hasTransactionFinality ([cc4f3e1](https://github.com/hyperledger/cactus/commit/cc4f3e141da9292b8db5b0261a3347b3ba9c0689))
* **connector-xdai:** web3.eth.estimateGas, works considering called solidity method do not throw an exception. So, for method having modifier with access control on msg.sender calling estimateGas without from field throws error.to make it work ,transactionConfig.from = web3SigningCredential.ethAccount before calling estimateGas ([63f5ff6](https://github.com/hyperledger/cactus/commit/63f5ff62b20aaf4dfdb5dd48a24dabc3342a0868))
* **deps:** elliptic upgrade to >6.5.3 for CVE-2020-28498 ([d75b9af](https://github.com/hyperledger/cactus/commit/d75b9af764241ab2e10914769412201fb040b1ed))
* **example:** fix README and add script to cleanup app data after test ([b07bde4](https://github.com/hyperledger/cactus/commit/b07bde41de04e80d913b929e42a55eef5141fd2f))
* **examples:** supply chain backend bundle build RAM [#766](https://github.com/hyperledger/cactus/issues/766) ([f5c5d82](https://github.com/hyperledger/cactus/commit/f5c5d82ef3ae327f057da94ea12a224f9b4d78c6))
* fixing branch name for code cov badge ([d79d965](https://github.com/hyperledger/cactus/commit/d79d96525e2117683e20a8442fd4efbfaf32e55b))
* **github/workflows:** dependent issues job name typo ([0b4e333](https://github.com/hyperledger/cactus/commit/0b4e333fe81b12352258159d35e61f0108df1212))
* keychain to registry, uuid dep, add back missing gas req parameter ([4635d81](https://github.com/hyperledger/cactus/commit/4635d817a719bcdaa2a3bf1b4aa3b5d8cc1f6961))
* **readthedocs:** updated readthedocs file ([645f47d](https://github.com/hyperledger/cactus/commit/645f47de0304f3ade38dfedc056159a613f3f005))
* **test:** eliminate CVE-2020-8203 in besu connector test pkg ([6411933](https://github.com/hyperledger/cactus/commit/6411933a167711152165d86a260d5f49d272746d))
* **tools:** ci.sh retry mechanism no longer ignores last failure ([b5e751e](https://github.com/hyperledger/cactus/commit/b5e751e405d0c612f71c50fa964600134d25e0c2))
* **tools:** fix a typo of README on iroha-testnet ([1b333cd](https://github.com/hyperledger/cactus/commit/1b333cdc8757ec4733ec0189d092ada7c827023d))
* **tools:** use latest fabric bootstrap.sh script for AIO image ([b298b76](https://github.com/hyperledger/cactus/commit/b298b76a03382fa2729b89a6066b693e3c072582))
* **typo:** fix typo of bisiness ([142cd56](https://github.com/hyperledger/cactus/commit/142cd569c2c681042c592443b57108a127a8b820))
* **Validator,verifier:** delete some minor duplicated files ([9acb8ab](https://github.com/hyperledger/cactus/commit/9acb8abfa52f1dc576abb755431cfa85d94b34e6))
* **whitepaper:** build fails on Ubuntu 18 due to glibc 2.29 [#703](https://github.com/hyperledger/cactus/issues/703) ([ec22a0f](https://github.com/hyperledger/cactus/commit/ec22a0fc94929ae0fe8b44f93ce20f44847ec176))
* **whitepaper:** fix rendering ([d64f3cd](https://github.com/hyperledger/cactus/commit/d64f3cd9cc6fd2c3998d139f1872f2c3eaeffc60))


### Features

* add SocketIoConnectionPathV1 constant to OpenAPI specs ([405865d](https://github.com/hyperledger/cactus/commit/405865d02e57031c1531431a4a46b96a1b9aff03))
* adding additional info into err logs ([888f85a](https://github.com/hyperledger/cactus/commit/888f85a680a330cfc6be98bab3e8aed5d9e9dde2)), closes [#295](https://github.com/hyperledger/cactus/issues/295)
* **api-server:** ability to install plugins at runtime [#764](https://github.com/hyperledger/cactus/issues/764) ([8dda0f6](https://github.com/hyperledger/cactus/commit/8dda0f61937c6e1a85afee0345af44b1bfa09c0a))
* **api-server:** publish API server docker image ([ad7b221](https://github.com/hyperledger/cactus/commit/ad7b2211305bcefb044701276a56d5ad09d8468c))
* **atomic-swap-erc20:** implemented plugin and test ([0c9423a](https://github.com/hyperledger/cactus/commit/0c9423a2a2cd4675c3c6dec4288190f148cad938))
* besu WatchBlocksV1Endpoint with SocketIO ([d5e1708](https://github.com/hyperledger/cactus/commit/d5e1708e84ab5192d07410d5120e144d477ef6ce))
* **besu:** add sequence diagram of run transaction endpoint ([754a11a](https://github.com/hyperledger/cactus/commit/754a11a449d9a67dd8d6ebecbeb1b65cefa71b7f)), closes [#755](https://github.com/hyperledger/cactus/issues/755)
* **cmd-api-server:** add Socket.IO as transport [#297](https://github.com/hyperledger/cactus/issues/297) ([51c586a](https://github.com/hyperledger/cactus/commit/51c586aa01bff3e75f0e87be43f0764b30d8222c))
* **cmd-api-server:** container image definition ([eb69fff](https://github.com/hyperledger/cactus/commit/eb69fff36fca805c6b96c6db7caadfbed85e8485))
* **cmd-api-server:** user defined type guard isHealthcheckResponse ([16077d4](https://github.com/hyperledger/cactus/commit/16077d42ec7edce4999d77cfbca5c02177d15fa6))
* **connector-besu, connector-quorum:** filesystem replaced by keychain ([14d1790](https://github.com/hyperledger/cactus/commit/14d17904442723450790644653ff18dda79dfa5e))
* **connector-besu,connector-quorum:** updated ([985f12f](https://github.com/hyperledger/cactus/commit/985f12f69c52a139a72aecc9b050e71545a90df8))
* **connector-besu:** add get balance method ([db71c5c](https://github.com/hyperledger/cactus/commit/db71c5ce1af09bd1c60b9dbc841ca13c3eb75782))
* **connector-besu:** add get past logs method ([e3fcfa7](https://github.com/hyperledger/cactus/commit/e3fcfa7173667b0d3c7a4bd92a6706444e0717b1))
* **connector-besu:** add get past logs method ([c4900e9](https://github.com/hyperledger/cactus/commit/c4900e98f753e733e07170cea7003aefcee0dbdd))
* **connector-besu:** add getBalance web service ([50107f6](https://github.com/hyperledger/cactus/commit/50107f62cda1e3be688576b9074b9408757e9b49)), closes [#1066](https://github.com/hyperledger/cactus/issues/1066)
* **connector-besu:** add getBlock web service [#1065](https://github.com/hyperledger/cactus/issues/1065) ([869c48b](https://github.com/hyperledger/cactus/commit/869c48ba4d8000b50d1d64a8a0897b50dde21d5d))
* **connector-besu:** add getPastLogs web service ([c037ec5](https://github.com/hyperledger/cactus/commit/c037ec55bc07e5314cd2104579b1a882d79f1488)), closes [#1067](https://github.com/hyperledger/cactus/issues/1067)
* **connector-besu:** add getTransaction web service ([0ca0769](https://github.com/hyperledger/cactus/commit/0ca0769ac4d1c3d43afc553813cf31983e5cb1b1)), closes [#1062](https://github.com/hyperledger/cactus/issues/1062) [#1061](https://github.com/hyperledger/cactus/issues/1061)
* **connector-besu:** contract deployment with constructor arguments ([48d67a7](https://github.com/hyperledger/cactus/commit/48d67a7a7af223337777917a01002426a79f8463)), closes [#810](https://github.com/hyperledger/cactus/issues/810)
* **connector-besu:** contractAbi optional parameter ([26cf7c2](https://github.com/hyperledger/cactus/commit/26cf7c23919436ca82107b532309b5197ad2e39d))
* **connector-besu:** dockerfile ([7174004](https://github.com/hyperledger/cactus/commit/71740048eb97e2855febc96a91a5f64215591187))
* **connector-besu:** getTransaction method ([d470540](https://github.com/hyperledger/cactus/commit/d4705403b88023ecd3b7f68223215019053982cd))
* **connector-besu:** replace invokeContractV2 ([ecd62ea](https://github.com/hyperledger/cactus/commit/ecd62eac5721514dbcfc401d5f28dfdc58ef8873))
* **connector-fabric:** containerize-fabric ([b53b3a4](https://github.com/hyperledger/cactus/commit/b53b3a4c1cb36e7a0f14d405cdecb3c8341f956d))
* **connector-fabric:** contract deployment Fabric 2.x ([139a8ed](https://github.com/hyperledger/cactus/commit/139a8ed96d5d547a514839a461abcb7d0e937cb0))
* **connector-fabric:** enrollAdmin() and createCaClient() ([da1cb1b](https://github.com/hyperledger/cactus/commit/da1cb1bc3c3751b5d10f98a457ae0ec62b6bdebf))
* **connector-quorum:** contractAbi optional parameter ([c79d763](https://github.com/hyperledger/cactus/commit/c79d763e0cb093647209417cfed7a2645283f302))
* **connector-quorum:** support v21.4.1 and Tessera 21.1.1 [#901](https://github.com/hyperledger/cactus/issues/901) ([33fdd50](https://github.com/hyperledger/cactus/commit/33fdd50e6a9cdeff433a9614c6498fa1c370f50a))
* **connector-xdai:** add interval to pollForTxReceipt ([40be742](https://github.com/hyperledger/cactus/commit/40be74234f3bbd059fbc41f61890d25eec1d6ff8))
* **connector-xdai:** add ledger connector plugin for xdai [#852](https://github.com/hyperledger/cactus/issues/852) ([99399a3](https://github.com/hyperledger/cactus/commit/99399a3bd5020c66d2899aca500a880777b6523d))
* **corda:** prometheus exporter metrics integration ([9f37755](https://github.com/hyperledger/cactus/commit/9f3775580381cbdf314c6a75188114315d1844c6)), closes [#535](https://github.com/hyperledger/cactus/issues/535)
* **core-api:** add plugin object store interface definition ([4bf8038](https://github.com/hyperledger/cactus/commit/4bf8038ea4c0c341cef3a63b59f77c12cec65a46))
* **core-api:** decouple web service install & registration [#771](https://github.com/hyperledger/cactus/issues/771) ([b50e148](https://github.com/hyperledger/cactus/commit/b50e148f43c0b27138471c972aab391486e761e6))
* **core-api:** hasTransactionFinality() on connector API [#354](https://github.com/hyperledger/cactus/issues/354) ([a2d0582](https://github.com/hyperledger/cactus/commit/a2d058218780e5e4c81e5f847cc875879a946e3f))
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))
* **core-api:** plugin async initializer method ([9678c2e](https://github.com/hyperledger/cactus/commit/9678c2e9288a73589e84f9fd254c26aed6a93297))
* **core-api:** plugin interface async initializer ([d40f68b](https://github.com/hyperledger/cactus/commit/d40f68bd9eaff498df8514fe7397986b5a2f865d))
* **core:** add plugin registry log level constructor arg ([1652b33](https://github.com/hyperledger/cactus/commit/1652b33255c211e87e33ceb3e421cb9fb4182502))
* expose besu test ledger web socket API port ([e198a99](https://github.com/hyperledger/cactus/commit/e198a99f5fe7c2ac5c7bc1a8be0f0d29259871a8))
* **fabric-connector:** add private data support ([3f503f9](https://github.com/hyperledger/cactus/commit/3f503f9a57bcdb14c3a3045fb516491b4f4879b4))
* **fabric:** add sequence diagram of run transaction endpoint ([155cbab](https://github.com/hyperledger/cactus/commit/155cbab3c0358f6c259df8c0f92b788cbdfc6a71)), closes [#756](https://github.com/hyperledger/cactus/issues/756)
* **htlc-eth-besu:** implemented plugin + test ([6684557](https://github.com/hyperledger/cactus/commit/6684557d5de863fa3e023b4c8afe239ea62143eb))
* incorporating load testing into our CI pipeline ([7125d10](https://github.com/hyperledger/cactus/commit/7125d1043091e0443edaa7b63021cd0b96404c4b)), closes [#295](https://github.com/hyperledger/cactus/issues/295)
* **iroha-testnet:** Add REJECT check for transactions to setup-iroha-wallet.sh script in iroha-testnet ([cf60ec0](https://github.com/hyperledger/cactus/commit/cf60ec0fd3f09762c940765c07265f928294b465))
* **iroha-testnet:** iroha-testnet ([dee1b12](https://github.com/hyperledger/cactus/commit/dee1b12f98e70ac24faf69d757db6220be751bc7))
* **keychain-vault:** add the missing endpoint classes [#676](https://github.com/hyperledger/cactus/issues/676) ([341cffc](https://github.com/hyperledger/cactus/commit/341cffcef72286169a4ceced69414618d5059d0e))
* **plugin-object-store-ipfs:** add IPFS plugin implementation ([6d1de27](https://github.com/hyperledger/cactus/commit/6d1de274b45a3fd2cc5120588f9d8594d5d3ace6))
* **readme:** removing enforced 100% code coverage check ([04cacc9](https://github.com/hyperledger/cactus/commit/04cacc9502e017a84258cb1cd1c56b66f6f9dd58))
* **test-tooling:** add besu multi-party test ledger ([89f173e](https://github.com/hyperledger/cactus/commit/89f173eea9deb15f0c2f6bd94ccefeb453fbeb39))
* **test-tooling:** add besu test ledger log level constructor arg ([60ee32f](https://github.com/hyperledger/cactus/commit/60ee32fb0e65e8325194a8798dd8cde093a141d3)), closes [#780](https://github.com/hyperledger/cactus/issues/780)
* **test-tooling:** add keycloak container ([f1abb3e](https://github.com/hyperledger/cactus/commit/f1abb3e8d2e05aa18008da176753b240528e95e6))
* **test-tooling:** add OpenEthereumTestLedger [#851](https://github.com/hyperledger/cactus/issues/851) ([9ca1f68](https://github.com/hyperledger/cactus/commit/9ca1f6839749450b4d8887c5af14a888225d645f))
* **test-tooling:** containers#logDiagnostics() utility method ([ed9e125](https://github.com/hyperledger/cactus/commit/ed9e125723508827a096293c808dbfac1fdba41c))
* **test-tooling:** go-ipfs test container ([e62b1b0](https://github.com/hyperledger/cactus/commit/e62b1b08988463fdccdd88743562081a486285f2))
* **test-tooling:** quorum AIO upgrade to Quorum v21.4.1 [#900](https://github.com/hyperledger/cactus/issues/900) ([67af2c4](https://github.com/hyperledger/cactus/commit/67af2c466f10800124a3288aa8fcf13cfd05d1f8))
* **test-tooling:** quorum test ledger omit pull parameter ([73f84f7](https://github.com/hyperledger/cactus/commit/73f84f7399c30f6cf3e1a0c46e4b9b9ec26dbced))
* **test-tooling:** rust compiler container for wasm builds ([ad7cdc0](https://github.com/hyperledger/cactus/commit/ad7cdc07e1f40e2b663577312ed47b1b64e9eafc))
* **tools:** add test-npm-registry contaimer image ([19afe85](https://github.com/hyperledger/cactus/commit/19afe851dc9efbc37ab012146e9c41bfc296304a))
* **tools:** docker-compose files for indy corresponding to issue [#866](https://github.com/hyperledger/cactus/issues/866) ([599acc0](https://github.com/hyperledger/cactus/commit/599acc0d2fe2454c74d4072c3c0646a500765779))
* **tools:** fabric all-in-one 2.x add nodejs to image ([dc09540](https://github.com/hyperledger/cactus/commit/dc09540ba96e346e256363cd4cbeecc6d7aacf73))
* **tools:** upgrade go to 1.16.3 in Fabric 1.4.x AIO image ([d28ed6e](https://github.com/hyperledger/cactus/commit/d28ed6ef982bec670245360498e204d46f1d2f0c)), closes [#914](https://github.com/hyperledger/cactus/issues/914)
* **validator:** indy validator and indy-testnet files ([8eef3fa](https://github.com/hyperledger/cactus/commit/8eef3fa46cd178c7991fdcc9053284e6da5ddfd8))


### Performance Improvements

* **cmd-api-server:** shrink API server bundle with type-only imports ([4875fc3](https://github.com/hyperledger/cactus/commit/4875fc346bba70ee87d8fe033435035201d48b3e))
* leverage import type syntax to save on bundle size ([11f93a0](https://github.com/hyperledger/cactus/commit/11f93a03116d26b64b516dba3c05d97a59afeabc))
* **tools:** fabric 1.x AIO image pre-fetching [#649](https://github.com/hyperledger/cactus/issues/649) ([a4722fa](https://github.com/hyperledger/cactus/commit/a4722fa1a8a1141bb274d10bc6192f4174c60302))


### BREAKING CHANGES

* 🧨 Behaviour in a cloud environment is currently untested and could impact
CI pipeline time.





# [0.5.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.5.0) (2021-05-19)


### Bug Fixes

* **ci:** dependent issues bot workflow has no job id [#848](https://github.com/hyperledger/cactus/issues/848) ([af61202](https://github.com/hyperledger/cactus/commit/af61202f73b72efe6df31e5697eedd94f84d417c))
* **cmd-api-server:** no CLI args causes crash [#794](https://github.com/hyperledger/cactus/issues/794) ([a285b96](https://github.com/hyperledger/cactus/commit/a285b96785792cd29f450bfc1cc066067c82f558))
* **connector-besu:** network update only if present in keychain ([8ac2444](https://github.com/hyperledger/cactus/commit/8ac2444f86f9a1310f045ff0f7e4e78b91635be0))
* **connector-fabric:** export IPluginLedgerConnectorFabricOptions ([ada532e](https://github.com/hyperledger/cactus/commit/ada532ef09603727379b6193b175e2834fa803d3))
* **connector-quorum:** web3 Contract type usage ([80c8253](https://github.com/hyperledger/cactus/commit/80c82536f6446896a07aab9276f93598266ea5c3))
* **connector-xdai:** add missing hasTransactionFinality ([cc4f3e1](https://github.com/hyperledger/cactus/commit/cc4f3e141da9292b8db5b0261a3347b3ba9c0689))
* **deps:** elliptic upgrade to >6.5.3 for CVE-2020-28498 ([d75b9af](https://github.com/hyperledger/cactus/commit/d75b9af764241ab2e10914769412201fb040b1ed))
* **examples:** supply chain backend bundle build RAM [#766](https://github.com/hyperledger/cactus/issues/766) ([f5c5d82](https://github.com/hyperledger/cactus/commit/f5c5d82ef3ae327f057da94ea12a224f9b4d78c6))
* **test:** eliminate CVE-2020-8203 in besu connector test pkg ([6411933](https://github.com/hyperledger/cactus/commit/6411933a167711152165d86a260d5f49d272746d))
* **tools:** ci.sh retry mechanism no longer ignores last failure ([b5e751e](https://github.com/hyperledger/cactus/commit/b5e751e405d0c612f71c50fa964600134d25e0c2))
* **tools:** use latest fabric bootstrap.sh script for AIO image ([b298b76](https://github.com/hyperledger/cactus/commit/b298b76a03382fa2729b89a6066b693e3c072582))
* **whitepaper:** build fails on Ubuntu 18 due to glibc 2.29 [#703](https://github.com/hyperledger/cactus/issues/703) ([ec22a0f](https://github.com/hyperledger/cactus/commit/ec22a0fc94929ae0fe8b44f93ce20f44847ec176))
* **whitepaper:** fix rendering ([d64f3cd](https://github.com/hyperledger/cactus/commit/d64f3cd9cc6fd2c3998d139f1872f2c3eaeffc60))
* keychain to registry, uuid dep, add back missing gas req parameter ([4635d81](https://github.com/hyperledger/cactus/commit/4635d817a719bcdaa2a3bf1b4aa3b5d8cc1f6961))


### Features

* **api-server:** ability to install plugins at runtime [#764](https://github.com/hyperledger/cactus/issues/764) ([8dda0f6](https://github.com/hyperledger/cactus/commit/8dda0f61937c6e1a85afee0345af44b1bfa09c0a))
* **besu:** add sequence diagram of run transaction endpoint ([754a11a](https://github.com/hyperledger/cactus/commit/754a11a449d9a67dd8d6ebecbeb1b65cefa71b7f)), closes [#755](https://github.com/hyperledger/cactus/issues/755)
* **cmd-api-server:** container image definition ([eb69fff](https://github.com/hyperledger/cactus/commit/eb69fff36fca805c6b96c6db7caadfbed85e8485))
* **cmd-api-server:** user defined type guard isHealthcheckResponse ([16077d4](https://github.com/hyperledger/cactus/commit/16077d42ec7edce4999d77cfbca5c02177d15fa6))
* **connector-besu:** contract deployment with constructor arguments ([48d67a7](https://github.com/hyperledger/cactus/commit/48d67a7a7af223337777917a01002426a79f8463)), closes [#810](https://github.com/hyperledger/cactus/issues/810)
* **connector-besu:** contractAbi optional parameter ([26cf7c2](https://github.com/hyperledger/cactus/commit/26cf7c23919436ca82107b532309b5197ad2e39d))
* **connector-besu:** dockerfile ([7174004](https://github.com/hyperledger/cactus/commit/71740048eb97e2855febc96a91a5f64215591187))
* **connector-besu:** replace invokeContractV2 ([ecd62ea](https://github.com/hyperledger/cactus/commit/ecd62eac5721514dbcfc401d5f28dfdc58ef8873))
* **connector-besu, connector-quorum:** filesystem replaced by keychain ([14d1790](https://github.com/hyperledger/cactus/commit/14d17904442723450790644653ff18dda79dfa5e))
* **connector-besu,connector-quorum:** updated ([985f12f](https://github.com/hyperledger/cactus/commit/985f12f69c52a139a72aecc9b050e71545a90df8))
* **connector-fabric:** containerize-fabric ([b53b3a4](https://github.com/hyperledger/cactus/commit/b53b3a4c1cb36e7a0f14d405cdecb3c8341f956d))
* **connector-fabric:** contract deployment Fabric 2.x ([139a8ed](https://github.com/hyperledger/cactus/commit/139a8ed96d5d547a514839a461abcb7d0e937cb0))
* **connector-fabric:** enrollAdmin() and createCaClient() ([da1cb1b](https://github.com/hyperledger/cactus/commit/da1cb1bc3c3751b5d10f98a457ae0ec62b6bdebf))
* **connector-quorum:** contractAbi optional parameter ([c79d763](https://github.com/hyperledger/cactus/commit/c79d763e0cb093647209417cfed7a2645283f302))
* **connector-xdai:** add ledger connector plugin for xdai [#852](https://github.com/hyperledger/cactus/issues/852) ([99399a3](https://github.com/hyperledger/cactus/commit/99399a3bd5020c66d2899aca500a880777b6523d))
* **corda:** prometheus exporter metrics integration ([9f37755](https://github.com/hyperledger/cactus/commit/9f3775580381cbdf314c6a75188114315d1844c6)), closes [#535](https://github.com/hyperledger/cactus/issues/535)
* **core:** add plugin registry log level constructor arg ([1652b33](https://github.com/hyperledger/cactus/commit/1652b33255c211e87e33ceb3e421cb9fb4182502))
* **core-api:** decouple web service install & registration [#771](https://github.com/hyperledger/cactus/issues/771) ([b50e148](https://github.com/hyperledger/cactus/commit/b50e148f43c0b27138471c972aab391486e761e6))
* **core-api:** hasTransactionFinality() on connector API [#354](https://github.com/hyperledger/cactus/issues/354) ([a2d0582](https://github.com/hyperledger/cactus/commit/a2d058218780e5e4c81e5f847cc875879a946e3f))
* **test-tooling:** add OpenEthereumTestLedger [#851](https://github.com/hyperledger/cactus/issues/851) ([9ca1f68](https://github.com/hyperledger/cactus/commit/9ca1f6839749450b4d8887c5af14a888225d645f))
* adding additional info into err logs ([888f85a](https://github.com/hyperledger/cactus/commit/888f85a680a330cfc6be98bab3e8aed5d9e9dde2)), closes [#295](https://github.com/hyperledger/cactus/issues/295)
* incorporating load testing into our CI pipeline ([7125d10](https://github.com/hyperledger/cactus/commit/7125d1043091e0443edaa7b63021cd0b96404c4b)), closes [#295](https://github.com/hyperledger/cactus/issues/295)
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))
* **fabric:** add sequence diagram of run transaction endpoint ([155cbab](https://github.com/hyperledger/cactus/commit/155cbab3c0358f6c259df8c0f92b788cbdfc6a71)), closes [#756](https://github.com/hyperledger/cactus/issues/756)
* **test-tooling:** add besu test ledger log level constructor arg ([60ee32f](https://github.com/hyperledger/cactus/commit/60ee32fb0e65e8325194a8798dd8cde093a141d3)), closes [#780](https://github.com/hyperledger/cactus/issues/780)
* **test-tooling:** add keycloak container ([f1abb3e](https://github.com/hyperledger/cactus/commit/f1abb3e8d2e05aa18008da176753b240528e95e6))
* **tools:** add test-npm-registry contaimer image ([19afe85](https://github.com/hyperledger/cactus/commit/19afe851dc9efbc37ab012146e9c41bfc296304a))
* **tools:** fabric all-in-one 2.x add nodejs to image ([dc09540](https://github.com/hyperledger/cactus/commit/dc09540ba96e346e256363cd4cbeecc6d7aacf73))


### Performance Improvements

* **tools:** fabric 1.x AIO image pre-fetching [#649](https://github.com/hyperledger/cactus/issues/649) ([a4722fa](https://github.com/hyperledger/cactus/commit/a4722fa1a8a1141bb274d10bc6192f4174c60302))


### BREAKING CHANGES

* 🧨 Behaviour in a cloud environment is currently untested and could impact
CI pipeline time.





## [0.4.1](https://github.com/hyperledger/cactus/compare/v0.4.0...v0.4.1) (2021-04-02)


### Bug Fixes

* **connector-corda:** regenerate kotlin backend with correct version ([34f8e17](https://github.com/hyperledger/cactus/commit/34f8e17a06a8b58647e8d5e59b9d32d15ef6c8ef))
* **connector-fabric:** cve-2020-7774 Prototype Pollution high sev. [#745](https://github.com/hyperledger/cactus/issues/745) ([6114cef](https://github.com/hyperledger/cactus/commit/6114ceff5c078674993af319653dc770a2011983))
* **docs:** supply chain example container image exact versions [#751](https://github.com/hyperledger/cactus/issues/751) ([bfc9c19](https://github.com/hyperledger/cactus/commit/bfc9c19969267e1db861ced28f4859251446570d))
* **examples:** add explanations about docker group to examples/electricity-trade and examples/cartrade ([6174cbd](https://github.com/hyperledger/cactus/commit/6174cbd32c8b849a6c736ff44dc5baa225b46f24))
* **examples:** add explanations about docker group to examples/electricity-trade and examples/cartrade-2 ([74119a0](https://github.com/hyperledger/cactus/commit/74119a05cc4b5416baeac0caba1a01ab4c7af936))
* **ledger-plugin:** restore packages/package.json ([a93e451](https://github.com/hyperledger/cactus/commit/a93e4511ca05dc242697e4bc91618318f9d4e85d))
* **release:** package.json publish config non-public [#753](https://github.com/hyperledger/cactus/issues/753) ([5a1b7a6](https://github.com/hyperledger/cactus/commit/5a1b7a6eba9a18d4f7474a3c44d4a4035fc99e84))


### Features

* **api-server:** add prometheus exporter ([c348aa4](https://github.com/hyperledger/cactus/commit/c348aa4f858536bca350af6abd524a5d345aacc7)), closes [#539](https://github.com/hyperledger/cactus/issues/539)
* **connector-fabric:** common interface ([c35cfe7](https://github.com/hyperledger/cactus/commit/c35cfe755c75ae860fdf28eb7fc89215557635c5))
* **corda-connector:** dsl to support collections, enums [#622](https://github.com/hyperledger/cactus/issues/622) ([78e6754](https://github.com/hyperledger/cactus/commit/78e675424ebed5bb36e5d076252a05a424e5a170))





# [0.4.0](https://github.com/hyperledger/cactus/compare/v0.3.0...v0.4.0) (2021-03-30)


### Bug Fixes

* **api-client:** flaky DefaultConsortiumProvider test [#605](https://github.com/hyperledger/cactus/issues/605) ([2ff9a25](https://github.com/hyperledger/cactus/commit/2ff9a25c316b8567e8393748386f4187cd58ea48))
* **ci:** disallow parallel run for all Fabric AIO int. tests [#656](https://github.com/hyperledger/cactus/issues/656) ([af9f851](https://github.com/hyperledger/cactus/commit/af9f8510da036ba1abf9470d5ade2b542841d279))
* **ci:** disk full issues on GitHub Action Workflow runner [#698](https://github.com/hyperledger/cactus/issues/698) ([61e3f76](https://github.com/hyperledger/cactus/commit/61e3f76ed910c9b04b36f995456213018cc0e7ba))
* **ci:** fix manual of auto-testing codes ([217c623](https://github.com/hyperledger/cactus/commit/217c623001346dc8cb2b57a8eec3af011d3ef15b))
* **ci:** github action runner disk full error [#641](https://github.com/hyperledger/cactus/issues/641) ([193fe52](https://github.com/hyperledger/cactus/commit/193fe52fe2a5bc317dac7d50163cb00eb57fd628))
* **ci:** increase test timeouts to 1h [#656](https://github.com/hyperledger/cactus/issues/656) ([1a84b57](https://github.com/hyperledger/cactus/commit/1a84b57dcf06df6f22c44a08ad5bd174bfee15ff))
* **ci:** npm cache verify/clean --force/verify [#656](https://github.com/hyperledger/cactus/issues/656) ([11b26ad](https://github.com/hyperledger/cactus/commit/11b26ad1f859caafbf70dadee533544d8a7e29fd))
* **ci:** npm config delete proxy [#656](https://github.com/hyperledger/cactus/issues/656) ([675d788](https://github.com/hyperledger/cactus/commit/675d7884cbc0d439619de054e70fcc9b20e08b1f))
* **cmd-api-server:** config generator emits correct type ([ecd63b9](https://github.com/hyperledger/cactus/commit/ecd63b9fac831f198f0f979754a7790f61133f49)), closes [#598](https://github.com/hyperledger/cactus/issues/598)
* **cmd-api-server:** missing pretsc npm script [#500](https://github.com/hyperledger/cactus/issues/500) ([a79b11a](https://github.com/hyperledger/cactus/commit/a79b11a3a0001a9fb9732da295451f1b424e7b35))
* **cockpit:** compilation issues [#496](https://github.com/hyperledger/cactus/issues/496) ([fad9fff](https://github.com/hyperledger/cactus/commit/fad9fffb59136f1fdbcef4645a0da3ccd2913233))
* **common:** servers.listen() port validation ([cd50124](https://github.com/hyperledger/cactus/commit/cd50124728fa6711bc1a1b7501964bb9b1727bcc)), closes [#491](https://github.com/hyperledger/cactus/issues/491)
* **common:** servers#startOnPreferredPort no graceful fallback [#683](https://github.com/hyperledger/cactus/issues/683) ([18f5af7](https://github.com/hyperledger/cactus/commit/18f5af756e1fcbcd55f0ade76ebcdcda77f443da))
* **connector-besu:** added test for call with parameters ([1fa24be](https://github.com/hyperledger/cactus/commit/1fa24bed8f42d39dd7b9ce989b8192774a9c7257))
* **connector-besu:** avoid req.params repetition ([64d6cf1](https://github.com/hyperledger/cactus/commit/64d6cf1f56375c9dd97c7cdf0d11c573fdf26b5a))
* **connector-besu:** fixed transaction value assignment and added test ([48bb129](https://github.com/hyperledger/cactus/commit/48bb1294f03f8b488c6f570b1e248f26aef2ccd1))
* **connector-besu:** revert change in generated code ([075ad90](https://github.com/hyperledger/cactus/commit/075ad90000507b95774065b7fad280b09a49c5f7))
* **connector-quorum:** ether value and query params added ([0275451](https://github.com/hyperledger/cactus/commit/02754513c032cc65db96a77ba3b936aef29f34be))
* **deps:** missing uuid from plugins [#529](https://github.com/hyperledger/cactus/issues/529) ([04ea8bb](https://github.com/hyperledger/cactus/commit/04ea8bb8a035382de078d082889c8fdfd48479f8))
* **docs:** add examples/electiricty-trade guidance on README ([2b64f6a](https://github.com/hyperledger/cactus/commit/2b64f6af9a1718eb9d7c4e7e278ebab58ef90ff1))
* **example:** fix bugs of README of examples/cartrade/README.md ([4cbed45](https://github.com/hyperledger/cactus/commit/4cbed454817dd11c1eac0d19d12aef9b336fc18a))
* **example:** fix bugs of README of examples/electricity-trade/README.md ([cc20804](https://github.com/hyperledger/cactus/commit/cc20804016297c64d91a384a5a1b4ca661a31c30))
* **example:** fix README and tsconfig.json ([79ef712](https://github.com/hyperledger/cactus/commit/79ef712fe0c5f926dd1589f33ca8bbe0021f35fa))
* **example:** fix README on car-trade ([0a3e411](https://github.com/hyperledger/cactus/commit/0a3e4110283448328209881e26857a9ebce70623))
* **examples:** fix logger.error ([358f646](https://github.com/hyperledger/cactus/commit/358f646bf9bfa0653e7d0e8bee37b220e15b0e2e))
* **examples:** fix some typo of README on examples/electricity-trade ([d846a88](https://github.com/hyperledger/cactus/commit/d846a889c03370bbce34ca67083a9757c6331a21))
* **examples:** fix the description of Node.js verion ([fa0cc41](https://github.com/hyperledger/cactus/commit/fa0cc415bfeb46b77a4e2a4a84643569a0eddebd))
* **examples:** fix the description of Node.js verion ([fd8235e](https://github.com/hyperledger/cactus/commit/fd8235e285bf071684def01d748e64809cf29869))
* **fabric:** issue with multiple objects of prometheus metrics ([6bb0cf9](https://github.com/hyperledger/cactus/commit/6bb0cf990154237e434e4de2e600517ab592a32b)), closes [#634](https://github.com/hyperledger/cactus/issues/634)
* **fabric:** prometheus exporter metrics naming ([a28edcf](https://github.com/hyperledger/cactus/commit/a28edcf2a02a8d8e8fcc876e3c4eb40931f0fd9a))
* **general:** fixed unused deps and updated them ([b76a970](https://github.com/hyperledger/cactus/commit/b76a9703341c5a4cabe056e743338cbedebbeaad))
* **keychain-vault:** add missing license to openapi.json ([70dcb7f](https://github.com/hyperledger/cactus/commit/70dcb7fab3ba5bf4a1ecc49c3ee997c3b0ef170f)), closes [#493](https://github.com/hyperledger/cactus/issues/493)
* **ledger-plugin:** fix logger.error ([51138e0](https://github.com/hyperledger/cactus/commit/51138e04c3d1d9f086b5a7dc56fb17819206e292))
* **ledger-plugin:** fix logger.error and remove a duplicated file ([bdf561e](https://github.com/hyperledger/cactus/commit/bdf561e55c01914f72662d430be00fa77e11eb53))
* **npm:** clean script was missing folders ([416b82e](https://github.com/hyperledger/cactus/commit/416b82e971607129fbdfa9e1270644d0c2f5c706)), closes [#469](https://github.com/hyperledger/cactus/issues/469)
* **package-json:** invalid webpack commit sha [#506](https://github.com/hyperledger/cactus/issues/506) ([bcf4a30](https://github.com/hyperledger/cactus/commit/bcf4a30f4b462d8608613f2af1220e5e09481a43))
* **performance:** parallel test execution [#416](https://github.com/hyperledger/cactus/issues/416) ([5abcd1e](https://github.com/hyperledger/cactus/commit/5abcd1e42b0a89382a7c17a2d6b11b32ad00cee3))
* **test-tooling:** removed latest tag ([24d593d](https://github.com/hyperledger/cactus/commit/24d593d6156e8128286e6230dbb867f1afefef7d))
* **test-tooling:** uncomment code that was forgotten ([3d635c0](https://github.com/hyperledger/cactus/commit/3d635c08b43a4001579380e63cab89adba206617))
* **tools:** ci.sh wsl2 lsmem does not support memory blocks [#556](https://github.com/hyperledger/cactus/issues/556) ([24f8c25](https://github.com/hyperledger/cactus/commit/24f8c255c57982d4dc9f840d156478afdd7f12c1))
* **tools:** corda AIO healthcheck ignores jolokia errors ([529dcaf](https://github.com/hyperledger/cactus/commit/529dcaf1ccf500561f0ee236cb32d6fb315a8377))
* **tools:** corda AIO supervisorctl configuration ([d7e6f66](https://github.com/hyperledger/cactus/commit/d7e6f66b0df6c83cadb469c4ee07265d7dc8ef0c))
* **tools:** fabric AIO fabric-samples v2.2.0 breaking change [#632](https://github.com/hyperledger/cactus/issues/632) ([96333de](https://github.com/hyperledger/cactus/commit/96333de91dc71f3a6ed343554626cc1da45ea351))
* **tools:** fabric AIO image log access in CI [#643](https://github.com/hyperledger/cactus/issues/643) ([9d9f805](https://github.com/hyperledger/cactus/commit/9d9f8054dfd064664b296eb4cc7e72bf6678fadf))
* **tools:** fabric all-in-one build cannot find rust compiler [#617](https://github.com/hyperledger/cactus/issues/617) ([630537f](https://github.com/hyperledger/cactus/commit/630537fab81846ee122922f8be76472ff89e0606))
* **tools:** fabric all-in-one SSH access denied [#631](https://github.com/hyperledger/cactus/issues/631) ([e8302a1](https://github.com/hyperledger/cactus/commit/e8302a11cc9428622711db3b1f4f3b480db847ec))
* **tools:** fix the method to install fabric-samples ([801deb6](https://github.com/hyperledger/cactus/commit/801deb675b9b234765139e092b606e9a7a42da29))
* **tools:** prod build fail due to missing dependency ngo [#673](https://github.com/hyperledger/cactus/issues/673) ([c93cd30](https://github.com/hyperledger/cactus/commit/c93cd3021d3fafb6a28e7e6723fe65e2a800219d))
* **validator:** remove incomplete unit-test of sawtooth lp ([4e4f46c](https://github.com/hyperledger/cactus/commit/4e4f46c6e4fc738d8180454972fd90319a2514be))
* **verifier:** fix verifier-config.json ([7864c30](https://github.com/hyperledger/cactus/commit/7864c30b2f9e79ecaae8d90c4afdda2e6e02101f))
* **VerifierFactory:** add README on run-transaction ([932d5a4](https://github.com/hyperledger/cactus/commit/932d5a4b0cf2dd9d3cb413bd953e57abf5c6531f))
* **VerifierFactory:** add stub server on examples ([5ed3e96](https://github.com/hyperledger/cactus/commit/5ed3e96651d6a4b6fcb8ba65e7e68d8a7c11477e))
* **VerifierFactory:** fix some comments ([f38803d](https://github.com/hyperledger/cactus/commit/f38803d4e315ecac9662f4efda4990d4decb3625))
* **whitepaper:** fix cactus_arch.svg ([e1cef3b](https://github.com/hyperledger/cactus/commit/e1cef3bedb0e823206680a1a4b29f4a06a2771b4))
* dci lint errors [#514](https://github.com/hyperledger/cactus/issues/514) ([99ab3af](https://github.com/hyperledger/cactus/commit/99ab3afa23b043d4d5b7d6f75db33d4256a11af9))
* repo-linter error - missing code of conduct file [#711](https://github.com/hyperledger/cactus/issues/711) ([87e632e](https://github.com/hyperledger/cactus/commit/87e632edab9ca59c64a0d5db6640cb27682de8b5))
* reverting accidental manual change in generated code ([e67369f](https://github.com/hyperledger/cactus/commit/e67369f6b9bded6f54231cbcb34de534b6a80f5b)), closes [#453](https://github.com/hyperledger/cactus/issues/453)
* webpack 5 NodeJS polyfills for web GUI ([f5c2184](https://github.com/hyperledger/cactus/commit/f5c21840d1b6ec89266abc4b51134f7f37c424b5)), closes [#486](https://github.com/hyperledger/cactus/issues/486)


### Features

* **besu:** add prometheus exporter ([7352203](https://github.com/hyperledger/cactus/commit/7352203842f0aa47f5b474732c09806465814474)), closes [#533](https://github.com/hyperledger/cactus/issues/533)
* **ci:** add a sample of auto-testing codes ([9bdd0b2](https://github.com/hyperledger/cactus/commit/9bdd0b239d222c0697b5d64c49a67ed031cb8b66))
* **common:** add containers.pruneDockerResources utility method ([d075168](https://github.com/hyperledger/cactus/commit/d0751681ec715fc20716fdc71fd0df00a01d0559))
* **common:** servers.startOnPort() host arg [#527](https://github.com/hyperledger/cactus/issues/527) ([febc06f](https://github.com/hyperledger/cactus/commit/febc06f4baf6f1baf9bb4232c2ba700e8cce822d))
* **connector-besu:** added ether value in  contract invoke request ([add9cd9](https://github.com/hyperledger/cactus/commit/add9cd94ed7fe4a7facda89749895f7b04de89a8))
* **connector-besu:** common interface invoke-contract ([ee93120](https://github.com/hyperledger/cactus/commit/ee93120abc7551d22eb94ba7e0521feaffa479bb))
* **connector-besu:** customizable nonce and gas ([89c0060](https://github.com/hyperledger/cactus/commit/89c00604084a80cdd2c1f42a918f5028660703db))
* **connector-besu:** implemented contract instance map ([17fdd94](https://github.com/hyperledger/cactus/commit/17fdd94bb4063fd8eaa1bd53d25d87f343ab9ba4))
* **connector-besu:** request param: wait for ledger tx receipt [#685](https://github.com/hyperledger/cactus/issues/685) ([dc8c564](https://github.com/hyperledger/cactus/commit/dc8c564b2819a6f7c2ccc3f6cf37c68900a0c552))
* **connector-fabric:** signing credentials for fabric ([ebfff9f](https://github.com/hyperledger/cactus/commit/ebfff9f8f5aeb86751801e531a1d8064ce6c6e51))
* **consortium-manual:** add prometheus exporter ([853bdc4](https://github.com/hyperledger/cactus/commit/853bdc42aca59dabe2910c5dd4ddec646e80ab5a)), closes [#538](https://github.com/hyperledger/cactus/issues/538)
* **corda:** add Corda ledger support ([5623369](https://github.com/hyperledger/cactus/commit/5623369aa3b5f3b75cbafb58499b24da6efc896d))
* **corda-connector:** list flows endpoint [#624](https://github.com/hyperledger/cactus/issues/624) ([438dcda](https://github.com/hyperledger/cactus/commit/438dcda8ff9c44f8d98515e6ff5aee7daec2179d))
* **corda-connector:** node diagnostics endpoint [#623](https://github.com/hyperledger/cactus/issues/623) ([edb8eac](https://github.com/hyperledger/cactus/commit/edb8eac3f2b6e9dfc62f4278f2ec11b8130e9344))
* **corda-connector:** params factory pattern support [#620](https://github.com/hyperledger/cactus/issues/620) ([0c3e58c](https://github.com/hyperledger/cactus/commit/0c3e58c4d1acd90d480682c7a4dfd77b95980948))
* **corda-connector:** scp jars to nodes [#621](https://github.com/hyperledger/cactus/issues/621) ([c966769](https://github.com/hyperledger/cactus/commit/c966769ec7654596eea36d1fbc56cbf20d4e2233))
* **core-api:** common consortium interface ([aa070ad](https://github.com/hyperledger/cactus/commit/aa070ade45c82cd067cbea09c04fe7b94f76368e))
* **core-api:** plugin import types: LOCAL & REMOTE ([f4d51da](https://github.com/hyperledger/cactus/commit/f4d51dae5b28367e714a2b9aa35dd84a2cb4cb37))
* **example:** example extended with fabric ([55d6587](https://github.com/hyperledger/cactus/commit/55d65872dc689ee3b319c23515c1fea1df0a6444))
* **examples:** add an example app using Sawtooth and Go-Ethereum ([3e4945b](https://github.com/hyperledger/cactus/commit/3e4945b37f13c36ecaafb0c44e2f59ae25cd5279))
* **examples:** add APIs for setting trade parameters on example/electricity-trade ([d28131e](https://github.com/hyperledger/cactus/commit/d28131e3f48562aa461df0e78d3ef816a75a33b1))
* **fabric:** add prometheus exporter ([b892655](https://github.com/hyperledger/cactus/commit/b892655c1cb8fb1ce20fcd8f061d6f4e998eea6b)), closes [#531](https://github.com/hyperledger/cactus/issues/531)
* **fabric-connector:** contract deployment endpoint [#616](https://github.com/hyperledger/cactus/issues/616) ([c77fc78](https://github.com/hyperledger/cactus/commit/c77fc783a0df4f31af53170073176042559ef432))
* **keychain:** add rust keychain plugin vault implementation ([6dcdb8a](https://github.com/hyperledger/cactus/commit/6dcdb8a02db30e4dfe3d912bd56d5979b0cb3bc3))
* **keychain:** implement OpenAPI endpoints ([3a0acf4](https://github.com/hyperledger/cactus/commit/3a0acf4cb350a286500aa80ed4ac5d15f9501ea4))
* **keychain-memory:** add prometheus exporter ([a5affc5](https://github.com/hyperledger/cactus/commit/a5affc526123769cafa878d6a29312596511688e)), closes [#537](https://github.com/hyperledger/cactus/issues/537)
* **keychain-vault:** add prometheus exporter ([fea547f](https://github.com/hyperledger/cactus/commit/fea547fdf9992ffa444274e7d7f9199a671dd71e)), closes [#536](https://github.com/hyperledger/cactus/issues/536)
* **ledger-plugin:** add signature/verification features into Validator/Verifier ([a2227eb](https://github.com/hyperledger/cactus/commit/a2227eb851524fce750c47783605d2f7b506fa24))
* **LedgerPlugin:** add monitoring features on Ledger Plugin Validator for Hyperledger Sawtooth ([958876b](https://github.com/hyperledger/cactus/commit/958876bd17f39e31ef21e2d553f02b6b116f0493))
* **LedgerPlugin:** add TransactionSigner on LedgerPlugin ([df3b266](https://github.com/hyperledger/cactus/commit/df3b2663dff6b740bfc0d25db2472ef2cc4f8bb2))
* **LedgerPlugin:** fix copyright ([d4f1277](https://github.com/hyperledger/cactus/commit/d4f127792598214cfbcfc1dd1940a7f321f29396))
* **quorum:** add prometheus exporter ([bcc574d](https://github.com/hyperledger/cactus/commit/bcc574d3077d2086afee4e7ece054285777c527f)), closes [#534](https://github.com/hyperledger/cactus/issues/534)
* **refactor:** openapi endpoint paths ([261c17b](https://github.com/hyperledger/cactus/commit/261c17b08124070c7be0890d6bc3da380255893b))
* **test-tooling:** add corda AIO emitContainerLogs option ([13fe677](https://github.com/hyperledger/cactus/commit/13fe67782addaccabec1d24bb2032da2d8ea3f94))
* **test-tooling:** containers pull image retries exp. back-off [#656](https://github.com/hyperledger/cactus/issues/656) ([2735ec2](https://github.com/hyperledger/cactus/commit/2735ec27f3139222f2fa9eb2ebcfbb4272b85482))
* **test-tooling:** containers#getById and #waitForHealthCheck ([4a7fbfe](https://github.com/hyperledger/cactus/commit/4a7fbfe19cdc269b3b197c736ecce4395b39e1e3)), closes [#471](https://github.com/hyperledger/cactus/issues/471)
* **test-tooling:** pruneDockerResources() observability [#694](https://github.com/hyperledger/cactus/issues/694) ([d92760f](https://github.com/hyperledger/cactus/commit/d92760f278ec06d26920362dc59999f274b29004))
* **test-tooling:** utility function docker prune in GH action [#696](https://github.com/hyperledger/cactus/issues/696) ([2784ceb](https://github.com/hyperledger/cactus/commit/2784cebbf899946e3638735865dbb7e23c0a114c))
* **tools:** add standalone shell CLI tool to corda AIO image ([9828be4](https://github.com/hyperledger/cactus/commit/9828be40035bbbb266b3ebf6bda5e5d4c60580b1))
* **tools:** corda AIO start/stop per node [#686](https://github.com/hyperledger/cactus/issues/686) ([f52c00e](https://github.com/hyperledger/cactus/commit/f52c00ec37490c4eb553ec5accbe503ca775fa25))
* **verifier:** adapt Verifier to http-typed events ([01f20d0](https://github.com/hyperledger/cactus/commit/01f20d0ba730fb4ac4e5f6c69e0089dd4220d91f))
* **VerifierFactory:** add connection feature to both of socket.io-type Validator and http-type Validator ([d2825cc](https://github.com/hyperledger/cactus/commit/d2825cc1532b9f7c70f545ad10ffee2ffa6a8735))





# [0.3.0](https://github.com/petermetz/blockchain-integration-framework/compare/v0.1.0...v0.3.0) (2021-01-06)


### Bug Fixes

* open API generator config - protected keyword ([57e52f4](https://github.com/petermetz/blockchain-integration-framework/commit/57e52f42c3aaab653acb8838ba93518a5a097af8)), closes [#436](https://github.com/petermetz/blockchain-integration-framework/issues/436)
* **api-server:** enables HTML 5 mode for angular front end ([05a2e0b](https://github.com/petermetz/blockchain-integration-framework/commit/05a2e0b7838dc3425c91627cd8eee3d7de671fec))
* **api-server:** runtime plugin imports ([dcdfcf5](https://github.com/petermetz/blockchain-integration-framework/commit/dcdfcf59e8e5220e24093e3dbeb41f49f1e5ab1b)), closes [#346](https://github.com/petermetz/blockchain-integration-framework/issues/346)
* **ci:** CI now passes, commented flaky test ([c2019ae](https://github.com/petermetz/blockchain-integration-framework/commit/c2019aef4873f5bcc61c1604daa6ff956ad75054)), closes [#12](https://github.com/petermetz/blockchain-integration-framework/issues/12) [#36](https://github.com/petermetz/blockchain-integration-framework/issues/36)
* **ci:** dump all logs script calls docker logs ([c8285a7](https://github.com/petermetz/blockchain-integration-framework/commit/c8285a7491716759fb2d763525de2e6a7ff9f76f))
* **ci:** eliminate seg faults on CircleCI ([336bd0b](https://github.com/petermetz/blockchain-integration-framework/commit/336bd0bf7f2169f99706a5d501419dbbb1e52460))
* **ci:** Fix ci script OSX compatability ([611fdfb](https://github.com/petermetz/blockchain-integration-framework/commit/611fdfb925192e842c87564fe00633570cde34ba))
* **ci:** Fix corda:down causing failing when NO_CORDA=true ([d981d59](https://github.com/petermetz/blockchain-integration-framework/commit/d981d591960bccd31e955898fb523e9ec574b5d2))
* **ci:** lock mkdirp to 1.0.2 ([c9a51a1](https://github.com/petermetz/blockchain-integration-framework/commit/c9a51a133b96d33e8958f12980e66ae3b67fd59d))
* **ci:** run full CI suite on CircleCI ([47d22f8](https://github.com/petermetz/blockchain-integration-framework/commit/47d22f82742c7d6c3fcdd2b96a933bc0b070d3ac))
* **ci:** Use larger ci instance ([0951edd](https://github.com/petermetz/blockchain-integration-framework/commit/0951edd9970dea7b1b373464618e231589dde100))
* **cmd-api-server:** add IPluginImport to public API surface of package ([8734642](https://github.com/petermetz/blockchain-integration-framework/commit/8734642e01c916fe2c1fc0b8c0a58ebd1db7391b))
* **cmd-api-server:** bundle name typos ([711ad71](https://github.com/petermetz/blockchain-integration-framework/commit/711ad7168d9ff89dd2ad04ee43efe158200e8fbc)), closes [#376](https://github.com/petermetz/blockchain-integration-framework/issues/376)
* **cmd-api-server:** disallow running on older than Node 12 but provide optional override ([332b306](https://github.com/petermetz/blockchain-integration-framework/commit/332b306c0c1a8cef21e27d116fc92158d3439128)), closes [#150](https://github.com/petermetz/blockchain-integration-framework/issues/150)
* **cmd-api-server:** plugin imports via static config (env,cli,file) ([d7e550e](https://github.com/petermetz/blockchain-integration-framework/commit/d7e550ee9b9483995c95e7a43d175e82bfb1ab6e))
* **cockpit:** add missing process shim into polyfills ([da73b59](https://github.com/petermetz/blockchain-integration-framework/commit/da73b5933a5172017f289a76e4bd8d51f0c3609b)), closes [#410](https://github.com/petermetz/blockchain-integration-framework/issues/410)
* **common:** flaky KeyConverter unit tests ([43ec924](https://github.com/petermetz/blockchain-integration-framework/commit/43ec924875f161bb1308dca84a4f16d116212266)), closes [#299](https://github.com/petermetz/blockchain-integration-framework/issues/299) [/github.com/hyperledger/cactus/issues/299#issuecomment-720743950](https://github.com//github.com/hyperledger/cactus/issues/299/issues/issuecomment-720743950) [#238](https://github.com/petermetz/blockchain-integration-framework/issues/238)
* **common:** servers.startOnPort() error handling ([51af78d](https://github.com/petermetz/blockchain-integration-framework/commit/51af78dbb6273b4ef4ee26147469fb3599391bb5)), closes [#317](https://github.com/petermetz/blockchain-integration-framework/issues/317)
* **common:** servers#listen() port number validation ([ee28b50](https://github.com/petermetz/blockchain-integration-framework/commit/ee28b50f47a4e94937a29b1a7c843cc56c203329)), closes [#383](https://github.com/petermetz/blockchain-integration-framework/issues/383)
* **examples:** fix README of cartrade ([3400c06](https://github.com/petermetz/blockchain-integration-framework/commit/3400c06b3bf62c98752b50dd8a3edaa8b72c7fdb))
* **examples:** move copyStaticAssets.ts to examples ([ef31162](https://github.com/petermetz/blockchain-integration-framework/commit/ef311622a75875b777e8c9fcf08a0fe1a5157c23))
* **npm-deps:** adds lock files where not an issue ([afefb7a](https://github.com/petermetz/blockchain-integration-framework/commit/afefb7a4329200b0623df411944e71c08e3f4924))
* **plugin-web-service-consortium:** no longer puts spec.json file inside folder ([e509e1f](https://github.com/petermetz/blockchain-integration-framework/commit/e509e1f8bff38d6c937abd8bec8e2469b9932f64))
* **quorum-connector:** integration tests were failing ([9d8ece1](https://github.com/petermetz/blockchain-integration-framework/commit/9d8ece17f9500078b6aad9862c3d1950754eecdb))
* **quorum/api:** use Web3 HTTP Provider by default ([#66](https://github.com/petermetz/blockchain-integration-framework/issues/66)) ([d6e69c0](https://github.com/petermetz/blockchain-integration-framework/commit/d6e69c052cc2284146b50c67b82b7bd27e864761))
* **quorum/api:** web3 patching typo ([be6c39c](https://github.com/petermetz/blockchain-integration-framework/commit/be6c39c009812416fbd619ea2a32062b7e9b9cd3)), closes [#59](https://github.com/petermetz/blockchain-integration-framework/issues/59)
* **sdk:** ignore and delete the unused git_push.sh file ([bd1a7eb](https://github.com/petermetz/blockchain-integration-framework/commit/bd1a7eb0d9ab68d086d625c88ead64db75c785b3)), closes [#212](https://github.com/petermetz/blockchain-integration-framework/issues/212)
* **test-tooling:** bind test ledgers to port zero for macOS ([6ff1b98](https://github.com/petermetz/blockchain-integration-framework/commit/6ff1b981f353449a15627ec0ec724e6e4a3fbb8d)), closes [#186](https://github.com/petermetz/blockchain-integration-framework/issues/186)
* **test-tooling:** fabric AIO image docker in docker support ([4c2ae34](https://github.com/petermetz/blockchain-integration-framework/commit/4c2ae344aa9aec817e330773fc6f7b0e995ff43f)), closes [#279](https://github.com/petermetz/blockchain-integration-framework/issues/279)
* **test-tooling:** getContainerInfo methods lookup criteria ([7456967](https://github.com/petermetz/blockchain-integration-framework/commit/7456967512b0cf4e0e70f3b656de53c9690ea514)), closes [#265](https://github.com/petermetz/blockchain-integration-framework/issues/265)
* **tools:** remove the duplicate wallet.tar ([fc7d707](https://github.com/petermetz/blockchain-integration-framework/commit/fc7d707b8c74841d62cb0c03b8d9b67f2cbf84a3))
* **tools/docker/besu:** all in one image RPC API CLI args ([1caec7e](https://github.com/petermetz/blockchain-integration-framework/commit/1caec7ef533a9c45576cae2763a3936189c0f65e)), closes [#399](https://github.com/petermetz/blockchain-integration-framework/issues/399)
* **validator,example:** fix bugs of sample code and README of validators ([80c2bb7](https://github.com/petermetz/blockchain-integration-framework/commit/80c2bb7a68eb575360870cc5b87ec3f93a204d78))
* **validator,example:** fix bugs of sample code and README of validators ([8d2f9ae](https://github.com/petermetz/blockchain-integration-framework/commit/8d2f9ae8099dc4be20cea0385faed90aee84b76b))
* **validator,example:** fix bugs of sample code and README of validators ([83f93da](https://github.com/petermetz/blockchain-integration-framework/commit/83f93da8a84e846577b34ef423c7fcd0531d656b))
* add bin/www.js files on FUJITSU ConnectionChain-sample ([#97](https://github.com/petermetz/blockchain-integration-framework/issues/97)) ([5738900](https://github.com/petermetz/blockchain-integration-framework/commit/5738900b57ec4f7780a88fb4ff04068264e18836))
* bundle name typos: plugin-keychain-memory ([43a127b](https://github.com/petermetz/blockchain-integration-framework/commit/43a127b2d0cfab7cdcf48d75a452d4ab44721551))
* missed references of cactus-sdk during rename in previous PR ([0892cd6](https://github.com/petermetz/blockchain-integration-framework/commit/0892cd6507e84433e38265060b4a6890c6da6f02)), closes [#314](https://github.com/petermetz/blockchain-integration-framework/issues/314)
* morgan(v1.8.1 -> v1.9.1) on FUJITSU ConnectionChain-sample ([bb7657e](https://github.com/petermetz/blockchain-integration-framework/commit/bb7657efffacd731888d38c88e2418b145498599))
* new function used for configService ([a3561d3](https://github.com/petermetz/blockchain-integration-framework/commit/a3561d332c9319ed608c9b7dfffa0d263a9b36bc))
* **webpack:** BundleAnalyzer no automatic open ([de50cbd](https://github.com/petermetz/blockchain-integration-framework/commit/de50cbd037f918368c95a48178ff73dc850cb0d1))


### Features

* **api-server:** CORS supports wildcard ([b4b0f83](https://github.com/petermetz/blockchain-integration-framework/commit/b4b0f832cf9baabad6e0c9b6d8e5f672c2553da6))
* **api-server:** DeployContractEndpoint ([51eccff](https://github.com/petermetz/blockchain-integration-framework/commit/51eccff174f585f75da66b156d33c7c449da84cd))
* **api-server:** TLS, mTLS support ([bcda595](https://github.com/petermetz/blockchain-integration-framework/commit/bcda595c84a1a6805c20375a45b318de3e092319))
* **besu:** 🎸 OpenAPI support => arbitrary TX, contract deployments ([6d7e788](https://github.com/petermetz/blockchain-integration-framework/commit/6d7e7882eb0e11102a7e06b508433203c7cd821d))
* **besu:** add keychain reference signing support ([768c4cc](https://github.com/petermetz/blockchain-integration-framework/commit/768c4cc67837699f5e153545cc7350f2807c4460))
* **besu:** remove references to gethkeychainpassword ([2640b52](https://github.com/petermetz/blockchain-integration-framework/commit/2640b521967de51dc84e30f27749256da6369434))
* **bif-common:** adds new pkg with logger ([210df1d](https://github.com/petermetz/blockchain-integration-framework/commit/210df1de21e159ff1b1c73e326b52f0639c2ee81))
* **cactus-common:** add Objects utility class to get owned and inherited methods of class instance ([2299cff](https://github.com/petermetz/blockchain-integration-framework/commit/2299cff9931996a979b9b1e0ddb492843de916c0))
* **cactus-sdk:** introduces typed (compiler supported) extensibility between different SDK backends ([0799900](https://github.com/petermetz/blockchain-integration-framework/commit/0799900e85836b6dfa648dd039d3ffcace821aec))
* **cmd-api-server:** fully dynamic plugin imports via config file/env/CLI ([fe396c9](https://github.com/petermetz/blockchain-integration-framework/commit/fe396c969436f1c1a99b6d03d8b58b160e1a93bb))
* **common:** add Checks#nonBlankString() utility ([c21c873](https://github.com/petermetz/blockchain-integration-framework/commit/c21c873917879839c49d7b69860a988a91802754))
* **common:** add IAsyncProvider interface definition ([81ec545](https://github.com/petermetz/blockchain-integration-framework/commit/81ec545701409fa626ce82d4e8513e0d78db9e30))
* **common:** add OpenAPI spec exporter utility function ([6d2e93c](https://github.com/petermetz/blockchain-integration-framework/commit/6d2e93cbace0951ae37db79ffa1b664b2623104a))
* **common:** add Servers.startOnPreferredPort(), Servers.startOnPort() ([3efb118](https://github.com/petermetz/blockchain-integration-framework/commit/3efb118ace474d23635d34b7b9f5184bb4848fa4))
* **common:** add utility class Strings with replaceAll ([3986aed](https://github.com/petermetz/blockchain-integration-framework/commit/3986aedc586854cafc7bc8072fa7d71344a1efb1))
* **common:** Checks and CodedError classes ([c65baf8](https://github.com/petermetz/blockchain-integration-framework/commit/c65baf88749166ba8d0c970760c8aab172a83a1a)), closes [#266](https://github.com/petermetz/blockchain-integration-framework/issues/266)
* **common:** KeyConverter class to and from PEM/hex/buffe ([fc80106](https://github.com/petermetz/blockchain-integration-framework/commit/fc80106f87b66e935b40a450470262713db2f1d5))
* **common:** Servers utility class ([ad01dee](https://github.com/petermetz/blockchain-integration-framework/commit/ad01dee4def65f47e6292d117eaece2b2ebc1c3c)), closes [#260](https://github.com/petermetz/blockchain-integration-framework/issues/260) [#267](https://github.com/petermetz/blockchain-integration-framework/issues/267)
* **common:** Stable Signature Generation from JS Objects ([22b5f5c](https://github.com/petermetz/blockchain-integration-framework/commit/22b5f5ce05a82b80e067da327b47331ed34e289e))
* **connection-chain:** add readme, package dir ([#76](https://github.com/petermetz/blockchain-integration-framework/issues/76)) ([e6e9981](https://github.com/petermetz/blockchain-integration-framework/commit/e6e9981a98450d8e70f97b9f6231afc816bc3fe2))
* **connectionchain:** Add FUJITSU ConnectionChain-sample ([#78](https://github.com/petermetz/blockchain-integration-framework/issues/78)) ([5107068](https://github.com/petermetz/blockchain-integration-framework/commit/5107068552462987d5adb97be592fab769e15a3c))
* **core-api:** 🎸 add IKeychainPlugin#getKeychainId() ([34656b0](https://github.com/petermetz/blockchain-integration-framework/commit/34656b0730f886619efbbddb512c094029cbbebd))
* **core-api:** add consensus algorithms OpenAPI enum ([7206b85](https://github.com/petermetz/blockchain-integration-framework/commit/7206b85d77d44707baea67a267318a0bea610a66)), closes [#359](https://github.com/petermetz/blockchain-integration-framework/issues/359)
* **core-api:** add instanceId getter to ICactusPlugin ([e50d9ce](https://github.com/petermetz/blockchain-integration-framework/commit/e50d9cef081708d7d6b92701f7f941c36ef6f920))
* **core-api:** getConsensusAlgorithmFamily() on connector API ([477dc7e](https://github.com/petermetz/blockchain-integration-framework/commit/477dc7ed5dfba9ae56060772d478aae349919f10)), closes [#355](https://github.com/petermetz/blockchain-integration-framework/issues/355)
* **core-api:** web service plugins ([8eaeb45](https://github.com/petermetz/blockchain-integration-framework/commit/8eaeb454b1df993b5aa7743a50678ea7fe882364))
* **examples:** add example/cartrade applications ([769c087](https://github.com/petermetz/blockchain-integration-framework/commit/769c087af524451a1a7c6860ee5cb6d6de08461f))
* **examples:** add example01-car-trade and its validatorDriver ([c8a84f4](https://github.com/petermetz/blockchain-integration-framework/commit/c8a84f4e2b55f4f56eabec47ced6b8d6c4aea7cf))
* **fabric:** add run transaction endpoint ([07ff4f8](https://github.com/petermetz/blockchain-integration-framework/commit/07ff4f862f6d02fec5de887d73186777951b745a))
* **fabric:** user defined fabric samples version ([8a60717](https://github.com/petermetz/blockchain-integration-framework/commit/8a607172f72afbdf2e0519eff3a58679975cd1ee)), closes [#391](https://github.com/petermetz/blockchain-integration-framework/issues/391)
* **fabric-all-in-one:** runs-a-Fabric-Network-in-one-docker-container ([703bc61](https://github.com/petermetz/blockchain-integration-framework/commit/703bc61a850b87176d04793545a9030b9bffc617)), closes [#132](https://github.com/petermetz/blockchain-integration-framework/issues/132)
* **fabric14-testnet:** fabric-v14-testnet ([d2fd5d7](https://github.com/petermetz/blockchain-integration-framework/commit/d2fd5d7f1358ce2e1b8519b4bbca8e7d41779aba))
* **keychain:** add dummy/in-memory implementation ([f3061ad](https://github.com/petermetz/blockchain-integration-framework/commit/f3061ad3cab220f90042b8746a77c06ced105438))
* **ledger-connector:** quorum added with contract deployment now generic ([123d6ee](https://github.com/petermetz/blockchain-integration-framework/commit/123d6ee1c38b1eae8006a87d6b3e8caf421c3af8))
* **ledger-connector-fabric:** golang chaincode deployment ([38e9780](https://github.com/petermetz/blockchain-integration-framework/commit/38e97808c74124bb35f0aa37e4b3d0eb42161920)), closes [#252](https://github.com/petermetz/blockchain-integration-framework/issues/252) [#275](https://github.com/petermetz/blockchain-integration-framework/issues/275) [#276](https://github.com/petermetz/blockchain-integration-framework/issues/276) [#277](https://github.com/petermetz/blockchain-integration-framework/issues/277)
* **plugin-consortium-manual:** JSON Web Signatures for Nodes, Consortium ([caf60b3](https://github.com/petermetz/blockchain-integration-framework/commit/caf60b3f69c81617787afe73ca12165baa2dce50))
* **plugin-ledger-connector-besu:** add log level to options ([29402d0](https://github.com/petermetz/blockchain-integration-framework/commit/29402d0814bf9ebc642430cd0acb660eb4d50b97))
* **plugin-ledger-connector-besu:** contract deployment and tests ([3df6b73](https://github.com/petermetz/blockchain-integration-framework/commit/3df6b739a957445bae4e27c52487bb8fe582b195))
* **plugin-registry:** get keychain by keychainId ([4d93c72](https://github.com/petermetz/blockchain-integration-framework/commit/4d93c72ca4c533697a47782946ba2a3549cc742a)), closes [#381](https://github.com/petermetz/blockchain-integration-framework/issues/381)
* **plugin-validator-besu:** generate signature of simple asset ([4c5c253](https://github.com/petermetz/blockchain-integration-framework/commit/4c5c2534b551cd972f0536e12d930ef995265ab4))
* **plugin-web-service-consortium:** add dedicated plugin for consortium management API ([f63f5a5](https://github.com/petermetz/blockchain-integration-framework/commit/f63f5a5bcba4099fe7975e07e88bf6b6adbab416))
* **quorum:** 🎸 export model-type-guards to public API surface ([49ec2d5](https://github.com/petermetz/blockchain-integration-framework/commit/49ec2d5cea181bb37ca610d810350f433ba383d2))
* **quorum:** 🎸 support Cactus Keychain APIs ([0d4769f](https://github.com/petermetz/blockchain-integration-framework/commit/0d4769fa52d1f79c22bdb6f60c2c2b7200b8cf99))
* **quorum:** code cleanup ([b6ab258](https://github.com/petermetz/blockchain-integration-framework/commit/b6ab25802b1cca1e69a0cc3e44cdc83a8fbbc74b))
* **sdk:** adds partially auto-generated SDK ([6527870](https://github.com/petermetz/blockchain-integration-framework/commit/6527870f5d7aff3217d6ca7319595845eb526d4d))
* **sdk:** routing to nodes by ledger ID ([10e3d1c](https://github.com/petermetz/blockchain-integration-framework/commit/10e3d1c46731bf6d84a28d837e2f6601b4c6a78f))
* **test-tooling:** 🎸 createEthTestAccount() to Besu,Quorum test ledger ([2c0d73c](https://github.com/petermetz/blockchain-integration-framework/commit/2c0d73c0aba31e1d51d94d9482caad0e2d862ac9))
* **test-tooling:** all in one besu ledger ([4ba6f4b](https://github.com/petermetz/blockchain-integration-framework/commit/4ba6f4b5a58be0f8bd3a25ef9a5a42303ae26308))
* **test-tooling:** Containers class ls() and exec() methods ([44ad88a](https://github.com/petermetz/blockchain-integration-framework/commit/44ad88a1f8ddc16735ef4533a1d25c9acf690d2e)), closes [#275](https://github.com/petermetz/blockchain-integration-framework/issues/275)
* **tools:** besu-all-in-one personal RPC HTTP API ([f2219d9](https://github.com/petermetz/blockchain-integration-framework/commit/f2219d95d85f589eb6aef97b547e2b78677315e8))
* **validator:** elections powered by etcd leases ([#31](https://github.com/petermetz/blockchain-integration-framework/issues/31)) ([61aab4a](https://github.com/petermetz/blockchain-integration-framework/commit/61aab4aafe02e4a40fa91145c5d0182123a11606))
* **validator:** go-ethereum validator including execSyncFunction ([9e520d0](https://github.com/petermetz/blockchain-integration-framework/commit/9e520d057b6b597f240396967c6e6c4afff874b7))
* **Validator:** (fixed) Validator on Ethereum-specific Ledger Plugin ([a20ed33](https://github.com/petermetz/blockchain-integration-framework/commit/a20ed330ae676041b5eabf349dd617075aa6ffc5))
* **Validator:** Validator on Ethereum-specific Ledger Plugin ([a58c81e](https://github.com/petermetz/blockchain-integration-framework/commit/a58c81e1c252ab9ea2808d2b104c21a7b950f9b0))
* **Validator:** Validator on Fabric-specific Ledger Plugin ([e6483ca](https://github.com/petermetz/blockchain-integration-framework/commit/e6483caef6ef88d18818e4f6a3bee6a8dfdd2b8b))
* **validator, tools:** validators including execSyncFunction and test-tools for sample app ([3c7bff8](https://github.com/petermetz/blockchain-integration-framework/commit/3c7bff89da6b95f7e2c8c00f9c15d82f99df6b13))
* 🎸 add method: QuorumTestLedger#getGenesisAccount() ([ac19e49](https://github.com/petermetz/blockchain-integration-framework/commit/ac19e49b87dad7d23d9eea91e2bbca0e3a0f69e4))
* Add corda to CI ([#84](https://github.com/petermetz/blockchain-integration-framework/issues/84)) ([bd796d6](https://github.com/petermetz/blockchain-integration-framework/commit/bd796d6b007fa58269be0b4560c0e583d26d6e7c))


### Performance Improvements

* **ci:** travis no longer runs configure.sh ([de10cd4](https://github.com/petermetz/blockchain-integration-framework/commit/de10cd4eac8d2fc127c0c7b67e6bd75c07641b47))





# [0.2.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.2.0) (2020-12-01)


### Bug Fixes

* **api-server:** runtime plugin imports ([dcdfcf5](https://github.com/hyperledger/cactus/commit/dcdfcf59e8e5220e24093e3dbeb41f49f1e5ab1b)), closes [#346](https://github.com/hyperledger/cactus/issues/346)
* **ci:** CI now passes, commented flaky test ([c2019ae](https://github.com/hyperledger/cactus/commit/c2019aef4873f5bcc61c1604daa6ff956ad75054)), closes [#12](https://github.com/hyperledger/cactus/issues/12) [#36](https://github.com/hyperledger/cactus/issues/36)
* **ci:** Fix ci script OSX compatability ([611fdfb](https://github.com/hyperledger/cactus/commit/611fdfb925192e842c87564fe00633570cde34ba))
* **cmd-api-server:** add IPluginImport to public API surface of package ([8734642](https://github.com/hyperledger/cactus/commit/8734642e01c916fe2c1fc0b8c0a58ebd1db7391b))
* **cmd-api-server:** bundle name typos ([711ad71](https://github.com/hyperledger/cactus/commit/711ad7168d9ff89dd2ad04ee43efe158200e8fbc)), closes [#376](https://github.com/hyperledger/cactus/issues/376)
* **cmd-api-server:** disallow running on older than Node 12 but provide optional override ([332b306](https://github.com/hyperledger/cactus/commit/332b306c0c1a8cef21e27d116fc92158d3439128)), closes [#150](https://github.com/hyperledger/cactus/issues/150)
* **cmd-api-server:** plugin imports via static config (env,cli,file) ([d7e550e](https://github.com/hyperledger/cactus/commit/d7e550ee9b9483995c95e7a43d175e82bfb1ab6e))
* **common:** flaky KeyConverter unit tests ([43ec924](https://github.com/hyperledger/cactus/commit/43ec924875f161bb1308dca84a4f16d116212266)), closes [#299](https://github.com/hyperledger/cactus/issues/299) [/github.com/hyperledger/cactus/issues/299#issuecomment-720743950](https://github.com//github.com/hyperledger/cactus/issues/299/issues/issuecomment-720743950) [#238](https://github.com/hyperledger/cactus/issues/238)
* **common:** servers.startOnPort() error handling ([51af78d](https://github.com/hyperledger/cactus/commit/51af78dbb6273b4ef4ee26147469fb3599391bb5)), closes [#317](https://github.com/hyperledger/cactus/issues/317)
* bundle name typos: plugin-keychain-memory ([43a127b](https://github.com/hyperledger/cactus/commit/43a127b2d0cfab7cdcf48d75a452d4ab44721551))
* missed references of cactus-sdk during rename in previous PR ([0892cd6](https://github.com/hyperledger/cactus/commit/0892cd6507e84433e38265060b4a6890c6da6f02)), closes [#314](https://github.com/hyperledger/cactus/issues/314)
* **api-server:** enables HTML 5 mode for angular front end ([05a2e0b](https://github.com/hyperledger/cactus/commit/05a2e0b7838dc3425c91627cd8eee3d7de671fec))
* **ci:** dump all logs script calls docker logs ([c8285a7](https://github.com/hyperledger/cactus/commit/c8285a7491716759fb2d763525de2e6a7ff9f76f))
* **ci:** eliminate seg faults on CircleCI ([336bd0b](https://github.com/hyperledger/cactus/commit/336bd0bf7f2169f99706a5d501419dbbb1e52460))
* **ci:** Fix corda:down causing failing when NO_CORDA=true ([d981d59](https://github.com/hyperledger/cactus/commit/d981d591960bccd31e955898fb523e9ec574b5d2))
* **ci:** lock mkdirp to 1.0.2 ([c9a51a1](https://github.com/hyperledger/cactus/commit/c9a51a133b96d33e8958f12980e66ae3b67fd59d))
* **ci:** run full CI suite on CircleCI ([47d22f8](https://github.com/hyperledger/cactus/commit/47d22f82742c7d6c3fcdd2b96a933bc0b070d3ac))
* **ci:** Use larger ci instance ([0951edd](https://github.com/hyperledger/cactus/commit/0951edd9970dea7b1b373464618e231589dde100))
* **examples:** move copyStaticAssets.ts to examples ([ef31162](https://github.com/hyperledger/cactus/commit/ef311622a75875b777e8c9fcf08a0fe1a5157c23))
* **npm-deps:** adds lock files where not an issue ([afefb7a](https://github.com/hyperledger/cactus/commit/afefb7a4329200b0623df411944e71c08e3f4924))
* **plugin-web-service-consortium:** no longer puts spec.json file inside folder ([e509e1f](https://github.com/hyperledger/cactus/commit/e509e1f8bff38d6c937abd8bec8e2469b9932f64))
* **quorum-connector:** integration tests were failing ([9d8ece1](https://github.com/hyperledger/cactus/commit/9d8ece17f9500078b6aad9862c3d1950754eecdb))
* **quorum/api:** use Web3 HTTP Provider by default ([#66](https://github.com/hyperledger/cactus/issues/66)) ([d6e69c0](https://github.com/hyperledger/cactus/commit/d6e69c052cc2284146b50c67b82b7bd27e864761))
* **quorum/api:** web3 patching typo ([be6c39c](https://github.com/hyperledger/cactus/commit/be6c39c009812416fbd619ea2a32062b7e9b9cd3)), closes [#59](https://github.com/hyperledger/cactus/issues/59)
* **sdk:** ignore and delete the unused git_push.sh file ([bd1a7eb](https://github.com/hyperledger/cactus/commit/bd1a7eb0d9ab68d086d625c88ead64db75c785b3)), closes [#212](https://github.com/hyperledger/cactus/issues/212)
* **test-tooling:** bind test ledgers to port zero for macOS ([6ff1b98](https://github.com/hyperledger/cactus/commit/6ff1b981f353449a15627ec0ec724e6e4a3fbb8d)), closes [#186](https://github.com/hyperledger/cactus/issues/186)
* **test-tooling:** getContainerInfo methods lookup criteria ([7456967](https://github.com/hyperledger/cactus/commit/7456967512b0cf4e0e70f3b656de53c9690ea514)), closes [#265](https://github.com/hyperledger/cactus/issues/265)
* add bin/www.js files on FUJITSU ConnectionChain-sample ([#97](https://github.com/hyperledger/cactus/issues/97)) ([5738900](https://github.com/hyperledger/cactus/commit/5738900b57ec4f7780a88fb4ff04068264e18836))
* new function used for configService ([a3561d3](https://github.com/hyperledger/cactus/commit/a3561d332c9319ed608c9b7dfffa0d263a9b36bc))
* **webpack:** BundleAnalyzer no automatic open ([de50cbd](https://github.com/hyperledger/cactus/commit/de50cbd037f918368c95a48178ff73dc850cb0d1))
* morgan(v1.8.1 -> v1.9.1) on FUJITSU ConnectionChain-sample ([bb7657e](https://github.com/hyperledger/cactus/commit/bb7657efffacd731888d38c88e2418b145498599))


### Features

* **api-server:** CORS supports wildcard ([b4b0f83](https://github.com/hyperledger/cactus/commit/b4b0f832cf9baabad6e0c9b6d8e5f672c2553da6))
* **api-server:** DeployContractEndpoint ([51eccff](https://github.com/hyperledger/cactus/commit/51eccff174f585f75da66b156d33c7c449da84cd))
* **api-server:** TLS, mTLS support ([bcda595](https://github.com/hyperledger/cactus/commit/bcda595c84a1a6805c20375a45b318de3e092319))
* **besu:** 🎸 OpenAPI support => arbitrary TX, contract deployments ([6d7e788](https://github.com/hyperledger/cactus/commit/6d7e7882eb0e11102a7e06b508433203c7cd821d))
* **besu:** add keychain reference signing support ([768c4cc](https://github.com/hyperledger/cactus/commit/768c4cc67837699f5e153545cc7350f2807c4460))
* **bif-common:** adds new pkg with logger ([210df1d](https://github.com/hyperledger/cactus/commit/210df1de21e159ff1b1c73e326b52f0639c2ee81))
* **cactus-common:** add Objects utility class to get owned and inherited methods of class instance ([2299cff](https://github.com/hyperledger/cactus/commit/2299cff9931996a979b9b1e0ddb492843de916c0))
* **cactus-sdk:** introduces typed (compiler supported) extensibility between different SDK backends ([0799900](https://github.com/hyperledger/cactus/commit/0799900e85836b6dfa648dd039d3ffcace821aec))
* **cmd-api-server:** fully dynamic plugin imports via config file/env/CLI ([fe396c9](https://github.com/hyperledger/cactus/commit/fe396c969436f1c1a99b6d03d8b58b160e1a93bb))
* **common:** add Checks#nonBlankString() utility ([c21c873](https://github.com/hyperledger/cactus/commit/c21c873917879839c49d7b69860a988a91802754))
* **common:** add IAsyncProvider interface definition ([81ec545](https://github.com/hyperledger/cactus/commit/81ec545701409fa626ce82d4e8513e0d78db9e30))
* **common:** add OpenAPI spec exporter utility function ([6d2e93c](https://github.com/hyperledger/cactus/commit/6d2e93cbace0951ae37db79ffa1b664b2623104a))
* **common:** add Servers.startOnPreferredPort(), Servers.startOnPort() ([3efb118](https://github.com/hyperledger/cactus/commit/3efb118ace474d23635d34b7b9f5184bb4848fa4))
* **common:** add utility class Strings with replaceAll ([3986aed](https://github.com/hyperledger/cactus/commit/3986aedc586854cafc7bc8072fa7d71344a1efb1))
* **common:** Checks and CodedError classes ([c65baf8](https://github.com/hyperledger/cactus/commit/c65baf88749166ba8d0c970760c8aab172a83a1a)), closes [#266](https://github.com/hyperledger/cactus/issues/266)
* **common:** KeyConverter class to and from PEM/hex/buffe ([fc80106](https://github.com/hyperledger/cactus/commit/fc80106f87b66e935b40a450470262713db2f1d5))
* **common:** Servers utility class ([ad01dee](https://github.com/hyperledger/cactus/commit/ad01dee4def65f47e6292d117eaece2b2ebc1c3c)), closes [#260](https://github.com/hyperledger/cactus/issues/260) [#267](https://github.com/hyperledger/cactus/issues/267)
* **common:** Stable Signature Generation from JS Objects ([22b5f5c](https://github.com/hyperledger/cactus/commit/22b5f5ce05a82b80e067da327b47331ed34e289e))
* **connection-chain:** add readme, package dir ([#76](https://github.com/hyperledger/cactus/issues/76)) ([e6e9981](https://github.com/hyperledger/cactus/commit/e6e9981a98450d8e70f97b9f6231afc816bc3fe2))
* **connectionchain:** Add FUJITSU ConnectionChain-sample ([#78](https://github.com/hyperledger/cactus/issues/78)) ([5107068](https://github.com/hyperledger/cactus/commit/5107068552462987d5adb97be592fab769e15a3c))
* **core-api:** 🎸 add IKeychainPlugin#getKeychainId() ([34656b0](https://github.com/hyperledger/cactus/commit/34656b0730f886619efbbddb512c094029cbbebd))
* **core-api:** add instanceId getter to ICactusPlugin ([e50d9ce](https://github.com/hyperledger/cactus/commit/e50d9cef081708d7d6b92701f7f941c36ef6f920))
* **core-api:** web service plugins ([8eaeb45](https://github.com/hyperledger/cactus/commit/8eaeb454b1df993b5aa7743a50678ea7fe882364))
* **examples:** add example/cartrade applications ([769c087](https://github.com/hyperledger/cactus/commit/769c087af524451a1a7c6860ee5cb6d6de08461f))
* **examples:** add example01-car-trade and its validatorDriver ([c8a84f4](https://github.com/hyperledger/cactus/commit/c8a84f4e2b55f4f56eabec47ced6b8d6c4aea7cf))
* **fabric-all-in-one:** runs-a-Fabric-Network-in-one-docker-container ([703bc61](https://github.com/hyperledger/cactus/commit/703bc61a850b87176d04793545a9030b9bffc617)), closes [#132](https://github.com/hyperledger/cactus/issues/132)
* **fabric14-testnet:** fabric-v14-testnet ([d2fd5d7](https://github.com/hyperledger/cactus/commit/d2fd5d7f1358ce2e1b8519b4bbca8e7d41779aba))
* **keychain:** add dummy/in-memory implementation ([f3061ad](https://github.com/hyperledger/cactus/commit/f3061ad3cab220f90042b8746a77c06ced105438))
* **ledger-connector:** quorum added with contract deployment now generic ([123d6ee](https://github.com/hyperledger/cactus/commit/123d6ee1c38b1eae8006a87d6b3e8caf421c3af8))
* **ledger-connector-fabric:** golang chaincode deployment ([38e9780](https://github.com/hyperledger/cactus/commit/38e97808c74124bb35f0aa37e4b3d0eb42161920)), closes [#252](https://github.com/hyperledger/cactus/issues/252) [#275](https://github.com/hyperledger/cactus/issues/275) [#276](https://github.com/hyperledger/cactus/issues/276) [#277](https://github.com/hyperledger/cactus/issues/277)
* **plugin-consortium-manual:** JSON Web Signatures for Nodes, Consortium ([caf60b3](https://github.com/hyperledger/cactus/commit/caf60b3f69c81617787afe73ca12165baa2dce50))
* **plugin-ledger-connector-besu:** add log level to options ([29402d0](https://github.com/hyperledger/cactus/commit/29402d0814bf9ebc642430cd0acb660eb4d50b97))
* **plugin-ledger-connector-besu:** contract deployment and tests ([3df6b73](https://github.com/hyperledger/cactus/commit/3df6b739a957445bae4e27c52487bb8fe582b195))
* **plugin-validator-besu:** generate signature of simple asset ([4c5c253](https://github.com/hyperledger/cactus/commit/4c5c2534b551cd972f0536e12d930ef995265ab4))
* **plugin-web-service-consortium:** add dedicated plugin for consortium management API ([f63f5a5](https://github.com/hyperledger/cactus/commit/f63f5a5bcba4099fe7975e07e88bf6b6adbab416))
* **quorum:** 🎸 export model-type-guards to public API surface ([49ec2d5](https://github.com/hyperledger/cactus/commit/49ec2d5cea181bb37ca610d810350f433ba383d2))
* **quorum:** 🎸 support Cactus Keychain APIs ([0d4769f](https://github.com/hyperledger/cactus/commit/0d4769fa52d1f79c22bdb6f60c2c2b7200b8cf99))
* **quorum:** code cleanup ([b6ab258](https://github.com/hyperledger/cactus/commit/b6ab25802b1cca1e69a0cc3e44cdc83a8fbbc74b))
* **sdk:** adds partially auto-generated SDK ([6527870](https://github.com/hyperledger/cactus/commit/6527870f5d7aff3217d6ca7319595845eb526d4d))
* **sdk:** routing to nodes by ledger ID ([10e3d1c](https://github.com/hyperledger/cactus/commit/10e3d1c46731bf6d84a28d837e2f6601b4c6a78f))
* **test-tooling:** 🎸 createEthTestAccount() to Besu,Quorum test ledger ([2c0d73c](https://github.com/hyperledger/cactus/commit/2c0d73c0aba31e1d51d94d9482caad0e2d862ac9))
* **test-tooling:** all in one besu ledger ([4ba6f4b](https://github.com/hyperledger/cactus/commit/4ba6f4b5a58be0f8bd3a25ef9a5a42303ae26308))
* **tools:** besu-all-in-one personal RPC HTTP API ([f2219d9](https://github.com/hyperledger/cactus/commit/f2219d95d85f589eb6aef97b547e2b78677315e8))
* 🎸 add method: QuorumTestLedger#getGenesisAccount() ([ac19e49](https://github.com/hyperledger/cactus/commit/ac19e49b87dad7d23d9eea91e2bbca0e3a0f69e4))
* **test-tooling:** Containers class ls() and exec() methods ([44ad88a](https://github.com/hyperledger/cactus/commit/44ad88a1f8ddc16735ef4533a1d25c9acf690d2e)), closes [#275](https://github.com/hyperledger/cactus/issues/275)
* **validator:** elections powered by etcd leases ([#31](https://github.com/hyperledger/cactus/issues/31)) ([61aab4a](https://github.com/hyperledger/cactus/commit/61aab4aafe02e4a40fa91145c5d0182123a11606))
* **validator:** go-ethereum validator including execSyncFunction ([9e520d0](https://github.com/hyperledger/cactus/commit/9e520d057b6b597f240396967c6e6c4afff874b7))
* **Validator:** (fixed) Validator on Ethereum-specific Ledger Plugin ([a20ed33](https://github.com/hyperledger/cactus/commit/a20ed330ae676041b5eabf349dd617075aa6ffc5))
* **Validator:** Validator on Ethereum-specific Ledger Plugin ([a58c81e](https://github.com/hyperledger/cactus/commit/a58c81e1c252ab9ea2808d2b104c21a7b950f9b0))
* **Validator:** Validator on Fabric-specific Ledger Plugin ([e6483ca](https://github.com/hyperledger/cactus/commit/e6483caef6ef88d18818e4f6a3bee6a8dfdd2b8b))
* Add corda to CI ([#84](https://github.com/hyperledger/cactus/issues/84)) ([bd796d6](https://github.com/hyperledger/cactus/commit/bd796d6b007fa58269be0b4560c0e583d26d6e7c))


### Performance Improvements

* **ci:** travis no longer runs configure.sh ([de10cd4](https://github.com/hyperledger/cactus/commit/de10cd4eac8d2fc127c0c7b67e6bd75c07641b47))
