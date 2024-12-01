# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.1.0](https://github.com/hyperledger/cacti/compare/v2.0.0...v2.1.0) (2024-12-01)

**Note:** Version bump only for package @hyperledger/cacti-weaver-fabric-cli

# [2.0.0](https://github.com/hyperledger-cacti/cacti/compare/v2.0.0-rc.7...v2.0.0) (2024-10-15)

**Note:** Version bump only for package @hyperledger/cacti-weaver-fabric-cli

# [2.0.0-rc.6](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.5...v2.0.0-rc.6) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cacti-weaver-fabric-cli

# [2.0.0-rc.5](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.4...v2.0.0-rc.5) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cacti-weaver-fabric-cli

# [2.0.0-rc.4](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.3...v2.0.0-rc.4) (2024-09-08)

### Features

* **weaver:** upgrade to corda 4.12 and jvm 17 ([edde6c6](https://github.com/hyperledger/cacti/commit/edde6c62cc02549d4c4dd20b830c1a97ba05f933))

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

**Note:** Version bump only for package @hyperledger/cacti-weaver-fabric-cli

# [2.0.0-rc.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.2...v2.0.0-rc.1) (2024-06-14)

### Bug Fixes

* **deps:** bulk add missing dependencies - 2023-11-02 ([8addb01](https://github.com/hyperledger/cacti/commit/8addb018b6d124d54d9d948bbaeba6ea33b67153)), closes [#2857](https://github.com/hyperledger/cacti/issues/2857)
* **security:** address CVE-2021-3749 - axios >=0.22.0 ([61fc700](https://github.com/hyperledger/cacti/commit/61fc7001b1dd0849ab1d9bcab08e2475c695adae))
* **security:** remediate qs vulnerability CVE-2022-24999 ([536b6b1](https://github.com/hyperledger/cacti/commit/536b6b1b7ab9014ebcd6b162e1a467e78b52afdd))
* **weaver-membership-functions:** reverted earlier buggy change affecting identity mgmt ([faf90dd](https://github.com/hyperledger/cacti/commit/faf90ddbe9c061cd6261d642842ab12ae4be3c48))

### Features

* **satp:** sample implementation of SATP standard using relays ([c23197c](https://github.com/hyperledger/cacti/commit/c23197c314885b99146b52c3cd0e056439193d6e))
* **weaver-go:** upgraded Weaver Fabric Go SDK with membership functions ([43cce8e](https://github.com/hyperledger/cacti/commit/43cce8e3778a574514d2759c282a7f0108be86b5))
* **weaver:** add build script and fix minor issues ([6d4fd00](https://github.com/hyperledger/cacti/commit/6d4fd00d457d3a72017a7cd8d4a9cf3fb4d5f37e))

# [2.0.0-alpha.2](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2023-09-27)

### Bug Fixes

* **cmd-api-server:** fix CVE-2023-36665 protobufjs Prototype Pollution vuln ([7bb3957](https://github.com/hyperledger/cacti/commit/7bb39576080592919bea0ac89646b32105e1748e)), closes [#2682](https://github.com/hyperledger/cacti/issues/2682)
* ejs critical vulnerability CVE-2022-29078 ([2813b75](https://github.com/hyperledger/cacti/commit/2813b75bf5eebb7505ec05817c584324b3b6b149))

### Features

* corda asset transfer test workflow added and bug fixes ([4b5ee09](https://github.com/hyperledger/cacti/commit/4b5ee095b07f7c6a4290cfb85280d825672ce394))

# [2.0.0-alpha.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha-prerelease...v2.0.0-alpha.1) (2023-05-19)

**Note:** Version bump only for package @hyperledger/cacti-weaver-fabric-cli

# [2.0.0-alpha-prerelease](https://github.com/hyperledger/cacti/compare/v1.2.0...v2.0.0-alpha-prerelease) (2023-05-11)

**Note:** Version bump only for package @hyperledger/cacti-weaver-fabric-cli
