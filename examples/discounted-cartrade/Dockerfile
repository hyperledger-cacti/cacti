FROM cactus-cmd-socketio-server:latest

ENV CARTRADE_HOME=/root/cactus

WORKDIR ${CARTRADE_HOME}

# Required by indy-sdk
RUN apt-get update \
    && apt-get install -y libsodium23 \
        libssl1.1 \
        libzmq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy indy sdk lib from base ubuntu image
# Note - indy_sdk:latest  must be ABI compatible with this image OS
COPY --from=indy-sdk-cli:latest /usr/lib/libindy.so /usr/lib/

COPY ./dist/yarn.lock ./package.json ./
RUN yarn link "@hyperledger/cactus-cmd-socket-server" && \
    yarn install --production --ignore-engines --non-interactive --cache-folder ./.yarnCache && \
    rm -rf ./.yarnCache

COPY ./dist ./dist/

ENTRYPOINT ["node", "./dist/www.js"]
