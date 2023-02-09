#!/bin/bash

INIT_REQUIRED="--init-required"
if [ "$CC_INIT_FCN" = "NA" ]; then
	INIT_REQUIRED=""
fi

if [ "$CC_END_POLICY" = "NA" ]; then
	CC_END_POLICY=""
else
	CC_END_POLICY="--signature-policy $CC_END_POLICY"
fi

if [ "$CC_COLL_CONFIG" = "NA" ]; then
	CC_COLL_CONFIG=""
else
	CC_COLL_CONFIG="--collections-config $CC_COLL_CONFIG"
fi

setGlobals() {
  local USING_ORG=""
  ORG=$1
  ORGMSP=`echo ${ORG:0:1} | tr  '[a-z]' '[A-Z]'`${ORG:1}"MSP"
  echo "Using organization ${ORG}, MSP: ${ORGMSP}"
  export CORE_PEER_LOCALMSPID=${ORGMSP}
  export CORE_PEER_TLS_ROOTCERT_FILE=/var/pvc1/peerOrganizations/${ORG}/peers/peer0-${ORG}-${NW_NAME}/tls/ca.crt
  export CORE_PEER_MSPCONFIGPATH=/var/pvc1/peerOrganizations/${ORG}/users/Admin@${ORG}/msp
  export CORE_PEER_ADDRESS=peer0-${ORG}-${NW_NAME}:${PORT}

  if [ "$VERBOSE" == "true" ]; then
    env | grep CORE
  fi
}

# parsePeerConnectionParameters $@
# Helper function that sets the peer connection parameters for a chaincode
# operation
parsePeerConnectionParameters() {
  PEER_CONN_PARAMS=""
	for org in $ORG_LIST; do
		PEER_CONN_PARAMS=$PEER_CONN_PARAMS" --peerAddresses peer0-${org}-${NW_NAME}:${PORT} --tlsRootCertFiles /var/pvc1/peerOrganizations/${org}/peers/peer0-${org}-${NW_NAME}/tls/ca.crt"
	done
}

verifyResult() {
  if [ $1 -ne 0 ]; then
    echo "############# $2 .##########"
    echo
    exit 1
  fi
}

# queryInstalled PEER ORG
queryInstalled() {
  ORG=$1
  setGlobals $ORG
  set -x
  peer lifecycle chaincode queryinstalled >&~/log.txt
  res=$?
  set +x
  grep ${CC_NAME} ~/log.txt > logtemp.txt
  cat logtemp.txt
  PACKAGE_ID=$(sed -n "/${CC_NAME}/{s/^Package ID: //; s/, Label:.*$//; p;}" logtemp.txt)
  verifyResult $res "Query installed on ${CORE_PEER_ADDRESS} has failed"
  echo PackageID is ${PACKAGE_ID}
  echo "===================== Query installed successful on ${CORE_PEER_ADDRESS} on channel ===================== "
  echo
  rm logtemp.txt
}

# approveForMyOrg VERSION PEER ORG
approveForMyOrg() {
  ORG=$1
  setGlobals $ORG
  set -x
  peer lifecycle chaincode approveformyorg -o ${ORDERER_URL} --ordererTLSHostnameOverride ${ORDERER_NAME} --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA --channelID $CHANNEL_NAME --name ${CC_NAME} --version ${CC_VERSION} --init-required --package-id ${PACKAGE_ID} --sequence ${CC_SEQUENCE} >&~/log.txt
  set +x
  cat ~/log.txt
  verifyResult $res "Chaincode definition approved on ${CORE_PEER_ADDRESS} on channel '$CHANNEL_NAME' failed"
  echo "===================== Chaincode definition approved on ${CORE_PEER_ADDRESS} on channel '$CHANNEL_NAME' ===================== "
  echo
	sleep 1
}

# checkCommitReadiness VERSION PEER ORG
checkCommitReadiness() {
  ORG=$1
  setGlobals $ORG
	echo "===================== Checking the commit readiness of the chaincode definition on ${CORE_PEER_ADDRESS} on channel '$CHANNEL_NAME'... ===================== "
	local rc=1
	local COUNTER=1
	# continue to poll
	# we either get a successful response, or reach MAX RETRY
	while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ]; do
		sleep $DELAY
		echo "Attempting to check the commit readiness of the chaincode definition on ${CORE_PEER_ADDRESS}, Retry after $DELAY seconds."
		set -x
		peer lifecycle chaincode checkcommitreadiness --channelID ${CHANNEL_NAME} --name ${CC_NAME} --version ${CC_VERSION} --sequence ${CC_SEQUENCE} ${INIT_REQUIRED} ${CC_END_POLICY} ${CC_COLL_CONFIG} --output json >&~/log.txt
		res=$?
		set +x
		let rc=0
		for var in "$@"; do
			if [ "$var" != "$ORG" ]; then
				echo 'var...'$var
				grep "$var" ~/log.txt &>/dev/null || let rc=1
			fi
		done
		COUNTER=$(expr $COUNTER + 1)
	done
	cat ~/log.txt
	if test $rc -eq 0; then
		echo "===================== Checking the commit readiness of the chaincode definition successful on ${CORE_PEER_ADDRESS} on channel '$CHANNEL_NAME' ===================== "
	else
		echo
		echo $'\e[1;31m'"############### After $MAX_RETRY attempts, Check commit readiness result on ${CORE_PEER_ADDRESS} is INVALID ###############!"$'\e[0m'
		echo
		exit 1
	fi
}

