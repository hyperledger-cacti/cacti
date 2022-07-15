FROM cactus-cmd-socketio-server:latest

ARG NPM_PKG_VERSION=latest

ENV APP_HOME=/root/cactus

WORKDIR ${APP_HOME}

# Required by indy-sdk
RUN apt-get update \
    && apt-get install -y libsodium23 \
        libssl1.1 \
        libzmq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy indy sdk lib from base ubuntu image
# Note - indy_sdk:latest  must be ABI compatible with this image OS
COPY --from=indy-sdk-cli:latest /usr/lib/libindy.so /usr/lib/

COPY ./package.json ./dist/yarn.lock ./dist/fabric-connector.crt ./dist/ethereum-connector.crt ./dist/indy-connector.crt ./
RUN yarn add "${CACTUS_CMD_SOCKETIO_PATH}" "@hyperledger/cactus-verifier-client@${NPM_PKG_VERSION}" \
        --production --ignore-engines --non-interactive --cache-folder ./.yarnCache && \
    rm -rf ./.yarnCache

COPY ./dist ./dist/

CMD ["node", "./dist/www.js"]
