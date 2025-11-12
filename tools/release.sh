#!/bin/bash

set -e

if [ -z $1 ]; then
    echo "Required: version as first argument as A.B.C, Exiting..."
    exit 1
fi

VERSION=$1

if [[ $VERSION =~ ^v ]]; then
    VERSION="${VERSION#v}"
fi

echo "Release version: v$VERSION"

function release() {
    git checkout -b release-v$VERSION
    if [ $? -ne 0 ]; then return 1; fi
    yarn run configure
    if [ $? -ne 0 ]; then return 1; fi
    yarn lerna version $VERSION --ignore-scripts --conventional-commits --exact --git-remote upstream --message="chore(release): publish %s" --no-push --no-git-tag-version --no-ignore-changes
    if [ $? -ne 0 ]; then return 1; fi
    yarn tools:bump-openapi-spec-dep-versions --target-version=$VERSION
    if [ $? -ne 0 ]; then return 1; fi
    yarn codegen
    if [ $? -ne 0 ]; then return 1; fi
    yarn build:dev
    if [ $? -ne 0 ]; then return 1; fi
    ./tools/weaver-update-version.sh $VERSION .
    if [ $? -ne 0 ]; then return 1; fi
    ./tools/go-gen-checksum.sh $VERSION .
    if [ $? -ne 0 ]; then return 1; fi
    git add . && git commit -s -m "chore(release): publish v$VERSION"
    return 0
}

release || (echo "Resetting all changes and switching to main" && git reset --hard HEAD && git checkout main && git branch -D release-v$VERSION)