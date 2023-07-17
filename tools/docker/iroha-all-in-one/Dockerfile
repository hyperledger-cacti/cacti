FROM hyperledger/iroha:1.4.0-patch-3

ARG DEBIAN_FRONTEND=noninteractive  
RUN set -e && apt-get update && \   
    apt-get install -y moreutils jq wget python3 python3-pip && \
    pip install iroha && \
    apt-get purge -y `apt-get -s purge python3-pip | grep '^ ' | tr -d '*'` && \
    apt-get -y clean && \
    rm -rf /var/lib/apt/lists/*

COPY genesis.block /opt/iroha_data/genesis.block
COPY entrypoint.sh healthcheck.py /
RUN chmod +x /entrypoint.sh

WORKDIR /opt/iroha_data

RUN wget https://raw.githubusercontent.com/hyperledger/iroha/v1.4.0-patch-3/example/admin%40test.pub --output-document=admin@test.pub
RUN wget https://raw.githubusercontent.com/hyperledger/iroha/v1.4.0-patch-3/example/admin%40test.priv --output-document=admin@test.priv
RUN wget https://raw.githubusercontent.com/hyperledger/iroha/v1.4.0-patch-3/example/node0.pub
RUN wget https://raw.githubusercontent.com/hyperledger/iroha/v1.4.0-patch-3/example/node0.priv

ENTRYPOINT ["/entrypoint.sh"]

CMD ["irohad"]