ARG BESU_VERSION=21.1.6

FROM hyperledger/besu:$BESU_VERSION AS besu
FROM pegasyseng/orion:21.1.1 AS orion

COPY --from=besu /opt/besu/ /opt/besu/

USER root

RUN mkdir /config/
RUN mkdir /config/orion/
RUN mkdir /config/besu/
RUN mkdir /opt/besu/public-keys/

ADD ../log-config.xml /config/log-config.xml
ADD ../orion.conf /config/orion/orion.conf
ADD ../nodeKey.pub /config/orion/nodeKey.pub
ADD ../nodeKey.key /config/orion/nodeKey.key
ADD ../bootnode_start.sh /opt/besu/bootnode_start.sh
ADD ../key /opt/besu/keys/key
ADD ../key.pub /opt/besu/keys/key.pub

RUN apt-get update && apt-get install -y supervisor
RUN mkdir -p /var/log/supervisor
COPY ../supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 9001

ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--nodaemon"]
