#!/bin/sh
set -e

/bootstrap.sh ${FABRIC_VERSION} ${CA_VERSION} -b -s
cd /fabric-samples/fabcar/
./startFabric.sh
