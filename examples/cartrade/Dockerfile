FROM cactus-cmd-socketio-server:latest

ENV CARTRADE_HOME=/root/cactus

WORKDIR ${CARTRADE_HOME}

COPY ./dist/yarn.lock ./package.json ./run_docker.sh ./
RUN yarn link "@hyperledger/cactus-cmd-socket-server" && \
    yarn install --production --ignore-engines --non-interactive --cache-folder ./.yarnCache && \
    rm -rf ./.yarnCache

COPY ./run_docker.sh ./
COPY ./dist ./dist/

ENTRYPOINT ["bash", "run_docker.sh"]
