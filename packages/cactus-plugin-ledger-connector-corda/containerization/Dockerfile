# FROM ghcr.io/hyperledger/cactus-cmd-api-server:v1.0.0-rc.3
# DOCKER_BUILDKIT=1 docker build --build-arg NPM_PKG_VERSION=1.0.0-main.334593a7.46 -f ./packages/cactus-cmd-api-server/Dockerfile . -t cas:1.0.0-main.334593a7.46
# DOCKER_BUILDKIT=1 docker build --build-arg NPM_PKG_VERSION=1.0.0 -f ./packages/cactus-cmd-api-server/Dockerfile . --tag cas:latest
FROM cas:latest

ENV NODE_ENV=production
ARG NPM_PKG_VERSION=latest

RUN yarn add @hyperledger/cactus-plugin-ledger-connector-corda@${NPM_PKG_VERSION} --production --ignore-engines

USER root
RUN apt install -y iputils-ping
USER $APP_USER
