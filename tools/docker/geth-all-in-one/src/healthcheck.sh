#!/bin/sh

function is_valid_block_returned() {
  local rpc_endpoint="$1"
  local block_number=$(geth attach --exec "eth.blockNumber" "$rpc_endpoint")
  if ! echo "$block_number" | grep -Eq '^[0-9]+$'; then
    echo "Invalid eth.blockNumber '${block_number}' -> UNHEALTHY"
    exit 1
  fi
}

# Check both HTTP and WS endpoints
is_valid_block_returned "http://localhost:8545"
is_valid_block_returned "ws://localhost:8546"
