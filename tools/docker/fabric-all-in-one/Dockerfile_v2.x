FROM docker:24.0.5-dind

ARG FABRIC_VERSION=2.5.6
ARG FABRIC_NODEENV_VERSION=2.5.4
ARG CA_VERSION=1.5.3
ARG COUCH_VERSION_FABRIC=0.4
ARG COUCH_VERSION=3.2.2

WORKDIR /

RUN apk update && apk --no-cache upgrade openssh-client

# Install dependencies of Docker Compose
RUN apk add docker-cli docker-cli-compose

# Need git to clone the sources of the Fabric Samples repository from GitHub
RUN apk add --no-cache git

# Fabric Samples needs bash, sh is not good enough here
RUN apk add --no-cache bash

# Need curl to download the Fabric installation script
RUN apk add --no-cache curl

# The file binary is used to inspect exectubles when debugging container image issues
RUN apk add --no-cache file

# Need NodeJS tooling for the Typescript contracts
RUN apk add --no-cache npm nodejs

# Need YQ to mutate the core.yaml and docker-compose files for Fabric config changes
RUN apk add --no-cache yq

# Download and setup path variables for Go
RUN wget https://golang.org/dl/go1.22.4.linux-amd64.tar.gz
RUN tar -xvf go1.22.4.linux-amd64.tar.gz
RUN mv go /usr/local
ENV GOROOT=/usr/local/go
ENV GOPATH=/usr/local/go
ENV PATH=$PATH:$GOPATH/bin
RUN rm go1.22.4.linux-amd64.tar.gz

# Needed as of as of go v1.20
# @see https://github.com/golang/go/issues/59305#issuecomment-1488478737
RUN apk add gcompat

# Needed because the Fabric binaries need the GNU libc dynamic linker to be executed
# and alpine does not have that by default
# @see https://askubuntu.com/a/1035037/1008695
# @see https://github.com/gliderlabs/docker-alpine/issues/219#issuecomment-254741346
RUN apk add --no-cache libc6-compat

ENV CACTUS_CFG_PATH=/etc/hyperledger/cactus
RUN mkdir -p $CACTUS_CFG_PATH
# Installing OpenSSH:
# 1. OpenSSH - need to have it so we can shell in and install/instantiate contracts
# 2. Before installing we need to wipe all pre-existing installations which Alpine
# started shipping in recent versions. Without cleaning up first, our installation
# crash with this:
#
#    => ERROR [17/64] RUN apk add --no-cache openssh augeas                                                                                                                                                     1.1s
#   ------
#    > [17/64] RUN apk add --no-cache openssh augeas:
#   0.300 fetch https://dl-cdn.alpinelinux.org/alpine/v3.18/main/x86_64/APKINDEX.tar.gz
#   0.560 fetch https://dl-cdn.alpinelinux.org/alpine/v3.18/community/x86_64/APKINDEX.tar.gz
#   1.041 ERROR: unable to select packages:
#   1.043   openssh-client-common-9.3_p1-r3:
#   1.043     breaks: openssh-client-default-9.3_p2-r0[openssh-client-common=9.3_p2-r0]
RUN apk del openssh*
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
RUN ["/bin/bash", "-c", "ssh-keygen -t rsa -N '' -f $CACTUS_CFG_PATH/fabric-aio-image <<< y"]
RUN mv $CACTUS_CFG_PATH/fabric-aio-image $CACTUS_CFG_PATH/fabric-aio-image.key
RUN cp $CACTUS_CFG_PATH/fabric-aio-image.pub ~/.ssh/authorized_keys

# OpenSSH Server (needed for chaincode deployment )
EXPOSE 22

# orderer.example.com
EXPOSE 7050

# peer0.org1.example.com
EXPOSE 7051

# peer0.org2.example.com
EXPOSE 9051

# ca_org1
EXPOSE 7054

# ca_org2
EXPOSE 8054

# ca_orderer
EXPOSE 9054

