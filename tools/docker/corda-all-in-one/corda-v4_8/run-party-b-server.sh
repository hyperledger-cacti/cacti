#!/bin/sh
set -e

if [ "$PARTY_B_WEB_SRV_ENABLED" = "true" ]
then
  ./gradlew runPartyBServer
else
  sleep infinity
fi
