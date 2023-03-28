# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.2.0](https://github.com/hyperledger/cacti/compare/v1.1.3...v1.2.0) (2023-03-28)

**Note:** Version bump only for package @hyperledger/cactus-example-discounted-asset-trade

## [1.1.3](https://github.com/hyperledger/cactus/compare/v1.1.2...v1.1.3) (2022-12-08)

### Features

* **fabric-socketio-connector:** sending transactions signed on the client-side ([0b34ca3](https://github.com/hyperledger/cactus/commit/0b34ca3d35a39826c05cc047e480d377c1c52bef))

## [1.1.2](https://github.com/hyperledger/cactus/compare/v1.1.1...v1.1.2) (2022-11-11)

**Note:** Version bump only for package @hyperledger/cactus-example-discounted-asset-trade

## [1.1.1](https://github.com/hyperledger/cactus/compare/v1.1.0...v1.1.1) (2022-11-03)

**Note:** Version bump only for package @hyperledger/cactus-example-discounted-asset-trade

# [1.1.0](https://github.com/hyperledger/cactus/compare/v1.0.0...v1.1.0) (2022-10-17)

### Bug Fixes

* **cactus-example-discounted-asset-trade:** enable ([12e972e](https://github.com/hyperledger/cactus/commit/12e972e9cac63fd03a0ba3c7c8a29dc9ca544b9d)), closes [#2145](https://github.com/hyperledger/cactus/issues/2145)

### Code Refactoring

* **examples:** include sample apps in monorepo build ([51ac163](https://github.com/hyperledger/cactus/commit/51ac1630f53ca3ac881341c7f8847b6ae581b220))

### Features

* **secret:** remove Validator/Verifier secret keys from repository ([59b4af4](https://github.com/hyperledger/cactus/commit/59b4af44835e2babafe398040a280ed23e9b490e))

### BREAKING CHANGES

* **examples:** building discounted-asset-trade app (or any future app that use indy validator)
                 requires Indy SDK to be installed on the build machine.

Closes: 2029

Signed-off-by: Michal Bajer <michal.bajer@fujitsu.com>
