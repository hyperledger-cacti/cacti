FROM indy-sdk-cli

USER root
RUN apt-get update \
    && apt-get install -y supervisor \
    && rm -rf /var/lib/apt/lists/*

USER indy
WORKDIR /home/indy
COPY --chown=indy:indy './dist/CactusValidatorSocketIOIndy-0.0.1-py3-none-any.whl' '/home/indy'
RUN pip3 install /home/indy/CactusValidatorSocketIOIndy-0.0.1-py3-none-any.whl

USER root
RUN python3 /home/indy/.local/lib/python3.8/site-packages/other/post_install_script.py

USER indy
ARG pool_ip=172.16.0.2
ENV TEST_POOL_IP=$pool_ip

CMD [ "/usr/bin/supervisord" ]
