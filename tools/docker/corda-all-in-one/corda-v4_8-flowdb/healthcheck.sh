#!/bin/bash

set -e

if [ "$PARTY_A_WEB_SRV_ENABLED" = "true" ]
then
  curl -vv -i -X OPTIONS http://127.0.0.1:10009/web/iou/
fi

if [ "$PARTY_B_WEB_SRV_ENABLED" = "true" ]
then
  curl -vv -i -X OPTIONS http://127.0.0.1:10012/web/iou/
fi

if [ "$PARTY_C_WEB_SRV_ENABLED" = "true" ]
then
  curl -vv -i -X OPTIONS http://127.0.0.1:10015/web/iou/
fi


if [ "$PARTY_A_NODE_ENABLED" = "true" ]
then
  curl -v 'http://localhost:7005/jolokia/exec/org.apache.activemq.artemis:address=%22rpc.server%22,broker=%22RPC%22,component=addresses,queue=%22rpc.server%22,routing-type=%22multicast%22,subcomponent=queues/countMessages()/'
fi

if [ "$PARTY_B_NODE_ENABLED" = "true" ]
then
  curl -v 'http://localhost:7006/jolokia/exec/org.apache.activemq.artemis:address=%22rpc.server%22,broker=%22RPC%22,component=addresses,queue=%22rpc.server%22,routing-type=%22multicast%22,subcomponent=queues/countMessages()/'
fi

if [ "$PARTY_C_NODE_ENABLED" = "true" ]
then
  curl -v 'http://localhost:7007/jolokia/exec/org.apache.activemq.artemis:address=%22rpc.server%22,broker=%22RPC%22,component=addresses,queue=%22rpc.server%22,routing-type=%22multicast%22,subcomponent=queues/countMessages()/'
fi