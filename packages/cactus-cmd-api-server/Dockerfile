FROM ubuntu:20.04

SHELL ["/bin/bash", "-c"]

ARG APP=/usr/src/app/
ENV APP_USER=appuser

# GUI: 3000, API: 4000, gRPC 5000
EXPOSE 3000 4000 5000

RUN groupadd --gid 1000 appuser \
  && useradd --uid 1000 --gid appuser --shell /bin/bash --create-home ${APP_USER}

RUN apt update && apt install -y curl

RUN mkdir -p "${APP}log/"
RUN chown -R $APP_USER:$APP_USER "${APP}log/"

WORKDIR ${APP}

COPY --chown=${APP_USER}:${APP_USER} ./packages/cactus-cmd-api-server/healthcheck.sh /
RUN chown -R $APP_USER:$APP_USER ${APP}

USER $APP_USER
ARG NPM_PKG_VERSION=latest

ENV TZ=Etc/UTC
ENV NODE_ENV=production

ENV CACTUS_NODE_ID=-
ENV CONSORTIUM_ID=-
ENV KEY_PAIR_PEM=-
ENV COCKPIT_WWW_ROOT=${APP}node_modules/@hyperledger/cactus-cockpit/www/
ENV COCKPIT_TLS_ENABLED=false
ENV COCKPIT_CORS_DOMAIN_CSV=\*
ENV COCKPIT_MTLS_ENABLED=false
ENV COCKPIT_TLS_CERT_PEM=-
ENV COCKPIT_TLS_KEY_PEM=-
ENV COCKPIT_TLS_CLIENT_CA_PEM=-
ENV COCKPIT_HOST=0.0.0.0
ENV COCKPIT_PORT=3000
ENV API_MTLS_ENABLED=false
ENV API_TLS_ENABLED=false
ENV API_CORS_DOMAIN_CSV=\*
ENV API_TLS_CERT_PEM=-
ENV API_TLS_CLIENT_CA_PEM=-
ENV API_TLS_KEY_PEM=-
ENV API_HOST=0.0.0.0
ENV API_PORT=4000
ENV LOG_LEVEL=INFO

ENV NVM_DIR /home/${APP_USER}/.nvm
ENV NODE_VERSION 16.3.0
ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# Install nvm with node and npm
RUN mkdir -p ${NVM_DIR}
RUN curl https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash \
  && source $NVM_DIR/nvm.sh \
  && nvm install $NODE_VERSION \
  && nvm alias default $NODE_VERSION \
  && nvm use default \
  && npm install -g npm@7.19.1

RUN npm install -g yarn@1.18.0
RUN yarn add @hyperledger/cactus-cmd-api-server@${NPM_PKG_VERSION} --production

COPY ./packages/cactus-cmd-api-server/docker-entrypoint.sh /usr/local/bin/
HEALTHCHECK --interval=5s --timeout=5s --start-period=1s --retries=30 CMD /healthcheck.sh
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node_modules/@hyperledger/cactus-cmd-api-server/dist/lib/main/typescript/cmd/cactus-api.js"]
