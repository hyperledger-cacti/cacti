# No `# syntax=` frontend directive on purpose: only classic instructions
# are used, and pulling the dockerfile frontend image adds a registry
# round-trip that can fail in restricted networks.
#
# Production image for @hyperledger-cacti/cacti-ledger-browser.
#
# Multi-stage:
#   1. "builder"  - node:22-alpine, standalone `yarn install` + `vite build`
#                   with the documented placeholder env (never real keys).
#   2. "serve"    - nginx:1.27-alpine, the dist/ bundle + a default no-op
#                   /config.js, hardened nginx.conf (security headers, SPA
#                   fallback, gzip, no server tokens), non-root.
#
# Build context: THIS package directory only. The app has no yarn-workspace
# dependencies (its SATP gateway types are hand-written local copies, see
# src/main/typescript/apps/satp/types.ts), so a standalone install of the
# pinned public dependencies is sufficient. The repo-root
# tsconfig.base.json (which lives outside the context) is provided as a
# minimal equivalent below - of its options only `esModuleInterop` affects
# the vite/esbuild transform; everything else is type-check-only and the
# package's own tsconfig.json overrides what matters (target, module, jsx).
#
# Build:  docker build -t cacti-ledger-browser packages/cacti-ledger-browser
# Run:    docker run -p 8080:8080 cacti-ledger-browser
# Retarget environments at runtime by overwriting /config.js (see
# public/config.example.js) - no rebuild needed.

###############################################################################
# Stage 1: build the production bundle
###############################################################################
FROM node:22-alpine AS builder

# Yarn release matching the repository tooling (repo root pins
# .yarn/releases/yarn-4.13.0.cjs via yarnPath).
RUN corepack enable && corepack prepare yarn@4.13.0 --activate

WORKDIR /repo/packages/cacti-ledger-browser

# Standalone-install tooling setup (mirrors the repo-root .yarnrc.yml where
# relevant):
# - ../../tsconfig.base.json: minimal equivalent, only `esModuleInterop`
#   affects the vite/esbuild transform (verified: same bundle semantics as
#   the repo build - see the header comment);
# - .yarnrc.yml: `nodeLinker: node-modules` (yarn's PnP default would not
#   serve vite) and `enableScripts: false` exactly like the repository -
#   this also skips building the optional native ws accelerators
#   (bufferutil / utf-8-validate), which have no toolchain on alpine and
#   are not needed by the bundle;
# - .env: the documented placeholder values from `.env.template` (NOT
#   secrets - written as a file instead of ENV instructions so BuildKit's
#   SecretsUsedInArgOrEnv check stays quiet). The bundle must build without
#   real credentials; real endpoints arrive at RUNTIME via /config.js.
#   A developer's real .env never enters the context (.dockerignore).
RUN printf '{"compilerOptions":{"esModuleInterop":true}}' > /repo/tsconfig.base.json \
 && printf 'nodeLinker: node-modules\nenableScripts: false\n' > .yarnrc.yml \
 && printf 'VITE_SUPABASE_URL=__SUPABSE_URL__\nVITE_SUPABASE_KEY=__SUPABSE_KEY__\nVITE_SUPABASE_SCHEMA=public\n' > .env

# Install first (package.json only) so source edits don't bust the layer.
COPY package.json ./
RUN corepack yarn install

# Sources; `vite build` only (type-checking is a repo CI gate, not needed
# to emit the bundle).
COPY index.html vite.config.mts tsconfig.json ./
COPY public ./public
COPY src ./src
RUN corepack yarn build:prod:frontend

###############################################################################
# Stage 2: serve the bundle
###############################################################################
FROM nginx:1.27-alpine AS serve

LABEL org.opencontainers.image.title="Cacti Ledger Browser" \
      org.opencontainers.image.description="Cacti GUI for visualizing ledger data (static production bundle on nginx)" \
      org.opencontainers.image.licenses="Apache-2.0" \
      org.opencontainers.image.source="https://github.com/hyperledger-cacti/cacti"

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /repo/packages/cacti-ledger-browser/dist /usr/share/nginx/html

# Default no-op runtime configuration (the bundle then uses its build-time
# placeholder values). Operators retarget environments by bind-mounting or
# overwriting this file - see public/config.example.js for every key.
# config.example.js ships next to it as the documented template.
RUN printf 'window.__LEDGER_BROWSER_CONFIG__ = {};\n' \
      > /usr/share/nginx/html/config.js \
    && chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx

# Unprivileged runtime (nginx:alpine entrypoint skips its root-side setup
# when already non-root; pid and temp paths are writable via /tmp and the
# chown above, and the listener binds 8080, not privileged 80).
USER nginx

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

EXPOSE 8080
