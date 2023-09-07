directory=$(dirname $0)

CACTI_VERSION=v2@v2.0.0-alpha.1
TMP_PATH=$PWD/../shared/tmp
CHAINCODE_PATH=$PWD/../shared/chaincode
rm -rf $CHAINCODE_PATH/interop

# interop cc module
INTEROPCC_MOD=github.com/hyperledger/cacti/weaver/core/network/fabric-interop-cc/contracts/interop/v2

# custom gopath for convenient downloading
mkdir $TMP_PATH
OLD_GOPATH=$GOPATH
export GOPATH=$TMP_PATH

# Download interopcc and copy it into correct folder
go install "${INTEROPCC_MOD}@latest"
cp -r $TMP_PATH/pkg/mod/github.com/hyperledger/cacti/weaver/core/network/fabric-interop-cc/contracts/interop/$CACTI_VERSION $CHAINCODE_PATH/interop
chmod -R +w $CHAINCODE_PATH/interop

# Clean tmp and Undo gopath
go clean -modcache
rm -rf $TMP_PATH
export GOPATH=${OLD_GOPATH}
