FROM node:12.20.1-alpine3.12

ARG NPM_PKG_VERSION=latest

RUN apk update
RUN apk add --no-cache tini

ARG APP=/usr/src/app/

ENV TZ=Etc/UTC
ENV APP_USER=appuser

RUN addgroup --system $APP_USER
RUN adduser --system $APP_USER -G $APP_USER
RUN mkdir -p ${APP}

RUN mkdir -p "${APP}/log/"
RUN chown -R $APP_USER:$APP_USER "${APP}/log/"

WORKDIR ${APP}

COPY --chown=${APP_USER}:${APP_USER} ./packages/cactus-cmd-api-server/healthcheck.sh /

RUN chown -R $APP_USER:$APP_USER ${APP}

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
ENV LOG_LEVEL=TRACE

# GUI: 3000, API: 4000
EXPOSE 3000 4000

USER $APP_USER

RUN npm i @hyperledger/cactus-cmd-api-server@${NPM_PKG_VERSION} --production

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "node_modules/@hyperledger/cactus-cmd-api-server/dist/lib/main/typescript/cmd/cactus-api.js"]
HEALTHCHECK --interval=5s --timeout=5s --start-period=1s --retries=30 CMD /healthcheck.sh
