#!/usr/bin/env bash
#
# commit-type-lint.sh
#
# Validate a pull request's conventional-commit *type* against the nature of
# the files it changes, so that changelog-worthy types (feat/fix/...) are only
# used when the PR actually contains a changelog-worthy change, and vice versa.
#
# This script is a pure function of its inputs: it performs no network calls.
# The caller (CI) fetches the PR's changed-files payload and passes it in, so
# the script needs no GitHub token, PR number, or repo slug.
#
# Classification:
#   - HAS_CORE_CODE     : a source file under packages/ or weaver/ has a real
#                         (non-comment, non-blank) code change.
#   - HAS_DEP_MANIFEST  : a dependency manifest (package.json, go.mod, Cargo.*,
#                         Dockerfile, gradle, workflow/action pins, ...) changed.
#   - neither           : docs/tests/tooling/etc. only.
#
# A code file that only changed comments or whitespace does NOT count as core,
# so such PRs may use a non-changelog type. Detection errs on the side of
# "code": anything not positively identified as a comment (including a file
# whose diff was omitted by the API) is treated as real code, so a real change
# can never masquerade as comment-only.
#
# Usage:
#   PR_TITLE="feat(core): ..." tools/commit-type-lint.sh --files <pr-files.json>
#
# Arguments:
#   --files <path>   the GitHub "list pull request files" API response, slurped
#                    into a single JSON array-of-arrays, e.g.:
#                      gh api --paginate --slurp \
#                        "repos/<owner/repo>/pulls/<number>/files" > pr_files.json
#                    Each element provides .filename and (for text files) .patch.
#
# Environment:
#   PR_TITLE  (required)   the PR title / commit subject to validate. Passed via
#                          the environment (never as a shell argument) so that a
#                          crafted PR title cannot be used for command injection.
#
# Exit status: 0 = valid, 1 = invalid type for the change set, 2 = usage error.

set -euo pipefail

FILES_JSON=""
while [ $# -gt 0 ]; do
  case "$1" in
    --files) FILES_JSON="${2:-}"; shift 2 ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

: "${PR_TITLE:?PR_TITLE environment variable is required}"
[ -n "$FILES_JSON" ] || { echo "--files <path> is required" >&2; exit 2; }
[ -f "$FILES_JSON" ] || { echo "--files: no such file: $FILES_JSON" >&2; exit 2; }
export FILES_JSON

# Changed file paths (from the payload's .filename fields).
CHANGED_FILES=$(python3 - <<'PY'
import json, os
for page in json.load(open(os.environ["FILES_JSON"])):
    for f in page:
        print(f["filename"])
PY
)

echo "Files changed:"
printf '%s\n' "$CHANGED_FILES"

PR_TYPE=$(printf '%s' "$PR_TITLE" | sed -E 's/^([a-z]+)(\(.*\))?:.*/\1/')

# Release PRs follow a fixed pattern and bypass classification.
if printf '%s' "$PR_TITLE" | grep -Eq '^chore\(release\):'; then
  echo "✅ Release commit detected — skipping classification."
  exit 0
fi

CHANGELOG_TYPES="feat fix refactor build perf"
NON_CHANGELOG_TYPES="ci test chore docs style refactor build"

# True when the given file's diff contains at least one changed (+/-) line that
# is not a comment or blank. Comment prefixes cover every language classified
# below: // and /* * */ for the C-family (js/ts/go/rust/kotlin/solidity/java/
# c/cpp/cs/scala) and # for Python. A file with no patch in the payload (binary
# or a diff too large for the API to include) is conservatively treated as a
# real code change. Returns 0 = real code change, 1 = only comment/blank changes.
file_has_real_code_change() {
  python3 - "$1" <<'PY'
import json, os, sys

target = sys.argv[1]
patch = None
for page in json.load(open(os.environ["FILES_JSON"])):
    for f in page:
        if f["filename"] == target:
            patch = f.get("patch")

if patch is None:
    sys.exit(0)  # no diff available -> assume real code (conservative)

for line in patch.splitlines():
    if line.startswith(("+++", "---")) or not line or line[0] not in "+-":
        continue  # hunk headers and unchanged context lines
    code = line[1:].strip()
    if not code:
        continue  # blank added/removed line
    if code.startswith(("//", "/*", "*/", "*", "#")):
        continue  # comment line
    sys.exit(0)  # a real code line changed

sys.exit(1)  # every changed line was a comment or blank
PY
}

