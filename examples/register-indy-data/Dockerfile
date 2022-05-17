# Simple tool for setup and sending requests to cactus-example-discounted-asset-trade sample app
# Run as part of docker-compose or remember to use host network

FROM indy-sdk-cli

# Default IP for test indy pool on localhost
ENV TEST_POOL_IP 172.16.0.2

USER root
RUN mkdir -p "/etc/cactus/"  && chown -R indy "/etc/cactus/"
VOLUME [ "/etc/cactus/" ]

USER indy
WORKDIR /home/indy
COPY --chown=indy:indy './register-indy-data.py' './src/'
RUN cp 'from-indy-sdk/utils.py' './src/'

ENTRYPOINT [ "python3", "-m", "src.register-indy-data" ]
