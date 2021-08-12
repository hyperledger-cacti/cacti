#!/bin/bash

directory=$(dirname $0)
simpleAppVersion="0.4"
weaverVersion="1.2.3"

cp $directory/../artifacts/contracts-kotlin-$simpleAppVersion.jar build/nodes/Notary/cordapps
cp $directory/../artifacts/contracts-kotlin-$simpleAppVersion.jar build/nodes/PartyA/cordapps
cp $directory/../artifacts/workflows-kotlin-$simpleAppVersion.jar build/nodes/Notary/cordapps
cp $directory/../artifacts/workflows-kotlin-$simpleAppVersion.jar build/nodes/PartyA/cordapps

cp $directory/../artifacts/interop-contracts-$weaverVersion.jar build/nodes/Notary/cordapps
cp $directory/../artifacts/interop-contracts-$weaverVersion.jar build/nodes/PartyA/cordapps
cp $directory/../artifacts/interop-workflows-$weaverVersion.jar build/nodes/Notary/cordapps
cp $directory/../artifacts/interop-workflows-$weaverVersion.jar build/nodes/PartyA/cordapps

cp $directory/../artifacts/protos-java-kt-$weaverVersion.jar build/nodes/Notary/cordapps
cp $directory/../artifacts/protos-java-kt-$weaverVersion.jar build/nodes/PartyA/cordapps

docker-compose up -d
docker ps -a
docker logs corda_partya_1 -f
