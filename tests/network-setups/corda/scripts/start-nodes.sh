#!/bin/bash

directory=$(dirname $0)
simpleAppVersion="0.4"
weaverVersion="1.2.4-alpha.5"

parties="Notary PartyA PartyB PartyC"

for party in ${parties}; do
  cp $directory/../shared/artifacts/contracts-kotlin-$simpleAppVersion.jar build/nodes/${party}/cordapps
  cp $directory/../shared/artifacts/workflows-kotlin-$simpleAppVersion.jar build/nodes/${party}/cordapps
  
  cp $directory/../shared/artifacts/interop-contracts-$weaverVersion.jar build/nodes/${party}/cordapps
  cp $directory/../shared/artifacts/interop-workflows-$weaverVersion.jar build/nodes/${party}/cordapps
  
  cp $directory/../shared/artifacts/protos-java-kt-$weaverVersion.jar build/nodes/${party}/cordapps
done;

docker-compose up -d
docker ps -a
#docker logs corda_partya_1 -f
