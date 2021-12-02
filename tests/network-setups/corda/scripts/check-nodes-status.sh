#!/bin/bash

MAX_SLEEP_COUNT=40
PROFILE=$1
NW=${2:-Corda_Network}

if [ "$NW" = "Corda_Network" ]; then
    echo "Waiting for network $NW node services to start"

    if [ "$PROFILE" = "1-node" ] || [ "$PROFILE" = "2-nodes" ] || [ "$PROFILE" = "3-nodes" ]; then
        # Wait for PartyA services in container to start
        COUNT=0
        while [[ $(docker logs corda_partya_1 | tail -n 1) != "Running P2PMessaging loop" ]]
        do
            sleep 5
            COUNT=$(( COUNT + 1 ))
            if [[ $COUNT == $MAX_SLEEP_COUNT ]]
            then
                echo "PartyA node services not started yet. Exiting!!!"
                echo "Please monitor the container logs manually"
                exit 1
            fi
        done
        echo "PartyA node services started for network "$NW
    fi

    if [ "$PROFILE" = "2-nodes" ] || [ "$PROFILE" = "3-nodes" ]; then
        # Wait for PartyB services in container to start
        COUNT=0
        while [[ $(docker logs corda_partyb_1 | tail -n 1) != "Running P2PMessaging loop" ]]
        do
            sleep 5
            COUNT=$(( COUNT + 1 ))
            if [[ $COUNT == $MAX_SLEEP_COUNT ]]
            then
                echo "PartyB node services not started yet. Exiting!!!"
                echo "Please monitor the container logs manually"
                exit 1
            fi
        done
        echo "PartyB node services started for network "$NW
    fi

    if [ "$PROFILE" = "3-nodes" ]; then
        # Wait for PartyC services in container to start
        COUNT=0
        while [[ $(docker logs corda_partyc_1 | tail -n 1) != "Running P2PMessaging loop" ]]
        do
            sleep 5
            COUNT=$(( COUNT + 1 ))
            if [[ $COUNT == $MAX_SLEEP_COUNT ]]
            then
                echo "PartyC node services not started yet. Exiting!!!"
                echo "Please monitor the container logs manually"
                exit 1
            fi
        done
        echo "PartyC node services started for network "$NW
    fi
    
    # Wait for Notary services in container to start
    while [[ $(docker logs corda_notary_1 | tail -n 1) != "Running P2PMessaging loop" ]]
    do
        sleep 5
        COUNT=$(( COUNT + 1 ))
        if [[ $COUNT == $MAX_SLEEP_COUNT ]]
        then
            echo "Notary node services not started yet. Exiting!!!"
            echo "Please monitor the container logs manually"
            exit 1
        fi
    done
    echo "Notary node services started for network "$NW
    
elif [ "$NW" = "Corda_Network2" ]; then
    
    echo "Waiting for network $NW node services to start"

    if [ "$PROFILE" = "1-node" ] || [ "$PROFILE" = "2-nodes" ] || [ "$PROFILE" = "3-nodes" ]; then
        # Wait for PartyA services in container to start
        COUNT=0
        while [[ $(docker logs corda_network2_partya_1 | tail -n 1) != "Running P2PMessaging loop" ]]
        do
            sleep 5
            COUNT=$(( COUNT + 1 ))
            if [[ $COUNT == $MAX_SLEEP_COUNT ]]
            then
                echo "PartyA node services not started yet. Exiting!!!"
                echo "Please monitor the container logs manually"
                exit 1
            fi
        done
        echo "PartyA node services started for network "$NW
    fi

    if [ "$PROFILE" = "2-nodes" ] || [ "$PROFILE" = "3-nodes" ]; then
        # Wait for PartyB services in container to start
        COUNT=0
        while [[ $(docker logs corda_network2_partyb_1 | tail -n 1) != "Running P2PMessaging loop" ]]
        do
            sleep 5
            COUNT=$(( COUNT + 1 ))
            if [[ $COUNT == $MAX_SLEEP_COUNT ]]
            then
                echo "PartyB node services not started yet. Exiting!!!"
                echo "Please monitor the container logs manually"
                exit 1
            fi
        done
        echo "PartyB node services started for network "$NW
    fi

    if [ "$PROFILE" = "3-nodes" ]; then
        # Wait for PartyC services in container to start
        COUNT=0
        while [[ $(docker logs corda_network2_partyc_1 | tail -n 1) != "Running P2PMessaging loop" ]]
        do
            sleep 5
            COUNT=$(( COUNT + 1 ))
            if [[ $COUNT == $MAX_SLEEP_COUNT ]]
            then
                echo "PartyC node services not started yet. Exiting!!!"
                echo "Please monitor the container logs manually"
                exit 1
            fi
        done
        echo "PartyC node services started for network "$NW
    fi
    
    # Wait for Notary services in container to start
    while [[ $(docker logs corda_network2_notary_1 | tail -n 1) != "Running P2PMessaging loop" ]]
    do
        sleep 5
        COUNT=$(( COUNT + 1 ))
        if [[ $COUNT == $MAX_SLEEP_COUNT ]]
        then
            echo "Notary node services not started yet. Exiting!!!"
            echo "Please monitor the container logs manually"
            exit 1
        fi
    done
    echo "Notary node services started for network "$NW
  
else
    echo "Network $NW not found."
fi
