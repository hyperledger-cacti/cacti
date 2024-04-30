# #!/bin/bash
set -e

# Function to check if all nodes are up and running
checkNodesStatus() {
    local gradleOutput
    # Run Gradle task and get the output
    cd /CSDE-cordapp-template-kotlin/
    gradleOutput=$(./gradlew listVNodes)
    echo "gradleOutput: $gradleOutput"
    local upAndRunningCount
    upAndRunningCount=$(echo "$gradleOutput" | grep -c -E "MyCorDapp|NotaryServer")

    # Check if all 5 nodes are up and running
    if [ "$upAndRunningCount" -eq 5 ]; then
        echo "All 5 nodes are up and running."
        exit 0
    else
        echo "Waiting for all nodes to be up and running..."
        sleep 5
        checkNodesStatus
    fi
}

checkNodesStatus