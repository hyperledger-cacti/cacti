# req_discounted_cartrade

Simple tool for setup and sending requests to discounted-cartrade sample app

# How to use
- Setup discounted-cartrade first
- Build clientbase from `tools/docker/indy-testnet/clientbase`
- Build this container `docker build . -t req_discounted_cartrade`
- `mkdir -p /etc/cactus/indy-validator/`

## Usage

### Generate proof only
- Will replace existing proof file (like called with -f flag)

```
docker run --rm -ti -v/etc/cactus/:/etc/cactus/ --net="host" req_discounted_cartrade --proof_only
```

### Send discounted-cartrade request
```
docker run --rm -ti -v/etc/cactus/:/etc/cactus/ --net="host" req_discounted_cartrade
```

### Recreate the proof and send discounted-cartrade request
```
docker run --rm -ti -v/etc/cactus/:/etc/cactus/ --net="host" req_discounted_cartrade --force
```