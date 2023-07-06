#!/bin/bash

curl -o geth-v22.7.4.tar.gz https://artifacts.consensys.net/public/go-quorum/raw/versions/v22.7.4/geth_v22.7.4_linux_amd64.tar.gz
tar xvfz geth-v22.7.4.tar.gz
mv geth /usr/local/bin

export PATH=$PATH:/usr/local/bin

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
  --http \
  --http.corsdomain "*" \
  --http.vhosts "*" \
  --http.addr 0.0.0.0 \
  --http.port 8545 \
  --ws \
  --wsaddr "0.0.0.0" \
  --wsport "8546" \
  --wsapi admin,db,eth,debug,miner,net,shh,txpool,personal,web3,quorum,${QUORUM_CONSENSUS:-raft} \
  --wsorigins "*" \
  --http.api admin,db,eth,debug,miner,net,shh,txpool,personal,web3,quorum,${QUORUM_CONSENSUS:-raft} \
  --port 21000 \
  --allow-insecure-unlock \
  --unlock 0 \
  --password /passwords.txt \
  ${QUORUM_GETH_ARGS:-} ${GETH_ARGS_raft}