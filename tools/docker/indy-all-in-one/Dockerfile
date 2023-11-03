# Runs indy pool for testing purpose
# Original source - https://github.com/hyperledger/indy-vdr/blob/main/ci/indy-pool.dockerfile
# Changes marked with `EDIT`

# EDIT - use stable indy release
FROM ghcr.io/hyperledger/indy-node-container/indy_node:1.12.6-ubuntu18-main
RUN pip3 install "supervisor~=4.2"

# EDIT - change UID to simplify host dir mount
ARG UID=1000
RUN usermod -u $UID indy
ENV UID=$UID

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
[program:node1]\n\
command=start_indy_node Node1 0.0.0.0 9701 0.0.0.0 9702\n\
directory=/home/indy\n\
stdout_logfile=/tmp/node1.log\n\
stderr_logfile=/tmp/node1.log\n\
\n\
[program:node2]\n\
command=start_indy_node Node2 0.0.0.0 9703 0.0.0.0 9704\n\
directory=/home/indy\n\
stdout_logfile=/tmp/node2.log\n\
stderr_logfile=/tmp/node2.log\n\
\n\
[program:node3]\n\
command=start_indy_node Node3 0.0.0.0 9705 0.0.0.0 9706\n\
directory=/home/indy\n\
stdout_logfile=/tmp/node3.log\n\
stderr_logfile=/tmp/node3.log\n\
\n\
[program:node4]\n\
command=start_indy_node Node4 0.0.0.0 9707 0.0.0.0 9708\n\
directory=/home/indy\n\
stdout_logfile=/tmp/node4.log\n\
stderr_logfile=/tmp/node4.log\n"\
    >> /etc/supervisord.conf

RUN mkdir -p \
    /etc/indy \
    /var/lib/indy/backup \
    /var/lib/indy/plugins \
    /var/lib/indy/sandbox \
    /var/log/indy \
    && chown -R indy:root /etc/indy /var/lib/indy /var/log/indy

# EDIT - Setup healthcheck
COPY ./healthcheck.sh /bin/healthcheck
RUN chmod +x /bin/healthcheck
HEALTHCHECK --interval=5s --timeout=10s --start-period=45s --retries=60 CMD /bin/healthcheck

USER indy

RUN echo "LEDGER_DIR = '/var/lib/indy'\n\
LOG_DIR = '/var/log/indy'\n\
KEYS_DIR = '/var/lib/indy'\n\
GENESIS_DIR = '/var/lib/indy'\n\
BACKUP_DIR = '/var/lib/indy/backup'\n\
PLUGINS_DIR = '/var/lib/indy/plugins'\n\
NODE_INFO_DIR = '/var/lib/indy'\n\
NETWORK_NAME = 'sandbox'\n"\
    >> /etc/indy/indy_config.py

ARG pool_ip=127.0.0.1

# EDIT - Store pool ip in environment variable
ENV POOL_IP=$pool_ip

EXPOSE 9701 9702 9703 9704 9705 9706 9707 9708

# EDIT - Use different entry script- generate indy pool just once
COPY --chown=indy 'startup.sh' '/usr/bin/'
CMD [ "/usr/bin/startup.sh" ]
