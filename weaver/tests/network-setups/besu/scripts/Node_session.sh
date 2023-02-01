cd Node-$1/

if [ $2 == 1 ] # Network 1 with http-port as 8545
then
	bootnodeID=$(curl -X POST --data '{"jsonrpc":"2.0","method":"net_enode","params":[],"id":1}' http://127.0.0.1:8545 | python3 -c "import sys, json; print(json.load(sys.stdin)['result'])")
elif [ $2 == 2 ] # Network 2 with http-port as 9544
then
	bootnodeID=$(curl -X POST --data '{"jsonrpc":"2.0","method":"net_enode","params":[],"id":1}' http://127.0.0.1:9544 | python3 -c "import sys, json; print(json.load(sys.stdin)['result'])")
fi

besu --config-file=config$1.toml --bootnodes=$bootnodeID
