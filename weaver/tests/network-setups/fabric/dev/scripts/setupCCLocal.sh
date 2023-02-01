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
(cd $INTEROP_CC_PATH/contracts/interop && make undo-vendor)
echo "Done."

