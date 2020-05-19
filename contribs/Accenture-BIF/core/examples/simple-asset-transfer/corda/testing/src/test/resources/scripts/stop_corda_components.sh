#!/usr/bin/env bash
#
# Stop all the Corda components
#

CORDA_PROCESS_NAME="Corda"
SPRING_BOOT_PROCESS_NAME="spring"
CHECK_CORDA_PROCESS_RESULT=`ps -edf | grep java | sed -n /${CORDA_PROCESS_NAME}/p`
CHECK_SPRING_BOOT_PROCESS_RESULT=`ps -edf | grep java | sed -n /${SPRING_BOOT_PROCESS_NAME}/p`

# Terminate the processes
function terminate_processes() {

    # Terminate operation
    kill ${1}

    # Repeat until the processes are terminated
    timeout_counter=0
    while [[ ${?} == 0 ]]
    do

        # Force to kill the processes in case of big timeout
        if [[ "$timeout_counter" -gt 30 ]]; then

            kill -9 ${1} >/dev/null 2>&1

        fi

        # Increase the timeout counter
        timeout_counter=$((timeout_counter+1))

        # Wait a bit before testing
        sleep 1s

        # Check if the processes are terminated
        ps -p ${1} >/dev/null

    done

}

# Stop Web Spring Boot components simultaneously
if [[ "${CHECK_SPRING_BOOT_PROCESS_RESULT:-null}" != null ]]; then

    echo -n 'Stopping Web Spring Boot components... '

    # Get the processes list
    spring_boot_components_processes=$( ps -edf | grep java | grep ${SPRING_BOOT_PROCESS_NAME} | awk {'print$2'} )

    # Terminate them
    terminate_processes "$spring_boot_components_processes"

    echo 'done'

else

    echo "Web Spring Boot components are not running"

fi

# Stop Corda nodes simultaneously
if [[ "${CHECK_CORDA_PROCESS_RESULT:-null}" != null ]]; then

    echo -n 'Stopping Corda nodes... '

    # Get the processes list
    corda_nodes_processes=$( ps -edf | grep java | grep ${CORDA_PROCESS_NAME} | awk {'print$2'} )

    # Terminate them
    terminate_processes "$corda_nodes_processes"

    echo 'done'

else

    echo "Corda nodes are not running"

fi

exit 0
