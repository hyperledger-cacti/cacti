# Set the right function in .env
if [ "$1" == "bond" ]
then
	sed -i "s/DEFAULT_APPLICATION_FUNC=.*/DEFAULT_APPLICATION_FUNC=ReclaimAsset/g" .env
elif [ "$1" == "token" ]
then
	sed -i "s/DEFAULT_APPLICATION_FUNC=.*/DEFAULT_APPLICATION_FUNC=ReclaimTokenAsset/g" .env
else
	echo "Unknown asset category: "$1
	exit 1
fi
./bin/fabric-cli env set-file ./.env

cd scripts

# Create a chaincode.json from the template file after replacing user IDs with certificates
USER_CERT_BASE64=$(node getAssetTransferViewAddress.js getusercert network2 bob)
sed "s/<bob>/$USER_CERT_BASE64/g" ../chaincode.json.template > ../chaincode.json
sed -i "s/<assettype>/$2/g" ../chaincode.json
sed -i "s/<assetid>/$3/g" ../chaincode.json

# Get view address by running JS code
VIEW_ADDRESS=$(node getAssetTransferViewAddress.js reclaim $1 network1 alice network2 bob $2 $3)

cd ..

# Run interop query using view address
./bin/fabric-cli interop --local-network=network1 --remote-network=network2 --requesting-org=Org1MSP $VIEW_ADDRESS --user=alice
