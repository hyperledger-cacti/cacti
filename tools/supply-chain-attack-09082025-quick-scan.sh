#!/usr/bin/env bash
# supply-chain-attack-09082025-quick-scan.sh
#
# Fast static scanner for September 8, 2025 NPM supply chain attack
#
# ATTACK SUMMARY:
# A coordinated supply chain attack compromised 19 popular NPM packages on
# September 8, 2025. Malicious versions contained code to exfiltrate crypto
# wallets, API keys, and environment variables to attacker-controlled servers.
#
# DETECTION METHOD:
# This script performs static analysis of lockfiles and package.json files
# to detect exact compromised package@version combinations without executing
# any code or installing dependencies.
#
# SCAN TARGETS:
# - yarn.lock, package-lock.json, pnpm-lock.yaml (lockfile analysis)
# - package.json files (declared dependency analysis)
# - Scans: weaver/, packages/, examples/ directories
#
# USAGE:
#   bash tools/supply-chain-attack-09082025-quick-scan.sh
#
# SECURITY DESIGN:
# - Read-only operation (no installations or modifications)
# - Exact string matching to avoid false positives
# - Comprehensive coverage of all Node.js package managers
# - Skips node_modules to focus on source declarations
# - Conservative approach: flags only confirmed compromised versions

set -euo pipefail

# Output file placed in tools/ for easy discovery
OUTPUT_FILE="./supply-chain-attack-09082025-quick-scan.out"

# Directories to scan (relative to repo root)
TARGET_DIRS=("weaver" "packages" "examples")

# Safety: max time for expensive "find" operations (seconds). Use env to override.
TIMEOUT_SECONDS=${TIMEOUT_SECONDS:-60}

# Curated list of compromised package@version strings (exact matching)
COMPROMISED=(
  "ansi-regex@6.2.1"
  "ansi-styles@6.2.2"
  "backslash@0.2.1"
  "chalk@5.6.1"
  "chalk-template@1.1.1"
  "color@5.0.1"
  "color-convert@3.1.1"
  "color-name@2.0.1"
  "color-string@2.1.1"
  "debug@4.4.2"
  "error-ex@1.4.1"
  "has-ansi@6.0.1"
  "is-arrayish@0.3.3"
  "simple-swizzle@0.2.3"
  "slice-ansi@7.1.1"
  "strip-ansi@7.1.1"
  "supports-color@10.2.1"
  "supports-hyperlinks@4.1.1"
  "wrap-ansi@9.0.1"
)

# Timestamped logger that appends to the output file and prints to stdout.
log(){
  printf "%s %s\n" "$(date +'%Y-%m-%d %H:%M:%S')" "$1" | tee -a "$OUTPUT_FILE"
}

# Initialize quick scan
: > "$OUTPUT_FILE"
log "Supply-chain security quick scan started"
log "Scanning directories: ${TARGET_DIRS[*]}"
log "Output file: $OUTPUT_FILE"
log "Compromised packages to detect: ${#COMPROMISED[@]} versions"

# Helper: run a find expression with a timeout if available. The function
# accepts the directory and the rest of the find expression as a single string.
run_find(){
  local dir=$1
  local expr=$2
  if command -v timeout >/dev/null 2>&1; then
    timeout "${TIMEOUT_SECONDS}s" bash -c "find \"$dir\" $expr" || true
  else
    bash -c "find \"$dir\" $expr" || true
  fi
}

###############################################################################
# PHASE 1: Lockfile Analysis
# Scan all lockfiles for exact compromised package@version strings
###############################################################################
log "=== LOCKFILE ANALYSIS ==="
log "Searching for exact compromised package@version references"
for d in "${TARGET_DIRS[@]}"; do
  if [[ -d "$d" ]]; then
    # find lockfiles but prune node_modules and .git
    run_find "$d" "\( -path '*/node_modules' -o -path '*/.git' \) -prune -o -type f \( -name 'yarn.lock' -o -name 'package-lock.json' -o -name 'pnpm-lock.yaml' \) -print0" \
      | xargs -0 -I{} bash -c 'echo "{}"' 2>/dev/null | while IFS= read -r lock; do
      [[ -z "$lock" ]] && continue
      # infer a simple context for human-friendly logs (packages/<pkg> or examples/<ex> or weaver)
      pkg_context="$(echo "$lock" | sed -n 's@.*/\(packages/[^/]*\).*@\1@p;s@.*/\(examples/[^/]*\).*@\1@p;s@.*/\(weaver\).*@\1@p')"
      [[ -z "$pkg_context" ]] && pkg_context="(repo-level)"
      log "Lockfile: $lock (context: $pkg_context)"

      # For each target compromised string, do a fixed-string grep to avoid
      # false positives from regex metacharacters.
      for p in "${COMPROMISED[@]}"; do
        if grep -Fq "$p" "$lock" 2>/dev/null; then
          log "FOUND exact: $p in $lock (context: $pkg_context)"
        fi
      done
    done || true
  else
    log "Dir not found, skipping: $d"
  fi
