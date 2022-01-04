# test-npm-registry container image

Used for locally verifying publishing commands before using them on npm publicly.
The image is configured by default to not require any authentication at all and
therefore it is a great fit for testing, but most never be used for production
deployments of any kind.

The reason why this image had to be created was because some of our packages
that have front-end code embedded in them can take up more than 10MB in size
and verdaccio by default does not allow bigger request payloads than that so
we had to increase it to a higher limit via the configuration file `config.yaml`.

## Usage

1. Start the container and publish it's port `4873` to the host machine:
    ```sh
    docker run -it --rm --publish 4873:4873 ghcr.io/hyperledger/cactus-test-npm-registry:2021-12-20-81fd36c7
    ```
2. Verify a canary publish with this container instead of using npmjs.com
by specifying the registry URL as http://localhost:4873 such as
    ```sh
    npx lerna publish \
        --canary \
        --force-publish \
        --dist-tag $(git branch --show-current) \
        --preid $(git branch --show-current).$(git rev-parse --short HEAD) \
        --registry http://localhost:4873
    ```

## Build image locally:

```sh
DOCKER_BUILDKIT=1 docker build ./tools/docker/test-npm-registry/ -t ctnr
```

## Run image locally

```sh
docker run -it --rm --publish 4873:4873 ctnr
```
