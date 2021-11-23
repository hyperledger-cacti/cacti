#!/bin/bash

UDS_WAIT=10
for i in $(seq 1 100)
do
  set -e
  if [ -S ${PRIVATE_CONFIG} ] && \
    [ "I'm up!" == "$(wget --timeout ${UDS_WAIT} -qO- --proxy off localhost:9000/upcheck)" ];
  then break
  else
    echo "Sleep ${UDS_WAIT} seconds. Waiting for TxManager."
    sleep ${UDS_WAIT}
  fi
done
DDIR=/qdata/dd
rm -rf ${DDIR}
mkdir -p ${DDIR}/keystore
mkdir -p ${DDIR}/geth
cp /nodekey ${DDIR}/geth/nodekey
cp /key ${DDIR}/keystore/
cat /permissioned-nodes.json | sed 's/^\(.*\)@.*\?\(.*\)raftport=5040\([0-9]\)\(.*\)$/\1@127.0.0.1\3:21000?discport=0\&raftport=50400\4/g' > ${DDIR}/static-nodes.json
cp ${DDIR}/static-nodes.json ${DDIR}/permissioned-nodes.json
cat ${DDIR}/static-nodes.json
GENESIS_FILE="/genesis.json"
NETWORK_ID=$(cat ${GENESIS_FILE} | grep chainId | awk -F " " '{print $2}' | awk -F "," '{print $1}')
GETH_ARGS_raft="--raft --raftport 50400"
geth --datadir ${DDIR} init ${GENESIS_FILE}
geth \
  --identity node${NODE_ID}-${QUORUM_CONSENSUS:-raft} \
  --datadir ${DDIR} \
  --permissioned \
  --nodiscover \
  --verbosity 2 \
  --networkid ${NETWORK_ID} \
  --rpc \
  --rpccorsdomain "*" \
  --rpcvhosts "*" \
  --rpcaddr 0.0.0.0 \
  --rpcport 8545 \
  --rpcapi admin,db,eth,debug,miner,net,shh,txpool,personal,web3,quorum,${QUORUM_CONSENSUS:-raft} \
  --port 21000 \
  --allow-insecure-unlock \
  --unlock 0 \
  --password /passwords.txt \
  ${QUORUM_GETH_ARGS:-} ${GETH_ARGS_raft}