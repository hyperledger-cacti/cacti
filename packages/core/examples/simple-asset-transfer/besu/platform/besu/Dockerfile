#default version to latest
ARG BESU_VERSION=latest

FROM hyperledger/besu:$BESU_VERSION

# Copy new entrypoint scripts
COPY *_start.sh /opt/besu/

# Install a dos 2 unix EOL converter (supporting either alpine or ubuntu images)
RUN (apt-get update && apt-get install dos2unix || apk add --update dos2unix) && \
    rm -rf /var/cache/apt/* && rm -rf /var/cache/apk/*

# Run dos2unix EOL conversion on all shell scripts to prevent scripts to fail if edited with a windows IDE
# that rewrote the EOL to CRLF before we build the image. See issue #4
RUN find /opt/besu/*.sh -type f -print0 | xargs -0 dos2unix

# specify default entrypoint to start the node
ENTRYPOINT ["/opt/besu/node_start.sh"]
