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
docker build ./tools/docker/corda-all-in-one/ -f ./tools/docker/corda-all-in-one/corda-v4_8/Dockerfile -t caio48
docker run --rm --privileged caio48
```