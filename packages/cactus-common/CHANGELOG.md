# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.1.0](https://github.com/hyperledger/cacti/compare/v2.0.0...v2.1.0) (2024-12-01)

### Bug Fixes

* **connector-besu:** do not crash if ledger unreachable - send HTTP 503 ([394323e](https://github.com/hyperledger/cacti/commit/394323e91e3bd0df57c87d6bae406298c559fc7f))

# [2.0.0](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.7...v2.0.0) (2024-10-15)

**Note:** Version bump only for package @hyperledger/cactus-common

# [2.0.0-rc.6](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.5...v2.0.0-rc.6) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cactus-common

# [2.0.0-rc.5](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.4...v2.0.0-rc.5) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cactus-common

# [2.0.0-rc.4](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.3...v2.0.0-rc.4) (2024-09-08)

**Note:** Version bump only for package @hyperledger/cactus-common

# [2.0.0-rc.3](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.2...v2.0.0-rc.3) (2024-07-21)

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

**Note:** Version bump only for package @hyperledger/cactus-common

# [2.0.0-rc.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.2...v2.0.0-rc.1) (2024-06-14)

### Bug Fixes

* **cactus-common:** coerceUnknownToError() now uses HTML sanitize ([d70488a](https://github.com/hyperledger/cacti/commit/d70488a82e9c1d6958ac3ab0368f3c3bfca378c6))
* **deps:** bulk add missing dependencies - 2023-11-02 ([8addb01](https://github.com/hyperledger/cacti/commit/8addb018b6d124d54d9d948bbaeba6ea33b67153)), closes [#2857](https://github.com/hyperledger/cacti/issues/2857)

### Features

* **bungee-hermes:** process & merge views ([231a5e5](https://github.com/hyperledger/cacti/commit/231a5e532bcb8219986dd7f5c8fa4d66cef99f34))
* **cactus-example-electricity-trade:** use openapi ethereum connector ([9e66850](https://github.com/hyperledger/cacti/commit/9e66850438c97883a8999c3def36e807bfbb1a76))
* **cactus-plugin-ledger-connector-ethereum:** add stress test ([55fa26e](https://github.com/hyperledger/cacti/commit/55fa26ef41d405b26da02b099418da5fa281c78f)), closes [#2631](https://github.com/hyperledger/cacti/issues/2631)
* **cactus-plugin-ledger-connector-ethereum:** refactor connector API ([cda279f](https://github.com/hyperledger/cacti/commit/cda279fb0009a4d5756c461024ad88f525bfe946)), closes [#2630](https://github.com/hyperledger/cacti/issues/2630)
* **common:** add express http verb method name string literal type ([8f048ea](https://github.com/hyperledger/cacti/commit/8f048ea72750595016eea4e40fd57291001cff95))
* **common:** add isGrpcStatusObjectWithCode user-defined type guard ([941dbad](https://github.com/hyperledger/cacti/commit/941dbad8fa5950b754dde97b02cc4c0ac0e9e0bb))

# [2.0.0-alpha.2](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2023-09-27)

### Bug Fixes

* use common conventions: tsconfig.json, package.json ([50f5c02](https://github.com/hyperledger/cacti/commit/50f5c02190ba28b77492c09e81f5d5ba6578e862)), closes [#2216](https://github.com/hyperledger/cacti/issues/2216)

### Features

* **cactus-common:** add createRuntimeErrorWithCause() & newRex() ([b3a508c](https://github.com/hyperledger/cacti/commit/b3a508c9a080e00a5e39ffa352a38e785b8cea9c)), closes [#1702](https://github.com/hyperledger/cacti/issues/1702)

# [2.0.0-alpha.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha-prerelease...v2.0.0-alpha.1) (2023-05-19)

**Note:** Version bump only for package @hyperledger/cactus-common

# [2.0.0-alpha-prerelease](https://github.com/hyperledger/cacti/compare/v1.2.0...v2.0.0-alpha-prerelease) (2023-05-11)

### Bug Fixes

* **security:** upgrade express-jwt to v8.4.1 ([e251168](https://github.com/hyperledger/cactus/commit/e251168fb4067a8036a5168709e57154c0c02fe4)), closes [#2231](https://github.com/hyperledger/cactus/issues/2231)

# [1.2.0](https://github.com/hyperledger/cactus/compare/v1.1.3...v1.2.0) (2023-03-28)

**Note:** Version bump only for package @hyperledger/cactus-common

## [1.1.3](https://github.com/hyperledger/cactus/compare/v1.1.2...v1.1.3) (2022-12-08)

**Note:** Version bump only for package @hyperledger/cactus-common

## [1.1.2](https://github.com/hyperledger/cactus/compare/v1.1.1...v1.1.2) (2022-11-11)

**Note:** Version bump only for package @hyperledger/cactus-common

## [1.1.1](https://github.com/hyperledger/cactus/compare/v1.1.0...v1.1.1) (2022-11-03)

**Note:** Version bump only for package @hyperledger/cactus-common

# [1.1.0](https://github.com/hyperledger/cactus/compare/v1.0.0...v1.1.0) (2022-10-17)

**Note:** Version bump only for package @hyperledger/cactus-common

# [1.0.0](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.3...v1.0.0) (2022-03-16)

**Note:** Version bump only for package @hyperledger/cactus-common

# [1.0.0-rc.3](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2021-12-07)

**Note:** Version bump only for package @hyperledger/cactus-common

# [1.0.0-rc.2](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2021-11-01)

### Features

* **common:** add Strings#isNonBlank() ([8d7d247](https://github.com/hyperledger/cactus/commit/8d7d2473d749746e38931e27c8044889b0ce3394))

# [1.0.0-rc.1](https://github.com/hyperledger/cactus/compare/v0.10.0...v1.0.0-rc.1) (2021-10-11)

### Bug Fixes

* **webpack:** prod build chokes on upgraded ssh2 binaries [#1405](https://github.com/hyperledger/cactus/issues/1405) ([18979fb](https://github.com/hyperledger/cactus/commit/18979fb33880d8ca30e2fda01fb3d598deb839f9))

# [0.10.0](https://github.com/hyperledger/cactus/compare/v0.9.0...v0.10.0) (2021-09-28)

**Note:** Version bump only for package @hyperledger/cactus-common

# [0.9.0](https://github.com/hyperledger/cactus/compare/v0.8.0...v0.9.0) (2021-08-31)

### Features

* **connector-iroha:** adds connector plugin ([4745df0](https://github.com/hyperledger/cactus/commit/4745df0bee6b9ab5fb9e57bb603ae95d6baeb391))

# [0.8.0](https://github.com/hyperledger/cactus/compare/v0.7.0...v0.8.0) (2021-08-17)

**Note:** Version bump only for package @hyperledger/cactus-common

# [0.7.0](https://github.com/hyperledger/cactus/compare/v0.6.0...v0.7.0) (2021-08-04)

**Note:** Version bump only for package @hyperledger/cactus-common

# [0.6.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.6.0) (2021-07-19)

### Bug Fixes

* **deps:** elliptic upgrade to >6.5.3 for CVE-2020-28498 ([d75b9af](https://github.com/hyperledger/cactus/commit/d75b9af764241ab2e10914769412201fb040b1ed))

# [0.5.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.5.0) (2021-05-19)

### Bug Fixes

* **deps:** elliptic upgrade to >6.5.3 for CVE-2020-28498 ([d75b9af](https://github.com/hyperledger/cactus/commit/d75b9af764241ab2e10914769412201fb040b1ed))

# [0.4.0](https://github.com/hyperledger/cactus/compare/v0.3.0...v0.4.0) (2021-03-30)

### Bug Fixes

* **common:** servers.listen() port validation ([cd50124](https://github.com/hyperledger/cactus/commit/cd50124728fa6711bc1a1b7501964bb9b1727bcc)), closes [#491](https://github.com/hyperledger/cactus/issues/491)
* **common:** servers#startOnPreferredPort no graceful fallback [#683](https://github.com/hyperledger/cactus/issues/683) ([18f5af7](https://github.com/hyperledger/cactus/commit/18f5af756e1fcbcd55f0ade76ebcdcda77f443da))
* **general:** fixed unused deps and updated them ([b76a970](https://github.com/hyperledger/cactus/commit/b76a9703341c5a4cabe056e743338cbedebbeaad))

### Features

* **common:** servers.startOnPort() host arg [#527](https://github.com/hyperledger/cactus/issues/527) ([febc06f](https://github.com/hyperledger/cactus/commit/febc06f4baf6f1baf9bb4232c2ba700e8cce822d))

# [0.3.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.3.0) (2021-01-06)

### Bug Fixes

* **common:** flaky KeyConverter unit tests ([43ec924](https://github.com/hyperledger/cactus/commit/43ec924875f161bb1308dca84a4f16d116212266)), closes [#299](https://github.com/hyperledger/cactus/issues/299) [/github.com/hyperledger/cactus/issues/299#issuecomment-720743950](https://github.com//github.com/hyperledger/cactus/issues/299/issues/issuecomment-720743950) [#238](https://github.com/hyperledger/cactus/issues/238)
* **common:** servers.startOnPort() error handling ([51af78d](https://github.com/hyperledger/cactus/commit/51af78dbb6273b4ef4ee26147469fb3599391bb5)), closes [#317](https://github.com/hyperledger/cactus/issues/317)
* **common:** servers#listen() port number validation ([ee28b50](https://github.com/hyperledger/cactus/commit/ee28b50f47a4e94937a29b1a7c843cc56c203329)), closes [#383](https://github.com/hyperledger/cactus/issues/383)

### Features

* **cactus-common:** add Objects utility class to get owned and inherited methods of class instance ([2299cff](https://github.com/hyperledger/cactus/commit/2299cff9931996a979b9b1e0ddb492843de916c0))
* **common:** add Checks#nonBlankString() utility ([c21c873](https://github.com/hyperledger/cactus/commit/c21c873917879839c49d7b69860a988a91802754))
* **common:** add IAsyncProvider interface definition ([81ec545](https://github.com/hyperledger/cactus/commit/81ec545701409fa626ce82d4e8513e0d78db9e30))
* **common:** add OpenAPI spec exporter utility function ([6d2e93c](https://github.com/hyperledger/cactus/commit/6d2e93cbace0951ae37db79ffa1b664b2623104a))
* **common:** add Servers.startOnPreferredPort(), Servers.startOnPort() ([3efb118](https://github.com/hyperledger/cactus/commit/3efb118ace474d23635d34b7b9f5184bb4848fa4))
* **common:** add utility class Strings with replaceAll ([3986aed](https://github.com/hyperledger/cactus/commit/3986aedc586854cafc7bc8072fa7d71344a1efb1))
* **common:** Checks and CodedError classes ([c65baf8](https://github.com/hyperledger/cactus/commit/c65baf88749166ba8d0c970760c8aab172a83a1a)), closes [#266](https://github.com/hyperledger/cactus/issues/266)
* **common:** KeyConverter class to and from PEM/hex/buffe ([fc80106](https://github.com/hyperledger/cactus/commit/fc80106f87b66e935b40a450470262713db2f1d5))
* **common:** Servers utility class ([ad01dee](https://github.com/hyperledger/cactus/commit/ad01dee4def65f47e6292d117eaece2b2ebc1c3c)), closes [#260](https://github.com/hyperledger/cactus/issues/260) [#267](https://github.com/hyperledger/cactus/issues/267)
* **common:** Stable Signature Generation from JS Objects ([22b5f5c](https://github.com/hyperledger/cactus/commit/22b5f5ce05a82b80e067da327b47331ed34e289e))

# [0.2.0](https://github.com/hyperledger/cactus/compare/v0.1.0...v0.2.0) (2020-12-01)

### Bug Fixes

* **common:** flaky KeyConverter unit tests ([43ec924](https://github.com/hyperledger/cactus/commit/43ec924875f161bb1308dca84a4f16d116212266)), closes [#299](https://github.com/hyperledger/cactus/issues/299) [/github.com/hyperledger/cactus/issues/299#issuecomment-720743950](https://github.com//github.com/hyperledger/cactus/issues/299/issues/issuecomment-720743950) [#238](https://github.com/hyperledger/cactus/issues/238)
* **common:** servers.startOnPort() error handling ([51af78d](https://github.com/hyperledger/cactus/commit/51af78dbb6273b4ef4ee26147469fb3599391bb5)), closes [#317](https://github.com/hyperledger/cactus/issues/317)

### Features

* **cactus-common:** add Objects utility class to get owned and inherited methods of class instance ([2299cff](https://github.com/hyperledger/cactus/commit/2299cff9931996a979b9b1e0ddb492843de916c0))
* **common:** add Checks#nonBlankString() utility ([c21c873](https://github.com/hyperledger/cactus/commit/c21c873917879839c49d7b69860a988a91802754))
* **common:** add IAsyncProvider interface definition ([81ec545](https://github.com/hyperledger/cactus/commit/81ec545701409fa626ce82d4e8513e0d78db9e30))
* **common:** add OpenAPI spec exporter utility function ([6d2e93c](https://github.com/hyperledger/cactus/commit/6d2e93cbace0951ae37db79ffa1b664b2623104a))
* **common:** add Servers.startOnPreferredPort(), Servers.startOnPort() ([3efb118](https://github.com/hyperledger/cactus/commit/3efb118ace474d23635d34b7b9f5184bb4848fa4))
* **common:** add utility class Strings with replaceAll ([3986aed](https://github.com/hyperledger/cactus/commit/3986aedc586854cafc7bc8072fa7d71344a1efb1))
* **common:** Checks and CodedError classes ([c65baf8](https://github.com/hyperledger/cactus/commit/c65baf88749166ba8d0c970760c8aab172a83a1a)), closes [#266](https://github.com/hyperledger/cactus/issues/266)
* **common:** KeyConverter class to and from PEM/hex/buffe ([fc80106](https://github.com/hyperledger/cactus/commit/fc80106f87b66e935b40a450470262713db2f1d5))
* **common:** Servers utility class ([ad01dee](https://github.com/hyperledger/cactus/commit/ad01dee4def65f47e6292d117eaece2b2ebc1c3c)), closes [#260](https://github.com/hyperledger/cactus/issues/260) [#267](https://github.com/hyperledger/cactus/issues/267)
* **common:** Stable Signature Generation from JS Objects ([22b5f5c](https://github.com/hyperledger/cactus/commit/22b5f5ce05a82b80e067da327b47331ed34e289e))
