if echo ${FABRIC_VERSION} | grep 2.
then
    cd fabric-samples/test-network
    export PATH=${PWD}/../bin:${PWD}:$PATH
    export FABRIC_CFG_PATH=$PWD/../config/
    # for peer command issued to peer0.org1.example.com
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="Org1MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
    export CORE_PEER_ADDRESS=localhost:7051
    peer chaincode query --channelID mychannel --name fabcar --ctor '{"Args": [], "Function": "queryAllCars"}'
elif echo ${FABRIC_VERSION} | grep 1.
then
    docker exec cli peer chaincode query --channelID mychannel --name fabcar --ctor '{"Args": [], "Function": "queryAllCars"}'
else
    echo "Unsupported fabric version."
fi