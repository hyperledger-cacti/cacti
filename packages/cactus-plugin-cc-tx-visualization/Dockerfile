FROM ghcr.io/hyperledger/cactus-cmd-api-server:2021-08-15--refactor-1222

RUN npm install -g yarn@1.22.17

ENV NODE_ENV=production
ARG NPM_PKG_VERSION=latest

RUN yarn add @hyperledger/cactus-plugin-cc-tx-visualization@${NPM_PKG_VERSION} --production --ignore-engines