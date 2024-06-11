FROM ghcr.io/hyperledger/cactus-cmd-api-server:2024-03-18-8ddc02d

ARG NPM_PKG_VERSION=latest

RUN npm i @hyperledger/cactus-plugin-ledger-connector-quorum@${NPM_PKG_VERSION} --production
