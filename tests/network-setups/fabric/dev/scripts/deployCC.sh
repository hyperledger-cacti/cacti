#!/bin/bash

CHANNEL_NAME="$1"
CC_SRC_LANGUAGE="$2"
VERSION="$3"
DELAY="$4"
MAX_RETRY="$5"
VERBOSE="$6"
CC_CHAIN_CODE="$7"
NW_PATH="$8"
ORG1_P="$9"
ORG2_P="${10}"
ORD_P=${11}
APP_R=${12}
NW_NAME=${13}
PROFILE="${14}"

: ${CHANNEL_NAME:="mychannel"}
: ${CC_SRC_LANGUAGE:="golang"}
: ${VERSION:="1"}
: ${DELAY:="3"}
: ${MAX_RETRY:="5"}
: ${VERBOSE:="false"}

CC_SRC_LANGUAGE=`echo "$CC_SRC_LANGUAGE" | tr [:upper:] [:lower:]`
CC_CHAIN_CODE=`echo "$CC_CHAIN_CODE" | tr [:upper:] [:lower:]`

CC_END_POLICY="--signature-policy AND('Org1MSP.member')"
if [ "$PROFILE" = "2-nodes" ]; then
	if [ "$CC_CHAIN_CODE" = "interop" ]; then
		CC_END_POLICY="--signature-policy OR('Org1MSP.member','Org2MSP.member')"
	else
		CC_END_POLICY="--signature-policy AND('Org1MSP.member','Org2MSP.member')"
	fi
fi

echo " - CHANNEL_NAME           :      ${CHANNEL_NAME}"
echo " - CC_SRC_LANGUAGE        :      ${CC_SRC_LANGUAGE}"
echo " - DELAY                  :      ${DELAY}"
echo " - MAX_RETRY              :      ${MAX_RETRY}"
echo " - VERBOSE                :      ${VERBOSE}"
echo " - CC_CHAIN_CODE          :      ${CC_CHAIN_CODE}"
echo " - NW_PATH                :      ${NW_PATH}"
echo " - PEER_ADD               :      ${ORG1_P}"
echo " - ORD_PORT               :      ${ORD_P}"
echo " - APP_ROOT               :      ${APP_R}"
echo " - NW_NAME                :      ${NW_NAME}"

FABRIC_CFG_PATH=$NW_PATH/config/
export NW_NAME=${NW_NAME}

if [ "$CC_SRC_LANGUAGE" = "go" -o "$CC_SRC_LANGUAGE" = "golang" ] ; then
    CC_RUNTIME_LANGUAGE=golang
    #CC_SRC_PATH="./chaincode/fabcar/go/"
    CC_SRC_PATH="$APP_R/fabric/shared/chaincode/$CC_CHAIN_CODE"
    echo "Preparing for deployment of :" $CC_SRC_PATH
    #pushd ./chaincode/snamcc
    #GO111MODULE=on go mod init snamcc
    #GO111MODULE=on go mod vendor
    #popd
    #echo Finished vendoring Go dependencies
    sleep 1

elif [ "$CC_SRC_LANGUAGE" = "javascript" ]; then
    CC_RUNTIME_LANGUAGE=node # chaincode runtime language is node.js
    CC_SRC_PATH="./chaincode/fabcar/javascript/"

elif [ "$CC_SRC_LANGUAGE" = "java" ]; then
    CC_RUNTIME_LANGUAGE=java
    CC_SRC_PATH="./chaincode/fabcar/java/build/install/fabcar"

    echo Compiling Java code ...
    pushd ../chaincode/fabcar/java
    ./gradlew installDist
    popd
    echo Finished compiling Java code

elif [ "$CC_SRC_LANGUAGE" = "typescript" ]; then
    CC_RUNTIME_LANGUAGE=node # chaincode runtime language is node.js
    CC_SRC_PATH="./chaincode/fabcar/typescript/"

    echo Compiling TypeScript code into JavaScript ...
    pushd ./chaincode/fabcar/typescript
    npm install
    npm run build
    popd
    echo Finished compiling TypeScript code into JavaScript

else
    echo The chaincode language ${CC_SRC_LANGUAGE} is not supported by this script
    echo Supported chaincode languages are: go, java, javascript, and typescript
    exit 1
fi

