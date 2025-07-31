FROM node:22.4.0-bookworm-slim

# Install required packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    iproute2 \
    iputils-ping \
    lsb-release \
    python3 \
    python3-pip \
    bash \
    jq \
    supervisor \
    tar \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Add Docker's official GPG key
RUN mkdir -p /etc/apt/keyrings \
 && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repo
RUN echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine (CLI + Daemon)
RUN apt-get update && apt-get install -y --no-install-recommends \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# Optional: create symlinks
RUN ln -s /usr/bin/dockerd /usr/local/bin/dockerd

# Confirm installations
RUN node -v && npm -v && dockerd --version && docker --version

# # Download image content using offline script
# RUN curl -sSL https://raw.githubusercontent.com/moby/moby/dedf8528a51c6db40686ed6676e9486d1ed5f9c0/contrib/download-frozen-image-v2.sh > /download-frozen-image-v2.sh \
#  && chmod +x /download-frozen-image-v2.sh

# RUN mkdir -p /etc/kubaya/cc-fabric \
#  && /download-frozen-image-v2.sh /etc/kubaya/cc-fabric kubaya/cc-fabric:123 \
#  && tar -C /etc/kubaya/cc-fabric -cf /etc/kubaya/cc-fabric/kubaya-cc-fabric.tar .

# Set workdir and prepare app directories
ARG APP_DIR=/opt/cacti/satp-hermes
WORKDIR ${APP_DIR}

RUN mkdir -p \
    ${APP_DIR}/logs \
    ${APP_DIR}/config \
    ${APP_DIR}/ontologies \
    ${APP_DIR}/database/migrations

# Copy application files
COPY ./dist/bundle/ncc/ ${APP_DIR}
COPY ./src/main/typescript/cross-chain-mechanisms/bridge/fabric-contracts ${APP_DIR}/../fabric-contracts
COPY ./satp-hermes-gateway.Dockerfile.healthcheck.mjs ${APP_DIR}/
COPY ./supervisord.conf /etc/supervisord.conf
#COPY ./start-satp.sh ${APP_DIR}/start-satp.sh

# Install required npm packages
RUN npm install fabric-common bufferutil

# Set environment
ENV TZ=Etc/UTC
ENV NODE_ENV=production

# Expose app ports
EXPOSE 3010 3011 4010

# Launch supervisor (loads docker image & starts app)
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]

# Health check
HEALTHCHECK --interval=5s --timeout=10s --start-period=60s --retries=30 \
  CMD ["node", "./satp-hermes-gateway.Dockerfile.healthcheck.mjs", "http", "localhost", "4010"]
