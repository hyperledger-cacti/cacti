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

ARG FABRIC_VERSION=1.4.8

FROM hyperledger/fabric-ca:$FABRIC_VERSION as ca
FROM hyperledger/fabric-orderer:$FABRIC_VERSION as orderer
FROM hyperledger/fabric-peer:$FABRIC_VERSION as peer

COPY --from=ca /usr/local/bin/fabric-ca-server /usr/local/bin/
COPY --from=ca /usr/local/bin/fabric-ca-client /usr/local/bin/
COPY --from=orderer /usr/local/bin/orderer /usr/local/bin/

ENV FABRIC_CFG_PATH=/etc/hyperledger/fabric
ENV PROJECT_VERSION=1.4.8

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
RUN apt-get update && apt-get install -y supervisor
RUN mkdir -p /var/log/supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# fabric-orderer
EXPOSE 7050
# fabric-peers
EXPOSE 7051 7052 7053
# fabric-ca-server RESTful
EXPOSE 7054
# fabric-peer operations
EXPOSE 9443

# SUPERVISORD PORTS
EXPOSE 9001

ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisor/conf.d/supervisord.conf", "--nodaemon"]
