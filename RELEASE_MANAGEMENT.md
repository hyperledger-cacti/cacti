# Hyperledger Cacti - Release Management

This document describes the steps to be taken by maintainers who are
issuing releases. 

> We aim to have as much of the process automated as
> possible, but there will always be certain (slightly mundane) tasks to that
> must be performed by a human with the right credentials (e.g. a maintainer)
> and this document has to be kept up to date in the event of any of these
>  steps changing.

## General Best Practices

1. Releases to be issued from the `main` branch only.
2. Semantic versioning is highly preferred: https://semver.org/
3. Git tags are to be applied for commits that were chosen for release.
4. Tag names must follow the pattern of `vX.Y.Z` for example `v2.0.0`

## Checklist / Steps To Take For Issuing a Release

The below document uses `v1.1.3` as the example, when issuing a release you need to change this to whatever is the upcoming release that you are about to issue.
Hence the first step is to update (find and replace all) the document (no need to send a PR with those changes) so that the helper scripts are changed as well.

### Do a find and replace all for the version: 1.1.3

```sh
git fetch --all
git switch main
git rebase upstream/main
git push --force-with-lease
git checkout -b release-v1.1.3
yarn run configure
yarn lerna version 1.1.3 --ignore-scripts --conventional-commits --exact --git-remote upstream --message="chore(release): publish %s" --no-push --no-git-tag-version --no-ignore-changes --force-publish
yarn tools:bump-openapi-spec-dep-versions
yarn codegen
./tools/weaver-update-version.sh 1.1.3 .
./tools/go-gen-checksum.sh 1.1.3 .
```

- Do note the `.` as the last parameter in last two commands.

- Double check that all of the package dependencies were updated from the previous
version to the new one because lerna usually fails to do that for `devDependency` parts
of the package.json files so you have to do this manually with search and replace through
the entire repository...

The trick is to search for the previous release version within package.json 
files or just search for "@hyperledger/cactus-*" within the package.json files. 

With VSCode you can do a project wide search & replace where:
  1. Make sure that regex based replacing is enabled on the VSCode search UI (top right corner of the search panel)
  2. You set the files to include to "package.json" (so that only files named package.json are included in the search)
  3. You set the search term to this to find the OLD versions (without the backticks if you are reading this in plain text) `@hyperledger/cactus-(.*): "1.1.2"`
  4. You set the replacement term to this (so that it swaps the version numbers with the new one) `@hyperledger/cactus-$1: "1.1.3"`

- Also double check that the `"version": "?.?.?"` property has been updated in the package.json files all over the packages.

- update the lock file if necessary
    ```sh
    $ yarn
    ```

- Double check that the configure script still works (CI will fail without it anyway)
    ```sh
    $ yarn configure
    ```

- Double check that the changelog does not contain your fork's links instead of the upstream repo. You'll need to change this manually otherwise. For example, replace: 
    - `https://github.com/petermetz/cactus` 
    with 
    - `https://github.com/hyperledger/cactus`

```sh
git add . && git commit --signoff --gpg-sign --message="chore(release): publish v1.1.3"
git push --set-upstream upstream release-v1.1.3
```

### Then create a PR here - once that's merged, rebase onto upstream/main and:


1. Do a merge freeze
2. Unfreeze the specific pull request that you just opened for the release issuance
3. Wait for the PR to be approved as per standard governance rules
4. Execute these commands (assuming your fork's git remote is `origin` and the official Hyperledger repo's is `upstream`)
```sh
    git fetch --all
    git switch main
    git rebase upstream/main
    git merge --ff-only upstream/release-v1.1.3
    git push upstream
    git push origin
    git tag -s -a "v1.1.3" -m "v1.1.3"
    git push upstream --follow-tags
```
1. Lift the pull request merge freeze
2. Create release on GitHub

### Go and create a release on GitHub manually from the CHANGELOG.md file in the project root.

### Close out the current milestone after moving all issues to the next one that were still unresolved in it

```sh
yarn run configure && yarn run build && yarn lerna publish from-git --loglevel=debug --summary-file
```

### To Ignore Failing Lifecycle Scripts

```sh
yarn lerna publish from-git --loglevel=debug --force-publish --ignore-scripts --ignore-prepublish --summary-file
```
