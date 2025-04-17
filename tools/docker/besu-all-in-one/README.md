# Besu All in One Image

An all in one Besu + Orion image that uses about 0.5 GB of RAM and one vCPU worth of hardware resources idling.
This makes it much easier to pull up for tests that are about functionality rather than running a production grade ledger.

Comes equipped with supervisord which provides access to tailing logs of both orion and besu via a web based user interface that you can access via the port 9001 of the container (granted you exposed it on your host).

## Build an image locally

* To build the default besu image locally use:
  ```sh
  docker build ./tools/docker/besu-all-in-one/ \
    --file=./tools/docker/besu-all-in-one/Dockerfile \
    --tag baio:local \
    --tag ghcr.io/hyperledger-cacti/besu-all-in-one:local \
    --tag ghcr.io/hyperledger-cacti/besu-all-in-one:$(git describe --contains --all HEAD | sed -r 's,/,-,g')_$(git rev-parse --short HEAD)
  ```


## Shell into a running container:

```sh
docker run -it --entrypoint bash ghcr.io/hyperledger-cacti/besu-all-in-one:local
```


## Easiest way to run the image with defaults

```sh
docker-compose up
```

The following ports are open on the container:

```yaml
- 8545:8545/tcp # besu RPC - HTTP
- 8546:8546/tcp # besu RPC - WebSocket
- 8888:8888/tcp # orion - HTTP
- 9001:9001/tcp # supervisord - HTTP
- 9545:9545/tcp # besu metrics
```

## Without docker-compose

```sh
docker run -p 0.0.0.0:8545:8545/tcp  -p 0.0.0.0:8546:8546/tcp  -p 0.0.0.0:8888:8888/tcp  -p 0.0.0.0:9001:9001/tcp  -p 0.0.0.0:9545:9545/tcp ghcr.io/hyperledger-cacti/besu-all-in-one:local
```

## Logs of Besu and Orion via supervisord web UI:

Navigate your browser to http://localhost:9001

