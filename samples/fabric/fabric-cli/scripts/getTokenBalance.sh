cd scripts

USER_CERT_BASE64=$(node getAssetTransferViewAddress.js getusercert $1 $2)

cd ..

./bin/fabric-cli chaincode query mychannel simpleassettransfer GetBalance '["token1","'$USER_CERT_BASE64'"]' --local-network=$1
