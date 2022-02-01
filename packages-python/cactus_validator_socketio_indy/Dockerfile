FROM indy-sdk-cli

USER root
RUN apt-get update \
    && apt-get install -y supervisor \
    && rm -rf /var/lib/apt/lists/*

USER indy
WORKDIR /home/indy
COPY --chown=indy:indy './validator-python' './validator-python'
COPY --chown=indy:indy './etc/cactus' '/etc/cactus'
COPY --chown=indy 'supervisord.conf' '/etc/'
RUN cp 'from-indy-sdk/utils.py' './validator-python/validator_socketio_module/'

WORKDIR /home/indy/validator-python/
RUN pip3 install -r requirements.txt

ARG pool_ip=172.16.0.2
ENV TEST_POOL_IP=$pool_ip

CMD [ "/usr/bin/supervisord" ]
