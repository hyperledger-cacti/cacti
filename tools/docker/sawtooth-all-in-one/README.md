# sawtooth-all-in-one

An all in one sawtooth docker image as described in [Sawtooth Documentation](https://sawtooth.hyperledger.org/docs/1.2/app_developers_guide/creating_sawtooth_network.html).
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
DOCKER_BUILDKIT=1 docker build ./tools/docker/sawtooth-all-in-one/ -t cactus-sawtooth-all-in-one

# Run
docker run --name sawtooth_all_in_one_ledger_1x --detach --privileged -p 8008:8008 cactus-sawtooth-all-in-one
```

## Shell
Image contains a tool that simplifies executing sawtooth commands on the test ledger.

### Example - set and list intkeys

``` bash
# Set new key
docker exec -t sawtooth_all_in_one_ledger_1x shell intkey set MI000001 50 --url http://rest-api:8008

# List all keys
docker exec -t sawtooth_all_in_one_ledger_1x shell intkey list --url http://rest-api:8008
```

## Test Setup
- There is a helper class that can be used to setup this sawtooth ledger container from JS/TS test - [sawtooth-test-ledger.ts](../../../packages/cactus-test-tooling/src/main/typescript/sawtooth/sawtooth-test-ledger.ts)
- For use examples see sawtooth connector tests.
