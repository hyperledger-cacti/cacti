#!/bin/bash

# Manually publish the Weaver Go modules, mirroring .github/workflows/weaver_deploy_go-pkgs.yml.
#
# A Go module is "published" by creating a git tag `<module-path>/vX.Y.Z` and a
# GitHub Release at the release commit (no registry upload). Assumes go.mod/go.sum
# for the new version are already correct on remote main and that the `vX.Y.Z`
# tag exists there. The only guard is skip-if-the-module-tag-already-exists.
#
# Requires: gh authenticated (e.g. `export GH_TOKEN=<fresh_pat>` with repo/contents:write).
# Usage: tools/weaver-go-release.sh [vX.Y.Z] [--dry-run]
#   --dry-run  log the tag, commit, title and body for each release without creating anything.

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Canonical repo to publish to. Explicit so `gh` never asks for a default
# remote (this clone has several fork remotes) and releases can't land on a fork.
REPO="hyperledger-cacti/cacti"

DRY_RUN=false
VERSION=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *) VERSION="$arg" ;;
  esac
done

VERSION="${VERSION:-v3.0.0}"                     # version already tagged on remote main
RELEASE_DATE=$(date +'%b %d, %Y')                # same format as the workflow, e.g. "Aug 20, 2026"
# Commit strictly from the REMOTE tag matching VERSION on origin — not a local
# (possibly stale) tag, and never a branch/HEAD of the same name. The module
# releases are tagged at exactly what origin published. "^{}" peels annotated
# tags to their commit; awk END yields the commit for both annotated (peel line
# last) and lightweight (single line) tags. Empty => the tag isn't on origin.
COMMIT=$(git ls-remote origin "refs/tags/$VERSION" "refs/tags/$VERSION^{}" | awk 'END{print $1}')
if [ -z "$COMMIT" ]; then
  echo "ERROR: no tag '$VERSION' on origin ($REPO) — nothing to release from" >&2
  exit 1
fi

$DRY_RUN && echo "=== DRY-RUN: no releases will be created ==="

# dependency order (protos-go first → go-sdk last)
MODULES=(
  "weaver/common/protos-go|GO Weaver Protos"
  "weaver/core/network/fabric-interop-cc/libs/utils|GO Fabric Utils Library for Interoperation"
  "weaver/core/network/fabric-interop-cc/libs/assetexchange|GO Fabric Library for Asset Exchange"
  "weaver/core/network/fabric-interop-cc/interfaces/asset-mgmt|GO Fabric Asset Management Interface"
  "weaver/core/network/fabric-interop-cc/contracts/interop|GO Fabric Interop Chaincode"
  "weaver/sdks/fabric/go-sdk|GO Fabric Weaver SDK"
)

for entry in "${MODULES[@]}"; do
  M="${entry%%|*}"; DESC="${entry#*|}"
  TAG="$M/$VERSION"

  # the ONLY check: skip if this module tag already exists (exact ref match)
  if git ls-remote origin "refs/tags/$TAG" | grep -q .; then
    echo "SKIP $TAG (already released)"; continue
  fi

  # exact title from workflow: <VERSION> - <MODULE_DESC> - <RELEASE_DATE>
  TITLE="$VERSION - $DESC - $RELEASE_DATE"

  # exact body from workflow (unquoted heredoc: $M/$VERSION expand, backticks kept literal)
  NOTES=$(cat <<EOF
- Go Module: \`github.com/hyperledger-cacti/cacti/$M\`
- Release: $VERSION
- Readme: [Here](https://github.com/hyperledger-cacti/cacti/blob/$M/$VERSION/$M/README.md).
- Source: [Here](https://github.com/hyperledger-cacti/cacti/blob/$M/$VERSION/$M)
EOF
)

  if $DRY_RUN; then
    echo "[DRY-RUN] would create release:"
    echo "  tag:    $TAG"
    echo "  commit: $COMMIT"
    echo "  title:  $TITLE"
    echo "  body:"
    echo "$NOTES" | sed 's/^/    /'
    echo ""
  else
    echo "PUBLISH $TAG"
    gh release create "$TAG" --repo "$REPO" --target "$COMMIT" --title "$TITLE" --notes "$NOTES"
  fi
done
