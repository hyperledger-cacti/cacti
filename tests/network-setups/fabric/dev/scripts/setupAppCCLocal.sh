CC_NAME=${1:-"simplestate"}

WEAVER_PATH=$PWD/../../../..
INTEROPCC_CHAINCODE_PATH=$PWD/../../../../core/network
CHAINCODE_PATH=$PWD/../shared/chaincode
APP_CC_PATH=$PWD/../../../../samples/fabric/${CC_NAME}

echo "Copying ${CC_NAME}..."

##################### Copying app chaincode ###############
if [ -d "${CHAINCODE_PATH}/${CC_NAME}" ]; then
    echo "Deleting existing ${CC_NAME} chaincode folder to copy the latest..."
    rm -rf ${CHAINCODE_PATH}/${CC_NAME}
fi
cp -r ${APP_CC_PATH} ${CHAINCODE_PATH}/${CC_NAME}
if [ -f ${CHAINCODE_PATH}/${CC_NAME}/go.mod.local ]
then
    cp -r ${WEAVER_PATH}/common/protos-go ${CHAINCODE_PATH}/${CC_NAME}/
    cp -r ${INTEROPCC_CHAINCODE_PATH}/fabric-interop-cc/libs ${CHAINCODE_PATH}/${CC_NAME}/
    cp -r ${INTEROPCC_CHAINCODE_PATH}/fabric-interop-cc/interfaces ${CHAINCODE_PATH}/${CC_NAME}/
    cd ${CHAINCODE_PATH}/${CC_NAME}/libs/assetexchange
    mv go.mod.local go.mod
    rm go.sum
    go mod tidy
    cd ../utils
    mv go.mod.local go.mod
    rm go.sum
    go mod tidy
    cd ../..
    cd interfaces/asset-mgmt
    mv go.mod.local go.mod
    rm go.sum
    go mod tidy
    cd ../..
    mv go.mod.local go.mod
    rm go.sum
    go mod tidy
    cd ../..
fi

echo "Done."
