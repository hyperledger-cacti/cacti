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
CHANGED_FILES="$(git diff-index --name-only HEAD --)"

function checkWorkTreeStatus()
{
  git update-index -q --refresh
  new_changed_files="$(git diff-index --name-only HEAD --)"
  if [ "${CHANGED_FILES}" != "${new_changed_files}" ]; then
    echo >&2 "Changes in the git index have been detected!"
    git diff
    exit 1
  fi
}

function dumpDiskUsageInfo()
{

  if ! [ -x "$(command -v df)" ]; then
    echo 'df is not installed, skipping...'
  else
    df || true
  fi
  if ! [ -x "$(command -v docker)" ]; then
    echo 'docker is not installed, skipping...'
  else
    docker system df || true
  fi
}

function checkOnlyDocumentation()
{
  z=0

  for i in $CHANGED_FILES; do
    z=$((z+1))
    if [ ${i: -3} != ".md" ]; then
      break
    elif [ ${i: -3} == ".md" ] && [ $(echo ${CHANGED_FILES} | wc -l) == $z ]; then
      echo 'There are only changes in the documentation files.'
      ENDED_AT=`date +%s`
      runtime=$((ENDED_AT-STARTED_AT))
      echo "$(date +%FT%T%z) [CI] SUCCESS - runtime=$runtime seconds."
      exit 0
    fi
  done
}

function freeUpGitHubRunnerDiskSpace() {
  # If we are running in a GitHub Actions runner, then free up 30 GB space by
  # removing things we do not need such as the Android SDK and .NET.
  #
  # Huge thanks to Maxim Lobanov for the advice:
  # https://github.com/actions/virtual-environments/issues/2606#issuecomment-772683150
  #
  # Why do this? Because we've been getting warnings about the runners being
  # left with less than a hundred megabytes of disk space during the tests.
  #
  # This operation takes about 2 minutes to do and so is disabled by default to get better
  # performance from the CI by default. It can be enabled on a per job basis via
  # the env variables defined in the action's .yaml files.
  #
  if [ "${FREE_UP_GITHUB_RUNNER_DISK_SPACE_DISABLED:-true}" = "true" ]; then
    echo "$(date +%FT%T%z) [CI] Freeing up GitHub Action Runner disk space disabled. Skipping..."
  else
    echo "$(date +%FT%T%z) [CI] Freeing up GitHub Action Runner disk space by deleting Android and .NET ..."
    sudo rm -rf /usr/local/lib/android # will release about 10 GB if you don't need Android
    sudo rm -rf /usr/share/dotnet # will release about 20GB if you don't need .NET
  fi
}

function mainTask()
{
  set -euxo pipefail

  if ! [ -x "$(command -v lscpu)" ]; then
    echo 'lscpu is not installed, skipping...'
  else
    lscpu || true
  fi

  if ! [ -x "$(command -v lsmem)" ]; then
    echo 'lsmem is not installed, skipping...'
  else
    lsmem || true
  fi

  if ! [ -x "$(command -v smem)" ]; then
    echo 'smem is not installed, skipping...'
  else
    smem --abbreviate --totals --system || true
  fi

  # Check if the modified files are only for documentation.
  checkOnlyDocumentation

  # Can be turned ON/OFF via env var FREE_UP_GITHUB_RUNNER_DISK_SPACE_DISABLED=true/false
  freeUpGitHubRunnerDiskSpace

  if [ "${DUMP_DISK_USAGE_INFO_DISABLED:-true}" = "true" ]; then
    echo "$(date +%FT%T%z) [CI] dumpDiskUsageInfo disabled. Skipping..."
  else
    dumpDiskUsageInfo
  fi

  docker --version
  docker compose version
  node --version
  npm --version
  java -version
  yarn --version

  export NODE_OPTIONS=--max_old_space_size=5120

  ### COMMON
  cd $PROJECT_ROOT_DIR

  if [ "${CONFIGURE_DISABLED:-false}" = "true" ]; then
    echo "$(date +%FT%T%z) [CI] npm run configure disabled. Skipping..."
  else
    npm run configure
  fi

  if [ "${TOOLS_VALIDATE_BUNDLE_NAMES_DISABLED:-true}" = "true" ]; then
    echo "$(date +%FT%T%z) [CI] yarn tools:validate-bundle-names disabled. Skipping..."
  else
    yarn tools:validate-bundle-names
  fi

  if [ "${CUSTOM_CHECKS_DISABLED:-true}" = "true" ]; then
    echo "$(date +%FT%T%z) [CI] yarn custom-checks disabled. Skipping..."
  else
    yarn custom-checks
  fi

  if [ "${JEST_TEST_RUNNER_DISABLED:-false}" = "true" ]; then
    echo "$(date +%FT%T%z) [CI] Jest test runner disabled. Skipping..."
  elif [ "${JEST_TEST_CODE_COVERAGE_ENABLED:-true}" = "true" ]; then
   yarn jest $JEST_TEST_PATTERN --coverage --coverageDirectory=$JEST_TEST_COVERAGE_PATH
  else
    yarn test:jest:all $JEST_TEST_PATTERN
  fi

  if [ "${DUMP_DISK_USAGE_INFO_DISABLED:-true}" = "true" ]; then
    echo "$(date +%FT%T%z) [CI] dumpDiskUsageInfo disabled. Skipping..."
  else
    dumpDiskUsageInfo
  fi

  if [ "${TAPE_TEST_RUNNER_DISABLED:-false}" = "true" ]; then
    echo "$(date +%FT%T%z) [CI] Tape test runner disabled. Skipping..."
  else
    yarn test:tap:all --bail $TAPE_TEST_PATTERN
  fi

  if [ "${DUMP_DISK_USAGE_INFO_DISABLED:-true}" = "true" ]; then
    echo "$(date +%FT%T%z) [CI] dumpDiskUsageInfo disabled. Skipping..."
  else
    dumpDiskUsageInfo
  fi

  # We run the full build last because the tests don't need it so in the interest
  # of providing feedback about failing tests as early as possible we run the
  # dev:backend build first and then the tests which is the fastest way to get
  # to a failed test if there was one.
  if [ "${FULL_BUILD_DISABLED:-true}" = "true" ]; then
    echo "$(date +%FT%T%z) [CI] Full build disabled. Skipping..."
  else
    yarn run build
  fi

  if [ "${CHECK_WORK_TREE_STATUS_DISABLED:-true}" = "true" ]; then
    echo "$(date +%FT%T%z) [CI] checkWorkTreeStatus disabled. Skipping..."
  else
    checkWorkTreeStatus
  fi

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
