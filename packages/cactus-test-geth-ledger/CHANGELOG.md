# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.0.0-rc.3](https://github.com/hyperledger/cactus/compare/v2.0.0-rc.2...v2.0.0-rc.3) (2024-07-21)

### Code Refactoring

* retire connector plugin specific container images, fix docs ([24b5888](https://github.com/hyperledger/cactus/commit/24b5888247d134ea417fc0e83dccc9826b4075f3))

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

# [2.0.0-rc.2](https://github.com/hyperledger/cactus/compare/v2.0.0-rc.1...v2.0.0-rc.2) (2024-07-03)

**Note:** Version bump only for package @hyperledger/cactus-test-geth-ledger

# [2.0.0-rc.1](https://github.com/hyperledger/cactus/compare/v2.0.0-alpha.2...v2.0.0-rc.1) (2024-06-14)

### Features

* **cactus-plugin-ledger-connector-ethereum:** add stress test ([55fa26e](https://github.com/hyperledger/cactus/commit/55fa26ef41d405b26da02b099418da5fa281c78f)), closes [#2631](https://github.com/hyperledger/cactus/issues/2631)
* **cactus-plugin-ledger-connector-ethereum:** update web3js to 4.X ([55f82c9](https://github.com/hyperledger/cactus/commit/55f82c9568b3e875de4f3ceb89a828f8b23d65be)), closes [#2580](https://github.com/hyperledger/cactus/issues/2580) [#2535](https://github.com/hyperledger/cactus/issues/2535) [#2578](https://github.com/hyperledger/cactus/issues/2578)
* **cactus-plugin-persistence-ethereum:** use openapi ethereum connector ([b8f9b79](https://github.com/hyperledger/cactus/commit/b8f9b79daa7a97cbd75325eba00c7458bfed5ce5)), closes [#2631](https://github.com/hyperledger/cactus/issues/2631)

# [2.0.0-alpha.2](https://github.com/hyperledger/cactus/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2023-09-27)

### Features

* **geth-all-in-one:** add ethereum test image and helper class ([fb4231f](https://github.com/hyperledger/cactus/commit/fb4231f3e8ddc2b7c4aadddf62dac759b7a62d44)), closes [#2577](https://github.com/hyperledger/cactus/issues/2577)
