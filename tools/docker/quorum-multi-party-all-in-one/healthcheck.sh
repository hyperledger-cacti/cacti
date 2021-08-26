#!/bin/sh

set -e

# # Quorum Member 1
wget -O- --post-data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' --header 'Content-Type: application/json' http://localhost:20000

# # Quorum Member 2
wget -O- --post-data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' --header 'Content-Type: application/json' http://localhost:20000

# # Quorum Member 3
wget -O- --post-data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' --header 'Content-Type: application/json' http://localhost:20000

