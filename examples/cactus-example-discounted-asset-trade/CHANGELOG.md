# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.1.0](https://github.com/hyperledger/cacti/compare/v2.0.0...v2.1.0) (2024-12-01)

**Note:** Version bump only for package @hyperledger/cactus-example-discounted-asset-trade

# [2.0.0](https://github.com/hyperledger-cacti/cacti/compare/v2.0.0-rc.7...v2.0.0) (2024-10-15)

**Note:** Version bump only for package @hyperledger/cactus-example-discounted-asset-trade

# [2.0.0-rc.6](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.5...v2.0.0-rc.6) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cactus-example-discounted-asset-trade

# [2.0.0-rc.5](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.4...v2.0.0-rc.5) (2024-09-30)

### Features

* **cmd-socketio-server:** move to examples as deprecated ([4de8069](https://github.com/hyperledger/cacti/commit/4de806974f0066359cca422561042a55173d3655))

# [2.0.0-rc.4](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.3...v2.0.0-rc.4) (2024-09-08)

### Bug Fixes

* **security:** address CVE-2024-39338 SSRF in axios >= 1.3.2, <= 1.7.3 ([7e7bb44](https://github.com/hyperledger/cacti/commit/7e7bb44c01a2d19306ecaaaa2ba2e3c574039c87))

### Features

* **go-ethereum-socketio:** remove deprecated connector ([56dd9f8](https://github.com/hyperledger/cacti/commit/56dd9f8aa72883aeb5bfcf0303b0af6e84daad7a)), closes [#3155](https://github.com/hyperledger/cacti/issues/3155)

# [2.0.0-rc.3](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.2...v2.0.0-rc.3) (2024-07-21)

### Build System

* bump uuid@10.0.0 fs-extra@11.2.0 @bufbuild/protobuf@1.10.0 ([9970352](https://github.com/hyperledger/cacti/commit/997035216694fe335215b8a3586488ac8c12447f))

### Features

* **fabric-connector:** add getChainInfo, improve getBlock output ([8c030ae](https://github.com/hyperledger/cacti/commit/8c030ae9e739a28ff0900f7af27ec0fbbb4b7ff9))

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
* **fabric-connector:** It accepts `type` instead of `skipDecode` flag.
- Move common block formatting logic to `cacti-block-formatters.ts`.
- Add tests for new features. Move test common to quering `qscc` to single file
  to increase CI speed.

Signed-off-by: Michal Bajer <michal.bajer@fujitsu.com>

# [2.0.0-rc.2](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.1...v2.0.0-rc.2) (2024-07-03)

**Note:** Version bump only for package @hyperledger/cactus-example-discounted-asset-trade

# [2.0.0-rc.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.2...v2.0.0-rc.1) (2024-06-14)

### Bug Fixes

* **deps:** bulk add missing dependencies - 2023-11-02 ([8addb01](https://github.com/hyperledger/cacti/commit/8addb018b6d124d54d9d948bbaeba6ea33b67153)), closes [#2857](https://github.com/hyperledger/cacti/issues/2857)
* **security:** address CVE-2021-3749 - axios >=0.22.0 ([61fc700](https://github.com/hyperledger/cacti/commit/61fc7001b1dd0849ab1d9bcab08e2475c695adae))
* **security:** remediate qs vulnerability CVE-2022-24999 ([536b6b1](https://github.com/hyperledger/cacti/commit/536b6b1b7ab9014ebcd6b162e1a467e78b52afdd))

### Features

* **cactus-example-discounted-asset-trade:** use openapi ethereum connector ([dcaf9fe](https://github.com/hyperledger/cacti/commit/dcaf9fe5de5b830975f3d308f140eff32d3cb79d)), closes [#2645](https://github.com/hyperledger/cacti/issues/2645)
* **cactus-plugin-ledger-connector-aries:** add new connector plugin ([afef5ae](https://github.com/hyperledger/cacti/commit/afef5ae3e2f36bf7f25928ee75f82bc4800b3172)), closes [#2946](https://github.com/hyperledger/cacti/issues/2946)
* **cactus-plugin-ledger-connector-fabric-socketio:** remove fabric-socketio connector ([704e201](https://github.com/hyperledger/cacti/commit/704e201d6bd6bf7a38f0de7da60723118e18cea7)), closes [#2644](https://github.com/hyperledger/cacti/issues/2644)
* **indy-sdk:** replace indy SDK with AFJ ([3291dcc](https://github.com/hyperledger/cacti/commit/3291dcc57e9e4eb04e0b9abab4134e1a5e2b0bbf)), closes [#2859](https://github.com/hyperledger/cacti/issues/2859) [#2860](https://github.com/hyperledger/cacti/issues/2860)

# [2.0.0-alpha.2](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2023-09-27)

### Bug Fixes

* **indy-validator:** fix package dependencies ([a28641a](https://github.com/hyperledger/cacti/commit/a28641ae47bd686af76d85ac22bcc84548211c59)), closes [#2596](https://github.com/hyperledger/cacti/issues/2596)
* **security:** the CVE-2022-2421 - upgrade socket.io-parser to >=4.2.1 ([9172172](https://github.com/hyperledger/cacti/commit/917217227a3fa53a00429f047cd6318862e6ab8d)), closes [#2229](https://github.com/hyperledger/cacti/issues/2229) [#2228](https://github.com/hyperledger/cacti/issues/2228)

# [2.0.0-alpha.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha-prerelease...v2.0.0-alpha.1) (2023-05-19)

**Note:** Version bump only for package @hyperledger/cactus-example-discounted-asset-trade

# [2.0.0-alpha-prerelease](https://github.com/hyperledger/cacti/compare/v1.2.0...v2.0.0-alpha-prerelease) (2023-05-11)

**Note:** Version bump only for package @hyperledger/cactus-example-discounted-asset-trade

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
