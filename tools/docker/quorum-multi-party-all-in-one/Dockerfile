FROM docker:20.10.3-dind

ARG BESU_VERSION=21.1.2
ARG QUORUM_VERSION=21.4.1
ARG QUORUM_TESSERA_VERSION=21.1.1
ARG CA_VERSION=1.4.9

WORKDIR /

RUN apk update

# Install dependencies of Docker Compose
RUN apk add py-pip python3-dev libffi-dev openssl-dev gcc libc-dev make

# Install python/pip - We need this because DinD 18.x has Python 2
# And we cannot upgrade to DinD 19 because of
# https://github.com/docker-library/docker/issues/170
ENV PYTHONUNBUFFERED=1
RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python
RUN python3 -m ensurepip
RUN pip3 install --no-cache --upgrade "pip>=21" setuptools

# Without this the docker-compose installation crashes, complaining about
# a lack of rust compiler...
# RUN pip install setuptools_rust
ENV CRYPTOGRAPHY_DONT_BUILD_RUST=1

# Install Docker Compose which is a dependency of Fabric Samples
RUN pip install docker-compose

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

ENV CACTUS_CFG_PATH=/etc/hyperledger/cactus
RUN mkdir -p $CACTUS_CFG_PATH
# OpenSSH - need to have it so we can shell in and install/instantiate contracts
RUN apk add --no-cache openssh augeas

# Configure the OpenSSH server we just installed
RUN augtool 'set /files/etc/ssh/sshd_config/AuthorizedKeysFile ".ssh/authorized_keys /etc/authorized_keys/%u"'
RUN augtool 'set /files/etc/ssh/sshd_config/PermitRootLogin yes'
RUN augtool 'set /files/etc/ssh/sshd_config/PasswordAuthentication no'
RUN augtool 'set /files/etc/ssh/sshd_config/PermitEmptyPasswords no'
RUN augtool 'set /files/etc/ssh/sshd_config/Port 22'
RUN augtool 'set /files/etc/ssh/sshd_config/LogLevel DEBUG2'
RUN augtool 'set /files/etc/ssh/sshd_config/LoginGraceTime 10'
# Create the server's key - without this sshd will refuse to start
RUN ssh-keygen -A

# Generate an RSA keypair on the fly to avoid having to hardcode one in the image
# which technically does not pose a security threat since this is only a development
# image, but we do it like this anyway.
RUN mkdir ~/.ssh
RUN chmod 700 ~/.ssh/
RUN touch ~/.ssh/authorized_keys
RUN ["/bin/bash", "-c", "ssh-keygen -t rsa -N '' -f $CACTUS_CFG_PATH/quorum-aio-image <<< y"]
RUN mv $CACTUS_CFG_PATH/quorum-aio-image $CACTUS_CFG_PATH/quorum-aio-image.key
RUN cp $CACTUS_CFG_PATH/quorum-aio-image.pub ~/.ssh/authorized_keys

RUN apk add --no-cache util-linux

# FIXME - make it so that SSHd does not need this to work
RUN echo "root:$(uuidgen)" | chpasswd

RUN git clone https://github.com/travis-payne/quorum-dev-quickstart.git

WORKDIR /quorum-dev-quickstart

RUN git fetch

RUN git checkout e029993

RUN npm i

RUN npm run build

RUN npm run start -- --clientType goquorum --outputPath ./ --monitoring default --privacy true --orchestrate false

RUN chmod -R a+rwx ../quorum-dev-quickstart/

RUN apk add --no-cache supervisor
RUN apk add --no-cache ncurses

COPY healthcheck.sh /healthcheck.sh
COPY supervisord.conf /etc/supervisord.conf

# # Extend the parent image's entrypoint
# # https://superuser.com/questions/1459466/can-i-add-an-additional-docker-entrypoint-script
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]

HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=500 CMD /healthcheck.sh

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

# Quorum member 1: HTTP; WebSocket Providers; Tessera
EXPOSE 20000 20001 9081

# Quorum member 2: HTTP; WebSocket Providers; Tessera
EXPOSE 20002 20003 9082

# Quorum member 3: HTTP; WebSocket Providers; Tessera
EXPOSE 20004 20005 9083

# Web block explorer
EXPOSE 25000
