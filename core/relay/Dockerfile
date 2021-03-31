FROM rust:1.45.2-slim-stretch AS builder

RUN apt-get update

RUN apt-get install musl-tools -y

# adding the musl library target so that we can build
# the components for busybox/alpine environments
#
RUN rustup target add x86_64-unknown-linux-musl

# We add the rustfmt component. Ideally this should be having the same
# toolchain than the target we are building, but given that we are building
# on linux (debian), we can use the toolchain mentioned below also because
# custom toolchains are not supported.
#
RUN rustup component add rustfmt --toolchain 1.45.2-x86_64-unknown-linux-gnu
RUN mkdir -p /opt/relay
COPY . /opt/relay

# We install missing dependencies within the
# the same layer where we do the compilation
# to then remove it from the image in the
# same docker command.
RUN cd /opt/relay && RUSTFLAGS=-Clinker=musl-gcc cargo build --release --target x86_64-unknown-linux-musl



FROM busybox AS all

LABEL COMPONENT="relay all-in-one"
LABEL SOLUTION=dlt-interop

RUN addgroup -g 1000 relay
RUN adduser -D -s /bin/sh -u 1000 -G relay relay

RUN mkdir -p /opt/relay/config

COPY --from=builder /opt/relay/target/x86_64-unknown-linux-musl/release/client /opt/relay/
COPY --from=builder /opt/relay/target/x86_64-unknown-linux-musl/release/client-tls /opt/relay/
COPY --from=builder /opt/relay/target/x86_64-unknown-linux-musl/release/dummy-driver /opt/relay/
COPY --from=builder /opt/relay/target/x86_64-unknown-linux-musl/release/server /opt/relay/

COPY docker/server.template.toml /opt/relay/config/
COPY docker/driver.template.toml /opt/relay/config/
COPY docker/init.sh /opt/relay/
COPY docker/entrypoint-server.sh /opt/relay/
COPY docker/entrypoint-client.sh /opt/relay/
COPY docker/entrypoint-driver.sh /opt/relay/
COPY docker/entrypoint.sh /opt/relay/

COPY fingerprint.json /opt/relay/ 

RUN chmod +x /opt/relay/server /opt/relay/client /opt/relay/client-tls /opt/relay/dummy-driver /opt/relay/entrypoint.sh /opt/relay/entrypoint-client.sh /opt/relay/entrypoint-driver.sh /opt/relay/entrypoint-server.sh
RUN chown -R relay:relay /opt/relay

USER relay

WORKDIR /opt/relay
ENTRYPOINT [ "./entrypoint.sh" ]

# These labels will be changing at every build
# therefore we leave them at the end in order
# to minimise the amount of layers that are
# built every time.
ARG COMMIT
ARG BRANCH
ARG VERSION
ARG PROTOS_VERSION
LABEL COMMIT=${COMMIT} BRANCH=${BRANCH} VERSION=${VERSION} ROTOS_VERSION=${PROTOS_VERSION}
