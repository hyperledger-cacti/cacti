# SATP Inspector demo guide

A reproducible walkthrough of the two demos the SATP Inspector ships with:
the out-of-the-box example data, and real protocol transfers watched live
in the UI. Both run entirely on one machine with Docker; no cloud services
and no `.env` wiring are required.

The companion pages cover the details this guide skips: [setup and
configuration](./satp-inspector.md) (including the trust model) and the
[ledger browser setup](../setup.md) for the config store.

## Demo A: example data, out of the box

The slim local profile seeds the UI with a preloaded SATP Inspector
instance backed by two bundled, read-only example gateways: the origin
gateway of the transfers (`http://localhost:3013`, SATP client side) and
its counterparty (`http://localhost:3014`, SATP server side). Both log the
same session IDs with the messages of their own side, so the cross-gateway
view shows a real two-sided flow. Three canned sessions with now-relative
timestamps: a completed Besu→Fabric transfer with verified lock/mint/burn
proofs on both gateways, an in-progress transfer where the destination is
one stage behind, and a failed Ethereum→Polygon transfer (SATP error
`err_2.2.8`, rollback) whose destination gateway is not running.

```sh
# From the repository root - two commands, no .env needed:
docker compose -f tools/docker/ledger-browser-config-postgrest/docker-compose.yml up -d
corepack yarn workspace @hyperledger-cacti/cacti-ledger-browser start     # → http://localhost:3001
```

What to look at, in order:

1. **Home page** — the "SATP Inspector (example data)" card shows a live
   healthcheck status for the instance's primary gateway. Try the status
   dialog and the configure dialog (the options list both gateways).
2. **Toolbar** — the active and counterparty gateway selectors, live
   polling controls (pause/resume, refresh every 3/5/10/30 s, refresh now)
   and **Manage gateways**: add any number of gateways, then **Save to app
   config** to store them for every viewer.
3. **Sessions** — sessions from all gateways, merged: the "Seen on" column
   shows which gateways know each session. KPI cards (Total / In progress /
   Completed / Failed / Rollbacks) double as outcome filters; search filters
   across every row field (try `fabric`, `polygon`, `0x`); column headers
   sort. Rows are keyboard operable (Tab, Enter).
4. **Session detail** (click the completed session) — the cross-gateway card
   (both sides settled, per-gateway stage/status, pick whose timeline to
   show), signature-verified proofs from `GET /proofs`, value moved on each
   ledger, last transition, audit timeline and **Export audit bundle** (a
   schema-versioned JSON with the raw gateway snapshots).
5. **Session detail** (the failed session) — the failure analysis: failed
   stage and step, error class and SATP error code with its registry
   description, and a retry outlook. The session is seen on 1 of 2 gateways.
6. **Messages** — click a message to inspect the session state recorded
   with it, field by field (hashes, signatures and claims highlighted as
   evidence) or raw.
7. **Overview** — aggregate metrics; they light up only with a Prometheus
   URL configured (the example gateway does not serve metrics; the real
   gateway stack does, see Demo C).

The example row is regular app-instance configuration: edit it via the
configure dialog, or delete it and add your own instances.

## Demo B: real transfers, watched live

The plugin's dockerized E2E suite executes genuine SATP transfers: Besu
and Go-Ethereum test ledgers run in containers, the gateways run as local
processes (gateway 1 exposes its OAPI on host port **4010**, gateway 2 on
**4110**), and sessions progress through the protocol stages in real time.

```sh
# Terminal 1 (from the repository root; budget 30-60 minutes including
# the first gateway image build):
corepack yarn workspace @hyperledger-cacti/cactus-plugin-satp-hermes \
  test:integration:docker-local

# Terminal 2 - while the suite runs:
corepack yarn workspace @hyperledger-cacti/cacti-ledger-browser start
```

In the UI: **Add Application → SATP Inspector** with the options
`{"gatewayUrl": "http://localhost:4010", "counterpartyGatewayUrl": "http://localhost:4110"}`
(or add the second gateway later with **Manage gateways**). Sessions appear
as the suite creates them, merged across both gateways, and the
timeline/KPIs update on every poll (10 s by default, adjustable in the
toolbar). Each session page shows both gateways' view of the transfer.

The suite tears its gateways and ledgers down when it finishes, so these
sessions exist only during the run - that is inherent to the test harness,
not a UI limitation.

## Demo C: a persistent real gateway

The plugin's compose stack runs a persistent gateway (REST published on
host **3012**) plus Grafana (3000) and Prometheus (9090):

```sh
docker compose --project-directory ./packages/cactus-plugin-satp-hermes \
  -f ./packages/cactus-plugin-satp-hermes/docker-compose-satp.yml up -d
curl http://localhost:3012/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/healthcheck
# → {"status":"AVAILABLE"}
```

Point an instance at `http://localhost:3012` (and
`http://localhost:9090` for the Overview metrics). The gateway serves
health, supported ledgers and any sessions created against it; the bundled
example gateway is the zero-effort stand-in when you do not need a real
gateway.

## Restarting the machine

- The slim profile's containers auto-start with Docker Desktop
  (`restart: unless-stopped`); the dev server does not - start it with the
  Demo A command. The seeded example instance and any instances you added
  live in the store's database volume and survive restarts.
- The plugin gateway compose has no restart policy; repeat the Demo C
  command after a reboot if you need it.

## Troubleshooting

| Symptom | Cause and fix |
|---------|---------------|
| Full-screen **Connection Error** dialog | The app configuration store on `http://localhost:8000` is unreachable. The dialog shows the resolved store URL and the one-command fix: `docker compose -f tools/docker/ledger-browser-config-postgrest/docker-compose.yml up -d`. |
| Ports 8000/5432 refuse to bind | The Supabase `all-in-one` container conflicts with the slim profile - run one backend, not both (`docker start supabase_all_in_one_gui` to switch back). |
| Containers vanish after a Docker restart | Should not happen since the restart policy; if it does, re-run the Demo A compose command (the database volume survives). |
| Store URL shows a placeholder like `__SUPABSE_URL__` | A stale `.env` from an old template. The resolver now rejects non-URL values with a console warning and falls back to the local default - the line is inert; you can delete the `.env`. |
| Gateway shows "not reachable" with a setup-guide link | Expected when no gateway runs at the configured URL; polling backs off (up to 5 min) instead of hammering. Start a gateway or reconfigure the instance. |

## Cleaning up

```sh
# Stop the slim profile (keeps the database volume):
docker compose -f tools/docker/ledger-browser-config-postgrest/docker-compose.yml down
# ...and reset the store to the freshly-seeded state:
docker compose -f tools/docker/ledger-browser-config-postgrest/docker-compose.yml down -v
```
