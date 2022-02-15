FROM cactus-cmd-socketio-server:latest

ENV APP_HOME=/root/cactus

WORKDIR ${APP_HOME}

COPY ./dist/yarn.lock ./package.json ./
RUN yarn link "@hyperledger/cactus-cmd-socket-server" && \
    yarn install --production --ignore-engines --non-interactive --cache-folder ./.yarnCache && \
    rm -rf ./.yarnCache

COPY ./dist ./dist/

ENTRYPOINT ["node", "./dist/www.js"]
