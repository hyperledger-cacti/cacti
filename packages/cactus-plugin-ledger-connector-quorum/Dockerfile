FROM ghcr.io/hyperledger/cactus-cmd-api-server:v1.0.0

ARG NPM_PKG_VERSION=latest

RUN npm i @hyperledger/cactus-plugin-ledger-connector-quorum@${NPM_PKG_VERSION} --production
