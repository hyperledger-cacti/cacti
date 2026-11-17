#!/usr/bin/env bash
# Rebuilds the committed test DAR from its Daml source. CI uses the committed
# DAR, so the Daml SDK is only needed when Asset.daml or daml.yaml changes.
# Requires the Daml package manager (dpm) with the SDK version in daml.yaml.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

dpm build --output cacti-canton-test-asset.dar