done

###############################################################################
# PHASE 2: Advanced Lockfile Pattern Matching
# Deep scan for nested dependency structures and version patterns
###############################################################################
log "=== ADVANCED PATTERN ANALYSIS ==="
log "Analyzing lockfile structures for nested compromised dependencies"
for d in "${TARGET_DIRS[@]}"; do
  if [[ -d "$d" ]]; then
    # search both package-lock.json and yarn.lock
    run_find "$d" "\( -path '*/node_modules' -o -path '*/.git' \) -prune -o -type f \( -name 'package-lock.json' -o -name 'yarn.lock' \) -print0" \
      | xargs -0 -I{} bash -c 'echo "{}"' 2>/dev/null | while IFS= read -r pl; do
      [[ -z "$pl" ]] && continue
      log "$pl"
      for p in "${COMPROMISED[@]}"; do
        name="${p%@*}"
        ver="${p#*@}"

        # 1) Combined name@version appearances (some generated files include these)
        if grep -Fq "${name}@${ver}" "$pl" 2>/dev/null; then
          log "FOUND exact (combined): ${name}@${ver} in $pl"
          continue
        fi

        # For package-lock.json: look for nested JSON objects with "version"
        if [[ "$pl" == *"package-lock.json" ]]; then
          matches=$(grep -n -E "\"${name}\"[[:space:]]*:[[:space:]]*\{" "$pl" 2>/dev/null || true)
          if [[ -n "$matches" ]]; then
            while IFS=: read -r lineno _; do
              if sed -n "$((lineno+1)),$((lineno+12))p" "$pl" | grep -q "\"version\"[[:space:]]*:[[:space:]]*\"${ver}\"" ; then
                log "FOUND exact (nested): ${name}@${ver} in $pl (near line ${lineno})"
              fi
            done <<<"$matches"
          fi
        fi

        # For yarn.lock: find a package header line containing name@ and inspect
        # a short following window for version "x.y.z"
        if [[ "$pl" == *"yarn.lock" ]]; then
          # locate lines containing name@ (headers in yarn v1 lockfiles)
          matches=$(grep -n -E "${name}@" "$pl" 2>/dev/null || true)
          if [[ -n "$matches" ]]; then
            while IFS=: read -r lineno content; do
              # inspect next 6 lines for a version field
              if sed -n "$((lineno+1)),$((lineno+6))p" "$pl" | grep -q "version \"${ver}\"" ; then
                log "FOUND exact (yarn lock): ${name}@${ver} in $pl (near line ${lineno})"
              fi
            done <<<"$matches"
          fi
        fi
      done
    done || true
  fi
done

###############################################################################
# PHASE 3: Package Declaration Analysis  
# Scan package.json files for direct dependency declarations
###############################################################################
log "=== PACKAGE DECLARATION ANALYSIS ==="
log "Checking package.json files for compromised dependency declarations"
for d in "${TARGET_DIRS[@]}"; do
  if [[ -d "$d" ]]; then
    run_find "$d" "\( -path '*/node_modules' -o -path '*/.git' \) -prune -o -name 'package.json' -type f -print0" \
      | xargs -0 -I{} bash -c 'echo "{}"' 2>/dev/null | while IFS= read -r pj; do
      [[ -z "$pj" ]] && continue
      log "package.json: $pj"
      for p in "${COMPROMISED[@]}"; do
        name="${p%@*}"
        ver="${p#*@}"
        # match exact declaration like: "chalk": "5.6.1"
        if grep -EIn --text "\"${name}\"[[:space:]]*:[[:space:]]*\"${ver}\"" "$pj" 2>/dev/null | grep -q .; then
          grep -EIn --text "\"${name}\"[[:space:]]*:[[:space:]]*\"${ver}\"" "$pj" 2>/dev/null | while IFS= read -r line; do
            log "FOUND package.json exact: ${name}@${ver} in $pj -> $line"
          done
        fi
      done
    done || true
  fi
done

log "=== SCAN COMPLETE ==="
log "Supply chain security quick scan finished"
log "Review results above for any FOUND entries indicating compromised packages"
exit 0
