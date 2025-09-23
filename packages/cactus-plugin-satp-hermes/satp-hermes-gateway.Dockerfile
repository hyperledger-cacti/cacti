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
WORKDIR /workspace

# Copy workspace root files for yarn workspaces
COPY ../../package.json ../../yarn.lock ../../lerna.json ../../.yarnrc.yml ./
COPY ../../packages ./packages
COPY ../../tsconfig.base.json ./
COPY ../../.yarn ./.yarn
# Enable Corepack and use the correct Yarn version specified in package.json
RUN corepack enable
RUN corepack prepare yarn@4.3.1 --activate

RUN yarn install --immutable

# Configure the workspace (required for monorepo setup)
RUN yarn run configure

# Build workspace dependencies that SATP depends on
RUN yarn workspace @hyperledger/cactus-common build || true
RUN yarn workspace @hyperledger/cactus-core build || true
RUN yarn workspace @hyperledger/cactus-core-api build || true
RUN yarn workspace @hyperledger/cactus-api-client build || true
RUN yarn workspace @hyperledger/cactus-cmd-api-server build || true
RUN yarn workspace @hyperledger/cactus-plugin-keychain-memory build || true
RUN yarn workspace @hyperledger/cactus-plugin-ledger-connector-besu build || true
RUN yarn workspace @hyperledger/cactus-plugin-ledger-connector-ethereum build || true
RUN yarn workspace @hyperledger/cactus-plugin-ledger-connector-fabric build || true
RUN yarn workspace @hyperledger/cactus-plugin-object-store-ipfs build || true
RUN yarn workspace @hyperledger/cactus-plugin-bungee-hermes build || true
RUN yarn workspace @hyperledger/cactus-test-tooling build || true

# Set final workdir
WORKDIR ${APP_DIR}

RUN mkdir -p \
    ${APP_DIR}/logs \
    ${APP_DIR}/config \
    ${APP_DIR}/ontologies \
    ${APP_DIR}/database/migrations

# Build the SATP Hermes plugin
RUN yarn workspace @hyperledger/cactus-plugin-satp-hermes build

# Create ncc bundle
RUN cd packages/cactus-plugin-satp-hermes && \
    mkdir -p dist/bundle/ncc && \
    npx ncc build dist/lib/main/typescript/plugin-satp-hermes-gateway-cli.js -o dist/bundle/ncc --external=fabric-common --external=bufferutil --external=pg-cloudflare

# Copy the built bundle to the app directory
RUN cp -r packages/cactus-plugin-satp-hermes/dist/bundle/ncc/* ${APP_DIR}/

# Copy other necessary files from the SATP package
RUN cp -r packages/cactus-plugin-satp-hermes/src/main/typescript/cross-chain-mechanisms/bridge/fabric-contracts ${APP_DIR}/../fabric-contracts
RUN cp packages/cactus-plugin-satp-hermes/satp-hermes-gateway.Dockerfile.healthcheck.mjs ${APP_DIR}/
RUN cp packages/cactus-plugin-satp-hermes/supervisord.conf /etc/supervisord.conf
RUN cp packages/cactus-plugin-satp-hermes/gateway_log_controller.sh ${APP_DIR}/gateway_log_controller.sh
RUN chmod +x ${APP_DIR}/gateway_log_controller.sh

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
