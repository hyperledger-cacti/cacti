FROM ghcr.io/hyperledger/cactus-cmd-api-server:2024-01-02-1fb2551

RUN npm install -g yarn \
    && yarn set version 3.6.3 \
    && yarn config set nodeLinker node-modules

ENV NODE_ENV=production
ARG NPM_PKG_VERSION=latest

RUN yarn add @hyperledger/cactus-plugin-ledger-connector-polkadot@${NPM_PKG_VERSION}