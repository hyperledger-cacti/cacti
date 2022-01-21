FROM node:14

ENV CACTUS_CMD_SOCKETIO_PATH=/opt/cactus-cmd-socketio-server
# Root dir must be src until cmd-socketio defines valid exports:
ENV CACTUS_CMD_SOCKETIO_BLP_PATH=${CACTUS_CMD_SOCKETIO_PATH}/src/main/typescript/business-logic-plugin/

WORKDIR ${CACTUS_CMD_SOCKETIO_PATH}

# CMake is required by one of npm dependencies (install other packages in this step as well in the future)
RUN apt-get update && apt-get install -y cmake && rm -rf /var/lib/apt/lists/*

COPY ./dist/yarn.lock ./package.json ./
RUN yarn install --production --ignore-engines --non-interactive --cache-folder ./.yarnCache && \
    rm -rf ./.yarnCache && \
    yarn link

COPY ./dist ./

EXPOSE 5034
VOLUME ["/etc/cactus/"]

