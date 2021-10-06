# Set the right function in .env
if [ "$1" == "bond" ]
then
	sed -i "s/DEFAULT_APPLICATION_FUNC=.*/DEFAULT_APPLICATION_FUNC=ClaimRemoteAsset/g" .env
elif [ "$1" == "token" ]
then
	sed -i "s/DEFAULT_APPLICATION_FUNC=.*/DEFAULT_APPLICATION_FUNC=ClaimRemoteTokenAsset/g" .env
else
	echo "Unknown asset category: "$1
	exit 1
fi
./bin/fabric-cli env set-file ./.env

cd scripts

# Create a chaincode.json from the template file after replacing user IDs with certificates
USER_CERT_BASE64=$(node getAssetTransferViewAddress.js getusercert network1 alice)
sed "s/<alice>/$USER_CERT_BASE64/g" ../chaincode.json.template > ../chaincode.json
sed -i "s/<assettype>/$2/g" ../chaincode.json
sed -i "s/<assetid>/$3/g" ../chaincode.json
if [ "$1" == "token" ]
then
	sed -i "s/<numunits>/$4/g" ../chaincode.json
fi

# Get view address by running JS code
VIEW_ADDRESS=$(node getAssetTransferViewAddress.js claim $1 network1 alice network2 bob $2 $3)

cd ..

# Run interop query using view address
./bin/fabric-cli interop --local-network=network2 --requesting-org=Org1MSP $VIEW_ADDRESS --user=bob
