#!/bin/bash
set -e

#/root/bin/corda-cli/bin/corda-cli network status -n solar-system

curl -u martian:password --insecure https://localhost:12116/api/v1/nodestatus/getnetworkreadinessstatus
curl -u earthling:password --insecure https://localhost:12112/api/v1/nodestatus/getnetworkreadinessstatus
curl -u plutonian:password --insecure https://localhost:12119/api/v1/nodestatus/getnetworkreadinessstatus
