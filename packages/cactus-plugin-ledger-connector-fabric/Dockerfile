FROM ghcr.io/hyperledger/cactus-cmd-api-server:2023-12-21-f8f6bcb

RUN npm install -g yarn@1.22.17

ARG NPM_PKG_VERSION=latest

RUN yarn add @hyperledger/cactus-plugin-ledger-connector-fabric@${NPM_PKG_VERSION} --production --ignore-engines
