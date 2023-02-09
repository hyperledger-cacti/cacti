#!/bin/bash


CHANNEL_NAME="$1"
DELAY="$2"
MAX_RETRY="$3"
VERBOSE="$4"
NW_PATH="$5"
ORDERER_PORT="$6"
PEER_ORG1_PORT="$7"
PEER_ORG2_PORT="$8"
NW_NAME="$9"
PROFILE="${10}"

: ${CHANNEL_NAME:="mychannel"}
: ${DELAY:="3"}
: ${MAX_RETRY:="5"}
: ${VERBOSE:="false"}

# import utils
. scripts/envVar.sh $NW_PATH $PEER_ORG1_PORT $NW_NAME


if [ ! -d "$NW_PATH/channel-artifacts" ]; then
    echo "Creating channel-artifacts at $NW_PATH"
    mkdir $NW_PATH/channel-artifacts
fi

createChannelTx() {
    CHANNEL_PROFILE=$1
    echo "Generating channel-artifacts at : $NW_PATH/channel-artifacts: $CHANNEL_PROFILE"
    set -x
    configtxgen -profile $CHANNEL_PROFILE -outputCreateChannelTx $NW_PATH/channel-artifacts/${CHANNEL_NAME}.tx -channelID $CHANNEL_NAME
    res=$?
    set +x
    if [ $res -ne 0 ]; then
        echo "Failed to generate channel configuration transaction..."
        exit 1
    fi
    echo

}

createAnchorPeerTx() {
    ORGMSPS=$1
    CHANNEL_PROFILE=$2
    for orgmsp in $ORGMSPS ; do
        echo "#######    Generating anchor peer update for ${orgmsp}  ##########"
        set -x
        configtxgen -profile $CHANNEL_PROFILE -outputAnchorPeersUpdate $NW_PATH/channel-artifacts/${orgmsp}anchors.tx -channelID $CHANNEL_NAME -asOrg ${orgmsp}
        res=$?
        set +x
        if [ $res -ne 0 ]; then
            echo "Failed to generate anchor peer update for ${orgmsp}..."
            exit 1
        fi
    echo
    done
}

createChannel() {
    setGlobals 1 $PEER_ORG1_PORT $NW_NAME
    # Poll in case the raft leader is not set yet
    echo "Create channel NW_NAME = ${NW_NAME}   ORDERER_CA = $ORDERER_CA"
    local rc=1
    local COUNTER=1
    while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
        sleep $DELAY
        set -x
        peer channel create -o localhost:$ORDERER_PORT -c $CHANNEL_NAME --ordererTLSHostnameOverride orderer.${NW_NAME}.com -f $NW_PATH/channel-artifacts/${CHANNEL_NAME}.tx --outputBlock $NW_PATH/channel-artifacts/${CHANNEL_NAME}.block --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA >&log.txt
        res=$?
        set +x
        let rc=$res
        COUNTER=$(expr $COUNTER + 1)
    done
    cat log.txt
    verifyResult $res "Channel creation failed"
    echo
    echo "===================== Channel '$CHANNEL_NAME' created ===================== "
    echo
}

# queryCommitted ORG
joinChannel() {
    ORG=$1
    PEER_PORT=$2
    setGlobals $ORG $PEER_PORT $NW_NAME
    local rc=1
    local COUNTER=1
    ## Sometimes Join takes time, hence retry
    while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
        sleep $DELAY
        set -x
        peer channel join -b $NW_PATH/channel-artifacts/$CHANNEL_NAME.block >&log.txt
        res=$?
        set +x
        let rc=$res
        COUNTER=$(expr $COUNTER + 1)
    done
    cat log.txt
    echo
    verifyResult $res "After $MAX_RETRY attempts, peer0.org${ORG} has failed to join channel '$CHANNEL_NAME' "
}

updateAnchorPeers() {
    ORG=$1
    PEER_PORT=$2
    setGlobals $ORG $PEER_PORT $NW_NAME
    local rc=1
    local COUNTER=1
    ## Sometimes Join takes time, hence retry
    while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
        sleep $DELAY
        set -x
        peer channel update -o localhost:$ORDERER_PORT --ordererTLSHostnameOverride orderer.${NW_NAME}.com -c $CHANNEL_NAME -f $NW_PATH/channel-artifacts/${CORE_PEER_LOCALMSPID}anchors.tx --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA >&log.txt
        res=$?
        set +x
        let rc=$res
        COUNTER=$(expr $COUNTER + 1)
    done
    cat log.txt
    verifyResult $res "Anchor peer update failed"
    echo "===================== Anchor peers updated for org '$CORE_PEER_LOCALMSPID' on channel '$CHANNEL_NAME' ===================== "
    sleep $DELAY
    echo
}

verifyResult() {
    if [ $1 -ne 0 ]; then
        echo "!!!!!!!!!!!!!!! "$2" !!!!!!!!!!!!!!!!"
        echo
        exit 1
    fi
}

FABRIC_CFG_PATH=$NW_PATH/configtx
echo "Fabric Config path :"$FABRIC_CFG_PATH

## Create channeltx
echo "### Generating channel configuration transaction '${CHANNEL_NAME}.tx' ###"
if [ "$PROFILE" = "2-nodes" ]; then
    createChannelTx "TwoOrgsChannel"
else
    createChannelTx "OneOrgChannel"
fi 

## Create anchorpeertx
echo "### Generating channel configuration transaction '${CHANNEL_NAME}.tx' ###"
if [ "$PROFILE" = "2-nodes" ]; then
    createAnchorPeerTx "Org1MSP Org2MSP" "TwoOrgsChannel"
else
    createAnchorPeerTx "Org1MSP" "OneOrgChannel"
fi

FABRIC_CFG_PATH=$NW_PATH/config/
echo "Fabric Config path for channel creation: "$FABRIC_CFG_PATH

## Create channel
echo "Creating channel "$CHANNEL_NAME
createChannel

## Join all the peers to the channel
echo "Join Org1 peers to the channel ..."
joinChannel 1 $PEER_ORG1_PORT
if [ "$PROFILE" = "2-nodes" ]; then
    echo "Join Org2 peers to the channel..."
    joinChannel 2 $PEER_ORG2_PORT
fi

## Set the anchor peers for each org in the channel
echo "Updating anchor peers for org1."
updateAnchorPeers 1 $PEER_ORG1_PORT
if [ "$PROFILE" = "2-nodes" ]; then
    echo "Updating anchor peers for org2..."
    updateAnchorPeers 2 $PEER_ORG2_PORT
fi

echo "========= Channel successfully joined =========== "

exit 0
