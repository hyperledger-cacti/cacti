# Dockerfile for Hyperledger fabric all-in-one development and experiments, including:
# * fabric-peer
# * fabric-orderer
# * fabric-ca
# * cryptogen
# * configtxgen
# * configtxlator

# * gotools

# Workdir is set to $GOPATH/src/github.com/hyperledger/fabric
# Data is stored under /var/hyperledger/db and /var/hyperledger/production

# See https://stackoverflow.com/questions/55173477/hyperledger-fabric-dial-unix-host-var-run-docker-sock-connect-no-such-file-o
# On why do we need Docker-in-Docker

ARG FABRIC_VERSION=1.4.8
ARG DIND_VERSION=19.03.12-dind

FROM docker:$DIND_VERSION as dind
FROM hyperledger/fabric-ca:$FABRIC_VERSION as ca
FROM hyperledger/fabric-orderer:$FABRIC_VERSION as orderer
FROM hyperledger/fabric-peer:$FABRIC_VERSION as peer

COPY --from=ca /usr/local/bin/fabric-ca-server /usr/local/bin/
COPY --from=ca /usr/local/bin/fabric-ca-client /usr/local/bin/
COPY --from=orderer /usr/local/bin/orderer /usr/local/bin/
COPY --from=dind /usr/local/bin/dind /usr/local/bin/dind

ENV CACTUS_CFG_PATH=/etc/hyperledger/cactus
ENV FABRIC_CFG_PATH=/etc/hyperledger/fabric
ENV PROJECT_VERSION=1.4.8

ARG KEYPATH=~/.ssh/id_rsa.pub
ARG GO_VERSION=1.15
ARG GO_SHA256=2d75848ac606061efe52a8068d0e647b35ce487a15bb52272c427df485193602
ARG GO_TAR_GZ="go${GO_VERSION}.linux-amd64.tar.gz"

RUN apt-get update

# Required for DinD to work
RUN apt-get install -y iptables bash

# Install go - START
RUN cd ~
RUN wget https://golang.org/dl/${GO_TAR_GZ}

##  Make sure the downloaded go tar file is what we want it to be not some malware
RUN echo "${GO_SHA256} ${GO_TAR_GZ}" sha256sum --check --strict
RUN tar -xvf ./${GO_TAR_GZ}
RUN chown -R root:root ./go
RUN mv go /usr/local

RUN echo "export PATH=/usr/local/go/bin:$PATH" > /etc/environment
# Install go - END

# Set up Open-SSH server
RUN apt-get install -y openssh-server augeas-tools

# See below link to understand why this is necessary
# https://serverfault.com/questions/721026/docker-container-sshopen-not-staying-up
RUN mkdir /var/run/sshd

RUN mkdir -p ~root/.ssh /etc/authorized_keys && chmod 700 ~root/.ssh/
RUN augtool 'set /files/etc/ssh/sshd_config/AuthorizedKeysFile ".ssh/authorized_keys /etc/authorized_keys/%u"'
RUN augtool 'set /files/etc/ssh/sshd_config/PermitRootLogin yes'
RUN augtool 'set /files/etc/ssh/sshd_config/PasswordAuthentication yes'
RUN augtool 'set /files/etc/ssh/sshd_config/Port 22'
RUN cp -a /etc/ssh /etc/ssh.cache
RUN ssh-keygen -A
RUN echo 'root:root' | chpasswd

RUN chmod 700 ~/
RUN chmod 700 ~/.ssh
RUN touch ~/.ssh/authorized_keys
RUN chmod 600 ~/.ssh/authorized_keys
RUN mkdir -p $CACTUS_CFG_PATH

# Generate an RSA keypair on the fly to avoid having to hardcode one in the image
# which technically does not pose a security threat since this is only a development
# image, but still it is just best not to tempt fate with things like private keys
# So here we go:
RUN ["/bin/bash", "-c", "ssh-keygen -t rsa -N '' -f $CACTUS_CFG_PATH/fabric-aio-image <<< y"]
RUN mv $CACTUS_CFG_PATH/fabric-aio-image $CACTUS_CFG_PATH/fabric-aio-image.key

RUN cp $CACTUS_CFG_PATH/fabric-aio-image.pub ~/.ssh/authorized_keys

RUN wget https://github.com/hyperledger/fabric/releases/download/v${PROJECT_VERSION}/hyperledger-fabric-linux-amd64-${PROJECT_VERSION}.tar.gz \
    && tar -xvf hyperledger-fabric-linux-amd64-${PROJECT_VERSION}.tar.gz \
    && rm hyperledger-fabric-linux-amd64-${PROJECT_VERSION}.tar.gz

RUN mkdir -p $FABRIC_CFG_PATH/config \
    && mkdir -p /etc/hyperledger/fabric-ca-server \
    && mkdir -p /etc/hyperledger/fabric-ca-server-config \
    && mkdir -p /etc/hyperledger/fabric/orderer \
    && mkdir -p /etc/hyperledger/fabric/peer

COPY ./configtx.yaml $FABRIC_CFG_PATH
COPY ./crypto-config.yaml $FABRIC_CFG_PATH
COPY ./generate.sh $FABRIC_CFG_PATH
COPY ./start_ca.sh /etc/hyperledger/fabric-ca-server
COPY ./start_orderer.sh /etc/hyperledger/fabric/orderer
COPY ./start_peer.sh /etc/hyperledger/fabric/peer
COPY ./join_channel.sh /etc/hyperledger/fabric/peer
RUN ./$FABRIC_CFG_PATH/generate.sh

# SUPERVISORD
RUN apt-get install -y supervisor
RUN mkdir -p /var/log/supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# OpenSSH Server
EXPOSE 22

# fabric-orderer
EXPOSE 7050

# - Port 7053 used to be used for Events in older versions of Fabric,
#   but it is not used in 1.4.1

# fabric-peers
EXPOSE 7051 7052

# fabric-ca-server RESTful
EXPOSE 7054

# fabric-peer operations
EXPOSE 9443

# SUPERVISORD PORTS
EXPOSE 9001

ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisor/conf.d/supervisord.conf", "--nodaemon"]
