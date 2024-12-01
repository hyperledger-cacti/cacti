# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.1.0](https://github.com/hyperledger/cacti/compare/v2.0.0...v2.1.0) (2024-12-01)

### Bug Fixes

* **besu:** deployContractSolBytecodeNoKeychainV1 requires keychainId ([11dacbc](https://github.com/hyperledger/cacti/commit/11dacbcef25ba3e7fa9f9880f60655be1e2396ef)), closes [#3586](https://github.com/hyperledger/cacti/issues/3586)
* **connector-besu:** do not crash if ledger unreachable - send HTTP 503 ([394323e](https://github.com/hyperledger/cacti/commit/394323e91e3bd0df57c87d6bae406298c559fc7f))
* **connector-besu:** set contract bytecode field's max length to 49154 ([33b2cf0](https://github.com/hyperledger/cacti/commit/33b2cf06eb239986aa0c50221ce390a3a27f3a45)), closes [#3636](https://github.com/hyperledger/cacti/issues/3636)

### Features

* **cactus-connector-besu:** add IRunTransactionV1Exchange to share receipt data ([3097c84](https://github.com/hyperledger/cacti/commit/3097c84895b73d44f8f61ec5e2a09abc1e8306e8))

# [2.0.0](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.7...v2.0.0) (2024-10-15)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-besu

# [2.0.0-rc.6](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.5...v2.0.0-rc.6) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-besu

# [2.0.0-rc.5](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.4...v2.0.0-rc.5) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-besu

# [2.0.0-rc.4](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.3...v2.0.0-rc.4) (2024-09-08)

### Bug Fixes

* **security:** address CVE-2024-39338 SSRF in axios >= 1.3.2, <= 1.7.3 ([7e7bb44](https://github.com/hyperledger/cacti/commit/7e7bb44c01a2d19306ecaaaa2ba2e3c574039c87))

# [2.0.0-rc.3](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.2...v2.0.0-rc.3) (2024-07-21)

### Bug Fixes

* address CVE-2022-24434, GHSA-wm7h-9275-46v2 caused by dicer ([6ff8111](https://github.com/hyperledger/cacti/commit/6ff8111c2534f71a5f623433eba59a610d84f4eb))

### Build System

* bump uuid@10.0.0 fs-extra@11.2.0 @bufbuild/protobuf@1.10.0 ([9970352](https://github.com/hyperledger/cacti/commit/997035216694fe335215b8a3586488ac8c12447f))

### Code Refactoring

* retire connector plugin specific container images, fix docs ([24b5888](https://github.com/hyperledger/cacti/commit/24b5888247d134ea417fc0e83dccc9826b4075f3))

### Features

* **besu:** remove hard dependency on keychain ([f5b60b4](https://github.com/hyperledger/cacti/commit/f5b60b4d25acc7a4bc53f3b9b87433b18a5d9153)), closes [#963](https://github.com/hyperledger/cacti/issues/963)

### BREAKING CHANGES

* Container images are being deleted here and will also
get deleted from GHCR. Though the public APIs of the Typescript code
do not change, still, some parts of the documentation will become invalid
until we update it to match the changes here.
I invested a large amount of effort into doing this documentation update
as part of this change but it is very likely that I've missed a few spots
and therefore it is best to mark this as a breaking change in my opinion
to call attention to the fact that we still have ways to go with updating
the documentation around these container images.

1. Deleted all the container images that were just wrappers around the
cmd-api-server container image installing their own npm package from
the registry.
The reason for this is that they ended up just being maintenance burden
since we can achieve the exact same things just by re-using the API server's
container image directly.
2. This way we don't have to deal with CVEs in 10x container images when
it's really just the one container image that we use as the base that needs
to deal with them anyway.
3. I also spent quite a bit of effort in this change to update the README.md
files of the packages where previously we had plugin specific container images
defined so that the README.md files have the tutorials that are more up to
date compared to how they were (most of them had the tutorials completely
broken for a long while which was causing a lot of difficulties to the
newcomers who were trying to work with the packages).
4. The reason why they got so out of date traces back to the undue maintenance
burden of keeping separate images for each connector plugin. We hope that
with this simplification we can keep the documentation continuously up to
date since it will require less time do so.
5. Also deleted the ci.yaml container building jobs which were relevant to
the scope of this change so that we also save on CI resources, another
long-running project that's been in need of some attention from the maintainers.

Signed-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>
* Renamed classes to fix typos in their name: `PluginFactoryPersistanceFabric`
This is being done in this pull request because for some reason (that I still don't understand)
the spell checker started failing on these only in the context of this pull request.
The typos were present on the main branch already somehow having passed spellchecking earlier
and every other time since then.

And also
- prom-clien@15.1.3
- del-cli@5.1.0
- cspell@8.10.4
- del-cli@5.1.0

Quality of life improvements and also hoping to get rid of a few of the
vulnerable dependency versions we have in the codebase according to
dependabot.

More similar changes are coming in with further upgrades but I want to
avoid making bigger changes in one go so that it's easier to hunt down
bugs later if something only gets discovered after we've merged a bunch
of these.

Signed-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>

# [2.0.0-rc.2](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.1...v2.0.0-rc.2) (2024-07-03)

### Bug Fixes

* **deps:** fix batch of missing production dependencies v2.0.0-rc.1 ([51d64ee](https://github.com/hyperledger/cacti/commit/51d64eead473d928086eb53adf0850c3b43cbda9)), closes [#3344](https://github.com/hyperledger/cacti/issues/3344)

### Features

* **connector-besu:** expose API client and OpenAPI code for web builds ([199c1f0](https://github.com/hyperledger/cacti/commit/199c1f05c282d15ba2ded9e7a69253483fbac2ec))

# [2.0.0-rc.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.2...v2.0.0-rc.1) (2024-06-14)

### Bug Fixes

* **cactus-common:** coerceUnknownToError() now uses HTML sanitize ([d70488a](https://github.com/hyperledger/cacti/commit/d70488a82e9c1d6958ac3ab0368f3c3bfca378c6))
* **connector-besu:** error handling of DeployContractSolidityBytecodeEndpoint ([89d9b93](https://github.com/hyperledger/cacti/commit/89d9b93b7380477c10d8da78fcd259c95b495fa9)), closes [#2868](https://github.com/hyperledger/cacti/issues/2868)
* **connector-besu:** toBuffer only supports 0x-prefixed hex ([1d00e32](https://github.com/hyperledger/cacti/commit/1d00e32ed0f76b1d9081a7cea55ad41c956ec25b))
* **deps:** bulk add missing dependencies - 2023-11-02 ([8addb01](https://github.com/hyperledger/cacti/commit/8addb018b6d124d54d9d948bbaeba6ea33b67153)), closes [#2857](https://github.com/hyperledger/cacti/issues/2857)
* **security:** address CVE-2021-3749 - axios >=0.22.0 ([61fc700](https://github.com/hyperledger/cacti/commit/61fc7001b1dd0849ab1d9bcab08e2475c695adae))
* **security:** remediate qs vulnerability CVE-2022-24999 ([536b6b1](https://github.com/hyperledger/cacti/commit/536b6b1b7ab9014ebcd6b162e1a467e78b52afdd))

### Features

* **connector-besu:** add continuous benchmarking with JMeter ([379d41d](https://github.com/hyperledger/cacti/commit/379d41dd4b2cc994801c85f1fa16ea854f0301f7))
* **connector-besu:** add gRPC support for operations ([ab676d2](https://github.com/hyperledger/cacti/commit/ab676d23e1781aa17b5f2c61cb7dec643443bded)), closes [#3173](https://github.com/hyperledger/cacti/issues/3173)
* **plugin-satp-hermes:** replace IPFS dependency in SATP package ([3bb7157](https://github.com/hyperledger/cacti/commit/3bb7157b8c910c31aa3fe125ecfb3437c2bef5bb)), closes [#2984](https://github.com/hyperledger/cacti/issues/2984) [#3006](https://github.com/hyperledger/cacti/issues/3006)

# [2.0.0-alpha.2](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2023-09-27)

### Bug Fixes

* **security:** crash in HeaderParser in dicer ([77fb559](https://github.com/hyperledger/cacti/commit/77fb559532448aae45cfe704da2637119bf93c27))
* **security:** the CVE-2022-2421 - upgrade socket.io-parser to >=4.2.1 ([9172172](https://github.com/hyperledger/cacti/commit/917217227a3fa53a00429f047cd6318862e6ab8d)), closes [#2229](https://github.com/hyperledger/cacti/issues/2229) [#2228](https://github.com/hyperledger/cacti/issues/2228)
* use common conventions: tsconfig.json, package.json ([50f5c02](https://github.com/hyperledger/cacti/commit/50f5c02190ba28b77492c09e81f5d5ba6578e862)), closes [#2216](https://github.com/hyperledger/cacti/issues/2216)

### Features

* **connector-besu:** add GetOpenApiSpecV1Endpoint (HTTP GET) ([76744f0](https://github.com/hyperledger/cacti/commit/76744f0f7b6629959f59939de0fea0f71ff7a5f0))
* **openapi:** upgrade to 6.3.0 phase1 ([a094614](https://github.com/hyperledger/cacti/commit/a094614877d6043a6e3e8c0b3e95203eed7d6203)), closes [#2298](https://github.com/hyperledger/cacti/issues/2298)

# [2.0.0-alpha.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha-prerelease...v2.0.0-alpha.1) (2023-05-19)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-besu

# [2.0.0-alpha-prerelease](https://github.com/hyperledger/cacti/compare/v1.2.0...v2.0.0-alpha-prerelease) (2023-05-11)

### Bug Fixes

* **cmd-api-server:** mitigate CVE-2022-24434 and CVE-2022-24999 [#2039](https://github.com/hyperledger/cactus/issues/2039) ([1cc9667](https://github.com/hyperledger/cactus/commit/1cc9667e2432d1d27c2647b86e42707a2e78e4c3)), closes [#2241](https://github.com/hyperledger/cactus/issues/2241)

# [1.2.0](https://github.com/hyperledger/cactus/compare/v1.1.3...v1.2.0) (2023-03-28)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-besu

## [1.1.3](https://github.com/hyperledger/cactus/compare/v1.1.2...v1.1.3) (2022-12-08)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-besu

## [1.1.2](https://github.com/hyperledger/cactus/compare/v1.1.1...v1.1.2) (2022-11-11)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-besu

## [1.1.1](https://github.com/hyperledger/cactus/compare/v1.1.0...v1.1.1) (2022-11-03)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-besu

# [1.1.0](https://github.com/hyperledger/cactus/compare/v1.0.0...v1.1.0) (2022-10-17)

### Bug Fixes

* **security:** address CVE-2021-23358 ([ed71f42](https://github.com/hyperledger/cactus/commit/ed71f42aca1683dd2fd6f762fbc6cd19b4c3c253)), closes [#1775](https://github.com/hyperledger/cactus/issues/1775)
* **security:** close DDoS vulnerability in eth tx consistenty strategy ([64b61a7](https://github.com/hyperledger/cactus/commit/64b61a742a885f0027543bc620b5db08b5444669)), closes [#2001](https://github.com/hyperledger/cactus/issues/2001)

# [1.0.0](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.3...v1.0.0) (2022-03-16)

### Bug Fixes

* **cmd-api-server:** upgrade socket.io - CVE-2022-21676 ([8e1c69e](https://github.com/hyperledger/cactus/commit/8e1c69e7b8ab5e4ccc31a0ec183a9777ccc22cdc)), closes [#1914](https://github.com/hyperledger/cactus/issues/1914)
* **connector-besu/quorum/xdai:** unvalidated dynamic method call ([bdc1aba](https://github.com/hyperledger/cactus/commit/bdc1aba982cc2ec1a74b0458c98ceeacc7acb9e7)), closes [#1911](https://github.com/hyperledger/cactus/issues/1911)
* **security:** upgrade to yarn > 1.22.0 - CVE-2019-10773, CVE-2020-8131 ([43d591d](https://github.com/hyperledger/cactus/commit/43d591d2eff576cb581a2a92d98edf7f4f6ecf13)), closes [#1922](https://github.com/hyperledger/cactus/issues/1922)
* **security:** upgrade web3 to upgrade elliptic > 6.5.4 ([5513848](https://github.com/hyperledger/cactus/commit/55138483e43dd840a6c3822d1ff8f2f7ce8c35e8)), closes [#1639](https://github.com/hyperledger/cactus/issues/1639)

### Features

* **cactus-api-client:** add support for plain socketio validators in api-server and api-client ([634b10e](https://github.com/hyperledger/cactus/commit/634b10e5eaf82df08b04c11c3af5b109ede5b942)), closes [#1602](https://github.com/hyperledger/cactus/issues/1602) [#1602](https://github.com/hyperledger/cactus/issues/1602)

# [1.0.0-rc.3](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2021-12-07)

### Bug Fixes

* fixes 1445 and implementing correct interface types ([9022064](https://github.com/hyperledger/cactus/commit/9022064e245a92f71d2d303d77bfdaf64d1b1678)), closes [#1445](https://github.com/hyperledger/cactus/issues/1445)

### Features

* **odap:** first implemenation for odap plugin and endpoints ([51bf753](https://github.com/hyperledger/cactus/commit/51bf753d421cdd255c178036fe901eb9c1c04130))

# [1.0.0-rc.2](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2021-11-01)

### Bug Fixes

* **lint:** fix issue [#1359](https://github.com/hyperledger/cactus/issues/1359) ([f7eb39b](https://github.com/hyperledger/cactus/commit/f7eb39bb1392b2762adac3a189da071249f4eca3))

### Features

* **htlc-coordinator:** new htlc coordinator ([28c97d3](https://github.com/hyperledger/cactus/commit/28c97d33e97fa180f1b2b65d505f5ae36a9ddc25)), closes [#953](https://github.com/hyperledger/cactus/issues/953)

# [1.0.0-rc.1](https://github.com/hyperledger/cactus/compare/v0.10.0...v1.0.0-rc.1) (2021-10-11)

### Bug Fixes

* openapi tests for besu, htlc-eth-besu and htlc-eth-besu-erc20 ([b9170e9](https://github.com/hyperledger/cactus/commit/b9170e929492f3305a420c75c7d12d06b288e0ab)), closes [#1291](https://github.com/hyperledger/cactus/issues/1291) [#847](https://github.com/hyperledger/cactus/issues/847)
* **webpack:** prod build chokes on upgraded ssh2 binaries [#1405](https://github.com/hyperledger/cactus/issues/1405) ([18979fb](https://github.com/hyperledger/cactus/commit/18979fb33880d8ca30e2fda01fb3d598deb839f9))

# [0.10.0](https://github.com/hyperledger/cactus/compare/v0.9.0...v0.10.0) (2021-09-28)

### Features

* **besu:** support besu v21.1.6 [#982](https://github.com/hyperledger/cactus/issues/982) ([d715c67](https://github.com/hyperledger/cactus/commit/d715c679fee681844f29ed30f09f6d651daf087e))
* **core-api:** discontinue dedicated HTTP listeners for web service plugins ([3fbd2fc](https://github.com/hyperledger/cactus/commit/3fbd2fcb60d49090bf4e986bea74d4e988348659)), closes [#358](https://github.com/hyperledger/cactus/issues/358)
* **core:** add installOpenapiValidationMiddleware ([1f6ea5f](https://github.com/hyperledger/cactus/commit/1f6ea5fe3aa1ba997a655098d632034f13f232a5)), closes [#847](https://github.com/hyperledger/cactus/issues/847)

# [0.9.0](https://github.com/hyperledger/cactus/compare/v0.8.0...v0.9.0) (2021-08-31)

### Features

* besu private transaction support ([53b4980](https://github.com/hyperledger/cactus/commit/53b49808615aced96b628bf1498a1b62c5c9ca42))

# [0.8.0](https://github.com/hyperledger/cactus/compare/v0.7.0...v0.8.0) (2021-08-17)

### Bug Fixes

* **prometheus:** metrics.ts leaks to global registry [#1202](https://github.com/hyperledger/cactus/issues/1202) ([ce076d7](https://github.com/hyperledger/cactus/commit/ce076d709f8e0cba143f8fe9d71f1de1df8f71dc))

# [0.7.0](https://github.com/hyperledger/cactus/compare/v0.6.0...v0.7.0) (2021-08-04)

### Bug Fixes

* **connector-corda:** fix build broken by operationId rename ([291dd3b](https://github.com/hyperledger/cactus/commit/291dd3bc666939fffbc3780eaefd9059c756878a))

### Features

* **besu:** record locator ([2410d6d](https://github.com/hyperledger/cactus/commit/2410d6d4430f5b1f587befa01824a7674c6e11fa))

# [0.6.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.6.0) (2021-07-19)

### Bug Fixes

* **connector-besu:** network update only if present in keychain ([8ac2444](https://github.com/hyperledger/cactus/commit/8ac2444f86f9a1310f045ff0f7e4e78b91635be0))
* **connector-besu:** remove magic strings ([6d9ae53](https://github.com/hyperledger/cactus/commit/6d9ae53c64bd4e6c3eb33164bfa5d5507582220b)), closes [#1104](https://github.com/hyperledger/cactus/issues/1104)
* **connector-besu:** removed repeated check ([a4cb63b](https://github.com/hyperledger/cactus/commit/a4cb63b483d61578dd0d356fc0c9c20d8a2024e0))
* **connector-corda:** container image kotlin compilation fails in model ([a8a4531](https://github.com/hyperledger/cactus/commit/a8a4531d379fe16d4c991802525ec573a7e3ede1))
* **deps:** elliptic upgrade to >6.5.3 for CVE-2020-28498 ([d75b9af](https://github.com/hyperledger/cactus/commit/d75b9af764241ab2e10914769412201fb040b1ed))

### Features

* besu WatchBlocksV1Endpoint with SocketIO ([d5e1708](https://github.com/hyperledger/cactus/commit/d5e1708e84ab5192d07410d5120e144d477ef6ce))
* **besu:** add sequence diagram of run transaction endpoint ([754a11a](https://github.com/hyperledger/cactus/commit/754a11a449d9a67dd8d6ebecbeb1b65cefa71b7f)), closes [#755](https://github.com/hyperledger/cactus/issues/755)
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
* **connector-quorum:** contractAbi optional parameter ([c79d763](https://github.com/hyperledger/cactus/commit/c79d763e0cb093647209417cfed7a2645283f302))
* **core-api:** decouple web service install & registration [#771](https://github.com/hyperledger/cactus/issues/771) ([b50e148](https://github.com/hyperledger/cactus/commit/b50e148f43c0b27138471c972aab391486e761e6))
* **core-api:** hasTransactionFinality() on connector API [#354](https://github.com/hyperledger/cactus/issues/354) ([a2d0582](https://github.com/hyperledger/cactus/commit/a2d058218780e5e4c81e5f847cc875879a946e3f))
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))
* **core-api:** plugin async initializer method ([9678c2e](https://github.com/hyperledger/cactus/commit/9678c2e9288a73589e84f9fd254c26aed6a93297))

# [0.5.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.5.0) (2021-05-19)

### Bug Fixes

* **connector-besu:** network update only if present in keychain ([8ac2444](https://github.com/hyperledger/cactus/commit/8ac2444f86f9a1310f045ff0f7e4e78b91635be0))
* **deps:** elliptic upgrade to >6.5.3 for CVE-2020-28498 ([d75b9af](https://github.com/hyperledger/cactus/commit/d75b9af764241ab2e10914769412201fb040b1ed))

### Features

* **besu:** add sequence diagram of run transaction endpoint ([754a11a](https://github.com/hyperledger/cactus/commit/754a11a449d9a67dd8d6ebecbeb1b65cefa71b7f)), closes [#755](https://github.com/hyperledger/cactus/issues/755)
* **connector-besu:** contract deployment with constructor arguments ([48d67a7](https://github.com/hyperledger/cactus/commit/48d67a7a7af223337777917a01002426a79f8463)), closes [#810](https://github.com/hyperledger/cactus/issues/810)
* **connector-besu:** contractAbi optional parameter ([26cf7c2](https://github.com/hyperledger/cactus/commit/26cf7c23919436ca82107b532309b5197ad2e39d))
* **connector-besu:** dockerfile ([7174004](https://github.com/hyperledger/cactus/commit/71740048eb97e2855febc96a91a5f64215591187))
* **connector-besu:** replace invokeContractV2 ([ecd62ea](https://github.com/hyperledger/cactus/commit/ecd62eac5721514dbcfc401d5f28dfdc58ef8873))
* **connector-besu, connector-quorum:** filesystem replaced by keychain ([14d1790](https://github.com/hyperledger/cactus/commit/14d17904442723450790644653ff18dda79dfa5e))
* **connector-besu,connector-quorum:** updated ([985f12f](https://github.com/hyperledger/cactus/commit/985f12f69c52a139a72aecc9b050e71545a90df8))
* **connector-quorum:** contractAbi optional parameter ([c79d763](https://github.com/hyperledger/cactus/commit/c79d763e0cb093647209417cfed7a2645283f302))
* **core-api:** decouple web service install & registration [#771](https://github.com/hyperledger/cactus/issues/771) ([b50e148](https://github.com/hyperledger/cactus/commit/b50e148f43c0b27138471c972aab391486e761e6))
* **core-api:** hasTransactionFinality() on connector API [#354](https://github.com/hyperledger/cactus/issues/354) ([a2d0582](https://github.com/hyperledger/cactus/commit/a2d058218780e5e4c81e5f847cc875879a946e3f))
* **core-api:** jwt authorization [#770](https://github.com/hyperledger/cactus/issues/770) ([2016750](https://github.com/hyperledger/cactus/commit/2016750849b4333bb4dd78897468771f0642a4f5))

## [0.4.1](https://github.com/hyperledger/cactus/compare/v0.4.0...v0.4.1) (2021-04-02)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-besu

# [0.4.0](https://github.com/hyperledger/cactus/compare/v0.3.0...v0.4.0) (2021-03-30)

### Bug Fixes

* **ci:** disk full issues on GitHub Action Workflow runner [#698](https://github.com/hyperledger/cactus/issues/698) ([61e3f76](https://github.com/hyperledger/cactus/commit/61e3f76ed910c9b04b36f995456213018cc0e7ba))
* **connector-besu:** added test for call with parameters ([1fa24be](https://github.com/hyperledger/cactus/commit/1fa24bed8f42d39dd7b9ce989b8192774a9c7257))
* **connector-besu:** avoid req.params repetition ([64d6cf1](https://github.com/hyperledger/cactus/commit/64d6cf1f56375c9dd97c7cdf0d11c573fdf26b5a))
* **connector-besu:** fixed transaction value assignment and added test ([48bb129](https://github.com/hyperledger/cactus/commit/48bb1294f03f8b488c6f570b1e248f26aef2ccd1))
* **connector-besu:** revert change in generated code ([075ad90](https://github.com/hyperledger/cactus/commit/075ad90000507b95774065b7fad280b09a49c5f7))
* **general:** fixed unused deps and updated them ([b76a970](https://github.com/hyperledger/cactus/commit/b76a9703341c5a4cabe056e743338cbedebbeaad))
* reverting accidental manual change in generated code ([e67369f](https://github.com/hyperledger/cactus/commit/e67369f6b9bded6f54231cbcb34de534b6a80f5b)), closes [#453](https://github.com/hyperledger/cactus/issues/453)

### Features

* **besu:** add prometheus exporter ([7352203](https://github.com/hyperledger/cactus/commit/7352203842f0aa47f5b474732c09806465814474)), closes [#533](https://github.com/hyperledger/cactus/issues/533)
* **connector-besu:** added ether value in  contract invoke request ([add9cd9](https://github.com/hyperledger/cactus/commit/add9cd94ed7fe4a7facda89749895f7b04de89a8))
* **connector-besu:** common interface invoke-contract ([ee93120](https://github.com/hyperledger/cactus/commit/ee93120abc7551d22eb94ba7e0521feaffa479bb))
* **connector-besu:** customizable nonce and gas ([89c0060](https://github.com/hyperledger/cactus/commit/89c00604084a80cdd2c1f42a918f5028660703db))
* **connector-besu:** implemented contract instance map ([17fdd94](https://github.com/hyperledger/cactus/commit/17fdd94bb4063fd8eaa1bd53d25d87f343ab9ba4))
* **connector-besu:** request param: wait for ledger tx receipt [#685](https://github.com/hyperledger/cactus/issues/685) ([dc8c564](https://github.com/hyperledger/cactus/commit/dc8c564b2819a6f7c2ccc3f6cf37c68900a0c552))
* **core-api:** plugin import types: LOCAL & REMOTE ([f4d51da](https://github.com/hyperledger/cactus/commit/f4d51dae5b28367e714a2b9aa35dd84a2cb4cb37))
* **refactor:** openapi endpoint paths ([261c17b](https://github.com/hyperledger/cactus/commit/261c17b08124070c7be0890d6bc3da380255893b))

# [0.3.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.3.0) (2021-01-06)

### Bug Fixes

* open API generator config - protected keyword ([57e52f4](https://github.com/hyperledger/cactus/commit/57e52f42c3aaab653acb8838ba93518a5a097af8)), closes [#436](https://github.com/hyperledger/cactus/issues/436)

### Features

* **besu:** 🎸 OpenAPI support => arbitrary TX, contract deployments ([6d7e788](https://github.com/hyperledger/cactus/commit/6d7e7882eb0e11102a7e06b508433203c7cd821d))
* **besu:** add keychain reference signing support ([768c4cc](https://github.com/hyperledger/cactus/commit/768c4cc67837699f5e153545cc7350f2807c4460))
* **besu:** remove references to gethkeychainpassword ([2640b52](https://github.com/hyperledger/cactus/commit/2640b521967de51dc84e30f27749256da6369434))
* **cmd-api-server:** fully dynamic plugin imports via config file/env/CLI ([fe396c9](https://github.com/hyperledger/cactus/commit/fe396c969436f1c1a99b6d03d8b58b160e1a93bb))
* **core-api:** add instanceId getter to ICactusPlugin ([e50d9ce](https://github.com/hyperledger/cactus/commit/e50d9cef081708d7d6b92701f7f941c36ef6f920))
* **core-api:** getConsensusAlgorithmFamily() on connector API ([477dc7e](https://github.com/hyperledger/cactus/commit/477dc7ed5dfba9ae56060772d478aae349919f10)), closes [#355](https://github.com/hyperledger/cactus/issues/355)
* **plugin-ledger-connector-besu:** add log level to options ([29402d0](https://github.com/hyperledger/cactus/commit/29402d0814bf9ebc642430cd0acb660eb4d50b97))

# [0.2.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.2.0) (2020-12-01)

### Features

* **besu:** 🎸 OpenAPI support => arbitrary TX, contract deployments ([6d7e788](https://github.com/hyperledger/cactus/commit/6d7e7882eb0e11102a7e06b508433203c7cd821d))
* **besu:** add keychain reference signing support ([768c4cc](https://github.com/hyperledger/cactus/commit/768c4cc67837699f5e153545cc7350f2807c4460))
* **cmd-api-server:** fully dynamic plugin imports via config file/env/CLI ([fe396c9](https://github.com/hyperledger/cactus/commit/fe396c969436f1c1a99b6d03d8b58b160e1a93bb))
* **core-api:** add instanceId getter to ICactusPlugin ([e50d9ce](https://github.com/hyperledger/cactus/commit/e50d9cef081708d7d6b92701f7f941c36ef6f920))
* **plugin-ledger-connector-besu:** add log level to options ([29402d0](https://github.com/hyperledger/cactus/commit/29402d0814bf9ebc642430cd0acb660eb4d50b97))
