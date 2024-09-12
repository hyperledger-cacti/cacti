# `@hyperledger/cactus-common-example-server`

This is a module for common server setup used by some sample application. Do not use on production.

## Usage samples
	- [cactus-example-electricity-trade](../../examples/cactus-example-electricity-trade)
	- [cactus-example-discounted-asset-trade](../../examples/cactus-example-discounted-asset-trade)

## Docker
- Docker image of this package is used mostly as a base for other applications and plugins (BLP, socketio connectors).
- Docker build process will use artifacts from the latest build. Make sure `./dist` contains the version you want to dockerize.

```
# Build
docker build . -t cactus-common-example-server
```
