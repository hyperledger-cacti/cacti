#!/bin/bash
# Copyright 2019 Fujitsu Laboratories Ltd.
# SPDX-License-Identifier: Apache-2.0

echo
echo " ____    _____      _      ____    _____ "
echo "/ ___|  |_   _|    / \    |  _ \  |_   _|"
echo "\___ \    | |     / _ \   | |_) |   | |  "
echo " ___) |   | |    / ___ \  |  _ <    | |  "
echo "|____/    |_|   /_/   \_\ |_| \_\   |_|  "
echo
echo "Build your first network (BYFN) end-to-end test"
echo
CHANNEL_NAME="$1"
DELAY="$2"
MODE="$3"
: ${CHANNEL_NAME:="mychannel"}
: ${TIMEOUT:="60"}

COUNTER=1
MAX_RETRY=5
ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

echo "Channel name : "$CHANNEL_NAME
echo "Mode         : "$MODE

# verify the result of the end-to-end test
verifyResult () {
	if [ $1 -ne 0 ] ; then
		echo "!!!!!!!!!!!!!!! "$2" !!!!!!!!!!!!!!!!"
    echo "========= ERROR !!! FAILED to execute End-2-End Scenario ==========="
		echo
   		exit 1
	fi
}

setGlobals () {

	CORE_PEER_LOCALMSPID="Org1MSP"
	CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
	CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
	CORE_PEER_ADDRESS=peer$1.org1.example.com:7051

	env |grep CORE
}

createChannel() {
	setGlobals 0

	peer channel create -o orderer.example.com:7050 -c $CHANNEL_NAME -f ./channel-artifacts/channel.tx >&log.txt

	res=$?
	cat log.txt
	verifyResult $res "Channel creation failed"
	echo "===================== Channel \"$CHANNEL_NAME\" is created successfully ===================== "
	echo
}

## Sometimes Join takes time hence RETRY atleast for 5 times
joinWithRetry () {
	peer channel join -b $CHANNEL_NAME.block  >&log.txt
	res=$?
	cat log.txt
	if [ $res -ne 0 -a $COUNTER -lt $MAX_RETRY ]; then
		COUNTER=` expr $COUNTER + 1`
		echo "PEER$1 failed to join the channel, Retry after 2 seconds"
		sleep $DELAY
		joinWithRetry $1
	else
		COUNTER=1
	fi
  verifyResult $res "After $MAX_RETRY attempts, PEER$ch has failed to Join the Channel"
}

joinChannel () {
	for ch in 0 1 2 3; do
		setGlobals $ch
		joinWithRetry $ch
		echo "===================== PEER$ch joined on the channel \"$CHANNEL_NAME\" ===================== "
		sleep $DELAY
		echo
	done
}

installChaincode () {
	CHAINCODE_NAME=$1
	PEER=$2
	setGlobals $PEER
	peer chaincode install -n $CHAINCODE_NAME -v 1.0 -p github.com/hyperledger/fabric/work/chaincode/$CHAINCODE_NAME >&log.txt
	res=$?
	cat log.txt
        verifyResult $res "Chaincode installation on remote peer PEER$PEER has Failed"
	echo "===================== Chaincode is installed on remote peer PEER$PEER ===================== "
	echo
}

instantiateChaincode () {
	CHAINCODE_NAME=$1
	PEER=$2
	setGlobals $PEER
	# while 'peer chaincode' command can get the orderer endpoint from the peer (if join was successful),
	# lets supply it directly as we know it using the "-o" option
	peer chaincode instantiate -o orderer.example.com:7050 -C $CHANNEL_NAME -n $CHAINCODE_NAME -v 1.0 -c '{"Args":[]}' >&log.txt

	res=$?
	cat log.txt
	verifyResult $res "Chaincode instantiation on PEER$PEER on channel '$CHANNEL_NAME' failed"
	echo "===================== Chaincode Instantiation on PEER$PEER on channel '$CHANNEL_NAME' is successful ===================== "
	echo
}

chaincodeQuery_ns () {
	PEER=$1
	setGlobals $PEER

	peer chaincode query -C $CHANNEL_NAME -n naming_service -c '{"Args":["getECAccountList"]}'

	echo "===================== Query chaincode 'naming_service' on PEER$PEER on channel '$CHANNEL_NAME' is executed ===================== "
	echo
}

chaincodeQuery_ei () {
	PEER=$1
	setGlobals $PEER

	peer chaincode query -C $CHANNEL_NAME -n endchain_information -c '{"Args":["getECInfoList"]}'

	echo "===================== Query chaincode 'endchain_information' on PEER$PEER on channel '$CHANNEL_NAME' is executed ===================== "
	echo
}

chaincodeQuery_ti () {
	PEER=$1
	setGlobals $PEER

	peer chaincode query -C $CHANNEL_NAME -n transfer_information -c '{"Args":["getRuleInfoList", "", ""]}'

	echo "===================== Query chaincode 'transfer_information' on PEER$PEER on channel '$CHANNEL_NAME' is executed ===================== "
	echo
}

if [ $MODE = "up" ]; then
	## Create channel
	echo "Creating channel..."
	createChannel

	## Join all the peers to the channel
	echo "Having all peers join the channel..."
	joinChannel

	## Install chaincode
	installChaincode naming_service 0
	installChaincode naming_service 1
	installChaincode naming_service 2
	installChaincode naming_service 3

	installChaincode endchain_information 0
	installChaincode endchain_information 1
	installChaincode endchain_information 2
	installChaincode endchain_information 3

	installChaincode transfer_information 0
	installChaincode transfer_information 1
	installChaincode transfer_information 2
	installChaincode transfer_information 3

	#Instantiate chaincode
	echo "Instantiating chaincode"
	instantiateChaincode naming_service 0
	instantiateChaincode endchain_information 0
	instantiateChaincode transfer_information 0
fi

#Query chaincode
echo "Querying chaincode"
if [ $MODE = "restart" ]; then
	chaincodeQuery_ns 0
fi
chaincodeQuery_ns 1
chaincodeQuery_ns 2
chaincodeQuery_ns 3

if [ $MODE = "restart" ]; then
	chaincodeQuery_ei 0
fi
chaincodeQuery_ei 1
chaincodeQuery_ei 2
chaincodeQuery_ei 3

if [ $MODE = "restart" ]; then
	chaincodeQuery_ti 0
fi
chaincodeQuery_ti 1
chaincodeQuery_ti 2
chaincodeQuery_ti 3

echo
echo "========= All GOOD, BYFN execution completed =========== "
echo

echo
echo " _____   _   _   ____   "
echo "| ____| | \ | | |  _ \  "
echo "|  _|   |  \| | | | | | "
echo "| |___  | |\  | | |_| | "
echo "|_____| |_| \_| |____/  "
echo

exit 0
