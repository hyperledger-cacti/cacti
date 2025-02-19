# DAML All in One Image

An all in one DAML docker image with the `sample ledger contracts`.
- This docker image is for `testing` and `development` only.
- **Do NOT use in production!**

## Build an image locally

To build the daml-all-in-one image locally, use:
```sh
DOCKER_BUILDKIT=1 docker build \
  --file ./tools/docker/daml-all-in-one/Dockerfile \
  ./tools/docker/daml-all-in-one/ \
   --tag daio \
   --tag daml-all-in-one \
   --tag ghcr.io/hyperledger-cacti/daml-all-in-one:$(date +"%Y-%m-%dT%H-%M-%S" --utc)-dev-$(git rev-parse --short HEAD)
```

## Running daml-all-in-one container

```sh
docker run --privileged -p 6865:6865 -p 7575:7575 daml-all-in-one
```

The following ports are open on the container:

```yaml
- 6865:6865 # DAML Navigator
- 7575:7575 # DAML API entrypoint

```
## Logs of DAML via supervisord web UI:

Navigate your browser to http://localhost:9001