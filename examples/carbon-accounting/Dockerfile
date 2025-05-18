FROM cruizba/ubuntu-dind:20.10.18 as runner

USER root

RUN apt-get update
RUN apt -y upgrade

# Need curl for healthchecks
RUN apt-get -y install --no-install-recommends curl

# The file binary is used to inspect exectubles when debugging container image issues
RUN apt-get -y install --no-install-recommends file


RUN apt-get -y install --no-install-recommends ca-certificates
RUN apt-get -y install --no-install-recommends tzdata

ARG APP=/usr/src/app/

ENV TZ=Etc/UTC
ENV APP_USER=appuser

RUN useradd -m ${APP_USER}
RUN usermod -a -G ${APP_USER} ${APP_USER}
RUN mkdir -p ${APP}

RUN mkdir -p "${APP}/log/"
RUN chown -R $APP_USER:$APP_USER "${APP}/"

# TODO: Can we hack it together so that the whole thing works rootless?
USER ${APP_USER}
WORKDIR ${APP}

SHELL ["/bin/bash", "--login", "-i", "-c"]
# Installing Node Version Manager (nvm)
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
RUN source ~/.bashrc && \
    nvm install 20.11.1 && \
    npm install --location=global yarn && \
    yarn config set nodeLinker node-modules && \
    yarn set version 4.1.0 && \
    yarn add @hyperledger/cactus-example-carbon-accounting-backend@2.1.0
    
SHELL ["/bin/bash", "--login", "-c"]


COPY --chown=${APP_USER}:${APP_USER} ./examples/carbon-accounting/healthcheck.sh /

ENV AUTHORIZATION_CONFIG_JSON="{}"
ENV AUTHORIZATION_PROTOCOL=NONE
ENV COCKPIT_WWW_ROOT=/usr/src/app/node_modules/@hyperledger/cactus-example-carbon-accounting-frontend/www/
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

COPY examples/carbon-accounting/supervisord.conf /etc/supervisord.conf

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
    CMD /usr/src/app/examples/carbon-accounting/healthcheck.sh
