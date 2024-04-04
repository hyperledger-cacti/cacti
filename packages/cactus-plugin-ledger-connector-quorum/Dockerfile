FROM ghcr.io/hyperledger/cactus-cmd-api-server:2022-08-05-7309f2a

ARG NPM_PKG_VERSION=latest

RUN npm i @hyperledger/cactus-plugin-ledger-connector-quorum@${NPM_PKG_VERSION} --production
