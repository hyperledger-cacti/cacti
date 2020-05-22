#!/usr/bin/env bash

###
### Continous Integration Shell Script
###
### Designed to be re-entrant on a local dev machine as well, not just on a
### newly pulled up VM.
###
echo $BASH_VERSION

STARTED_AT=`date +%s`
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_ROOT_DIR="$SCRIPT_DIR/.."

function mainTask()
{
  set -euxo pipefail

  if ! [ -x "$(command -v lscpu)" ]; then
    echo 'lscpu is not installed, skipping...'
  else
    lscpu
  fi

  if ! [ -x "$(command -v lsmem)" ]; then
    echo 'lsmem is not installed, skipping...'
  else
    lsmem
  fi

  if ! [ -x "$(command -v smem)" ]; then
    echo 'smem is not installed, skipping...'
  else
    smem --abbreviate --totals --system
  fi

  # Travis does not have (nor need) nvm but CircleCI does have nvm and also
  # need it big time because their default Node version is 6.x...
  if [ "${CIRCLECI:-false}" = "true" ]; then
    set +x
    nvm install 10.19.0
    nvm alias default 10.19.0
    set -x
  fi

  docker --version
  docker-compose --version
  node --version
  npm --version
  java -version

  ### COMMON
  cd $PROJECT_ROOT_DIR

  npm ci
  ./node_modules/.bin/lerna clean --yes
  ./node_modules/.bin/lerna bootstrap
  npm run build
  npm run test:all

  ENDED_AT=`date +%s`
  runtime=$((ENDED_AT-STARTED_AT))
  echo "$(date +%FT%T%z) [CI] SUCCESS - runtime=$runtime seconds."
  exit 0
}

function onTaskFailure()
{
  set +eu # do not crash process upon individual command failures

  ENDED_AT=`date +%s`
  runtime=$((ENDED_AT-STARTED_AT))
  echo "$(date +%FT%T%z) [CI] FAILURE - runtime=$runtime seconds."
  exit 1
}

(
  mainTask
)
if [ $? -ne 0 ]; then
  onTaskFailure
fi
