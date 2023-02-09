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

(cd ${APP_CC_PATH} && make run-vendor)
cp -r ${APP_CC_PATH} ${CHAINCODE_PATH}/${CC_NAME}
(cd ${APP_CC_PATH} && make undo-vendor)

echo "Done."
