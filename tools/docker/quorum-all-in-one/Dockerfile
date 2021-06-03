ARG QUORUM_VERSION=21.4.1
ARG TESSERA_VERSION=21.1.1

FROM quorumengineering/quorum:$QUORUM_VERSION AS quorum
FROM quorumengineering/tessera:$TESSERA_VERSION AS tessera

COPY --from=quorum /usr/local/bin/geth /usr/local/bin/
COPY --from=quorum /usr/local/bin/bootnode /usr/local/bin/

# BASH
RUN apk update && apk add --no-cache bash

# SUPERVISORD
RUN apk update && apk add --no-cache supervisor
RUN mkdir -p /var/log/supervisor
COPY supervisord.conf /etc/supervisord.conf

# Quorum
ADD ./nodekey /nodekey
ADD ./key /key
ADD ./genesis.json /genesis.json
ADD ./permissioned-nodes.json /permissioned-nodes.json
ADD ./passwords.txt /passwords.txt

# Tessara PKI
ADD ./tm.pub /tm.pub
ADD ./tm.key /tm.key


ADD ./start-tessera.sh /start-tessera.sh
ADD ./start-quorum.sh /start-quorum.sh

# TESSARA PORTS:
EXPOSE 9000
EXPOSE 9080

# QUORUM PORTS
EXPOSE 21000
EXPOSE 30303
EXPOSE 50401

# SUPERVISORD PORTS
EXPOSE 9001

ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]
