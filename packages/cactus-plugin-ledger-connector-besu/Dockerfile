FROM ghcr.io/hyperledger/cactus-cmd-api-server:2022-05-12-2330a96
RUN npm install -g yarn@1.22.17

ENV NODE_ENV=production
ARG NPM_PKG_VERSION=latest

RUN yarn add @hyperledger/cactus-plugin-ledger-connector-besu@${NPM_PKG_VERSION} --production --ignore-engines
