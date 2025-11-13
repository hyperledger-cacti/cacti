# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.1.0](https://github.com/hyperledger-cacti/cacti/compare/v2.0.0...v2.1.0) (2024-12-01)

### Features

* **copm:** add fabric COPM implementation ([7af9983](https://github.com/hyperledger-cacti/cacti/commit/7af99833f4db237d6aba7223a31add5723faba9d))

# [2.0.0](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.7...v2.0.0) (2024-10-15)

### Bug Fixes

* mitigate CVE-2024-42461 - bump elliptic to v6.5.7 ([32c242a](https://github.com/hyperledger/cacti/commit/32c242a1a984a890aeba88073ff9805c697e5579))

# [2.0.0-rc.6](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.5...v2.0.0-rc.6) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cacti-weaver-sdk-fabric

# [2.0.0-rc.5](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.4...v2.0.0-rc.5) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cacti-weaver-sdk-fabric

# [2.0.0-rc.4](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.3...v2.0.0-rc.4) (2024-09-08)

### Bug Fixes

* **security:** address CVE-2022-3517 - minimatch < 3.0.5 ReDoS vuln ([e97e27b](https://github.com/hyperledger/cacti/commit/e97e27bca0a8fb4b52c716ee25437d69efff74d4))

# [2.0.0-rc.3](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.2...v2.0.0-rc.3) (2024-07-21)

### Bug Fixes

* **ci:** deprecationWarning in yarn_custom_checks ([96a3865](https://github.com/hyperledger/cacti/commit/96a3865ce5404e0fd3bf5a6471eb5a653e579d33))

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

**Note:** Version bump only for package @hyperledger/cacti-weaver-sdk-fabric

# [2.0.0-rc.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.2...v2.0.0-rc.1) (2024-06-14)

### Bug Fixes

* **weaver-fabric-node-sdk:** made AES key length configurable in ECIES functions ([e679801](https://github.com/hyperledger/cacti/commit/e67980141d2fb2e54ef8408e36dbab55b7195905))
* **weaver-membership-functions:** reverted earlier buggy change affecting identity mgmt ([faf90dd](https://github.com/hyperledger/cacti/commit/faf90ddbe9c061cd6261d642842ab12ae4be3c48))
* **weaver-satp:** bug and configuration fixes in relays and Fabric drivers for sample SATP implementation ([9f77871](https://github.com/hyperledger/cacti/commit/9f77871419712bacc623dd9fbbe40f6016f0a94f))
* **weaver:** usage of weak PRNG issue ([fa17b52](https://github.com/hyperledger/cacti/commit/fa17b52d641345a6ffc3ff6b0845be75202dc945)), closes [#2765](https://github.com/hyperledger/cacti/issues/2765)

### Features

* **satp:** sample implementation of SATP standard using relays ([c23197c](https://github.com/hyperledger/cacti/commit/c23197c314885b99146b52c3cd0e056439193d6e))
* **weaver-go:** upgraded Weaver Fabric Go SDK with membership functions ([43cce8e](https://github.com/hyperledger/cacti/commit/43cce8e3778a574514d2759c282a7f0108be86b5))
* **weaver:** add build script and fix minor issues ([6d4fd00](https://github.com/hyperledger/cacti/commit/6d4fd00d457d3a72017a7cd8d4a9cf3fb4d5f37e))

# [2.0.0-alpha.2](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2023-09-27)

### Features

* corda asset transfer test workflow added and bug fixes ([4b5ee09](https://github.com/hyperledger/cacti/commit/4b5ee095b07f7c6a4290cfb85280d825672ce394))

# [2.0.0-alpha.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha-prerelease...v2.0.0-alpha.1) (2023-05-19)

**Note:** Version bump only for package @hyperledger/cacti-weaver-sdk-fabric

# [2.0.0-alpha-prerelease](https://github.com/hyperledger/cacti/compare/v1.2.0...v2.0.0-alpha-prerelease) (2023-05-11)

### Bug Fixes

* **relay:** rust build fails after tokio bump from 0.2.25 to 1.18.5 ([187f26e](https://github.com/hyperledger/cacti/commit/187f26e39d8dbbc7860fba13a0317ef842cadebe))
* **weaversdk:** ecies decrypt bug when z is less than 32Bytes ([b9066a9](https://github.com/hyperledger/cacti/commit/b9066a9c1bb5582d70cdfd701cae654853ca9c42))

### Features

* **relay:** configurable db_open retry mechanism added and in driver ([22ba550](https://github.com/hyperledger/cacti/commit/22ba550a96dace4d47a2e068572dea0ac81f860c))
