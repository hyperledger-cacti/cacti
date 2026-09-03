<!-- --8<-- [start:content] -->
# Operating SATP Hermes

## Deployment topology

The tracked [Compose file](https://github.com/hyperledger-cacti/cacti/blob/main/packages/cactus-plugin-satp-hermes/docker-compose-satp.yml) starts one SATP Hermes gateway and one Grafana OpenTelemetry LGTM container. The gateway publishes its protocol server on port `3010`, client service on port `3011`, and OpenAPI service on container port `4010`. The tracked Compose mapping exposes the OpenAPI service on host port `3012`.

The gateway CLI uses `/opt/cacti/satp-hermes` as its default working directory. Mount gateway configuration into its `config` subdirectory. See [Gateway Configuration][package-doc-configuration-md] for the exact paths.

## Container environment

| Variable | Tracked value or purpose |
| --- | --- |
| `NODE_ENV` | `production` in the gateway image. |
| `TZ` | `Etc/UTC` in the gateway image. |
| `DATABASE_CLIENT` | `sqlite3` in the gateway image. |
| `DATABASE_NAME` | `/opt/cacti/satp-hermes/database/satp.sqlite` in the gateway image. |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` in the tracked Compose service. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://otel-lgtm:4318` in the tracked Compose service. |

Database configuration modules also support the PostgreSQL variables described in [Database and Migrations][package-doc-database-md].

## Health and status endpoints

- `GET /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/healthcheck` reports service health. The container health check calls this endpoint on port `4010` and expects `{"status":"AVAILABLE"}`.
- `GET /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/status` queries a transfer session by `sessionID`.

The [OpenAPI document](https://github.com/hyperledger-cacti/cacti/blob/main/packages/cactus-plugin-satp-hermes/src/main/json/oapi-api1-bundled.json) is the source of truth for request and response schemas.

## Startup and shutdown

The CLI validates configuration, creates an isolated plugin registry, constructs `SATPGateway`, and calls `startup()`. Startup initializes repositories and cross-chain mechanisms before opening gateway services. Normal termination runs registered shutdown hooks that stop scheduled jobs, close servers, and destroy repository connections.
<!-- --8<-- [end:content] -->

[package-doc-configuration-md]: ./configuration.md
[package-doc-database-md]: ./database.md
