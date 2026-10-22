<!--
 SPDX-License-Identifier: CC-BY-4.0

 -->

**Authors**: Parth Singh, Rafael Belchior, Andre Augusto, Carlos Amaro,
Venkatraman Ramakrishna

**Tags**: [documentation, developer-experience, mentorship, interoperability]

# Making Hyperledger Cacti Easier to Navigate, Build, and Contribute To

Blockchain interoperability brings together different ledgers, programming
languages, deployment models, and trust assumptions. An open source project
that supports that work needs more than functioning connectors and protocols.
It also needs documentation that explains where to begin, examples that are
easy to find, and development workflows that contributors can understand.

The Hyperledger Cacti Cleanup Initiative focuses on that supporting
infrastructure. Together with the Cacti maintainers and community, we have
worked on repository cleanup, example migration, development tooling,
documentation, and focused runtime fixes. Our objective is to make the
existing project easier to use and maintain while preserving valuable work
from earlier contributors.

The [Cacti v3 announcement](https://www.lfdecentralizedtrust.org/blog/hyperledger-cacti-v3-open-source-infrastructure-for-cross-chain-research-and-financial-interoperability)
describes the cleanup initiative as part of the wider evolution of the
project. This post looks more closely at the contributor-experience and
documentation work, from the initial investigation to the material made
available in the repositories and documentation sites.

## Start with the reader, not the repository layout

The first challenge was deciding what cleanup should accomplish. Cacti
combines components from the former Cactus and Weaver projects, together
with newer protocol and application work. Its documentation had accumulated
across root Markdown files, package READMEs, framework-specific guides, and
the MkDocs site. Some information was duplicated, some references pointed to
retired components, and some useful pages were difficult to discover.

The initial work included build and dependency investigation, review of
stale pull requests, and a documentation inventory and gap analysis. Rather
than treating every old page as disposable, we examined which information
still described an active capability and where it should live.

That approach became the documentation program tracked in
[cacti issue #4034](https://github.com/hyperledger-cacti/cacti/issues/4034):
audit the existing material, improve onboarding, refresh architecture and
package documentation, then validate the reader journeys and publishing
process. Early contributions also corrected Weaver links, improved CI
debugging instructions, connected the build guide with the FAQ, and repaired
root README references.

The new [Start Here](https://hyperledger-cacti.github.io/cacti/dev/start-here/) entry point organizes the material
around three audiences:

- **Contributors** want to modify Cacti, understand the development workflow,
  run tests, and submit changes.
- **Developers** want to choose a connector or protocol, install it, configure
  it, and use its API in an application.
- **Operators** want to deploy components, supply runtime configuration, and
  understand their operational requirements.

These readers share a project, but they do not need the same first page.
Giving each audience an explicit route makes that distinction visible.

## A focused core repository and a home for demonstrations

Repository cleanup was not limited to documentation. We reorganized
the [Cacti Demos repository](https://github.com/hyperledger-cacti/cacti-demos)
and moved example material out of the main Cacti repository. This included
SATP adapter demonstrations, the common example server, CBDC bridging
components and documentation, workshop examples, and carbon-accounting
material. Corresponding example packages were removed from the main
repository through separate changes after their migrations.

Test tooling and test packages were also made available in Cacti Demos,
including API client and server tests, Geth ledger tooling, Besu HTLC tests,
connector tests, and COPM tests. This required care: copying a test package
to Demos did not mean its dependencies could automatically be deleted from
the main repository. Components that remained necessary there were retained.

The Demos work also introduced repository-wide build and lint pipelines and
a minimal Cacti starter example. These changes provided a clearer place for
learning and experimentation without treating demonstration applications as
core framework packages. The migration history is available in
[Cacti Demos pull requests](https://github.com/hyperledger-cacti/cacti-demos/pulls?q=is%3Apr+is%3Amerged).

## A clearer contributor journey

For contributors, environment setup is often the first substantial barrier.
Cacti is a polyglot repository, so a working Node.js installation alone does
not cover every component.

The optional [Nix development environment](../guides/nix-setup.md) provides
a repository-defined toolchain and a lighter Node-focused shell. It gives
contributors another setup route without making Nix a requirement or
removing the existing platform-specific instructions. The implementation
was merged in [cacti PR #4646](https://github.com/hyperledger-cacti/cacti/pull/4646).

The onboarding rewrite then connected setup with the work contributors
actually perform. It added audience entry points and
[contributor recipes](../recipes/index.md) covering branch setup, package
creation, tests, ledger-plugin testing, API-client generation, dependency
management, and VS Code configuration.

We also reduced duplicated instructions. Root documents remain the
authoritative sources for topics such as building and contributing, while
MkDocs snippet pages render the relevant content in the website. Start Here
points readers to the contribution guide instead of maintaining another
copy of its workflow. The result is a clearer distinction between an entry
point, an authoritative reference, and a task-specific recipe.

## Package documentation that follows a common structure

A developer should not need to learn a different README layout for every
package. The package-standardization work applied an agreed template across
tooling and core packages, ledger connectors, remaining plugins, COPM,
Weaver components, SATP Hermes, and active extensions. The same structure
was applied to examples and test packages in Cacti Demos.

The template makes recurring questions easier to answer: What does this
package do? Who is it for? How is it installed? What API does it expose?
How is it configured, used, and tested?

This was primarily a preservation and restructuring exercise. Useful
architecture notes, setup instructions, examples, and testing guidance were
retained. Package names and commands were checked against their manifests
and scripts, and stale placeholders and references were corrected.

The main phases are recorded in
[cacti PR #4671](https://github.com/hyperledger-cacti/cacti/pull/4671),
[cacti PR #4672](https://github.com/hyperledger-cacti/cacti/pull/4672),
[cacti PR #4694](https://github.com/hyperledger-cacti/cacti/pull/4694), and
[Cacti Demos PR #56](https://github.com/hyperledger-cacti/cacti-demos/pull/56).

## From repository files to published references

Standardized READMEs are more useful when readers can find them from the
documentation website. The publishing work connected the existing
[package index](../cactus/packages.md) to published pages instead of leaving
it as a collection of GitHub README links.

The initial publication change exposed 34 package and extension READMEs
through snippet wrappers and added 18 OpenAPI references. Before replacing
older copied package pages, we compared them with the canonical READMEs and
migrated useful information that existed only in the website copies.
Explicit Markdown reference destinations preserve repository links in the
READMEs while allowing the website wrappers to use the appropriate site
destinations.

The OpenAPI references were committed as generated standalone HTML pages,
so the normal MkDocs build and serve commands could publish them without an
additional generation command. This final approach is documented in
[cacti PR #4719](https://github.com/hyperledger-cacti/cacti/pull/4719).

Cacti Demos received its own documentation site rather than having its
READMEs copied into Cacti's site. Its mirrored snippet wrappers keep the
repository READMEs authoritative while exposing examples, packages, and
contribution guidance through navigation and search. Strict documentation
validation and versioned publishing were added in
[Cacti Demos PR #62](https://github.com/hyperledger-cacti/cacti-demos/pull/62).

## Architecture, SATP, and operational guidance

The [architecture overview](../architecture.md) was refreshed to describe
the relationships between core libraries, the API server, ledger
connectors, and interoperability subsystems. Existing architectural material
was retained where it provided useful context.

Navigation was also corrected. The overview places vision,
architecture, and key concepts before Start Here. Ledger support is linked
to the corresponding connector packages, and use-case pages point readers
to demonstrations rather than leaving them with an abstract description.

Obsolete connector pages and references to retired xDai and client-verifier
components were removed from active documentation and configuration where
identified. This did not mean rewriting historical release records or
treating the removal of a documentation page as proof that all related code
had been deleted. The distinction between active guidance and historical
material was part of the cleanup itself.

SATP has a dedicated navigation section that distinguishes SATP Hermes
from the Weaver implementation. For Hermes, architecture, gateway
configuration, the API Type 3 adapter specification, database migrations,
and operations guidance are linked from the site without maintaining
independent copies of the package documentation.

Generated technical reference material has a different purpose from those
guides. The SATP Hermes TypeDoc site is published as its technical reference,
while explanatory and operational content remains under SATP. Its generated
HTML, links, and assets are copied after MkDocs processing so they retain
their original structure. This separation was completed in
[cacti PR #4734](https://github.com/hyperledger-cacti/cacti/pull/4734).

The [References](../references/index.md) section was expanded to connect
documentation with research, demonstrations, workshops, webinars, and
interoperability presentations. The
[business-use-case page](../references/business.md) draws on the IETF SATP
use-cases Internet-Draft and explicitly distinguishes representative
scenarios from evidence of production deployments.

## Preserving useful fixes from earlier contributors

Cleanup also meant revisiting useful contributions that had become stale.
Several follow-ups addressed resource lifecycle and asynchronous behavior:
deprecating the API server's default cockpit path, destroying SATP database
connection pools during shutdown, awaiting gRPC plugin registrations before
binding, preventing re-entrant Ethereum HTTP polling, and closing the Besu
WebSocket provider and completing its transaction subject on shutdown.

Another follow-up implemented SATP lock-expiration validation after its
dependency was merged. It calculates expiration from the negotiated lock
duration, rejects expired or overlong assertions, and returns the
client-facing protocol error in a signed response. The work is recorded in
[cacti PR #4697](https://github.com/hyperledger-cacti/cacti/pull/4697), which
superseded the earlier PR while retaining the original contributor's
co-authorship.

These were focused changes, not a claim that the cleanup initiative
introduced the underlying protocols or framework. Preserving earlier
authorship and addressing existing review feedback were important parts of
bringing useful work forward. Related tooling changes corrected Yarn
installation mode and the Go version used by COPM CI.

## Validate the journey, not just the Markdown

A page can render correctly and still leave its reader unable to complete
a task. The validation work therefore examined the three audience paths:
building and testing a package as a contributor, using a connector API as a
developer, and deploying a SATP gateway as an operator.

That work found stale commands and cross-references, missing deployment
configuration, and a ledger endpoint that was inappropriate for the
container deployment. The resulting fixes were merged in
[cacti PR #4731](https://github.com/hyperledger-cacti/cacti/pull/4731).
Site-verification work also addressed navigation, links, search,
publishing, and the rendering of snippet pages.

Audience-path validation is an ongoing maintenance practice. As packages,
dependencies, and deployment configurations evolve, the documented journeys
need to be checked against the repository rather than assumed to remain
correct because an earlier version worked.

## A community effort

Maintainers and contributors across both repositories have shaped this
work. We thank Sandeep Nishad and the wider Cacti community for technical
review and guidance.

Earlier contributions carried forward through the initiative include work by
Somesh Mal (`malsomesh9`), Oindrila Khan, `mn-ram`, `sputnik-mac`,
`Dev10-sys`, `TRIVENI206`, `A-d-i-t-y`, and `AtharvaKathe18`. Their
co-authorship is preserved in the merged commit history. Documentation and
onboarding improvements also include contributions by Jaime Barrancos,
Abhigyan Singh, Khine Zar Hein, Mustafa Sayyed, `dishathakral`, and
`zjuzhongwen`. The public pull requests and commit history retain the
individual attribution behind this shared effort.

We are also grateful to LF Decentralized Trust for supporting this work
through its mentorship program. Cleanup is not simply removing files. It
requires understanding dependencies, preserving useful knowledge, checking
claims against implementation, and giving the next person a clearer path
through the project.

## Find your starting point

If you are approaching Cacti for the first time, begin with
[Start Here](https://hyperledger-cacti.github.io/cacti/dev/start-here/). Contributors can follow the
[build guide](https://hyperledger-cacti.github.io/cacti/dev/cactus/build/) and
[contribution guide](https://hyperledger-cacti.github.io/cacti/dev/contributing/how-to-contribute/). Developers can
explore the [package index](../cactus/packages.md) and
examples in the [Cacti Demos repository](https://github.com/hyperledger-cacti/cacti-demos).
Operators can begin with the
[SATP Hermes documentation](https://hyperledger-cacti.github.io/cacti/dev/satp-hermes/) and
[operations guidance](https://hyperledger-cacti.github.io/cacti/dev/satp-hermes/operations/).

The aim of the cleanup initiative is to make those starting points lead to
useful work, and to make maintaining them a shared, continuing part of
Hyperledger Cacti.
