FROM ghcr.io/chianetwork/chia-docker:latest
RUN npm install -g yarn@1.22.17

ENV NODE_ENV=production
ARG NPM_PKG_VERSION=latest

RUN yarn add @hyperledger/cactus-plugin-ledger-connector-chia@${NPM_PKG_VERSION} --production --ignore-engines
