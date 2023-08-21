# iroha2-all-in-one

An all in one Iroha V2 docker image as described in [Iroha 2 Documentation](https://hyperledger.github.io/iroha-2-docs/guide/build-and-install.html).
- This docker image is for `testing` and `development` only.
- **Do NOT use in production!**

## Usage

### Docker Compose
``` bash
./script-start-docker.sh
```

or manually:

``` bash
docker-compose build && docker-compose up -d
```

### Docker
``` bash
# Build
DOCKER_BUILDKIT=1 docker build ./tools/docker/iroha2-all-in-one/ -t cactus_iroha2_all_in_one

# Run
docker run --rm --name iroha2_aio_testnet --detach --privileged -p 8080:8080 -p 8180:8180 cactus_iroha2_all_in_one
```

## iroha_client_cli
- Image contains a proxy script for executing `iroha_client_cli` commands.
- Learn more from [Iroha 2 Bash tutorial](https://hyperledger.github.io/iroha-2-docs/guide/bash.html)
- Make sure the container is `healthy` before using the CLI.

### Example

``` bash
# List all assets
docker exec -ti iroha2_aio_testnet iroha_client_cli asset list all

# Register new domain
docker exec -ti iroha2_aio_testnet iroha_client_cli domain register --id="looking_glass"

# List all domains
docker exec -ti iroha2_aio_testnet iroha_client_cli domain list all
```

## Test Setup
- Use typescript [Iroha2TestLedger helper class](../../../packages/cactus-test-tooling/src/main/typescript/iroha/iroha2-test-ledger.ts) to start this ledger and use it from inside of automatic test.
