#!/bin/sh
set -e

if [ "$PARTY_A_WEB_SRV_ENABLED" = "true" ]
then
  ./gradlew runPartyAServer
else
  sleep infinity
fi
