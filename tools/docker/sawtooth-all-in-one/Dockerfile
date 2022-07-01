FROM docker:20.10.17-dind

# Install docker-compose and it's dependencies
RUN apk update \
  && apk add --no-cache \
    py-pip \
    python3-dev \
    libffi-dev \
    openssl-dev \
    gcc \
    libc-dev \
    rust \
    cargo \
    make \
    supervisor \
  && pip install wheel \
  && pip install docker-compose

# Copy sawtooth docker-compose
COPY ./sawtooth-default.yaml /app/docker-compose.yaml

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
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]
