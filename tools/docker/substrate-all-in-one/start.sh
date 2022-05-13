#!/bin/bash

set -euxo pipefail

echo "ENV:PORT=${PORT}"
echo "ENV:WS_PORT=${WS_PORT}"

exec /var/www/node-template/.cargo/bin/substrate-contracts-node --dev --port ${PORT} --ws-port ${WS_PORT}
