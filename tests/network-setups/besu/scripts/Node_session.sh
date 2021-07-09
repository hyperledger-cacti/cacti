cd SampleBesuNetwork/Node-$1/

bootnodeID=$(curl -X POST --data '{"jsonrpc":"2.0","method":"net_enode","params":[],"id":1}' http://127.0.0.1:8545 | python3 -c "import sys, json; print(json.load(sys.stdin)['result'])")

besu --config-file=config$1.toml --bootnodes=$bootnodeID


#curl -X POST --data '{"jsonrpc":"2.0","method":"net_enode","params":[],"id":1}' http://127.0.0.1:8545
