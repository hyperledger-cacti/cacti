#!/bin/bash

echo "Waiting for network node services to start"

# Wait for PartyA services in container to start
while [[ $(docker logs corda_partya_1 | tail -n 1) != "Running P2PMessaging loop" ]]
do sleep 5
done
echo "PartyA node services started"

# Wait for PartyA services in container to start
while [[ $(docker logs corda_partyb_1 | tail -n 1) != "Running P2PMessaging loop" ]]
do sleep 5
done
echo "PartyB node services started"

# Wait for PartyA services in container to start
while [[ $(docker logs corda_notary_1 | tail -n 1) != "Running P2PMessaging loop" ]]
do sleep 5
done
echo "Notary node services started"
