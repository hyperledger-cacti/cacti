# Hyperledger Cacti Whitepaper v2 Source

This directory contains the source scaffold for the second version of the
Hyperledger Cacti whitepaper.

The goal is to keep the whitepaper source reviewable, reproducible, and close
to the project documentation while the content is iterated by maintainers and
contributors.

## Build

Build with a local TeX Live installation:

```sh
make pdf
```

Build in a container with a pinned TeX Live release image:

```sh
make container-pdf
```

Both targets set `SOURCE_DATE_EPOCH`, `FORCE_SOURCE_DATE`, `TZ`, and `LC_ALL`
so the produced PDF is stable across machines when the same TeX Live image and
source tree are used.

The generated PDF is written to `build/main.pdf`.

## Layout

- `main.tex`: whitepaper entrypoint and outline.
- `references.bib`: bibliography for papers, specifications, and theses that
  inform Cacti technology.
- `Makefile`: local and containerized build targets.

## Editing Notes

Use this scaffold to incrementally replace the current placeholder whitepaper.
Prefer short, reviewable pull requests that add one section or bibliography
group at a time.
