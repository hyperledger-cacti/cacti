<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Building the Whitepaper

This document explains how to preview and build the Hyperledger Cacti
whitepaper on its own, separate from the full documentation site.

The whitepaper source and its assets live under `docs/docs/whitepaper/`:

- `whitepaper.md` — the whitepaper content (the only page in the build).
- `diagrams/*.mmd` — Mermaid diagram sources.
- Generated diagram images are written to `docs/docs/images/whitepaper/`.

The dedicated MkDocs config is `docs/mkdocs.whitepaper.yml`. It reuses the main
`docs/docs/` content directory but excludes every Markdown file except
`whitepaper/whitepaper.md`, so only the whitepaper is rendered.

## Prerequisites

- Python 3 with `pip`.
- Node.js `20.20.0` (`nvm use 20.20.0`) for the diagram generation scripts.
- `@mermaid-js/mermaid-cli` (`mmdc`), available via the repo's dev
  dependencies, for regenerating diagrams.

Install the documentation tooling once:

```bash
yarn docs:install   # pip install -r docs/requirements.txt
```

## Preview Locally

Serve the whitepaper with live reload at <http://127.0.0.1:8000>:

```bash
yarn whitepaper:serve
```

This runs `mkdocs serve -f mkdocs.whitepaper.yml` from the `docs/` directory.

## Build a Static Site

Produce a static build under `docs/site-whitepaper/`:

```bash
yarn whitepaper:build
```

This runs `mkdocs build -f mkdocs.whitepaper.yml` from the `docs/` directory.

## Regenerate Diagrams

The whitepaper figures are generated from the Mermaid sources in
`diagrams/`. Regenerate the PNG and PDF outputs after editing a `.mmd` file:

```bash
yarn whitepaper:diagrams        # PNG + PDF
yarn whitepaper:diagrams:png    # PNG only
yarn whitepaper:diagrams:pdf    # PDF only
```

Images are written to `docs/docs/images/whitepaper/` (PDFs under
`docs/docs/images/whitepaper/pdf/`) and referenced from `whitepaper.md` via
relative `../images/whitepaper/...` paths.

## Notes

- This build is independent of the full docs site (`yarn docs:serve` /
  `yarn docs:build`), which uses `docs/mkdocs.yml`.
- `build-whitepaper.md` is excluded from the rendered whitepaper output — it is
  developer documentation only.
