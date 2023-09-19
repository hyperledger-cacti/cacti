FROM rust:1.72.0-slim-bullseye

RUN apt update

# wasm-pack dependencies+install
RUN apt install -y build-essential pkg-config libssl-dev
RUN cargo install --version=0.12.1 wasm-pack
