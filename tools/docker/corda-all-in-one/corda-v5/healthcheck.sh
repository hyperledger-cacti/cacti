#!/bin/bash
set -e

gradleOutput=""

# Check if all nodes are up and running
checkNodesStatus() {
    # Run Gradle task and capture the output
    cd /CSDE-cordapp-template-kotlin/
    gradleOutput=$(./gradlew listVNodes)
    echo "gradleOutput: $gradleOutput"
    local upAndRunningCount
    upAndRunningCount=$(echo "$gradleOutput" | grep -c -E "MyCorDapp|NotaryServer")

    # Check if all 5 nodes are up and running
    if [ "$upAndRunningCount" -eq 5 ]; then
        echo "All 5 nodes are up and running."
    else
        echo "Waiting for all nodes to be up and running..."
        sleep 5
        checkNodesStatus
    fi
}

# Check if request is successful
checkCurlSuccess() {
    echo "Executing checkCurlSuccess function..."
    local holding_identity_shorthash_test
    holding_identity_shorthash_test=$(echo "$gradleOutput" | grep -oE '\b[0-9A-F]{12}\b' | tail -n 1)
    local response_code
    response_code=$(curl -k -s -o /dev/null -w "%{http_code}" -u admin:admin "https://localhost:8888/api/v1/members/$holding_identity_shorthash_test/group-parameters")
    if [ "$response_code" -eq 200 ]; then
        echo "CURL request successful."
    else
        echo "CURL request failed with response code: $response_code"
        exit 1
    fi
}

checkNodesStatus

checkCurlSuccess

WAIT_TIME=30
echo "Waiting for $WAIT_TIME seconds to ensure stability before exiting with status code 0..."
sleep $WAIT_TIME

exit 0