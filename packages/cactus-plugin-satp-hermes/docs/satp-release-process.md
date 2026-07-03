# SATP Hermes Release Process

## Overview

The release is driven by a single entrypoint workflow,
`satp-hermes-release-pipeline.yaml`, which orchestrates publishing two artifacts
from `packages/cactus-plugin-satp-hermes`:
the NPM package `@hyperledger-cacti/cactus-plugin-satp-hermes` to the GitHub
Package Registry (`npm.pkg.github.com` under `hyperledger-cacti`) via
`satp-hermes-publish-npmjs-gateway-sdk.yaml`, and the Docker image
`cacti-satp-hermes-gateway` (to GHCR under `hyperledger-cacti` and to
[Docker Hub](https://hub.docker.com/r/hyperledger/cacti-satp-hermes-gateway)
under the `hyperledger` org) via `satp-hermes-publish-docker.yaml`.

Publishing to npmjs.org is handled separately by the repo-wide
`publish-npm.yaml` workflow (OIDC trusted publishing via the `lfdt-npm`
account), not by this pipeline.

## Build Types

**Dev builds — on SATP Hermes changes.** A push to `main`, `satp-dev`, or
`satp-stg` that touches `packages/cactus-plugin-satp-hermes/**` or
`.github/workflows/satp-hermes-*.yaml` publishes a `dev` build, versioned
`{base-version}-dev.{short-sha}` (e.g. `3.0.0-beta.1-dev.abc1234`). Dev Docker
images are pushed to **GHCR only**; Docker Hub receives release builds only.

**Production releases — on tag push.** Pushing a `v{X.Y.Z}` version tag (the
same `vX.Y.Z` scheme Cacti uses for repo-wide releases) builds from that commit
and publishes the exact version to every registry (GHCR + Docker Hub), moving
`latest` (or, for `-rc` tags, the `rc` channel). The tag-push path runs the
full test suite first and publishes under the `prod` GitHub Environment.

Examples below assume  version `3.0.0-beta.1` and commit `abc1234`.
The `dev`/`latest`/`rc` names are npm **dist-tags** (and Docker moving
tags) that always point at the newest matching build.

For dev:

```bash
# Dev (main / satp-dev / satp-stg) → 3.0.0-beta.1-dev.abc1234, npm dist-tag `dev`
npm install @hyperledger-cacti/cactus-plugin-satp-hermes@dev                      # newest dev build
npm install @hyperledger-cacti/cactus-plugin-satp-hermes@3.0.0-beta.1-dev.abc1234 # pin exact version
docker pull ghcr.io/hyperledger-cacti/cacti-satp-hermes-gateway:3.0.0-beta.1-dev.abc1234
docker pull hyperledger/cacti-satp-hermes-gateway:3.0.0-beta.1-dev.abc1234
```

For prod:

```bash
# Release: tag v3.0.0 → version 3.0.0, npm `latest` + docker `latest`
npm install @hyperledger-cacti/cactus-plugin-satp-hermes                          # = @latest
npm install @hyperledger-cacti/cactus-plugin-satp-hermes@3.0.0                    # pin exact version
docker pull ghcr.io/hyperledger-cacti/cacti-satp-hermes-gateway:3.0.0
docker pull ghcr.io/hyperledger-cacti/cacti-satp-hermes-gateway:latest
docker pull hyperledger/cacti-satp-hermes-gateway:3.0.0
docker pull hyperledger/cacti-satp-hermes-gateway:latest

# Release candidate: tag v3.0.0-rc.1 → version 3.0.0-rc.1, dist-tag `rc` (NOT `latest`)
npm install @hyperledger-cacti/cactus-plugin-satp-hermes@rc
docker pull ghcr.io/hyperledger-cacti/cacti-satp-hermes-gateway:3.0.0-rc.1
docker pull ghcr.io/hyperledger-cacti/cacti-satp-hermes-gateway:rc
docker pull hyperledger/cacti-satp-hermes-gateway:3.0.0-rc.1
docker pull hyperledger/cacti-satp-hermes-gateway:rc
```

## Release Checklist

Make sure `CHANGELOG.md` is up to date and the branch is green (production
requires passing tests).

```bash
git tag v3.0.0
git push origin v3.0.0
```

Verify:

```bash
npm view @hyperledger-cacti/cactus-plugin-satp-hermes@latest version
docker pull ghcr.io/hyperledger-cacti/cacti-satp-hermes-gateway:latest
docker pull hyperledger/cacti-satp-hermes-gateway:latest
```
