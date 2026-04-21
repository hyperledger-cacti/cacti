# Besu All in One Image

An all in one Besu + Orion image that uses about 0.5 GB of RAM and one vCPU worth of hardware resources idling.
This makes it much easier to pull up for tests that are about functionality rather than running a production grade ledger.

Comes equipped with supervisord which provides access to tailing logs of both orion and besu via a web based user interface that you can access via the port 9001 of the container (granted you exposed it on your host).

## Networking: Docker Container Communication

### Host Binding Configuration

**Important**: Besu is configured to bind to `0.0.0.0` (all interfaces) for RPC and WebSocket endpoints. This is required for:
- Inter-container communication between Docker services
- Proper network isolation in containerized environments
- Production-ready deployments

The following environment variables control the RPC host bindings:
- `BESU_RPC_HTTP_HOST=0.0.0.0` (default) - Besu HTTP RPC endpoint listens on all interfaces
- `BESU_RPC_WS_HOST=0.0.0.0` (default) - Besu WebSocket RPC endpoint listens on all interfaces

#### Why 0.0.0.0?

In Docker, binding to `127.0.0.1` or `localhost` makes the service only accessible from within the same container, not from other containers. To allow other services (e.g., `cactus-api-server`) to communicate with Besu:

- **127.0.0.1** - Only accessible from the same container (breaks Docker networking)
- **0.0.0.0** - Accessible from all interfaces including other containers (correct for Docker)

#### Inter-container Communication Example

Use container names (DNS) for communication between services:

```yaml
# In docker-compose or application config:
# Instead of: http://127.0.0.1:8545
# Use: http://besu-aio:8545
```

See `docker-compose.yml` for the correct configuration of plugins connecting to Besu.

### Environment Variables

Override default RPC host bindings (if needed):

```bash
# Run with different host bindings
# NOTE: Binding to 127.0.0.1 restricts access to in-container clients only
# and will break access via published ports and from other containers
docker run \
  -e BESU_RPC_HTTP_HOST=127.0.0.1 \
  -e BESU_RPC_WS_HOST=127.0.0.1 \
  -p 8545:8545 \
  -p 8546:8546 \
  ghcr.io/hyperledger-cacti/besu-all-in-one:local
```


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

## Testing Inter-Container Communication

To verify that Besu is accessible from other Docker containers, run the integration test:

```sh
# Navigate to the besu-all-in-one directory
cd tools/docker/besu-all-in-one

# Run the integration test
./test-inter-container-communication.sh
```

This test will:
1. Start the Besu container
2. Test HTTP RPC endpoint accessibility: `http://besu-aio:8545`
3. Test WebSocket endpoint accessibility: `ws://besu-aio:8546`
4. Verify multiple RPC calls work correctly
5. Confirm Besu is bound to 0.0.0.0
6. Clean up all test containers

Expected output:
```
[PASS] HTTP RPC endpoint is accessible via http://besu-aio:8545
[PASS] eth_chainId RPC call successful
[PASS] eth_blockNumber RPC call successful
[PASS] eth_accounts RPC call successful
[PASS] Besu is correctly bound to 0.0.0.0
All inter-container communication tests passed!
```

## Manual Testing

Test from command line using a temporary container:

```bash
# Test HTTP RPC from another container
docker run --rm \
  --network besu-all-in-one_default \
  curlimages/curl:8.8.0 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  http://besu-aio:8545

# Expected response:
# {"jsonrpc":"2.0","result":"0x539","id":1}
```

## Logs of Besu and Orion via supervisord web UI:

Navigate your browser to http://localhost:9001