# import utils
. scripts/envVar.sh $NW_PATH $ORG1_P $NW_NAME


packageChaincode() {
	ORG=$1
	setGlobals $ORG $ORG1_P $NW_NAME
	set -x
	# Select a different chaincode folder depending on whether it is regular chaincode or chaincode adapted to control access from relay clients
	peer lifecycle chaincode package $CC_CHAIN_CODE.tar.gz --path ${CC_SRC_PATH} --lang ${CC_RUNTIME_LANGUAGE} --label ${CC_CHAIN_CODE}_${VERSION} >&log.txt
	res=$?
	set +x
	cat log.txt
	verifyResult $res "Chaincode packaging on peer0.org${ORG} has failed"
	echo "===================== Chaincode is packaged on peer0.org${ORG} ===================== "
	echo
    sleep 1
}

# installChaincode PEER ORG
installChaincode() {
    ORG=$1
    P_ADDR=$2
    NW_NAME=$3
    setGlobals $ORG $P_ADDR $NW_NAME

    echo "CORE_PEER_ADDRESS = $CORE_PEER_ADDRESS"
    echo "CORE_PEER_MSPCONFIGPATH = $CORE_PEER_MSPCONFIGPATH"
    echo "NW NAME = $NW_NAME"

    set -x
	peer lifecycle chaincode install $CC_CHAIN_CODE.tar.gz
	res=$?
	set +x
	cat log.txt
	verifyResult $res "Chaincode installation on peer0.org${ORG} has failed"
	echo "===================== Chaincode is installed on peer0.org${ORG} ===================== "
	echo
	sleep 1
}

# queryInstalled PEER ORG
queryInstalled() {
	ORG=$1
    P_ADDR=$2
	setGlobals $ORG $P_ADDR $NW_NAME
	set -x
	peer lifecycle chaincode queryinstalled >&log.txt
	res=$?
	set +x
	grep $CC_CHAIN_CODE log.txt > logtemp.txt
	cat logtemp.txt
	PACKAGE_ID=$(sed -n "/$CC_CHAIN_CODE_${VERSION}/{s/^Package ID: //; s/, Label:.*$//; p;}" logtemp.txt)
	verifyResult $res "Query installed on peer0.org${ORG} has failed"
	echo PackageID is ${PACKAGE_ID}
	echo "===================== Query installed successful on peer0.org${ORG} on channel ===================== "
	echo
	rm logtemp.txt
}

# approveForMyOrg VERSION PEER ORG
approveForMyOrg() {
	ORG="$1"
    P_ADDR="$2"
    ORDERER_PORT="$3"
    #echo "ORDERER_PORT = $ORDERER_PORT"
	setGlobals $ORG $P_ADDR $NW_NAME
	set -x
	peer lifecycle chaincode approveformyorg -o localhost:${ORD_P} --ordererTLSHostnameOverride orderer.$NW_NAME.com --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA --channelID $CHANNEL_NAME --name $CC_CHAIN_CODE --version ${VERSION} --init-required $CC_END_POLICY --package-id ${PACKAGE_ID} --sequence ${VERSION} >&log.txt
	set +x
	cat log.txt
	verifyResult $res "Chaincode definition approved on peer0.org${ORG} on channel '$CHANNEL_NAME' failed"
	echo "===================== Chaincode definition approved on peer0.org${ORG} on channel '$CHANNEL_NAME' ===================== "
	echo
    sleep 1
}

# checkCommitReadiness VERSION PEER ORG
checkCommitReadiness() {
	# echo "In checkCommitReadiness"
	# echo "$1"
	# echo "$2"
	# echo "$3"
    ORG="$1"
    P_ADDR="$2"
	NW_NAME=$3
    # sleep 2
	shift 3
	setGlobals $ORG $P_ADDR $NW_NAME
	echo "===================== Checking the commit readiness of the chaincode definition on peer0.org${ORG} on channel '$CHANNEL_NAME'... ===================== "
	local rc=1
	local COUNTER=1
	# continue to poll
	# we either get a successful response, or reach MAX RETRY
    while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
	    sleep $DELAY
	    echo "Attempting to check the commit readiness of the chaincode definition on peer0.org${ORG} secs"
	    set -x
	    peer lifecycle chaincode checkcommitreadiness --channelID $CHANNEL_NAME --name $CC_CHAIN_CODE --version ${VERSION} --sequence ${VERSION} --output json --init-required $CC_END_POLICY >&log.txt
	    res=$?
	    set +x
	    let rc=0
	    for var in "$@"
	    do
			grep "$var" log.txt &>/dev/null || let rc=1
	    done
        COUNTER=$(expr $COUNTER + 1)
    done
	cat log.txt
	if test $res -eq 0; then
    	echo "===================== Checking the commit readiness of the chaincode definition successful on peer0.org${ORG} on channel '$CHANNEL_NAME' ===================== "
	else
	    echo "!!!!!!!!!!!!!!! After $MAX_RETRY attempts, Check commit readiness result on peer0.org${ORG} is INVALID !!!!!!!!!!!!!!!!"
	    echo
	    exit 1
	fi
    sleep 1
}

