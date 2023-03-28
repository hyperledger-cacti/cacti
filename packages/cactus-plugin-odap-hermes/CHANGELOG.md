# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.2.0](https://github.com/hyperledger/cactus/compare/v1.1.3...v1.2.0) (2023-03-28)

**Note:** Version bump only for package @hyperledger/cactus-plugin-odap-hermes

## [1.1.3](https://github.com/hyperledger/cactus/compare/v1.1.2...v1.1.3) (2022-12-08)

### Bug Fixes

* **odap-plugin:** fixes [#2198](https://github.com/hyperledger/cactus/issues/2198) - two gateways are using the same database ([9da24a0](https://github.com/hyperledger/cactus/commit/9da24a0ecd5e8682cbd6e6edbc349149b5d69d00))

## [1.1.2](https://github.com/hyperledger/cactus/compare/v1.1.1...v1.1.2) (2022-11-11)

**Note:** Version bump only for package @hyperledger/cactus-plugin-odap-hermes

## [1.1.1](https://github.com/hyperledger/cactus/compare/v1.1.0...v1.1.1) (2022-11-03)

### Features

* **cbdc-bridging-app:** refactor ODAP plugin implementation ([6975fef](https://github.com/hyperledger/cactus/commit/6975fefd4994cc9c6dd7d649dc2d6400646a59ae))

# [1.1.0](https://github.com/hyperledger/cactus/compare/v1.0.0...v1.1.0) (2022-10-17)

### Features

* **odap-plugin:** addition of client endpoints ([cfa8db6](https://github.com/hyperledger/cactus/commit/cfa8db6c96e314bcefd6958b9823c4e0a5cf9620))
* **odap-plugin:** backup gateway implementation ([61da528](https://github.com/hyperledger/cactus/commit/61da5289cefe55527bf6ef3cd6204b6ae7002ce1))
* **odap-plugin:** odap crash recovery first implementation ([2e94ef8](https://github.com/hyperledger/cactus/commit/2e94ef8d3b34449c7b4d48e37d81245851477a3e))

# [1.0.0](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.3...v1.0.0) (2022-03-16)

### Bug Fixes

* **cmd-api-server:** upgrade socket.io - CVE-2022-21676 ([8e1c69e](https://github.com/hyperledger/cactus/commit/8e1c69e7b8ab5e4ccc31a0ec183a9777ccc22cdc)), closes [#1914](https://github.com/hyperledger/cactus/issues/1914)
* **plugin-odap-hermes:** remove extraneous dependencies ([87af023](https://github.com/hyperledger/cactus/commit/87af02305be25cdb8afb7e1b7a2464bf36791b6e)), closes [#1641](https://github.com/hyperledger/cactus/issues/1641)
* **security:** upgrade web3 to upgrade elliptic > 6.5.4 ([5513848](https://github.com/hyperledger/cactus/commit/55138483e43dd840a6c3822d1ff8f2f7ce8c35e8)), closes [#1639](https://github.com/hyperledger/cactus/issues/1639)

# [1.0.0-rc.3](https://github.com/hyperledger/cactus/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2021-12-07)

### Bug Fixes

* **deps:** sibling package dependencies keychain-memory 0.6.0 [#1532](https://github.com/hyperledger/cactus/issues/1532) ([d01d72d](https://github.com/hyperledger/cactus/commit/d01d72d36200d47acac89f7ab90f6ddc96afba6f))
* **security:** remedy CVE-2021-3749 ([b33aa90](https://github.com/hyperledger/cactus/commit/b33aa904cfa3794357c77b24f464d41a325f1d80)), closes [#1569](https://github.com/hyperledger/cactus/issues/1569)

### Features

* **odap:** first implemenation for odap plugin and endpoints ([51bf753](https://github.com/hyperledger/cactus/commit/51bf753d421cdd255c178036fe901eb9c1c04130))
