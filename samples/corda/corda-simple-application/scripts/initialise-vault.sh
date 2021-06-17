#!/bin/bash

./clients/build/install/clients/bin/clients create-state H 1
./clients/build/install/clients/bin/clients create-verification-policy Corda_Network
./clients/build/install/clients/bin/clients create-membership Corda_Network
./clients/build/install/clients/bin/clients create-access-control-policy Corda_Network
#./clients/build/install/clients/bin/clients create-verification-policy Dummy_Network
./clients/build/install/clients/bin/clients create-verification-policy Fabric_Network
./clients/build/install/clients/bin/clients create-membership Fabric_Network
./clients/build/install/clients/bin/clients create-access-control-policy Fabric_Network
