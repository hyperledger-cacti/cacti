FROM docker:20.10.21-dind

ENV APP_ROOT="/app"
ENV FREEZE_TMP_DIR="/opt/docker-freeze"
ENV IROHA_VERSION="dev-nightly-75da907f66d5270f407a50e06bc76cec41d3d409"
ENV IROHA_CLI_VERSION="dev-nightly-75da907f66d5270f407a50e06bc76cec41d3d409"

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
    curl \
    bash \
  && pip install wheel \
  && pip install docker-compose

# Copy iroha_client_cli proxy script
COPY ./iroha_client_cli.sh /bin/iroha_client_cli
RUN chmod +x /bin/iroha_client_cli

# Setup healtcheck
COPY ./healthcheck.sh /bin/healthcheck
RUN chmod +x /bin/healthcheck
HEALTHCHECK --interval=5s --timeout=10s --start-period=45s --retries=60 CMD /bin/healthcheck

# Freeze docker images
COPY ./freeze-images.sh /usr/bin/freeze-images.sh
RUN bash /usr/bin/freeze-images.sh

WORKDIR ${APP_ROOT}

# Copy Iroha 2 test network sources
COPY ./src .

# Peer0 API
EXPOSE 8080
# Peer0 telemetry
EXPOSE 8180

# Setup supervisor entrypoint
COPY ./run-iroha-ledger.sh ./run-iroha-ledger.sh
COPY supervisord.conf /etc/supervisord.conf
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]
