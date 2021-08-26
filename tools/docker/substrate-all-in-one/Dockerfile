FROM paritytech/ci-linux:production
LABEL AUTHORS="Rafael Belchior, Catarina Pedreira" 
LABEL VERSION="2021-09-10"
LABEL org.opencontainers.image.source=https://github.com/hyperledger/cactus

WORKDIR /
ARG WORKING_DIR=/var/www/node-template
ARG CONTAINER_NAME=contracts-node-template-cactus
ARG PORT=9944
ARG DOCKER_PORT=9944
ARG CARGO_HOME=/var/www/node-template/.cargo

ENV CARGO_HOME=${CARGO_HOME}
ENV CACTUS_CFG_PATH=/etc/hyperledger/cactus
VOLUME .:/var/www/node-template

RUN apt update

# Get ubuntu and rust packages
RUN apt install -y build-essential pkg-config git clang curl libssl-dev llvm libudev-dev

ENV CACTUS_CFG_PATH=/etc/hyperledger/cactus
RUN mkdir -p $CACTUS_CFG_PATH

RUN set -e

RUN echo "*** Instaling Rust environment ***"
RUN curl https://sh.rustup.rs -y -sSf | sh
RUN echo 'source $HOME/.cargo/env' >> $HOME/.bashrc
RUN rustup default nightly

RUN echo "*** Initializing WASM build environment"
RUN rustup target add wasm32-unknown-unknown --toolchain nightly

RUN echo "*** Installing Substrate node environment ***"
RUN cargo install contracts-node --git https://github.com/paritytech/substrate-contracts-node.git --force --locked

RUN echo "*** Start Substrate node template ***"
CMD [ "/var/www/node-template/.cargo/bin/substrate-contracts-node", "--dev"]