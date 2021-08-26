# @hyperledger/cactus-quorum-multi-party-all-in-one<!-- omit in toc -->

## Table of Contents<!-- omit in toc -->

- [Summary](#summary)
- [Usage via Public Container Registry](#usage-via-public-container-registry)
- [List endpoints and services](#list-endpoints-and-services)
- [2021-08-17 09:39:45,048 DEBG 'quorum-network' stdout output:](#2021-08-17-093945048-debg-quorum-network-stdout-output)
- [List endpoints and services](#list-endpoints-and-services-1)

## Summary

A container image that hosts a Quorum network which is
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
  ghcr.io/hyperledger/cactus-quorum-multi-party-all-in-one:latest

```

*************************************
Quorum Dev Quickstart 
*************************************

----------------------------------
List endpoints and services
----------------------------------
JSON-RPC HTTP service endpoint                 : http://localhost:8545
2021-08-17 09:39:45,048 DEBG 'quorum-network' stdout output:
----------------------------------
List endpoints and services
----------------------------------
JSON-RPC HTTP service endpoint                 : http://localhost:8545

JSON-RPC WebSocket service endpoint            : ws://localhost:8546
Web block explorer address                     : http://localhost:25000/
2021-08-17 09:39:45,049 DEBG 'quorum-network' stdout output:
JSON-RPC WebSocket service endpoint            : ws://localhost:8546
Web block explorer address                     : http://localhost:25000/


For more information on the endpoints and services, refer to README.md in the installation directory.
****************************************************************
2021-08-17 09:39:47,429 DEBG 'quorum-network' stdout output:

For more information on the endpoints and services, refer to README.md in the installation directory.
****************************************************************

```

## Building the Image Locally

```sh
DOCKER_BUILDKIT=1 docker build ./tools/docker/quorum-multi-party-all-in-one/ --progress=plain --tag cqmpaio
```

```sh
docker run --rm --privileged --publish-all cqmpaio
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
  cqmpaio
```
