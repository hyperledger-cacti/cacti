FROM docker:24.0.5-dind

ENV APP_ROOT="/app"

RUN apk update \
  && apk add --no-cache \
  docker-cli \
  docker-cli-compose \
  gcc \
  libc-dev \
  rust \
  cargo \
  make \
  supervisor

WORKDIR ${APP_ROOT}

# Copy sawtooth docker-compose
COPY ./sawtooth-default.yaml ./docker-compose.yaml

# Copy sawtooth shell helper
COPY ./shell.sh /bin/shell
RUN chmod +x /bin/shell

# Setup healtcheck
COPY ./healthcheck.sh /bin/healthcheck
RUN chmod +x /bin/healthcheck
HEALTHCHECK --interval=5s --timeout=5s --start-period=30s --retries=60 CMD /bin/healthcheck

# Expose ledger ports
EXPOSE 8008

# Setup supervisor entrypoint
COPY supervisord.conf /etc/supervisord.conf
COPY ./run-sawtooth-ledger.sh ./run-sawtooth-ledger.sh
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]
