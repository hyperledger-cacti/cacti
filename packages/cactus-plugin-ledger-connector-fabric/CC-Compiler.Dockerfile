# ========= BUILDER =========
ARG BASE_IMAGE=debian:bullseye-slim
FROM --platform=$BUILDPLATFORM ${BASE_IMAGE} AS builder

ARG DEBIAN_FRONTEND=noninteractive

# Install dependencies in one layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    wget \
    curl \
    ca-certificates \
    build-essential \
    openjdk-17-jdk-headless \
    tar \
    && rm -rf /var/lib/apt/lists/*

# Install Go
ARG GO_VERSION=1.23.11
RUN ARCH=$(dpkg --print-architecture) && \
    case "$ARCH" in \
      amd64) GOARCH=amd64 ;; \
      arm64) GOARCH=arm64 ;; \
      *) echo "Unsupported arch: $ARCH" && exit 1 ;; \
    esac && \
    wget -q https://go.dev/dl/go${GO_VERSION}.linux-${GOARCH}.tar.gz && \
    tar -C /usr/local -xzf go${GO_VERSION}.linux-${GOARCH}.tar.gz && \
    rm go${GO_VERSION}.linux-${GOARCH}.tar.gz
ENV PATH="/usr/local/go/bin:${PATH}"

# Install Node.js (direct tarball, no NVM overhead)
ARG NODE_VERSION=18.19.0
RUN ARCH=$(dpkg --print-architecture) && \
    case "$ARCH" in \
      amd64) NODE_ARCH=x64 ;; \
      arm64) NODE_ARCH=arm64 ;; \
      *) echo "Unsupported arch: $ARCH" && exit 1 ;; \
    esac && \
    wget -qO- https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz | tar -xJ -C /usr/local --strip-components=1
RUN npm install -g typescript

# Install Hyperledger Fabric binaries and move them into /usr/local/bin
ENV FABRIC_VERSION=2.5.6
RUN curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh && \
    chmod +x install-fabric.sh && \
    ./install-fabric.sh --fabric-version ${FABRIC_VERSION} binary && \
    mv bin/* /usr/local/bin && \
    rm -rf bin install-fabric.sh

WORKDIR /chaincode

# ========= RUNTIME =========
FROM debian:bullseye-slim

ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jre-headless \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy tools from builder (includes peer now)
COPY --from=builder /usr/local /usr/local
COPY --from=builder /chaincode /chaincode

ENV PATH="/usr/local/go/bin:/usr/local/bin:${PATH}"

WORKDIR /chaincode

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD go version && node --version && npm --version && tsc --version && java -version && peer version || exit 1
