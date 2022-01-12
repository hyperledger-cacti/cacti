FROM rust:1.57.0-slim-bullseye

RUN apt update

# wasm-pack dependencies+install
RUN apt install -y build-essential pkg-config libssl-dev
RUN cargo install wasm-pack
