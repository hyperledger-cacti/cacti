<!-- --8<-- [start:content] -->
# Contributing to Hyperledger Cacti

- [Ways to Contribute](#ways-to-contribute)
- [Code of Conduct](#code-of-conduct)
- [AI Guidelines](#ai-guidelines)
- [Contribution Workflow](#contribution-workflow)
  - [Git Know How / Reading List](#git-know-how--reading-list)
  - [Small, Focused Pull Requests](#small-focused-pull-requests)
- [Pull Request Principles](#pull-request-principles)
  - [PR Checklist - Contributor / Developer](#pr-checklist---contributor--developer)
- [Commit Messages](#commit-messages)
  - [Commit Email Address](#commit-email-address)
- [DCO - Signed-off-by](#dco---signed-off-by)
  - [Important GitHub Requirements](#important-github-requirements)
- [Inclusive Language](#inclusive-language)
- [Review Process](#review-process)
  - [PR Checklist - Maintainer / Reviewer](#pr-checklist---maintainer--reviewer)
- [Technical Recipes](#technical-recipes)

Thank you for your interest in contributing to Hyperledger Cacti! :tada:

> **First time here?** See [START_HERE.md][start_here] for an
> overview of all documentation paths (contributor, developer, operator).

## Ways to Contribute

Contributions from the development community help improve the capabilities of
Hyperledger Cacti. These contributions are the most effective way to
make a positive impact on the project.

**As a user**, this can include:

* [Reporting bugs][report_bug]
* [Making feature / enhancement proposals][feature_request]

**As a developer:**

* If you only have a little time, consider picking up a ["help-wanted"][help_wanted] or ["good-first-issue"][good_first_issue] task.
* If you can commit to full-time development, please contact us on our [Discord channel][discord] to work through logistics!

We welcome contributions in many forms, whether it is fixing a bug, improving
the documentation, adding a new feature, or adding support for a new DLT
platform.

Please familiarize yourself with the [documentation][docs_site]. In particular,
review the [vision and design methodology][vision] and
[system architecture][architecture]. Follow the tutorial instructions to test the
[Cactus][cactus_intro] and [Weaver][weaver_intro] features respectively.

## Code of Conduct

First things first, please review the
[LF Decentralized Trust Code of Conduct][lf_coc]
before participating and abide by these community standards.

## AI Guidelines

If you use AI or LLM tooling in your contributions, please also review our
[AI Guidelines][ai_guidelines].

## Contribution Workflow

### Git Know How / Reading List

This section is for you if you do not know your way around advanced git concepts such as
- rebasing (interactive or otherwise)
- splitting commits/PRs
- when to use and not to use force push

A word on the controversial topic of force pushes:
In many git guides you will read that force push is basically forbidden.
This is true 99% of the time, BUT if you are the only person working on a branch (which is most of time true for a feature/fix branch of yours that you are planning to submit as a PR) then force pushing is not just allowed but necessary to avoid messy git commit logs.
The question you need to ask yourself before force pushing is this: Am I going to destroy someone else's work on the remote branch? If nobody else is working on the branch then the answer is of course no and force push can be used safely. If others are working with you on the branch on the other hand, it is considered polite to ask and warn them in advance prior to force pushing so that they can take the necessary precautions on their side as well.

A handy tool to avoid destroying other's work accidentally is the new(ish) git feature called `--force-with-lease`:
Using `git push --force-with-lease` instead of vanilla `--force` is highly recommended: https://softwareengineering.stackexchange.com/a/312710

The rustlang documentation has an excellent write-up and additional links on pretty much everything you need to know.
The only difference between their PR requirements and Cacti' is that we do encourage people referencing github issues in commit messages.
Quoting the most relevant parts below (and thanks to the Rust maintainers for this).

> Pull requests are the primary mechanism we use to change Rust. GitHub itself has some great documentation on using the Pull Request feature. We use the "fork and pull" model described here, where contributors push changes to their personal fork and create pull requests to bring those changes into the source repository.
>
> Please make pull requests against the main branch.
>
> Rust follows a no merge policy, meaning, when you encounter merge conflicts you are expected to always rebase instead of merge. E.g. always use rebase when bringing the latest changes from the main branch to your feature branch. Also, please make sure that fixup commits are squashed into other related commits with meaningful commit messages.
>
> GitHub allows closing issues using keywords. This feature should be used to keep the issue tracker tidy.

Source: https://github.com/rust-lang/rust/blob/53702a67e2ae8a404169a0329f6a38d73bf7494d/CONTRIBUTING.md#pull-requests

Further reading:
- https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/about-collaborative-development-models
- https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/about-pull-requests

### Small, Focused Pull Requests

Pull requests **must** be small, self-contained chunks of work that
address a single concern - one bug fix, one feature, or one
refactoring. This is a core contribution principle, not a suggestion.

- **One logical change per PR.** Do not bundle unrelated fixes,
  features, or style changes in the same pull request.
- **Prefer small diffs.** Smaller PRs are easier to review, less
  likely to introduce regressions, and faster to merge. If a change
  grows large, split it into a series of incremental PRs.
- **Each commit should be self-contained.** Ideally a PR has a single
  commit. When multiple commits are necessary (e.g., a feature commit
  plus a test-tooling change), each commit must stand on its own and
  be independently understandable.
- **AI-generated PRs are not exempt.** AI tooling can easily produce
  large, sprawling changes. Contributors using AI assistants must
  still break work into focused, reviewable units — see
  [AI Guidelines §2.4][ai_guidelines_compliance].

Small, focused PRs significantly reduce the cognitive load on
reviewers, speed up the review cycle, and keep the git history clean
and bisectable.

See [PULL.md][pull_doc] for the full Pull Request Guidelines,
including concrete examples.

## Pull Request Principles

### PR Checklist - Contributor / Developer

**To avoid issues in the future, do not install dependencies globally. Ensure all dependencies are kept self-contained.**

1. Fork [hyperledger-cacti/cacti](https://github.com/hyperledger-cacti/cacti) via Github UI
   - If you are using the Git client on the Windows operating system, you will need to enable long paths for git
     which you can do in PowerShell by executing the command below.
     To clarify, this may also apply if you are using any Git GUI application on Windows such as `Github Desktop` or others.

     ```shell
     git config --global core.longpaths true
     ```

2. Clone the fork to your local machine
3. (Optional) Create a local branch for minimizing code conflicts when you want to contribute multiple changes regarding different issues in parallel. See the [Git Branch Setup][recipe_git_branch] recipe for details.
4. Complete the desired changes and where possible test locally
5. Make sure you have set up your git signatures
   1. Note: Always sign your commits using the `git commit -s`
   2. For more information see [here](https://gist.github.com/tkuhrt/10211ae0a26a91a8c030d00344f7d11b)
6. Think about/decide on what your commit message will be.
   1. The commit message syntax might be hard to remember at first so we invite you to use the `npm run commit` command which upon execution presents you with a series of prompts that you can fill out and have your input validated in realtime, making it impossible (or at least much harder) to produce an invalid commit message that the commit lint bot on Github will flag with an error.
7. Commit your changes
    1. Make sure your commit message follows the formatting requirements (details above) and here: [Conventional Commits syntax](https://www.conventionalcommits.org/en/v1.0.0-beta.4/#specification); this aids in release notes generation which we intend to automate
    2. Be aware that we are using git commit hooks for the automation of certain mundane tasks such as applying the required code style and formatting so your code will be wrapped at 80 characters each line automatically. If you wish to see how your changes will be altered by the formatter you can run the `npm run prettier` command from a terminal or install an IDE extension for the `Prettier` tool that can do the same (VSCode has one that is known to work).
    3. Ensure your code complies with the repository conventions documented in [CONVENTIONS.md][conventions_doc].
8. Ensure your branch is rebased onto the `upstream` main branch where `upstream` is fancy git talk for the main Cacti repo on Github (the one you created your fork from).
   1. **Do not** duplicate your pull request after it has been reviewed. Duplication here means closing the existing PR and then opening a brand new one which does not contain the review history anymore. If you encounter issues with version control that you do not know how to solve the maintainers will be happy to assist to ensure that you do not need to open a new pull request from scratch.
      1. The only exception from the rule above is if you mistakenly named your branch to contain special characters and somehow ended up in a state where it has become impossible to push changes to the remote due to this (which has happened before with branch names like `refactor(core-api): x` that had to  be renamed to `refactor-core-api-x` and then a new PR had to be created in that case because GitHub does not let you rename the remote branch that your pull request is tied to)
   2. If you are having trouble, there are many great resources out there (so we will not write another here).
      1. If you are having trouble locating a suitable guide specifically on the mechanics of rebasing, we can recommend [this one](https://thoughtbot.com/blog/git-interactive-rebase-squash-amend-rewriting-history). Thanks to Rafael for the link!
      2. If you went through that tutorial and still not quite sure what's up, give this one a shot as well: https://about.gitlab.com/blog/2020/11/23/keep-git-history-clean-with-interactive-rebase/
   3. If merge conflicts arise, you must fix these at rebase time since omitting this step does not magically make the conflicts go away, just pushes it over the fence to the maintainer who will attempt to merge your pull request at a later point in time.
   4. If the above happens, at that point said maintainer will most likely ask you (if not already) to perform the rebase anyway since as the author of a change you are best positioned to resolve any conflicts on the code level. Occassionally maintainers may do the merge/conflict resolution themselves, but do not count on this nor try to make a habit out of relying on the potential kindness.
   5. After successful rebasing, take another look at your commit(s). Ideally there should be just one in each pull request, but also on the other hand each commit should be as small, simple and self contained as possible, so there can be cases where it makes sense to submit a PR with multiple commits if for example you also had to change something in the test tooling while implementing a feature (in which case there could be a commit for the feature itself and another for the necessary changes to the test tooling package). What we respectfully ask though is that you try to avoid these situations and submit most of your PRs with a single, self contained commit that does not touch multiple things. This significantly reduces the cognitive load required to review the changes which in turn makes everyone happier: the maintainers will have an easier job reviewing, which means they'll be doing it faster which will (probably) cause you joy in turn.
9.  Push your changes to your main (or whatever you named your feature branch, that is entirely up to you at the end of the day)
10. Initiate a pull request from your fork to the base repository
   6. Remember: Opening a pull request is like saying "Hey maintainers, I have this change finalized and ready for you to spend time on reviewing it." The word `finalized` here is understood to imply that you are not planning on doing any more changes on the branch apart from when being asked to by the reviewers.
   7. It is perfectly acceptable to open a pull request and mark it as `draft` (a GitHub feature) which then signals to the maintainers that if they have time, they are welcome to look at the change, but it may or may not be in its final form yet so you are not responsible for potential loss of time on their end if the review has to be performed multiple times on account of changes. Once you promote your draft PR to a real one, the comments from the point above apply however.
   8. If your pull request contains a significant change, we recommend that you apply the similarly named github label on in it as well. It is okay if you do not do this, if we detect that the change is indeed significant, we will apply the label. If you do it in advance however, it will probably speed up the proceedings by removing one communication roundtrip from the review process of your pull request.
11. Await CI, DCO & linting quality checks, as well as any feedback from reviewers
12. If you need to update your pull request either because you discovered an issue or because you were asked to do so we ask that you:
   9.  try to add the change in a way that does not produce additional commits on the PR but instead do an `git commit --amend --signoff` on your local branch and then a force push to the remote branch of yours (the PR essentially). Again, if the change you are doing does not fit within any one of the existing commits of your PR, then it is justified to add a new commit and this is up to your discretion (maintainers may respectfully ask you to squash if they see otherwise)
   10. The rule of thumb for any and all things in git/Cacti is to maintain a clean, tidy commit log/history that enables everyone to easily look up changes and find accurate answers to the basic questions of `Who? / What? / When / Why?`. If you have ever been in a situation when you tried to figure out the original point a bug was introduced (and tried to figure out why the offending change was made in the first place) and the git blame just lead you to a 10 megabyte large patch with the message 'merge xyz', then you know exactly what it is we are trying to avoid here. :-)

## Commit Messages

Commit messages should follow common Git conventions, such as using the
imperative mood, separate subject lines, and a line length of 72 characters.
These rules are well documented in
[Chris Beam's blog post](https://chris.beams.io/posts/git-commit/#seven-rules).

We use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0-beta.4/#specification)
syntax. You can use the interactive `npm run commit` command to help format your
commit message correctly.

### Commit Email Address

Your commit email address must match your GitHub email address. For more
information, see https://help.github.com/articles/setting-your-commit-email-address-in-git/

## DCO - Signed-off-by

Each commit must include a "Signed-off-by" line in the commit message
(`git commit -s`). This sign-off indicates that you agree the commit satisfies
the [Developer Certificate of Origin (DCO)](http://developercertificate.org/).

### Important GitHub Requirements

A pull request cannot be merged until it has passed these status checks:

* The build must pass all checks
* The PR must be approved by at least two reviewers without any
  outstanding requests for changes

## Inclusive Language

- Consider that users who will read the source code and documentation are from different backgrounds and cultures and that they have different preferences.
- Avoid potential offensive terms and, for instance, prefer "allow list and deny list" to "white list and black list".
- We believe that we all have a role to play to improve our world, and even if writing inclusive code and documentation might not look like a huge improvement, it's a first step in the right direction.
- We suggest to refer to [Microsoft bias free writing guidelines](https://learn.microsoft.com/en-us/style-guide/bias-free-communication) and [Google inclusive doc writing guide](https://developers.google.com/style/inclusive-documentation) as starting points.

## Review Process

### PR Checklist - Maintainer / Reviewer

Ensure all the following conditions are met (on top of you agreeing with the change itself)

1. All automated checks that are not explicitly called out here are also passing/green.
2. Branch is rebased onto main and there are no dangling/duplicate commits.
3. Commits appear simple and self contained. Simple is always relative to the mangitude of the change itself of course. A 1k line change can still be simple if all it does is rename some commonly used variable in each place its being used.
4. If the contributors are having trouble with git basic functionality such as rebasing / force pushing, DCO, do your best to help them out, when in doubt feel free to reach out to Peter (who is the one insisting an all these git rules so he deserves to be the primary contact for all git related issues).
   1. Remember that we want to foster a welcoming community so if someone is new to git try to be extra patient with them on this front.
5. Ensure the commit messages are according to the standard format.
   1. Remember that if you select 'squash' on the Github UI when accepting the pull request, Github will (by default) offer up the title of the pull request as the new commit message for your squash commit. This is not good unless the title happens to be a valid commit message, but in the likely event of it not being as such, you must take special care to type in a valid commit message right there and then on the Github UI.
   2. To avoid the hassle/potential issues with the above, it is recommended that you always use 'rebase' when accepting a pull request even if there are multiple commits that you'd otherwise like to see squashed.
   3. If you are adamant that you do not want to merge a PR with multiple commits, that is completely understandable and fair game. The recommended approach there is to ask the contributor to break the pull request up to multiple pull requests by doing an interactive rebase on their branch and cherry picking/re-ordering things accordingly. This is a fairly advanced git use case so you might want to help them out with it (or ask Peter who is the one constantly nagging everyone about these git rules...)

To protect the Hyperledger Cacti source code, GitHub pull requests are accepted from forked repositories only. There are also quality standards identified and documented here that will be enhanced over time.

## Technical Recipes

The technical instructions for working with the Cacti codebase have been moved to dedicated recipes in our `docs/recipes` directory to keep this contributing guide focused on process and governance.

| Recipe | Description |
|---|---|
| [Git Branch Setup][recipe_git_branch] | How to fork, branch, rebase, and set up your git hooks. |
| [Create a New Package][recipe_new_package] | Structure and scaffolding for creating a new Cacti package. |
| [Testing Guide][recipe_testing] | Test principles, tap compatibility, parallelism, and test commands. |
| [Ledger Plugin Testing][recipe_ledger_testing] | Writing and running integration tests for ledger connectors with all-in-one docker images. |
| [Building API Clients][recipe_api_clients] | How OpenAPI definitions automatically generate API clients. |
| [Managing Dependencies][recipe_dependencies] | Adding and locking npm dependencies with Yarn Workspaces. |
| [VS Code Setup][recipe_vscode] | Refreshing types and configuring the launch.json debugger. |
<!-- --8<-- [end:content] -->

<!--
=============================================================================
GITHUB REFERENCE LINKS
These links are used when viewing this file directly on GitHub.
When this file is rendered via MkDocs (through a snippet wrapper), the
wrapper file provides its own set of reference links that override these.
=============================================================================
-->

[start_here]: ./START_HERE.md
[report_bug]: https://github.com/hyperledger-cacti/cacti/issues/new?template=bug_report.yml
[feature_request]: https://github.com/hyperledger-cacti/cacti/issues/new?template=feature_request.yml
[help_wanted]: https://github.com/hyperledger-cacti/cacti/labels/help%20wanted
[good_first_issue]: https://github.com/hyperledger-cacti/cacti/labels/good%20first%20issue
[discord]: https://discord.com/channels/905194001349627914/908379338716631050
[docs_site]: https://hyperledger-cacti.github.io/cacti/
[vision]: https://hyperledger-cacti.github.io/cacti/vision/
[architecture]: https://hyperledger-cacti.github.io/cacti/architecture/
[cactus_intro]: https://hyperledger-cacti.github.io/cacti/cactus/introduction/
[weaver_intro]: https://hyperledger-cacti.github.io/cacti/weaver/introduction/
[lf_coc]: https://lf-decentralized-trust.github.io/governance/governing-documents/code-of-conduct
[ai_guidelines]: ./AI_GUIDELINES.md
[ai_guidelines_compliance]: ./AI_GUIDELINES.md#24-compliance-with-project-standards
[pull_doc]: ./PULL.md
[conventions_doc]: ./CONVENTIONS.md
[recipe_git_branch]: ./docs/recipes/git-branch-setup.md
[recipe_new_package]: ./docs/recipes/create-new-package.md
[recipe_testing]: ./docs/recipes/testing-guide.md
[recipe_ledger_testing]: ./docs/recipes/ledger-plugin-testing.md
[recipe_api_clients]: ./docs/recipes/building-api-clients.md
[recipe_dependencies]: ./docs/recipes/managing-dependencies.md
[recipe_vscode]: ./docs/recipes/vscode-setup.md
