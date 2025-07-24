ARG BASE_IMAGE=debian:bullseye-slim
FROM --platform=$BUILDPLATFORM ${BASE_IMAGE} AS builder

# Install required tools and dependencies
RUN apt-get update && apt-get install -y \
    git \
    wget \
    build-essential \
    curl \
    openjdk-17-jdk \
    ca-certificates \
    tar \
    && rm -rf /var/lib/apt/lists/*

# Install Go
ARG GO_VERSION=1.23.11
RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "amd64" ]; then GOARCH=amd64; \
    elif [ "$ARCH" = "arm64" ]; then GOARCH=arm64; \
    else echo "Unsupported architecture: $ARCH" && exit 1; fi && \
    wget https://go.dev/dl/go${GO_VERSION}.linux-${GOARCH}.tar.gz && \
    tar -C /usr/local -xzf go${GO_VERSION}.linux-${GOARCH}.tar.gz && \
    rm go${GO_VERSION}.linux-${GOARCH}.tar.gz

ENV PATH="/usr/local/go/bin:/go/bin:${PATH}"

# Install Node.js using NVM
ENV NODE_VERSION=18.19.0
RUN apt install -y curl
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN node --version
RUN npm --version
RUN npm install -g typescript

# Set up environment variables
ENV FABRIC_VERSION=2.5.6

# Set architecture variables for downloading Fabric binaries
ARG TARGETARCH
ENV ARCH=$TARGETARCH

# Map Docker arch to Fabric arch and download Fabric binaries
RUN curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh && chmod +x install-fabric.sh

RUN ./install-fabric.sh --fabric-version ${FABRIC_VERSION} binary



WORKDIR /chaincode


HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD go version && node --version && npm --version && tsc --version && java -version || exit 1