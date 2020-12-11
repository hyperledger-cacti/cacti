#!/bin/sh
set -e

# TODO: make the verion numbers here injectable to the script
/bootstrap.sh 1.4.8 1.4.8 -b -s
cd /fabric-samples/fabcar/
./startFabric.sh
