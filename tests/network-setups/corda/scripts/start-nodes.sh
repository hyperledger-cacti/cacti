#!/bin/bash

directory=$(dirname $0)
simpleAppVersion="0.4"
interopAppVersion="1.2.0"

cp $directory/../artifacts/contracts-kotlin-$simpleAppVersion.jar build/nodes/Notary/cordapps
cp $directory/../artifacts/contracts-kotlin-$simpleAppVersion.jar build/nodes/PartyA/cordapps
cp $directory/../artifacts/workflows-kotlin-$simpleAppVersion.jar build/nodes/Notary/cordapps
cp $directory/../artifacts/workflows-kotlin-$simpleAppVersion.jar build/nodes/PartyA/cordapps

cp $directory/../artifacts/interop-contracts-$interopAppVersion.jar build/nodes/Notary/cordapps
cp $directory/../artifacts/interop-contracts-$interopAppVersion.jar build/nodes/PartyA/cordapps
cp $directory/../artifacts/interop-workflows-$interopAppVersion.jar build/nodes/Notary/cordapps
cp $directory/../artifacts/interop-workflows-$interopAppVersion.jar build/nodes/PartyA/cordapps

docker-compose up -d
docker ps -a
docker logs corda_partya_1 -f
