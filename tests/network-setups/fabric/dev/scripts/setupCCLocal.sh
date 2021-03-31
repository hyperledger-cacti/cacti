directory=$(dirname $0)

CHAINCODE_PATH=$directory/../../../fabric/shared/chaincode
INTEROP_CC_PATH=$PWD/../../../../core/network/fabric-interop-cc

cd $CHAINCODE_PATH
if [ -d "fabric-interop-cc" ]; then
    echo "Deleting INTEROP CC in the test folder to copy the latest from the main folder...."
    rm -rf fabric-interop-cc
fi
cp -r ${INTEROP_CC_PATH} .
cd fabric-interop-cc
WEAVER_ROOT=$PWD/../../../../../.. make protos-local
cp -R contracts/interop ../interop
