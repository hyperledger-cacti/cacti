#!/usr/bin/env bash

###
### Continous Integration Shell Script
###
### Script to free up disk space on a GitHub Actions runner or local machine
set -euo pipefail

echo $BASH_VERSION

STARTED_AT=$(date +%s)

function freeUpDiskSpace() {
  echo "$(date +%FT%T%z) [CI] Freeing up disk space by deleting Android and .NET ..."
  echo "$(date +%FT%T%z) [CI] Freeing up GitHub Action Runner disk space by deleting Android and .NET ..."
  sudo rm -rf /usr/local/lib/android # will release about 10 GB if you don't need Android
  sudo rm -rf /usr/share/dotnet # will release about 20GB if you don't need .NET
}

freeUpDiskSpace

ENDED_AT=$(date +%s)
runtime=$((ENDED_AT-STARTED_AT))
echo "$(date +%FT%T%z) [CI] SUCCESS - runtime=$runtime seconds."
exit 0
