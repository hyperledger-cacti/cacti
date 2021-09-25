# Set the right function in .env
sed -i "s/DEFAULT_APPLICATION_FUNC=.*/DEFAULT_APPLICATION_FUNC=ClaimRemoteAsset/g" .env
./bin/fabric-cli env set-file ./.env

cd scripts

# Create a chaincode.json from the template file after replacing user IDs with certificates
USER_CERT_BASE64=$(node getAssetTransferViewAddress.js getusercert network1 alice)
sed "s/<alice>/$USER_CERT_BASE64/g" ../chaincode.json.template > ../chaincode.json
sed -i "s/<assettype>/$1/g" ../chaincode.json
sed -i "s/<assetid>/$2/g" ../chaincode.json

# Get view address by running JS code
VIEW_ADDRESS=$(node getAssetTransferViewAddress.js claim network1 alice network2 bob $1 $2)

cd ..

# Run interop query using view address
./bin/fabric-cli interop --local-network=network2 --requesting-org=Org1MSP $VIEW_ADDRESS --user=bob
