# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.2.0](https://github.com/hyperledger/cacti/compare/v1.1.3...v1.2.0) (2023-03-28)

### Features

* connector-go-ethereum now can report empty blocks ([6dbe6b5](https://github.com/hyperledger/cacti/commit/6dbe6b54eaee156cd236ebbde4337b8599b05c08))

## [1.1.3](https://github.com/hyperledger/cactus/compare/v1.1.2...v1.1.3) (2022-12-08)

### Features

* **cmd-socketio-server:** support multiple BLP in single server ([0f67085](https://github.com/hyperledger/cactus/commit/0f670855b0fa0fd33f71bf5a1814fb6fcac2c7b6)), closes [#2102](https://github.com/hyperledger/cactus/issues/2102) [#2030](https://github.com/hyperledger/cactus/issues/2030)

## [1.1.2](https://github.com/hyperledger/cactus/compare/v1.1.1...v1.1.2) (2022-11-11)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-go-ethereum-socketio

## [1.1.1](https://github.com/hyperledger/cactus/compare/v1.1.0...v1.1.1) (2022-11-03)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-go-ethereum-socketio

# [1.1.0](https://github.com/hyperledger/cactus/compare/v1.0.0...v1.1.0) (2022-10-17)

### Bug Fixes

* **security:** address CVE-2017-16138 Fixes: [#1776](https://github.com/hyperledger/cactus/issues/1776) ([9f1d013](https://github.com/hyperledger/cactus/commit/9f1d01320cacf859bfd2e03426f85fb234f52dd8))

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

* **cmd-api-server:** upgrade socket.io - CVE-2022-21676 ([8e1c69e](https://github.com/hyperledger/cactus/commit/8e1c69e7b8ab5e4ccc31a0ec183a9777ccc22cdc)), closes [#1914](https://github.com/hyperledger/cactus/issues/1914)
* **security:** address CVE-2019-5413 ([212b770](https://github.com/hyperledger/cactus/commit/212b770c705c279dcc766b7230d7519ed9a98748)), closes [#1777](https://github.com/hyperledger/cactus/issues/1777)

# [1.0.0-rc.3](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2021-12-07)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-go-ethereum-socketio

# [1.0.0-rc.2](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2021-11-01)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-go-ethereum-socketio

# [1.0.0-rc.1](https://github.com/hyperledger/cactus/compare/v0.10.0...v1.0.0-rc.1) (2021-10-11)

### Features

* **connector-go-ethereum:** add the docker environment ([2583cc7](https://github.com/hyperledger/cactus/commit/2583cc7ff7428a427454e7dd9211a129942e50d4))

# [0.10.0](https://github.com/hyperledger/cactus/compare/v0.9.0...v0.10.0) (2021-09-28)

### Bug Fixes

* **validators:** add some missing parts ([9a8f7db](https://github.com/hyperledger/cactus/commit/9a8f7db746e2a41708e2fe9d5277561d6abac3d4))
