################################
# STAGE 1
# Setup quorum-dev-quickstart
################################

FROM node:16 AS quorum-dev-quickstart-setup

ENV QUORUM_QUICKSTART_VERSION=0.0.53
ENV ROOT_DIR=/opt/quorum-dev-quickstart

WORKDIR "${ROOT_DIR}"
RUN npm install -g "quorum-dev-quickstart@${QUORUM_QUICKSTART_VERSION}"
RUN quorum-dev-quickstart --clientType goquorum --outputPath ./ --monitoring default --privacy true --orchestrate false

################################
# STAGE 2
# docker-compose base
################################

FROM docker:20.10.3-dind

ENV ROOT_DIR=/opt/quorum-dev-quickstart

# Install docker-compose and quorum-dev-quickstart setup dependencies
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
    bash \
    ncurses \
    supervisor \
  && pip install docker-compose

# Copy quorum-dev-quickstart from the base
COPY --from=quorum-dev-quickstart-setup "${ROOT_DIR}" "${ROOT_DIR}"
WORKDIR "${ROOT_DIR}"

COPY healthcheck.sh /healthcheck.sh
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=500 CMD /healthcheck.sh

COPY supervisord.conf /etc/supervisord.conf
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]

# Grafana
EXPOSE 3000

# RPC Node: HTTP, WebSocket Providers
EXPOSE 8545 8546

# supervisord web ui/dashboard
EXPOSE 9001

# Prometheus
EXPOSE 9090

# Quorum member 1: HTTP; WebSocket Providers; Tessera
EXPOSE 20000 20001 9081

# Quorum member 2: HTTP; WebSocket Providers; Tessera
EXPOSE 20002 20003 9082

# Quorum member 3: HTTP; WebSocket Providers; Tessera
EXPOSE 20004 20005 9083

# Web block explorer
EXPOSE 25000

# Geth logs location
VOLUME [ "/root/logs/quorum" ]