# commitChaincodeDefinition VERSION PEER ORG (PEER ORG)...
commitChaincodeDefinition() {
	parsePeerConnectionParameters $@
	res=$?
	verifyResult $res "Invoke transaction failed on channel '$CHANNEL_NAME' due to uneven number of peer and org parameters "

	# while 'peer chaincode' command can get the orderer endpoint from the
	# peer (if join was successful), let's supply it directly as we know
	# it using the "-o" option
    #echo "In commitChaincodeDefinition"
    #echo $1
    #echo $2
    #ORG="$1"
    #P_ADDR="$2"
    #echo "Peer pram: "$PEER_CONN_PARMS
    #setGlobals $ORG $P_ADDR
	set -x
	peer lifecycle chaincode commit -o localhost:${ORD_P} --ordererTLSHostnameOverride orderer.$NW_NAME.com --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA --channelID $CHANNEL_NAME --name $CC_CHAIN_CODE $PEER_CONN_PARMS --version ${VERSION} --sequence ${VERSION} --init-required $CC_END_POLICY >&log.txt
	res=$?
	set +x
	cat log.txt
	verifyResult $res "Chaincode definition commit failed on peer0.org${ORG} on channel '$CHANNEL_NAME' failed"
	echo "===================== Chaincode definition committed on channel '$CHANNEL_NAME' ===================== "
	echo
    sleep 1
}

# queryCommitted ORG
queryCommitted() {
	ORG=$1
	P_ADDR=$2
	setGlobals $ORG $P_ADDR $NW_NAME
	EXPECTED_RESULT="Version: ${VERSION}, Sequence: ${VERSION}, Endorsement Plugin: escc, Validation Plugin: vscc"
	echo "===================== Querying chaincode definition on peer0.org${ORG} on channel '$CHANNEL_NAME'... ===================== "
    local rc=1
    local COUNTER=1
    # continue to poll
	# we either get a successful response, or reach MAX RETRY
    #while [ $rc -ne 0 -a $COUNTER -le $MAX_RETRY ] ; do
    sleep $DELAY
    echo "Attempting to Query committed status on peer0.org${ORG}, Retry after $DELAY seconds."
    set -x
    peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name $CC_CHAIN_CODE >&log.txt
    res=$?
    set +x
        test $res -eq 0 && VALUE=$(cat log.txt | grep -o '^Version: [0-9], Sequence: [0-9], Endorsement Plugin: escc, Validation Plugin: vscc')
    test "$VALUE" = "$EXPECTED_RESULT" && let rc=0
        #COUNTER=$(expr $COUNTER + 1)
    #done
	echo
	cat log.txt
	if test $rc -eq 0; then
		echo "===================== Query chaincode definition successful on peer0.org${ORG} on channel '$CHANNEL_NAME' ===================== "
		echo
	else
		echo "!!!!!!!!!!!!!!! After $MAX_RETRY attempts, Query chaincode definition result on peer0.org${ORG} is INVALID !!!!!!!!!!!!!!!!"
		echo
		exit 1
	fi
    sleep 1
}

