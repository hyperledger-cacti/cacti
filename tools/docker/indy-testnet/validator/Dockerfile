FROM clientbase

WORKDIR /home/indy

USER indy
COPY --chown=indy:indy './cactus_validator_socketio' 'cactus_validator_socketio'
RUN cp 'from-indy-sdk/utils.py' './cactus_validator_socketio/validator-python/validator_socketio_module/'

USER root
RUN apt-get update \
    && apt-get install -y supervisor \
    && rm -rf /var/lib/apt/lists/*
RUN cp -r './cactus_validator_socketio/etc/cactus/' '/etc'
COPY --chown=indy 'supervisord.conf' '/etc/'

USER indy
WORKDIR /home/indy/cactus_validator_socketio/validator-python/
RUN pip3 install -r requirements.txt

CMD [ "/usr/bin/supervisord" ]
