# We need to use the older, more stable v18 here because of
# https://github.com/docker-library/docker/issues/170
FROM docker:20.10.3-dind

ARG FABRIC_VERSION=1.4.8
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

# Need curl to download the Fabric bootstrap script
RUN apk add --no-cache curl

# The file binary is used to inspect exectubles when debugging container image issues
RUN apk add --no-cache file

# Download and setup path variables for Go
RUN wget https://golang.org/dl/go1.16.3.linux-amd64.tar.gz
RUN tar -xvf go1.16.3.linux-amd64.tar.gz
RUN mv go /usr/local
ENV GOROOT=/usr/local/go
ENV GOPATH=/usr/local/go
ENV PATH=$PATH:$GOPATH/bin

# Needed because the Fabric binaries need the GNU libc dynamic linker to be executed
# and alpine does not have that by default
# @see https://askubuntu.com/a/1035037/1008695
# @see https://github.com/gliderlabs/docker-alpine/issues/219#issuecomment-254741346
RUN apk add --no-cache libc6-compat

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
RUN ["/bin/bash", "-c", "ssh-keygen -t rsa -N '' -f $CACTUS_CFG_PATH/fabric-aio-image <<< y"]
RUN mv $CACTUS_CFG_PATH/fabric-aio-image $CACTUS_CFG_PATH/fabric-aio-image.key
RUN cp $CACTUS_CFG_PATH/fabric-aio-image.pub ~/.ssh/authorized_keys

# Download and execute the Fabric bootstrap script, but instruct it with the -d
# flag to avoid pulling docker images because during the build phase of this image
# there is no docker daemon running yet so this has to happen in the CMD once a
# container has been started from the image => see ./run-fabric-network-sh
RUN curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/54e27a66812845985c5c067d7f5244a05c6e719b/scripts/bootstrap.sh > /bootstrap.sh
RUN chmod +x bootstrap.sh
# Run the bootstrap here so that at least we can pre-fetch the git clone and the binary downloads resulting in
# faster container startup speed since these steps will not have to be done, only the docker image pulls.
RUN /bootstrap.sh ${FABRIC_VERSION} ${CA_VERSION} -d

# Install supervisord because we need to run the docker daemon and also the fabric network
# meaning that we have multiple processes to run.
RUN apk add --no-cache supervisor
COPY supervisord.conf /etc/supervisord.conf

COPY run-fabric-network.sh /
COPY healthcheck.sh /

# OpenSSH Server (needed for chaincode deployment )
EXPOSE 22

# supervisord web ui/dashboard
EXPOSE 9001

# peer1.org2.example.com
EXPOSE 10051

# peer0.org1.example.com
EXPOSE 7051

# peer0.org2.example.com
EXPOSE 9051

# peer1.org1.example.com
EXPOSE 8051

# orderer.example.com
EXPOSE 7050

# ca_peerOrg1
EXPOSE 7054

# ca_peerOrg2
EXPOSE 8054

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
RUN mkdir -p /etc/hyperledger/fabric/fabric-tools/
RUN mkdir -p /etc/hyperledger/fabric/fabric-ca/

RUN /download-frozen-image-v2.sh /etc/hyperledger/fabric/fabric-peer/ hyperledger/fabric-peer:${FABRIC_VERSION}
RUN /download-frozen-image-v2.sh /etc/hyperledger/fabric/fabric-orderer/ hyperledger/fabric-orderer:${FABRIC_VERSION}
RUN /download-frozen-image-v2.sh /etc/hyperledger/fabric/fabric-ccenv/ hyperledger/fabric-ccenv:${FABRIC_VERSION}
RUN /download-frozen-image-v2.sh /etc/hyperledger/fabric/fabric-tools/ hyperledger/fabric-tools:${FABRIC_VERSION}
RUN /download-frozen-image-v2.sh /etc/hyperledger/fabric/fabric-ca/ hyperledger/fabric-ca:${CA_VERSION}

# Install supervisord because we need to run the docker daemon and also the fabric network
# meaning that we have multiple processes to run.
RUN apk add --no-cache supervisor

COPY supervisord.conf /etc/supervisord.conf
COPY run-fabric-network.sh /
COPY healthcheck.sh /

ENV FABRIC_VERSION=${FABRIC_VERSION}
ENV CA_VERSION=${CA_VERSION}

# Extend the parent image's entrypoint
# https://superuser.com/questions/1459466/can-i-add-an-additional-docker-entrypoint-script
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]

# We consider the container healthy once the default example fabcar contract has been deployed
# and is responsive to queries as well
HEALTHCHECK --interval=5s --timeout=5s --start-period=30s --retries=300 CMD ./healthcheck.sh
