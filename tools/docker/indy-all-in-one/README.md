# indy-all-in-one

An all in one Indy ledger image.

- Image is based on the upstream - https://github.com/hyperledger/indy-vdr/blob/main/ci/indy-pool.dockerfile
- This docker image is for `testing` and `development` only.
- **Do NOT use in production!**

## Usage

### Docker Compose

```bash
./script-start-docker.sh

# or
mkdir -p "/tmp/indy-all-in-one/"
docker-compose build && docker-compose up -d
```

### Docker

```bash
# Build
DOCKER_BUILDKIT=1 docker build ./tools/docker/indy-all-in-one/ -t cactus_indy_all_in_one

# Run
docker run --rm --name indy-all-in-one --detach -p 9703:9703 -p 9704:9704 -p 9705:9705 -p 9706:9706 -p 9707:9707 -p 9708:9708 -v /tmp/indy-all-in-one/:/var/lib/indy/sandbox/ cactus_indy_all_in_one
```

### Cleanup

```bash
./script-cleanup.sh

# or
docker compose down
rm -fr /tmp/indy-all-in-one/*
sudo find ~/.afj/data/wallet/ -iname '*cacti*' -exec rm -fr {} \;
```

## Test

### cactus-example-discounted-asset-trade-client
- `cactus-example-discounted-asset-trade-client` can be used to quickly check if this ledger is working correctly.
- Use `setup-credentials` from that package to register, issue and proof employment credential between `Issuer` and `Alice` agents.
- Run `cactus-example-discounted-asset-trade` for complete example scenario.

### Typescript Setup Class
- There's no typescript setup class yet (TODO)