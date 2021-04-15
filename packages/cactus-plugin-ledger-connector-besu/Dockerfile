FROM cactus-api-server:latest

ARG NPM_PKG_VERSION=latest

COPY example-config.json ./
RUN npm i @hyperledger/cactus-plugin-ledger-connector-besu@${NPM_PKG_VERSION} --production