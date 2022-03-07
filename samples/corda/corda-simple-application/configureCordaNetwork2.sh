NETWORK_NAME=Corda_Network2 CORDA_PORT=30009 ./clients/build/install/clients/bin/clients create-membership Corda_Network
NETWORK_NAME=Corda_Network2 CORDA_PORT=30009 ./clients/build/install/clients/bin/clients create-verification-policy Corda_Network
NETWORK_NAME=Corda_Network2 CORDA_PORT=30009 ./clients/build/install/clients/bin/clients create-access-control-policy Corda_Network
NETWORK_NAME=Corda_Network2 CORDA_PORT=30009 ./clients/build/install/clients/bin/clients create-membership network1
NETWORK_NAME=Corda_Network2 CORDA_PORT=30009 ./clients/build/install/clients/bin/clients create-verification-policy network1
NETWORK_NAME=Corda_Network2 CORDA_PORT=30009 ./clients/build/install/clients/bin/clients create-access-control-policy network1
