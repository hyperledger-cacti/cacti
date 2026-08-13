# Tool README Template

> This template defines the standard structure for README files under the
> `tools/` directory in the Hyperledger Cacti monorepo. Use this skeleton when
> documenting a new tool directory or updating an existing one.

---

```markdown
# <Tool or Directory Name>

> One-line summary of the tool's purpose.

## Overview

Brief description of what this tool or directory contains and why it exists.

**Target Audience:**
- [ ] Developers
- [ ] Operators

## How to Run

\```bash
yarn <script-name>
\```

Or provide the specific command(s) needed to execute the tool. (Optional, if applicable).

## Available Scripts / Directory Index / Available Checks

List each script or sub-tool with a one-line description:

- `script-a.ts`: What it does.
- `script-b.sh`: What it does.
- `sub-directory/`: Brief description. See [Sub-directory](./sub-directory/README.md).
```

> **Note:** This template defines the baseline structure. The documentation may be extended with other sections as needed.

---

## Section Guidelines

| Section | Required | Notes |
|---|---|---|
| Title | Yes | Name of the tool or directory. |
| Summary | Yes | One-line blockquote. |
| Overview | Yes | One to three sentences. Includes Target Audience checkboxes. |
| How to Run | Optional | Command(s) to execute the tool. |
| Available Scripts / Directory Index | Yes | Annotated list of contents. Link to sub-READMEs where applicable. |

---

## Example

````markdown
# Cacti Custom Checks

> Monorepo integrity validation suite that runs as part of CI.

## Overview

This directory contains custom validation scripts that enforce consistency and integrity across the Cacti monorepo.

**Target Audience:**
- [x] Developers
- [ ] Operators

## How to run

```bash
yarn custom-checks
```

## Available Checks

- `check-package-json-sort.ts`: Ensures `package.json` files are consistently sorted.
- `check-package-json-fields.ts`: Validates required fields and their values.
````