chaincodeInvokeInit() {
	parsePeerConnectionParameters $@
	res=$?
	verifyResult $res "Invoke transaction failed on channel '$CHANNEL_NAME' due to uneven number of peer and org parameters "

	# while 'peer chaincode' command can get the orderer endpoint from the
	# peer (if join was successful), let's supply it directly as we know
	# it using the "-o" option
	set -x
	if [ "$CC_CHAIN_CODE" = "interop" ]; then
        if [ "$E2E_CONFIDENTIALITY" = "true" ]; then
            echo "Launching interop CC with end-to-end confidentiality"
            peer chaincode invoke -o localhost:${ORD_P} --ordererTLSHostnameOverride orderer.$NW_NAME.com --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n $CC_CHAIN_CODE $PEER_CONN_PARMS --isInit -c '{"function":"initLedger","Args":["true"]}' >&log.txt
        else
            echo "Launching interop CC without end-to-end confidentiality"
            peer chaincode invoke -o localhost:${ORD_P} --ordererTLSHostnameOverride orderer.$NW_NAME.com --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n $CC_CHAIN_CODE $PEER_CONN_PARMS --isInit -c '{"function":"initLedger","Args":[]}' >&log.txt
        fi
	elif [ "$CC_CHAIN_CODE" = "simplestate" ]; then
        peer chaincode invoke -o localhost:${ORD_P} --ordererTLSHostnameOverride orderer.$NW_NAME.com --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n $CC_CHAIN_CODE $PEER_CONN_PARMS --isInit -c '{"function":"create","Args":["a","b"]}' >&log.txt
	elif [ "$CC_CHAIN_CODE" = "simplestatewithacl" ]; then
        peer chaincode invoke -o localhost:${ORD_P} --ordererTLSHostnameOverride orderer.$NW_NAME.com --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n $CC_CHAIN_CODE $PEER_CONN_PARMS --isInit -c '{"function":"init","Args":["interop"]}' >&log.txt
	elif [ "$CC_CHAIN_CODE" = "simpleasset" ] && [ "$NW_NAME" = "network1" ]; then
        peer chaincode invoke -o localhost:${ORD_P} --ordererTLSHostnameOverride orderer.$NW_NAME.com --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n $CC_CHAIN_CODE $PEER_CONN_PARMS --isInit -c '{"function":"initLedger","Args":["Bond", "interop"]}' >&log.txt
	elif [ "$CC_CHAIN_CODE" = "simpleasset" ] && [ "$NW_NAME" = "network2" ]; then
        peer chaincode invoke -o localhost:${ORD_P} --ordererTLSHostnameOverride orderer.$NW_NAME.com --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n $CC_CHAIN_CODE $PEER_CONN_PARMS --isInit -c '{"function":"initLedger","Args":["Token", "interop"]}' >&log.txt
	elif [ "$CC_CHAIN_CODE" = "simpleassettransfer" ] && [ "$NW_NAME" = "network1" ]; then
        peer chaincode invoke -o localhost:${ORD_P} --ordererTLSHostnameOverride orderer.$NW_NAME.com --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n $CC_CHAIN_CODE $PEER_CONN_PARMS --isInit -c '{"function":"initLedger","Args":["interop", "network1"]}' >&log.txt
	elif [ "$CC_CHAIN_CODE" = "simpleassettransfer" ] && [ "$NW_NAME" = "network2" ]; then
        peer chaincode invoke -o localhost:${ORD_P} --ordererTLSHostnameOverride orderer.$NW_NAME.com --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n $CC_CHAIN_CODE $PEER_CONN_PARMS --isInit -c '{"function":"initLedger","Args":["interop", "network2"]}' >&log.txt
	elif [ "$CC_CHAIN_CODE" = "simpleassetandinterop" ] && [ "$NW_NAME" = "network1" ]; then
        peer chaincode invoke -o localhost:${ORD_P} --ordererTLSHostnameOverride orderer.$NW_NAME.com --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n $CC_CHAIN_CODE $PEER_CONN_PARMS --isInit -c '{"function":"initLedger","Args":["Bond"]}' >&log.txt
	elif [ "$CC_CHAIN_CODE" = "simpleassetandinterop" ] && [ "$NW_NAME" = "network2" ]; then
        peer chaincode invoke -o localhost:${ORD_P} --ordererTLSHostnameOverride orderer.$NW_NAME.com --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n $CC_CHAIN_CODE $PEER_CONN_PARMS --isInit -c '{"function":"initLedger","Args":["Token"]}' >&log.txt
    else
        peer chaincode invoke -o localhost:${ORD_P} --ordererTLSHostnameOverride orderer.$NW_NAME.com --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n $CC_CHAIN_CODE $PEER_CONN_PARMS --isInit -c '{"function":"initLedger","Args":[""]}' >&log.txt
	fi
	res=$?
	set +x
	cat log.txt
	verifyResult $res "Invoke execution on $PEERS failed "
	echo "===================== Invoke transaction successful on $PEERS on channel '$CHANNEL_NAME' ===================== "
	echo
    sleep 1
}

