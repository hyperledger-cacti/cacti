# cactus-corda-all-in-one

> This docker image is for `testing` and `development` only.
> Do NOT use in production!

## Usage

### Build and Run Image Locally

```sh
DOCKER_BUILDKIT=1 docker build ./tools/docker/corda-all-in-one/ -t caio
docker run --rm --privileged caio
```

# cactus-corda-4-8-all-in-one

> This docker image is for `testing` and `development` only.
> Do NOT use in production!

## Usage

### Build and Run Image Locally

```sh
DOCKER_BUILDKIT=1 docker build ./tools/docker/corda-all-in-one/ -f ./tools/docker/corda-all-in-one/corda-v4_8/Dockerfile -t caio48
docker run --rm --privileged caio48
```

# cactus-corda-4-8-all-in-one-flowdb

> This docker image is for `testing` and `development` only.
> Do NOT use in production!

## Customization

`build.gradle` file from this sample has defined a single node called PartyA. It was modified to deploy the same nodes as in the obligation sample to make it work with our CordaTestLedger:
- Notary
- ParticipantA
- ParticipantB
- ParticipantC

## Usage

### Build and Run Image Locally

```sh
DOCKER_BUILDKIT=1 docker build ./tools/docker/corda-all-in-one/corda-v4_8-flowdb/ -t caio48-flowdb
docker run --rm --privileged caio48-flowdb
```