# supervisord web ui/dashboard
EXPOSE 9001

# couchdb0, couchdb1, couchdb2, couchdb3
EXPOSE 5984 6984 7984 8984

RUN apk add --no-cache util-linux

# FIXME - make it so that SSHd does not need this to work
RUN echo "root:$(uuidgen)" | chpasswd

RUN curl -sSL https://raw.githubusercontent.com/cloudflare/semver_bash/c1133faf0efe17767b654b213f212c326df73fa3/semver.sh > /semver.sh
RUN chmod +x /semver.sh

# jq is needed by the /download-frozen-image-v2.sh script to pre-fetch docker images without docker.
RUN apk add --no-cache jq

# Get the utility script that can pre-fetch the Fabric docker images without
# a functioning Docker daemon available which we do not have at image build
# time so have to resort to manually get the Fabric images insteadd of just saying
# "docker pull hyperledger/fabric..." etc.
# The reason to jump trough these hoops is to speed up the boot time of the
# container which won't have to download the images at container startup since
# they'll have been cached already at build time.
RUN curl -sSL https://raw.githubusercontent.com/moby/moby/dedf8528a51c6db40686ed6676e9486d1ed5f9c0/contrib/download-frozen-image-v2.sh > /download-frozen-image-v2.sh
RUN chmod +x /download-frozen-image-v2.sh

RUN mkdir -p /etc/hyperledger/fabric/fabric-peer/
RUN mkdir -p /etc/hyperledger/fabric/fabric-orderer/
RUN mkdir -p /etc/hyperledger/fabric/fabric-ccenv/
RUN mkdir -p /etc/hyperledger/fabric/fabric-nodeenv/
RUN mkdir -p /etc/hyperledger/fabric/fabric-tools/
RUN mkdir -p /etc/hyperledger/fabric/fabric-baseos/
RUN mkdir -p /etc/hyperledger/fabric/fabric-ca/
RUN mkdir -p /etc/hyperledger/fabric/fabric-couchdb/
RUN mkdir -p /etc/couchdb/

RUN /download-frozen-image-v2.sh /etc/hyperledger/fabric/fabric-peer/ hyperledger/fabric-peer:${FABRIC_VERSION}
RUN /download-frozen-image-v2.sh /etc/hyperledger/fabric/fabric-orderer/ hyperledger/fabric-orderer:${FABRIC_VERSION}
RUN /download-frozen-image-v2.sh /etc/hyperledger/fabric/fabric-ccenv/ hyperledger/fabric-ccenv:${FABRIC_VERSION}
RUN /download-frozen-image-v2.sh /etc/hyperledger/fabric/fabric-nodeenv/ hyperledger/fabric-nodeenv:${FABRIC_NODEENV_VERSION}
RUN /download-frozen-image-v2.sh /etc/hyperledger/fabric/fabric-tools/ hyperledger/fabric-tools:${FABRIC_VERSION}
RUN /download-frozen-image-v2.sh /etc/hyperledger/fabric/fabric-baseos/ hyperledger/fabric-baseos:${FABRIC_VERSION}
RUN /download-frozen-image-v2.sh /etc/hyperledger/fabric/fabric-ca/ hyperledger/fabric-ca:${CA_VERSION}
RUN /download-frozen-image-v2.sh /etc/hyperledger/fabric/fabric-couchdb/ hyperledger/fabric-couchdb:${COUCH_VERSION_FABRIC}
RUN /download-frozen-image-v2.sh /etc/couchdb/ couchdb:${COUCH_VERSION}

# Download and execute the Fabric installation script, but instruct it with the -d
# flag to avoid pulling docker images because during the build phase of this image
# there is no docker daemon running yet
RUN curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh > /install-fabric.sh
RUN chmod +x install-fabric.sh
RUN /install-fabric.sh --fabric-version ${FABRIC_VERSION} --ca-version ${CA_VERSION} binary samples

