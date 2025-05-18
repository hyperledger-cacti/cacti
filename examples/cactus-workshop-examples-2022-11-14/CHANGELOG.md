# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.1.0](https://github.com/hyperledger/cacti/compare/v2.0.0...v2.1.0) (2024-12-01)

**Note:** Version bump only for package @hyperledger/cactus-workshop-examples-2022-11-14

# [2.0.0](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.7...v2.0.0) (2024-10-15)

**Note:** Version bump only for package @hyperledger/cactus-workshop-examples-2022-11-14

# [2.0.0-rc.6](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.5...v2.0.0-rc.6) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cactus-workshop-examples-2022-11-14

# [2.0.0-rc.5](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.4...v2.0.0-rc.5) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cactus-workshop-examples-2022-11-14

# [2.0.0-rc.4](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.3...v2.0.0-rc.4) (2024-09-08)

**Note:** Version bump only for package @hyperledger/cactus-workshop-examples-2022-11-14

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

**Note:** Version bump only for package @hyperledger/cactus-workshop-examples-2022-11-14

# [2.0.0-rc.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.2...v2.0.0-rc.1) (2024-06-14)

### Bug Fixes

* **deps:** bulk add missing dependencies - 2023-11-02 ([8addb01](https://github.com/hyperledger/cacti/commit/8addb018b6d124d54d9d948bbaeba6ea33b67153)), closes [#2857](https://github.com/hyperledger/cacti/issues/2857)

# [2.0.0-alpha.2](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2023-09-27)

### Bug Fixes

* use common conventions: tsconfig.json, package.json ([50f5c02](https://github.com/hyperledger/cacti/commit/50f5c02190ba28b77492c09e81f5d5ba6578e862)), closes [#2216](https://github.com/hyperledger/cacti/issues/2216)
* **webpack:** fix broken bundling - cannot find webpack.config.js ([794f0b4](https://github.com/hyperledger/cacti/commit/794f0b4db6f352849b2d012c5034f0ed8d1903af))

# [2.0.0-alpha.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha-prerelease...v2.0.0-alpha.1) (2023-05-19)

**Note:** Version bump only for package @hyperledger/cactus-workshop-examples-2022-11-14

# [2.0.0-alpha-prerelease](https://github.com/hyperledger/cacti/compare/v1.2.0...v2.0.0-alpha-prerelease) (2023-05-11)

**Note:** Version bump only for package @hyperledger/cactus-workshop-examples-2022-11-14

# [1.2.0](https://github.com/hyperledger/cactus/compare/v1.1.3...v1.2.0) (2023-03-28)

**Note:** Version bump only for package @hyperledger/cactus-workshop-examples-2022-11-14
