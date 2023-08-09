################################
# STAGE 1
# Setup quorum-dev-quickstart
################################

FROM node:18.17.0 AS quorum-dev-quickstart-setup

ENV QUORUM_QUICKSTART_VERSION=0.1.5
ENV ROOT_DIR=/opt/quorum-dev-quickstart

WORKDIR "${ROOT_DIR}"
RUN npm install -g "quorum-dev-quickstart@${QUORUM_QUICKSTART_VERSION}"
RUN quorum-dev-quickstart --clientType besu --outputPath ./ --monitoring default --privacy true --orchestrate false

################################
# STAGE 2
# docker compose base
################################

FROM docker:24.0.5-dind

ENV ROOT_DIR=/opt/quorum-dev-quickstart

WORKDIR /

RUN addgroup -g 1000 quorum \
  && adduser -u 1000 -G quorum -g docker -s /bin/sh -D quorum \
  && addgroup docker \
  && addgroup quorum docker

RUN apk update

# Install dependencies of Docker Compose
RUN apk add docker-cli docker-cli-compose curl

# Need git to clone the sources of the Fabric Samples repository from GitHub
RUN apk add --no-cache git

# Fabric Samples needs bash, sh is not good enough here
RUN apk add --no-cache bash

# The file binary is used to inspect exectubles when debugging container image issues
RUN apk add --no-cache file

# Need NodeJS tooling for the Typescript contracts
RUN apk add --no-cache npm nodejs

# Needed because the Fabric binaries need the GNU libc dynamic linker to be executed
# and alpine does not have that by default
# @see https://askubuntu.com/a/1035037/1008695
# @see https://github.com/gliderlabs/docker-alpine/issues/219#issuecomment-254741346
RUN apk add --no-cache libc6-compat

RUN apk add --no-cache --update chromium

RUN apk add --no-cache util-linux

# Copy quorum-dev-quickstart from the base
COPY --chown=quorum:quorum --from=quorum-dev-quickstart-setup "${ROOT_DIR}" "${ROOT_DIR}"
WORKDIR "${ROOT_DIR}"
COPY --chown=quorum:quorum env-config.ini .env

RUN apk add --no-cache supervisor
RUN apk add --no-cache ncurses

COPY healthcheck.sh /healthcheck.sh
COPY --chown=quorum:quorum supervisord.conf /etc/supervisord.conf

# # Extend the parent image's entrypoint
# # https://superuser.com/questions/1459466/can-i-add-an-additional-docker-entrypoint-script
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]

HEALTHCHECK --interval=1s --timeout=5s --start-period=60s --retries=300 CMD /healthcheck.sh

# OpenSSH Server
EXPOSE 22

# Grafana
EXPOSE 3000

# RPC Node: HTTP, WebSocket Providers
EXPOSE 8545 8546

# supervisord web ui/dashboard
EXPOSE 9001

# Prometheus
EXPOSE 9090

# ETH signer proxy
EXPOSE 18545

# Besu member 1: HTTP; WebSocket Providers; Tessera
EXPOSE 20000 20001 9081

# Besu member 2: HTTP; WebSocket Providers; Tessera
EXPOSE 20002 20003 9082

# Besu member 3: HTTP; WebSocket Providers; Tessera
EXPOSE 20004 20005 9083

# Web block explorer
EXPOSE 25000
