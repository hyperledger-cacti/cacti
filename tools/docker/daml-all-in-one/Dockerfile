FROM ubuntu:22.04

RUN apt update
RUN apt install curl openjdk-21-jdk -y

# Download and install DAML SDK 2.9.3
RUN curl -L https://github.com/digital-asset/daml/releases/download/v2.9.3/daml-sdk-2.9.3-linux.tar.gz | tar -xz -C /opt && \
    cd /opt/sdk-2.9.3 && \
    ./install.sh

ENV PATH="/root/.daml/bin:${PATH}"
RUN apt-get install xxd
RUN daml new quickstart --template quickstart-java
WORKDIR /quickstart

# Create the config file for daml json-api
RUN echo '{"server": {"address": "0.0.0.0","port": 7575},"ledger-api": {"address": "0.0.0.0","port": 6865}}' > json-api-app.conf

# Run the auto generation of Authorization Bearer Token
RUN apt-get update && apt-get install -y openssl
COPY generate-jwt-token.sh /quickstart/generate-jwt-token.sh
RUN chmod +x /quickstart/generate-jwt-token.sh
RUN /quickstart/generate-jwt-token.sh

RUN apt-get update && apt-get install -y supervisor
RUN mkdir -p /var/log/supervisor
COPY supervisord.conf /etc/supervisord.conf

EXPOSE 9001

ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration","/etc/supervisord.conf", "--nodaemon"]

COPY healthcheck.sh /quickstart/healthcheck.sh
RUN chmod +x /quickstart/healthcheck.sh

HEALTHCHECK --interval=30s --timeout=60s --start-period=100s --retries=100 CMD /quickstart/healthcheck.sh