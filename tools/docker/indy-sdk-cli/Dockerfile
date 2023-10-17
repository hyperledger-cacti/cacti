# Indy-SDK CLI Image
# Contains node and python environments and indy SDK, can be used as base for indy development.

FROM ubuntu:bionic-20230530

ENV DEBIAN_FRONTEND 'noninteractive'

WORKDIR /home/setup

RUN apt-get update \
    && apt-get install -y \
        gnupg \
        software-properties-common \
        python3-apt \
        curl \
        dirmngr \
        apt-transport-https \
        lsb-release \
        ca-certificates \
        gcc \
        g++ \
        make \
    && rm -rf /var/lib/apt/lists/*

# NodeJS - Updated to use the new NodeSource installation method
ENV NODE_MAJOR=16
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /usr/share/keyrings/nodesource-archive-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/nodesource-archive-keyring.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list

# Indy-sdk
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-keys CE7709D068DB5E88 \
    && add-apt-repository "deb https://repo.sovrin.org/sdk/deb bionic stable" \
    && apt-get update && apt-get install -y \
        nodejs \
        libindy \
        libnullpay \
        libvcx \
        indy-cli \
    && npm install indy-sdk \
    && npm cache clean --force \
    && rm -rf /var/lib/apt/lists/*

# Python 3.8
# WARNING
#  update-alternatives here is convinient, but can cause troubles with some missing os packages (like python3-apt)
#  in case of any errors, remove it and use explicit python3.8
RUN apt-get update \
    && apt-get install -y python3.8 \
    && update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.8 2 \
    && apt-get install -y python3-pip \
    && pip3 install --upgrade pip \
    && pip3 install \
        python3-indy \
        requests \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd indy && useradd -m indy -g indy

# TODO - utils.py as part of validator / separate python package
COPY --chown=indy:indy from-indy-sdk /home/indy/from-indy-sdk

# User should run their scripts as indy
USER indy
WORKDIR /home/indy

CMD [ "/bin/bash" ]
