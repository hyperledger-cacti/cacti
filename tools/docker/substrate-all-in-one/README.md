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
docker run -p 9944:9944 anmol02/cactus-substrate-aio:2023-10-28
```

## Build

```sh
docker build ./tools/docker/substrate-all-in-one/ -f ./tools/docker/substrate-all-in-one/Dockerfile --tag saio
```
