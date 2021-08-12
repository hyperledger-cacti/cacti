echo ""

echo "--------------- NETWORK $1 ---------------"
echo ""
echo "Let's now test some basic functionalities of Besu and EthSigner to check whether the setup is correct. This is not a comprehensive test."
echo "NOTE: The tests might take a couple of seconds after the setup script is run to work."
echo ""

echo "Test 1: Getting the validators in the Besu network. This is a sanity check to ensure the Besu network has been started with four validator nodes as expected. Expected output: four addresses corresponding to the validator nodes"
echo "Output: "
curl -X POST --data '{"jsonrpc":"2.0","method":"ibft_getValidatorsByBlockNumber","params":["latest"], "id":1}' localhost:$2
echo ""
echo ""


echo "Test 2: Confirm EthSigner is up. Expected output: I'm up!"
echo "Output: "
curl -X GET http://127.0.0.1:$2/upcheck
echo ""
echo ""


echo "Test 3: Confirm EthSigner can connect to Besu. EthSigner suggests this test be done by requesting the current block number to the Besu network using the EthSigner JSON-RPC endpoint for Network $1 (Port: $2). Expected output: a valid block number(anything other than an error should work)"
echo "Output: "
curl -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":51}' http://127.0.0.1:$2
echo ""
echo ""


echo "Test 4: Get the list of accounts which EthSigner can use to sign transactions. Expected output: The four validator addresses and the accounts specified in the genesis file. (Ideally, all the three accounts specified in the genesis file should be listed along with those of the four validator nodes, but I have been able to get only one of them, the one starting with 0xfe.. in this list)"
echo "Output: "
curl -X POST --data '{"jsonrpc":"2.0","method":"eth_accounts","params":[],"id":1}' http://127.0.0.1:$2
echo ""
echo ""
