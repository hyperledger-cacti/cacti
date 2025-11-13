# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.1.0](https://github.com/hyperledger/cacti/compare/v2.0.0...v2.1.0) (2024-12-01)

**Note:** Version bump only for package @hyperledger/cactus-cmd-api-server

# [2.0.0](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.7...v2.0.0) (2024-10-15)

**Note:** Version bump only for package @hyperledger/cactus-cmd-api-server

# [2.0.0-rc.6](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.5...v2.0.0-rc.6) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cactus-cmd-api-server

# [2.0.0-rc.5](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.4...v2.0.0-rc.5) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cactus-cmd-api-server

# [2.0.0-rc.4](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.3...v2.0.0-rc.4) (2024-09-08)

### Bug Fixes

* **security:** address CVE-2024-39338 SSRF in axios >= 1.3.2, <= 1.7.3 ([7e7bb44](https://github.com/hyperledger/cacti/commit/7e7bb44c01a2d19306ecaaaa2ba2e3c574039c87))

# [2.0.0-rc.3](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.2...v2.0.0-rc.3) (2024-07-21)

### Bug Fixes

* address CVE-2022-24434, GHSA-wm7h-9275-46v2 caused by dicer ([6ff8111](https://github.com/hyperledger/cacti/commit/6ff8111c2534f71a5f623433eba59a610d84f4eb))
* **cmd-api-server:** use ncc bundle in container image - CVE-2024-29415 ([9eefa66](https://github.com/hyperledger/cacti/commit/9eefa66446a193c7ca164c876f8ed6d5cc56549b))

### Build System

* bump uuid@10.0.0 fs-extra@11.2.0 @bufbuild/protobuf@1.10.0 ([9970352](https://github.com/hyperledger/cacti/commit/997035216694fe335215b8a3586488ac8c12447f))

### BREAKING CHANGES

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

* **cmd-api-server:** shutdown hook was not waiting for promises ([d14bf02](https://github.com/hyperledger/cacti/commit/d14bf02aed215eeecdba258bb48a330da3fc2c36))
* **cmd-api-server:** stop changing LoggerProvider log level ([6ef514c](https://github.com/hyperledger/cacti/commit/6ef514cc01eda2640ed144bdd4750dbcb1e35e27))
* **deps:** fix batch of missing production dependencies v2.0.0-rc.1 ([51d64ee](https://github.com/hyperledger/cacti/commit/51d64eead473d928086eb53adf0850c3b43cbda9)), closes [#3344](https://github.com/hyperledger/cacti/issues/3344)

# [2.0.0-rc.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.2...v2.0.0-rc.1) (2024-06-14)

### Bug Fixes

* **cmd-api-server:** add runtime type validation to HTTP verbs pulled from OAS ([b0ff599](https://github.com/hyperledger/cacti/commit/b0ff599b2c32b83d7d45c41ef215372044ccda23)), closes [#2751](https://github.com/hyperledger/cacti/issues/2751) [#2751](https://github.com/hyperledger/cacti/issues/2751) [#2751](https://github.com/hyperledger/cacti/issues/2751) [#2754](https://github.com/hyperledger/cacti/issues/2754)
* **cmd-api-server:** address CVE-2022-25881 ([81da333](https://github.com/hyperledger/cacti/commit/81da3334d8e638f85e398dd228bcef836a278230)), closes [#2862](https://github.com/hyperledger/cacti/issues/2862)
* **cmd-api-server:** healthcheck broken due to missing wget binary ([8f1ca3f](https://github.com/hyperledger/cacti/commit/8f1ca3fcce9fedaedd4ceafbb51d8e8cd41cc50e)), closes [#2894](https://github.com/hyperledger/cacti/issues/2894)
* **security:** address CVE-2021-3749 - axios >=0.22.0 ([61fc700](https://github.com/hyperledger/cacti/commit/61fc7001b1dd0849ab1d9bcab08e2475c695adae))
* **security:** remediate qs vulnerability CVE-2022-24999 ([536b6b1](https://github.com/hyperledger/cacti/commit/536b6b1b7ab9014ebcd6b162e1a467e78b52afdd))

### Features

* **cactus-plugin-ledger-connector-ethereum:** update web3js to 4.X ([55f82c9](https://github.com/hyperledger/cacti/commit/55f82c9568b3e875de4f3ceb89a828f8b23d65be)), closes [#2580](https://github.com/hyperledger/cacti/issues/2580) [#2535](https://github.com/hyperledger/cacti/issues/2535) [#2578](https://github.com/hyperledger/cacti/issues/2578)
* **cmd-api-server:** add ConnectRPC auto-registration for plugins ([c569460](https://github.com/hyperledger/cacti/commit/c569460b099469184a7953ffc0f806ddf3facb38))
* **cmd-api-server:** add gRPC plugin auto-registration support ([5762dad](https://github.com/hyperledger/cacti/commit/5762dadfe108c6c73251d5b474961e4888941b90))

### Performance Improvements

* **cmd-api-server:** add demonstration of continuous benchmarking ([0804bab](https://github.com/hyperledger/cacti/commit/0804bab4c9b43f2e22be6d77be127415a9a0532f))

# [2.0.0-alpha.2](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2023-09-27)

### Bug Fixes

* **cmd-api-server:** fix CVE-2023-36665 protobufjs Prototype Pollution vuln ([7bb3957](https://github.com/hyperledger/cacti/commit/7bb39576080592919bea0ac89646b32105e1748e)), closes [#2682](https://github.com/hyperledger/cacti/issues/2682)
* **security:** crash in HeaderParser in dicer ([77fb559](https://github.com/hyperledger/cacti/commit/77fb559532448aae45cfe704da2637119bf93c27))
* **security:** the CVE-2022-2421 - upgrade socket.io-parser to >=4.2.1 ([9172172](https://github.com/hyperledger/cacti/commit/917217227a3fa53a00429f047cd6318862e6ab8d)), closes [#2229](https://github.com/hyperledger/cacti/issues/2229) [#2228](https://github.com/hyperledger/cacti/issues/2228)
* use common conventions: tsconfig.json, package.json ([50f5c02](https://github.com/hyperledger/cacti/commit/50f5c02190ba28b77492c09e81f5d5ba6578e862)), closes [#2216](https://github.com/hyperledger/cacti/issues/2216)

### Code Refactoring

* **cmd-api-server:** clean up configuration parameters [#720](https://github.com/hyperledger/cacti/issues/720) ([b8e8388](https://github.com/hyperledger/cacti/commit/b8e8388306b6708c7d3156e005b1ee9693b35a22))

### Features

* **cactus-common:** add createRuntimeErrorWithCause() & newRex() ([b3a508c](https://github.com/hyperledger/cacti/commit/b3a508c9a080e00a5e39ffa352a38e785b8cea9c)), closes [#1702](https://github.com/hyperledger/cacti/issues/1702)
* **cmd-api-server:** add GetOpenApiSpecV1Endpoint (HTTP GET) ([aeebbd4](https://github.com/hyperledger/cacti/commit/aeebbd4d86cb62f8d1d53fded65ae40eb5e27910))
* **openapi:** upgrade to 6.3.0 phase1 ([a094614](https://github.com/hyperledger/cacti/commit/a094614877d6043a6e3e8c0b3e95203eed7d6203)), closes [#2298](https://github.com/hyperledger/cacti/issues/2298)

### BREAKING CHANGES

* **cmd-api-server:** Removed the `keyPairPem` parameter from the API server
configuration.

# [2.0.0-alpha.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha-prerelease...v2.0.0-alpha.1) (2023-05-19)

**Note:** Version bump only for package @hyperledger/cactus-cmd-api-server

# [2.0.0-alpha-prerelease](https://github.com/hyperledger/cacti/compare/v1.2.0...v2.0.0-alpha-prerelease) (2023-05-11)

### Bug Fixes

* **cactus-example-supply-chain-app:** mitigate CVE-2022-24434 and CVE-2022-24999 ([d28d5e8](https://github.com/hyperledger/cactus/commit/d28d5e8f3ed5dff1aa049c8f1bccce79aa21e948)), closes [#2041](https://github.com/hyperledger/cactus/issues/2041)
* **security:** upgrade express-jwt to v8.4.1 ([e251168](https://github.com/hyperledger/cactus/commit/e251168fb4067a8036a5168709e57154c0c02fe4)), closes [#2231](https://github.com/hyperledger/cactus/issues/2231)

# [1.2.0](https://github.com/hyperledger/cactus/compare/v1.1.3...v1.2.0) (2023-03-28)

**Note:** Version bump only for package @hyperledger/cactus-cmd-api-server

## [1.1.3](https://github.com/hyperledger/cactus/compare/v1.1.2...v1.1.3) (2022-12-08)

### Bug Fixes

* **plugin-ledger-connector-iroha:** running dockerfile locally ([f5faaab](https://github.com/hyperledger/cactus/commit/f5faaab75cecf22f588f0cdcb502952652fee058)), closes [#1874](https://github.com/hyperledger/cactus/issues/1874)

## [1.1.2](https://github.com/hyperledger/cactus/compare/v1.1.1...v1.1.2) (2022-11-11)

**Note:** Version bump only for package @hyperledger/cactus-cmd-api-server

## [1.1.1](https://github.com/hyperledger/cactus/compare/v1.1.0...v1.1.1) (2022-11-03)

**Note:** Version bump only for package @hyperledger/cactus-cmd-api-server

# [1.1.0](https://github.com/hyperledger/cactus/compare/v1.0.0...v1.1.0) (2022-10-17)

### Bug Fixes

* **api-server:** allow no authorization on socketio endpoints ([bf51960](https://github.com/hyperledger/cactus/commit/bf519608f39666e15cafd507c6defcfe956145a8)), closes [#1925](https://github.com/hyperledger/cactus/issues/1925)
* **security:** address CVE-2022-29244, CVE-2021-39135 ([7309f2a](https://github.com/hyperledger/cactus/commit/7309f2a8dc07d20fbffc9a2562f11e3140c8d79d)), closes [#2136](https://github.com/hyperledger/cactus/issues/2136)
* **security:** ensure node-forge > 1.3.0 for CVE-2022-24772 ([38fe287](https://github.com/hyperledger/cactus/commit/38fe287b958204d92a0353e369511120e38c625c)), closes [#1947](https://github.com/hyperledger/cactus/issues/1947)

### Code Refactoring

* **examples:** include sample apps in monorepo build ([51ac163](https://github.com/hyperledger/cactus/commit/51ac1630f53ca3ac881341c7f8847b6ae581b220))

### Features

* **secret:** remove Validator/Verifier secret keys from repository ([59b4af4](https://github.com/hyperledger/cactus/commit/59b4af44835e2babafe398040a280ed23e9b490e))

### BREAKING CHANGES

* **examples:** building discounted-asset-trade app (or any future app that use indy validator)
                 requires Indy SDK to be installed on the build machine.

Closes: 2029

Signed-off-by: Michal Bajer <michal.bajer@fujitsu.com>

# [1.0.0](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.3...v1.0.0) (2022-03-16)

### Bug Fixes

* **cmd-api-server:** add express static rate limiting ([190cf12](https://github.com/hyperledger/cactus/commit/190cf12f16345e06fbb6d1ccb428ad0ad8958a3e)), closes [#1840](https://github.com/hyperledger/cactus/issues/1840)
* **cmd-api-server:** disable validateKeyPairMatch ([7deaa22](https://github.com/hyperledger/cactus/commit/7deaa229ca0cdb4ef31fcc033ef08128fcb9e5b1))
* **cmd-api-server:** upgrade socket.io - CVE-2022-21676 ([8e1c69e](https://github.com/hyperledger/cactus/commit/8e1c69e7b8ab5e4ccc31a0ec183a9777ccc22cdc)), closes [#1914](https://github.com/hyperledger/cactus/issues/1914)
* config-service validator throws warnings ([877dcab](https://github.com/hyperledger/cactus/commit/877dcabc82dbc583f0d7e05813ce375c85b66f83))
* fix faulty shutdownHook definition in the Config-Schema ([fbae2da](https://github.com/hyperledger/cactus/commit/fbae2da4071ebbf40cc1941a1d2261b8b06fe8f0)), closes [#1648](https://github.com/hyperledger/cactus/issues/1648)
* **security:** upgrade to yarn > 1.22.0 - CVE-2019-10773, CVE-2020-8131 ([43d591d](https://github.com/hyperledger/cactus/commit/43d591d2eff576cb581a2a92d98edf7f4f6ecf13)), closes [#1922](https://github.com/hyperledger/cactus/issues/1922)
* set apiServerOptions.configFile="" ([5c5a1e1](https://github.com/hyperledger/cactus/commit/5c5a1e16ad92a882b9e99f5413411b4cc7793be6)), closes [#1619](https://github.com/hyperledger/cactus/issues/1619)
* shutdown hook configuration is using wrong config key ([e760e04](https://github.com/hyperledger/cactus/commit/e760e04a9ba946b45b65c68455eedcc2694f8fae)), closes [#1619](https://github.com/hyperledger/cactus/issues/1619)

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
