echo -e "\n\n############## Fabric network1 ################\n"
./bin/fabric-cli chaincode invoke --local-network=network1 --user=alice mychannel simpleasset GetMyAssets '[]'
./bin/fabric-cli chaincode invoke --local-network=network1 --user=bob mychannel simpleasset GetMyAssets '[]'

if [ "$1" = "2" ]; then
  echo -e "\n\n############## Fabric network2 ################\n"
  ./bin/fabric-cli chaincode invoke --local-network=network2 --user=alice mychannel simpleasset GetMyWallet '[]'
  ./bin/fabric-cli chaincode invoke --local-network=network2 --user=bob mychannel simpleasset GetMyWallet '[]'
fi