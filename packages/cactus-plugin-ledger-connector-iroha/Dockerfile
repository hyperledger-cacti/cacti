FROM ghcr.io/hyperledger/cactus-cmd-api-server:2022-11-14-6ff6aac
RUN npm install -g yarn@1.22.17

ENV NODE_ENV=production
ARG NPM_PKG_VERSION=latest

RUN yarn add @hyperledger/cactus-plugin-ledger-connector-iroha@${NPM_PKG_VERSION} --production --ignore-engines