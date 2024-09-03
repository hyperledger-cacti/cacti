FROM cruizba/ubuntu-dind:19.03.11

USER root

RUN apt-get update
RUN apt -y upgrade

# Need curl for healthchecks
RUN apt-get -y install --no-install-recommends curl

# The file binary is used to inspect exectubles when debugging container image issues
RUN apt-get -y install --no-install-recommends file

RUN apt-get -y install --no-install-recommends ca-certificates
RUN apt-get -y install --no-install-recommends tzdata

RUN apt-get -y install --no-install-recommends git
RUN apt-get -y install --no-install-recommends apt-utils

RUN apt -y install --no-install-recommends default-jdk

ARG APP=/usr/src/app/cactus/
COPY . ${APP}

ENV TZ=Etc/UTC

RUN mkdir -p ${APP}

RUN mkdir -p "${APP}/log/"

WORKDIR ${APP}

SHELL ["/bin/bash", "--login", "-i", "-c"]
# Installing Node Version Manager (nvm)
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash

RUN source ~/.bashrc && \
    nvm install 16.8.0 && \
    npm install -g yarn && \
    npm run configure

SHELL ["/bin/bash", "--login", "-c"]

COPY ./examples/cactus-example-cbdc-bridging-backend/healthcheck.sh /

ENV API_HOST=localhost
ENV API_SERVER_1_PORT=4000
ENV API_SERVER_2_PORT=4100
ENV API_HOST_FRONTEND=localhost
ENV API_PORT_FRONTEND=2000

COPY examples/cactus-example-cbdc-bridging-backend/src/fabric-contracts /usr/src/app/cactus/examples/cactus-example-cbdc-bridging-backend/dist/lib/fabric-contracts
COPY examples/cactus-example-cbdc-bridging-backend/supervisord.conf /etc/supervisord.conf
COPY examples/cactus-example-cbdc-bridging-backend/run-cbdc-app.sh /run-cbdc-app.sh
RUN chmod +x /run-cbdc-app.sh

# supervisord web ui/dashboard
EXPOSE 9001
# API #1
EXPOSE 4000
# API #2
EXPOSE 4100

# Extend the parent image's entrypoint
# https://superuser.com/questions/1459466/can-i-add-an-additional-docker-entrypoint-script
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]
HEALTHCHECK --interval=1s --timeout=5s --start-period=20s --retries=250 \
    CMD /usr/src/app/cactus/examples/cbdc-bridge-app/healthcheck.sh
