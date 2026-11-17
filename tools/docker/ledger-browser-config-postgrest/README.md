# Ledger Browser slim local backend (Postgres + PostgREST)

Zero-Supabase, three-container backend for local development of the Cacti
Ledger Browser:

| Container | Port | Purpose |
|-----------|------|---------|
| `config-gateway` (nginx) | **8000** | publishes PostgREST under `/rest/v1/` — the exact REST surface `supabase-js` expects, so the browser works unchanged |
| `config-db` (postgres 16) | 5432 | holds `gui_app_config` / `plugin_status`, **seeded with one example SATP Inspector instance** |
| `example-gateway` (node) | **3013** | canned, read-only SATP Hermes gateway responses (completed / in-progress / failed+rollback sessions) with fresh timestamps |

## Run

From the repository root:

```sh
docker compose -f tools/docker/ledger-browser-config-postgrest/docker-compose.yml up -d
```

Then start the ledger browser — **no `.env` needed**: the built-in config
default points at `http://localhost:8000`, and this profile accepts any API
key (PostgREST runs without a JWT secret; every request is the
`ledger_browser` role):

```sh
corepack yarn workspace @hyperledger-cacti/cacti-ledger-browser start   # http://localhost:3001
```

The home page shows the preloaded **SATP Inspector (example data)** instance;
open it to see three sessions with KPI cards, the audit timeline, proofs,
the failure lens and the JSON export — all served by the example gateway.

## Going from example to real

- Point the app instance at a real gateway via its configure dialog on the
  home page (for the plugin's docker compose: `http://localhost:3012`).
- Or delete the example row from the UI and add your own instances.

## Notes

- Ports 8000/5432 conflict with the Supabase `all-in-one` container — run
  one backend, not both. The all-in-one (or Supabase Cloud) remains the
  right choice when you need Studio, auth or RLS against Supabase roles;
  this profile is the slim, single-operator default.
- The seeded row lives in `init/01-init.sql` (`ON CONFLICT DO NOTHING`, so
  restarting keeps your edits; `docker compose down -v` resets everything).
- No RLS here: one role, localhost deployments. See
  `packages/cacti-ledger-browser/src/main/sql/schema.sql` for the
  Supabase-profile schema with roles and policies.