# Update the image version used by the Fabric peers when installing chaincodes.
# This is necessary because the older (default) image uses NodeJS v12 and npm v6
# But we need at least NodeJS 16 and npm v7 for the dependency installation to work.
RUN sed -i "s/fabric-nodeenv:\$(TWO_DIGIT_VERSION)/fabric-nodeenv:${FABRIC_NODEENV_VERSION}/g" /fabric-samples/test-network/compose/docker/peercfg/core.yaml

RUN yq '.chaincode.logging.level = "debug"' \
    --inplace /fabric-samples/test-network/compose/docker/peercfg/core.yaml

# Set the log level of the peers and other containers to DEBUG instead of the default INFO
RUN sed -i "s/FABRIC_LOGGING_SPEC=INFO/FABRIC_LOGGING_SPEC=DEBUG/g" /fabric-samples/test-network/compose/docker/docker-compose-test-net.yaml

# For now this cannot be used because it mangles the outupt of the "peer lifecycle chaincode queryinstalled" commands.
# We need to refactor those commands in the deployment endpoints so that they are immune to this logging setting.
# RUN sed -i "s/FABRIC_LOGGING_SPEC=INFO/FABRIC_LOGGING_SPEC=DEBUG/g" /fabric-samples/test-network/compose/compose-test-net.yaml

# Update the docker-compose file of the fabric-samples repo so that the
# core.yaml configuration file of the peer containers can be customized.
# We need the above because we need to override the NodeJS version the peers are
# using when building the chaincodes in the tests. This is necessary because the
# older npm version (v6) that NodeJS v12 ships with breaks down and crashes with
# an error when the peer tries to install the dependencies as part of the
# chaincode installation.
RUN yq '.services."peer0.org1.example.com".volumes += "../..:/opt/gopath/src/github.com/hyperledger/fabric-samples"' \
    --inplace /fabric-samples/test-network/compose/docker/docker-compose-test-net.yaml
RUN yq '.services."peer0.org1.example.com".volumes += "../../config/core.yaml:/etc/hyperledger/fabric/core.yaml"' \
    --inplace /fabric-samples/test-network/compose/docker/docker-compose-test-net.yaml
RUN yq '.services."peer0.org2.example.com".volumes += "../..:/opt/gopath/src/github.com/hyperledger/fabric-samples"' \
    --inplace /fabric-samples/test-network/compose/docker/docker-compose-test-net.yaml
RUN yq '.services."peer0.org2.example.com".volumes += "../../config/core.yaml:/etc/hyperledger/fabric/core.yaml"' \
    --inplace /fabric-samples/test-network/compose/docker/docker-compose-test-net.yaml


# Install supervisord because we need to run the docker daemon and also the fabric network
# meaning that we have multiple processes to run.
RUN apk add --no-cache supervisor

COPY supervisord.conf /etc/supervisord.conf
COPY run-fabric-network.sh /
COPY healthcheck.sh /

ENV FABRIC_CFG_PATH=/fabric-samples/config/
ENV CORE_PEER_TLS_ENABLED=true
ENV CORE_PEER_LOCALMSPID="Org1MSP"
ENV CORE_PEER_TLS_ROOTCERT_FILE=/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
ENV CORE_PEER_MSPCONFIGPATH=/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
ENV CORE_PEER_ADDRESS=localhost:7051
ENV COMPOSE_PROJECT_NAME=cactusfabrictestnetwork
ENV FABRIC_VERSION=${FABRIC_VERSION}
ENV CA_VERSION=${CA_VERSION}
ENV COUCH_VERSION_FABRIC=${COUCH_VERSION_FABRIC}
ENV COUCH_VERSION=${COUCH_VERSION}

# Extend the parent image's entrypoint
# https://superuser.com/questions/1459466/can-i-add-an-additional-docker-entrypoint-script
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]

# We consider the container healthy once the default example asset-transfer contract has been deployed
# and is responsive to queries as well
HEALTHCHECK --interval=1s --timeout=5s --start-period=60s --retries=300 CMD ./healthcheck.sh
