# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.0.0-alpha.2](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2023-09-27)

### Bug Fixes

* **security:** crash in HeaderParser in dicer ([77fb559](https://github.com/hyperledger/cacti/commit/77fb559532448aae45cfe704da2637119bf93c27))
* use common conventions: tsconfig.json, package.json ([50f5c02](https://github.com/hyperledger/cacti/commit/50f5c02190ba28b77492c09e81f5d5ba6578e862)), closes [#2216](https://github.com/hyperledger/cacti/issues/2216)

### Features

* **openapi:** upgrade to 6.3.0 phase1 ([a094614](https://github.com/hyperledger/cacti/commit/a094614877d6043a6e3e8c0b3e95203eed7d6203)), closes [#2298](https://github.com/hyperledger/cacti/issues/2298)

# [2.0.0-alpha.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha-prerelease...v2.0.0-alpha.1) (2023-05-19)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-aws-sm

# [2.0.0-alpha-prerelease](https://github.com/hyperledger/cacti/compare/v1.2.0...v2.0.0-alpha-prerelease) (2023-05-11)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-aws-sm

# [1.2.0](https://github.com/hyperledger/cactus/compare/v1.1.3...v1.2.0) (2023-03-28)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-aws-sm

## [1.1.3](https://github.com/hyperledger/cactus/compare/v1.1.2...v1.1.3) (2022-12-08)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-aws-sm

## [1.1.2](https://github.com/hyperledger/cactus/compare/v1.1.1...v1.1.2) (2022-11-11)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-aws-sm

## [1.1.1](https://github.com/hyperledger/cactus/compare/v1.1.0...v1.1.1) (2022-11-03)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-aws-sm

# [1.1.0](https://github.com/hyperledger/cactus/compare/v1.0.0...v1.1.0) (2022-10-17)

### Features

* **keychain-aws-sm:** bootstrap readme.md ([060f351](https://github.com/hyperledger/cactus/commit/060f3514a3dfaf19dab52345c0f0d2f80b12149c)), closes [#968](https://github.com/hyperledger/cactus/issues/968)

# [1.0.0](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.3...v1.0.0) (2022-03-16)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-aws-sm

# [1.0.0-rc.3](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2021-12-07)

### Bug Fixes

* openapi validation for keychain-aws-sm plugin ([b270d28](https://github.com/hyperledger/cactus/commit/b270d2891d88149caa3de66096e727e82df0233e)), closes [#847](https://github.com/hyperledger/cactus/issues/847)

# [1.0.0-rc.2](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2021-11-01)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-aws-sm

# [1.0.0-rc.1](https://github.com/hyperledger/cactus/compare/v0.10.0...v1.0.0-rc.1) (2021-10-11)

### Bug Fixes

* **webpack:** prod build chokes on upgraded ssh2 binaries [#1405](https://github.com/hyperledger/cactus/issues/1405) ([18979fb](https://github.com/hyperledger/cactus/commit/18979fb33880d8ca30e2fda01fb3d598deb839f9))

### Features

* **keychain-aws-sm:** complete request handler and endpoint ([e6099b8](https://github.com/hyperledger/cactus/commit/e6099b86152a35ac7a21aecc02824410c05eac88)), closes [#967](https://github.com/hyperledger/cactus/issues/967) [#1349](https://github.com/hyperledger/cactus/issues/1349)

# [0.10.0](https://github.com/hyperledger/cactus/compare/v0.9.0...v0.10.0) (2021-09-28)

### Features

* **core-api:** discontinue dedicated HTTP listeners for web service plugins ([3fbd2fc](https://github.com/hyperledger/cactus/commit/3fbd2fcb60d49090bf4e986bea74d4e988348659)), closes [#358](https://github.com/hyperledger/cactus/issues/358)
* **core:** add installOpenapiValidationMiddleware ([1f6ea5f](https://github.com/hyperledger/cactus/commit/1f6ea5fe3aa1ba997a655098d632034f13f232a5)), closes [#847](https://github.com/hyperledger/cactus/issues/847)

# [0.9.0](https://github.com/hyperledger/cactus/compare/v0.8.0...v0.9.0) (2021-08-31)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-aws-sm

# [0.8.0](https://github.com/hyperledger/cactus/compare/v0.7.0...v0.8.0) (2021-08-17)

**Note:** Version bump only for package @hyperledger/cactus-plugin-keychain-aws-sm

# [0.7.0](https://github.com/hyperledger/cactus/compare/v0.6.0...v0.7.0) (2021-08-04)

### Features

* **aws-sm:** added keychain plugin for aws secret manager ([ed6db9e](https://github.com/hyperledger/cactus/commit/ed6db9edc2064046308be91b73f620cbb2a6fb58)), closes [#912](https://github.com/hyperledger/cactus/issues/912)
* **azure-kv:** added keychain plugin for azure keyvault ([69e7b50](https://github.com/hyperledger/cactus/commit/69e7b50f127fbf247a43288353388782a4301686)), closes [#971](https://github.com/hyperledger/cactus/issues/971)
