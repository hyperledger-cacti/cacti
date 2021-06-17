./bin/fabric-cli chaincode invoke --local-network=network2 --user=alice mychannel simpleasset GetMyWallet '[]'
./bin/fabric-cli chaincode invoke --local-network=network1 --user=alice mychannel simpleasset GetMyAssets '[]'
./bin/fabric-cli chaincode invoke --local-network=network2 --user=bob mychannel simpleasset GetMyWallet '[]'
./bin/fabric-cli chaincode invoke --local-network=network1 --user=bob mychannel simpleasset GetMyAssets '[]'
./bin/fabric-cli asset exchange-all --network1=network1 --network2=network2 --secret=secrettext --timeout-duration=100 bob:bond01:a04:alice:token1:100
./bin/fabric-cli chaincode invoke --local-network=network2 --user=alice mychannel simpleasset GetMyWallet '[]'
./bin/fabric-cli chaincode invoke --local-network=network1 --user=alice mychannel simpleasset GetMyAssets '[]'
./bin/fabric-cli chaincode invoke --local-network=network2 --user=bob mychannel simpleasset GetMyWallet '[]'
./bin/fabric-cli chaincode invoke --local-network=network1 --user=bob mychannel simpleasset GetMyAssets '[]'
