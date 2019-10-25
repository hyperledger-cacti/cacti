#!/usr/bin/env bash
#
# Start all the Corda components
#

CORDA_PROCESS_NAME="Corda"
SPRING_BOOT_PROCESS_NAME="spring"
CHECK_CORDA_PROCESS_RESULT=`ps -edf | grep java | sed -n /${CORDA_PROCESS_NAME}/p`
CHECK_SPRING_BOOT_PROCESS_RESULT=`ps -edf | grep java | sed -n /${SPRING_BOOT_PROCESS_NAME}/p`
LOG_DIRECTORY=""

# Check if log directory exists
if [[ $# != 1 ]]; then

    echo "usage: $0 path/to/log/directory"

    exit 1

else

    if [[ ! -d $1 ]]; then

        echo -n "Directory $1 doesn't exist, creating it..."

        mkdir_result="$(mkdir $1 2>&1)"
        if [[ $? != 0 ]]; then

            echo "Cannot create log directory: $mkdir_result"

            exit 1
        fi

        echo 'done'

    else

        echo "Directory $1 exists, overriding it"

    fi

    # Save it
    LOG_DIRECTORY=$1

    # Convert relative path to absolute one
    if [[ "$LOG_DIRECTORY" != /* ]]; then

        LOG_DIRECTORY=$(cd "$(dirname "$LOG_DIRECTORY")"; pwd)/$(basename "$LOG_DIRECTORY")

    fi

fi

# Start Corda nodes sequentially
if [[ "${CHECK_CORDA_PROCESS_RESULT:-null}" = null ]]; then

    echo -n 'Starting Corda nodes... '

    cd ../nodes/Notary && java -jar corda.jar > $LOG_DIRECTORY/node-notary.log 2>&1 &
    cd ../nodes/PartyA && java -jar corda.jar > $LOG_DIRECTORY/node-partyA.log 2>&1 &
    cd ../nodes/PartyB && java -jar corda.jar > $LOG_DIRECTORY/node-partyB.log 2>&1 &
    cd ../nodes/PartyC && java -jar corda.jar > $LOG_DIRECTORY/node-partyC.log 2>&1 &
    cd ../nodes/PartyD && java -jar corda.jar > $LOG_DIRECTORY/node-partyD.log 2>&1 &

    # Wait 2 minutes to be sure, that all the nodes are started successfully
    sleep 120s

    echo 'done'

else

    echo "Corda nodes are running already"

fi

# Start Web Spring Boot components sequentially
if [[ "${CHECK_SPRING_BOOT_PROCESS_RESULT:-null}" = null ]]; then

    echo -n 'Starting Web Spring Boot components... '

    cd ../web && java -Dspring.profiles.active=A -jar web.jar > $LOG_DIRECTORY/web-partyA.log 2>&1 &
    cd ../web && java -Dspring.profiles.active=B -jar web.jar > $LOG_DIRECTORY/web-partyB.log 2>&1 &
    cd ../web && java -Dspring.profiles.active=C -jar web.jar > $LOG_DIRECTORY/web-partyC.log 2>&1 &
    cd ../web && java -Dspring.profiles.active=D -jar web.jar > $LOG_DIRECTORY/web-partyD.log 2>&1 &

    # Wait 1 minute to be sure, that all the Web Spring Boot components are started successfully
    sleep 60s

    echo 'done'

else

    echo "Web Spring Boot components are running already"

fi

exit 0
