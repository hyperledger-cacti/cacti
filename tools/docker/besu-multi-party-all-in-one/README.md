# @hyperledger/cactus-besu-multi-party-all-in-one<!-- omit in toc -->

## Table of Contents<!-- omit in toc -->

- [Summary](#summary)
- [Usage via Public Container Registry](#usage-via-public-container-registry)
- [List endpoints and services](#list-endpoints-and-services)
- [2021-06-16 22:23:46,653 DEBG 'besu-network' stdout output:](#2021-06-16-222346653-debg-besu-network-stdout-output)
- [List endpoints and services](#list-endpoints-and-services-1)

## Summary

A container image that hosts a Besu network which is
- Has multiple nodes and validators
- Supports transaction privacy (`privateFrom` and `privateFor`)

## Usage via Public Container Registry

```sh
docker run \
  --rm \
  --privileged \
  --publish 2222:22 \
  --publish 3000:3000 \
  --publish 8545:8545 \
  --publish 8546:8546 \
  --publish 9001:9001 \
  --publish 9081:9081 \
  --publish 9082:9082 \
  --publish 9083:9083 \
  --publish 9090:9090 \
  --publish 18545:18545 \
  --publish 20000:20000 \
  --publish 20001:20001 \
  --publish 20002:20002 \
  --publish 20003:20003 \
  --publish 20004:20004 \
  --publish 20005:20005 \
  --publish 25000:25000 \
  petermetz/cactus-besu-multi-party-all-in-one:0.1.2
```

*************************************
Quorum Dev Quickstart
*************************************

----------------------------------
List endpoints and services
----------------------------------
JSON-RPC HTTP service endpoint      : http://localhost:8545
JSON-RPC WebSocket service endpoint : ws://localhost:8546
2021-06-16 22:23:46,653 DEBG 'besu-network' stdout output:
----------------------------------
List endpoints and services
----------------------------------
JSON-RPC HTTP service endpoint      : http://localhost:8545
JSON-RPC WebSocket service endpoint : ws://localhost:8546

Web block explorer address          : http://localhost:25000/
2021-06-16 22:23:46,653 DEBG 'besu-network' stdout output:
Web block explorer address          : http://localhost:25000/

Prometheus address                  : http://localhost:9090/graph
2021-06-16 22:23:47,842 DEBG 'besu-network' stdout output:
Prometheus address                  : http://localhost:9090/graph

Grafana address                     : http://localhost:3000/d/XE4V0WGZz/besu-overview?orgId=1&refresh=10s&from=now-30m&to=now&var-system=All

```

## Building the Image Locally

```sh
DOCKER_BUILDKIT=1 docker build ./tools/docker/besu-multi-party-all-in-one/ --progress=plain --tag cbmpaio
```

```sh
docker run --rm --privileged --publish-all cbmpaio
```

```sh
docker run \
  --rm \
  --privileged \
  --publish 2222:22 \
  --publish 3000:3000 \
  --publish 8545:8545 \
  --publish 8546:8546 \
  --publish 9001:9001 \
  --publish 9081:9081 \
  --publish 9082:9082 \
  --publish 9083:9083 \
  --publish 9090:9090 \
  --publish 18545:18545 \
  --publish 20000:20000 \
  --publish 20001:20001 \
  --publish 20002:20002 \
  --publish 20003:20003 \
  --publish 20004:20004 \
  --publish 20005:20005 \
  --publish 25000:25000 \
  cbmpaio
```
