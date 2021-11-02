#!/bin/bash

directory=$(dirname $0)
houseTokenAppversion="1.0"
weaverVersion="1.2.4-alpha.4"
tokenVersion="1.2"

parties="Notary PartyA PartyB PartyC"

for party in ${parties}; do
  cp $directory/../shared/artifacts/contracts-$houseTokenAppversion.jar build/nodes/${party}/cordapps
  cp $directory/../shared/artifacts/workflows-$houseTokenAppversion.jar build/nodes/${party}/cordapps
  
  cp $directory/../shared/artifacts/tokens-contracts-$tokenVersion.jar build/nodes/${party}/cordapps
  cp $directory/../shared/artifacts/tokens-workflows-$tokenVersion.jar build/nodes/${party}/cordapps
  cp $directory/../shared/artifacts/ci-workflows-1.0.jar build/nodes/${party}/cordapps
  
  cp $directory/../shared/artifacts/interop-contracts-$weaverVersion.jar build/nodes/${party}/cordapps
  cp $directory/../shared/artifacts/interop-workflows-$weaverVersion.jar build/nodes/${party}/cordapps
  
  cp $directory/../shared/artifacts/protos-java-kt-$weaverVersion.jar build/nodes/${party}/cordapps
done;


docker-compose up -d
docker ps -a
#docker logs corda_partya_1 -f
