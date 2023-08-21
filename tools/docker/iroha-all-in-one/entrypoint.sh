#!/usr/bin/env bash
set -e

if [ ! $ADMIN_PRIV = *" "* ] && [ -n "$ADMIN_PRIV" ]; then
    sed -i "1s/.*/$ADMIN_PRIV/" admin@test.priv
fi

if [ ! $ADMIN_PUB = *" "* ] && [ -n "$ADMIN_PUB" ]; then
    sed -i "1s/.*/$ADMIN_PUB/" admin@test.pub    
    jq --arg adminPub "${ADMIN_PUB}" \
    '.block_v1.payload.transactions[0].payload.reducedPayload.commands[8].createAccount.publicKey = $adminPub' \
    genesis.block|sponge genesis.block   
fi

if [ ! $NODE_PRIV = *" "* ] && [ -n "$NODE_PRIV" ]; then
    sed -i "1s/.*/$NODE_PRIV/" node0.priv 
fi

if [ ! $NODE_PUB = *" "* ] && [ -n "$NODE_PUB" ]; then
    sed -i "1s/.*/$NODE_PUB/" node0.pub 
    jq --arg nodePub "${NODE_PUB}" \
    '.block_v1.payload.transactions[0].payload.reducedPayload.commands[0].addPeer.peer.peerKey = $nodePub' \
    genesis.block|sponge genesis.block    
fi

# if first arg looks like a flag, assume we want to run irohad server
if [ "${1:0:1}" = '-' ]; then
  set -- irohad "$@"
fi

if [ "$1" = 'irohad' ]; then
  echo key=$KEY
  echo $PWD
  if [ -n "$IROHA_POSTGRES_HOST" ]; then
    echo "NOTE: IROHA_POSTGRES_HOST should match 'host' option in config file"
    PG_PORT=${IROHA_POSTGRES_PORT:-5432}
    /wait-for-it.sh -h $IROHA_POSTGRES_HOST -p $PG_PORT -t 30 -- true
  else
    echo "WARNING: IROHA_POSTGRES_HOST is not defined.
      Do not wait for Postgres to become ready. Iroha may fail to start up"
  fi
	exec "$@" --genesis_block genesis.block --keypair_name $KEY --verbosity=${IROHA_LOG_LEVEL}
fi

exec "$@"