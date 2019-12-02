#!/bin/bash
###
### Continous Integration Shell Script
###
### Designed to be re-entrant on a local dev machine as well, not just on a newly pulled up VM.
###

startedAt=`date +%s`
baseDir=`pwd`

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

  rm -rf ./examples/simple-asset-transfer/fabric/api/node_modules
  rm -rf ./examples/simple-asset-transfer/quorum/api/node_modules
  rm -rf ./examples/simple-asset-transfer/node_modules
  rm -rf ./node_modules

  npm install
  npm run test

  cd examples/simple-asset-transfer
  npm run fed:quorum:down
  npm run fabric:down
  npm run quorum:down
  npm run quorum:api:down

  npm install
  rm -rf ./node_modules/websocket/.git/

  ### FABRIC
  cd ./fabric/api/
  rm -rf ./fabric-client-kv-org*
  rm -rf ./node_modules/websocket/.git/
  npm install
  cd ../../
  npm run fabric

  ### QUORUM

  # Create docker network if not already in place
  docker network inspect quorum_quorum-examples-net > /dev/null || docker network create --gateway=172.16.239.1 --subnet=172.16.239.0/24 quorum_quorum-examples-net
  cd ./quorum/api/
  rm -rf ./node_modules/websocket/.git/
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
  cd examples/simple-asset-transfer

  # dump logs for everything that we have to make debugging easier on the CI environment where there is no shell access.
  # Echo a begin and end with a UUID so that it is easy to find the logs in large console outputs
  LOG_DUMP_SEPARATOR="52ab9841-eb58-4fba-8bd6-0d2eb091393f"
  echo "LOGS_BEGIN---$LOG_DUMP_SEPARATOR"

  ### FABRIC LOGS
  cat fabric/logs/start.log
  echo "FABRIC_STARTUP_LOG_END---$LOG_DUMP_SEPARATOR"
  docker-compose -f fabric/artifacts/docker-compose.yaml logs
  echo "COMPOSE_FABRIC_NETWORK_LOG_END---$LOG_DUMP_SEPARATOR"
  docker-compose -p federation-fabric -f ./federations/docker-compose-fabric.yml --compatibility logs
  echo "COMPOSE_FABRIC_FEDERATION_LOG_END---$LOG_DUMP_SEPARATOR"

  ### QUORUM LOGS
  docker-compose -p quorum -f ./quorum/platform/docker-compose.yml --compatibility logs
  echo "COMPOSE_QUORUM_NETWORK_LOG_END---$LOG_DUMP_SEPARATOR"
  docker-compose -p quorum-api -f ./quorum/api/docker-compose.yml --compatibility logs
  echo "COMPOSE_QUORUM_API_LOG_END---$LOG_DUMP_SEPARATOR"
  docker-compose -p federation-quorum -f ./federations/docker-compose-quorum.yml --compatibility logs
  echo "COMPOSE_QUORUM_FEDERATION_LOG_END---$LOG_DUMP_SEPARATOR"

  ### CORDA LOGS
  docker-compose -p federation-corda -f ./federations/docker-compose-corda.yml --compatibility logs
  echo "COMPOSE_CORDA_FEDERATION_LOG_END---$LOG_DUMP_SEPARATOR"

  echo "LOGS_END---$LOG_DUMP_SEPARATOR"
}

(
  mainTask
)
if [ $? -ne 0 ]; then
  onTaskFailure
fi
