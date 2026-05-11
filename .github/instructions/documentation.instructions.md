---
description: "Use when writing or editing documentation files. Covers Markdown style, MkDocs structure, Typedoc conventions, and Cacti-specific doc patterns."
applyTo: "**/*.md"
---
# Documentation Conventions

## Documentation Locations

- `docs/docs/` — MkDocs site source (config at `docs/mkdocs.yml`, Material theme).
- `docs/docs/guides/diagrams/*.mmd` — Mermaid diagrams, generated via `yarn docs:diagrams`.
- `whitepaper/` — Academic whitepapers.
- Per-package `README.md` files for package-level docs.
- SATP Hermes has its own Typedoc + diagrams pipeline (`docs:generate`,
  `docs:validate`, `docs:diagrams`). Don't manually edit its generated output.

## MkDocs Site

- Published via `.github/workflows/deploy_docs.yml`.
- Use relative links for cross-references within the docs site.
- Architecture and design docs live under `docs/docs/`.

## Markdown Style

- ATX-style headings (`#`, `##`, `###`). Maintain proper hierarchy.
- Fence code blocks with language tags (` ```typescript `, ` ```bash `, etc.).
- Use relative links for internal references — never absolute GitHub URLs
  (they break across forks).
- Keep lines reasonably short; prefer concise prose over long paragraphs.

## Key Root Documents

| File | Purpose |
|------|---------|
| `README.md` | Project overview and quick start |
| `BUILD.md` | Dev environment setup and build commands |
| `CONVENTIONS.md` | Repository conventions (central reference) |
| `CONTRIBUTING.md` | Contribution guidelines |
| `CHANGELOG.md` | Release notes |
| `GOVERNANCE.md` | Project governance |
| `SECURITY.md` | Security policy and reporting |

## Package README Pattern

1. Purpose and description.
2. Installation / usage instructions.
3. Configuration options.
4. API reference or link to generated docs / OpenAPI spec.
5. Example usage with code snippets.

## What NOT to Do

- Don't create planning or tracking markdown files in the repo — use the
  issue tracker instead.
- Don't duplicate content from `CONVENTIONS.md` or `BUILD.md` — link to them.
- Don't edit Typedoc or other generated documentation output.
