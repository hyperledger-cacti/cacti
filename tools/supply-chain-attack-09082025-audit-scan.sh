#!/usr/bin/env bash
# supply-chain-attack-09082025-audit-scan.sh
#
# Security scanner for the September 8, 2025 NPM supply chain attack
#
# BACKGROUND:
# On September 8, 2025, 19 popular NPM packages were compromised with malicious code
# designed to steal cryptocurrency private keys and API credentials. The attack
# affected packages like chalk, debug, ansi-regex, and others with millions of
# weekly downloads.
#
# PURPOSE:
# This script performs three security checks:
# 1. Malware signature detection using ripgrep for known attack patterns
# 2. Root lockfile inspection for exact compromised package@version strings  
# 3. Yarn npm audit execution at repository root with full JSON output
#
# USAGE:
#   bash tools/supply-chain-attack-09082025-audit-scan.sh
#
# SECURITY APPROACH:
# - No dependency installation (assumes clean environment)
# - Excludes self-references to avoid false positives
# - Reports only confirmed compromised packages and malware indicators
# - Outputs full audit JSON for forensic analysis
# - Exit code 1 if threats detected, 0 if clean
#
# COMPROMISED PACKAGES (Sept 8, 2025):
# ansi-regex@6.2.1, ansi-styles@6.2.2, backslash@0.2.1, chalk@5.6.1,
# chalk-template@1.1.1, color@5.0.1, color-convert@3.1.1, color-name@2.0.1,
# color-string@2.1.1, debug@4.4.2, error-ex@1.4.1, has-ansi@6.0.1,
# is-arrayish@0.3.3, simple-swizzle@0.2.3, slice-ansi@7.1.1, strip-ansi@7.1.1,
# supports-color@10.2.1, supports-hyperlinks@4.1.1, wrap-ansi@9.0.1

set -euo pipefail

# Output file
OUTPUT_FILE="./supply-chain-attack-09082025-audit-scan.out"

# Safety: max time for audit operations (seconds)
TIMEOUT_SECONDS=${TIMEOUT_SECONDS:-120}

# Malware signature from Sep 8, 2025 attack
MALWARE_SIGNATURE="_0x112fa8"

# Compromised package names to specifically check for
COMPROMISED_PACKAGES=(
  "ansi-regex"
  "ansi-styles"
  "backslash"
  "chalk" 
  "chalk-template"
  "color"
  "color-convert"
  "color-name"
  "color-string"
  "debug"
  "error-ex"
  "has-ansi"
  "is-arrayish"
  "simple-swizzle"
  "slice-ansi"
  "strip-ansi"
  "supports-color"
  "supports-hyperlinks"
  "wrap-ansi"
)

