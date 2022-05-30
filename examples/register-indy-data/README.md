# req_discounted_cartrade

Simple tool for indy setup and sending requests to `discounted-cartrade` sample app.

# Build
- Use script to build base container `indy-sdk-cli` and tool container `req_discounted_cartrade`
```
./script-build-docker.sh
```

# Usage
- First, ensure indy test pool is already running and docker network `indy-testnet_indy_net` was created.

### Send discounted-cartrade request
```
docker run --rm -ti -v/etc/cactus/:/etc/cactus/ --net="indy-testnet_indy_net" req_discounted_cartrade
```

### Recreate the proof and send discounted-cartrade request
```
docker run --rm -ti -v/etc/cactus/:/etc/cactus/ --net="indy-testnet_indy_net" req_discounted_cartrade --force
```

### Generate proof only
```
docker run --rm -ti -v/etc/cactus/:/etc/cactus/ --net="indy-testnet_indy_net" req_discounted_cartrade --proof_only
```

### Recreate the proof only
```
docker run --rm -ti -v/etc/cactus/:/etc/cactus/ --net="indy-testnet_indy_net" req_discounted_cartrade --proof_only --force
```
