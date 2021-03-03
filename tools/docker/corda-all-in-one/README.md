# cactus-corda-all-in-one

> This docker image is for `testing` and `development` only.
> Do NOT use in production!

## Usage

### Build and Run Image Locally

```sh
DOCKER_BUILDKIT=1 docker build ./tools/docker/corda-all-in-one/ -t caio
docker run --rm --privileged caio
```
