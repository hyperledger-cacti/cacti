FROM docker:20.10.17-dind

ENV APP_ROOT="/app"

# Install docker-compose
RUN apk update \
  && apk add --no-cache \
    # docker-compose dependencies
    py-pip \
    python3-dev \
    libffi-dev \
    openssl-dev \
    # Other dependencies
    supervisor \
    jq \
  && pip install wheel \
  && pip install docker-compose

# Copy iroha_client_cli proxy script
COPY ./iroha_client_cli.sh /bin/iroha_client_cli
RUN chmod +x /bin/iroha_client_cli

# Setup healtcheck
COPY ./healthcheck.sh /bin/healthcheck
RUN chmod +x /bin/healthcheck
HEALTHCHECK --interval=5s --timeout=5s --start-period=30s --retries=60 CMD /bin/healthcheck

WORKDIR ${APP_ROOT}

# Copy Iroha 2 test network sources
COPY ./src .

# Peer0 API
EXPOSE 8080
# Peer0 telemetry
EXPOSE 8180

ENV IROHA_VERSION="dev-nightly-75da907f66d5270f407a50e06bc76cec41d3d409"
ENV IROHA_CLI_VERSION="dev-nightly-75da907f66d5270f407a50e06bc76cec41d3d409"

# Setup supervisor entrypoint
COPY supervisord.conf /etc/supervisord.conf
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]
