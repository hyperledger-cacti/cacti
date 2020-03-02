#!/usr/bin/env bash
###
### Continous Integration Shell Script --- Dump All Logs
###
### Dumps all logs of all containers to stdout so that it can be analyzed. Used by the main ci.sh script.
### Useful for making debugging easier on the CI environment where there is no shell access.
###

set +e # do not crash process upon individual command failures

CI_ROOT_DIR=$1 # main script passes in the directory to operate in (where the right package.json exists with the tasks)
cd $CI_ROOT_DIR

# Echo a begin and end with a UUID so that it is easy to find the logs in large console outputs
LOG_DUMP_SEPARATOR="52ab9841-eb58-4fba-8bd6-0d2eb091393f"
echo "LOGS_BEGIN---$LOG_DUMP_SEPARATOR"

### FABRIC LOGS
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

### BESU LOGS
docker-compose -p besu -f ./besu/platform/docker-compose_privacy.yml --compatibility logs
echo "COMPOSE_BESU_NETWORK_LOG_END---$LOG_DUMP_SEPARATOR"
docker-compose -p besu-api -f ./besu/api/docker-compose.yml --compatibility logs
echo "COMPOSE_BESU_API_LOG_END---$LOG_DUMP_SEPARATOR"
docker-compose -p federation-besu -f ./federations/docker-compose-besu.yml --compatibility logs
echo "COMPOSE_BESU_FEDERATION_LOG_END---$LOG_DUMP_SEPARATOR"

echo "LOGS_END---$LOG_DUMP_SEPARATOR"