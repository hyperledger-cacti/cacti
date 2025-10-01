#!/bin/bash
function main()
{
  echo "Sleeping to let dockerd spin up"
  sleep 10

  docker pull ghcr.io/hyperledger/cactus-besu-all-in-one:2024-06-09-cc2f9c5
  docker pull ghcr.io/hyperledger/cactus-fabric2-all-in-one:v1.0.0-rc.22024-03-03--issue-2945-fabric-v2-5-6

  /root/.nvm/versions/node/v18.18.2/bin/node -r ts-node/register /usr/src/app/cactus/examples/cactus-example-cbdc-bridging-backend/dist/lib/main/typescript/cbdc-bridging-app-cli.js
}

main
