apk add jq;

##########################

cd $GOPATH/src;
wget --header X-JFrog-Art-Api:$ARTIFACTORY_APIKEY $ARTIFACTORY_URL/$CC_PATH;
unzip $(basename $CC_PATH);
CC_PKG_FILE=${CC_NAME}.tar.gz;
CC_SRC_PATH=$GOPATH/src/$CC_NAME;
cp $CC_SRC_PATH/connection.json .;
cp $CC_SRC_PATH/metadata.json .;

tmp=$(mktemp)
jq --arg a "$DEPLOYCC_NAME:7052" '.address = $a' connection.json > "$tmp" && mv "$tmp" connection.json
cat connection.json

tar cfz code.tar.gz connection.json;
tar cfz ${CC_PKG_FILE} code.tar.gz metadata.json;
rm code.tar.gz metadata.json connection.json;
echo "===================== Chaincode is packaged on peer0.org${ORG} ===================== ";

##########################

res=1
echo ""
while [ $res -ne 0 ]; do
  set -x
  nc -zv -w30 "${PEER_NAME}" 7051
  res=$?
  set +x
  sleep 5
done
echo "Peer: ${PEER_NAME} UP"
res=1
while [ $res -ne 0 ]; do
  set -x
  nc -zv -w30 "${ORDERER_NAME}" 7050
  res=$?
  set +x
  sleep 5
done
echo "Orderer: ${ORDERER_NAME} UP"
echo "Installing Chaincode: ${CC_NAME} on ${CORE_PEER_ADDRESS}..."

##########################

echo;
set -x;
peer lifecycle chaincode install ${CC_PKG_FILE} >&~/log.txt;
res=$?;
set +x;
cat ~/log.txt
PACKAGE_ID=$(sed -n -e 's/^.*identifier: //p' ~/log.txt);
echo PackageID is $PACKAGE_ID
if [ $res -ne 0 ]; then
  echo "############# Chaincode installation on ${CORE_PEER_ADDRESS} has failed ##########";
  exit 1;
fi;
echo "===================== Chaincode is installed on ${CORE_PEER_ADDRESS} ===================== ";

##########################

mkdir -p /var/pvc1/chaincodes/$DEPLOYCC_NAME;
echo "CHAINCODE_CCID="$PACKAGE_ID > /var/pvc1/chaincodes/$DEPLOYCC_NAME/pkgid;
echo "PACKAGE_ID: ${PACKAGE_ID} written to file ${DEPLOYCC_NAME}."
echo
exit 0
