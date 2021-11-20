#!/bin/bash

PROFILE=$1
NW=${3:-Corda_Network}

if [ "$NW" = "Corda_Network" ]; then
    echo "Waiting for network $NW node services to start"

    if [ "$PROFILE" = "1-node" ] || [ "$PROFILE" = "2-nodes" ] || [ "$PROFILE" = "3-nodes" ]; then
        # Wait for PartyA services in container to start
        COUNT=0
        while [[ $(docker logs corda_partya_1 | tail -n 1) != "Running P2PMessaging loop" ]]
        do
            sleep 5
            COUNT=$(( COUNT + 1 ))
            if [[ $COUNT == 20 ]]
            then
                break
            fi
    done
    echo "PartyA node services started"
    fi

    if [ "$PROFILE" = "2-nodes" ] || [ "$PROFILE" = "3-nodes" ]; then
        # Wait for PartyB services in container to start
        COUNT=0
        while [[ $(docker logs corda_partyb_1 | tail -n 1) != "Running P2PMessaging loop" ]]
        do
            sleep 5
            COUNT=$(( COUNT + 1 ))
            if [[ $COUNT == 20 ]]
            then
                break
            fi
        done
        echo "PartyB node services started"
    fi
    
    # Wait for Notary services in container to start
    while [[ $(docker logs corda_notary_1 | tail -n 1) != "Running P2PMessaging loop" ]]
    do
        sleep 5
        COUNT=$(( COUNT + 1 ))
        if [[ $COUNT == 20 ]]
        then
            break
        fi
    done
    echo "Notary node services started"
    
elif [ "$NW" = "Corda_Network2" ]; then
    
    echo "Waiting for network $NW node services to start"

    if [ "$PROFILE" = "1-node" ] || [ "$PROFILE" = "2-nodes" ] || [ "$PROFILE" = "3-nodes" ]; then
        # Wait for PartyA services in container to start
        COUNT=0
        while [[ $(docker logs corda_network2_partya_1 | tail -n 1) != "Running P2PMessaging loop" ]]
        do
            sleep 5
            COUNT=$(( COUNT + 1 ))
            if [[ $COUNT == 20 ]]
            then
                break
            fi
    done
    echo "PartyA node services started"
    fi

    if [ "$PROFILE" = "2-nodes" ] || [ "$PROFILE" = "3-nodes" ]; then
        # Wait for PartyB services in container to start
        COUNT=0
        while [[ $(docker logs corda_network2_partyb_1 | tail -n 1) != "Running P2PMessaging loop" ]]
        do
            sleep 5
            COUNT=$(( COUNT + 1 ))
            if [[ $COUNT == 20 ]]
            then
                break
            fi
        done
        echo "PartyB node services started"
    fi
    
    # Wait for Notary services in container to start
    while [[ $(docker logs corda_network2_notary_1 | tail -n 1) != "Running P2PMessaging loop" ]]
    do
        sleep 5
        COUNT=$(( COUNT + 1 ))
        if [[ $COUNT == 20 ]]
        then
            break
        fi
    done
    echo "Notary node services started"
  
else
    echo "Network $NW not found."
fi