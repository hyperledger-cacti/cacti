#!/bin/sh
set -e

if [ "$PARTY_C_WEB_SRV_ENABLED" = "true" ]
then
  ./gradlew runPartyCServer
else
  sleep infinity
fi
