FROM ubuntu:bionic

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update && apt-get upgrade -y && apt-get install -y software-properties-common apt-transport-https supervisor

# indy libraries and tool
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-keys CE7709D068DB5E88
RUN add-apt-repository "deb https://repo.sovrin.org/sdk/deb bionic stable"
RUN apt-get update
RUN apt-get install -y libindy libnullpay libvcx indy-cli

# Python 3.9 (indy-sdk requires 3.6 and later)
RUN add-apt-repository -y ppa:deadsnakes/ppa
RUN apt-get update && apt-get install -y python3.9 python3.9-dev python3.9-venv python3.9-distutils python3.9-venv python3-venv

# Node.js v12 (Cactus requres v12)
RUN apt-get install -y nodejs npm curl
RUN npm install n -g
RUN n 12
RUN apt purge -y nodejs npm
RUN npm install indy-sdk

# user should run their scripts as indy (home: /home/indy)
RUN groupadd indy
RUN useradd -m indy -g indy

COPY --chown=indy:indy from-indy-sdk /home/indy/from-indy-sdk

WORKDIR /home/indy
USER indy
RUN python3.9 -m venv .venv
RUN . .venv/bin/activate && pip install python3-indy requests


# immediately exits
