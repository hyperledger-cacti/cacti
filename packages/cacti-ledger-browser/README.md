# `@hyperledger-cacti/cacti-ledger-browser`

## Overview

This package provides the React-based Cacti Ledger Browser for visualizing ledger data exposed through Cacti services.

**Target Audience:**

- [x] Developers
- [x] Operators

## Install

```sh
npm install @hyperledger-cacti/cacti-ledger-browser
```

## API Summary

The package is a browser application rather than a reusable plugin API. Its source is organized under [`src/`][package-doc-src], with runtime configuration supplied when the application is built and deployed.

This component allows viewing ledger data in Supabase or other PostgreSQL compatible database. The data is fed to supabase by persistence plugins for each ledgers.

## Summary

- [`@hyperledger/cacti-ledger-browser`](#hyperledgercacti-gui-tx-viewer)
  - [Summary](#summary)
  - [Remarks](#remarks)
  - [Getting Started](#getting-started)
  - [Contributing](#contributing)
  - [License](#license)
  - [Acknowledgments](#acknowledgments)

## Remarks

- Plugin requires running Supabase or other database and persistence plugins in order to properly view ledger data.
- Currently, fabric and ethereum based ledgers are supported.
- The SATP Inspector app is the exception: it queries a running SATP Hermes
  gateway REST API directly (no database required) to inspect SATP
  cross-chain transfer sessions. See
  [docs/docs/cactus/ledger-browser/plugin-apps/satp-inspector.md][package-doc-satp-inspector]
  for details.

## Getting Started

Clone the git repository on your local machine.

See [docs/docs/cactus/ledger-browser/setup.md][package-doc-docs-docs-cactus-ledger-browser-setup-md] for detailed information on how to setup and use this package.

## Contributing

We welcome contributions to Hyperledger Cacti in many forms, and there’s always plenty to do!

Please review [CONTRIBUTING.md][package-doc-contributing-md] to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE][package-doc-license] file.

## Acknowledgments

## Usage

Configure the application for the target Cacti API and run it through the monorepo development workflow.

### Running locally (development)

1. Install dependencies from the repository root: `yarn install`.
2. Optional - start the zero-config local backend (no `.env` needed with
   this profile; it is seeded with an example SATP Inspector instance):

   ```sh
   docker compose -f tools/docker/ledger-browser-config-postgrest/docker-compose.yml up -d
   ```

   Alternatively, copy `packages/cacti-ledger-browser/.env.template` to
   `packages/cacti-ledger-browser/.env` and fill in the values:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_SUPABASE_SCHEMA` -
     required by the application shell (app instance configuration storage),
     see [setup.md][package-doc-docs-docs-cactus-ledger-browser-setup-md].
   - `VITE_SATP_GATEWAY_URL`, `VITE_SATP_PROMETHEUS_URL` - optional fallbacks
     for the SATP Inspector app when an instance has no options configured.
3. Start the dev server (from the repository root):
   ```sh
   yarn workspace @hyperledger-cacti/cacti-ledger-browser start
   ```
   The application is served at `http://localhost:3001/`.
4. On the home page use the **Add Application** wizard to create an app
   instance (e.g. the SATP Inspector with `gatewayUrl` pointing at a running
   SATP Hermes gateway). Flows to exercise: app status card on the home page,
   the session list, a session detail timeline, gateways, messages and the
   overview page. See
   [satp-inspector.md][package-doc-satp-inspector] for app-specific options.

### Production build & preview

```sh
yarn workspace @hyperledger-cacti/cacti-ledger-browser build
yarn workspace @hyperledger-cacti/cacti-ledger-browser serve
```

`build` first type-checks the app sources (`tsc --build`), then bundles the
frontend with `vite build` into `dist/` (~1.3 MB, single JS chunk plus
assets). `serve` runs `vite preview`, which serves the production bundle at
`http://localhost:4173/`.

**Environment.** The `VITE_*` variables are read from `.env` (or the process
environment) **at build time** and inlined into the bundle — they are runtime
configuration of the *built artifact*, not of the server. A build succeeds
without real credentials: the values from `.env.template`
(`VITE_SUPABASE_URL=__SUPABSE_URL__`, `VITE_SUPABASE_KEY=__SUPABSE_KEY__`,
`VITE_SUPABASE_SCHEMA=public`) are sufficient to produce a working bundle.
Never ship a bundle built with privileged keys. To retarget an already-built
bundle per environment, use runtime configuration (next subsection) instead
of rebuilding.

### Runtime configuration (one build, many environments)

`index.html` loads `/config.js` — a tiny static file served next to the
bundle — *before* the application bundle. That file may assign
`window.__LEDGER_BROWSER_CONFIG__ = { ... }` to override the build-time
`VITE_*` values, so **one production build can serve many environments**
(retarget Supabase/gateway endpoints by editing the file, no rebuild).
Deploying without `config.js` is fully supported — the 404 on a classic
script tag is harmless and the app behaves exactly as before.

Resolution order per key (first hit wins; implementation:
`src/main/typescript/common/runtime-config.ts`):

1. **runtime** — valid values from `/config.js`,
2. **build-time** — the `VITE_*` value inlined into the bundle
   (empty string counts as unset),
3. **defaults** — the `.env.template` placeholders and the SATP gateway
   default `http://localhost:4010`.

| Key (in `config.js`)  | Build-time fallback       | Default            | Validation                                                   |
| --------------------- | ------------------------- | ------------------ | ------------------------------------------------------------ |
| `supabaseUrl`         | `VITE_SUPABASE_URL`       | `__SUPABSE_URL__`  | strict absolute `http(s)` URL (no credentials/controls)      |
| `supabaseKey`         | `VITE_SUPABASE_KEY`       | `__SUPABSE_KEY__`  | non-empty string, no surrounding whitespace                  |
| `supabaseSchema`      | `VITE_SUPABASE_SCHEMA`    | `public`           | ASCII identifier `[A-Za-z_][A-Za-z0-9_]*`                    |
| `satpGatewayUrl`      | `VITE_SATP_GATEWAY_URL`   | *(none → app default)* | strict absolute `http(s)` URL                            |
| `satpPrometheusUrl`   | `VITE_SATP_PROMETHEUS_URL`| *(none)*           | strict absolute `http(s)` URL                                |

`public/config.example.js` documents every key — copy it to `config.js`
next to the served `index.html` and uncomment what you need (copying it
verbatim is safe: an empty object overrides nothing). The file is
operator-supplied input and is validated like one: only the five known keys
are accepted (anything else, including `__proto__`, is ignored with a
`console.warn`), endpoint URLs go through the same strict `isHttpUrl`
boundary as app-instance options, and a malformed `config.js` **degrades to
the build-time values with a console warning — it never crashes the shell**.
Note `config.js` is plain JavaScript executed same-origin, so the CSP's
`script-src 'self'` keeps covering it — anyone who can serve or replace it
controls where the app connects; ship it over the same origin/TLS as the
app.

### Docker deployment

The package ships a production image recipe — multi-stage `Dockerfile`
(builder: `node:22-alpine` + corepack yarn 4.13.0, standalone install +
`vite build` with the `.env.template` placeholder env; serve:
`nginx:1.27-alpine`, non-root, healthcheck on `/`) with the round-4
hardening headers enforced by `nginx.conf` (CSP with `script-src 'self'`,
`nosniff`, `no-referrer`), SPA fallback (`try_files $uri /index.html`),
gzip and immutable caching for hashed assets; `/config.js` is served
`Cache-Control: no-store` so environment retargets apply immediately.

```sh
# Build (context = this package directory):
docker build -t cacti-ledger-browser packages/cacti-ledger-browser
# Run:
docker run --rm -p 8080:8080 cacti-ledger-browser
# Retarget at runtime (no rebuild):
docker run --rm -p 8080:8080 -v $(pwd)/config.js:/usr/share/nginx/html/config.js:ro cacti-ledger-browser
```

Verify the serving-layer hardening in one line:

```sh
curl -sI http://localhost:8080/ | grep -Ei 'content-security-policy|x-content-type-options|referrer-policy'
```

`docker-compose.example.yml` wires the browser together with a SATP Hermes
gateway (mirroring `packages/cactus-plugin-satp-hermes/docker-compose-satp.yml`)
and the optional `grafana/otel-lgtm` observability stack, with the browser's
`config.js` bind-mounted over the image default. Point its
`satpGatewayUrl`/`satpPrometheusUrl` at the **host-side** published ports
(`http://localhost:3012`, `http://localhost:9090`) — the app runs in the
user's browser, not inside the compose network.

**What works without a backend** (verified against the production bundle):

- With an unreachable/invalid Supabase config store the app shows its designed
  full-screen **Connection Error** state and nothing else — this is by design:
  the app instance list lives in the `gui_app_config` table. The failure is
  graceful (no white screen, no unhandled errors).
- Once the config store answers, the app shell renders (header, application
  cards, **Add Application** wizard) even with no other backend present. The
  SATP Inspector app needs **only** a reachable SATP Hermes gateway: with the
  gateway down, its app card, status popup and session list show the designed
  "not reachable" states, each carrying the **Setup Guide** link, and the
  browser console only logs the expected network failures.
- A production smoke-test transcript (screenshots + console captures) is
  preserved with the deployment verification notes.

**Security headers (serving layer).** `vite preview` is configured (via
`preview.headers` in `vite.config.mts`) to send hardening headers: a strict `Content-Security-Policy`
(`script-src 'self'` — the production bundle has no inline scripts;
`style-src 'unsafe-inline'` is required by MUI/emotion and apexcharts),
`X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`. For
real infrastructure the headers are **first-class in the shipped Docker
recipe**: [`nginx.conf`](./nginx.conf) (used by the [Docker
image](#docker-deployment)) enforces the same policy set together with the
SPA fallback, gzip and `server_tokens off`. On other hosting layers,
replicate the same headers there; e.g. for nginx:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' http: https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer" always;
```

or Netlify (`_headers` next to the published directory):

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' http: https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
```

(`connect-src` must allow the http(s) origins of the Supabase instance, SATP
gateways and Prometheus endpoints users configure at runtime.)

## Testing

From the repository root, run:

```sh
yarn test:jest:all packages/cacti-ledger-browser/src/test
```

[package-doc-src]: ./src/
[package-doc-docs-docs-cactus-ledger-browser-setup-md]: ../../docs/docs/cactus/ledger-browser/setup.md
[package-doc-satp-inspector]: ../../docs/docs/cactus/ledger-browser/plugin-apps/satp-inspector.md
[package-doc-contributing-md]: ../../CONTRIBUTING.md
[package-doc-license]: ../../LICENSE
