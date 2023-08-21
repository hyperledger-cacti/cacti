################################
# Build
################################

FROM alpine:3.18.2 as builder

# LTS image pulled at 28.07.2023
ENV IROHA_IMAGE_DIGEST="sha256:57d8d2c8dd5ead90200f365be6809b995ecfad14a77796b9f6de1e32d0da62a3"

RUN apk update && apk add --no-cache skopeo

WORKDIR "/build"

# Freeze images
RUN skopeo copy docker://hyperledger/iroha2@${IROHA_IMAGE_DIGEST} docker-archive:iroha2.tar:hyperledger/iroha2:local
RUN tar -zcf iroha2.tar.gz iroha2.tar

################################
# Runtime
################################

FROM docker:24.0.5-dind

ENV APP_ROOT="/app"
ENV FREEZE_TMP_DIR="/media/docker/"
ENV IROHA_IMAGE_TAG="local"

# Install docker-compose
RUN apk update \
  && apk add --no-cache \
  docker-cli \
  docker-cli-compose \
  supervisor \
  jq \
  curl \
  bash

# Copy iroha_client_cli
COPY ./iroha_client_cli.sh /bin/iroha_client_cli
RUN chmod +x /bin/iroha_client_cli

# Setup healtcheck
COPY ./healthcheck.sh /bin/healthcheck
RUN chmod +x /bin/healthcheck
HEALTHCHECK --interval=5s --timeout=10s --start-period=45s --retries=60 CMD /bin/healthcheck

# Copy frozen image
COPY --from=builder /build/iroha2.tar.gz ${FREEZE_TMP_DIR}

WORKDIR ${APP_ROOT}

# Copy Iroha 2 test network sources
COPY ./src .

# Peer0 API
EXPOSE 8080
# Peer0 telemetry
EXPOSE 8180

# Setup supervisor entrypoint
COPY ./run-iroha-ledger.sh ./run-iroha-ledger.sh
COPY supervisord.conf /etc/supervisord.conf
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]
