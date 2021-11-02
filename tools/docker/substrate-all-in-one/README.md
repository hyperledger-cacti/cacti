# @hyperledger/cactus-substrate-all-in-one<!-- omit in toc -->

A container image that can holds the default Substrate test ledger (and the corresponding front-end).
This image can be used for development of Substrate-based chains (including but not limited to pallets, smart contracts) and connectors.

This is the test ledger used by the `polkadot-connector` package.

## Table of Contents<!-- omit in toc -->

- [Usage](#usage)
- [Build](#build)

## Usage
To run the test ledger, use:

```sh
docker run --expose HOST_PORT --env WS_PORT=WS_PORT --env WORKING_DIR=/var/www/node-template --env CONTAINER_NAME=contracts-node-template-ovl --env CARGO_HOME=/var/www/node-template/.cargo -p HOST_PORT:WS_PORT rafaelapb/cactus-substrate-aio:2021-11-02-fix



```

Example:


```
docker run --expose 9946 --env WS_PORT=9947 --env WORKING_DIR=/var/www/node-template --env CONTAINER_NAME=contracts-node-template-ovl --env CARGO_HOME=/var/www/node-template/.cargo -p 9940:9947 rafaelapb/cactus-substrate-aio:2021-11-02-fix


```

## Build

```sh
DOCKER_BUILDKIT=1 docker build ./tools/docker/substrate-all-in-one/ -f ./tools/docker/substrate-all-in-one/Dockerfile --tag saio
```
