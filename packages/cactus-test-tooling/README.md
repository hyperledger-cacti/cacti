# `@hyperledger/cactus-test-tooling`

> TODO: description

## Usage

```
// TODO: DEMONSTRATE API
```
## Docker image for the ws-identity server

A docker image of the [ws-identity server](https://hub.docker.com/repository/docker/brioux/ws-identity) is used to test integration of WS-X.509 credential type in the fabric connector plugin.

[ws-identity](https://github.com/brioux/ws-identity) includes A Docker file to build the image:
clone the repo, install packages, build src and the image
```
npm install
npm run build
docker build . -t [image-name]
```

