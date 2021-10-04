# @hyperledger/cactus-substrate-all-in-one<!-- omit in toc -->

A container image that can holds the default Substrate test ledger (and the corresponding front-end).
This image can be used for development of Substrate-based chains (including but not limited to pallets, smart contracts) and connectors.

## Table of Contents<!-- omit in toc -->

- [Usage](#usage)
- [Build](#build)

## Usage
```sh
docker run -t -p 9944:9944 --name substrate-contracts-node saio:latest
```

## Build

```sh
DOCKER_BUILDKIT=1 docker build -f ./tools/docker/substrate-all-in-one/Dockerfile . --tag saio
```
