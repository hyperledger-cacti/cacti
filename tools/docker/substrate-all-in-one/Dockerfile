FROM paritytech/ci-linux:production
LABEL AUTHORS="Rafael Belchior, Catarina Pedreira"
LABEL VERSION="2021-11-01"
LABEL org.opencontainers.image.source=https://github.com/hyperledger/cactus

WORKDIR /
ENV WORKING_DIR=/var/www/node-template
ENV CONTAINER_NAME=contracts-node-template-cactus
# Specify p2p protocol TCP port
ENV PORT=9614

# Specify HTTP RPC server TCP port
ENV RPC_PORT=9618

#Specify WebSockets RPC server TCP port
ENV WS_PORT=9944

ENV DOCKER_PORT=9944
ENV CARGO_HOME=/var/www/node-template/.cargo
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

COPY start.sh /

RUN echo "*** Start Substrate node template ***"
CMD /start.sh
