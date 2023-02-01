./bin/fabric-cli user add --target-network=network1 --id=alice --secret=alicepw
./bin/fabric-cli user add --target-network=network2 --id=bob --secret=bobpw
./bin/fabric-cli configure asset add --target-network=network1 --type=bond --data-file=./src/data/assetsForTransfer.json
./bin/fabric-cli configure asset add --target-network=network1 --type=token --data-file=./src/data/tokensForTransfer.json
