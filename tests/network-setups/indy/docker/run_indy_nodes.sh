#!/bin/bash
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/src/indy_projects/ursa/target/release/
generate_indy_pool_transactions --nodes 4 --clients 5 --nodeNum 1 2 3 4

start_indy_node Node1 0.0.0.0 9701 0.0.0.0 9702 &

start_indy_node Node2 0.0.0.0 9703 0.0.0.0 9704 &

start_indy_node Node3 0.0.0.0 9705 0.0.0.0 9706 &

start_indy_node Node4 0.0.0.0 9707 0.0.0.0 9708 &

wait -n

exit $?
