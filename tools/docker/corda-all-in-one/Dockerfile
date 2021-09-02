FROM docker:20.10.2-dind

ARG SAMPLES_KOTLIN_SHA=30fd841dd035934bae75ab8910da3b6e3d5d6ee7
ARG SAMPLES_KOTLIN_CORDAPP_SUB_DIR_PATH="./Advanced/obligation-cordapp/"
ARG CORDA_TOOLS_SHELL_CLI_VERSION=4.7

WORKDIR /

RUN apk update

# Install dependencies of Docker Compose
RUN apk add py-pip python3-dev libffi-dev openssl-dev gcc libc-dev make

# Install git so we can check out the kotlin-samples repo of Corda
RUN apk add --no-cache git

# Fabric Samples needs bash, sh is not good enough here
RUN apk add --no-cache bash

# Need curl to run healthchecks
RUN apk add --no-cache curl

# The file binary is used to inspect exectubles when debugging container image issues
RUN apk add --no-cache file

RUN apk add --no-cache openjdk8

# Need gradle to execute the corda sample app setup commands
RUN apk add --no-cache gradle

ENV CACTUS_CFG_PATH=/etc/hyperledger/cactus
RUN mkdir -p $CACTUS_CFG_PATH

# OpenSSH - need to have it so we can shell in and install/instantiate contracts and troubleshoot
RUN apk add --no-cache openssh augeas

# Configure the OpenSSH server we just installed
RUN augtool 'set /files/etc/ssh/sshd_config/AuthorizedKeysFile ".ssh/authorized_keys /etc/authorized_keys/%u"'
RUN augtool 'set /files/etc/ssh/sshd_config/PermitRootLogin yes'
RUN augtool 'set /files/etc/ssh/sshd_config/PasswordAuthentication yes'
RUN augtool 'set /files/etc/ssh/sshd_config/PermitEmptyPasswords yes'
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
RUN ["/bin/bash", "-c", "ssh-keygen -t rsa -N '' -f $CACTUS_CFG_PATH/corda-aio-image <<< y"]
RUN mv $CACTUS_CFG_PATH/corda-aio-image $CACTUS_CFG_PATH/corda-aio-image.key
RUN cp $CACTUS_CFG_PATH/corda-aio-image.pub ~/.ssh/authorized_keys

# RUN tr -dc A-Za-z0-9 </dev/urandom | head -c 20 > /root-password.txt
# RUN cat /root-password.txt | chpasswd
RUN echo "root:root" | chpasswd

RUN curl https://software.r3.com/artifactory/corda-releases/net/corda/corda-tools-shell-cli/${CORDA_TOOLS_SHELL_CLI_VERSION}/corda-tools-shell-cli-${CORDA_TOOLS_SHELL_CLI_VERSION}-all.jar --output /corda-tools-shell-cli-all.jar
# This is what makes the "corda-shell" alias avaialble on the terminal
RUN java -jar /corda-tools-shell-cli-all.jar install-shell-extensions

RUN git clone https://github.com/corda/samples-kotlin.git
WORKDIR /samples-kotlin
RUN git checkout ${SAMPLES_KOTLIN_SHA}

RUN sed -i 's/4.8/4.7/g' Accounts/constants.properties
RUN sed -i 's/=10/=9/g' Accounts/constants.properties
RUN sed -i 's/4.8/4.7/g' Advanced/constants.properties
RUN sed -i 's/=10/=9/g' Advanced/constants.properties
RUN sed -i 's/4.8/4.7/g' Basic/constants.properties
RUN sed -i 's/=10/=9/g' Basic/constants.properties
RUN sed -i 's/4.8/4.7/g' BusinessNetworks/constants.properties
RUN sed -i 's/=10/=9/g' BusinessNetworks/constants.properties
RUN sed -i 's/4.8/4.7/g' Features/constants.properties
RUN sed -i 's/=10/=9/g' Features/constants.properties
RUN sed -i 's/4.8/4.7/g' Tokens/constants.properties
RUN sed -i 's/=10/=9/g' Tokens/constants.properties

WORKDIR /samples-kotlin/${SAMPLES_KOTLIN_CORDAPP_SUB_DIR_PATH}

# Install supervisord because we need to run the docker daemon and also the corda network
# meaning that we have multiple processes to run.
RUN apk add --no-cache supervisor

RUN ./gradlew build deployNodes

# OpenSSH server
EXPOSE 22

# supervisord web ui/dashboard
EXPOSE 9001

# Notary RPC
EXPOSE 10003

# Party A RPC
EXPOSE 10008

# Party B RPC
EXPOSE 10011

# Party C RPC
EXPOSE 10014

# Corda IOU Web GUIs for Node A,B,C
# EXPOSE 10009 10012 10015

# Jolokia for Party A,B,C and Notary
EXPOSE 7005 7006 7007 7008

# P2P messaging (localhost bound), RPC, admin RPC
# EXPOSE 10002 10003 10103
# EXPOSE 10007 10008 10108
# EXPOSE 10010 10011 10111
# EXPOSE 10013 10014 10114

COPY supervisord.conf /etc/supervisord.conf
COPY run-party-a-server.sh /
COPY run-party-b-server.sh /
COPY run-party-c-server.sh /
COPY run-party-a-node.sh /
COPY run-party-b-node.sh /
COPY run-party-c-node.sh /
COPY run-notary-node.sh /
COPY healthcheck.sh /

# By default we only run the absolute minimum which is a single party's node.
# For more complex tests everything else can also be enabled via the env vars
# below so that if needed there is 2 parties, a notary and a dedicated web server
# for all 3 of those nodes.
# "Web server" => the same one as in the official corda samples-kotlin repo
ENV PARTY_A_NODE_ENABLED="true"
ENV PARTY_A_WEB_SRV_ENABLED="false"

ENV PARTY_B_NODE_ENABLED="true"
ENV PARTY_B_WEB_SRV_ENABLED="false"

ENV PARTY_C_NODE_ENABLED="true"
ENV PARTY_C_WEB_SRV_ENABLED="false"

ENV NOTARY_NODE_ENABLED="true"

# Extend the parent image's entrypoint
# https://superuser.com/questions/1459466/can-i-add-an-additional-docker-entrypoint-script
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]

# We consider the container healthy once the default example fabcar contract has been deployed
# and is responsive to queries as well
HEALTHCHECK --interval=1s --timeout=5s --start-period=5s --retries=180 CMD /healthcheck.sh
