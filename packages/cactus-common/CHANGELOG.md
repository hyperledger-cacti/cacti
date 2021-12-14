# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
