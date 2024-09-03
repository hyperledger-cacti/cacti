#!/bin/bash
function main()
{
  echo "Sleeping to let dockerd spin up"
  sleep 10

  docker pull ghcr.io/hyperledger/cactus-besu-all-in-one:2021-01-08-7a055c3
  docker pull ghcr.io/hyperledger/cactus-fabric-all-in-one:v1.0.0-rc.2
  docker pull ipfs/go-ipfs:v0.8.0

  /root/.nvm/versions/node/v16.8.0/bin/node -r ts-node/register /usr/src/app/cactus/examples/cactus-example-cbdc-bridging-backend/dist/lib/main/typescript/cbdc-bridging-app-cli.js
}

main
