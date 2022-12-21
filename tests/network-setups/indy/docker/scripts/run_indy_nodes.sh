#!/bin/bash

NODES="${INDYNODES:-4}"
CLIENTS="${INDYCLIENTS:-5}"

export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/src/indy_projects/ursa/target/release/

generate_indy_pool_transactions --nodes $NODES --clients $CLIENTS --nodeNum $(seq 1 $NODES )



i=1
while [ $i -le $NODES ]
do
        porti1=$(((($i - 1) * 2) + 1 + 9700))
        porti2=$(($porti1+1))
        

        echo running indy node $i with ports $porti1 and $porti2
        start_indy_node Node$i 0.0.0.0 $porti1 0.0.0.0 $porti2 &

        i=$(($i+1))
done

# Wait for all nodes to start
sleep 30

chmod -R 777 /var/lib/indy/sandbox



wait -n

exit $?
