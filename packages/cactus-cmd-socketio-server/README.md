# `@hyperledger/cactus-cmd-socketio-server`

This module is responsible for providing the cactus node server using socket.io connection to validators

## Usage samples
- To confirm the operation of this package, please refer to the following business-logic sample application:
	- [cactus-example-electricity-trade](../../examples/cactus-example-electricity-trade)
	- [cactus-example-discounted-asset-trade](../../examples/cactus-example-discounted-asset-trade)

## Docker
- Docker image of this package is used mostly as a base for other applications and plugins (BLP, socketio connectors).
- Docker build process will use artifacts from the latest build. Make sure `./dist` contains the version you want to dockerize.

```
# Build
docker build . -t cactus-cmd-socketio-server
```