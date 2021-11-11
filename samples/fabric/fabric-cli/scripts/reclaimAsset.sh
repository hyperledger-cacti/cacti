# Set the right function in .env
if [ "$3" == "bond" ]
then
	sed -i "s/DEFAULT_APPLICATION_FUNC=.*/DEFAULT_APPLICATION_FUNC=ReclaimAsset/g" .env
elif [ "$3" == "token" ]
then
	sed -i "s/DEFAULT_APPLICATION_FUNC=.*/DEFAULT_APPLICATION_FUNC=ReclaimTokenAsset/g" .env
else
	echo "Unknown asset category: "$3
	exit 1
fi
./bin/fabric-cli env set-file ./.env

cd scripts

# Create a chaincode.json from the template file after replacing user IDs with certificates
USER_CERT_BASE64=$(node getAssetTransferViewAddress.js getusercert $2 bob)
sed "s/<bob>/$USER_CERT_BASE64/g" ../chaincode.json.template > ../chaincode.json
sed -i "s/<assettype>/$4/g" ../chaincode.json
sed -i "s/<assetid>/$5/g" ../chaincode.json

# Get view address by running JS code
VIEW_ADDRESS=$(node getAssetTransferViewAddress.js reclaim $3 $1 alice $2 bob $4 $5)

cd ..

# Run interop query using view address
./bin/fabric-cli interop --local-network=$1 --remote-network=$2 --requesting-org=Org1MSP $VIEW_ADDRESS --user=alice
