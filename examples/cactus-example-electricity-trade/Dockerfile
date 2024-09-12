FROM cactus-common-example-server:latest

ARG NPM_PKG_VERSION=latest

ENV APP_HOME=/root/cactus

WORKDIR ${APP_HOME}

COPY ./dist/yarn.lock ./package.json ./
RUN yarn add "${CACTUS_CMD_SOCKETIO_PATH}" "@hyperledger/cactus-verifier-client@${NPM_PKG_VERSION}" \
  --production --ignore-engines --non-interactive --cache-folder ./.yarnCache && \
  rm -rf ./.yarnCache

COPY ./dist ./dist/

CMD ["node", "./dist/www.js"]
