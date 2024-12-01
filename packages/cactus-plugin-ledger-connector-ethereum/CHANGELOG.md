# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.1.0](https://github.com/hyperledger/cacti/compare/v2.0.0...v2.1.0) (2024-12-01)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-ethereum

# [2.0.0](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.7...v2.0.0) (2024-10-15)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-ethereum

# [2.0.0-rc.6](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.5...v2.0.0-rc.6) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-ethereum

# [2.0.0-rc.5](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.4...v2.0.0-rc.5) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cactus-plugin-ledger-connector-ethereum

# [2.0.0-rc.4](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.3...v2.0.0-rc.4) (2024-09-08)

### Bug Fixes

* **security:** address CVE-2024-39338 SSRF in axios >= 1.3.2, <= 1.7.3 ([7e7bb44](https://github.com/hyperledger/cacti/commit/7e7bb44c01a2d19306ecaaaa2ba2e3c574039c87))

### Features

* **persistence-ethereum:** add sample setup scripts, improve documentation ([ed915cf](https://github.com/hyperledger/cacti/commit/ed915cf6f8f1388cbfdc16c954102da1e381920b))

# [2.0.0-rc.3](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.2...v2.0.0-rc.3) (2024-07-21)

### Build System

* bump uuid@10.0.0 fs-extra@11.2.0 @bufbuild/protobuf@1.10.0 ([9970352](https://github.com/hyperledger/cacti/commit/997035216694fe335215b8a3586488ac8c12447f))

### Code Refactoring

* retire connector plugin specific container images, fix docs ([24b5888](https://github.com/hyperledger/cacti/commit/24b5888247d134ea417fc0e83dccc9826b4075f3))

### BREAKING CHANGES

* Container images are being deleted here and will also
get deleted from GHCR. Though the public APIs of the Typescript code
do not change, still, some parts of the documentation will become invalid
until we update it to match the changes here.
I invested a large amount of effort into doing this documentation update
as part of this change but it is very likely that I've missed a few spots
and therefore it is best to mark this as a breaking change in my opinion
to call attention to the fact that we still have ways to go with updating
the documentation around these container images.

1. Deleted all the container images that were just wrappers around the
cmd-api-server container image installing their own npm package from
the registry.
The reason for this is that they ended up just being maintenance burden
since we can achieve the exact same things just by re-using the API server's
container image directly.
2. This way we don't have to deal with CVEs in 10x container images when
it's really just the one container image that we use as the base that needs
to deal with them anyway.
3. I also spent quite a bit of effort in this change to update the README.md
files of the packages where previously we had plugin specific container images
defined so that the README.md files have the tutorials that are more up to
date compared to how they were (most of them had the tutorials completely
broken for a long while which was causing a lot of difficulties to the
newcomers who were trying to work with the packages).
4. The reason why they got so out of date traces back to the undue maintenance
burden of keeping separate images for each connector plugin. We hope that
with this simplification we can keep the documentation continuously up to
date since it will require less time do so.
5. Also deleted the ci.yaml container building jobs which were relevant to
the scope of this change so that we also save on CI resources, another
long-running project that's been in need of some attention from the maintainers.

Signed-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>
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

### Bug Fixes

* **deps:** fix batch of missing production dependencies v2.0.0-rc.1 ([51d64ee](https://github.com/hyperledger/cacti/commit/51d64eead473d928086eb53adf0850c3b43cbda9)), closes [#3344](https://github.com/hyperledger/cacti/issues/3344)

# [2.0.0-rc.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.2...v2.0.0-rc.1) (2024-06-14)

### Bug Fixes

* **connector-quorum/ethereum:** strengthen contract parameter validation ([779bb7e](https://github.com/hyperledger/cacti/commit/779bb7e24b06352bad64c96eab3b24c0961d1381)), closes [#2760](https://github.com/hyperledger/cacti/issues/2760)
* **deps:** bulk add missing dependencies - 2023-11-02 ([8addb01](https://github.com/hyperledger/cacti/commit/8addb018b6d124d54d9d948bbaeba6ea33b67153)), closes [#2857](https://github.com/hyperledger/cacti/issues/2857)
* **security:** address CVE-2021-3749 - axios >=0.22.0 ([61fc700](https://github.com/hyperledger/cacti/commit/61fc7001b1dd0849ab1d9bcab08e2475c695adae))
* **security:** remediate qs vulnerability CVE-2022-24999 ([536b6b1](https://github.com/hyperledger/cacti/commit/536b6b1b7ab9014ebcd6b162e1a467e78b52afdd))

### Features

* **cactus-example-electricity-trade:** use openapi ethereum connector ([9e66850](https://github.com/hyperledger/cacti/commit/9e66850438c97883a8999c3def36e807bfbb1a76))
* **cactus-plugin-ledger-connector-aries:** add new connector plugin ([afef5ae](https://github.com/hyperledger/cacti/commit/afef5ae3e2f36bf7f25928ee75f82bc4800b3172)), closes [#2946](https://github.com/hyperledger/cacti/issues/2946)
* **cactus-plugin-ledger-connector-ethereum:** add json-rpc proxy ([ed04201](https://github.com/hyperledger/cacti/commit/ed04201671bdb614549e995b3d88cc2cae218e56))
* **cactus-plugin-ledger-connector-ethereum:** add signing utils ([84c5b34](https://github.com/hyperledger/cacti/commit/84c5b34afa73b4f906e413c4d5dd3ff46a1dd7a8))
* **cactus-plugin-ledger-connector-ethereum:** add stress test ([55fa26e](https://github.com/hyperledger/cacti/commit/55fa26ef41d405b26da02b099418da5fa281c78f)), closes [#2631](https://github.com/hyperledger/cacti/issues/2631)
* **cactus-plugin-ledger-connector-ethereum:** refactor connector API ([cda279f](https://github.com/hyperledger/cacti/commit/cda279fb0009a4d5756c461024ad88f525bfe946)), closes [#2630](https://github.com/hyperledger/cacti/issues/2630)
* **cactus-plugin-ledger-connector-ethereum:** support London fork gas prices ([80a89dd](https://github.com/hyperledger/cacti/commit/80a89dd95d51bdc604392dbe96ab27d233b116a4)), closes [#2581](https://github.com/hyperledger/cacti/issues/2581)
* **cactus-plugin-ledger-connector-ethereum:** update web3js to 4.X ([55f82c9](https://github.com/hyperledger/cacti/commit/55f82c9568b3e875de4f3ceb89a828f8b23d65be)), closes [#2580](https://github.com/hyperledger/cacti/issues/2580) [#2535](https://github.com/hyperledger/cacti/issues/2535) [#2578](https://github.com/hyperledger/cacti/issues/2578)
* **cactus-plugin-persistence-ethereum:** use openapi ethereum connector ([b8f9b79](https://github.com/hyperledger/cacti/commit/b8f9b79daa7a97cbd75325eba00c7458bfed5ce5)), closes [#2631](https://github.com/hyperledger/cacti/issues/2631)
* **ethereum-connector:** support block monitoring with http only connection ([f4373a9](https://github.com/hyperledger/cacti/commit/f4373a90020cbc8bfbc16da6c32babe627e7d4ae))

# [2.0.0-alpha.2](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2023-09-27)

### Features

* **cactus-plugin-ledger-connector-ethereum:** add new connector plugin ([f8a2131](https://github.com/hyperledger/cacti/commit/f8a2131e9fc0ea05c1c1c8863489a43a74f019ae)), closes [#2534](https://github.com/hyperledger/cacti/issues/2534)
