# Launching Hyperledger Indy pool and validator

## Abstract

scripts in this directory builds, starts indy node pool and the cactus validator for indy

## What will be built, run by using the scripts

One bridge network and three containers will be started by `docker-compse up` command (after building the images).

![Indy node pool and validator](./fig1.svg)

- Network
  - name: indy_net
  - subnet: 172.16.0.0/24
- Containers
  - nginx container
    - proxies requests from verifiers to the validator in the python container
      - NOTE:  At the moment, this container does nothing. 
      - TODO: Configure to proxy requests. Enable uWSGI (towards the python container).
    - IP address: 172.16.0.3 on indy_net
    - port 10080 is open to the world 
  - python container
    - validator code in the container receives requests from validators, which requests are proxied by the nginx container, and interacts with indy nodes in the indy_pool container
      - NOTE:  At the moment, this container does nothing. 
      - TODO: write validator code.
    - IP address: 172.16.0.4
    - port 80 is open to containers on indy_net
  - indy_pool container
    - indy nodes run in this container and serves requests from validator in the python container
      - it mounts sandbox directory of host environment to save the status of Indy nodes
    - IP address: 172.16.0.2
    - ports 9701-9708 are open to containers on indy_net

## How to build

- get a copy of indy-sdk
- edit `.env` to set environment variables
- run `docker-compose build`

### How to get a copy of indy-sdk

You can use the following command to get a copy of indy-sdk source tree. 

```
git clone https://github.com/hyperledger/indy-sdk.git -b v1.16.0
```
### How to edit `.env` file

Edit `.env` file in this directory to set the environment variables.

```
INDY_SDK_ROOT=../../git/indy-sdk/ci
HTTP_PROXY=http://<proxy_host>:<proxy_port>
NO_PROXY=
```

`INDY_SDK_ROOT` is the location of a Dockerfile (`indy-pool.dockerfile`) in the indy-sdk source tree, which will be used by the docker-compose command in this build process.

Set `HTTP_PROXY` and `NO_PROXY` if your network requires HTTP proxy access to reach the internet.  


### How to build docker images

Use this command to build images

```
docker-compose build
```
## How to start and stop containers

Use this command to start containers.

```
docker-compse up 
```

Press CTRL-C to stop the containers.

