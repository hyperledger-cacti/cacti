FROM cactus-cmd-socketio-server:latest

ENV CACTUS_CONNECTOR_FABRIC_PATH=/opt/cactus-plugin-ledger-connector-fabric-socketio

WORKDIR ${CACTUS_CONNECTOR_FABRIC_PATH}

COPY ./dist ./dist/
COPY ./dist/yarn.lock ./package.json ./
RUN yarn add "${CACTUS_CMD_SOCKETIO_PATH}" \
        --production --frozen-lockfile --ignore-engines --non-interactive --cache-folder ./.yarnCache && \
    rm -rf ./.yarnCache

EXPOSE 5040
VOLUME ["/etc/cactus/"]
CMD [ "npm", "run", "start" ]
