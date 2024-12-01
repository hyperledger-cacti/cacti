# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.1.0](https://github.com/hyperledger/cacti/compare/v2.0.0...v2.1.0) (2024-12-01)

**Note:** Version bump only for package @hyperledger/cactus-example-carbon-accounting-backend

# [2.0.0](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.7...v2.0.0) (2024-10-15)

**Note:** Version bump only for package @hyperledger/cactus-example-carbon-accounting-backend

# [2.0.0-rc.6](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.5...v2.0.0-rc.6) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cactus-example-carbon-accounting-backend

# [2.0.0-rc.5](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.4...v2.0.0-rc.5) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cactus-example-carbon-accounting-backend

# [2.0.0-rc.4](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.3...v2.0.0-rc.4) (2024-09-08)

**Note:** Version bump only for package @hyperledger/cactus-example-carbon-accounting-backend

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

**Note:** Version bump only for package @hyperledger/cactus-example-carbon-accounting-backend

# [2.0.0-rc.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.2...v2.0.0-rc.1) (2024-06-14)

### Bug Fixes

* **security:** remediate qs vulnerability CVE-2022-24999 ([536b6b1](https://github.com/hyperledger/cacti/commit/536b6b1b7ab9014ebcd6b162e1a467e78b52afdd))

# [2.0.0-alpha.2](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2023-09-27)

### Bug Fixes

* **security:** upgrade fabric 2.x deps to 2.2.18 ([36988a5](https://github.com/hyperledger/cacti/commit/36988a5edbf9856a1bcc960a3b9afe443536733e)), closes [#2610](https://github.com/hyperledger/cacti/issues/2610)
* use common conventions: tsconfig.json, package.json ([50f5c02](https://github.com/hyperledger/cacti/commit/50f5c02190ba28b77492c09e81f5d5ba6578e862)), closes [#2216](https://github.com/hyperledger/cacti/issues/2216)

### Code Refactoring

* **cmd-api-server:** clean up configuration parameters [#720](https://github.com/hyperledger/cacti/issues/720) ([b8e8388](https://github.com/hyperledger/cacti/commit/b8e8388306b6708c7d3156e005b1ee9693b35a22))

### BREAKING CHANGES

* **cmd-api-server:** Removed the `keyPairPem` parameter from the API server
configuration.

# [2.0.0-alpha.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha-prerelease...v2.0.0-alpha.1) (2023-05-19)

**Note:** Version bump only for package @hyperledger/cactus-example-carbon-accounting-backend

# [2.0.0-alpha-prerelease](https://github.com/hyperledger/cacti/compare/v1.2.0...v2.0.0-alpha-prerelease) (2023-05-11)

### Bug Fixes

* **security:** upgrade express-jwt to v8.4.1 ([e251168](https://github.com/hyperledger/cactus/commit/e251168fb4067a8036a5168709e57154c0c02fe4)), closes [#2231](https://github.com/hyperledger/cactus/issues/2231)

# [1.2.0](https://github.com/hyperledger/cactus/compare/v1.1.3...v1.2.0) (2023-03-28)

**Note:** Version bump only for package @hyperledger/cactus-example-carbon-accounting-backend

## [1.1.3](https://github.com/hyperledger/cactus/compare/v1.1.2...v1.1.3) (2022-12-08)

**Note:** Version bump only for package @hyperledger/cactus-example-carbon-accounting-backend

## [1.1.2](https://github.com/hyperledger/cactus/compare/v1.1.1...v1.1.2) (2022-11-11)

**Note:** Version bump only for package @hyperledger/cactus-example-carbon-accounting-backend

## [1.1.1](https://github.com/hyperledger/cactus/compare/v1.1.0...v1.1.1) (2022-11-03)

**Note:** Version bump only for package @hyperledger/cactus-example-carbon-accounting-backend

# [1.1.0](https://github.com/hyperledger/cactus/compare/v1.0.0...v1.1.0) (2022-10-17)

**Note:** Version bump only for package @hyperledger/cactus-example-carbon-accounting-backend

# [1.0.0](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.3...v1.0.0) (2022-03-16)

### Features

* **connector-xdai:** remove hard dependency on keychain ([da793c5](https://github.com/hyperledger/cactus/commit/da793c568260fd70b80f855833bc60c116099a65)), closes [#1162](https://github.com/hyperledger/cactus/issues/1162)

# [1.0.0-rc.3](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2021-12-07)

### Bug Fixes

* **security:** upgrade fabric-common to 2.2.10 or later ([45c4a69](https://github.com/hyperledger/cactus/commit/45c4a69fb86964bc4e7018c31c5914a0063c7638)), closes [#1600](https://github.com/hyperledger/cactus/issues/1600)

# [1.0.0-rc.2](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2021-11-01)

**Note:** Version bump only for package @hyperledger/cactus-example-carbon-accounting-backend

# [1.0.0-rc.1](https://github.com/hyperledger/cactus/compare/v0.10.0...v1.0.0-rc.1) (2021-10-11)

### Bug Fixes

* **webpack:** prod build chokes on upgraded ssh2 binaries [#1405](https://github.com/hyperledger/cactus/issues/1405) ([18979fb](https://github.com/hyperledger/cactus/commit/18979fb33880d8ca30e2fda01fb3d598deb839f9))

# [0.10.0](https://github.com/hyperledger/cactus/compare/v0.9.0...v0.10.0) (2021-09-28)

### Bug Fixes

* **test:** flaky fabric AIO container boot [#876](https://github.com/hyperledger/cactus/issues/876) ([beefcef](https://github.com/hyperledger/cactus/commit/beefcefbebbdb9a22d08118b6fb2e667493504cf)), closes [#718](https://github.com/hyperledger/cactus/issues/718) [#320](https://github.com/hyperledger/cactus/issues/320) [#319](https://github.com/hyperledger/cactus/issues/319)

# [0.9.0](https://github.com/hyperledger/cactus/compare/v0.8.0...v0.9.0) (2021-08-31)

### Features

* besu private transaction support ([53b4980](https://github.com/hyperledger/cactus/commit/53b49808615aced96b628bf1498a1b62c5c9ca42))
* **cmd-api-server:** support grpc web services [#1189](https://github.com/hyperledger/cactus/issues/1189) ([4cace1d](https://github.com/hyperledger/cactus/commit/4cace1dca3377e09d2ed37fdadeec6b125d47896))

# [0.8.0](https://github.com/hyperledger/cactus/compare/v0.7.0...v0.8.0) (2021-08-17)

**Note:** Version bump only for package @hyperledger/cactus-example-carbon-accounting-backend

# [0.7.0](https://github.com/hyperledger/cactus/compare/v0.6.0...v0.7.0) (2021-08-04)

**Note:** Version bump only for package @hyperledger/cactus-example-carbon-accounting-backend

# [0.6.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.6.0) (2021-07-19)

### Bug Fixes

* **connector-corda:** container image kotlin compilation fails in model ([a8a4531](https://github.com/hyperledger/cactus/commit/a8a4531d379fe16d4c991802525ec573a7e3ede1))

### Features

* **cmd-api-server:** add Socket.IO as transport [#297](https://github.com/hyperledger/cactus/issues/297) ([51c586a](https://github.com/hyperledger/cactus/commit/51c586aa01bff3e75f0e87be43f0764b30d8222c))

# [0.5.0](https://github.com/hyperledger/cactus/compare/v0.4.1...v0.5.0) (2021-05-19)

**Note:** Version bump only for package @hyperledger/cactus-example-carbon-accounting-backend
