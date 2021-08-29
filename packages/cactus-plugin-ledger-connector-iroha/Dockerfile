FROM ghcr.io/hyperledger/cactus-cmd-api-server:2021-08-15--refactor-1222

ARG NPM_PKG_VERSION=latest

RUN npm i @hyperledger/cactus-plugin-ledger-connector-iroha@${NPM_PKG_VERSION} --production
