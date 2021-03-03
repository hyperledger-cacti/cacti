#!/bin/sh
set -e

if [ "$PARTY_A_NODE_ENABLED" != "true" ]
then
  rm -rf ./build/nodes/ParticipantA*
fi

if [ "$PARTY_B_NODE_ENABLED" != "true" ]
then
  rm -rf ./build/nodes/ParticipantB*
fi

if [ "$PARTY_C_NODE_ENABLED" != "true" ]
then
  rm -rf ./build/nodes/ParticipantC*
fi

./build/nodes/runnodes
