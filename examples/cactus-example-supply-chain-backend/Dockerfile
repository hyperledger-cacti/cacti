FROM cruizba/ubuntu-dind:jammy-24.0.7-compose-2.24.0 as runner

USER root
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt -y upgrade

# Need curl for healthchecks
# The file binary is used to inspect exectubles when debugging container image issues
RUN apt-get -y install --no-install-recommends -y \
    curl \
    file \
    ca-certificates \
    tzdata \
    git \
    jq \
    moreutils

ARG APP=/usr/src/app/

ENV TZ=Etc/UTC
ENV APP_USER=appuser

RUN useradd -m ${APP_USER} && \
    usermod -a -G ${APP_USER} ${APP_USER} && \
    mkdir -p ${APP}

RUN mkdir -p "${APP}/log/" && \
    chown -R $APP_USER:$APP_USER "${APP}/"

# TODO: Can we hack it together so that the whole thing works rootless?
USER ${APP_USER}
WORKDIR ${APP}

COPY --chown=${APP_USER}:${APP_USER} /.yarn/patches/@ionic-native-* /usr/src/app/.yarn/patches/

# COPY --chown=${APP_USER}:${APP_USER} examples/cactus-example-supply-chain-backend/tpl.package.json /usr/src/app/package.json

# RUN touch /usr/src/app/package.json

SHELL ["/bin/bash", "--login", "-i", "-c"]
# Installing NodeJS via Node Version Manager (nvm)
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
ARG NPM_PKG_VERSION="latest"
RUN source ~/.bashrc && \
    nvm install 18.18.2 && \
    npm i -g corepack && corepack enable && corepack prepare yarn@4.3.1 --activate && \
    yarn init --yes --private && \
    yarn config set nodeLinker node-modules && \
    yarn add @hyperledger/cactus-example-supply-chain-backend@${NPM_PKG_VERSION} --exact && \
    yarn add ethers@6.8.1 --exact && \
    cat /usr/src/app/package.json | jq --arg NPM_PKG_VERSION ${NPM_PKG_VERSION} '.resolutions += { "@hyperledger/cactus-test-tooling": "\($NPM_PKG_VERSION)" }' | sponge /usr/src/app/package.json && \ 
    cat /usr/src/app/package.json | jq --arg NPM_PKG_VERSION ${NPM_PKG_VERSION} '.resolutions += { "@hyperledger/cactus-api-client": "\($NPM_PKG_VERSION)" } ' | sponge /usr/src/app/package.json && \
    cat /usr/src/app/package.json | jq --arg NPM_PKG_VERSION ${NPM_PKG_VERSION} '.resolutions += { "@hyperledger/cactus-cmd-api-server": "\($NPM_PKG_VERSION)" } ' | sponge /usr/src/app/package.json && \
    cat /usr/src/app/package.json | jq --arg NPM_PKG_VERSION ${NPM_PKG_VERSION} '.resolutions += { "@hyperledger/cactus-common": "\($NPM_PKG_VERSION)" } ' | sponge /usr/src/app/package.json && \
    cat /usr/src/app/package.json | jq --arg NPM_PKG_VERSION ${NPM_PKG_VERSION} '.resolutions += { "@hyperledger/cactus-core": "\($NPM_PKG_VERSION)" } ' | sponge /usr/src/app/package.json && \
    cat /usr/src/app/package.json | jq --arg NPM_PKG_VERSION ${NPM_PKG_VERSION} '.resolutions += { "@hyperledger/cactus-core-api": "\($NPM_PKG_VERSION)" } ' | sponge /usr/src/app/package.json && \
    cat /usr/src/app/package.json | jq --arg NPM_PKG_VERSION ${NPM_PKG_VERSION} '.resolutions += { "@hyperledger/cactus-example-supply-chain-business-logic-plugin": "\($NPM_PKG_VERSION)" } ' | sponge /usr/src/app/package.json && \
    cat /usr/src/app/package.json | jq --arg NPM_PKG_VERSION ${NPM_PKG_VERSION} '.resolutions += { "@hyperledger/cactus-example-supply-chain-frontend": "\($NPM_PKG_VERSION)" } ' | sponge /usr/src/app/package.json && \
    cat /usr/src/app/package.json | jq --arg NPM_PKG_VERSION ${NPM_PKG_VERSION} '.resolutions += { "@hyperledger/cactus-plugin-consortium-manual": "\($NPM_PKG_VERSION)" } ' | sponge /usr/src/app/package.json && \
    cat /usr/src/app/package.json | jq --arg NPM_PKG_VERSION ${NPM_PKG_VERSION} '.resolutions += { "@hyperledger/cactus-plugin-keychain-memory": "\($NPM_PKG_VERSION)" } ' | sponge /usr/src/app/package.json && \
    cat /usr/src/app/package.json | jq --arg NPM_PKG_VERSION ${NPM_PKG_VERSION} '.resolutions += { "@hyperledger/cactus-plugin-ledger-connector-besu": "\($NPM_PKG_VERSION)" } ' | sponge /usr/src/app/package.json && \
    cat /usr/src/app/package.json | jq --arg NPM_PKG_VERSION ${NPM_PKG_VERSION} '.resolutions += { "@hyperledger/cactus-plugin-ledger-connector-fabric": "\($NPM_PKG_VERSION)" } ' | sponge /usr/src/app/package.json && \
    cat /usr/src/app/package.json | jq --arg NPM_PKG_VERSION ${NPM_PKG_VERSION} '.resolutions += { "@hyperledger/cactus-plugin-ledger-connector-xdai": "\($NPM_PKG_VERSION)" } ' | sponge /usr/src/app/package.json && \
    yarn install

SHELL ["/bin/bash", "--login", "-c"]


COPY --chown=${APP_USER}:${APP_USER} ./examples/cactus-example-supply-chain-backend/healthcheck.sh /

ENV AUTHORIZATION_CONFIG_JSON="{}"
ENV AUTHORIZATION_PROTOCOL=NONE
ENV COCKPIT_WWW_ROOT=/usr/src/app/node_modules/@hyperledger/cactus-example-supply-chain-frontend/www/
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
ENV GRPC_TLS_ENABLED=false
ENV LOG_LEVEL=TRACE

COPY examples/cactus-example-supply-chain-backend/supervisord.conf /etc/supervisord.conf

# supervisord web ui/dashboard
EXPOSE 9001
# API #1
EXPOSE 4000
# API #2
EXPOSE 4100
# GUI #1
EXPOSE 3000
# GUI #2
EXPOSE 3100
# API #3
EXPOSE 4200
# GUI #3
EXPOSE 3200

USER root

# Extend the parent image's entrypoint
# https://superuser.com/questions/1459466/can-i-add-an-additional-docker-entrypoint-script
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]
HEALTHCHECK --interval=1s --timeout=5s --start-period=20s --retries=250 \
    CMD /usr/src/app/examples/cactus-example-supply-chain-backend/healthcheck.sh
