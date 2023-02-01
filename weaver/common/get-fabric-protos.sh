#!/bin/bash

WEAVER_ROOT=${1:-".."}

FABRIC_PROTOS_VERSION=${FABRIC_PROTOS_VERSION:-'2.1'}
FABRIC_PROTOSDIR=${WEAVER_ROOT}/common/fabric-protos

# check if local fabric-protos dir exists
if [ -d "${FABRIC_PROTOSDIR}" ]
then
    # if yes, cd into dir, git fetch and checkout specified tag
    echo "Updating local copy of fabric-protos directory"
    (cd ${FABRIC_PROTOSDIR} && git pull && git checkout release-${FABRIC_PROTOS_VERSION})
else
    # if not, clone repo and checkout specified tag
    echo "Local fabric-protos directory doesn't exist, cloning..."
    (git clone https://github.com/hyperledger/fabric-protos.git ${FABRIC_PROTOSDIR} && cd ${FABRIC_PROTOSDIR} && git checkout release-${FABRIC_PROTOS_VERSION})
fi

