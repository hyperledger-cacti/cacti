#!/bin/bash

directory=$(dirname $0)
simpleAppVersion="0.4"
weaverVersion="1.2.4-alpha.3"

cp $directory/../shared/artifacts/contracts-kotlin-$simpleAppVersion.jar build/nodes/Notary/cordapps
cp $directory/../shared/artifacts/contracts-kotlin-$simpleAppVersion.jar build/nodes/PartyA/cordapps
cp $directory/../shared/artifacts/contracts-kotlin-$simpleAppVersion.jar build/nodes/PartyB/cordapps
cp $directory/../shared/artifacts/workflows-kotlin-$simpleAppVersion.jar build/nodes/Notary/cordapps
cp $directory/../shared/artifacts/workflows-kotlin-$simpleAppVersion.jar build/nodes/PartyA/cordapps
cp $directory/../shared/artifacts/workflows-kotlin-$simpleAppVersion.jar build/nodes/PartyB/cordapps

cp $directory/../shared/artifacts/interop-contracts-$weaverVersion.jar build/nodes/Notary/cordapps
cp $directory/../shared/artifacts/interop-contracts-$weaverVersion.jar build/nodes/PartyA/cordapps
cp $directory/../shared/artifacts/interop-contracts-$weaverVersion.jar build/nodes/PartyB/cordapps
cp $directory/../shared/artifacts/interop-workflows-$weaverVersion.jar build/nodes/Notary/cordapps
cp $directory/../shared/artifacts/interop-workflows-$weaverVersion.jar build/nodes/PartyA/cordapps
cp $directory/../shared/artifacts/interop-workflows-$weaverVersion.jar build/nodes/PartyB/cordapps

cp $directory/../shared/artifacts/protos-java-kt-$weaverVersion.jar build/nodes/Notary/cordapps
cp $directory/../shared/artifacts/protos-java-kt-$weaverVersion.jar build/nodes/PartyA/cordapps
cp $directory/../shared/artifacts/protos-java-kt-$weaverVersion.jar build/nodes/PartyB/cordapps

docker-compose up -d
docker ps -a
#docker logs corda_partya_1 -f
