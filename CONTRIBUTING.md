Thank you for your interest to contribute to Hyperledger Cactus! :tada:

First things first, please review the [Hyperledger Code of Conduct](https://wiki.hyperledger.org/display/HYP/Hyperledger+Code+of+Conduct) before participating.

There are many ways to contribute to Hyperledger Cactus, both as a user and as a developer.

As a user, this can include:
* [Making Feature/Enhancement Proposals](https://github.com/hyperledger/cactus/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=)
* [Reporting bugs](https://github.com/hyperledger/cactus/issues/new?assignees=&labels=bug&template=bug_report.md&title=)

As a developer:
* if you only have a little time, consider picking up a [“help-wanted”](https://github.com/hyperledger/cactus/labels/help%20wanted) or ["good-first-issue"](https://github.com/hyperledger/cactus/labels/good%20first%20issue) task
* If you can commit to full-time development, then please contact us on our [Rocketchat channel](https://chat.hyperledger.org/channel/cactus) to work through logistics!

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
The only difference between their PR requirements and Cactus' is that we do encourage people referencing github issues in commit messages.
Quoting the most relevant parts below (and thanks to the Rust maintainers for this).

> Pull requests are the primary mechanism we use to change Rust. GitHub itself has some great documentation on using the Pull Request feature. We use the "fork and pull" model described here, where contributors push changes to their personal fork and create pull requests to bring those changes into the source repository.
>
> Please make pull requests against the master branch.
>
> Rust follows a no merge policy, meaning, when you encounter merge conflicts you are expected to always rebase instead of merge. E.g. always use rebase when bringing the latest changes from the master branch to your feature branch. Also, please make sure that fixup commits are squashed into other related commits with meaningful commit messages.
>
> GitHub allows closing issues using keywords. This feature should be used to keep the issue tracker tidy.

Source: https://github.com/rust-lang/rust/blob/master/CONTRIBUTING.md#pull-requests

Further reading:
- https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/about-collaborative-development-models
- https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/about-pull-requests


### PR Checklist - Contributor/Developer

1. Fork [hyperledger/cactus](https://github.com/hyperledger/cactus) via Github UI
2. Clone the fork to your local machine
3. Complete the desired changes and where possible test locally
   1. You can run the full CI suite on Mac/Linux/WSL by running the script at `./tools/ci.sh`
   2. If you do not have your environment set up for running bash scripts, do not worry, all pull requests will automatically have the same script executed for it when opened. The only downside is the slower feedback loop.
4. Make sure you have set up your git signatures
   1. Note: Always sign your commits using the `git commit -S`
   2. For more information see [here](https://gist.github.com/tkuhrt/10211ae0a26a91a8c030d00344f7d11b)
5. Think about/decide on what your commit message will be.
   1. The commit message syntax might be hard to remember at first so you we invite you to use the `npm run commit` command which upon execution presents you with a series of prompts that you can fill out and have your input validated in realtime, making it impossible (or at least much harder) to produce an invalid commit message that the commit lint bot on Github will flag with an error.
      1. The use of this tool described above is entirely optional in case you need a crutch.
      2. Note that running the `npm run commit` command will also attempt to perform the actual commit at the end unless you kill the process with `Ctrl + C` or whatever is your terminal's shortcut for the same action.
      3. The `npm run commit` command will also attempt to sign the produced commit so make sure that it is set up properly prior to using it.
6. Commit your changes
    1. Make sure your commit message follows the formatting requirements (details above) and here: [Conventional Commits syntax](https://www.conventionalcommits.org/en/v1.0.0-beta.4/#specification); this aids in release notes generation which we intend to automate
    2. Be aware that we are using git commit hooks for the automation of certain mundane tasks such as applying the required code style and formatting so your code will be wrapped at 80 characters each line automatically. If you wish to see how your changes will be altered by the formatter you can run the `npm run prettier` command from a terminal or install an IDE extension for the `Prettier` tool that can do the same (VSCode has one that is known to work).
7. Ensure your branch is rebased onto the `upstream` master branch where `upstream` is fancy git talk for the main Cactus repo on Github (the one you created your fork from).
   1. If you are having trouble, there are many great resources out there (so we will not write another here).
      1. If you are having trouble locating a suitable guide specifically on the mechanics of rebasing, we can recommend [this one](https://thoughtbot.com/blog/git-interactive-rebase-squash-amend-rewriting-history). Thanks to Rafael for the link!
   2. If merge conflicts arise, you must fix these at rebase time since omitting this step does not magically make the conflicts go away, just pushes it over the fence to the maintainer who will attempt to merge your pull request at a later point in time.
   3. If the above happens, at that point said maintainer will most likely ask you (if not already) to perform the rebase anyway since as the author of a change you are best positioned to resolve any conflicts on the code level. Occassionally maintainers may do the merge/conflict resolution themselves, but do not count on this nor try to make a habit out of relying on the potential kindness.
   4. After successful rebasing, take another look at your commit(s). Ideally there should be just one in each pull request, but also on the other hand each commit should be as small, simple and self contained as possible, so there can be cases where it makes sense to submit a PR with multiple commits if for example you also had to change something in the test tooling while implementing a feature (in which case there could be a commit for the feature itself and another for the necessary changes to the test tooling package). What we respectfully ask though is that you try to avoid these situations and submit most of your PRs with a single, self contained commit that does not touch multiple things. This significantly reduces the cognitive load required to review the changes which in turn makes everyone happier: the maintainers will have an easier job reviewing, which means they'll be doing it faster which will (probably) cause you joy in turn.
8. Push your changes to your master (or whatever you named your feature branch, that is entirely up to you at the end of the day)
9.  Initiate a pull request from your fork to the base repository
   1. Remember: Opening a pull request is like saying "Hey maintainers, I have this change finalized and ready for you to spend time on reviewing it." The word `finalized` here is understood to imply that you are not planning on doing any more changes on the branch apart from when being asked to by the reviewers.
   2. It is perfectly acceptable to open a pull request and mark it as `draft` (a GitHub feature) which then signals to the maintainers that if they have time, they are welcome to look at the change, but it may or may not be in its final form yet so you are not responsible for potential loss of time on their end if the review has to be performed multiple times on account of changes. Once you promote your draft PR to a real one, the comments from the point above apply however.
   3. If your pull request contains a significant change, we recommend that you apply the similarly named github label on in it as well. It is okay if you do not do this, if we detect that the change is indeed significant, we will apply the label. If you do it in advance however, it will probably speed up the proceedings by removing one communication roundtrip from the review process of your pull request.
10. Await CI, DCO & linting quality checks, as well as any feedback from reviewers
11. If you need to update your pull request either because you discovered an issue or because you were asked to do so we ask that you:
   4.  try to add the change in a way that does not produce additional commits on the PR but instead do an `git commit --amend --signoff` on your local branch and then a force push to the remote branch of yours (the PR essentially). Again, if the change you are doing does not fit within any one of the existing commits of your PR, then it is justified to add a new commit and this is up to your discretion (maintainers may respectfully ask you to squash if they see otherwise)
   5.  The rule of thumb for any and all things in git/Cactus is to maintain a clean, tidy commit log/history that enables everyone to easily look up changes and find accurate answers to the basic questions of `Who? / What? / When / Why?`. If you have ever been in a situation when you tried to figure out the original point a bug was introduced (and tried to figure out why the offending change was made in the first place) and the git blame just lead you to a 10 megabyte large patch with the message 'merge xyz', then you know exactly what it is we are trying to avoid here. :-)

### PR Checklist - Maintainer/Reviewer

Ensure all the following conditions are met (on top of you agreeing with the change itself)

1. All automated checks that are not explicitly called out here are also passing/green.
2. Branch is rebased onto master and there are no dangling/duplicate commits.
3. Commits appear simple and self contained. Simple is always relative to the mangitude of the change itself of course. A 1k line change can still be simple if all it does is rename some commonly used variable in each place its being used.
4. If the contributors are having trouble with git basic functionality such as rebasing / force pushing, DCO, do your best to help them out, when in doubt feel free to reach out to Peter (who is the one insisting an all these git rules so he deserves to be the primary contact for all git related issues).
   1. Remember that we want to foster a welcoming community so if someone is new to git try to be extra patient with them on this front.
5. Ensure the commit messages are according to the standard format.
   1. Remember that if you select 'squash' on the Github UI when accepting the pull request, Github will (by default) offer up the title of the pull request as the new commit message for your squash commit. This is not good unless the title happens to be a valid commit message, but in the likely event of it not being as such, you must take special care to type in a valid commit message right there and then on the Github UI.
   2. To avoid the hassle/potential issues with the above, it is recommended that you always use 'rebase' when accepting a pull request even if there are multiple commits that you'd otherwise like to see squashed.
   3. If you are adamant that you do not want to merge a PR with multiple commits, that is completely understandable and fair game. The recommended approach there is to ask the contributor to break the pull request up to multiple pull requests by doing an interactive rebase on their branch and cherry picking/re-ordering things accordingly. This is a fairly advanced git use case so you might want to help them out with it (or ask Peter who is the one constantly nagging everyone about these git rules...)

To protect the Hyperledger Cactus source code, GitHub pull requests are accepted from forked repositories only. There are also quality standards identified and documented here that will be enhanced over time.





### Adding a new public npm dependency to one of the packages:

For example web3 can be added as a dependency to the besu ledger connector plugin's package this way:

```sh
npx lerna add web3@latest --scope '*/*plugin-ledger-connector-besu' --exact # [--dev] [--peer]
```

If you are adding a development dependency you can use the `--dev` option and `--peer` for a peer dependency.

### Adding a sibling package npm dependency to one of the packages:

For example the `cactus-test-tooling` can be added as a dev dependency to the besu ledger connector plugin's package this way:

```sh
npx lerna add @hyperledger/cactus-test-tooling --scope '*/*plugin-ledger-connector-besu' --exact --dev
```

Or add the common library to allow you the usage of the logger for example:

```sh
npx lerna add @hyperledger/cactus-common --scope '*/*plugin-ledger-connector-quorum' --exact --dev
```
