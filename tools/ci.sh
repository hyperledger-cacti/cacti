#!/bin/bash
###
### Continous Integration Shell Script
###
### Designed to be re-entrant on a local dev machine as well, not just on a newly pulled up VM.
###

startedAt=`date +%s`
baseDir=`pwd`
ciRootDir="$baseDir/examples/simple-asset-transfer"

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

  docker --version
  docker-compose --version
  node --version
  npm --version
  java -version || true

  ### COMMON

  rm -rf ./$ciRootDir/fabric/api/node_modules
  rm -rf ./$ciRootDir/quorum/api/node_modules
  rm -rf ./$ciRootDir/node_modules
  rm -rf ./node_modules

  npm install
  npm run test

  cd $ciRootDir
  npm run fed:quorum:down
  npm run fabric:down
  npm run quorum:down
  npm run quorum:api:down

  npm install

  ### FABRIC
  cd ./fabric/api/
  npm install
  cd ../../
  npm run fabric

  ### QUORUM

  # Create docker network if not already in place
  docker network rm quorum-examples-net > /dev/null || docker network create --gateway=172.16.239.1 --subnet=172.16.239.0/24 quorum-examples-net
  cd ./quorum/api/
  npm install
  cd ../../
  npm run quorum
  npm run quorum:api:build
  npm run quorum:api
  npm run fed:build
  npm run fed:quorum
  docker images

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

  docker ps -a
  sleep 120
  npm run test:bc
  npm run fed:quorum:down
  npm run fabric:down
  npm run quorum:down
  npm run quorum:api:down
  cd ../..

  dumpAllLogs

  endedAt=`date +%s`
  runtime=$((endedAt-startedAt))
  echo "$(date -Iseconds) [CI] SUCCESS - runtime=$runtime seconds."
  exit 0
}

function onTaskFailure()
{
  set +e # do not crash process upon individual command failures

  dumpAllLogs

  endedAt=`date +%s`
  runtime=$((endedAt-startedAt))
  echo "$(date -Iseconds) [CI] FAILURE - runtime=$runtime seconds."
  exit 1
}

function dumpAllLogs()
{
  set +e # do not crash process upon individual command failures
  cd "$baseDir" # switch back to the original root dir because we don't know where exactly the script crashed
  ./tools/dump-all-logs.sh $ciRootDir
}

(
  mainTask
)
if [ $? -ne 0 ]; then
  onTaskFailure
fi
