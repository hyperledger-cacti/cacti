<!-- --8<-- [start:content] -->
# SATP Hermes Database and Migrations

SATP Hermes uses Knex repositories for local protocol logs, replicated remote logs, audit entries, and oracle logs. Repository initialization runs the tracked Knex migrations before the repository is used.

## Default storage

When repository options are omitted, local and oracle logs use per-instance SQLite files, audit entries use an in-memory SQLite database, and the remote log repository is disabled. The file-backed defaults are intended for development and isolated runtime instances.

## External database configuration

`SATPGatewayConfig` accepts Knex configuration objects through `localRepository`, `remoteRepository`, `auditRepository`, and `oracleLogRepository`. The tracked production configurations for remote and audit storage use PostgreSQL and read:

| Variable | Purpose |
| --- | --- |
| `ENV_PATH` | Optional dotenv file loaded by the Knex configuration modules. |
| `DB_HOST` | PostgreSQL host. |
| `DB_PORT` | PostgreSQL port. |
| `DB_USER` | PostgreSQL user. |
| `DB_PASSWORD` | PostgreSQL password. |
| `DB_NAME` | PostgreSQL database name. |

Do not place credentials in tracked gateway example files. Supply secrets through the deployment platform or an untracked environment file.

## Migration behavior

The repository classes call `migrate.latest()` during initialization and use the migrations under [`src/main/typescript/database/migrations/`](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-satp-hermes/src/main/typescript/database/migrations). Rollback support is implemented by the repository classes for controlled test and recovery flows.

## Session proofs

Signature-verified protocol claims (wrap, lock, mint, burn, and assignment assertion claims) are persisted in the audit database as session proofs in the `session_proofs` table, created by the `20260910120000_add_session_proofs_table` migration. Each proof records the session ID, the SATP protocol step at which the claim was verified, the serialized claim, and the claim signature, keeping the signed claims provable for dispute resolution and audit after transport ends. Proofs are returned with audit entries through the `performAudit` API.

**Idempotent writes.** Each proof's primary key is derived deterministically from the session ID, step tag and claim (SHA-256). Re-verifying the same claim at the same step — e.g. after a retry or crash recovery — does not create duplicate rows; the existing proof is left untouched. `GatewayPersistence.persistSessionProof()` additionally rejects proofs missing a session ID, step tag, claim, or signature before they reach the database.

**Retrieval endpoint.** Proofs can be queried directly by session ID via `GET /api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/proofs` (`getSessionProofs` on the admin API), accepting a comma-separated list of session IDs and returning the matching `SessionProof`s.

The package manifest currently contains legacy `db:*` scripts that reference the former `src/knex/` layout. Do not use those scripts until their paths are updated in a dedicated code change.
<!-- --8<-- [end:content] -->
