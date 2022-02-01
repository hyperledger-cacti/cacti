#!/bin/bash

echo ${POOL_IP}

if [ ! -e '/var/lib/indy/sandbox/pool_transactions_genesis' ]; then
  generate_indy_pool_transactions --nodes 4 --clients 5 --nodeNum 1 2 3 4 --ips="${POOL_IP},${POOL_IP},${POOL_IP},${POOL_IP}"
fi

/usr/bin/supervisord
