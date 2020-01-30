#!/usr/bin/env bash

cd $(dirname $0)/../examples/simple-asset-transfer/

npm run fed:quorum:down
npm run fed:fabric:down
npm run fabric:down
npm run quorum:down
npm run quorum:api:down

rm -rf fabric/api/node_modules
rm -rf quorum/api/node_modules
rm -rf node_modules
