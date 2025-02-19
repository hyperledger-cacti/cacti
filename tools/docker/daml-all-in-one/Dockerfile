FROM ubuntu:22.04 AS build

LABEL org.opencontainers.image.source = "https://github.com/hyperledger/cacti"
RUN apt update && \
    apt install --no-install-recommends curl openjdk-21-jdk supervisor openssl xxd -y

# Download and install DAML SDK 2.9.3
RUN curl -L https://github.com/digital-asset/daml/releases/download/v2.9.3/daml-sdk-2.9.3-linux.tar.gz -o /tmp/daml-sdk-2.9.3-linux.tar.gz

# Extract SDK
FROM ubuntu:22.04 AS extractdaml
LABEL org.opencontainers.image.source = "https://github.com/hyperledger/cacti"
RUN apt update && \
    apt install --no-install-recommends curl openjdk-21-jdk supervisor openssl xxd -y

COPY --from=build /tmp/daml-sdk-2.9.3-linux.tar.gz /tmp/daml-sdk-2.9.3-linux.tar.gz
RUN mkdir -p /opt/daml && \
    tar --strip-components=1 -xzf /tmp/daml-sdk-2.9.3-linux.tar.gz -C /opt/daml && \
    rm /tmp/daml-sdk-2.9.3-linux.tar.gz
# Set Environment Path
FROM ubuntu:22.04 AS setenvpath
LABEL org.opencontainers.image.source = "https://github.com/hyperledger/cacti"
RUN apt update && \
    apt install --no-install-recommends curl openjdk-21-jdk supervisor openssl xxd -y

COPY --from=extractdaml /opt/daml /opt/daml
ENV PATH="/opt/daml/bin:$PATH"

# Install DAML
FROM ubuntu:22.04 as installdaml
LABEL org.opencontainers.image.source = "https://github.com/hyperledger/cacti"
RUN apt update && \
    apt install --no-install-recommends curl openjdk-21-jdk supervisor openssl xxd -y
    
COPY --from=setenvpath /opt/daml/canton /opt/daml/canton
COPY --from=setenvpath /opt/daml/daml /opt/daml/daml
COPY --from=setenvpath /opt/daml/daml-helper /opt/daml/daml-helper
COPY --from=setenvpath /opt/daml/daml-libs /opt/daml/daml-libs
COPY --from=setenvpath /opt/daml/daml-sdk /opt/daml/daml-sdk
COPY --from=setenvpath /opt/daml/daml2js /opt/daml/daml2js
COPY --from=setenvpath /opt/daml/damlc /opt/daml/damlc
COPY --from=setenvpath /opt/daml/studio /opt/daml/studio
COPY --from=setenvpath /opt/daml/templates /opt/daml/templates

COPY --from=setenvpath /opt/daml/daml_version.txt /opt/daml
COPY --from=setenvpath /opt/daml/install.bat /opt/daml
COPY --from=setenvpath /opt/daml/install.sh /opt/daml
COPY --from=setenvpath /opt/daml/NOTICES /opt/daml
COPY --from=setenvpath /opt/daml/sdk-config.yaml /opt/daml

RUN ./opt/daml/install.sh

FROM ubuntu:22.04 as final
LABEL org.opencontainers.image.source = "https://github.com/hyperledger/cacti"
RUN apt update && \
    apt install --no-install-recommends curl openjdk-21-jdk supervisor openssl xxd -y

COPY --from=installdaml /root/.daml /root/.daml
COPY --from=installdaml /opt/daml /opt/daml

ENV PATH="/root/.daml/bin:${PATH}"
RUN daml new quickstart --template quickstart-java

WORKDIR /quickstart

# Create the config file for daml json-api
RUN echo '{"server": {"address": "0.0.0.0","port": 7575},"ledger-api": {"address": "0.0.0.0","port": 6865}}' > json-api-app.conf

# Run the auto generation of Authorization Bearer Token
COPY generate-jwt-token.sh /quickstart/generate-jwt-token.sh
RUN chmod +x /quickstart/generate-jwt-token.sh
RUN /quickstart/generate-jwt-token.sh

RUN mkdir -p /var/log/supervisor
COPY supervisord.conf /etc/supervisord.conf

EXPOSE 9001
EXPOSE 7575

ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration","/etc/supervisord.conf", "--nodaemon"]

COPY healthcheck.sh /quickstart/healthcheck.sh
RUN chmod +x /quickstart/healthcheck.sh

HEALTHCHECK --interval=30s --timeout=60s --start-period=100s --retries=100 CMD /quickstart/healthcheck.sh