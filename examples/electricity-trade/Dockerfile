FROM cactus-cmd-socketio-server:latest

ENV APP_HOME=/root/cactus

WORKDIR ${APP_HOME}

COPY ./dist/yarn.lock ./package.json ./
RUN yarn add "${CACTUS_CMD_SOCKETIO_PATH}" --production --ignore-engines --non-interactive --cache-folder ./.yarnCache && \
    rm -rf ./.yarnCache

COPY ./dist ./dist/

CMD ["node", "./dist/www.js"]
