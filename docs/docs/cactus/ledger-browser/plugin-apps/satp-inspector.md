# SATP Inspector App

Application for inspecting cross-chain asset transfers executed with the
[IETF SATP](https://datatracker.ietf.org/doc/draft-ietf-satp-core) protocol by
the [Cacti SATP Hermes plugin](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-satp-hermes).

Unlike the Ethereum and Fabric browser apps, the SATP Inspector does not read
transfer data from Supabase - it talks directly to the SATP gateway's REST
(OAPI) API, so no persistence plugin is required. (The Ledger Browser itself
still uses Supabase to store the app instance configuration.)

## Features

- List SATP transfer sessions with their current status, substatus, protocol
  stage, ledger path, asset and last activity time. KPI cards (total,
  in-progress, completed, failed, rollbacks) double as outcome filters, the
  table is free-text searchable and sortable by column, and rows are fully
  keyboard operable.
- Inspect a session: ordered audit timeline (by proof sequence number) with
  the full serialized session snapshot of every step, plus a one-click
  **Export audit bundle** download (self-describing JSON with the raw
  snapshots and merged proofs) for compliance reporting.
- See the transfer path: sender/recipient gateways, source/destination
  ledgers, gateway public keys and the involved parties (all copyable).
- Surface the proofs generated during a transfer (lock/mint/burn/assignment
  and wrap assertion claims) as copyable fields.
- Failure lens: session state, error details and refund/recovery substatus.
- Overview page with aggregate metrics (session/transaction counts, gas used,
  value exchanged, connected DLTs) fetched from Prometheus, mirroring the
  Grafana dashboards shipped with the plugin.

## Setup

### Quickstart: the full local stack

Prerequisites: Docker running. From the repository root:

```sh
# 1. SATP Hermes gateway + Grafana + Prometheus (REST on host :3012, Prometheus :9090)
docker compose --project-directory ./packages/cactus-plugin-satp-hermes \
  -f ./packages/cactus-plugin-satp-hermes/docker-compose-satp.yml up -d --build
curl http://localhost:3012/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/healthcheck  # {"status":"AVAILABLE"}

# 1b. Zero-config config store + example sessions (no .env needed):
docker compose -f tools/docker/ledger-browser-config-postgrest/docker-compose.yml up -d

# 2. Frontend dev server
corepack yarn workspace @hyperledger-cacti/cacti-ledger-browser start      # -> http://localhost:3001
```

A step-by-step walkthrough of the demos (what to look at, live transfers,
troubleshooting) lives in the [SATP Inspector demo guide](./satp-inspector-demo.md).

The slim profile seeds a SATP Inspector instance with example sessions -
the UI works out of the box. To inspect a real gateway instead, add or edit
an app instance on the home page with `gatewayUrl` `http://localhost:3012`
(and optionally `prometheusUrl` `http://localhost:9090`). The app also ships
an **in-app guide** (last menu entry) with these steps, live gateway status
and copyable commands.

### Watching live transfers from the integration suite

The plugin's dockerized E2E suite runs real SATP transfers (Besu and
Go-Ethereum ledgers in containers, gateways as local processes - gateway 1
exposes its OAPI on host port 4010, gateway 2 on 4110). With a SATP
Inspector instance pointed at `http://localhost:4010`, sessions appear in
the UI in real time while the suite runs:

```sh
corepack yarn workspace @hyperledger-cacti/cactus-plugin-satp-hermes \
  test:integration:docker-local
```

The suite tears its gateways and ledgers down when it finishes (budget
30-60 minutes including the first image build), so the sessions are live
only during the run.

### SATP Hermes Gateway

The app needs a running SATP Hermes gateway with its OAPI (REST) server
reachable from the browser. The gateway's OAPI port defaults to `4010`. When
using the plugin's [docker-compose-satp.yml](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-satp-hermes#docker),
the REST port is published on host port `3012`.

To quickly start a local gateway for development:

```shell
cd packages/cactus-plugin-satp-hermes/
docker compose -f docker-compose-satp.yml up -d
```

### Prometheus (optional)

The Overview page queries the Prometheus instance that scrapes the gateway's
OpenTelemetry metrics (default `http://localhost:9090`, also part of
`docker-compose-satp.yml`). When no Prometheus URL is configured (or it is
unreachable), the aggregate panels are hidden and the session inspection
views keep working.

### Adding the app instance

Add the app through the Ledger Browser "Add Application" wizard with the
following options:

| Option          | Description                                 | Default                 |
| --------------- | ------------------------------------------- | ----------------------- |
| `gatewayUrl`    | Base URL of the gateway OAPI server.        | `http://localhost:4010` |
| `prometheusUrl` | Base URL of a Prometheus server (optional). | `http://localhost:9090` |

## Data Sources

