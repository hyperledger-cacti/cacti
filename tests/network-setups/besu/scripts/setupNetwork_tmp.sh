# create the project folder
mkdir SampleBesuNetwork
cd SampleBesuNetwork

# Create node directories
mkdir Node-1 Node-2 Node-3 Node-4
mkdir Node-1/data Node-2/data Node-3/data Node-4/data

# Generate node keys and the genesis file and copy them to the corresponding folders
cp ../artifacts/ibftConfigFile.json . # Change this file after copying if configuration needs to be changed
besu operator generate-blockchain-config --config-file=ibftConfigFile.json --to=networkFiles --private-key-file-name=key

cp networkFiles/genesis.json .

cd networkFiles/keys
cd $(ls -d -1 */ |sed -n '1p') # Go to the first folder
cp key ../../../Node-1/data/
cp key.pub ../../../Node-1/data/

cd ../
cd $(ls -d -1 */ |sed -n '2p') # Go to the second folder
cp key ../../../Node-2/data/
cp key.pub ../../../Node-2/data/

cd ../
cd $(ls -d -1 */ |sed -n '3p') # Go to the third folder
cp key ../../../Node-3/data/
cp key.pub ../../../Node-3/data/

cd ../
cd $(ls -d -1 */ |sed -n '4p') # Go to the fourth folder
cp key ../../../Node-4/data/
cp key.pub ../../../Node-4/data/

cd ../../../../


# Setup EthSigner with multiple signing keys
bash scripts/setupEthSigner.sh
cp -r artifacts/defaultKeys/ SampleBesuNetwork/keys/

# Run the bootNode (Node-1 for us): 
cd SampleBesuNetwork/Node-1/
cp ../../artifacts/config1.toml .


# Run for other nodes:
#bootnodeID=$(curl -X POST --data '{"jsonrpc":"2.0","method":"net_enode","params":[],"id":1}' http://127.0.0.1:8545 | python3 -c "import sys, json; print(json.load(sys.stdin)['result'])")

cd ../Node-2/
cp ../../artifacts/config2.toml .

cd ../Node-3/
cp ../../artifacts/config3.toml .

cd ../Node-4/
cp ../../artifacts/config4.toml .

cd ../../

# User instructions
echo "To complete the setup of the SampleBesuNetwork do the following:" 
echo "Open five terminals and run these:"
echo "Terminal 1: Go to the SampleBesuNetwork folder; Run ethsigner --chain-id=1337 --downstream-http-port=8590 multikey-signer --directory=keys/"
echo "Terminal 2: Go to SampleNetwork/Node-1/; Run besu --config-file=config1.toml"
echo 'Terminal 3: Go to SampleNetwork/Node-2/; Assign bootnodeID=$(curl -X POST --data '"'"'{"jsonrpc":"2.0","method":"net_enode","params":[],"id":1}'"'"' http://127.0.0.1:8545 | python3 -c "import sys, json; print(json.load(sys.stdin)['"'"'result'"'"'])");(bootnodeID value is without the semi-colon) Run besu --config-file=config2.toml --bootnodes$=bootnodeID'
echo 'Terminal 4: Go to SampleNetwork/Node-3/; Assign bootnodeID=$(curl -X POST --data '"'"'{"jsonrpc":"2.0","method":"net_enode","params":[],"id":1}'"'"' http://127.0.0.1:8545 | python3 -c "import sys, json; print(json.load(sys.stdin)['"'"'result'"'"'])");(bootnodeID value is without the semi-colon) Run besu --config-file=config3.toml --bootnodes=$bootnodeID'
echo 'Terminal 5: Go to SampleNetwork/Node-4/; Assign bootnodeID=$(curl -X POST --data '"'"'{"jsonrpc":"2.0","method":"net_enode","params":[],"id":1}'"'"' http://127.0.0.1:8545 | python3 -c "import sys, json; print(json.load(sys.stdin)['"'"'result'"'"'])");(bootnodeID value is without the semi-colon) Run besu --config-file=config4.toml --bootnodes=$bootnodeID'