chaincodeQuery() {
	ORG=$1
	setGlobals $ORG
	echo "===================== Querying on peer0.org${ORG} on channel '$CHANNEL_NAME'... ===================== "
    local rc=1
    local COUNTER=1
    # continue to poll
	# we either get a successful response, or reach MAX RETRY
    #while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
    sleep $DELAY
    echo "Attempting to Query peer0.org${ORG} ...$(($(date +%s) - starttime)) secs"
    set -x
    peer chaincode query -C $CHANNEL_NAME -n $CC_CHAIN_CODE -c '{"Args":["TO DO"]}' >&log.txt
    res=$?
    set +x
        let rc=$res
        #COUNTER=$(expr $COUNTER + 1)
    #done
	echo
	cat log.txt
	if test $rc -eq 0; then
		echo "===================== Query successful on peer0.org${ORG} on channel '$CHANNEL_NAME' ===================== "
		echo
	else
		echo "!!!!!!!!!!!!!!! After $MAX_RETRY attempts, Query result on peer0.org${ORG} is INVALID !!!!!!!!!!!!!!!!"
		echo
		exit 1
	fi
}

## at first we package the chaincode
packageChaincode 1

## Install chaincode on peer0
echo "Installing chaincode on peer0.org1.$NW_NAME.com  port: $ORG1_P  NW: $NW_NAME"
installChaincode 1 $ORG1_P $NW_NAME


if [ "$PROFILE" = "2-nodes" ]; then
    echo "Installing chaincode on peer0.org2.$NW_NAME.com  port: $ORG2_P  NW: $NW_NAME"
    installChaincode 2 $ORG2_P $NW_NAME
fi

## query whether the chaincode is installed
queryInstalled 1 $ORG1_P $NW_NAME

## approve the definition for org1
approveForMyOrg 1 $ORG1_P $ORD_PORT $NW_NAME

## check whether the chaincode definition is ready to be committed
## expect org1 to have approved and org2 not to
if [ "$PROFILE" = "2-nodes" ]; then
    checkCommitReadiness 1 $ORG1_P $NW_NAME "\"Org1MSP\": true" "\"Org2MSP\": false"
    checkCommitReadiness 2 $ORG2_P $NW_NAME "\"Org1MSP\": true" "\"Org2MSP\": false"
else
    checkCommitReadiness 1 $ORG1_P $NW_NAME "\"Org1MSP\": true"
fi

if [ "$PROFILE" = "2-nodes" ]; then
    ## now approve also for org2
    approveForMyOrg 2 $ORG2_P $ORD_PORT $NW_NAME
    
    ## check whether the chaincode definition is ready to be committed
    ## expect them both to have approved
    checkCommitReadiness 1 $ORG1_P $NW_NAME "\"Org1MSP\": true" "\"Org2MSP\": true"
    checkCommitReadiness 2 $ORG2_P $NW_NAME "\"Org1MSP\": true" "\"Org2MSP\": true"
fi

## now that we know for sure both orgs have approved, commit the definition
if [ "$PROFILE" = "2-nodes" ]; then
    commitChaincodeDefinition 1 $ORG1_P $NW_NAME 2 $ORG2_P $NW_NAME
else
    commitChaincodeDefinition 1 $ORG1_P $NW_NAME
fi

## query on both orgs to see that the definition committed successfully
queryCommitted 1 $ORG1_P $NW_NAME
if [ "$PROFILE" = "2-nodes" ]; then
    queryCommitted 2 $ORG2_P $NW_NAME
fi

## Invoke the chaincode
if [ "$PROFILE" = "2-nodes" ]; then
    chaincodeInvokeInit 1 $ORG1_P $NW_NAME 2 $ORG2_P $NW_NAME
else
    chaincodeInvokeInit 1 $ORG1_P $NW_NAME
fi

# Query chaincode on peer0.org1
#echo "Querying chaincode on peer0.org1..."
#chaincodeQuery 1

exit 0