- `GET /get-sessions-ids` and `GET /status` - session list and current state.
- `GET /audit?startTimestamp=...` - audit window (last 7 days) with the
  ordered local log entries and their serialized session snapshots.
- `GET /supported-ledgers`, `GET /healthcheck` - Overview page.
- Prometheus HTTP API (`/api/v1/query`, `/api/v1/query_range`) - aggregate
  metrics, using the same series as the plugin's Grafana dashboards.

## Notes

- The gateway's `/status` endpoint currently reports a hardcoded `step` and
  mirrors the origin network as the destination, so the ledger path shown in
  the UI is sourced from the audit snapshots instead.
- Session IDs from `/get-sessions-ids` can differ from audit session IDs by a
  correlation suffix; the app matches them by prefix.

## Deploying

What a production (or just non-dev-server) deployment of the Ledger Browser
looks like when you want to use this app. Everything below was verified against
the actual production bundle; the package
[README](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cacti-ledger-browser#production-build--preview)
carries the same information from the app's perspective.

### Production build

```shell
yarn workspace @hyperledger-cacti/cacti-ledger-browser build
yarn workspace @hyperledger-cacti/cacti-ledger-browser serve
```

`build` type-checks the app (`tsc --build`) and then bundles it with
`vite build` into `dist/` - about 1.3 MB, dominated by the single `index-*.js`
chunk (~1.33 MB, ~381 kB after gzip). That chunk trips vite's default 500 kB
chunk-size warning; code-splitting is a nice-to-have, not a blocker. `serve`
runs `vite preview`, which serves the bundle at `http://localhost:4173/`.

### Environment variables

The `VITE_*` variables are **build-time** configuration: they are read from
`.env` (or the process environment) when the bundle is built and inlined into
the resulting JavaScript. They configure the _artifact_, not the server -
changing them means rebuilding, and a deployed bundle always reveals the values
it was built with (never build with privileged keys).

A production build succeeds **without real credentials**: the placeholder
values already present in `.env.template` are sufficient to produce a working
bundle (the exact values are listed in the package README).

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_SUPABASE_SCHEMA` -
  required by the application shell (app-instance configuration storage).
- `VITE_SATP_GATEWAY_URL`, `VITE_SATP_PROMETHEUS_URL` - optional fallbacks
  for this app when an instance has no `gatewayUrl`/`prometheusUrl` options.

### Runtime configuration (one build, many environments)

The build-time-only pain point has a runtime escape hatch: `index.html` loads
`/config.js` - a tiny static file served next to the bundle - *before* the
application bundle, and that file may assign
`window.__LEDGER_BROWSER_CONFIG__ = { ... }` to override the inlined `VITE_*`
values. One production build can therefore serve many environments: retarget
the Supabase project or the SATP gateway/Prometheus fallback URLs by editing
`config.js`, no rebuild. Deploying without the file is fully supported (the
404 on a classic script tag is harmless) and behaves exactly like a
`VITE_*`-only deployment.

Per-key resolution: runtime `config.js` value > build-time `VITE_*` value >
built-in defaults (the `.env.template` placeholders; for the SATP gateway the
app default `http://localhost:4010`). `public/config.example.js` documents
all five overridable keys (`supabaseUrl`, `supabaseKey`, `supabaseSchema`,
`satpGatewayUrl`, `satpPrometheusUrl`).

The file is treated as operator-supplied untrusted input, like instance
options: only the five known keys are accepted, endpoint URLs must pass the
same strict absolute-`http(s)`-URL validation (no embedded credentials,
control characters or homoglyph hosts), and a malformed `config.js` degrades
to the build-time values with a single `console.warn` - it never crashes the
shell. The mechanism is exercised by a dedicated vitest suite (precedence,
malformed shapes, prototype-pollution keys, delivery order in `index.html`).

### Docker deployment

The package ships a production image recipe: a multi-stage `Dockerfile`
(`node:22-alpine` builder with corepack yarn 4.13.0 and the placeholder env;
`nginx:1.27-alpine` serve stage, non-root, healthcheck on `/`) plus a
hardened `nginx.conf` enforcing the same header set as `vite preview`
(`script-src 'self'` CSP, `nosniff`, `no-referrer`; `server_tokens off`),
with SPA fallback, gzip, immutable caching for hashed assets and
`Cache-Control: no-store` for `/config.js`. The image ships a default no-op
`config.js`; retargeting is a bind-mount away:

```shell
docker build -t cacti-ledger-browser packages/cacti-ledger-browser
docker run --rm -p 8080:8080 \
  -v $(pwd)/config.js:/usr/share/nginx/html/config.js:ro \
  cacti-ledger-browser
```

`docker-compose.example.yml` in the package wires the browser with a SATP
Hermes gateway (mirroring the plugin's `docker-compose-satp.yml`) and the
optional `grafana/otel-lgtm` observability stack. Because the app executes
in the user's browser - not inside the compose network - `config.js` must
point `satpGatewayUrl`/`satpPrometheusUrl` at the stack's **host-side**
published ports (`http://localhost:3012`, `http://localhost:9090`), not at
the compose service names.

### What needs which backend

Verified against the served production bundle:

| Backend                 | Required?         | Behavior without it                                                                                                                                                                                           |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase (config store) | yes               | The app shows its designed full-screen **Connection Error** state - by design, since the app-instance list lives in the `gui_app_config` table. The failure is graceful (no white screen).                    |
| SATP Hermes gateway     | for this app only | Shell, home page and the **Add Application** wizard work without any gateway. The inspector's card, status popup and session list show the designed "not reachable" states, each with a **Setup Guide** link. |
| Prometheus              | no (optional)     | The Overview panels are hidden; session inspection keeps working.                                                                                                                                             |

So the minimal production footprint is: static hosting for `dist/`, one
Supabase project with the [schema applied](../setup.md), and one reachable
gateway per SATP inspector instance. There is no per-ledger persistence plugin
to deploy for this app.

### Security headers (serving layer)

`vite preview` is configured (via `preview.headers` in `vite.config.mts`) to
send the hardening headers: a strict `Content-Security-Policy`
(`script-src 'self'` - the production bundle has no inline scripts and no eval;
`style-src 'unsafe-inline'` is required by MUI/emotion and apexcharts;
`connect-src` must allow arbitrary `http:`/`https:` origins because the
gateway, Prometheus and Supabase endpoints are runtime-configured),
`X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`. The
headers were verified with `curl -I` on the served bundle (index page and
hashed assets), and the app was exercised headlessly under the CSP without a
single violation.

Note that `vite preview` is **preview-tier** delivery: it protects you while
serving the bundle locally. On real infrastructure the same headers must be
enforced by the hosting layer instead - for Docker deployments the shipped
`nginx.conf` makes them first-class (see [Docker
deployment](#docker-deployment) above), and nginx/Netlify snippets for other
hosting layers are in the
[README](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cacti-ledger-browser#production-build--preview),
so replicate them wherever `dist/` is published.

Deploying does not change what the app trusts: gateway and Prometheus
responses remain untrusted input, instance URLs remain operator-supplied
configuration, and who may edit that configuration is owned by the config
store's row-level security - see [Trust model](#trust-model).

## Trust Model

What the browser app trusts, and what it never trusts:

### What the app treats as untrusted

- **Gateway REST responses.** Everything the app renders comes from the
  gateway OAPI (`/healthcheck`, `/get-sessions-ids`, `/status`, `/audit`,
  `/supported-ledgers`) and from the Prometheus HTTP API. The configured
  gateway URL is user-provided (it lives in the `gui_app_config` table), so
  responses may come from a hostile server. The app therefore:
  - parses the untrusted payloads through dedicated view-model transforms
    (`apps/satp/transform.ts`) that are property/fuzz-tested against
    malformed shapes, missing/extra fields, non-finite numbers (JSON has no
    `NaN`/`Infinity` but `1e999` parses to it), adversarial strings and
    prototype-pollution keys; malformed data degrades to empty states, never
    to corrupted typed output;
  - validates instance options at app-instance creation: `gatewayUrl` (and
    `prometheusUrl` when present) must be well-formed absolute `http(s)` URLs
    before the instance is accepted, and the resolved gateway URL is always
    shown in the UI (status popup, app card and the sessions empty state) so
    the operator can see what they are actually talking to.
- **User-provided instance options** (see above) and app-definition URLs:
  setup-guide links only render when the URL is valid, and open in a new tab.

### What the app relies on elsewhere

- **Supabase** stores only the app-instance configuration. Who may read or
  write that configuration is owned by the database's row-level security
  policies, not by this app. Anon writes must be restricted before any
  production-facing deployment, otherwise an attacker can repoint
  `gatewayUrl` at a server they control (see the repo's `SECURITY.md` for
  reporting hardening gaps).

### Rate limiting / DoS

The gateway OAPI server that backs this app is public by design
(unauthenticated, CORS `*` in the default profile). There is no built-in rate
limiter in the Cacti API server, so when exposing the OAPI beyond localhost:

- put a reverse proxy (nginx/Traefik/envoy) in front with per-IP request
  rate limits and connection caps, especially for `/audit`, which returns a
  whole time window in one response (pagination/window caps are a known
  open gap);
- keep the OAPI port firewalled to trusted networks and prefer binding it to
  localhost or a VPN for single-operator setups.

The browser side caps its own exposure by querying only a 7-day audit window
per refresh and backing off its polling while the gateway keeps failing.
