# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

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

# Remove repository-local replace directives from the copied chaincode while
# keeping the vendored dependencies for deployment.
(cd ${CHAINCODE_PATH}/${CC_NAME} && \
    go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v2 || true)
(cd ${CHAINCODE_PATH}/${CC_NAME} && \
    go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v3 || true)
(cd ${CHAINCODE_PATH}/${CC_NAME} && \
    go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/interfaces/asset-mgmt/v2 || true)
(cd ${CHAINCODE_PATH}/${CC_NAME} && \
    go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/interfaces/asset-mgmt/v3 || true)
(cd ${CHAINCODE_PATH}/${CC_NAME} && \
    go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/assetexchange/v2 || true)
(cd ${CHAINCODE_PATH}/${CC_NAME} && \
    go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/assetexchange/v3 || true)
(cd ${CHAINCODE_PATH}/${CC_NAME} && \
    go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/utils/v2 || true)
(cd ${CHAINCODE_PATH}/${CC_NAME} && \
    go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/utils/v3 || true)
(cd ${CHAINCODE_PATH}/${CC_NAME} && \
    go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/testutils || true)

(cd ${APP_CC_PATH} && make undo-vendor)

echo "Done."
