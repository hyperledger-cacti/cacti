FROM clientbase

USER root

RUN echo "[supervisord]\n\
logfile = /tmp/supervisord.log\n\
logfile_maxbytes = 50MB\n\
logfile_backups=10\n\
logLevel = error\n\
pidfile = /tmp/supervisord.pid\n\
nodaemon = true\n\
minfds = 1024\n\
minprocs = 200\n\
umask = 022\n\
user = indy\n\
identifier = supervisor\n\
directory = /tmp\n\
nocleanup = true\n\
childlogdir = /tmp\n\
strip_ansi = false\n\
\n\
[program:validator]\n\
command=/bin/bash -c '. .venv/bin/activate && echo start-server && TEST_POOL_IP=172.16.0.2 python3.9 main.py'\n\
directory=/home/indy/cactus_validator_socketio/validator-python\n\
">> /etc/supervisord.conf

USER indy
WORKDIR /home/indy

COPY --chown=indy:indy ./cactus_validator_socketio cactus_validator_socketio
USER root
RUN cp -r ./cactus_validator_socketio/etc/cactus/ /etc
USER indy
RUN cp from-indy-sdk/utils.py cactus_validator_socketio/validator-python/validator_socketio_module/
WORKDIR /home/indy/cactus_validator_socketio/validator-python/
RUN python3.9 -m venv .venv
# 
RUN . .venv/bin/activate && pip3.9 install -r requirements.txt 

CMD [ "/usr/bin/supervisord" ]
#CMD [ "tail", "-f", "/dev/null" ]
