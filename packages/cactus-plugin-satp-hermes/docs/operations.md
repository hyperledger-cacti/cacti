<!-- --8<-- [start:content] -->

# Operating SATP Hermes

## Deployment topology

The tracked [Compose file](https://github.com/hyperledger-cacti/cacti/blob/main/packages/cactus-plugin-satp-hermes/docker-compose-satp.yml) starts one SATP Hermes gateway and one Grafana OpenTelemetry LGTM container. The gateway publishes its protocol server on port `3010`, client service on port `3011`, and OpenAPI service on container port `4010`. The tracked Compose mapping exposes the OpenAPI service on host port `3012`.

The gateway CLI uses `/opt/cacti/satp-hermes` as its default working directory. The tracked Compose service mounts the Gateway 1 development configuration at `/opt/cacti/satp-hermes/config/config.json`, which is the path loaded by the container entry point. This example connects to an Ethereum JSON-RPC endpoint at `http://host.docker.internal:8545`; start the corresponding local development ledger before the gateway. Replace the example keys, credentials, and endpoint configuration for non-development deployments. See [Gateway Configuration][package-doc-configuration-md] for the configuration schema and path details.

## Container environment

| Variable                      | Tracked value or purpose                                            |
| ----------------------------- | ------------------------------------------------------------------- |
| `NODE_ENV`                    | `production` in the gateway image.                                  |
| `TZ`                          | `Etc/UTC` in the gateway image.                                     |
| `DATABASE_CLIENT`             | `sqlite3` in the gateway image.                                     |
| `DATABASE_NAME`               | `/opt/cacti/satp-hermes/database/satp.sqlite` in the gateway image. |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` in the tracked Compose service.                     |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://otel-lgtm:4318` in the tracked Compose service.             |

Database configuration modules also support the PostgreSQL variables described in [Database and Migrations][package-doc-database-md].

## Health and status endpoints

- `GET /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/healthcheck` reports service health. The container health check calls this endpoint on port `4010` and expects `{"status":"AVAILABLE"}`.
- `GET /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/status` queries a transfer session by `sessionID`.

The [OpenAPI document](https://github.com/hyperledger-cacti/cacti/blob/main/packages/cactus-plugin-satp-hermes/src/main/json/oapi-api1-bundled.json) is the source of truth for request and response schemas.

## Startup and shutdown

The CLI validates configuration, creates an isolated plugin registry, constructs
`SATPGateway`, and calls `startup()`. Startup initializes repositories and
cross-chain mechanisms before opening gateway services.

## Local deployment walkthrough

This procedure deploys the tracked development configuration with one gateway
and its monitoring service. It verifies deployment and health; it does not
perform a transfer between two gateways.

### 1. Prepare the repository and bundle

Follow the repository [build guide][package-doc-build-md] to install the build
tools and configure Cacti. From the repository root:

```bash
yarn run configure
yarn run lerna run build:bundle --scope=@hyperledger-cacti/cactus-plugin-satp-hermes
```

If the contributor setup already completed `yarn run configure`, do not repeat
it just for this walkthrough. Generate the bundle before building the image:
the Dockerfile copies `dist/bundle/ncc` and does not compile TypeScript.

Docker must be running. Check `docker version` and allow enough storage for
the gateway image and the Grafana monitoring image. Host ports `3010`, `3011`,
`3012`, `3000`, `4317`, `4318`, `9090`, `3100`, and `3200` must be available.

### 2. Start the development ledger

The tracked Gateway 1 configuration requires the following public development
account on an Ethereum ledger at host port `8545`. This reproducible Ganache
fixture matches that configuration. Ganache is archived; use this fixture only
for local validation, not as a production ledger recommendation.

```bash
docker run -d \
  --name cacti-satp-ledger \
  -p 127.0.0.1:8545:8545 \
  trufflesuite/ganache:v7.9.2 \
  --server.host 0.0.0.0 \
  --wallet.mnemonic 'test test test test test test test test test test test junk' \
  --chain.chainId 1337 \
  --logging.quiet

curl --fail-with-body http://localhost:8545 \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_accounts","params":[]}'
```

Wait until the RPC request succeeds. The first account must be
`0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266`. The fixture funds that account.
Its mnemonic and the private key in the tracked JSON are public test
credentials and must never be used with real assets.

If this ledger container already exists, use `docker start cacti-satp-ledger`.
An existing ledger from the developer example can be reused if it has the
same funded account; do not start a second ledger on the same port.
The gateway container must be able to reach the ledger through
`host.docker.internal:8545`. This was verified with Docker Desktop. For a
different Docker Engine topology, supply a reachable ledger address in your
local gateway configuration rather than assuming that hostname is available.

### 3. Deploy the gateway and monitoring service

From the repository root:

```bash
cd packages/cactus-plugin-satp-hermes
docker compose -p cacti-satp-local -f docker-compose-satp.yml config
docker compose -p cacti-satp-local -f docker-compose-satp.yml up --build -d
docker compose -p cacti-satp-local -f docker-compose-satp.yml ps
docker compose -p cacti-satp-local -f docker-compose-satp.yml logs --tail 100
```

Always provide `-f docker-compose-satp.yml`; Compose does not discover this
filename automatically. The service mounts Gateway 1's JSON configuration
read only at the path expected by the CLI. No separate copy is required.
The monitoring service uses the explicit container name `otel-lgtm`, which
must not already belong to another deployment.

Wait for the gateway to report healthy. The obsolete Compose `version`
attribute may produce a warning without preventing startup. In this local
Ethereum setup, the supervisor also repeatedly attempts to start an internal
Docker daemon that exits. Gateway health and connectivity to the external
ledger were verified despite those messages. Do not enable privileged mode
solely to silence them; other ledger integrations may have different needs.

### 4. Verify health

```bash
curl --fail-with-body \
  http://localhost:3012/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/healthcheck

curl --fail-with-body http://localhost:3000/api/health
```

Expect HTTP `200` and `{"status":"AVAILABLE"}` from the gateway. Grafana
should return HTTP `200` with `"database":"ok"`. Inspect logs if either
service is still initializing or returns an error. Gateway health does not
by itself prove a successful SATP transfer or correct telemetry ingestion.

Repository initialization applies the migrations automatically. Do not run
the legacy `db:*` commands for this procedure; see
[Database and Migrations][package-doc-database-md].

### 5. Stop the deployment

From the package directory:

```bash
docker compose -p cacti-satp-local -f docker-compose-satp.yml stop -t 30
docker compose -p cacti-satp-local -f docker-compose-satp.yml logs --tail 100
docker compose -p cacti-satp-local -f docker-compose-satp.yml down
```

The tested containers stopped and were removed successfully. The supervisor
logs showed gateway termination by `SIGTERM`; they did not establish that
all application cleanup hooks completed. Do not use this observation as
evidence of graceful termination during an active transfer.

The tracked Compose file does not mount a persistent gateway database
directory. Removing its container removes its writable database state.
Use this procedure for disposable local validation. A persistent deployment
requires an explicit storage configuration and separate recovery validation.

Stop the ledger you created when it is no longer required:

```bash
docker stop cacti-satp-ledger
```

If you reused a ledger for another exercise, leave it running until that
exercise is complete.

<!-- --8<-- [end:content] -->

[package-doc-configuration-md]: ./configuration.md
[package-doc-database-md]: ./database.md
[package-doc-build-md]: ../../../BUILD.md
