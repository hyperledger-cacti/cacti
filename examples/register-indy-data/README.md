# register-indy-data

Simple tool for indy setup and sending requests to `cactus-example-discounted-asset-trade` sample app.

# Build
- Use script to build base container `indy-sdk-cli` and tool container `register-indy-data`
```
./script-build-docker.sh
```

# Usage
- First, ensure indy test pool is already running and docker network `indy-testnet_indy_net` was created.

### Send cactus-example-discounted-asset-trade request
```
docker run --rm -ti -v/etc/cactus/:/etc/cactus/ --net="indy-testnet_indy_net" register-indy-data
```

### Recreate the proof and send cactus-example-discounted-asset-trade request
```
docker run --rm -ti -v/etc/cactus/:/etc/cactus/ --net="indy-testnet_indy_net" register-indy-data --force
```

### Generate proof only
```
docker run --rm -ti -v/etc/cactus/:/etc/cactus/ --net="indy-testnet_indy_net" register-indy-data --proof_only
```

### Recreate the proof only
```
docker run --rm -ti -v/etc/cactus/:/etc/cactus/ --net="indy-testnet_indy_net" register-indy-data --proof_only --force
```
