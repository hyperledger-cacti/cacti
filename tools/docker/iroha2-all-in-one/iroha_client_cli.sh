#!/usr/bin/env sh
# Simple helper that will proxy iroha_client_cli into CLI container.

docker run \
  --rm \
  -v"${APP_ROOT}/configs/client_cli/config.json":"/config.json" \
  --network="host" \
  -ti \
  "hyperledger/iroha2:client-cli-${IROHA_CLI_VERSION}" \
  ./iroha_client_cli "$@"
