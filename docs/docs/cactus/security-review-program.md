Security Review Program
======================================================

This page defines a repeatable security review program for high-impact Cacti
packages. It is intended for packages that handle ledger connectivity, key
material, persistence, cross-network messages, runtime plugin loading, or other
sensitive flows.

The program starts with connectors, keychains, persistence packages, and the API
server, then expands to other packages as cleanup work and maintainer bandwidth
allow.

## Review Goals

Each package review should produce:

- an automated software composition analysis result,
- a short package threat model,
- documented sensitive data flows,
- a remediation backlog,
- and a package-specific security checklist.

The review is complete when maintainers can point to the review artifacts and
the follow-up issues that track accepted remediation work.

## Target Package Selection

Prioritize packages using the following signals:

- The package stores, signs with, receives, or transmits credentials, private
  keys, tokens, certificates, or ledger identities.
- The package connects to a ledger, relay, database, vault, browser client, or
  external service.
- The package is installed dynamically or runs user-provided configuration.
- The package is widely used by examples, deployments, or downstream users.
- The package has recently changed dependencies, network surfaces, or
  serialization boundaries.

Initial target classes:

- API server and runtime plugin loading packages.
- Ledger connectors.
- Keychain packages.
- Persistence packages.
- Cross-network messaging and interoperability packages.

## Review Workflow

1. Create a tracking issue for the package review and label it `Security`.
2. Identify the package owner or maintainer reviewer.
3. Run automated dependency SCA and record the command, date, tool version, and
   result link or output summary.
4. Map sensitive data flows and trust boundaries.
5. Write a short threat model using the template below.
6. Create remediation issues for accepted findings.
7. Add or update the package-specific security checklist.
8. Close the tracking issue only after the checklist and remediation backlog are
   linked from the issue.

## Automated SCA

Use the repository's existing CI signals first, including dependency audit,
CodeQL, scorecard, and container scanning where applicable.

For package reviews, record:

- package name and path,
- dependency manifests inspected,
- command or CI job used,
- scanner version,
- date,
- summary of critical and high findings,
- ignored findings and rationale,
- and issue links for accepted remediation.

## Threat Model Template

Use this template in a package-specific document or issue:

```md
# Security Review: <package-name>

## Scope

- Package path:
- Version or commit:
- Reviewer(s):
- Date:

## Assets

- Credentials:
- Ledger identities:
- Private keys or signing material:
- Tokens or API keys:
- Persistent data:
- Network messages:

## Entry Points

- HTTP or WebSocket APIs:
- CLI commands:
- Plugin configuration:
- Environment variables:
- Filesystem paths:
- External service calls:

## Trust Boundaries

- Caller to API server:
- API server to plugin:
- Plugin to ledger:
- Plugin to keychain or database:
- Container boundary:
- Browser to backend:

## Threats

- Spoofing:
- Tampering:
- Repudiation:
- Information disclosure:
- Denial of service:
- Elevation of privilege:

## Existing Controls

- Authentication and authorization:
- Input validation:
- TLS or transport security:
- Key management:
- Logging and audit:
- Dependency scanning:
- Tests:

## Findings and Remediation

| ID | Finding | Severity | Owner | Issue | Status |
| -- | ------- | -------- | ----- | ----- | ------ |
|    |         |          |       |       |        |
```

## Package Security Checklist

Use this checklist for each reviewed package:

- Dependencies were scanned and critical/high findings were triaged.
- Public APIs validate inputs and reject unknown or malformed requests.
- Secrets are not logged, serialized into errors, committed, or returned in API
  responses.
- Private keys and signing operations are isolated behind explicit providers or
  keychain integrations.
- Network calls use TLS where appropriate and document any insecure development
  defaults.
- Plugin configuration is validated before use.
- File paths and archive extraction paths are constrained to expected working
  directories.
- Container images use pinned base images or documented update rules.
- Privileged container, filesystem, or process execution requirements are
  documented.
- Security-relevant behavior has tests or an explicit follow-up issue.
- Accepted risks and deferred findings have linked issues.

## Remediation Backlog

Every finding accepted by maintainers should become a GitHub issue unless it is
fixed in the same pull request as the review. Remediation issues should include:

- package name,
- affected code path,
- severity,
- reproduction or evidence,
- proposed fix,
- validation plan,
- and the parent review issue.

## Review Cadence

Run a review when:

- a target package is cleaned up or materially refactored,
- a package adds a new external dependency,
- a package changes authentication, authorization, signing, persistence, or
  network behavior,
- a high-impact vulnerability affects the package's dependency tree,
- or before a major release when maintainer capacity allows.

Security reviews complement the vulnerability reporting process in the root
`SECURITY.md`. Potential vulnerabilities should still be reported through the
private Hyperledger security process before public disclosure.
