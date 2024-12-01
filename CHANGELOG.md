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
* **cactus-consortium:** add Ethereum ledger type ([4265725](https://github.com/hyperledger/cacti/commit/426572521646cd7391be66c09590991cf83fcf01))
* **cactus-core-api:** add Ethereum ledger type ([a1be603](https://github.com/hyperledger/cacti/commit/a1be603c3ceea748579ad96a1d2b38a2438eec8b))
* **copm:** add fabric COPM implementation ([7af9983](https://github.com/hyperledger/cacti/commit/7af99833f4db237d6aba7223a31add5723faba9d))

### Performance Improvements

* **github:** add knob/flag to manually override CI skip ([ed36bbe](https://github.com/hyperledger/cacti/commit/ed36bbe80b0b610761c976bc397fd011a423bf42))

# [2.0.0](https://github.com/hyperledger-cacti/cacti/compare/v2.0.0-rc.7...v2.0.0) (2024-10-15)

### Bug Fixes

* mitigate CVE-2024-42461 - bump elliptic to v6.5.7 ([32c242a](https://github.com/hyperledger-cacti/cacti/commit/32c242a1a984a890aeba88073ff9805c697e5579))
* **test-tooling:** use of hardcoded password ([63f2943](https://github.com/hyperledger-cacti/cacti/commit/63f2943d47960d2e09cd527da77f661b0f9265b2))

# [2.0.0-rc.6](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.5...v2.0.0-rc.6) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cactus

# [2.0.0-rc.5](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.4...v2.0.0-rc.5) (2024-09-30)

### Bug Fixes

* **openapi:** openapi-generator-ignore file ([4df1211](https://github.com/hyperledger/cacti/commit/4df1211d0bdaa75467eaf71b2bc6e5b9d79676b4))
* **weaver-corda:** added duplicate handling strategy in build.gradle ([c5bbb33](https://github.com/hyperledger/cacti/commit/c5bbb334aeb34282eb0aeaaf446f50bc785f4982))

### Features

* **cmd-socketio-server:** move to examples as deprecated ([4de8069](https://github.com/hyperledger/cacti/commit/4de806974f0066359cca422561042a55173d3655))

# [2.0.0-rc.4](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.3...v2.0.0-rc.4) (2024-09-08)

### Bug Fixes

* **ci:** updated permissioning and versioning in GitHub Actions ([cd71082](https://github.com/hyperledger/cacti/commit/cd71082c849e773e5e214c06cbf40aa703e6177f))
* **relay:** curl openssl added -L; upgrade openssl from 1.1.1 to 3.0.14 ([935e4b8](https://github.com/hyperledger/cacti/commit/935e4b872becb4034becd9f31cf03e958b9abbde))
* **security:** address CVE-2022-3517 - minimatch < 3.0.5 ReDoS vuln ([e97e27b](https://github.com/hyperledger/cacti/commit/e97e27bca0a8fb4b52c716ee25437d69efff74d4))
* **security:** address CVE-2024-39338 SSRF in axios >= 1.3.2, <= 1.7.3 ([7e7bb44](https://github.com/hyperledger/cacti/commit/7e7bb44c01a2d19306ecaaaa2ba2e3c574039c87))

### Features

* **connector-daml:** aio image ([141ee24](https://github.com/hyperledger/cacti/commit/141ee2488b44da4282c48a1c15533f5ceb83ec5f))
* **consortium-static:** new consortium plugin ([db3475f](https://github.com/hyperledger/cacti/commit/db3475fe359ede8fbf5bcbe6e9dc40c40cd2378d))
* **corda:** support 5.1 via TS/HTTP (no JVM) ([ec9683d](https://github.com/hyperledger/cacti/commit/ec9683d38670fe5d657b602db8215e602fd4209d)), closes [#2978](https://github.com/hyperledger/cacti/issues/2978) [#3293](https://github.com/hyperledger/cacti/issues/3293)
* **core-api:** add createIsJwsGeneralTypeGuard, createAjvTypeGuard<T> ([957da7c](https://github.com/hyperledger/cacti/commit/957da7c3e1d80068391485a825ba6bb1e68333ac)), closes [/github.com/hyperledger/cacti/pull/3471#discussion_r1731894747](https://github.com//github.com/hyperledger/cacti/pull/3471/issues/discussion_r1731894747)
* **go-ethereum-socketio:** remove deprecated connector ([56dd9f8](https://github.com/hyperledger/cacti/commit/56dd9f8aa72883aeb5bfcf0303b0af6e84daad7a)), closes [#3155](https://github.com/hyperledger/cacti/issues/3155)
* **ledger-browser:** implement dynamic app setup ([0e368de](https://github.com/hyperledger/cacti/commit/0e368de059d30e099a8979989949ca34834ffdf9)), closes [#3347](https://github.com/hyperledger/cacti/issues/3347)
* **ledger-browser:** refactor home page ([500ac9b](https://github.com/hyperledger/cacti/commit/500ac9ba8ac9d6694e0838d34871028ace896a9c)), closes [#3320](https://github.com/hyperledger/cacti/issues/3320)
* **ledger-browser:** rewrite fabric application ([ecf074c](https://github.com/hyperledger/cacti/commit/ecf074c8c6d5ed67eed2e490c653b41aae691c19)), closes [#3308](https://github.com/hyperledger/cacti/issues/3308) [#3279](https://github.com/hyperledger/cacti/issues/3279)
* **persistence-ethereum:** add sample setup scripts, improve documentation ([ed915cf](https://github.com/hyperledger/cacti/commit/ed915cf6f8f1388cbfdc16c954102da1e381920b))
* **persistence-ethereum:** migrate to separate db schema ([b160c52](https://github.com/hyperledger/cacti/commit/b160c52f1a99f8019beb8af9d4f8c0b46cf1953c)), closes [#3340](https://github.com/hyperledger/cacti/issues/3340)
* **persistence-fabric:** add sample setup scripts, improve documentation ([9fef336](https://github.com/hyperledger/cacti/commit/9fef336494911fa3673530f6945e97d3dd3ce934))
* **tcs-huawei-socketio:** remove deprecated connector ([053224f](https://github.com/hyperledger/cacti/commit/053224f55762d545f6ea656228f922630dc0dbf5)), closes [#3155](https://github.com/hyperledger/cacti/issues/3155) [#3155](https://github.com/hyperledger/cacti/issues/3155)
* **weaver:** upgrade to corda 4.12 and jvm 17 ([edde6c6](https://github.com/hyperledger/cacti/commit/edde6c62cc02549d4c4dd20b830c1a97ba05f933))

# [2.0.0-rc.3](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.2...v2.0.0-rc.3) (2024-07-21)

### Bug Fixes

* address CVE-2022-24434, GHSA-wm7h-9275-46v2 caused by dicer ([6ff8111](https://github.com/hyperledger/cacti/commit/6ff8111c2534f71a5f623433eba59a610d84f4eb))
* **ci:** deprecationWarning in yarn_custom_checks ([96a3865](https://github.com/hyperledger/cacti/commit/96a3865ce5404e0fd3bf5a6471eb5a653e579d33))
* **cmd-api-server:** use ncc bundle in container image - CVE-2024-29415 ([9eefa66](https://github.com/hyperledger/cacti/commit/9eefa66446a193c7ca164c876f8ed6d5cc56549b))
* **connector-fabric:** decode blocks in getTransactionReceiptByTxID() ([1bdc35d](https://github.com/hyperledger/cacti/commit/1bdc35d5c9d49315e2b8b32c90c66b322d866bf9))
* **connector-polkadot:** use dynamic import calls for ESM dependencies ([76adf12](https://github.com/hyperledger/cacti/commit/76adf12afa40829226b4698f2d4394bd6fbe3aba)), closes [#3077](https://github.com/hyperledger/cacti/issues/3077)
* the CVEs of braces nth-check vite webpack-dev-middleware - 2024-07 ([4253d3f](https://github.com/hyperledger/cacti/commit/4253d3f75aef3e3e7849c56182ddd67e56f89fb3))

### Build System

* bump uuid@10.0.0 fs-extra@11.2.0 @bufbuild/protobuf@1.10.0 ([9970352](https://github.com/hyperledger/cacti/commit/997035216694fe335215b8a3586488ac8c12447f))

### Code Refactoring

* retire connector plugin specific container images, fix docs ([24b5888](https://github.com/hyperledger/cacti/commit/24b5888247d134ea417fc0e83dccc9826b4075f3))

### Features

* **besu:** remove hard dependency on keychain ([f5b60b4](https://github.com/hyperledger/cacti/commit/f5b60b4d25acc7a4bc53f3b9b87433b18a5d9153)), closes [#963](https://github.com/hyperledger/cacti/issues/963)
* **bungee-hermes:** ability to use connectors without instanciating APIs ([6a71ddf](https://github.com/hyperledger/cacti/commit/6a71ddfb5568d1fc11818e225782713bfaddc6d5))
* **connector-corda:** add vaultQueryV1 REST API operation + endpoint ([d2bf145](https://github.com/hyperledger/cacti/commit/d2bf1458ce2f1342fe330d9118aae7fc2fdd3312))
* **connector-corda:** support JVM 17 Cordapps ([1994128](https://github.com/hyperledger/cacti/commit/19941280469a3f66cb678525a4088f86b9cacee3))
* **fabric-connector:** add getChainInfo, improve getBlock output ([8c030ae](https://github.com/hyperledger/cacti/commit/8c030ae9e739a28ff0900f7af27ec0fbbb4b7ff9))
* **persistence-fabric:** rewrite the plugin ([c867a9f](https://github.com/hyperledger/cacti/commit/c867a9f5ef084e4e6d7c6f5a641d1dd13f9ce233)), closes [#3298](https://github.com/hyperledger/cacti/issues/3298)

### Performance Improvements

* **ci:** only publish artifacts on git version tags of main ([66e3139](https://github.com/hyperledger/cacti/commit/66e3139505c5bb3cd2e2aee86cd635d76d17374e))

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
* **fabric-connector:** It accepts `type` instead of `skipDecode` flag.
- Move common block formatting logic to `cacti-block-formatters.ts`.
- Add tests for new features. Move test common to quering `qscc` to single file
  to increase CI speed.

Signed-off-by: Michal Bajer <michal.bajer@fujitsu.com>

# [2.0.0-rc.2](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.1...v2.0.0-rc.2) (2024-07-03)

### Bug Fixes

* **cmd-api-server:** shutdown hook was not waiting for promises ([d14bf02](https://github.com/hyperledger/cacti/commit/d14bf02aed215eeecdba258bb48a330da3fc2c36))
* **cmd-api-server:** stop changing LoggerProvider log level ([6ef514c](https://github.com/hyperledger/cacti/commit/6ef514cc01eda2640ed144bdd4750dbcb1e35e27))
* **deps:** fix batch of missing production dependencies v2.0.0-rc.1 ([51d64ee](https://github.com/hyperledger/cacti/commit/51d64eead473d928086eb53adf0850c3b43cbda9)), closes [#3344](https://github.com/hyperledger/cacti/issues/3344)
* **go-sdk:** use protos v1 api for fabric-protos-go unmarshal ([8896518](https://github.com/hyperledger/cacti/commit/88965187de69076420237a93548a9e5fdd7f0e74))
* **plugin-persistence-ethereum:** make created_at TIMESTAMPTZ in schema ([08925ff](https://github.com/hyperledger/cacti/commit/08925ffc8815d9613a69204a74c85d168f8a8305)), closes [#3373](https://github.com/hyperledger/cacti/issues/3373)

### Features

* **cactus-example-tcs-huawei:** remove deprecated sample app ([45fadcd](https://github.com/hyperledger/cacti/commit/45fadcd089bb59cf5f604110030a5e7eba5d67b2)), closes [#3155](https://github.com/hyperledger/cacti/issues/3155) [#3157](https://github.com/hyperledger/cacti/issues/3157)
* **connector-besu:** expose API client and OpenAPI code for web builds ([199c1f0](https://github.com/hyperledger/cacti/commit/199c1f05c282d15ba2ded9e7a69253483fbac2ec))
* **connector-corda:** add initial set of JvmObject factory functions ([d9d5904](https://github.com/hyperledger/cacti/commit/d9d590450af6d231c5e38046bffd6d08786c29f4))
* **connector-corda:** add JSON classname->JVM class object deserialize ([0508f14](https://github.com/hyperledger/cacti/commit/0508f14c64e452f8f89881db363cd00b3c8c255c))
* **fabric-driver:** added weaver fabric driver as cacti plugin package ([36b8470](https://github.com/hyperledger/cacti/commit/36b8470f8a159bcb16c5ef62074aee2ff99758eb))
* **ledger-browser:** refactor eth dashboard page ([c69fb4c](https://github.com/hyperledger/cacti/commit/c69fb4c5982669d335870218c617ff847fbe1db9)), closes [#3207](https://github.com/hyperledger/cacti/issues/3207)
* **ledger-browser:** refactor eth tokens page into accounts page ([0b0c22c](https://github.com/hyperledger/cacti/commit/0b0c22cd39fb67e809595ceb23fb8b3c2a0f1da0)), closes [#3237](https://github.com/hyperledger/cacti/issues/3237)
* **ledger-browser:** refactor routing, improve UI ([3fcc7a1](https://github.com/hyperledger/cacti/commit/3fcc7a1215435341db927ec211af598a0a298d44))
* **ledger-browser:** use react query in eth app ([4d3fb7e](https://github.com/hyperledger/cacti/commit/4d3fb7e25d78804ffda498e9cdd4600bf0a50f0c)), closes [#3203](https://github.com/hyperledger/cacti/issues/3203)

# [2.0.0-rc.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.2...v2.0.0-rc.1) (2024-06-14)

### Bug Fixes

* **cactus-common:** coerceUnknownToError() now uses HTML sanitize ([d70488a](https://github.com/hyperledger/cacti/commit/d70488a82e9c1d6958ac3ab0368f3c3bfca378c6))
* **cactus-example-cbdc-bridging-backend:** add missing CRPC port config option ([84c0733](https://github.com/hyperledger/cacti/commit/84c0733db93e6b2cd91050c48641562130f3ea0b))
* **cmd-api-server:** add runtime type validation to HTTP verbs pulled from OAS ([b0ff599](https://github.com/hyperledger/cacti/commit/b0ff599b2c32b83d7d45c41ef215372044ccda23)), closes [#2751](https://github.com/hyperledger/cacti/issues/2751) [#2751](https://github.com/hyperledger/cacti/issues/2751) [#2751](https://github.com/hyperledger/cacti/issues/2751) [#2754](https://github.com/hyperledger/cacti/issues/2754)
* **cmd-api-server:** address CVE-2022-25881 ([81da333](https://github.com/hyperledger/cacti/commit/81da3334d8e638f85e398dd228bcef836a278230)), closes [#2862](https://github.com/hyperledger/cacti/issues/2862)
* **cmd-api-server:** fix CVE-2023-36665 protobufjs try 2 ([4e8b553](https://github.com/hyperledger/cacti/commit/4e8b5534d6a86c856768c0b47af794d66304f90d)), closes [#2682](https://github.com/hyperledger/cacti/issues/2682)
* **cmd-api-server:** healthcheck broken due to missing wget binary ([8f1ca3f](https://github.com/hyperledger/cacti/commit/8f1ca3fcce9fedaedd4ceafbb51d8e8cd41cc50e)), closes [#2894](https://github.com/hyperledger/cacti/issues/2894)
* **connector-besu:** error handling of DeployContractSolidityBytecodeEndpoint ([89d9b93](https://github.com/hyperledger/cacti/commit/89d9b93b7380477c10d8da78fcd259c95b495fa9)), closes [#2868](https://github.com/hyperledger/cacti/issues/2868)
* **connector-besu:** toBuffer only supports 0x-prefixed hex ([1d00e32](https://github.com/hyperledger/cacti/commit/1d00e32ed0f76b1d9081a7cea55ad41c956ec25b))
* **connector-corda:** contract deployment SSH reconnect race condition ([0af2eb1](https://github.com/hyperledger/cacti/commit/0af2eb13235d4dda5dfe92912be48722caea09b1))
* **connector-fabric:** address CVEs: CVE-2022-21190, CVE-2021-3918 ([11e775d](https://github.com/hyperledger/cacti/commit/11e775d6e6611d0b054cd18cca620969cb947dd8)), closes [#2864](https://github.com/hyperledger/cacti/issues/2864)
* **connector-quorum/ethereum:** strengthen contract parameter validation ([779bb7e](https://github.com/hyperledger/cacti/commit/779bb7e24b06352bad64c96eab3b24c0961d1381)), closes [#2760](https://github.com/hyperledger/cacti/issues/2760)
* **corda-simple-app:** use correct bond asset flows and contracts for bond asset exchange ([caa2b3a](https://github.com/hyperledger/cacti/commit/caa2b3a50ab7928942e72341ebc7e5511e3054f7))
* **deps:** bulk add missing dependencies - 2023-11-02 ([8addb01](https://github.com/hyperledger/cacti/commit/8addb018b6d124d54d9d948bbaeba6ea33b67153)), closes [#2857](https://github.com/hyperledger/cacti/issues/2857)
* GHSA-8qv2-5vq6-g2g7 webpki CPU denial of service in certificate path ([e24458f](https://github.com/hyperledger/cacti/commit/e24458f0541d7000ea915d97668831723744baea))
* **indy-vdr-nodejs:** update dependency version ([f81b46b](https://github.com/hyperledger/cacti/commit/f81b46bce5ca0880e6bf6b51be2233e2616759a5))
* **ledger-browser:** fix vulnerability CVE-2022-37601 ([55c7d3d](https://github.com/hyperledger/cacti/commit/55c7d3d8054af35eb903ee903a91b8f23b905998))
* **persistence-fabric:** hide not critical API ([793f94f](https://github.com/hyperledger/cacti/commit/793f94ffefe483bd2a08ad7afb30fac7aa029007))
* **plugin-htlc-coordinator-besu:** add missing HSTS header ([dff34e8](https://github.com/hyperledger/cacti/commit/dff34e8f26f94a391b8b926057cbd6346bc0b3f8))
* **plugin-keychain-vault:** fix CVE-2024-0553 in vault server image ([1eacf7e](https://github.com/hyperledger/cacti/commit/1eacf7e2a33349de794d486a47cc6bd62d93311a))
* **security:** address CVE-2021-3749 - axios >=0.22.0 ([61fc700](https://github.com/hyperledger/cacti/commit/61fc7001b1dd0849ab1d9bcab08e2475c695adae))
* **security:** mitigate CVE-2024-21505 ([f48994f](https://github.com/hyperledger/cacti/commit/f48994fe0e3736909103a844eb59cb7f3cfed247))
* **security:** remediate qs vulnerability CVE-2022-24999 ([536b6b1](https://github.com/hyperledger/cacti/commit/536b6b1b7ab9014ebcd6b162e1a467e78b52afdd))
* **weaver-asset-transfer:** return proper error messages for pledge status and claim status ([f8f6bcb](https://github.com/hyperledger/cacti/commit/f8f6bcb67733dd57b2ecde94922cff24342b7589))
* **weaver-fabric-node-sdk:** made AES key length configurable in ECIES functions ([e679801](https://github.com/hyperledger/cacti/commit/e67980141d2fb2e54ef8408e36dbab55b7195905))
* **weaver-go-cli:** updated Weaver Fabric Go CLI module to ensure local compilation ([1668cf4](https://github.com/hyperledger/cacti/commit/1668cf4104a3a653bb17ebc04d86d72b9b22547f))
* **weaver-go-sdk:** corrected membership API function signatures ([083ea4f](https://github.com/hyperledger/cacti/commit/083ea4f4464691fc967a897bf267daaeea216343))
* **weaver-go-sdk:** revert fabric-protos-go-apiv2 dep to fabric-protos-go ([6994e5b](https://github.com/hyperledger/cacti/commit/6994e5b7a43b4f3e06535babb17edd466c4d4abc))
* **weaver-membership-functions:** reverted earlier buggy change affecting identity mgmt ([faf90dd](https://github.com/hyperledger/cacti/commit/faf90ddbe9c061cd6261d642842ab12ae4be3c48))
* **weaver-packages:** removing unnecessary package-lock.json file ([f3e53e4](https://github.com/hyperledger/cacti/commit/f3e53e4625d6667a59b55647d026c59431c32d85))
* **weaver-satp:** bug and configuration fixes in relays and Fabric drivers for sample SATP implementation ([9f77871](https://github.com/hyperledger/cacti/commit/9f77871419712bacc623dd9fbbe40f6016f0a94f))
* **weaver:** improper exception handling ([a33f30c](https://github.com/hyperledger/cacti/commit/a33f30c07cb7b952581c2401da60a25170b23d1c)), closes [#2767](https://github.com/hyperledger/cacti/issues/2767)
* **weaver:** upgraded Corda dependencies to overcome Log4j vulnerability ([76f0c68](https://github.com/hyperledger/cacti/commit/76f0c680bcf74d0d78e02e95ab6c9268d15d82d2))
* **weaver:** usage of weak PRNG issue ([fa17b52](https://github.com/hyperledger/cacti/commit/fa17b52d641345a6ffc3ff6b0845be75202dc945)), closes [#2765](https://github.com/hyperledger/cacti/issues/2765)

### Features

* **actionlint:** fix the errors produced by the ActionLint tool ([e6d5d88](https://github.com/hyperledger/cacti/commit/e6d5d88fd33b2078035447bc0e452f3d862e0e68))
* **bungee-hermes:** new plugin bungee-hermes ([ecf52ec](https://github.com/hyperledger/cacti/commit/ecf52ecce310d626ea96a53c2d41dcb797510c4d))
* **bungee-hermes:** process & merge views ([231a5e5](https://github.com/hyperledger/cacti/commit/231a5e532bcb8219986dd7f5c8fa4d66cef99f34))
* **bungee-hermes:** viewProof & ethereum strategy ([22f389f](https://github.com/hyperledger/cacti/commit/22f389fc311490e5f3959b4f80e7f4caf4ac5804))
* **cactus-core-api:** add ISendRequestResultV1<T> for Fujitsu verifier ([483de38](https://github.com/hyperledger/cacti/commit/483de3838017961656c0fb850934988ae0c63c91))
* **cactus-core:** add ConnectRPC service interface and type guard ([9e83087](https://github.com/hyperledger/cacti/commit/9e830874dfed51a805566a5bedc62e3d43fc234f))
* **cactus-core:** add handleRestEndpointException utility to public API ([bf9dfe8](https://github.com/hyperledger/cacti/commit/bf9dfe882f78f7fc88ee52d86d62b7e851716b79))
* **cactus-example-discounted-asset-trade:** use openapi ethereum connector ([dcaf9fe](https://github.com/hyperledger/cacti/commit/dcaf9fe5de5b830975f3d308f140eff32d3cb79d)), closes [#2645](https://github.com/hyperledger/cacti/issues/2645)
* **cactus-example-discounted-asset-trade:** use openapi sawtooth connector ([86d6b38](https://github.com/hyperledger/cacti/commit/86d6b38e213a5304799beab48bdd46a8fc0cc0c3)), closes [#2825](https://github.com/hyperledger/cacti/issues/2825)
* **cactus-example-electricity-trade:** use openapi ethereum connector ([9e66850](https://github.com/hyperledger/cacti/commit/9e66850438c97883a8999c3def36e807bfbb1a76))
* **cactus-plugin-ledger-connector-aries:** add new connector plugin ([afef5ae](https://github.com/hyperledger/cacti/commit/afef5ae3e2f36bf7f25928ee75f82bc4800b3172)), closes [#2946](https://github.com/hyperledger/cacti/issues/2946)
* **cactus-plugin-ledger-connector-cdl-socketio:** separate endpoint for subscription key ([b1048af](https://github.com/hyperledger/cacti/commit/b1048af272e7f33fae3c68dc854d40f9be7a4e84))
* **cactus-plugin-ledger-connector-cdl-socketio:** support subscription key auth ([a04fc5b](https://github.com/hyperledger/cacti/commit/a04fc5b2593a27d5c0f9311a1ad2f83f727e2e70))
* **cactus-plugin-ledger-connector-cdl:** add new connector plugin ([6efd8de](https://github.com/hyperledger/cacti/commit/6efd8de9ff5bb8d6b894147e5c6e49aed2fa8ae4))
* **cactus-plugin-ledger-connector-ethereum:** add json-rpc proxy ([ed04201](https://github.com/hyperledger/cacti/commit/ed04201671bdb614549e995b3d88cc2cae218e56))
* **cactus-plugin-ledger-connector-ethereum:** add signing utils ([84c5b34](https://github.com/hyperledger/cacti/commit/84c5b34afa73b4f906e413c4d5dd3ff46a1dd7a8))
* **cactus-plugin-ledger-connector-ethereum:** add stress test ([55fa26e](https://github.com/hyperledger/cacti/commit/55fa26ef41d405b26da02b099418da5fa281c78f)), closes [#2631](https://github.com/hyperledger/cacti/issues/2631)
* **cactus-plugin-ledger-connector-ethereum:** refactor connector API ([cda279f](https://github.com/hyperledger/cacti/commit/cda279fb0009a4d5756c461024ad88f525bfe946)), closes [#2630](https://github.com/hyperledger/cacti/issues/2630)
* **cactus-plugin-ledger-connector-ethereum:** support London fork gas prices ([80a89dd](https://github.com/hyperledger/cacti/commit/80a89dd95d51bdc604392dbe96ab27d233b116a4)), closes [#2581](https://github.com/hyperledger/cacti/issues/2581)
* **cactus-plugin-ledger-connector-ethereum:** update web3js to 4.X ([55f82c9](https://github.com/hyperledger/cacti/commit/55f82c9568b3e875de4f3ceb89a828f8b23d65be)), closes [#2580](https://github.com/hyperledger/cacti/issues/2580) [#2535](https://github.com/hyperledger/cacti/issues/2535) [#2578](https://github.com/hyperledger/cacti/issues/2578)
* **cactus-plugin-ledger-connector-fabric-socketio:** remove fabric-socketio connector ([704e201](https://github.com/hyperledger/cacti/commit/704e201d6bd6bf7a38f0de7da60723118e18cea7)), closes [#2644](https://github.com/hyperledger/cacti/issues/2644)
* **cactus-plugin-ledger-connector-fabric:** support delegated (offline) signatures ([e2812f4](https://github.com/hyperledger/cacti/commit/e2812f4abce00a1918b8d13a6cfff382289ff998)), closes [#2598](https://github.com/hyperledger/cacti/issues/2598)
* **cactus-plugin-ledger-connector-iroha:** remove deprecated iroha connector ([fa27fde](https://github.com/hyperledger/cacti/commit/fa27fde9a28f83ff29964693be656dc107046517)), closes [#3159](https://github.com/hyperledger/cacti/issues/3159) [#3155](https://github.com/hyperledger/cacti/issues/3155)
* **cactus-plugin-ledger-connector-sawtooth:** add new connector plugin ([e379504](https://github.com/hyperledger/cacti/commit/e37950403636a3fbc378fc7462b886294e6c7923))
* **cactus-plugin-persistence-ethereum:** use openapi ethereum connector ([b8f9b79](https://github.com/hyperledger/cacti/commit/b8f9b79daa7a97cbd75325eba00c7458bfed5ce5)), closes [#2631](https://github.com/hyperledger/cacti/issues/2631)
* **cbdc-bridging:** add frontend code for the CBDC example ([5ad0ebf](https://github.com/hyperledger/cacti/commit/5ad0ebffe9de0eabbdfabb8ce8fa5c426519ee33))
* **cmd-api-server:** add ConnectRPC auto-registration for plugins ([c569460](https://github.com/hyperledger/cacti/commit/c569460b099469184a7953ffc0f806ddf3facb38))
* **cmd-api-server:** add gRPC plugin auto-registration support ([5762dad](https://github.com/hyperledger/cacti/commit/5762dadfe108c6c73251d5b474961e4888941b90))
* **common:** add express http verb method name string literal type ([8f048ea](https://github.com/hyperledger/cacti/commit/8f048ea72750595016eea4e40fd57291001cff95))
* **common:** add isGrpcStatusObjectWithCode user-defined type guard ([941dbad](https://github.com/hyperledger/cacti/commit/941dbad8fa5950b754dde97b02cc4c0ac0e9e0bb))
* **connector-besu:** add continuous benchmarking with JMeter ([379d41d](https://github.com/hyperledger/cacti/commit/379d41dd4b2cc994801c85f1fa16ea854f0301f7))
* **connector-besu:** add gRPC support for operations ([ab676d2](https://github.com/hyperledger/cacti/commit/ab676d23e1781aa17b5f2c61cb7dec643443bded)), closes [#3173](https://github.com/hyperledger/cacti/issues/3173)
* **connector-fabric:** drop support for Fabric v1.x ([ec8123c](https://github.com/hyperledger/cacti/commit/ec8123cf954b09ba8cb213c7332dfe82224c351f))
* **connector-polkadot:** add connector pkg, openapi specs, test suite ([6a476a0](https://github.com/hyperledger/cacti/commit/6a476a0f1143380d2fd6bf81c68b0842c13c6ae2))
* **core-api:** add IPluginGrpcService type & user-defined type guard ([e87e577](https://github.com/hyperledger/cacti/commit/e87e57791024824bb19830c66b9f3d2eaed6d629))
* **core:** add configureExpressAppBase() utility function ([383f852](https://github.com/hyperledger/cacti/commit/383f8528d88989b44c9763fc883c3d9ac74da21e))
* **ethereum-connector:** support block monitoring with http only connection ([f4373a9](https://github.com/hyperledger/cacti/commit/f4373a90020cbc8bfbc16da6c32babe627e7d4ae))
* **indy-sdk:** replace indy SDK with AFJ ([3291dcc](https://github.com/hyperledger/cacti/commit/3291dcc57e9e4eb04e0b9abab4134e1a5e2b0bbf)), closes [#2859](https://github.com/hyperledger/cacti/issues/2859) [#2860](https://github.com/hyperledger/cacti/issues/2860)
* **indy-test-ledger:** add helper class for indy ledger ([8c746c3](https://github.com/hyperledger/cacti/commit/8c746c331564e76e8619c5c6987cd9380ce4a13f)), closes [#2861](https://github.com/hyperledger/cacti/issues/2861)
* **plugin-keychain-memory:** add ConnectRPC support ([c5fecf6](https://github.com/hyperledger/cacti/commit/c5fecf6802efba0c982db1adc4a98b785c9cb8e0)), closes [#3183](https://github.com/hyperledger/cacti/issues/3183)
* **plugin-keychain-memory:** add observability via RxJS ReplaySubjects ([9b41377](https://github.com/hyperledger/cacti/commit/9b41377c3885cf12be3c0f49bd2745200b0d07d3))
* **plugin-keychain-memory:** add REST API endpoint implementations ([c7a8fa5](https://github.com/hyperledger/cacti/commit/c7a8fa5e3e33b3c6a1464d9762a66337176e6cdd))
* **plugin-satp-hermes:** replace IPFS dependency in SATP package ([3bb7157](https://github.com/hyperledger/cacti/commit/3bb7157b8c910c31aa3fe125ecfb3437c2bef5bb)), closes [#2984](https://github.com/hyperledger/cacti/issues/2984) [#3006](https://github.com/hyperledger/cacti/issues/3006)
* **satp:** sample implementation of SATP standard using relays ([c23197c](https://github.com/hyperledger/cacti/commit/c23197c314885b99146b52c3cd0e056439193d6e))
* **supabase-all-in-one:** update versions, use skopeo ([eeb34f9](https://github.com/hyperledger/cacti/commit/eeb34f9515bf6a7a85c1b2343b94075c4ee0a505)), closes [#3099](https://github.com/hyperledger/cacti/issues/3099)
* **test-tooling:** add Stellar test ledger ([58fa94e](https://github.com/hyperledger/cacti/commit/58fa94e194f7716934e717a0e3075773ebd31b4c)), closes [#3239](https://github.com/hyperledger/cacti/issues/3239)
* **weaver-go:** upgraded Weaver Fabric Go SDK with membership functions ([43cce8e](https://github.com/hyperledger/cacti/commit/43cce8e3778a574514d2759c282a7f0108be86b5))
* **weaver:** add build script and fix minor issues ([6d4fd00](https://github.com/hyperledger/cacti/commit/6d4fd00d457d3a72017a7cd8d4a9cf3fb4d5f37e))

### Performance Improvements

* **cmd-api-server:** add demonstration of continuous benchmarking ([0804bab](https://github.com/hyperledger/cacti/commit/0804bab4c9b43f2e22be6d77be127415a9a0532f))

### BREAKING CHANGES

* **connector-fabric:** The Open API specification that has the enums for
ledger versions will no longer have an option for Fabric v1.x
This means that in the core-api package the LedgerType enum has changes
which means that code that depends on that enum value will need to be
updated.

Fabric v1.x has had unmaintained dependencies associated with it such as
the native grpc package that stopped receiving security updates years ago
and therefore it's dangerous to have around.

There are also some issues with Fabric v1.x that make the AIO image flaky
which also makes the relevant tests flaky due to which we couldn't run
the v1.x Fabric tests on the CI for a while now anyway.

In order to reduce the CI resource usage and our own maintenance burden
I suggest that we get rid of the Fabric v1.x support meaning that we can
eliminate the AIO image build and some code complexity from the test ledger
code as well.

In addition some old fixtures can be removed that the tests were using.
Overall a net-positive as deleting code without losing functionality (that
we care about) is always a plus.

Signed-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>

# [2.0.0-alpha.2](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2023-09-27)

### Bug Fixes

* **besu:** testnet web3 version fixed to 1.10.0 ([334612d](https://github.com/hyperledger/cacti/commit/334612d251c56811a844b3308dc1561dcd6fc460))
* **cactus-core-api:** address CVE-2021-38192 - GHSA-x4qm-mcjq-v2gf ([ff1afa5](https://github.com/hyperledger/cacti/commit/ff1afa5a6195399753c22f45837bbbf4ea27fe3c)), closes [#2612](https://github.com/hyperledger/cacti/issues/2612)
* **cactus-validator-socketio-indy:** upgrade pyjwt to 2.4.0 ([59f9f91](https://github.com/hyperledger/cacti/commit/59f9f916f2f931de3a9b83ea38070814db5875f9)), closes [#2614](https://github.com/hyperledger/cacti/issues/2614)
* **cmd-api-server:** fix CVE-2023-36665 protobufjs Prototype Pollution vuln ([7bb3957](https://github.com/hyperledger/cacti/commit/7bb39576080592919bea0ac89646b32105e1748e)), closes [#2682](https://github.com/hyperledger/cacti/issues/2682)
* **connector-fabric:** runTransactionV1 Open API validation crash ([516dd49](https://github.com/hyperledger/cacti/commit/516dd49fd443fc2d50b003104301b8060327b35a))
* ejs critical vulnerability CVE-2022-29078 ([2813b75](https://github.com/hyperledger/cacti/commit/2813b75bf5eebb7505ec05817c584324b3b6b149))
* **indy-validator:** fix package dependencies ([a28641a](https://github.com/hyperledger/cacti/commit/a28641ae47bd686af76d85ac22bcc84548211c59)), closes [#2596](https://github.com/hyperledger/cacti/issues/2596)
* **plugin-odap-hermes:** fix duplicate enum values of OdapMessageType ([292d287](https://github.com/hyperledger/cacti/commit/292d2876abdc8eedfe9b51ed70ed0bc32db63e48)), closes [#2553](https://github.com/hyperledger/cacti/issues/2553)
* **security:** crash in HeaderParser in dicer ([77fb559](https://github.com/hyperledger/cacti/commit/77fb559532448aae45cfe704da2637119bf93c27))
* **security:** the CVE-2022-2421 - upgrade socket.io-parser to >=4.2.1 ([9172172](https://github.com/hyperledger/cacti/commit/917217227a3fa53a00429f047cd6318862e6ab8d)), closes [#2229](https://github.com/hyperledger/cacti/issues/2229) [#2228](https://github.com/hyperledger/cacti/issues/2228)
* **security:** upgrade fabric 2.x deps to 2.2.18 ([36988a5](https://github.com/hyperledger/cacti/commit/36988a5edbf9856a1bcc960a3b9afe443536733e)), closes [#2610](https://github.com/hyperledger/cacti/issues/2610)
* **security:** vulnerabilities found in cactus-whitepaper ([c56334d](https://github.com/hyperledger/cacti/commit/c56334dd75e58e52a345fdafcbbe943ca6664aa4)), closes [#2038](https://github.com/hyperledger/cacti/issues/2038)
* **tessera:** updated tessera version error in quorum-all-in-one [#2411](https://github.com/hyperledger/cacti/issues/2411) ([759f305](https://github.com/hyperledger/cacti/commit/759f3055deba739cee426b089b30f29c0d0fca6c)), closes [#2240](https://github.com/hyperledger/cacti/issues/2240) [#2274](https://github.com/hyperledger/cacti/issues/2274)
* use common conventions: tsconfig.json, package.json ([50f5c02](https://github.com/hyperledger/cacti/commit/50f5c02190ba28b77492c09e81f5d5ba6578e862)), closes [#2216](https://github.com/hyperledger/cacti/issues/2216)
* **vscode/devcontainer:** unexpected exit stdout /etc/passwd ([eb0134b](https://github.com/hyperledger/cacti/commit/eb0134b3486e21014e926c43ba8cd3823c340c12)), closes [#2404](https://github.com/hyperledger/cacti/issues/2404)
* **weaver-corda:** throw error correctly in responder flows ([b888a5e](https://github.com/hyperledger/cacti/commit/b888a5e25aa54fa0a371a05524409b9bbbc2ce5d))
* **webpack:** fix broken bundling - cannot find webpack.config.js ([794f0b4](https://github.com/hyperledger/cacti/commit/794f0b4db6f352849b2d012c5034f0ed8d1903af))

### Code Refactoring

* **cmd-api-server:** clean up configuration parameters [#720](https://github.com/hyperledger/cacti/issues/720) ([b8e8388](https://github.com/hyperledger/cacti/commit/b8e8388306b6708c7d3156e005b1ee9693b35a22))

### Features

* **besu-test-ledger:** send funds to already created address ([3a58508](https://github.com/hyperledger/cacti/commit/3a585085b4510d9755e1d70314187293cbe51222)), closes [#2250](https://github.com/hyperledger/cacti/issues/2250)
* **cacti-cmd-gui-app:** add GUI to visualize Fabric, Ethereum blocks ([15d9e9d](https://github.com/hyperledger/cacti/commit/15d9e9dcdc072ac0f6be2bf5146102b1328faaaf))
* **cactus-common:** add createRuntimeErrorWithCause() & newRex() ([b3a508c](https://github.com/hyperledger/cacti/commit/b3a508c9a080e00a5e39ffa352a38e785b8cea9c)), closes [#1702](https://github.com/hyperledger/cacti/issues/1702)
* **cactus-core:** add GetOpenApiSpecV1EndpointBase<S, P> class ([6d68292](https://github.com/hyperledger/cacti/commit/6d68292f5bd88854f1d625631ce4c70f4151a02f))
* **cactus-plugin-ledger-connector-cdl-socketio:** add new connector plugin ([aee28fe](https://github.com/hyperledger/cacti/commit/aee28fee8ac6f386c8b95560f085daf2ec4965f8)), closes [#2455](https://github.com/hyperledger/cacti/issues/2455)
* **cactus-plugin-ledger-connector-ethereum:** add new connector plugin ([f8a2131](https://github.com/hyperledger/cacti/commit/f8a2131e9fc0ea05c1c1c8863489a43a74f019ae)), closes [#2534](https://github.com/hyperledger/cacti/issues/2534)
* **cbdc-bridging-app:** implementation of CBDC bridging example ([ca1b3be](https://github.com/hyperledger/cacti/commit/ca1b3be87bcc3242790647a71be8eb5db3dcd931)), closes [#2205](https://github.com/hyperledger/cacti/issues/2205)
* **cmd-api-server:** add GetOpenApiSpecV1Endpoint (HTTP GET) ([aeebbd4](https://github.com/hyperledger/cacti/commit/aeebbd4d86cb62f8d1d53fded65ae40eb5e27910))
* **connector-besu:** add GetOpenApiSpecV1Endpoint (HTTP GET) ([76744f0](https://github.com/hyperledger/cacti/commit/76744f0f7b6629959f59939de0fea0f71ff7a5f0))
* **connector-iroha2:** update to the new LTS image as of 28.07.2023 ([ccdaa12](https://github.com/hyperledger/cacti/commit/ccdaa1254cb4d46cc6a0af2c0472f3838603123f))
* **connector-quorum:** add WebsocketProvider options to quorum LP ([b7ad571](https://github.com/hyperledger/cacti/commit/b7ad571e77c6b9e2abb2b5ab8ecd7ffb93172747))
* **connector-tcs-huawei:** add initial version ([d8d538d](https://github.com/hyperledger/cacti/commit/d8d538d42692ddf01ef24327cb31bd8e6cd48c01))
* corda asset transfer test workflow added and bug fixes ([4b5ee09](https://github.com/hyperledger/cacti/commit/4b5ee095b07f7c6a4290cfb85280d825672ce394))
* **fabric-test-ledger:** add support to enrolling users in different Orgs ([b910681](https://github.com/hyperledger/cacti/commit/b9106810db11a2af19c8c06d6be39d2648f96fba)), closes [#2248](https://github.com/hyperledger/cacti/issues/2248)
* **geth-all-in-one:** add ethereum test image and helper class ([fb4231f](https://github.com/hyperledger/cacti/commit/fb4231f3e8ddc2b7c4aadddf62dac759b7a62d44)), closes [#2577](https://github.com/hyperledger/cacti/issues/2577)
* **openapi:** upgrade to 6.3.0 phase1 ([a094614](https://github.com/hyperledger/cacti/commit/a094614877d6043a6e3e8c0b3e95203eed7d6203)), closes [#2298](https://github.com/hyperledger/cacti/issues/2298)
* **plugin-htlc-eth-besu:** add private HTLCs and forge build & test ([aade510](https://github.com/hyperledger/cacti/commit/aade510c5fc13199006466aecd8235130d6ec353))
* **plugin-persistence-fabric:** add new fabric persistence plugin ([47a64ee](https://github.com/hyperledger/cacti/commit/47a64ee17446db8102e2ca95f16b26f8778175a4)), closes [#2259](https://github.com/hyperledger/cacti/issues/2259) [#2265](https://github.com/hyperledger/cacti/issues/2265)
* **quorum-connector:** add script for checking connection status ([d306d21](https://github.com/hyperledger/cacti/commit/d306d211ebaa30b700dce4277c09531ba88d7952)), closes [#2309](https://github.com/hyperledger/cacti/issues/2309)
* **quorum:** private transaction support ([3c944d6](https://github.com/hyperledger/cacti/commit/3c944d601d5824eaf3cc6a9a8af1f8a6e5fe6db3))
* **weaver-corda:** support array of remote views, consequent user flow call ([a8e5d54](https://github.com/hyperledger/cacti/commit/a8e5d5425b2db21d2a72282729c61b1073c000a6))
* **weaver/common:** add data view protocol buffer spec & RFCs for Besu ([97f17e0](https://github.com/hyperledger/cacti/commit/97f17e0deb86621d818c5ac7b3f30595fe82fe03))
* **weaver:** added multiple participants support for data sharing in corda ([4e81b92](https://github.com/hyperledger/cacti/commit/4e81b929ea4996b345616e6a579dccdedc295de3))

### BREAKING CHANGES

* **cmd-api-server:** Removed the `keyPairPem` parameter from the API server
configuration.

# [2.0.0-alpha.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha-prerelease...v2.0.0-alpha.1) (2023-05-19)

### Bug Fixes

* **ci:** multiple bug fixes in weaver deployment workflows ([3e6d908](https://github.com/hyperledger/cacti/commit/3e6d908cb4cf732ef057a30df3e8267381f3f806))

# [2.0.0-alpha-prerelease](https://github.com/hyperledger/cacti/compare/v1.2.0...v2.0.0-alpha-prerelease) (2023-05-11)

### Bug Fixes

* **cactus-example-supply-chain-app:** mitigate CVE-2022-24434 and CVE-2022-24999 ([d28d5e8](https://github.com/hyperledger/cacti/commit/d28d5e8f3ed5dff1aa049c8f1bccce79aa21e948)), closes [#2041](https://github.com/hyperledger/cacti/issues/2041)
* **cmd-api-server:** mitigate CVE-2022-24434 and CVE-2022-24999 [#2039](https://github.com/hyperledger/cacti/issues/2039) ([1cc9667](https://github.com/hyperledger/cacti/commit/1cc9667e2432d1d27c2647b86e42707a2e78e4c3)), closes [#2241](https://github.com/hyperledger/cacti/issues/2241)
* **interopcc:** build failing after golang.org/x/crypto bump to v0.1.0 ([6b76f6a](https://github.com/hyperledger/cacti/commit/6b76f6a919689320a62fa2a89b5fc1a80c85e6c9))
* **iroha2-connector:** fix flaky tests to solve [#2370](https://github.com/hyperledger/cacti/issues/2370) and [#2373](https://github.com/hyperledger/cacti/issues/2373) ([669b51f](https://github.com/hyperledger/cacti/commit/669b51f188536fd5de0c970fcb4fca8fe1337b08))
* **keychain-memory-wasm:** wee_alloc is Unmaintained GHSA-rc23-xxgq-x27g ([89d5102](https://github.com/hyperledger/cacti/commit/89d5102496adfe98a542a373e805dc38ecb8f269)), closes [#2352](https://github.com/hyperledger/cacti/issues/2352)
* **relay:** rust build fails after tokio bump from 0.2.25 to 1.18.5 ([187f26e](https://github.com/hyperledger/cacti/commit/187f26e39d8dbbc7860fba13a0317ef842cadebe))
* **security:** upgrade express-jwt to v8.4.1 ([e251168](https://github.com/hyperledger/cacti/commit/e251168fb4067a8036a5168709e57154c0c02fe4)), closes [#2231](https://github.com/hyperledger/cacti/issues/2231)
* **security:** vulnerabilities found in fabric-all-in-one ([91c0187](https://github.com/hyperledger/cacti/commit/91c0187febf8532caf41b4a27c64adf14c1cb3cc)), closes [#2056](https://github.com/hyperledger/cacti/issues/2056)
* **security:** vulnerabilities found in quorum-multi-party-all-in-one ([59cc831](https://github.com/hyperledger/cacti/commit/59cc83198ee2f957644f224138fc10730e7b192c)), closes [#2060](https://github.com/hyperledger/cacti/issues/2060)
* **tools/quorum-all-in-one:** address CVE-2021-36159 and CVE-2022-28391 ([df6be48](https://github.com/hyperledger/cacti/commit/df6be489efa13901d0d83950e372725e16691564)), closes [ConsenSys/quorum#1513](https://github.com/ConsenSys/quorum/issues/1513) [#2059](https://github.com/hyperledger/cacti/issues/2059)
* **weaver:** address vulnerability CVE-2020-28477 and many others ([5fcfea3](https://github.com/hyperledger/cacti/commit/5fcfea35858ef0296dd26383481b39cb5634267d))
* **weaversdk:** ecies decrypt bug when z is less than 32Bytes ([b9066a9](https://github.com/hyperledger/cacti/commit/b9066a9c1bb5582d70cdfd701cae654853ca9c42))

### Features

* **cactus-plugin-persistence-ethereum:** add new persistence plugin ([617c4d3](https://github.com/hyperledger/cacti/commit/617c4d38981b450de3777dfe7d26fbc32219aca5)), closes [#2254](https://github.com/hyperledger/cacti/issues/2254) [#2256](https://github.com/hyperledger/cacti/issues/2256)
* **connector-go-ethereum:** add getBlock and ([3fa9093](https://github.com/hyperledger/cacti/commit/3fa909346074ed91175bfd4b9c81023fa77a6678)), closes [#2255](https://github.com/hyperledger/cacti/issues/2255)
* **driver:** added Monitor to fabric driver for missed events ([b6fa3ac](https://github.com/hyperledger/cacti/commit/b6fa3acee9ea8d93d452c62293b71838d11ac3bd))
* **relay:** configurable db_open retry mechanism added and in driver ([22ba550](https://github.com/hyperledger/cacti/commit/22ba550a96dace4d47a2e068572dea0ac81f860c))

# [1.2.0](https://github.com/hyperledger/cacti/compare/v1.1.3...v1.2.0) (2023-03-28)

### Bug Fixes

* broken links ([1e8d68e](https://github.com/hyperledger/cacti/commit/1e8d68e7c92ec974d7cab5b124b9410949a86712))
* cannot read config eslint-config-prettier/[@typescript-eslint](https://github.com/typescript-eslint).js ([6335787](https://github.com/hyperledger/cacti/commit/63357870004e5031c95d85663921ee15e3402339))
* corda simple app Readme, remove res-dlt-interop mention from fabric-cli ([1b90295](https://github.com/hyperledger/cacti/commit/1b9029585df4cf0fd51112e2b5520b311c6a1674))
* fabric-cli readme ([4f786a7](https://github.com/hyperledger/cacti/commit/4f786a7578764c8c057011f5d9303e18ab980fac))
* **git:** broken line endings corrupt git index after weaver merge ([3998ac3](https://github.com/hyperledger/cacti/commit/3998ac3f66dc7c6659583aed64690ebd8812bd7b)), closes [#2302](https://github.com/hyperledger/cacti/issues/2302)
* link in fabric cli readme ([e14ae88](https://github.com/hyperledger/cacti/commit/e14ae88341dbc5544568e5ac3ebe41568dae280c))
* logger bug ([122c203](https://github.com/hyperledger/cacti/commit/122c20382fe1ad46d74669d67f3fc5b71e970fbd))
* rename master to main; whitelist to allowlist ([81e2f9e](https://github.com/hyperledger/cacti/commit/81e2f9ee95f9a0d34090d32966a502018ccbe643))
* update ts version; besu-cli sdk imports; added packages test for besu asset exchange in workflow ([ca494b5](https://github.com/hyperledger/cacti/commit/ca494b52ac34e0e8785ca6231dd29695d7584818))
* workflow besu asset exchange ([2153df8](https://github.com/hyperledger/cacti/commit/2153df89de06f5a725889289254ddde235f1ab74))

### Features

* **connector-fabric:** add WatchBlocks endpoint ([6c62de4](https://github.com/hyperledger/cacti/commit/6c62de4dfb360536fc67a03cf10602e311c08a9d)), closes [#2118](https://github.com/hyperledger/cacti/issues/2118)
* connector-go-ethereum now can report empty blocks ([6dbe6b5](https://github.com/hyperledger/cacti/commit/6dbe6b54eaee156cd236ebbde4337b8599b05c08))
* **connector-iroha2:** add support for Iroha V2 ([db78969](https://github.com/hyperledger/cacti/commit/db789690b64d68b3dda70578127338bdc02e92bd)), closes [#2138](https://github.com/hyperledger/cacti/issues/2138) [#2140](https://github.com/hyperledger/cacti/issues/2140)
* **connector-ubiquity:** initial implementation ([7c59790](https://github.com/hyperledger/cacti/commit/7c597907910bd5cac919c855a3bfa9e533b6d5dd))
* **supabase-all-in-one:** add docker image for test supabase instance ([89dbcef](https://github.com/hyperledger/cacti/commit/89dbcef0ef6cbb33b831c0edf9ab65317ec15ff1)), closes [#2253](https://github.com/hyperledger/cacti/issues/2253)

### Reverts

* Revert "changing asset exchange interop cc as package" ([e9e4606](https://github.com/hyperledger/cacti/commit/e9e46063ab09a975e52487c0b39da35f7043b8a3))
* Revert "update simplestate to refer mocks go module" ([b7470ba](https://github.com/hyperledger/cacti/commit/b7470ba45474cb9472d0ddb7c345972d4dca817a))
* Revert "update simpleasset to refer to go modules" ([660248f](https://github.com/hyperledger/cacti/commit/660248f52ad5f861b76e634dab218ff98ceff0a7))
* Revert "update interfaces/asset-mgmt to refer to go modules" ([5f3a2f8](https://github.com/hyperledger/cacti/commit/5f3a2f8f400bdf9eaea231aae90f0cb2d1d950de))

## [1.1.3](https://github.com/hyperledger/cactus/compare/v1.1.2...v1.1.3) (2022-12-08)

### Bug Fixes

* **build:** sync-ts-config script needs import assertion of type json ([aa936ec](https://github.com/hyperledger/cactus/commit/aa936ec9e2c7b905c737c7721854c8b6bc305709)), closes [#2163](https://github.com/hyperledger/cactus/issues/2163)
* **connector-iroha:** fix review comments and smaller issues ([b2742e8](https://github.com/hyperledger/cactus/commit/b2742e8f6512f9804c6b4a943947b5bbe90785f0)), closes [PR#2048](https://github.com/PR/issues/2048)
* **odap-plugin:** fixes [#2198](https://github.com/hyperledger/cactus/issues/2198) - two gateways are using the same database ([9da24a0](https://github.com/hyperledger/cactus/commit/9da24a0ecd5e8682cbd6e6edbc349149b5d69d00))
* **plugin-ledger-connector-iroha:** running dockerfile locally ([f5faaab](https://github.com/hyperledger/cactus/commit/f5faaab75cecf22f588f0cdcb502952652fee058)), closes [#1874](https://github.com/hyperledger/cactus/issues/1874)
* **security:** vulnerabilities found in test-npm-registry ([4bbe012](https://github.com/hyperledger/cactus/commit/4bbe012d3db1f8264b19a2c822b45c72f46cb32c)), closes [#2061](https://github.com/hyperledger/cactus/issues/2061)
* **test-tooling:** substrate test ledger fails if WS_PORT not specified ([c668c41](https://github.com/hyperledger/cactus/commit/c668c41dcb4294530978e98349cd9158026d37e7)), closes [#2213](https://github.com/hyperledger/cactus/issues/2213)

### Features

* **cmd-socketio-server:** support multiple BLP in single server ([0f67085](https://github.com/hyperledger/cactus/commit/0f670855b0fa0fd33f71bf5a1814fb6fcac2c7b6)), closes [#2102](https://github.com/hyperledger/cactus/issues/2102) [#2030](https://github.com/hyperledger/cactus/issues/2030)
* **connector-iroha:** update-iroha-js ([74929b1](https://github.com/hyperledger/cactus/commit/74929b17869731adb67930429780cb5d33346d4a))
* **fabric-socketio-connector:** sending transactions signed on the client-side ([0b34ca3](https://github.com/hyperledger/cactus/commit/0b34ca3d35a39826c05cc047e480d377c1c52bef))
* **iroha2-ledger:** add Iroha V2 test ledger image and setup class ([6ff6aac](https://github.com/hyperledger/cactus/commit/6ff6aac7fff4669fca873ef40ae6b0818e70b5ec)), closes [#2138](https://github.com/hyperledger/cactus/issues/2138)
* monitoring, sync and async requests ([47da608](https://github.com/hyperledger/cactus/commit/47da608d378f5d48ca78b3d388b1c67da4c7aaf3)), closes [#1941](https://github.com/hyperledger/cactus/issues/1941)

## [1.1.2](https://github.com/hyperledger/cactus/compare/v1.1.1...v1.1.2) (2022-11-11)

**Note:** Version bump only for package @hyperledger/cactus

## [1.1.1](https://github.com/hyperledger/cactus/compare/v1.1.0...v1.1.1) (2022-11-03)

### Bug Fixes

* **plugin-keychain-vault:** hyper upgrade ([3062343](https://github.com/hyperledger/cactus/commit/3062343d47a492d6a15f7189a72e6ab3bb6a52f2)), closes [#2120](https://github.com/hyperledger/cactus/issues/2120)
* **security:** vulnerabilities found in besu-all-in-one [#2055](https://github.com/hyperledger/cactus/issues/2055) ([2ce098f](https://github.com/hyperledger/cactus/commit/2ce098f490c0e20c7f5d00a81e8fced1ec81341c))
* **tools:** ghcr-quorum-multi-party-all-in-one pip install ([5809fd8](https://github.com/hyperledger/cactus/commit/5809fd8fac06638220bbe12df4f3ff82d02ef0eb)), closes [#2183](https://github.com/hyperledger/cactus/issues/2183)

### Features

* **cbdc-bridging-app:** refactor ODAP plugin implementation ([6975fef](https://github.com/hyperledger/cactus/commit/6975fefd4994cc9c6dd7d649dc2d6400646a59ae))
* **connector-iroha:** add dynamic request params ([a1f908f](https://github.com/hyperledger/cactus/commit/a1f908f4c27b652a15896c9847aee97cc6ea11fd))

# [1.1.0](https://github.com/hyperledger/cactus/compare/v1.0.0...v1.1.0) (2022-10-17)

### Bug Fixes

* **api-server:** allow no authorization on socketio endpoints ([bf51960](https://github.com/hyperledger/cactus/commit/bf519608f39666e15cafd507c6defcfe956145a8)), closes [#1925](https://github.com/hyperledger/cactus/issues/1925)
* **cactus-example-discounted-asset-trade:** enable ([12e972e](https://github.com/hyperledger/cactus/commit/12e972e9cac63fd03a0ba3c7c8a29dc9ca544b9d)), closes [#2145](https://github.com/hyperledger/cactus/issues/2145)
* **cactus-example-electricity-trade:** enable tsconfig strict flag an… ([f7e726c](https://github.com/hyperledger/cactus/commit/f7e726c2720ed21bc4a582f6c4f345d0b2c65af7)), closes [#2144](https://github.com/hyperledger/cactus/issues/2144)
* **cactus-verifier-client:** update supported ledgers in readme ([84f3bae](https://github.com/hyperledger/cactus/commit/84f3bae982167d2d8c55ab44579f99dc5ee09c9f))
* custom-checks script from package.json does not work [#1809](https://github.com/hyperledger/cactus/issues/1809) ([dba3331](https://github.com/hyperledger/cactus/commit/dba33313c280ebf52117e18d2200c9abbfd4e694))
* **deps:** force minimist >=1.2.6 for CVE-2021-44906 ([b96806a](https://github.com/hyperledger/cactus/commit/b96806a0f30021eb39c47f7d9f54de8a16c5fb75)), closes [#1943](https://github.com/hyperledger/cactus/issues/1943)
* remove skip to pass test case ([99cb9a7](https://github.com/hyperledger/cactus/commit/99cb9a7fb22f112f32de333756f32ac13e588a54)), closes [#1957](https://github.com/hyperledger/cactus/issues/1957)
* resolve some CodeQL warnings ([824f5c8](https://github.com/hyperledger/cactus/commit/824f5c80ce5efbd9765699fdd635ab1d7f29cea2))
* **security:** address CVE-2017-16138 Fixes: [#1776](https://github.com/hyperledger/cactus/issues/1776) ([9f1d013](https://github.com/hyperledger/cactus/commit/9f1d01320cacf859bfd2e03426f85fb234f52dd8))
* **security:** address CVE-2021-23337 ([eccef40](https://github.com/hyperledger/cactus/commit/eccef405e5d6b33f3eebbb541eb07111c70301ed)), closes [#1778](https://github.com/hyperledger/cactus/issues/1778)
* **security:** address CVE-2021-23358 ([ed71f42](https://github.com/hyperledger/cactus/commit/ed71f42aca1683dd2fd6f762fbc6cd19b4c3c253)), closes [#1775](https://github.com/hyperledger/cactus/issues/1775)
* **security:** address CVE-2022-29244, CVE-2021-39135 ([7309f2a](https://github.com/hyperledger/cactus/commit/7309f2a8dc07d20fbffc9a2562f11e3140c8d79d)), closes [#2136](https://github.com/hyperledger/cactus/issues/2136)
* **security:** close DDoS vulnerability in eth tx consistenty strategy ([64b61a7](https://github.com/hyperledger/cactus/commit/64b61a742a885f0027543bc620b5db08b5444669)), closes [#2001](https://github.com/hyperledger/cactus/issues/2001)
* **security:** ensure node-forge > 1.3.0 for CVE-2022-24772 ([38fe287](https://github.com/hyperledger/cactus/commit/38fe287b958204d92a0353e369511120e38c625c)), closes [#1947](https://github.com/hyperledger/cactus/issues/1947)
* **security:** mitigate Cross-Site Scripting attack (XSS) ([2cb68c3](https://github.com/hyperledger/cactus/commit/2cb68c3e9899691b1e0abeb6993c37c97a61dcdb))

### Code Refactoring

* **examples:** include sample apps in monorepo build ([51ac163](https://github.com/hyperledger/cactus/commit/51ac1630f53ca3ac881341c7f8847b6ae581b220))

### Features

* add jwt authorization to supply chain example ([a4f07f6](https://github.com/hyperledger/cactus/commit/a4f07f6b1ea5b6cdd0397662cfbd9bb205a28bbe)), closes [#1579](https://github.com/hyperledger/cactus/issues/1579)
* **connector-fabric:** add GetBlock operation to fabric connectors ([00572ed](https://github.com/hyperledger/cactus/commit/00572edfafb82420f93570129e7e233a521f82e7)), closes [#2124](https://github.com/hyperledger/cactus/issues/2124)
* **connector-iroha:** sending transactions signed on the client-side ([da94cd6](https://github.com/hyperledger/cactus/commit/da94cd6b4fc5a364761716374ec7f6e7021bc76b))
* **corda4:** implement monitoring of state changes ([865ec2f](https://github.com/hyperledger/cactus/commit/865ec2f097df73e4907d812b18c2acf25e7896b1)), closes [#1610](https://github.com/hyperledger/cactus/issues/1610)
* **keychain-aws-sm:** bootstrap readme.md ([060f351](https://github.com/hyperledger/cactus/commit/060f3514a3dfaf19dab52345c0f0d2f80b12149c)), closes [#968](https://github.com/hyperledger/cactus/issues/968)
* **keychain-azure-kv:** complete request handler and endpoints ([932df10](https://github.com/hyperledger/cactus/commit/932df106734ec63146d1dc97d8db9c54d26086c6)), closes [#1010](https://github.com/hyperledger/cactus/issues/1010) [#1349](https://github.com/hyperledger/cactus/issues/1349)
* **odap-plugin:** addition of client endpoints ([cfa8db6](https://github.com/hyperledger/cactus/commit/cfa8db6c96e314bcefd6958b9823c4e0a5cf9620))
* **odap-plugin:** backup gateway implementation ([61da528](https://github.com/hyperledger/cactus/commit/61da5289cefe55527bf6ef3cd6204b6ae7002ce1))
* **odap-plugin:** odap crash recovery first implementation ([2e94ef8](https://github.com/hyperledger/cactus/commit/2e94ef8d3b34449c7b4d48e37d81245851477a3e))
* **quorum-connector:** implement validator interface on go-quorum-connector ([8d36bea](https://github.com/hyperledger/cactus/commit/8d36bea5146a544a2cb4615ec7291a1b425e568f)), closes [#1604](https://github.com/hyperledger/cactus/issues/1604)
* **sawtooth-ledger:** add single sawtooth test ledger image ([cd4c746](https://github.com/hyperledger/cactus/commit/cd4c7460f6e005ce56a0d79edea6f609756bf9d5)), closes [#2108](https://github.com/hyperledger/cactus/issues/2108) [#2030](https://github.com/hyperledger/cactus/issues/2030)
* **secret:** remove Validator/Verifier secret keys from repository ([59b4af4](https://github.com/hyperledger/cactus/commit/59b4af44835e2babafe398040a280ed23e9b490e))
* **socketio-server:** cross site scripting attack ([a5303ed](https://github.com/hyperledger/cactus/commit/a5303ed3a161477313646fc1f24220e53a20f7a4))
* **substrate-aio:** add ws-port argument ([fbb9859](https://github.com/hyperledger/cactus/commit/fbb9859584bdd5daf88424f3571ee4204a1e6ee3))

### BREAKING CHANGES

* **examples:** building discounted-asset-trade app (or any future app that use indy validator)
                 requires Indy SDK to be installed on the build machine.

Closes: 2029

Signed-off-by: Michal Bajer <michal.bajer@fujitsu.com>

# [1.0.0](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.3...v1.0.0) (2022-03-16)

### Bug Fixes

* 1852: slow breakpoints ([ff02ba1](https://github.com/hyperledger/cactus/commit/ff02ba19d6a28ca194db7eb7fe57ad01a2c0d38c)), closes [#1852](https://github.com/hyperledger/cactus/issues/1852)
* add optional auth token to api-client and consortium-manual ([c2feebf](https://github.com/hyperledger/cactus/commit/c2feebfec56f13d68c2ea1ec3a34ce67394d0720)), closes [#1579](https://github.com/hyperledger/cactus/issues/1579)
* **cmd-api-server:** add express static rate limiting ([190cf12](https://github.com/hyperledger/cactus/commit/190cf12f16345e06fbb6d1ccb428ad0ad8958a3e)), closes [#1840](https://github.com/hyperledger/cactus/issues/1840)
* **cmd-api-server:** disable validateKeyPairMatch ([7deaa22](https://github.com/hyperledger/cactus/commit/7deaa229ca0cdb4ef31fcc033ef08128fcb9e5b1))
* **cmd-api-server:** upgrade socket.io - CVE-2022-21676 ([8e1c69e](https://github.com/hyperledger/cactus/commit/8e1c69e7b8ab5e4ccc31a0ec183a9777ccc22cdc)), closes [#1914](https://github.com/hyperledger/cactus/issues/1914)
* config-service validator throws warnings ([877dcab](https://github.com/hyperledger/cactus/commit/877dcabc82dbc583f0d7e05813ce375c85b66f83))
* **connector-besu/quorum/xdai:** unvalidated dynamic method call ([bdc1aba](https://github.com/hyperledger/cactus/commit/bdc1aba982cc2ec1a74b0458c98ceeacc7acb9e7)), closes [#1911](https://github.com/hyperledger/cactus/issues/1911)
* **connector-fabric:** uncontrolled data used in path expression ([ef0981d](https://github.com/hyperledger/cactus/commit/ef0981d300d03fc5e5b1806f5e7355d0745700ce)), closes [#1909](https://github.com/hyperledger/cactus/issues/1909)
* **deps:** ensure glob-parent is above 5.1.2 - CVE-2020-28469 ([23ded0f](https://github.com/hyperledger/cactus/commit/23ded0f7095559796525bbebc45ae39e65306855)), closes [#1916](https://github.com/hyperledger/cactus/issues/1916)
* fix faulty shutdownHook definition in the Config-Schema ([fbae2da](https://github.com/hyperledger/cactus/commit/fbae2da4071ebbf40cc1941a1d2261b8b06fe8f0)), closes [#1648](https://github.com/hyperledger/cactus/issues/1648)
* **plugin-ledger-connector-fabric-socketio:** upgrade Fabric due to jsrsasign ([a9ecb19](https://github.com/hyperledger/cactus/commit/a9ecb192cb32661c5bdd9ea684f35a90c7948f6a)), closes [#1754](https://github.com/hyperledger/cactus/issues/1754) [#1799](https://github.com/hyperledger/cactus/issues/1799)
* **plugin-odap-hermes:** remove extraneous dependencies ([87af023](https://github.com/hyperledger/cactus/commit/87af02305be25cdb8afb7e1b7a2464bf36791b6e)), closes [#1641](https://github.com/hyperledger/cactus/issues/1641)
* remove jade dependencies ([f4ce09e](https://github.com/hyperledger/cactus/commit/f4ce09e8c07949aa08e4bfd404e4468e6c3544a8)), closes [#1662](https://github.com/hyperledger/cactus/issues/1662)
* reset script from package.json does not work [#1656](https://github.com/hyperledger/cactus/issues/1656) ([c74e002](https://github.com/hyperledger/cactus/commit/c74e002a636994bd1b864fa0bde495bfc5026f9f))
* **security:** address CVE-2019-5413 ([212b770](https://github.com/hyperledger/cactus/commit/212b770c705c279dcc766b7230d7519ed9a98748)), closes [#1777](https://github.com/hyperledger/cactus/issues/1777)
* **security:** address CVE-2021-23358 - TEMPORARY fix ([2fdee4f](https://github.com/hyperledger/cactus/commit/2fdee4fc4326bfb4821ba9c6ad750fa8ae6af3e6)), closes [#1775](https://github.com/hyperledger/cactus/issues/1775)
* **security:** ensure ansi-html > 0.0.8 - CVE-2021-23424 ([e3e2d1c](https://github.com/hyperledger/cactus/commit/e3e2d1cf3e5637212f56f278091e6eee77fbc9b2)), closes [#1920](https://github.com/hyperledger/cactus/issues/1920)
* **security:** force lodash > 4.17.20 - CVE-2020-8203 ([08ace66](https://github.com/hyperledger/cactus/commit/08ace6676cb5be5fa8a9d35e5e159d85eff7735f)), closes [#1918](https://github.com/hyperledger/cactus/issues/1918)
* **security:** upgrade to yarn > 1.22.0 - CVE-2019-10773, CVE-2020-8131 ([43d591d](https://github.com/hyperledger/cactus/commit/43d591d2eff576cb581a2a92d98edf7f4f6ecf13)), closes [#1922](https://github.com/hyperledger/cactus/issues/1922)
* **security:** upgrade web3 to upgrade elliptic > 6.5.4 ([5513848](https://github.com/hyperledger/cactus/commit/55138483e43dd840a6c3822d1ff8f2f7ce8c35e8)), closes [#1639](https://github.com/hyperledger/cactus/issues/1639)
* set apiServerOptions.configFile="" ([5c5a1e1](https://github.com/hyperledger/cactus/commit/5c5a1e16ad92a882b9e99f5413411b4cc7793be6)), closes [#1619](https://github.com/hyperledger/cactus/issues/1619)
* shutdown hook configuration is using wrong config key ([e760e04](https://github.com/hyperledger/cactus/commit/e760e04a9ba946b45b65c68455eedcc2694f8fae)), closes [#1619](https://github.com/hyperledger/cactus/issues/1619)

### Features

* **cactus-api-client:** add support for plain socketio validators in api-server and api-client ([634b10e](https://github.com/hyperledger/cactus/commit/634b10e5eaf82df08b04c11c3af5b109ede5b942)), closes [#1602](https://github.com/hyperledger/cactus/issues/1602) [#1602](https://github.com/hyperledger/cactus/issues/1602)
* **cactus-api-client:** common verifier-factory ([2f70a64](https://github.com/hyperledger/cactus/commit/2f70a6473f30446859427335f2d3602bddca636d)), closes [#1878](https://github.com/hyperledger/cactus/issues/1878)
* **connector-corda:** enable Flow Database Access CorDapp ([60dfe1a](https://github.com/hyperledger/cactus/commit/60dfe1a772d06436132f79bf3e89589e181a783e)), closes [#1493](https://github.com/hyperledger/cactus/issues/1493)
* **connector-corda:** read privateKey from filesystem ([e7e39fd](https://github.com/hyperledger/cactus/commit/e7e39fd5f7ef2d6ec49b4ebebde35875bbf1df44)), closes [#789](https://github.com/hyperledger/cactus/issues/789)
* **connector-xdai:** remove hard dependency on keychain ([da793c5](https://github.com/hyperledger/cactus/commit/da793c568260fd70b80f855833bc60c116099a65)), closes [#1162](https://github.com/hyperledger/cactus/issues/1162)
* **core-api:** add weaver protobuf codegen  [#1556](https://github.com/hyperledger/cactus/issues/1556) ([b5b68a7](https://github.com/hyperledger/cactus/commit/b5b68a76e256555ef362dceaa834d8bbcdcfff06))

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
