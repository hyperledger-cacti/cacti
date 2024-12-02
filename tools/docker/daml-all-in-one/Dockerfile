FROM ubuntu:22.04

LABEL org.opencontainers.image.source = "https://github.com/hyperledger/cacti"
RUN apt update && \
    apt install --no-install-recommends curl openjdk-21-jdk supervisor openssl xxd -y

# # Download and install DAML SDK 2.9.3
# RUN curl -L https://github.com/digital-asset/daml/releases/download/v2.9.3/daml-sdk-2.9.3-linux.tar.gz | tar -xz -C /opt && \
#     cd /opt/sdk-2.9.3 && \
#    ./install.sh && \
#    rm -rf /opt/sdk-2.9.3/
# Step 1: Download the DAML SDK tarball
RUN curl -L https://github.com/digital-asset/daml/releases/download/v2.9.3/daml-sdk-2.9.3-linux.tar.gz -o /tmp/daml-sdk-2.9.3-linux.tar.gz

# Step 2: Extract the tarball to the /opt directory
RUN tar -xz -C /opt -f /tmp/daml-sdk-2.9.3-linux.tar.gz

# Step 3: Change to the extracted directory and install the DAML SDK
RUN cd /opt/sdk-2.9.3 && ./install.sh

# Step 4: Clean up temporary files
RUN rm -rf /opt/sdk-2.9.3 /tmp/daml-sdk-2.9.3-linux.tar.gz

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