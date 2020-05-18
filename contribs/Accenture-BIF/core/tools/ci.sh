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
PKG_ROOT_DIR="$SCRIPT_DIR/.."
CI_ROOT_DIR="$PKG_ROOT_DIR/examples/simple-asset-transfer"

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
  cd $PKG_ROOT_DIR

  rm -rf $CI_ROOT_DIR/fabric/api/node_modules
  rm -rf $CI_ROOT_DIR/quorum/api/node_modules
  rm -rf $CI_ROOT_DIR/besu/api/node_modules
  rm -rf $CI_ROOT_DIR/node_modules
  rm -rf ./node_modules

  npm install
  npm run test

  cd $CI_ROOT_DIR
  npm run fed:quorum:down
  npm run fed:besu:down
  npm run fed:fabric:down
  npm run fed:corda:down
  npm run fabric:down
  npm run quorum:down
  npm run quorum:api:down
  npm run besu:down
  npm run besu:api:down

  npm install

  # The uninstall+install cycle is needed to erase any left-over SHA hash based lock which would cause npm to install
  # from cache instead of grabbing the exact file that we just produced via the create local npm package script.
  npm uninstall @hyperledger-labs/blockchain-integration-framework
  npm install @hyperledger-labs/blockchain-integration-framework@file:../../.tmp/hyperledger-labs-blockchain-integration-framework-dev.tgz

  ### FABRIC

  rm -rf fabric/api/fabric-client-kv-org*
  npm run fabric:api:build
  npm run fabric
  npm run fabric:init

  ### QUORUM

  # Create docker network if not already in place
  docker network rm quorum-examples-net > /dev/null || docker network create --gateway=172.16.239.1 --subnet=172.16.239.0/24 quorum-examples-net
  cd ./quorum/api/
  npm install
  cd ../../
  npm run quorum
  npm run quorum:api:build
  npm run quorum:api

  # BESU

  cd ./besu/api/
  npm install
  cd ../../
  npm run besu
  npm run besu:api:build
  npm run besu:api

  # Build and launch federation validators
  npm run fed:build
  npm run fed:quorum
  npm run fed:besu
  npm run fed:fabric

  # If enough time have passed and there are still containers not ready then
  # just assume that they are in a crash loop and abort CI run.
  iterationCount=1
  while docker ps | grep "starting\|unhealthy"; do
    if [ "$iterationCount" -gt 20 ]; then
      false;
    fi
    iterationCount=$[$iterationCount +1]
    sleep 15; echo; date;
  done
  sleep ${CI_CONTAINERS_WAIT_TIME:-120}

  # Run scenarios and blockchain regression tests
  if [ -v CI_NO_CORDA ]; then
      npm run scenario:share nocorda
  else
      npm run corda:build
      npm run corda
      npm run fed:corda
      sleep ${CI_CONTAINERS_WAIT_TIME:-12}

      npm run scenario:share
      # Run scenarios between Corda and Fabric
      npm run scenario:CtF
      npm run scenario:FtC
      # Run scenarios between Corda and Quorum
      npm run scenario:CtQ
      npm run scenario:QtC
      # Run scenarios between Corda and Besu
      npm run scenario:CtB
      npm run scenario:BtC
  fi
  # Run scenarios between Quorum and Fabric
  npm run scenario:QtF
  npm run scenario:FtQ
  # Run scenarios between Fabric and Besu
  npm run scenario:BtF
  npm run scenario:FtB
  # Run scenarios between Quorum and Besu
  npm run scenario:BtQ
  npm run scenario:QtB

  npm run test:bc

  # dumpAllLogs

  # Unloading Quorum staff to save resources for Corda
  npm run fed:quorum:down
  npm run fed:corda:down
  npm run fed:fabric:down

  # Corda down scripts don't exist unless Corda is built
  if [ ! -v CI_NO_CORDA ]; then
  npm run corda:down
  fi

  npm run quorum:api:down
  npm run quorum:down
  npm run fabric:down
  cd ../..

  ENDED_AT=`date +%s`
  runtime=$((ENDED_AT-STARTED_AT))
  echo "$(date +%FT%T%z) [CI] SUCCESS - runtime=$runtime seconds."
  exit 0
}

function onTaskFailure()
{
  set +eu # do not crash process upon individual command failures

  dumpAllLogs

  ENDED_AT=`date +%s`
  runtime=$((ENDED_AT-STARTED_AT))
  echo "$(date +%FT%T%z) [CI] FAILURE - runtime=$runtime seconds."
  exit 1
}

function dumpAllLogs()
{
  set +eu # do not crash process upon individual command failures
  cd "$PKG_ROOT_DIR" # switch back to the original root dir because we don't
                     # know where exactly the script crashed
  [ -v CI_NO_DUMP_ALL_LOGS ] || ./tools/dump-all-logs.sh $CI_ROOT_DIR
  cd -
}

(
  mainTask
)
if [ $? -ne 0 ]; then
  onTaskFailure
fi