# commitChaincodeDefinition VERSION PEER ORG (PEER ORG)...
commitChaincodeDefinition() {
  parsePeerConnectionParameters
  res=$?
  verifyResult $res "Invoke transaction failed on channel '$CHANNEL_NAME' due to uneven number of peer and org parameters "

  # while 'peer chaincode' command can get the orderer endpoint from the
  # peer (if join was successful), let's supply it directly as we know
  # it using the "-o" option

  set -x
  peer lifecycle chaincode commit -o ${ORDERER_URL} --ordererTLSHostnameOverride ${ORDERER_NAME} --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA --channelID $CHANNEL_NAME --name ${CC_NAME} $PEER_CONN_PARAMS --version ${CC_VERSION} --sequence ${CC_SEQUENCE} ${INIT_REQUIRED} ${CC_END_POLICY} ${CC_COLL_CONFIG} >&~/log.txt
  res=$?
  set +x
  cat ~/log.txt
  verifyResult $res "Chaincode definition commit failed on ${CORE_PEER_ADDRESS} on channel '$CHANNEL_NAME' failed"
  echo "===================== Chaincode definition committed on channel '$CHANNEL_NAME' ===================== "
  echo
	sleep 1
}

# queryCommitted ORG
queryCommitted() {
  ORG=$1
  setGlobals $ORG
  EXPECTED_RESULT="Version: ${CC_VERSION}, Sequence: ${CC_SEQUENCE}, Endorsement Plugin: escc, Validation Plugin: vscc"
  echo "===================== Querying chaincode definition on ${CORE_PEER_ADDRESS} on channel '$CHANNEL_NAME'... ===================== "
	local rc=1
	local COUNTER=1
	# continue to poll
  # we either get a successful response, or reach MAX RETRY
	while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ]; do
    sleep $DELAY
    echo "Attempting to Query committed status on ${CORE_PEER_ADDRESS}, Retry after $DELAY seconds."
    set -x
    peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name ${CC_NAME} >&~/log.txt
    res=$?
    set +x
		test $res -eq 0 && VALUE=$(cat ~/log.txt | grep -o '^Version: '$CC_VERSION', Sequence: [0-9], Endorsement Plugin: escc, Validation Plugin: vscc')
    test "$VALUE" = "$EXPECTED_RESULT" && let rc=0
		COUNTER=$(expr $COUNTER + 1)
	done
  echo
  cat ~/log.txt
  if test $rc -eq 0; then
    echo "===================== Query chaincode definition successful on ${CORE_PEER_ADDRESS} on channel '$CHANNEL_NAME' ===================== "
		echo
  else
    echo "############### After $MAX_RETRY attempts, Query chaincode definition result on ${CORE_PEER_ADDRESS} is INVALID ###############!"
    echo
    exit 1
  fi
	sleep 1
}

chaincodeInvokeInit() {
  parsePeerConnectionParameters
  res=$?
  verifyResult $res "Invoke transaction failed on channel '$CHANNEL_NAME' due to uneven number of peer and org parameters "

  # while 'peer chaincode' command can get the orderer endpoint from the
  # peer (if join was successful), let's supply it directly as we know
  # it using the "-o" option
  set -x
	if [ "$CC_INIT_FCN" = "" ]; then
		fcn_call='{"Args":['${CC_INIT_ARGS}']}'
	else
		fcn_call='{"function":"'${CC_INIT_FCN}'","Args":['${CC_INIT_ARGS}']}'
	fi

  echo invoke fcn call:${fcn_call}
  peer chaincode invoke -o ${ORDERER_URL} --ordererTLSHostnameOverride ${ORDERER_NAME} --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n ${CC_NAME} $PEER_CONN_PARAMS --isInit -c ${fcn_call} >&~/log.txt
  res=$?
  set +x
  cat ~/log.txt
  verifyResult $res "Invoke execution on PEERS failed "
  echo "===================== Invoke transaction successful on PEERS on channel '$CHANNEL_NAME' ===================== "
  echo
	sleep 1
}

CC_PKG_FILE=${CC_NAME}.tar.gz

## query whether the chaincode is installed
queryInstalled ${ORG}

## approve the definition
for org in $ORG_LIST; do
  approveForMyOrg ${org}
done

TMP_PARAMS=""
for org in $ORGMSPS; do
  TMP_PARAMS=$TMP_PARAMS" \""$org"\": true"
done
echo 'PARAMS..'${TMP_PARAMS}
for org in $ORG_LIST; do
  checkCommitReadiness ${org} ${TMP_PARAMS}
done

## commit the definition
commitChaincodeDefinition

## query on all orgs to see that the definition committed successfully
for org in $ORG_LIST; do
  queryCommitted ${org}
done

## Invoke the chaincode - this does require that the chaincode have the 'initLedger'
## method defined
if [ "$CC_INIT_FCN" = "NA" ]; then
	echo "===================== Chaincode initialization is not required ===================== "
	echo
else
	chaincodeInvokeInit
fi

exit 0