HAS_CORE_CODE=false
HAS_DEP_MANIFEST=false
# Here-string keeps the loop in the current shell so the flags set below persist.
while IFS= read -r file; do
  [ -z "$file" ] && continue

  # Non-core paths — never count as core regardless of extension. Workflow and
  # composite-action files under .github/ are handled by the dep-manifest
  # classifier below (they pin action versions), so let them fall through.
  case "$file" in
    .github/workflows/*|.github/actions/*) ;;
    .github/*|docs/*|*/docs/*|*.md|tools/*|.husky/*|examples/*|weaver/samples/*) continue ;;
    *test*|*spec*) continue ;;
    */generated/*) continue ;;
  esac

  # Source-code extension under packages/ or weaver/ → core, but only if the
  # change is real code rather than comments/whitespace.
  case "$file" in
    packages/*|weaver/*)
      case "$file" in
        *.js|*.mjs|*.ts|*.tsx|*.jsx|*.py|*.go|*.rs|*.kt|*.sol|*.java|*.cpp|*.c|*.h|*.cs|*.scala|*.rb)
          if file_has_real_code_change "$file"; then
            HAS_CORE_CODE=true
          fi
          ;;
      esac
      ;;
  esac

  # Dependency manifests — mark as changelog-worthy dep bump.
  case "$file" in
    go.mod|go.sum|*/go.mod|*/go.sum) HAS_DEP_MANIFEST=true ;;
    Cargo.toml|Cargo.lock|*/Cargo.toml|*/Cargo.lock) HAS_DEP_MANIFEST=true ;;
    package.json|package-lock.json|yarn.lock|pnpm-lock.yaml|*/package.json|*/package-lock.json|*/yarn.lock|*/pnpm-lock.yaml) HAS_DEP_MANIFEST=true ;;
    Dockerfile|*.Dockerfile|*/Dockerfile) HAS_DEP_MANIFEST=true ;;
    docker-compose*.yml|docker-compose*.yaml|*/docker-compose*.yml|*/docker-compose*.yaml) HAS_DEP_MANIFEST=true ;;
    .github/workflows/*.yml|.github/workflows/*.yaml) HAS_DEP_MANIFEST=true ;;
    .github/actions/*/action.yml|.github/actions/*/action.yaml) HAS_DEP_MANIFEST=true ;;
    build.gradle|build.gradle.kts|settings.gradle|settings.gradle.kts|gradle.properties|constants.properties|versions.properties|libs.versions.toml|pom.xml) HAS_DEP_MANIFEST=true ;;
    */build.gradle|*/build.gradle.kts|*/settings.gradle|*/settings.gradle.kts|*/gradle.properties|*/constants.properties|*/versions.properties|*/libs.versions.toml|*/pom.xml) HAS_DEP_MANIFEST=true ;;
    gradle/wrapper/gradle-wrapper.properties|*/gradle/wrapper/gradle-wrapper.properties) HAS_DEP_MANIFEST=true ;;
  esac
done <<< "$CHANGED_FILES"

echo "Detected PR Prefix Type:  '$PR_TYPE'"
echo "Has Core Code Changes:    $HAS_CORE_CODE"
echo "Has Dep Manifest Changes: $HAS_DEP_MANIFEST"

in_set() { case " $2 " in *" $1 "*) return 0 ;; *) return 1 ;; esac; }

if [ "$HAS_CORE_CODE" = true ]; then
  if in_set "$PR_TYPE" "$CHANGELOG_TYPES"; then
    echo "✅ Core change with changelog-eligible type '$PR_TYPE'."
    exit 0
  fi
  if in_set "$PR_TYPE" "$NON_CHANGELOG_TYPES"; then
    echo "❌ ERROR: PR includes source-code changes."
    echo "   Title must use one of: $CHANGELOG_TYPES"
    echo "   Detected: '$PR_TYPE'"
    exit 1
  fi
  echo "⚠️  Unrecognized type '$PR_TYPE' — leaving for reviewer to confirm."
  exit 0
elif [ "$HAS_DEP_MANIFEST" = true ]; then
  if printf '%s' "$PR_TITLE" | grep -Eq '^build\(deps.*\):'; then
    echo "✅ Dependency bump with 'build(deps*)' scope."
    exit 0
  fi
  if in_set "$PR_TYPE" "$NON_CHANGELOG_TYPES"; then
    echo "✅ Dep manifest change with non-changelog type '$PR_TYPE'."
    exit 0
  fi
  echo "❌ ERROR: PR only touches dep manifests."
  echo "   Title must use 'build(deps):' scope or one of: $NON_CHANGELOG_TYPES"
  echo "   Detected: '$PR_TYPE'"
  exit 1
else
  if in_set "$PR_TYPE" "$NON_CHANGELOG_TYPES"; then
    echo "✅ Non-core change with non-changelog type '$PR_TYPE'."
    exit 0
  fi
  if in_set "$PR_TYPE" "$CHANGELOG_TYPES"; then
    echo "❌ ERROR: PR contains no source-code changes."
    echo "   Title must use a non-changelog type: $NON_CHANGELOG_TYPES"
    echo "   Detected: '$PR_TYPE' (would pollute CHANGELOG)."
    exit 1
  fi
  echo "⚠️  Unrecognized type '$PR_TYPE' — leaving for reviewer to confirm."
  exit 0
fi
