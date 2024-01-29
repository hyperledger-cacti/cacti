FROM ghcr.io/hyperledger/cactus-cmd-api-server:2024-03-18-8ddc02d
RUN npm install -g yarn \
    && yarn set version 4.1.0 \
    && yarn config set nodeLinker node-modules

ENV NODE_ENV=production
ARG NPM_PKG_VERSION=latest

RUN yarn add @hyperledger/cactus-plugin-ledger-connector-besu@${NPM_PKG_VERSION} --exact
