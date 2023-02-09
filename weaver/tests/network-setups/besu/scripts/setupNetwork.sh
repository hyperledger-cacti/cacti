# create the project folder
mkdir SampleBesuNetwork$1
cd SampleBesuNetwork$1

# Create node directories
mkdir Node-1 Node-2 Node-3 Node-4
mkdir Node-1/data Node-2/data Node-3/data Node-4/data

# Generate node keys and the genesis file and copy them to the corresponding folders
cp ../artifacts/network$1/ibftConfigFile.json .  # Change this file after copying if configuration needs to be changed
besu operator generate-blockchain-config --config-file=ibftConfigFile.json --to=networkFiles --private-key-file-name=key

cp networkFiles/genesis.json .

cd networkFiles/keys
firstNode=`ls -d -1 */ |sed -n '1p'` # To be used later
firstNode=${firstNode::-1}
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
bash scripts/setupEthSigner.sh $1
cp artifacts/network$1/configEthSigner.toml SampleBesuNetwork$1/

cp -r artifacts/defaultKeys/* SampleBesuNetwork$1/keys/

# Set up the config file for the validator nodes 
cd SampleBesuNetwork$1/Node-1/
cp ../../artifacts/network$1/config1.toml .
sed -i 's,miner-coinbase="0xfe3b557e8fb62b89f4916b721be55ceb828dbd73",miner-coinbase="'"${firstNode}"'",g' config1.toml

# Run for other nodes:
cd ../Node-2/
cp ../../artifacts/network$1/config2.toml .
sed -i 's,miner-coinbase="0xfe3b557e8fb62b89f4916b721be55ceb828dbd73",miner-coinbase="'"${firstNode}"'",g' config2.toml

cd ../Node-3/
cp ../../artifacts/network$1/config3.toml .
sed -i 's,miner-coinbase="0xfe3b557e8fb62b89f4916b721be55ceb828dbd73",miner-coinbase="'"${firstNode}"'",g' config3.toml

cd ../Node-4/
cp ../../artifacts/network$1/config4.toml .
sed -i 's,miner-coinbase="0xfe3b557e8fb62b89f4916b721be55ceb828dbd73",miner-coinbase="'"${firstNode}"'",g' config4.toml

cd ../../SampleBesuNetwork$1

# User instructions
echo "Five tmux sessions will be started for Network $1 to run EthSigner and the four validator nodes: EthSigner_session and Node1_session to Node4_session"

#Terminal 1: Run ethsigner
tmux new-session -d -s Network$1_EthSigner_session 'ethsigner --config-file=configEthSigner.toml multikey-signer --directory=keys/'

#Terminal 2: Go to SampleBesuNetwork/Node-1/; Run besu --config-file=config1.toml"
tmux new-session -d -s Network$1_Node1_session 'cd Node-1/; besu --config-file=config1.toml'

# Wait 10 seconds for the first Node to start
sleep 10s

#Terminal 3: Go to SampleBesuNetwork/Node-2/; Assign bootnodeID=$(curl -X POST --data '"'"'{"jsonrpc":"2.0","method":"net_enode","params":[],"id":1}'"'"' http://127.0.0.1:8545 | python3 -c "import sys, json; print(json.load(sys.stdin)['"'"'result'"'"'])");(bootnodeID value is without the semi-colon) Run besu --config-file=config2.toml --bootnodes=$bootnodeID'
tmux new-session -d -s Network$1_Node2_session 'bash ../scripts/Node_session.sh 2 '"$1"

#Terminal 4: Go to SampleBesuNetwork/Node-3/; Assign bootnodeID=$(curl -X POST --data '"'"'{"jsonrpc":"2.0","method":"net_enode","params":[],"id":1}'"'"' http://127.0.0.1:8545 | python3 -c "import sys, json; print(json.load(sys.stdin)['"'"'result'"'"'])");(bootnodeID value is without the semi-colon) Run besu --config-file=config3.toml --bootnodes=$bootnodeID'
tmux new-session -d -s Network$1_Node3_session 'bash ../scripts/Node_session.sh 3 '"$1"

#Terminal 5: Go to SampleBesuNetwork/Node-4/; Assign bootnodeID=$(curl -X POST --data '"'"'{"jsonrpc":"2.0","method":"net_enode","params":[],"id":1}'"'"' http://127.0.0.1:8545 | python3 -c "import sys, json; print(json.load(sys.stdin)['"'"'result'"'"'])");(bootnodeID value is without the semi-colon) Run besu --config-file=config4.toml --bootnodes=$bootnodeID'
tmux new-session -d -s Network$1_Node4_session 'bash ../scripts/Node_session.sh 4 '"$1"

echo "Running a tmux ls after starting the five sessions"
tmux ls
