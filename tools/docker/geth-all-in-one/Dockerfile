FROM ethereum/client-go:v1.12.0

# Init
COPY ./src/genesis.json /root/data/
COPY ./src/keystore/ /root/data/keystore/
RUN geth --datadir "/root/data" init "/root/data/genesis.json"

# Setup healtcheck
COPY ./src/healthcheck.sh /bin/healthcheck
RUN chmod +x /bin/healthcheck
HEALTHCHECK --interval=5s --timeout=10s --start-period=10s --retries=30 CMD /bin/healthcheck

# RPC - HTTP
EXPOSE 8545
# RPC - WS
EXPOSE 8546

VOLUME [ "/root/data" ]

ENTRYPOINT [ \
    "geth", \
    "--datadir", "/root/data", \
    "--networkid", "10", \
    "--nodiscover", \
    "--http", \
    "--http.addr", "0.0.0.0", \
    "--http.port", "8545", \
    "--http.corsdomain", "*", \
    "--http.vhosts", "*", \
    "--http.api", "eth,personal,web3,net,admin,debug", \
    "--ws", \
    "--ws.addr", "0.0.0.0", \
    "--ws.port", "8546", \
    "--ws.origins", "*", \
    "--ws.api", "eth,personal,web3,net,admin,debug", \
    "--unlock", "0x6A2EC8c50BA1a9cE47c52d1cb5B7136Ee9d0cCC0", \
    "--mine", \
    "--password", "/dev/null", \
    "--allow-insecure-unlock", \
    "--miner.etherbase", "0x6A2EC8c50BA1a9cE47c52d1cb5B7136Ee9d0cCC0", \
    "--verbosity", "5" \
    ]