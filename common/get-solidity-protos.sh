#!/bin/bash

WEAVER_ROOT=${1:-".."}

BESU_PROTOSDIR=${WEAVER_ROOT}/common/besu-protos
PROTOS_SOLIDITY_DIR=${WEAVER_ROOT}/common/protos-solidity
# check if local fabric-protos dir exists
if [ ! -d "${BESU_PROTOSDIR}" ]
then 
    echo "Local BESU-protos directory doesn't exist, cloning..."
    (git clone https://github.com/celestiaorg/protobuf3-solidity.git ${BESU_PROTOSDIR} && cd ${BESU_PROTOSDIR} && make)
fi
cp ${WEAVER_ROOT}/common/protos/common/asset_locks.proto ${PROTOS_SOLIDITY_DIR}/common/asset_locks.proto
sed -i '3d' ${PROTOS_SOLIDITY_DIR}/common/asset_locks.proto

protoc --plugin ${BESU_PROTOSDIR}/bin/protoc-gen-sol --sol_out ${PROTOS_SOLIDITY_DIR} --proto_path ${PROTOS_SOLIDITY_DIR}/common/ asset_locks.proto