FROM cactus-api-server:latest

ENV NODE_ENV=production
ARG NPM_PKG_VERSION=latest

RUN yarn add @hyperledger/cactus-plugin-ledger-connector-besu@${NPM_PKG_VERSION} --production
