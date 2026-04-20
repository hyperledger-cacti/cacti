# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

directory=$(dirname $0)

CHAINCODE_PATH=$directory/../../../fabric/shared/chaincode
INTEROP_CC_PATH=$PWD/../../../../core/network/fabric-interop-cc

echo "Setting up Interop CC..."

if [ -d "${CHAINCODE_PATH}/interop" ]; then
    echo "Deleting previously built interop cc folder"
    rm -rf ${CHAINCODE_PATH}/interop
fi
(cd $INTEROP_CC_PATH/contracts/interop && make run-vendor)
cp -r $INTEROP_CC_PATH/contracts/interop $CHAINCODE_PATH/interop

# Remove local path replace directives from the copied chaincode so packaging
# in network artifacts does not depend on repository-relative paths.
(cd $CHAINCODE_PATH/interop && \
    go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v2 || true)
(cd $CHAINCODE_PATH/interop && \
    go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v3 || true)
(cd $CHAINCODE_PATH/interop && \
    go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/interfaces/asset-mgmt/v2 || true)
(cd $CHAINCODE_PATH/interop && \
    go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/interfaces/asset-mgmt/v3 || true)
(cd $CHAINCODE_PATH/interop && \
    go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/assetexchange/v2 || true)
(cd $CHAINCODE_PATH/interop && \
    go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/assetexchange/v3 || true)
(cd $CHAINCODE_PATH/interop && \
    go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/utils/v2 || true)
(cd $CHAINCODE_PATH/interop && \
    go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/utils/v3 || true)
(cd $CHAINCODE_PATH/interop && \
    go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/testutils || true)

(cd $INTEROP_CC_PATH/contracts/interop && make undo-vendor)
echo "Done."

