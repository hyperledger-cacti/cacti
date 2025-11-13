# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.0.0](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.7...v2.0.0) (2024-10-15)

**Note:** Version bump only for package @hyperledger/cacti-ledger-browser

# [2.0.0-rc.6](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.5...v2.0.0-rc.6) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cacti-ledger-browser

# [2.0.0-rc.5](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.4...v2.0.0-rc.5) (2024-09-30)

**Note:** Version bump only for package @hyperledger/cacti-ledger-browser

# [2.0.0-rc.4](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.3...v2.0.0-rc.4) (2024-09-08)

### Features

* **ledger-browser:** implement dynamic app setup ([0e368de](https://github.com/hyperledger/cacti/commit/0e368de059d30e099a8979989949ca34834ffdf9)), closes [#3347](https://github.com/hyperledger/cacti/issues/3347)
* **ledger-browser:** refactor home page ([500ac9b](https://github.com/hyperledger/cacti/commit/500ac9ba8ac9d6694e0838d34871028ace896a9c)), closes [#3320](https://github.com/hyperledger/cacti/issues/3320)
* **ledger-browser:** rewrite fabric application ([ecf074c](https://github.com/hyperledger/cacti/commit/ecf074c8c6d5ed67eed2e490c653b41aae691c19)), closes [#3308](https://github.com/hyperledger/cacti/issues/3308) [#3279](https://github.com/hyperledger/cacti/issues/3279)
* **persistence-ethereum:** migrate to separate db schema ([b160c52](https://github.com/hyperledger/cacti/commit/b160c52f1a99f8019beb8af9d4f8c0b46cf1953c)), closes [#3340](https://github.com/hyperledger/cacti/issues/3340)

# [2.0.0-rc.3](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.2...v2.0.0-rc.3) (2024-07-21)

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

# [2.0.0-rc.2](https://github.com/hyperledger/cacti/compare/v2.0.0-rc.1...v2.0.0-rc.2) (2024-07-03)

### Features

* **ledger-browser:** refactor eth dashboard page ([c69fb4c](https://github.com/hyperledger/cacti/commit/c69fb4c5982669d335870218c617ff847fbe1db9)), closes [#3207](https://github.com/hyperledger/cacti/issues/3207)
* **ledger-browser:** refactor eth tokens page into accounts page ([0b0c22c](https://github.com/hyperledger/cacti/commit/0b0c22cd39fb67e809595ceb23fb8b3c2a0f1da0)), closes [#3237](https://github.com/hyperledger/cacti/issues/3237)
* **ledger-browser:** refactor routing, improve UI ([3fcc7a1](https://github.com/hyperledger/cacti/commit/3fcc7a1215435341db927ec211af598a0a298d44))
* **ledger-browser:** use react query in eth app ([4d3fb7e](https://github.com/hyperledger/cacti/commit/4d3fb7e25d78804ffda498e9cdd4600bf0a50f0c)), closes [#3203](https://github.com/hyperledger/cacti/issues/3203)

# [2.0.0-rc.1](https://github.com/hyperledger/cacti/compare/v2.0.0-alpha.2...v2.0.0-rc.1) (2024-06-14)

### Bug Fixes

* **ledger-browser:** fix vulnerability CVE-2022-37601 ([55c7d3d](https://github.com/hyperledger/cacti/commit/55c7d3d8054af35eb903ee903a91b8f23b905998))
