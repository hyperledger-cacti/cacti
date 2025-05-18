FROM hyperledger/besu:25.4.0

LABEL org.opencontainers.image.source="https://github.com/hyperledger-cacti/cacti"

RUN apt update -y && \
    apt install --no-install-recommends --yes curl && \
    rm -rf /var/lib/apt/lists/*

ADD ./genesis.json /opt/besu/genesis.json

ENV BESU_LOGGING=WARN
ENV BESU_GENESIS_FILE="/opt/besu/genesis.json"
ENV BESU_REVERT_REASON_ENABLED=true
ENV BESU_NETWORK=dev
ENV BESU_RPC_HTTP_ENABLED="true"
ENV BESU_RPC_WS_ENABLED="true"
ENV BESU_HOST_WHITELIST="*"
ENV BESU_RPC_HTTP_API="ETH,NET,WEB3,CLIQUE,TRACE,DEBUG"
ENV BESU_RPC_HTTP_CORS_ORIGINS=all
ENV BESU_RPC_WS_API="ETH,NET,WEB3,CLIQUE,TRACE,DEBUG"
ENV BESU_MINER_ENABLED="true"
ENV BESU_MINER_COINBASE="0x0000000000000000000000000000000000000000"
ENV BESU_MIN_GAS_PRICE="0"
