#!/bin/bash
###
### Continous Integration Shell Script
###
### This is designed to be the equivalent of what's in .travis.yml, but aimed at executing
###

set -euxo pipefail

docker --version
docker-compose --version
node --version
npm --version
java -version
npm install
npm run test
cd examples/simple-asset-transfer
npm install
rm -rf ./node_modules/websocket/.git/
rm -rf fabric/api/fabric-client-kv-org*
cd ./fabric/api/
rm -rf ./node_modules/websocket/.git/
npm install
cd ../../
npm run fabric:down
npm run fabric
cd ./quorum/api/
rm -rf ./node_modules/websocket/.git/
npm install
cd ../../
npm run quorum:down
npm run quorum
npm run fed:build
npm run fed:quorum
docker images
while docker ps | grep "starting\|unhealthy"; do sleep 15; echo; date; done
docker ps -a
npm run fabric:down
npm run quorum:down
cd ../..
#  - npm run test:bc - TODO: fix it, broken now
