CC=$(cat config.json | jq -r .network1.chaincode)
echo -e "\n\n############## Fabric network1: $CC ################\n"
./bin/fabric-cli chaincode query --local-network=network1 --user=alice mychannel $CC GetMyAssets '[]'
./bin/fabric-cli chaincode query --local-network=network1 --user=bob mychannel $CC GetMyAssets '[]'

if [ "$1" = "2" ]; then
  CC=$(cat config.json | jq -r .network2.chaincode)
  echo -e "\n\n############## Fabric network2: $CC ################\n"
  ./bin/fabric-cli chaincode query --local-network=network2 --user=alice mychannel $CC GetMyWallet '[]'
  ./bin/fabric-cli chaincode query --local-network=network2 --user=bob mychannel $CC GetMyWallet '[]'
fi