# Compromised versions for reference
COMPROMISED_VERSIONS=(
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

# Global counters for final report
TOTAL_AUDITED=0
MALWARE_FOUND=false
MALWARE_SIGNATURE_FOUND=false
COMPROMISED_PACKAGES_FOUND=()
AUDIT_ISSUES=()

# Timestamped logger
log(){
  printf "%s %s\n" "$(date +'%Y-%m-%d %H:%M:%S')" "$1" | tee -a "$OUTPUT_FILE"
}

# Initialize scan
: > "$OUTPUT_FILE"
log "Supply-chain security scan started"
log "Target: Repository root only (simplified approach)"
log "Output file: $OUTPUT_FILE"
log "Malware signature: $MALWARE_SIGNATURE"

# Verify required tools
if ! command -v yarn >/dev/null 2>&1; then
  log "ERROR: yarn not found. Install yarn to run security audit."
  exit 1
fi

if ! command -v rg >/dev/null 2>&1; then
  log "WARNING: ripgrep not found. Malware signature scan will be skipped."
  log "Install ripgrep for complete security coverage: https://github.com/BurntSushi/ripgrep"
else
  log "INFO: All security tools available"
fi

###############################################################################
# 1) Malware signature scan using ripgrep (run once across entire repo)
###############################################################################
log "=== MALWARE SIGNATURE SCAN ==="
if command -v rg >/dev/null 2>&1; then
  log "Scanning entire repository for malware signature: $MALWARE_SIGNATURE"

  # Files/paths to ignore from the malware signature scan (script + outputs + commit message)
  RG_EXCLUDE_PATTERN='(^\.?/tools/|/supply-chain-attack-09082025-audit-scan.out|/supply-chain-attack-09082025-quick-scan.out|/COMMIT_MESSAGE.md)'

  # Run ripgrep and then filter out excluded paths so the script does not flag itself
  rg_all=""
  rg_filtered=""
  rg_all=$(rg -u --max-columns=80 "$MALWARE_SIGNATURE" . 2>/dev/null || true)
  rg_filtered=$(printf "%s\n" "$rg_all" | grep -vE "$RG_EXCLUDE_PATTERN" || true)

  if [[ -n "$rg_filtered" ]]; then
    log "CRITICAL: Malware signature found!"
    log "$rg_filtered"
    MALWARE_SIGNATURE_FOUND=true
    MALWARE_FOUND=true
  else
    if [[ -n "$rg_all" ]]; then
      # Matches were found only in excluded files (script or outputs)
      log "INFO: Malware signature occurrences found only in excluded files (tools/ or audit outputs); ignoring"
    else
      log "SAFE: No malware signature detected"
    fi
  fi
else
  log "SKIPPED: Malware signature scan (ripgrep not available)"
fi

###############################################################################
# 2) Yarn npm audit scan for each package directory
###############################################################################
# Function to run yarn npm audit with timeout, but only report compromised/malware findings
run_audit_root(){
  local dir=$1
  local pkg_context=$2

  cd "$dir"
  log "Running audit in: $dir (context: $pkg_context)"

  # Do NOT install dependencies here. If there is no lockfile in root, skip audit.
  if [[ ! -f "yarn.lock" && ! -f "package-lock.json" ]]; then
    log "INFO: No lockfile found in repo root - skipping yarn npm audit"
    cd - >/dev/null
    return 0
  fi

  local audit_output
  local audit_exit_code=0

  if command -v timeout >/dev/null 2>&1; then
    audit_output=$(timeout "${TIMEOUT_SECONDS}s" yarn npm audit --json 2>&1) || audit_exit_code=$?
  else
    audit_output=$(yarn npm audit --json 2>&1) || audit_exit_code=$?
  fi

  # Parse output but only disclose compromised packages or malware-related keywords
  local found_any=false
  for pkg in "${COMPROMISED_PACKAGES[@]}"; do
    for comp_ver in "${COMPROMISED_VERSIONS[@]}"; do
      comp_name="${comp_ver%@*}"
      comp_version="${comp_ver#*@}"
      if echo "$audit_output" | grep -qi "${comp_name}" && echo "$audit_output" | grep -q "${comp_version}"; then
        log "CRITICAL: Found compromised package ${comp_name}@${comp_version} in $pkg_context"
        COMPROMISED_PACKAGES_FOUND+=("${comp_name}@${comp_version} in $pkg_context")
        MALWARE_FOUND=true
        found_any=true
      fi
    done
  done

  if echo "$audit_output" | grep -Ei "malware|trojan|backdoor|supply.*chain|crypto.*steal|wallet" >/dev/null; then
    log "WARNING: Audit output contains malware-related keywords in $pkg_context"
    AUDIT_ISSUES+=("malware keywords in $pkg_context")
    MALWARE_FOUND=true
    found_any=true
  fi

  if [[ "$found_any" == false ]]; then
    log "INFO: No compromised packages or malware keywords found in yarn audit for $pkg_context"
  fi

  cd - >/dev/null
  return 0
}

# Inspect root yarn.lock (if present) for exact compromised package@version entries
inspect_root_yarn_lock(){
  local root_lock="./yarn.lock"
  if [[ -f "$root_lock" ]]; then
    log "INFO: Inspecting root yarn.lock for compromised package@version entries"
    for p in "${COMPROMISED_VERSIONS[@]}"; do
      if grep -Fq "$p" "$root_lock" 2>/dev/null; then
        log "FOUND exact in root yarn.lock: $p"
        COMPROMISED_PACKAGES_FOUND+=("$p in root yarn.lock")
        MALWARE_FOUND=true
      fi
    done
  else
    log "INFO: No root yarn.lock found to inspect"
  fi
}

###############################################################################
# SIMPLIFIED SECURITY SCAN: Repository root only
# This approach focuses on the most critical attack vectors while avoiding
# complex dependency installations across multiple workspace packages.
###############################################################################

# Inspect root lockfile textually for exact compromised package@version
inspect_root_yarn_lock

# Run yarn npm audit on repo root (no installs) and only disclose compromised/malware findings
run_audit_root "." "repo-root"

# Append the raw yarn npm audit JSON output for repo root to the output file
append_full_audit_output(){
  log "=== FULL YARN NPM AUDIT OUTPUT (repo-root) ==="
  # Only attempt if lockfile present and yarn available
  if ! command -v yarn >/dev/null 2>&1; then
    log "ERROR: yarn not available to run full audit output"
    return 0
  fi

  if [[ ! -f "yarn.lock" && ! -f "package-lock.json" ]]; then
    log "INFO: No root lockfile present; skipping full audit output"
    return 0
  fi

  if command -v timeout >/dev/null 2>&1; then
    timeout "${TIMEOUT_SECONDS}s" yarn npm audit --json >> "$OUTPUT_FILE" 2>&1 || echo "AUDIT-COMMAND-FAILED:$?" >> "$OUTPUT_FILE"
  else
    yarn npm audit --json >> "$OUTPUT_FILE" 2>&1 || echo "AUDIT-COMMAND-FAILED:$?" >> "$OUTPUT_FILE"
  fi
}

append_full_audit_output

###############################################################################
# 3) Final malware report
###############################################################################
log "=== FINAL MALWARE REPORT ==="
log "Scan completed at $(date)"
log "Total directories audited: $TOTAL_AUDITED"

if [[ "$MALWARE_FOUND" == true ]]; then
  log "STATUS: MALWARE DETECTED - IMMEDIATE ACTION REQUIRED"

  if [[ "$MALWARE_SIGNATURE_FOUND" == true ]]; then
    log "CRITICAL: Malware signature ${MALWARE_SIGNATURE} found in repository files"
    log "ACTION: Infected files must be cleaned immediately"
  fi

  if [[ ${#COMPROMISED_PACKAGES_FOUND[@]} -gt 0 ]]; then
    log "CRITICAL: Compromised packages detected:"
    for pkg in "${COMPROMISED_PACKAGES_FOUND[@]}"; do
      log "  - $pkg"
    done
    log "ACTION: Update all compromised packages to safe versions immediately"
  fi

  if [[ ${#AUDIT_ISSUES[@]} -gt 0 ]]; then
    log "WARNING: Malware-related audit issues:"
    for issue in "${AUDIT_ISSUES[@]}"; do
      log "  - $issue"
    done
  fi
else
  log "STATUS: NO MALWARE DETECTED"
  log "Repository appears clean from Sep 8, 2025 supply chain attack"
fi

log "Detailed results saved to: $OUTPUT_FILE"

# Exit with error code if malware found
if [[ "$MALWARE_FOUND" == true ]]; then
  exit 1
else
  exit 0
fi
