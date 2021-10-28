# Set the right function in .env
if [ "$3" == "bond" ]
then
	sed -i "s/DEFAULT_APPLICATION_FUNC=.*/DEFAULT_APPLICATION_FUNC=ClaimRemoteAsset/g" .env
elif [ "$3" == "token" ]
then
	sed -i "s/DEFAULT_APPLICATION_FUNC=.*/DEFAULT_APPLICATION_FUNC=ClaimRemoteTokenAsset/g" .env
else
	echo "Unknown asset category: "$3
	exit 1
fi
./bin/fabric-cli env set-file ./.env

cd scripts

# Create a chaincode.json from the template file after replacing user IDs with certificates
USER_CERT_BASE64=$(node getAssetTransferViewAddress.js getusercert $2 alice)
sed "s/<alice>/$USER_CERT_BASE64/g" ../chaincode.json.template > ../chaincode.json
sed -i "s/<assettype>/$4/g" ../chaincode.json
sed -i "s/<assetid>/$5/g" ../chaincode.json
if [ "$3" == "token" ]
then
	sed -i "s/<numunits>/$6/g" ../chaincode.json
fi

# Get view address by running JS code
VIEW_ADDRESS=$(node getAssetTransferViewAddress.js claim $3 $2 alice $1 bob $4 $5)

cd ..

# Run interop query using view address
./bin/fabric-cli interop --local-network=$1 --remote-network=$2 --requesting-org=Org1MSP $VIEW_ADDRESS --user=bob
