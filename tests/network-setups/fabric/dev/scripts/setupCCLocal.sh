directory=$(dirname $0)

CHAINCODE_PATH=$directory/../../../fabric/shared/chaincode
INTEROP_CC_PATH=$PWD/../../../../core/network/fabric-interop-cc

echo "Setting up Interop CC..."

cd $CHAINCODE_PATH
if [ -d "fabric-interop-cc" ]; then
    echo "Deleting INTEROP CC in the test folder to copy the latest from the main folder...."
    rm -rf fabric-interop-cc
fi
if [ -d "interop" ]; then
    echo "Deleting previously built interop cc folder"
    rm -rf interop
fi
cp -r ${INTEROP_CC_PATH} .

cd fabric-interop-cc
cp -r $PWD/../../../../../../common/protos-go contracts/interop/
cp -r $PWD/../../../../../../core/network/fabric-interop-cc/libs/assetexchange contracts/interop/
cp -r $PWD/../../../../../../core/network/fabric-interop-cc/libs/utils contracts/interop/
cp -r $PWD/../../../../../../core/network/fabric-interop-cc/libs/testutils contracts/interop/
cd contracts/interop/
mv go.mod.local go.mod
rm go.sum
cd assetexchange
mv go.mod.local go.mod
rm go.sum
go mod tidy
cd ..
go mod tidy
cd ../..
cp -R contracts/interop ../interop

echo "Done."

